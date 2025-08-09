// src/services/studentLog.service.ts
import { AttendanceStatus, AttendanceSlot } from '@prisma/client';
import { prisma } from '../utils/database';


// ----------------------------------------
// Service Functions
// ----------------------------------------

/**
 * @description 记录单次学生考勤
 * @param {number} enrollmentId - 班级注册ID
 * @param {AttendanceStatus} status - 考勤状态
 * @param {AttendanceSlot} timeSlot - 时间段 (AM/PM)
 * @returns {Promise<any>}
 */
export const recordAttendance = async (enrollmentId: number, status: AttendanceStatus, timeSlot: AttendanceSlot) => {
  try {
    // 验证注册记录是否存在
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { student: true, class: true }
    });

    if (!enrollment) {
      throw new Error('学生不在该班级中');
    }

    // 获取当前日期
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // 根据当前时间判断是上午还是下午 (12:00为分界点) -> 由传入参数决定
    // const timeSlot: AttendanceSlot = now.getHours() < 12 ? 'AM' : 'PM';

    // 检查今日该时段是否已有考勤记录
    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: {
        enrollmentId_recordDate_timeSlot: {
          enrollmentId: enrollmentId,
          recordDate: today,
          timeSlot: timeSlot
        }
      }
    });

    let attendanceRecord;

    if (existingRecord) {
      // 更新现有记录
      attendanceRecord = await prisma.attendanceRecord.update({
        where: { id: existingRecord.id },
        data: { status: status }
      });
    } else {
      // 创建新记录
      attendanceRecord = await prisma.attendanceRecord.create({
        data: {
          enrollmentId: enrollmentId,
          recordDate: today,
          timeSlot: timeSlot,
          status: status
        }
      });
    }

    console.log(`成功记录考勤: 学生${enrollment.student.name} ${timeSlot === 'AM' ? '上午' : '下午'}${status}`);
    return attendanceRecord;

  } catch (error) {
    console.error('记录考勤时发生错误:', error);
    
    if (error instanceof Error && error.message === '学生不在该班级中') {
      throw error;
    }
    
    throw new Error('记录考勤失败');
  }
};

/**
 * @description 批量获取学生成长统计 (使用Growth API实现)
 * @param {number[]} studentIds - 学生ID数组 (Customer.id)
 * @returns {Promise<Array>} - 学生成长统计数组
 */
export const getStudentsGrowthStats = async (studentIds: number[]) => {
  try {
    if (!studentIds || studentIds.length === 0) {
      return [];
    }

    console.log(`📊 开始获取 ${studentIds.length} 个学生的成长统计...`);

    // 批量查询学生的班级注册信息
    const enrollments = await prisma.classEnrollment.findMany({
      where: {
        studentId: { in: studentIds }
      },
      include: {
        student: {
          select: { id: true, name: true, publicId: true }
        },
        growthLogs: {
          include: {
            tag: {
              select: { id: true, text: true, sentiment: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 100 // 限制查询数量以提高性能
        }
      }
    });

    // 为每个学生计算成长统计
    const statsResults = await Promise.all(
      studentIds.map(async (studentId) => {
        try {
          const enrollment = enrollments.find(e => e.studentId === studentId);
          
          if (!enrollment) {
            // 学生没有班级注册，返回空统计
            return {
              studentId,
              totalLogs: 0,
              positiveRatio: 0,
              negativeRatio: 0,
              lastActivityDate: null
            };
          }

          const logs = enrollment.growthLogs || [];
          const totalLogs = logs.length;

          if (totalLogs === 0) {
            return {
              studentId,
              totalLogs: 0,
              positiveRatio: 0,
              negativeRatio: 0,
              lastActivityDate: null
            };
          }

          // 计算正面和负面比例
          const positiveLogs = logs.filter(log => log.tag?.sentiment === 'POSITIVE').length;
          const negativeLogs = logs.filter(log => log.tag?.sentiment === 'NEGATIVE').length;
          
          const positiveRatio = totalLogs > 0 ? (positiveLogs / totalLogs) * 100 : 0;
          const negativeRatio = totalLogs > 0 ? (negativeLogs / totalLogs) * 100 : 0;

          // 获取最近活动日期
          const lastActivityDate = logs.length > 0 ? logs[0].createdAt.toISOString() : null;

          return {
            studentId,
            totalLogs,
            positiveRatio: Math.round(positiveRatio * 10) / 10, // 保留1位小数
            negativeRatio: Math.round(negativeRatio * 10) / 10,
            lastActivityDate
          };

        } catch (error) {
          console.error(`获取学生 ${studentId} 成长统计失败:`, error);
          return {
            studentId,
            totalLogs: 0,
            positiveRatio: 0,
            negativeRatio: 0,
            lastActivityDate: null
          };
        }
      })
    );

    console.log(`✅ 成功获取 ${statsResults.length} 个学生的成长统计`);
    return statsResults;

  } catch (error) {
    console.error('批量获取学生成长统计失败:', error);
    throw new Error('获取学生成长统计失败');
  }
};