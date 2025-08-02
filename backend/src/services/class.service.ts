// src/services/class.service.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ----------------------------------------
// Service Functions
// ----------------------------------------

/**
 * @description 获取所有班级列表
 * @returns {Promise<any>}
 */
export const getAllClasses = async () => {
  try {
    const classes = await prisma.class.findMany({
      orderBy: {
        id: 'asc'
      }
    });

    console.log(`成功获取班级列表，共 ${classes.length} 个班级`);
    return classes;

  } catch (error) {
    console.error('获取班级列表时发生错误:', error);
    throw new Error('获取班级列表失败');
  }
};

/**
 * @description 创建一个新班级
 * @param {string} name - 班级名称
 * @returns {Promise<any>}
 */
export const createClass = async (name: string) => {
  try {
    if (!name || !name.trim()) {
      throw new Error('班级名称不能为空');
    }

    const newClass = await prisma.class.create({
      data: {
        name: name.trim()
      }
    });

    console.log(`成功创建班级: "${name}" (ID: ${newClass.id})`);
    return newClass;

  } catch (error) {
    console.error('创建班级时发生错误:', error);
    
    // 处理班级名称重复错误
    if (error instanceof Error && error.message?.includes('Unique constraint')) {
      throw new Error('班级名称已存在');
    }
    
    if (error instanceof Error && error.message === '班级名称不能为空') {
      throw error;
    }
    
    throw new Error('创建班级失败');
  }
};

/**
 * @description 获取指定班级下的所有学生及其考勤信息（重构版 - 支持多班级）
 * @param {number} classId - 班级ID
 * @param {object} options - 查询选项
 * @returns {Promise<any>}
 */
export const getStudentsByClassId = async (classId: number, options: {
  includeOtherEnrollments?: boolean;
  includeStats?: boolean;
  includeRecentTags?: boolean;
  date?: string;
} = {}) => {
  try {
    // 首先验证班级是否存在
    const classExists = await prisma.class.findUnique({
      where: { id: classId }
    });

    if (!classExists) {
      throw new Error('班级不存在');
    }

    // 解析查询日期，默认为今天
    const queryDate = options.date ? new Date(options.date) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    // 获取班级下的所有学生注册信息，包含学生详情和考勤
    const enrollments = await prisma.classEnrollment.findMany({
      where: {
        classId: classId
      },
      include: {
        student: {
          include: {
            parents: true // 包含家长信息
          }
        },
        attendanceRecords: {
          where: {
            recordDate: queryDate
          },
          orderBy: {
            timeSlot: 'asc'
          }
        },
        // 如果需要最近标签，包含成长日志
        ...(options.includeRecentTags && {
          growthLogs: {
            take: 10,
            orderBy: {
              createdAt: 'desc'
            },
            include: {
              tag: true
            }
          }
        })
      },
      orderBy: {
        student: {
          name: 'asc'
        }
      }
    });

    // 如果需要其他班级信息，获取每个学生的其他注册
    let otherEnrollmentsMap = new Map();
    if (options.includeOtherEnrollments) {
      const studentIds = enrollments.map(e => e.student.id);
      const allEnrollments = await prisma.classEnrollment.findMany({
        where: {
          studentId: { in: studentIds },
          classId: { not: classId }
        },
        include: {
          class: true
        }
      });

      // 按学生ID分组
      allEnrollments.forEach(enrollment => {
        if (!otherEnrollmentsMap.has(enrollment.studentId)) {
          otherEnrollmentsMap.set(enrollment.studentId, []);
        }
        otherEnrollmentsMap.get(enrollment.studentId).push({
          id: enrollment.id,
          className: enrollment.class.name
        });
      });
    }

    // 如果需要统计信息，计算每个学生的统计数据
    let statsMap = new Map();
    if (options.includeStats) {
      const studentIds = enrollments.map(e => e.student.id);
      
      // 计算过去7天的出勤率
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      for (const enrollment of enrollments) {
        const weeklyAttendance = await prisma.attendanceRecord.findMany({
          where: {
            enrollmentId: enrollment.id,
            recordDate: {
              gte: weekAgo,
              lte: queryDate
            }
          }
        });

        const presentCount = weeklyAttendance.filter(record => 
          record.status === 'PRESENT' || record.status === 'LATE'
        ).length;
        
        const totalSessions = weeklyAttendance.length;
        const weeklyAttendanceRate = totalSessions > 0 
          ? Math.round((presentCount / totalSessions) * 100) 
          : 0;

        // 获取最近7天的成长标签数量
        const recentLogs = await prisma.growthLog.findMany({
          where: {
            enrollmentId: enrollment.id,
            createdAt: {
              gte: weekAgo
            }
          },
          include: {
            tag: true
          }
        });

        const recentPositiveTags = recentLogs.filter(log => 
          log.tag.type === 'GROWTH_POSITIVE'
        ).length;
        
        const recentNegativeTags = recentLogs.filter(log => 
          log.tag.type === 'GROWTH_NEGATIVE'
        ).length;

        statsMap.set(enrollment.student.id, {
          weeklyAttendanceRate,
          recentPositiveTags,
          recentNegativeTags
        });
      }
    }

    // 格式化返回的学生数据
    const studentsWithEnhancedInfo = enrollments.map(enrollment => {
      const student = enrollment.student;
      
      // 构建当日考勤信息
      const todayAttendance = {
        AM: enrollment.attendanceRecords.find(record => record.timeSlot === 'AM')?.status || null,
        PM: enrollment.attendanceRecords.find(record => record.timeSlot === 'PM')?.status || null
      };

              // 构建最近成长标签
        let recentGrowthTags = undefined;
        if (options.includeRecentTags && enrollment.growthLogs) {
          recentGrowthTags = enrollment.growthLogs.map((log: any) => ({
            id: log.tag.id,
            text: log.tag.text,
            type: log.tag.type,
            createdAt: log.createdAt.toISOString()
          }));
        }

      // 构建其他班级信息
      const otherEnrollments = options.includeOtherEnrollments 
        ? otherEnrollmentsMap.get(student.id) || []
        : undefined;

      // 构建统计信息
      const quickStats = options.includeStats 
        ? statsMap.get(student.id)
        : undefined;

      return {
        id: student.id,
        name: student.name,
        gender: student.gender,
        birthDate: student.birthDate?.toISOString(),
        school: student.school,
        grade: student.grade,
        status: student.status,
        enrollmentId: enrollment.id,
        enrollmentDate: enrollment.enrollmentDate?.toISOString(),
        todayAttendance,
        recentGrowthTags,
        otherEnrollments,
        quickStats
      };
    });

    console.log(`成功获取班级 ${classId} 的学生列表，共 ${studentsWithEnhancedInfo.length} 名学生`);
    console.log('查询选项:', options);
    
    return studentsWithEnhancedInfo;

  } catch (error) {
    console.error('获取班级学生时发生错误:', error);
    
    if (error instanceof Error && error.message === '班级不存在') {
      throw error;
    }
    
    throw new Error('获取班级学生失败');
  }
};

/**
 * @description 向班级中批量添加学生
 * @param {number} classId - 班级ID
 * @param {number[]} studentIds - 学生ID数组
 * @returns {Promise<any>}
 */
export const addStudentsToClass = async (classId: number, studentIds: number[]) => {
  try {
    if (!studentIds || studentIds.length === 0) {
      throw new Error('学生ID列表不能为空');
    }

    // 验证班级是否存在
    const classExists = await prisma.class.findUnique({
      where: { id: classId }
    });

    if (!classExists) {
      throw new Error('班级不存在');
    }

    // 验证学生是否存在且状态为已报名或试听
    const students = await prisma.customer.findMany({
      where: {
        id: {
          in: studentIds
        },
        status: {
          in: ['ENROLLED', 'TRIAL_CLASS'] // 允许已报名和试听的客户加入班级
        }
      }
    });

    if (students.length !== studentIds.length) {
      // 提供详细的错误信息
      const foundStudentIds = students.map(s => s.id);
      const missingStudentIds = studentIds.filter(id => !foundStudentIds.includes(id));
      
      // 检查缺失的学生是否存在但状态不对
      const allStudents = await prisma.customer.findMany({
        where: {
          id: {
            in: missingStudentIds
          }
        },
        select: {
          id: true,
          name: true,
          status: true
        }
      });
      
      const existButWrongStatus = allStudents.filter(s => s.status !== 'ENROLLED' && s.status !== 'TRIAL_CLASS');
      const completelyMissing = missingStudentIds.filter(id => !allStudents.find(s => s.id === id));
      
      let errorMessage = '部分学生不符合加入班级的条件：';
      if (existButWrongStatus.length > 0) {
        errorMessage += `\n状态不符合的学生: ${existButWrongStatus.map(s => `${s.name}(ID:${s.id}, 状态:${s.status}, 需要为已报名或试听状态)`).join(', ')}`;
      }
      if (completelyMissing.length > 0) {
        errorMessage += `\n不存在的学生ID: ${completelyMissing.join(', ')}`;
      }
      
      console.log('学生验证失败详情:', {
        requestedIds: studentIds,
        foundIds: foundStudentIds,
        missingIds: missingStudentIds,
        existButWrongStatus,
        completelyMissing
      });
      
      throw new Error(errorMessage);
    }

    // 检查是否有学生已经在该班级中
    const existingEnrollments = await prisma.classEnrollment.findMany({
      where: {
        classId: classId,
        studentId: {
          in: studentIds
        }
      }
    });

    if (existingEnrollments.length > 0) {
      throw new Error('部分学生已在该班级中');
    }

    // 批量创建班级注册记录
    const enrollmentData = studentIds.map(studentId => ({
      classId: classId,
      studentId: studentId
    }));

    const createdEnrollments = await prisma.classEnrollment.createMany({
      data: enrollmentData
    });

    // 获取完整的注册信息返回
    const result = await prisma.classEnrollment.findMany({
      where: {
        classId: classId,
        studentId: {
          in: studentIds
        }
      },
      include: {
        student: true,
        class: true
      }
    });

    console.log(`成功向班级 ${classId} 添加 ${studentIds.length} 名学生`);
    return result;

  } catch (error) {
    console.error('添加学生到班级时发生错误:', error);
    
    if (error instanceof Error && (
      error.message === '学生ID列表不能为空' ||
      error.message === '班级不存在' ||
      error.message === '部分学生不存在或未报名' ||
      error.message === '部分学生已在该班级中'
    )) {
      throw error;
    }
    
    throw new Error('添加学生到班级失败');
  }
};

/**
 * @description 从班级中批量移除学生
 * @param {number[]} enrollmentIds - 班级注册ID数组
 * @returns {Promise<any>}
 */
export const removeStudentsFromClass = async (enrollmentIds: number[]) => {
  try {
    if (!enrollmentIds || enrollmentIds.length === 0) {
      throw new Error('注册ID列表不能为空');
    }

    const deleteResult = await prisma.classEnrollment.deleteMany({
      where: {
        id: {
          in: enrollmentIds
        }
      }
    });

    console.log(`成功从班级中移除 ${deleteResult.count} 名学生`);
    return deleteResult;

  } catch (error) {
    console.error('从班级中移除学生时发生错误:', error);
    
    if (error instanceof Error && error.message === '注册ID列表不能为空') {
      throw error;
    }
    
    throw new Error('从班级中移除学生失败');
  }
};

/**
 * 删除班级
 * @param classId 班级ID
 * @returns 删除结果
 */
export const deleteClass = async (classId: number) => {
  try {
    if (!classId || !Number.isInteger(classId) || classId <= 0) {
      throw new Error('无效的班级ID');
    }

    // 检查班级是否存在
    const existingClass = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        enrollments: true
      }
    });

    if (!existingClass) {
      throw new Error('班级不存在');
    }

    // 级联删除：先删除所有相关的考勤记录和成长记录
    if (existingClass.enrollments.length > 0) {
      const enrollmentIds = existingClass.enrollments.map(e => e.id);
      
      // 删除成长记录
      await prisma.growthLog.deleteMany({
        where: {
          enrollmentId: {
            in: enrollmentIds
          }
        }
      });

      // 删除考勤记录
      await prisma.attendanceRecord.deleteMany({
        where: {
          enrollmentId: {
            in: enrollmentIds
          }
        }
      });

      // 删除班级注册记录
      await prisma.classEnrollment.deleteMany({
        where: {
          classId: classId
        }
      });
    }

    // 最后删除班级
    const deletedClass = await prisma.class.delete({
      where: { id: classId }
    });

    console.log(`班级 "${deletedClass.name}" (ID: ${classId}) 已成功删除`);
    return deletedClass;

  } catch (error) {
    console.error('删除班级时发生错误:', error);
    
    if (error instanceof Error) {
      if (error.message === '无效的班级ID' || error.message === '班级不存在') {
        throw error;
      }
    }
    
    throw new Error('删除班级失败');
  }
}; 