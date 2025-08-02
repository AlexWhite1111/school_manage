// src/services/finance.service.ts
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// ----------------------------------------
// Service Functions
// ----------------------------------------

/**
 * @description 获取所有学生的财务状况总览
 * @returns {Promise<any>}
 */
export const getStudentFinanceSummaries = async () => {
  try {
    // 获取所有已报名的学生及其财务信息
    const students = await prisma.customer.findMany({
      where: {
        status: 'ENROLLED'
      },
      include: {
        financialOrders: {
          include: {
            payments: true
          }
        },
        enrollments: {
          include: {
            attendanceRecords: {
              where: {
                recordDate: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 最近30天
                }
              }
            }
          }
        }
      }
    });

    const summaries = students.map(student => {
      // 计算总应收
      const totalDue = student.financialOrders.reduce((sum, order) => 
        sum.plus(order.totalDue), new Decimal(0));

      // 计算总实收
      const totalPaid = student.financialOrders.reduce((sum, order) => 
        sum.plus(
          order.payments.reduce((orderSum, payment) => 
            orderSum.plus(payment.amount), new Decimal(0))
        ), new Decimal(0));

      // 计算总欠款
      const totalOwed = totalDue.minus(totalPaid);

      // 计算缴费状态
      let paymentStatus = 'UNPAID';
      if (totalOwed.equals(0)) {
        paymentStatus = 'PAID_FULL';
      } else if (totalPaid.greaterThan(0)) {
        paymentStatus = 'PARTIAL_PAID';
      }

      // 计算出勤情况（最近30天）
      const attendanceRecords = student.enrollments.flatMap(e => e.attendanceRecords);
      const attendanceStats = {
        present: 0,
        late: 0,
        absent: 0,
        noShow: 0
      };

      attendanceRecords.forEach(record => {
        switch (record.status) {
          case 'PRESENT': attendanceStats.present++; break;
          case 'LATE': attendanceStats.late++; break;
          case 'ABSENT': attendanceStats.absent++; break;
          case 'NO_SHOW': attendanceStats.noShow++; break;
        }
      });

      return {
        studentId: student.id,
        studentName: student.name,
        school: student.school || '', // ✅ 确保学校信息不为null
        grade: student.grade || '', // ✅ 添加年级信息
        totalDue: totalDue.toString(),
        totalPaid: totalPaid.toString(),
        totalOwed: totalOwed.toString(),
        paymentStatus,
        recentAttendance: attendanceStats,
        lastUpdateDate: student.updatedAt?.toISOString() || student.createdAt.toISOString(), // ✅ 添加最后更新时间
        // ✅ 新增：订单数量统计
        orderCount: student.financialOrders.length,
        // ✅ 新增：最近订单日期
        lastOrderDate: student.financialOrders.length > 0 
          ? student.financialOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt.toISOString()
          : null
      };
    });

    console.log(`成功获取${summaries.length}名学生的财务总览`);
    return summaries;

  } catch (error) {
    console.error('获取学生财务总览时发生错误:', error);
    throw new Error('获取学生财务总览失败');
  }
};

/**
 * @description 获取单个学生的详细财务信息 (所有订单和付款)
 * @param {number} studentId - 学生ID
 * @returns {Promise<any>}
 */
export const getStudentFinanceDetails = async (studentId: number) => {
  try {
    // 验证学生是否存在，包含完整的档案信息
    const student = await prisma.customer.findUnique({
      where: { id: studentId },
      include: {
        parents: true, // 包含家长信息
        financialOrders: {
          include: {
            payments: {
              orderBy: {
                paymentDate: 'desc'
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!student) {
      throw new Error('学生不存在');
    }

    // 格式化订单数据，包含付款状态
    const ordersWithStatus = student.financialOrders.map(order => {
      const totalPaid = order.payments.reduce((sum, payment) => 
        sum.plus(payment.amount), new Decimal(0));
      
      const remainingAmount = order.totalDue.minus(totalPaid);
      
      let orderStatus = 'UNPAID';
      if (remainingAmount.equals(0)) {
        orderStatus = 'PAID_FULL';
      } else if (totalPaid.greaterThan(0)) {
        orderStatus = 'PARTIAL_PAID';
      }

      return {
        ...order,
        totalDue: order.totalDue.toString(),
        totalPaid: totalPaid.toString(),
        remainingAmount: remainingAmount.toString(),
        orderStatus,
        payments: order.payments.map(payment => ({
          ...payment,
          amount: payment.amount.toString()
        }))
      };
    });

    const result = {
      student: {
        id: student.id,
        name: student.name,
        gender: student.gender,
        birthDate: student.birthDate,
        school: student.school,
        grade: student.grade,
        address: student.address,
        status: student.status,
        parents: student.parents.map(parent => ({
          id: parent.id,
          name: parent.name,
          relationship: parent.relationship,
          phone: parent.phone,
          wechatId: parent.wechatId
        }))
      },
      orders: ordersWithStatus
    };

    console.log(`成功获取学生${student.name}的详细财务信息和完整档案`);
    return result;

  } catch (error) {
    console.error('获取学生财务详情时发生错误:', error);
    
    if (error instanceof Error && error.message === '学生不存在') {
      throw error;
    }
    
    throw new Error('获取学生财务详情失败');
  }
};

/**
 * @description 为学生创建新订单
 * @param {number} studentId - 学生ID
 * @param {any} orderData - 订单数据
 * @returns {Promise<any>}
 */
export const createOrderForStudent = async (studentId: number, orderData: { 
  name: string; 
  totalDue: string; 
  coursePeriodStart?: string; 
  coursePeriodEnd?: string; 
  dueDate?: string; 
}) => {
  try {
    // 验证学生是否存在
    const student = await prisma.customer.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      throw new Error('学生不存在');
    }

    // 创建订单
    const newOrder = await prisma.financialOrder.create({
      data: {
        studentId: studentId,
        name: orderData.name,
        totalDue: new Decimal(orderData.totalDue),
        coursePeriodStart: orderData.coursePeriodStart ? new Date(orderData.coursePeriodStart) : null,
        coursePeriodEnd: orderData.coursePeriodEnd ? new Date(orderData.coursePeriodEnd) : null,
        dueDate: orderData.dueDate ? new Date(orderData.dueDate) : null
      },
      include: {
        student: true,
        payments: true
      }
    });

    const result = {
      ...newOrder,
      totalDue: newOrder.totalDue.toString()
    };

    console.log(`成功为学生${student.name}创建订单: ${orderData.name}`);
    return result;

  } catch (error) {
    console.error('创建订单时发生错误:', error);
    
    if (error instanceof Error && error.message === '学生不存在') {
      throw error;
    }
    
    throw new Error('创建订单失败');
  }
};

/**
 * @description 更新订单信息
 * @param {number} orderId - 订单ID
 * @param {any} orderData - 要更新的订单数据
 * @returns {Promise<any>}
 */
export const updateOrder = async (orderId: number, orderData: { 
  name?: string; 
  totalDue?: string; 
  coursePeriodStart?: string; 
  coursePeriodEnd?: string; 
  dueDate?: string; 
}) => {
  try {
    // 新增：如果需要更新订单总额，先进行校验
    if (orderData.totalDue !== undefined) {
      const order = await prisma.financialOrder.findUnique({
        where: { id: orderId },
        include: { payments: true }
      });

      if (!order) {
        throw new Error('订单不存在');
      }

      const totalPaid = order.payments.reduce((sum, payment) => sum.plus(payment.amount), new Decimal(0));
      const newTotalDue = new Decimal(orderData.totalDue);

      if (newTotalDue.lessThan(totalPaid)) {
        throw new Error(`订单总额不能小于已支付金额，已支付: ${totalPaid.toString()}`);
      }
    }

    // 构建更新数据
    const updateData: any = {};
    
    if (orderData.name !== undefined) updateData.name = orderData.name;
    if (orderData.totalDue !== undefined) updateData.totalDue = new Decimal(orderData.totalDue);
    if (orderData.coursePeriodStart !== undefined) {
      updateData.coursePeriodStart = orderData.coursePeriodStart ? new Date(orderData.coursePeriodStart) : null;
    }
    if (orderData.coursePeriodEnd !== undefined) {
      updateData.coursePeriodEnd = orderData.coursePeriodEnd ? new Date(orderData.coursePeriodEnd) : null;
    }
    if (orderData.dueDate !== undefined) {
      updateData.dueDate = orderData.dueDate ? new Date(orderData.dueDate) : null;
    }

    const updatedOrder = await prisma.financialOrder.update({
      where: { id: orderId },
      data: updateData,
      include: {
        student: true,
        payments: true
      }
    });

    const result = {
      ...updatedOrder,
      totalDue: updatedOrder.totalDue.toString(),
      payments: updatedOrder.payments.map(payment => ({
        ...payment,
        amount: payment.amount.toString()
      }))
    };

    console.log(`成功更新订单ID: ${orderId}`);
    return result;

  } catch (error) {
    console.error('更新订单时发生错误:', error);
    
    if (error instanceof Error && error.message?.includes('Record to update not found')) {
      throw new Error('订单不存在');
    }
    if (error instanceof Error && error.message.includes('订单总额不能小于已支付金额')) {
      throw error;
    }
    
    throw new Error('更新订单失败');
  }
};

/**
 * @description 删除订单
 * @param {number} orderId - 订单ID
 * @returns {Promise<any>}
 */
export const deleteOrder = async (orderId: number) => {
  try {
    await prisma.financialOrder.delete({
      where: { id: orderId }
    });

    console.log(`成功删除订单ID: ${orderId}`);

  } catch (error) {
    console.error('删除订单时发生错误:', error);
    
    if (error instanceof Error && error.message?.includes('Record to delete does not exist')) {
      throw new Error('订单不存在');
    }
    
    throw new Error('删除订单失败');
  }
};

/**
 * @description 为指定订单添加一笔收款记录
 * @param {number} orderId - 订单ID
 * @param {any} paymentData - 收款数据
 * @returns {Promise<any>}
 */
export const addPaymentToOrder = async (orderId: number, paymentData: { 
  amount: string; 
  paymentDate: string; 
  notes?: string; 
}) => {
  try {
    // 验证订单是否存在，并包含其已有的付款记录
    const order = await prisma.financialOrder.findUnique({
      where: { id: orderId },
      include: { payments: true }
    });

    if (!order) {
      throw new Error('订单不存在');
    }

    // 新增：校验超额支付
    const totalPaid = order.payments.reduce((sum, payment) => sum.plus(payment.amount), new Decimal(0));
    const newPaymentAmount = new Decimal(paymentData.amount);
    const remainingAmount = order.totalDue.minus(totalPaid);

    if (newPaymentAmount.greaterThan(remainingAmount)) {
      throw new Error(`付款金额超过订单剩余应付金额，剩余应付: ${remainingAmount.toString()}`);
    }

    // 创建付款记录
    const newPayment = await prisma.payment.create({
      data: {
        orderId: orderId,
        amount: new Decimal(paymentData.amount),
        paymentDate: new Date(paymentData.paymentDate),
        notes: paymentData.notes
      },
      include: {
        order: {
          include: {
            student: true
          }
        }
      }
    });

    const result = {
      ...newPayment,
      amount: newPayment.amount.toString()
    };

    console.log(`成功为订单${orderId}添加付款记录: ${paymentData.amount}`);
    return result;

  } catch (error) {
    console.error('添加付款记录时发生错误:', error);
    
    if (error instanceof Error && error.message === '订单不存在') {
      throw error;
    }
    if (error instanceof Error && error.message.includes('付款金额超过订单剩余应付金额')) {
      throw error;
    }
    
    throw new Error('添加付款记录失败');
  }
};

/**
 * @description 更新收款记录
 * @param {number} paymentId - 收款记录ID
 * @param {any} paymentData - 要更新的收款数据
 * @returns {Promise<any>}
 */
export const updatePayment = async (paymentId: number, paymentData: { 
  amount?: string; 
  paymentDate?: string; 
  notes?: string; 
}) => {
  try {
    // 构建更新数据
    const updateData: any = {};
    
    if (paymentData.amount !== undefined) updateData.amount = new Decimal(paymentData.amount);
    if (paymentData.paymentDate !== undefined) updateData.paymentDate = new Date(paymentData.paymentDate);
    if (paymentData.notes !== undefined) updateData.notes = paymentData.notes;

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: updateData,
      include: {
        order: {
          include: {
            student: true
          }
        }
      }
    });

    const result = {
      ...updatedPayment,
      amount: updatedPayment.amount.toString()
    };

    console.log(`成功更新付款记录ID: ${paymentId}`);
    return result;

  } catch (error) {
    console.error('更新付款记录时发生错误:', error);
    
    if (error instanceof Error && error.message?.includes('Record to update not found')) {
      throw new Error('付款记录不存在');
    }
    
    throw new Error('更新付款记录失败');
  }
};

/**
 * @description 删除收款记录
 * @param {number} paymentId - 收款记录ID
 * @returns {Promise<any>}
 */
export const deletePayment = async (paymentId: number) => {
  try {
    await prisma.payment.delete({
      where: { id: paymentId }
    });

    console.log(`成功删除付款记录ID: ${paymentId}`);

  } catch (error) {
    console.error('删除付款记录时发生错误:', error);
    
    if (error instanceof Error && error.message?.includes('Record to delete does not exist')) {
      throw new Error('付款记录不存在');
    }
    
    throw new Error('删除付款记录失败');
  }
}; 