// src/services/studentLog.service.ts
import { PrismaClient, AttendanceStatus, AttendanceSlot } from '@prisma/client';

const prisma = new PrismaClient();

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
 * @description 记录单条学生成长标签
 * @param {number} enrollmentId - 班级注册ID
 * @param {number} tagId - 标签ID
 * @returns {Promise<any>}
 */
export const recordGrowthLog = async (enrollmentId: number, tagId: number) => {
  try {
    // 验证注册记录是否存在
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { student: true }
    });

    if (!enrollment) {
      throw new Error('学生不在该班级中');
    }

    // 验证标签是否存在
    const tag = await prisma.tag.findUnique({
      where: { id: tagId }
    });

    if (!tag) {
      throw new Error('标签不存在');
    }

    // 创建成长记录
    const growthLog = await prisma.growthLog.create({
      data: {
        enrollmentId: enrollmentId,
        tagId: tagId
      },
      include: {
        tag: true,
        enrollment: {
          include: {
            student: true
          }
        }
      }
    });

    console.log(`成功记录成长标签: 学生${enrollment.student.name} - ${tag.text}`);
    return growthLog;

  } catch (error) {
    console.error('记录成长标签时发生错误:', error);
    
    if (error instanceof Error && (
      error.message === '学生不在该班级中' ||
      error.message === '标签不存在'
    )) {
      throw error;
    }
    
    throw new Error('记录成长标签失败');
  }
};

/**
 * @description 获取指定学生的个人成长报告
 * @param {number} studentId - 学生ID
 * @param {Date} startDate - 开始日期
 * @param {Date} endDate - 结束日期
 * @returns {Promise<any>}
 */
export const getStudentGrowthReport = async (studentId: number, startDate: Date, endDate: Date) => {
  try {
    // 验证学生是否存在
    const student = await prisma.customer.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        school: true,
        grade: true
      }
    });

    if (!student) {
      throw new Error('学生不存在');
    }

    // 获取学生的所有班级注册
    const enrollments = await prisma.classEnrollment.findMany({
      where: { studentId: studentId }
    });

    if (enrollments.length === 0) {
      throw new Error('学生未加入任何班级');
    }

    const enrollmentIds = enrollments.map(e => e.id);

    // 获取指定时间范围内的成长记录
    const growthLogs = await prisma.growthLog.findMany({
      where: {
        enrollmentId: {
          in: enrollmentIds
        },
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        tag: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 统计正面和负面标签
    const positiveTagCounts: { [key: string]: { count: number; tagId: number } } = {};
    const negativeTagCounts: { [key: string]: { count: number; tagId: number } } = {};
    const dailyStats: { [key: string]: { positive: number; negative: number } } = {};
    const wordCloudData: Array<{ text: string; value: number; type: 'positive' | 'negative' }> = [];

    growthLogs.forEach(log => {
      const tagText = log.tag.text;
      const tagType = log.tag.type;
      const tagId = log.tag.id;
      const dateKey = log.createdAt.toISOString().split('T')[0];

      // 初始化日期统计
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { positive: 0, negative: 0 };
      }

      if (tagType === 'GROWTH_POSITIVE') {
        positiveTagCounts[tagText] = { count: (positiveTagCounts[tagText]?.count || 0) + 1, tagId };
        dailyStats[dateKey].positive++;
      } else if (tagType === 'GROWTH_NEGATIVE') {
        negativeTagCounts[tagText] = { count: (negativeTagCounts[tagText]?.count || 0) + 1, tagId };
        dailyStats[dateKey].negative++;
      }
    });

    // 生成Top标签列表 - 匹配前端接口
    const positiveTagsRanking = Object.entries(positiveTagCounts)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 5)
      .map(([text, data]) => ({ 
        tagId: data.tagId, 
        text, 
        count: data.count 
      }));

    const negativeTagsRanking = Object.entries(negativeTagCounts)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 5)
      .map(([text, data]) => ({ 
        tagId: data.tagId, 
        text, 
        count: data.count 
      }));

    // 生成趋势数据 - 匹配前端接口
    const growthTrend = Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      positiveCount: stats.positive,
      negativeCount: stats.negative
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 生成词云数据 - 匹配前端接口
    Object.entries(positiveTagCounts).forEach(([text, data]) => {
      wordCloudData.push({
        text,
        value: data.count,
        type: 'positive'
      });
    });

    Object.entries(negativeTagCounts).forEach(([text, data]) => {
      wordCloudData.push({
        text,
        value: data.count,
        type: 'negative'
      });
    });

    // 计算汇总统计
    const totalLogs = growthLogs.length;
    const positiveLogs = Object.values(positiveTagCounts).reduce((sum, data) => sum + data.count, 0);
    const negativeLogs = Object.values(negativeTagCounts).reduce((sum, data) => sum + data.count, 0);
    
    // 找出最频繁的标签
    const allTagCounts = { ...positiveTagCounts, ...negativeTagCounts };
    let mostFrequentTag: { text: string; count: number; type: 'positive' | 'negative' } = { 
      text: '', 
      count: 0, 
      type: 'positive' 
    };
    
    Object.entries(allTagCounts).forEach(([text, data]) => {
      if (data.count > mostFrequentTag.count) {
        const type: 'positive' | 'negative' = positiveTagCounts[text] ? 'positive' : 'negative';
        mostFrequentTag = { text, count: data.count, type };
      }
    });

    const report = {
      student: {
        id: student.id,
        name: student.name,
        school: student.school,
        grade: student.grade
      },
      wordCloud: wordCloudData,
      positiveTagsRanking,
      negativeTagsRanking,
      growthTrend,
      summary: {
        totalLogs,
        positiveRatio: totalLogs > 0 ? positiveLogs / totalLogs : 0,
        negativeRatio: totalLogs > 0 ? negativeLogs / totalLogs : 0,
        mostFrequentTag
      }
    };

    console.log(`成功生成学生${student.name}的成长报告，包含${totalLogs}条记录`);
    return report;

  } catch (error) {
    console.error('生成成长报告时发生错误:', error);
    
    if (error instanceof Error && (
      error.message === '学生不存在' ||
      error.message === '学生未加入任何班级'
    )) {
      throw error;
    }
    
    throw new Error('生成成长报告失败');
  }
}; 

/**
 * @description 获取指定学生的个人成长报告（通过publicId）
 * @param {string} publicId - 学生学号
 * @param {Date} startDate - 开始日期
 * @param {Date} endDate - 结束日期
 * @returns {Promise<any>}
 * TODO: 暂时使用原函数，等Prisma类型问题解决后启用
 */
export const getStudentGrowthReportByPublicId = async (publicId: string, startDate: Date, endDate: Date) => {
  try {
    // 暂时通过名称查找学生（因为publicId字段Prisma还未识别）
    // @ts-ignore
    const customer = await prisma.customer.findFirst({
      where: {
        publicId: publicId
      }
    });
    
    if (!customer) {
      throw new Error('学生不存在');
    }
    
    return getStudentGrowthReport(customer.id, startDate, endDate);
  } catch (error) {
    console.error('通过publicId获取成长报告时发生错误:', error);
    throw error;
  }
}; 