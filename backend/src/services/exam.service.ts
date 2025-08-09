// src/services/exam.service.ts
import { ExamType, Subject } from '@prisma/client';
import { 
  calculateSubjectStatistics, 
  calculateRanksAndPercentiles, 
  generateScoreDistribution as createScoreDistribution,
  calculateExcellentLine,
  calculateNormalizedScores,
  calculateAverage
} from '../utils/examCalculations';
import { prisma } from '../utils/database';

// ----------------------------------------
// 考试管理服务
// ----------------------------------------

/**
 * @description 为班级创建新考试
 */
export const createExam = async (examData: {
  name: string;
  examType: ExamType;
  examDate: Date;
  totalScore?: number;
  description?: string;
  classId: number;
  createdById: number;
  subjects: Subject[];
}) => {
  try {
    const { subjects, ...examInfo } = examData;
    
    // 验证班级是否存在
    const classExists = await prisma.class.findUnique({
      where: { id: examData.classId }
    });
    
    if (!classExists) {
      throw new Error('班级不存在');
    }
    
    // 获取班级所有学生
    const enrollments = await prisma.classEnrollment.findMany({
      where: { classId: examData.classId },
      include: { student: true }
    });
    
    if (enrollments.length === 0) {
      throw new Error('班级暂无学生，无法创建考试');
    }
    
    // 创建考试记录
    const exam = await prisma.exam.create({
      data: examInfo,
      include: {
        class: true,
        createdBy: true
      }
    });
    
    // 为每个学生和每个科目创建空的成绩记录
    const scoreRecords = [];
    for (const enrollment of enrollments) {
      for (const subject of subjects) {
        scoreRecords.push({
          examId: exam.id,
          enrollmentId: enrollment.id,
          subject: subject,
          score: null,
          isAbsent: false
        });
      }
    }
    
    await prisma.examScore.createMany({
      data: scoreRecords
    });
    
    console.log(`✅ 成功创建考试: ${exam.name}, 班级: ${classExists.name}, 学生数: ${enrollments.length}, 科目数: ${subjects.length}`);
    
    return {
      exam,
      studentCount: enrollments.length,
      subjectCount: subjects.length
    };
    
  } catch (error) {
    console.error('❌ 创建考试失败:', error);
    throw error instanceof Error ? error : new Error('创建考试失败');
  }
};

/**
 * @description 获取班级考试列表
 */
export const getClassExams = async (classId: number, filters: {
  name?: string;
  examType?: ExamType;
  startDate?: Date;
  endDate?: Date;
  includeDeleted?: boolean;
} = {}) => {
  try {
    const whereClause: any = {
      classId: classId
    };
    
    if (!filters.includeDeleted) {
      whereClause.deletedAt = null;
    }
    
    if (filters.name) {
      whereClause.name = {
        contains: filters.name,
        mode: 'insensitive'
      };
    }
    
    if (filters.examType) {
      whereClause.examType = filters.examType;
    }
    
    if (filters.startDate || filters.endDate) {
      whereClause.examDate = {};
      if (filters.startDate) {
        whereClause.examDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        whereClause.examDate.lte = filters.endDate;
      }
    }
    
    const exams = await prisma.exam.findMany({
      where: whereClause,
      include: {
        class: true,
        createdBy: { select: { id: true, displayName: true, username: true } },
        scores: {
          include: {
            enrollment: {
              include: { student: true }
            }
          }
        },
        _count: {
          select: { scores: true }
        }
      },
      orderBy: [
        { examDate: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    
    // 获取班级总学生数
    const totalStudents = await prisma.classEnrollment.count({
      where: { classId: classId }
    });
    
    // 为每个考试计算统计数据
    const examsWithStats = exams.map(exam => {
      const scores = exam.scores;
      
      // 获取考试涉及的科目
      const subjects = [...new Set(scores.map(s => s.subject))];
      const totalPossibleScores = totalStudents * subjects.length;
      
      // 计算实际录入的成绩数（包括缺考记录）
      let validScores = 0;
      let absentScores = 0;
      
      scores.forEach(score => {
        if (score.isAbsent) {
          absentScores++;
        } else if (score.score !== null && score.score !== undefined) {
          validScores++;
        }
      });
      
      const totalRecorded = validScores + absentScores;
      const completionRate = totalPossibleScores > 0 ? (totalRecorded / totalPossibleScores) * 100 : 0;
      const participationRate = totalPossibleScores > 0 ? (validScores / totalPossibleScores) * 100 : 0;
      
      return {
        ...exam,
        totalStudents,
        subjects,
        completionRate: Math.round(completionRate * 10) / 10, // 保留一位小数
        participationRate: Math.round(participationRate * 10) / 10,
        validScores,
        absentScores,
        totalRecorded,
        totalPossibleScores
      };
    });
    
    console.log(`📊 获取班级 ${classId} 考试列表: ${exams.length} 场考试，班级学生数: ${totalStudents}`);
    return examsWithStats;
    
  } catch (error) {
    console.error('❌ 获取考试列表失败:', error);
    throw new Error('获取考试列表失败');
  }
};

/**
 * @description 录入/更新考试成绩
 */
export const updateExamScores = async (examId: number, scoresData: Array<{
  enrollmentId: number;
  subject: Subject;
  score?: number;
  isAbsent?: boolean;
  tags?: number[];
}>) => {
  try {
    // 验证考试是否存在
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { class: true }
    });
    
    if (!exam) {
      throw new Error('考试不存在');
    }
    
    if (exam.deletedAt) {
      throw new Error('不能为已删除的考试录入成绩');
    }
    
    const results = [];
    
    for (const scoreData of scoresData) {
      const { tags, ...scoreInfo } = scoreData;
      
      // 更新成绩记录
      const updatedScore = await prisma.examScore.upsert({
        where: {
          examId_enrollmentId_subject: {
            examId: examId,
            enrollmentId: scoreData.enrollmentId,
            subject: scoreData.subject
          }
        },
        update: {
          score: scoreData.isAbsent ? null : scoreData.score,
          isAbsent: scoreData.isAbsent || false,
          updatedAt: new Date()
        },
        create: {
          examId: examId,
          enrollmentId: scoreData.enrollmentId,
          subject: scoreData.subject,
          score: scoreData.isAbsent ? null : scoreData.score,
          isAbsent: scoreData.isAbsent || false
        },
        include: {
          enrollment: {
            include: { student: true }
          }
        }
      });
      
      // 处理标签关联
      console.log(`🔍 处理标签 - examScoreId: ${updatedScore.id}, tags:`, tags);
      
      // 先删除现有标签（无论是否有新标签都要清理）
      await prisma.examScoreTag.deleteMany({
        where: { examScoreId: updatedScore.id }
      });
      console.log(`🔍 已删除examScoreId ${updatedScore.id}的现有标签`);
      
      if (tags && tags.length > 0) {
        // 添加新标签
        const tagData = tags.map(tagId => ({
          examScoreId: updatedScore.id,
          tagId: tagId
        }));
        console.log(`🔍 准备插入标签数据:`, tagData);
        
        await prisma.examScoreTag.createMany({
          data: tagData
        });
        console.log(`🔍 成功插入 ${tags.length} 个标签到examScoreId ${updatedScore.id}`);
      }
      
      results.push(updatedScore);
    }
    
    console.log(`✅ 更新考试 ${examId} 成绩: ${results.length} 条记录`);
    return results;
    
  } catch (error) {
    console.error('❌ 更新考试成绩失败:', error);
    throw error instanceof Error ? error : new Error('更新考试成绩失败');
  }
};

/**
 * @description 获取考试详细信息和成绩
 */
export const getExamDetails = async (examId: number) => {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        class: true,
        createdBy: { select: { id: true, displayName: true, username: true } },
        scores: {
          include: {
            enrollment: {
              include: { student: true }
            },
            tags: {
              include: { tag: true }
            }
          },
          orderBy: [
            { subject: 'asc' },
            { enrollment: { student: { name: 'asc' } } }
          ]
        }
      }
    });
    
    if (!exam) {
      throw new Error('考试不存在');
    }
    
    console.log(`📋 获取考试详情: ${exam.name}`);
    
    return exam;
    
  } catch (error) {
    console.error('❌ 获取考试详情失败:', error);
    throw error instanceof Error ? error : new Error('获取考试详情失败');
  }
};

/**
 * @description 软删除考试
 */
export const deleteExam = async (examId: number, deletedById: number) => {
  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { _count: { select: { scores: true } } }
    });
    
    if (!exam) {
      throw new Error('考试不存在');
    }
    
    if (exam.deletedAt) {
      throw new Error('考试已被删除');
    }
    
    // 软删除考试
    const deletedExam = await prisma.exam.update({
      where: { id: examId },
      data: {
        deletedAt: new Date(),
        deletedById: deletedById
      }
    });
    
    console.log(`🗑️ 软删除考试: ${exam.name}, 影响成绩记录: ${exam._count.scores} 条`);
    
    return deletedExam;
    
  } catch (error) {
    console.error('❌ 删除考试失败:', error);
    throw error instanceof Error ? error : new Error('删除考试失败');
  }
}; 

/**
 * @description 获取单个考试的完整统计分析
 */
export const getExamStatistics = async (examId: number) => {
  try {
    // 获取考试基本信息
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        class: true,
        createdBy: { select: { id: true, displayName: true, username: true } },
        scores: {
          include: {
            enrollment: {
              include: { student: true }
            },
            tags: {
              include: { tag: true }
            }
          }
        }
      }
    });

    if (!exam) {
      throw new Error('考试不存在');
    }

    // 基础统计数据
    const totalStudents = await prisma.classEnrollment.count({
      where: { classId: exam.classId }
    });

    const scores = exam.scores;
    const validScores = scores.filter(s => !s.isAbsent && s.score !== null);
    const absentCount = scores.filter(s => s.isAbsent).length;
    const participationRate = totalStudents > 0 ? ((totalStudents - absentCount) / totalStudents) * 100 : 0;

    // 科目维度分析
    const subjectAnalysis = await analyzeBySubject(scores, exam.totalScore || 100);
    
    // 学生表现分析
    const studentPerformance = await analyzeStudentPerformance(scores, exam.totalScore || 100);
    
    // 词条分析
    const tagAnalysis = await analyzeExamTags(scores);
    
    // 分数分布分析
    const scoreDistribution = analyzeScoreDistribution(validScores, exam.totalScore || 100);
    
    // 难度系数分析
    const difficultyAnalysis = calculateDifficultyMetrics(validScores, exam.totalScore || 100);

    const statistics = {
      exam: {
        id: exam.id,
        name: exam.name,
        examType: exam.examType,
        examDate: exam.examDate,
        totalScore: exam.totalScore,
        class: exam.class
      },
      overview: {
        totalStudents,
        participantCount: totalStudents - absentCount,
        absentCount,
        participationRate: Math.round(participationRate * 100) / 100,
        recordedScores: validScores.length,
        coverageRate: Math.round((validScores.length / (totalStudents * getUniqueSubjects(scores).length)) * 100)
      },
      subjectAnalysis,
      studentPerformance,
      tagAnalysis,
      scoreDistribution,
      difficultyAnalysis,
      generatedAt: new Date()
    };

    console.log(`📊 生成考试统计分析: ${exam.name}, 参与学生: ${totalStudents - absentCount}/${totalStudents}`);
    
    return statistics;
    
  } catch (error) {
    console.error('❌ 获取考试统计分析失败:', error);
    throw error instanceof Error ? error : new Error('获取考试统计分析失败');
  }
};

/**
 * @description 科目维度分析
 */
const analyzeBySubject = async (scores: any[], totalScore: number) => {
  const subjectGroups = scores.reduce((acc, score) => {
    if (!acc[score.subject]) {
      acc[score.subject] = [];
    }
    acc[score.subject].push(score);
    return acc;
  }, {} as Record<string, any[]>);

  const subjectStats = Object.entries(subjectGroups).map(([subject, subjectScores]) => {
    const scores = subjectScores as any[];
    const validScores = scores.filter((s: any) => !s.isAbsent && s.score !== null);
    const absentCount = scores.filter((s: any) => s.isAbsent).length;
    
    if (validScores.length === 0) {
      return {
        subject,
        studentCount: scores.length,
        participantCount: 0,
        absentCount,
        average: 0,
        highest: 0,
        lowest: 0,
        passRate: 0,
        excellentRate: 0,
        standardDeviation: 0,
        difficulty: 'N/A',
        percentiles: null
      };
    }

    const scoreValues = validScores.map(s => s.score);
    const average = scoreValues.reduce((sum, s) => sum + s, 0) / scoreValues.length;
    const highest = Math.max(...scoreValues);
    const lowest = Math.min(...scoreValues);
    
    // 🎯 修复硬编码：基于考试总分动态计算及格线和优秀线
    const passThreshold = (60 / 100) * totalScore; // 及格线：总分的60%
    const excellentThreshold = (90 / 100) * totalScore; // 优秀线：总分的90%（用于统计优秀率）
    
    const passCount = scoreValues.filter(s => s >= passThreshold).length;
    const excellentCount = scoreValues.filter(s => s >= excellentThreshold).length;
    const passRate = (passCount / validScores.length) * 100;
    const excellentRate = (excellentCount / validScores.length) * 100;

    // 计算标准差
    const variance = scoreValues.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scoreValues.length;
    const standardDeviation = Math.sqrt(variance);

    // 计算该科目的分位数
    const sortedScores = [...scoreValues].sort((a, b) => a - b);
    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * sortedScores.length) - 1;
      return sortedScores[Math.max(0, index)];
    };

    // 判断难度等级（基于归一化平均分）
    const normalizedAvg = (average / totalScore) * 100;
    let difficulty = 'normal';
    if (normalizedAvg >= 85) difficulty = 'easy';
    else if (normalizedAvg >= 70) difficulty = 'normal';
    else if (normalizedAvg >= 55) difficulty = 'hard';
    else difficulty = 'very_hard';

    return {
      subject,
      studentCount: scores.length,
      participantCount: validScores.length,
      absentCount,
      average: Math.round(average * 100) / 100,
      highest,
      lowest,
      passRate: Math.round(passRate * 100) / 100,
      excellentRate: Math.round(excellentRate * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      difficulty,
      // 添加该科目的分位数数据，用于15%优秀线计算
      percentiles: validScores.length > 0 ? {
        p25: getPercentile(25),
        p50: getPercentile(50),
        p75: getPercentile(75),
        p85: getPercentile(85), // 15%优秀线
        p90: getPercentile(90)
      } : null
    };
  });

  return subjectStats.sort((a, b) => b.average - a.average);
};

/**
 * @description 学生表现分析
 */
const analyzeStudentPerformance = async (scores: any[], totalScore: number) => {
  // 按学生分组计算平均分
  const studentGroups = scores.reduce((acc, score) => {
    const studentId = score.enrollment.student.id;
    if (!acc[studentId]) {
      acc[studentId] = {
        student: score.enrollment.student,
        scores: []
      };
    }
    acc[studentId].scores.push(score);
    return acc;
  }, {} as Record<number, any>);

  const studentStats = Object.values(studentGroups).map((group: any) => {
    const validScores = group.scores.filter((s: any) => !s.isAbsent && s.score !== null);
    const absentCount = group.scores.filter((s: any) => s.isAbsent).length;
    
    if (validScores.length === 0) {
      return {
        student: group.student,
        subjectCount: group.scores.length,
        validCount: 0,
        absentCount,
        average: 0,
        highest: 0,
        lowest: 0,
        rank: 0,
        performance: 'absent'
      };
    }

    const scoreValues = validScores.map((s: any) => s.score);
    const average = scoreValues.reduce((sum: number, s: number) => sum + s, 0) / scoreValues.length;
    const highest = Math.max(...scoreValues);
    const lowest = Math.min(...scoreValues);

    // 判断表现等级
    let performance = 'average';
    const percentage = (average / totalScore) * 100;
    if (percentage >= 90) performance = 'excellent';
    else if (percentage >= 80) performance = 'good';
    else if (percentage >= 60) performance = 'average';
    else performance = 'needs_improvement';

    return {
      student: group.student,
      subjectCount: group.scores.length,
      validCount: validScores.length,
      absentCount,
      average: Math.round(average * 100) / 100,
      highest,
      lowest,
      performance
    };
  });

  // 排序并设置排名
  const rankedStudents = studentStats
    .filter(s => s.validCount > 0)
    .sort((a, b) => b.average - a.average)
    .map((student, index) => ({
      ...student,
      rank: index + 1
    }));

  // 性能分层统计
  const performanceDistribution = {
    excellent: rankedStudents.filter(s => s.performance === 'excellent').length,
    good: rankedStudents.filter(s => s.performance === 'good').length,
    average: rankedStudents.filter(s => s.performance === 'average').length,
    needs_improvement: rankedStudents.filter(s => s.performance === 'needs_improvement').length,
    absent: studentStats.filter(s => s.validCount === 0).length
  };

  return {
    students: rankedStudents,
    distribution: performanceDistribution,
    topPerformers: rankedStudents.slice(0, 5),
    needsAttention: rankedStudents.filter(s => s.performance === 'needs_improvement').slice(0, 5)
  };
};

/**
 * @description 考试词条分析
 */
const analyzeExamTags = async (scores: any[]) => {
  const allTags = scores.flatMap(score => score.tags || []);
  
  if (allTags.length === 0) {
    return {
      totalTags: 0,
      positiveCount: 0,
      negativeCount: 0,
      topPositiveTags: [],
      topNegativeTags: [],
      studentTagDistribution: {}
    };
  }

  // 统计词条频次
  const tagFrequency = allTags.reduce((acc, scoreTag) => {
    const tag = scoreTag.tag;
    if (!acc[tag.id]) {
      acc[tag.id] = {
        tag: tag,
        count: 0,
        students: new Set()
      };
    }
    acc[tag.id].count++;
    acc[tag.id].students.add(scoreTag.examScore?.enrollment?.student?.id);
    return acc;
  }, {} as Record<number, any>);

  const tagStats = Object.values(tagFrequency).map((item: any) => ({
    tag: item.tag,
    count: item.count,
    studentCount: item.students.size,
    frequency: Math.round((item.count / allTags.length) * 100)
  }));

  const positiveTags = tagStats.filter(t => t.tag.type === 'EXAM_POSITIVE').sort((a, b) => b.count - a.count);
  const negativeTags = tagStats.filter(t => t.tag.type === 'EXAM_NEGATIVE').sort((a, b) => b.count - a.count);

  return {
    totalTags: allTags.length,
    positiveCount: positiveTags.reduce((sum, t) => sum + t.count, 0),
    negativeCount: negativeTags.reduce((sum, t) => sum + t.count, 0),
    topPositiveTags: positiveTags.slice(0, 10),
    topNegativeTags: negativeTags.slice(0, 10),
    tagDistribution: {
      positive: positiveTags.length,
      negative: negativeTags.length
    }
  };
};

/**
 * @description 分数分布分析
 */
const analyzeScoreDistribution = (validScores: any[], totalScore: number) => {
  if (validScores.length === 0) {
    return {
      ranges: [],
      percentiles: {},
      average: 0,
      median: 0
    };
  }

  const scoreValues = validScores.map(s => s.score).sort((a, b) => a - b);
  
  // 分数段分布 (按10分为一段)
  const ranges = [];
  for (let i = 0; i < totalScore; i += 10) {
    const min = i;
    const max = Math.min(i + 9, totalScore);
    const count = scoreValues.filter(score => score >= min && score <= max).length;
    ranges.push({
      range: `${min}-${max}`,
      count,
      percentage: Math.round((count / validScores.length) * 100)
    });
  }

  // 百分位数
  const getPercentile = (p: number) => {
    const index = Math.ceil((p / 100) * scoreValues.length) - 1;
    return scoreValues[Math.max(0, index)];
  };

  const average = scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length;
  const median = getPercentile(50);

  return {
    ranges: ranges.filter(r => r.count > 0),
    percentiles: {
      p25: getPercentile(25),
      p50: median,
      p75: getPercentile(75),
      p85: getPercentile(85), // 添加p85用于15%优秀线计算
      p90: getPercentile(90)
    },
    average: Math.round(average * 100) / 100,
    median
  };
};

/**
 * @description 难度系数分析
 */
const calculateDifficultyMetrics = (validScores: any[], totalScore: number) => {
  if (validScores.length === 0) {
    return {
      difficultyIndex: 0,
      discriminationIndex: 0,
      reliability: 0,
      level: 'unknown'
    };
  }

  const scoreValues = validScores.map(s => s.score);
  const average = scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length;
  
  // 难度系数 (平均分/总分)
  const difficultyIndex = average / totalScore;
  
  // 区分度计算 (高分组与低分组的差异)
  const sortedScores = [...scoreValues].sort((a, b) => b - a);
  const topGroup = sortedScores.slice(0, Math.ceil(sortedScores.length * 0.27));
  const bottomGroup = sortedScores.slice(-Math.ceil(sortedScores.length * 0.27));
  
  const topAverage = topGroup.reduce((sum, score) => sum + score, 0) / topGroup.length;
  const bottomAverage = bottomGroup.reduce((sum, score) => sum + score, 0) / bottomGroup.length;
  const discriminationIndex = (topAverage - bottomAverage) / totalScore;

  // 信度估算 (基于标准差)
  const variance = scoreValues.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scoreValues.length;
  const standardDeviation = Math.sqrt(variance);
  const reliability = 1 - (Math.pow(standardDeviation, 2) / Math.pow(totalScore / 3, 2));

  // 难度等级判定
  let level = 'normal';
  if (difficultyIndex >= 0.85) level = 'easy';
  else if (difficultyIndex >= 0.70) level = 'normal';
  else if (difficultyIndex >= 0.55) level = 'hard';
  else level = 'very_hard';

  return {
    difficultyIndex: Math.round(difficultyIndex * 1000) / 1000,
    discriminationIndex: Math.round(discriminationIndex * 1000) / 1000,
    reliability: Math.round(Math.max(0, reliability) * 1000) / 1000,
    level
  };
};

/**
 * @description 获取考试涉及的所有科目
 */
const getUniqueSubjects = (scores: any[]) => {
  return [...new Set(scores.map(s => s.subject))];
};

/**
 * @description 获取班级科目的历史趋势分析
 */
export const getSubjectTrend = async (
  classId: number,
  subject: Subject,
  filters: {
    examType?: ExamType;
    startDate?: Date;
    endDate?: Date;
  } = {}
) => {
  try {
    const whereClause: any = {
      classId: classId,
      deletedAt: null,
      scores: {
        some: {
          subject: subject
        }
      }
    };

    if (filters.examType) {
      whereClause.examType = filters.examType;
    }

    if (filters.startDate || filters.endDate) {
      whereClause.examDate = {};
      if (filters.startDate) {
        whereClause.examDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        whereClause.examDate.lte = filters.endDate;
      }
    }

    // 获取符合条件的考试
    const exams = await prisma.exam.findMany({
      where: whereClause,
      include: {
        scores: {
          where: { subject: subject },
          include: {
            enrollment: {
              include: { student: true }
            }
          }
        },
        class: true
      },
      orderBy: { examDate: 'asc' }
    });

    if (exams.length === 0) {
      return {
        trend: [],
        summary: {
          totalExams: 0,
          totalStudents: 0,
          averageScore: 0,
          averageParticipationRate: 0,
          improvement: 0
        }
      };
    }

    // 计算每场考试的统计数据
    const trendData = exams.map(exam => {
      const scores = exam.scores.filter(s => s.subject === subject);
      const validScores = scores.filter(s => !s.isAbsent && s.score !== null);
      const absentCount = scores.filter(s => s.isAbsent).length;
      
      const scoreValues = validScores.map(s => s.score!);
      const average = scoreValues.length > 0 
        ? scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length 
        : 0;
      
      const normalizedAverage = exam.totalScore && exam.totalScore > 0 
        ? (average / exam.totalScore) * 100 
        : average;

      const participationRate = scores.length > 0 
        ? (validScores.length / scores.length) * 100 
        : 0;

      return {
        examId: exam.id,
        examName: exam.name,
        examDate: exam.examDate.toISOString().split('T')[0],
        examType: exam.examType,
        totalScore: exam.totalScore || 100,
        totalStudents: scores.length,
        participantCount: validScores.length,
        absentCount,
        averageScore: Math.round(average * 100) / 100,
        normalizedAverage: Math.round(normalizedAverage * 100) / 100,
        highestScore: scoreValues.length > 0 ? Math.max(...scoreValues) : 0,
        lowestScore: scoreValues.length > 0 ? Math.min(...scoreValues) : 0,
        participationRate: Math.round(participationRate * 100) / 100,
        passRate: scoreValues.length > 0 
          ? Math.round((scoreValues.filter(s => s >= (60 / 100) * (exam.totalScore || 100)).length / scoreValues.length) * 10000) / 100
          : 0,
        excellentRate: scoreValues.length > 0 
          ? Math.round((scoreValues.filter(s => s >= (exam.totalScore || 100) * 0.85).length / scoreValues.length) * 10000) / 100
          : 0
      };
    });

    // 计算总体统计
    const totalStudentsSet = new Set();
    exams.forEach(exam => {
      exam.scores.forEach(score => {
        totalStudentsSet.add(score.enrollmentId);
      });
    });

    const allValidScores = trendData.filter(t => t.participantCount > 0);
    const overallAverage = allValidScores.length > 0 
      ? allValidScores.reduce((sum, t) => sum + t.normalizedAverage, 0) / allValidScores.length 
      : 0;
    
    const overallParticipationRate = trendData.length > 0 
      ? trendData.reduce((sum, t) => sum + t.participationRate, 0) / trendData.length 
      : 0;

    // 计算提升情况（最近3次与之前的对比）
    let improvement = 0;
    if (allValidScores.length >= 3) {
      const recent = allValidScores.slice(-3);
      const earlier = allValidScores.slice(0, -3);
      
      if (earlier.length > 0) {
        const recentAvg = recent.reduce((sum, t) => sum + t.normalizedAverage, 0) / recent.length;
        const earlierAvg = earlier.reduce((sum, t) => sum + t.normalizedAverage, 0) / earlier.length;
        improvement = recentAvg - earlierAvg;
      }
    }

    return {
      trend: trendData,
      summary: {
        totalExams: exams.length,
        totalStudents: totalStudentsSet.size,
        averageScore: Math.round(overallAverage * 100) / 100,
        averageParticipationRate: Math.round(overallParticipationRate * 100) / 100,
        improvement: Math.round(improvement * 100) / 100
      }
    };

  } catch (error) {
    console.error('❌ 获取科目趋势分析失败:', error);
    throw error instanceof Error ? error : new Error('获取科目趋势分析失败');
  }
};

/**
 * @description 获取班级科目下学生的成绩历史和趋势分析
 */
export const getSubjectStudentsAnalysis = async (
  classId: number,
  subject: Subject,
  filters: {
    examType?: ExamType;
    startDate?: Date;
    endDate?: Date;
    studentId?: number;
  } = {}
) => {
  try {
    const whereClause: any = {
      classId: classId,
      deletedAt: null,
      scores: {
        some: {
          subject: subject
        }
      }
    };

    if (filters.examType) {
      whereClause.examType = filters.examType;
    }

    if (filters.startDate || filters.endDate) {
      whereClause.examDate = {};
      if (filters.startDate) {
        whereClause.examDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        whereClause.examDate.lte = filters.endDate;
      }
    }

    // 获取符合条件的考试和成绩
    const exams = await prisma.exam.findMany({
      where: whereClause,
      include: {
                 scores: {
           where: { 
             subject: subject,
             ...(filters.studentId ? {
               enrollment: { studentId: filters.studentId }
             } : {})
           },
           include: {
             enrollment: {
               include: { student: true }
             },
             tags: {
               include: { tag: true }
             }
           }
         }
      },
      orderBy: { examDate: 'asc' }
    });

    if (exams.length === 0) {
      return {
        students: [],
        examHistory: [],
        overview: {
          totalStudents: 0,
          totalExams: 0,
          averageImprovement: 0
        }
      };
    }

    // 按学生组织数据
    const studentMap = new Map<number, any>();
    
    exams.forEach(exam => {
      exam.scores.forEach((score: any) => {
        const studentId = score.enrollment.studentId;
        const studentName = score.enrollment.student.name;
        
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            studentId,
            studentName,
            enrollmentId: score.enrollmentId,
            scores: []
          });
        }
        
        studentMap.get(studentId).scores.push({
          examId: exam.id,
          examName: exam.name,
          examDate: exam.examDate.toISOString().split('T')[0],
          examType: exam.examType,
          totalScore: exam.totalScore || 100,
          score: score.score,
          isAbsent: score.isAbsent,
          normalizedScore: score.score && exam.totalScore 
            ? Math.round((score.score / exam.totalScore) * 10000) / 100 
            : null,
          tags: score.tags.map((st: any) => ({
            id: st.tag.id,
            text: st.tag.text,
            type: st.tag.type
          }))
        });
      });
    });

    // 计算每个学生的统计数据
    const studentsAnalysis = Array.from(studentMap.values()).map((student: any) => {
      const validScores = student.scores.filter((s: any) => !s.isAbsent && s.score !== null);
      const scoreValues = validScores.map((s: any) => s.normalizedScore!).filter((s: any) => s !== null);
      
      let trend = 'stable';
      let improvement = 0;
      
      if (scoreValues.length >= 3) {
        const recent = scoreValues.slice(-2);
        const earlier = scoreValues.slice(0, -2);
        
        if (earlier.length > 0) {
          const recentAvg = recent.reduce((sum: number, s: number) => sum + s, 0) / recent.length;
          const earlierAvg = earlier.reduce((sum: number, s: number) => sum + s, 0) / earlier.length;
          improvement = recentAvg - earlierAvg;
          
          if (improvement > 5) trend = 'improving';
          else if (improvement < -5) trend = 'declining';
        }
      }

      const average = scoreValues.length > 0 
        ? scoreValues.reduce((sum: number, s: number) => sum + s, 0) / scoreValues.length 
        : 0;

      return {
        studentId: student.studentId,
        studentName: student.studentName,
        enrollmentId: student.enrollmentId,
        totalExams: student.scores.length,
        validScores: validScores.length,
        absentCount: student.scores.filter((s: any) => s.isAbsent).length,
        averageScore: Math.round(average * 100) / 100,
        highestScore: scoreValues.length > 0 ? Math.max(...scoreValues) : 0,
        lowestScore: scoreValues.length > 0 ? Math.min(...scoreValues) : 0,
        trend,
        improvement: Math.round(improvement * 100) / 100,
        scores: student.scores,
        participationRate: student.scores.length > 0 
          ? Math.round((validScores.length / student.scores.length) * 10000) / 100 
          : 0
      };
    });

    // 整体概览
    const totalStudents = studentsAnalysis.length;
    const totalExams = exams.length;
    const averageImprovement = studentsAnalysis.length > 0 
      ? studentsAnalysis.reduce((sum: number, s: any) => sum + s.improvement, 0) / studentsAnalysis.length 
      : 0;

    // 考试历史概览
    const examHistory = exams.map(exam => {
      const examScores = exam.scores;
      const validCount = examScores.filter(s => !s.isAbsent && s.score !== null).length;
      const scoreValues = examScores
        .filter(s => !s.isAbsent && s.score !== null)
        .map(s => s.score!);
      
      const average = scoreValues.length > 0 
        ? scoreValues.reduce((sum, s) => sum + s, 0) / scoreValues.length 
        : 0;
      
      const normalizedAverage = exam.totalScore && exam.totalScore > 0 
        ? (average / exam.totalScore) * 100 
        : average;

      return {
        examId: exam.id,
        examName: exam.name,
        examDate: exam.examDate.toISOString().split('T')[0],
        examType: exam.examType,
        totalStudents: examScores.length,
        validCount,
        absentCount: examScores.filter(s => s.isAbsent).length,
        averageScore: Math.round(normalizedAverage * 100) / 100,
        participationRate: examScores.length > 0 
          ? Math.round((validCount / examScores.length) * 10000) / 100 
          : 0
      };
    });

    return {
      students: studentsAnalysis.sort((a, b) => b.averageScore - a.averageScore),
      examHistory,
      overview: {
        totalStudents,
        totalExams,
        averageImprovement: Math.round(averageImprovement * 100) / 100
      }
    };

  } catch (error) {
    console.error('❌ 获取科目学生分析失败:', error);
    throw error instanceof Error ? error : new Error('获取科目学生分析失败');
  }
};

/**
 * @description 获取单次考试的特定科目详细分析
 */
export const getExamSubjectDetail = async (examId: number, subject: Subject, historyLimit: number = 5) => {
  try {
    // 获取考试基本信息
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        class: true,
        createdBy: { select: { id: true, displayName: true, username: true } }
      }
    });

    if (!exam) {
      throw new Error('考试不存在');
    }

    // 获取该科目的所有成绩
    const examScores = await prisma.examScore.findMany({
      where: {
        examId: examId,
        subject: subject
      },
      include: {
        enrollment: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                publicId: true // 重要：包含publicId
              }
            }
          }
        },
        tags: {
          include: { tag: true }
        }
      }
    });

    // 计算统计数据
    const totalScore = exam.totalScore || 100;
    
    // 使用统一的计算函数
    const subjectStats = calculateSubjectStatistics(examScores, totalScore);
    const validScores = examScores.filter(s => !s.isAbsent && s.score !== null);
    const scoreValues = validScores.map(s => s.score!);
    const normalizedScores = calculateNormalizedScores(scoreValues, totalScore);
    
    const subjectStatsWithMeta = {
      name: subject,
      totalScore: totalScore,
      ...subjectStats
    };

    // 修复排名bug：先按分数排序，未参加考试的学生排在最后
    const sortedScores = [...examScores].sort((a, b) => {
      // 未参加考试的学生排在最后
      if (a.isAbsent && !b.isAbsent) return 1;
      if (!a.isAbsent && b.isAbsent) return -1;
      if (a.isAbsent && b.isAbsent) return 0;
      
      // 都参加考试的按分数降序排列
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      return scoreB - scoreA;
    });

    // 使用统一的计算函数计算排名和百分位
    const ranksAndPercentiles = calculateRanksAndPercentiles(
      examScores.map(s => ({ id: s.id, score: s.score, isAbsent: s.isAbsent }))
    );
    const rankMap = new Map(ranksAndPercentiles.map(r => [r.id, r]));

    // 处理学生数据，确保包含publicId和正确的排名
    const students = sortedScores.map((score) => {
      const originalScore = score.score || 0;
      const normalizedScore = score.isAbsent ? 0 : (originalScore / totalScore) * 100;
      const rankData = rankMap.get(score.id);
      
      return {
        id: score.enrollment.student.id,
        name: score.enrollment.student.name,
        publicId: score.enrollment.student.publicId, // 统一使用publicId
        score: originalScore,
        normalizedScore: normalizedScore,
        isAbsent: score.isAbsent,
        rank: rankData?.rank || null,
        percentile: rankData?.percentile || null,
        tags: score.tags.map(tag => ({
          id: tag.tag.id,
          name: tag.tag.text,
          color: getTagColor(tag.tag.type),
          category: tag.tag.type
        }))
      };
    });

    // 生成历史对比数据
    const historicalComparison = await getSubjectHistoricalData(exam.classId, subject, examId, historyLimit);

    console.log(`✅ 获取考试科目详情: 考试${examId}, 科目${subject}, 学生数${students.length}`);

    return {
      exam: {
        id: exam.id,
        name: exam.name,
        date: exam.examDate.toISOString().split('T')[0],
        totalScore: exam.totalScore
      },
      subject: subjectStatsWithMeta,
      students,
      historicalComparison,
      scoreDistribution: createScoreDistribution(scoreValues, normalizedScores, totalScore),
      tags: generateTagAnalysis(examScores)
    };

  } catch (error) {
    console.error('❌ 获取考试科目详情失败:', error);
    throw error instanceof Error ? error : new Error('获取考试科目详情失败');
  }
};



// 辅助函数：分析科目标签
const generateTagAnalysis = (scores: any[]) => {
  const tagMap = new Map<number, any>();
  
  scores.forEach(score => {
    score.tags.forEach((scoreTag: any) => {
      const tag = scoreTag.tag;
      if (!tagMap.has(tag.id)) {
        tagMap.set(tag.id, {
          id: tag.id,
          name: tag.text,
          category: getTagCategory(tag.type),
          color: getTagColor(tag.type),
          count: 0,
          totalScore: 0,
          scores: []
        });
      }
      
      const tagData = tagMap.get(tag.id);
      tagData.count++;
      if (score.score !== null) {
        tagData.totalScore += score.score;
        tagData.scores.push(score.score);
      }
    });
  });

  return Array.from(tagMap.values()).map(tag => ({
    id: tag.id,
    name: tag.name,
    category: tag.category,
    color: tag.color,
    count: tag.count,
    averageScore: tag.scores.length > 0 
      ? Math.round((tag.totalScore / tag.scores.length) * 100) / 100 
      : 0
  })).sort((a, b) => b.count - a.count);
};

// 辅助函数：获取标签颜色
const getTagColor = (tagType: string): string => {
  const colorMap: Record<string, string> = {
    'EXAM_POSITIVE': 'green',
    'EXAM_NEGATIVE': 'red',
    'default': 'default'
  };
  return colorMap[tagType] || colorMap.default;
};

// 辅助函数：获取标签分类
const getTagCategory = (tagType: string) => {
  switch (tagType) {
    case 'EXAM_POSITIVE': return '考试优势';
    case 'EXAM_NEGATIVE': return '考试问题';
    default: return '其他';
  }
};

// 辅助函数：获取历史对比数据
const getSubjectHistoricalData = async (classId: number, subject: Subject, currentExamId: number, limit: number = 5) => {
  try {
    const historicalExams = await prisma.exam.findMany({
      where: {
        classId: classId,
        id: { not: currentExamId },
        deletedAt: null,
        scores: {
          some: { subject: subject }
        }
      },
      include: {
        scores: {
          where: { subject: subject }
        }
      },
      orderBy: { examDate: 'desc' },
      take: limit
    });

    return historicalExams.map(exam => {
      const scores = exam.scores;
      const totalScore = exam.totalScore || 100;
      
      // 使用统一的计算函数
      const stats = calculateSubjectStatistics(scores, totalScore);
      
      return {
        examId: exam.id,
        examName: exam.name,
        date: exam.examDate.toISOString().split('T')[0],
        averageScore: Math.round(stats.averageScore * 100) / 100,
        normalizedAverageScore: Math.round(stats.normalizedAverageScore * 100) / 100,
        excellentLine: Math.round(stats.excellentLine * 100) / 100,
        participationRate: Math.round(stats.participationRate * 100) / 100,
        passRate: Math.round(stats.passRate * 100) / 100,
        excellentRate: Math.round(stats.excellentRate * 100) / 100,
        totalStudents: scores.length,
        totalScore: totalScore
      };
    });
  } catch (error) {
    console.error('获取历史对比数据失败:', error);
    return [];
  }
};

// 辅助函数：获取考试统计数据（排名、班级平均分、最高分）
const getExamStatisticsForStudent = async (examScores: any[]) => {
  const statistics: { [key: string]: { rank: number | null; classAverage: number; classHighest: number } } = {};
  
  // 按考试和科目分组
  const examSubjectGroups: { [key: string]: any[] } = {};
  
  for (const score of examScores) {
    const key = `${score.examId}_${score.subject}`;
    if (!examSubjectGroups[key]) {
      examSubjectGroups[key] = [];
    }
    examSubjectGroups[key].push(score);
  }
  
  // 为每个考试-科目组合计算统计数据
  for (const [key, scores] of Object.entries(examSubjectGroups)) {
    const firstScore = scores[0];
    
    // 获取同一考试同一科目的所有学生成绩
    const allClassScores = await prisma.examScore.findMany({
      where: {
        examId: firstScore.examId,
        subject: firstScore.subject
      },
      include: {
        enrollment: {
          include: {
            student: true
          }
        }
      }
    });
    
    if (allClassScores.length > 0) {
      const validScores = allClassScores.filter(s => !s.isAbsent && s.score !== null);
      const scoreValues = validScores.map(s => s.score!);
      
      // 计算班级统计
      const classAverage = scoreValues.length > 0 ? calculateAverage(scoreValues) : 0;
      const classHighest = scoreValues.length > 0 ? Math.max(...scoreValues) : 0;
      
      // 计算排名
      let rank: number | null = null;
      const studentScore = firstScore.score;
      if (studentScore !== null && !firstScore.isAbsent) {
        const betterScores = validScores.filter(s => (s.score || 0) > studentScore);
        rank = betterScores.length + 1;
      }
      
      statistics[key] = {
        rank,
        classAverage: Math.round(classAverage * 100) / 100,
        classHighest: Math.round(classHighest * 100) / 100
      };
    } else {
      statistics[key] = {
        rank: null,
        classAverage: 0,
        classHighest: 0
      };
    }
  }
  
  return statistics;
};

/*
// ✅ REMOVED: getStudentExamHistory - Use getStudentExamHistoryByPublicId instead

// 获取学生考试历史数据 (通过publicId)
export const getStudentExamHistoryByPublicId = async (publicId: string, params: {
  startDate?: string;
  endDate?: string;
}) => {
  try {
    const { startDate, endDate } = params;
    
    // 构建时间范围查询条件
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }
    
    // 查询学生的所有考试成绩
    const examScores = await prisma.examScore.findMany({
      where: {
        enrollment: {
          studentId: studentId
        },
        ...(Object.keys(dateFilter).length > 0 && {
          exam: {
            examDate: dateFilter
          }
        })
      },
      include: {
        exam: {
          include: {
            class: true
          }
        },
        enrollment: {
          include: {
            student: true
          }
        },
        tags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: {
        exam: {
          examDate: 'asc'
        }
      }
    });

    // 按科目分组统计
    const subjectAnalysis: { [key: string]: any } = {};
    const allScores: any[] = [];
    const examTagsWordCloud: { [key: string]: { count: number; type: string } } = {};

    // 预先获取所有相关考试的成绩数据，用于计算真实的排名和班级统计
    const examStatistics = await getExamStatisticsForStudent(examScores);

    examScores.forEach(score => {
      const subject = score.subject;
      const examDate = score.exam.examDate.toISOString().split('T')[0];
      const examKey = `${score.examId}_${subject}`;
      const examStats = examStatistics[examKey];
      
      // 收集所有成绩记录
      allScores.push({
        examId: score.examId,
        examName: score.exam.name,
        examType: score.exam.examType,
        examDate,
        subject,
        score: score.score || 0,
        totalScore: score.exam.totalScore || 100,
        normalizedScore: score.exam.totalScore && score.score ? Math.round((score.score / score.exam.totalScore) * 100) : (score.score || 0),
        isAbsent: !score.score || score.score === 0,
        rank: examStats?.rank || null,
        classAverage: examStats?.classAverage || 0,
        classHighest: examStats?.classHighest || 0,
        className: score.exam.class.name,
        tags: score.tags.map(tagScore => ({
          id: tagScore.tag.id,
          text: tagScore.tag.text,
          type: tagScore.tag.type
        }))
      });

      // 按科目统计
      if (!subjectAnalysis[subject]) {
        subjectAnalysis[subject] = {
          subject,
          scores: [],
          totalExams: 0,
          validScores: 0,
          absentCount: 0,
          average: 0,
          highest: 0,
          lowest: 100,
          trend: 'stable' as const,
          improvement: 0
        };
      }

      const subjectData = subjectAnalysis[subject];
      subjectData.scores.push({
        examId: score.examId,
        examName: score.exam.name,
        examDate: examDate,
        examType: score.exam.examType,
        date: examDate,
        score: score.score || 0,
        totalScore: score.exam.totalScore || 100,
        normalizedScore: score.exam.totalScore && score.score ? Math.round((score.score / score.exam.totalScore) * 100) : (score.score || 0),
        isAbsent: !score.score || score.score === 0,
        tags: score.tags.map(tagScore => ({
          id: tagScore.tag.id,
          text: tagScore.tag.text,
          type: tagScore.tag.type
        }))
      });
      
      subjectData.totalExams++;
      if (score.score && score.score > 0) {
        subjectData.validScores++;
        const normalizedScore = score.exam.totalScore ? (score.score / score.exam.totalScore) * 100 : score.score;
        subjectData.average = ((subjectData.average * (subjectData.validScores - 1)) + normalizedScore) / subjectData.validScores;
        subjectData.highest = Math.max(subjectData.highest, normalizedScore);
        subjectData.lowest = Math.min(subjectData.lowest, normalizedScore);
      } else {
        subjectData.absentCount++;
      }

      // 收集标签词云数据，保留标签类型信息
      score.tags.forEach(tagScore => {
        const tagText = tagScore.tag.text;
        const tagType = tagScore.tag.type;
        if (!examTagsWordCloud[tagText]) {
          examTagsWordCloud[tagText] = { count: 0, type: tagType };
        }
        examTagsWordCloud[tagText].count += 1;
      });
    });

    // 计算趋势
    Object.values(subjectAnalysis).forEach((subject: any) => {
      if (subject.scores.length >= 2) {
        const recentScores = subject.scores.slice(-3);
        const oldScores = subject.scores.slice(0, -3);
        
        if (oldScores.length > 0) {
          const recentAvg = recentScores.reduce((sum: number, s: any) => sum + s.normalizedScore, 0) / recentScores.length;
          const oldAvg = oldScores.reduce((sum: number, s: any) => sum + s.normalizedScore, 0) / oldScores.length;
          const improvement = recentAvg - oldAvg;
          
          subject.improvement = Math.round(improvement * 100) / 100;
          if (improvement > 3) {
            subject.trend = 'improving';
          } else if (improvement < -3) {
            subject.trend = 'declining';
          }
        }
      }
      
      // 保留两位小数
      subject.average = Math.round(subject.average * 100) / 100;
      subject.highest = Math.round(subject.highest * 100) / 100;
      subject.lowest = Math.round(subject.lowest * 100) / 100;
    });

    // 转换词云数据格式，使用数据库中的真实标签类型
    const examTagsWordCloudArray = Object.entries(examTagsWordCloud).map(([text, data]) => ({
      text,
      value: data.count,
      type: data.type === 'EXAM_POSITIVE' ? 'positive' as const : 'negative' as const
    })).sort((a, b) => b.value - a.value);

    // 更新科目分析中的成绩数据，确保包含班级统计
    Object.values(subjectAnalysis).forEach((subject: any) => {
      subject.scores = subject.scores.map((scoreData: any) => {
        const correspondingScore = allScores.find(s => 
          s.examId === scoreData.examId && s.subject === subject.subject
        );
        return {
          ...scoreData,
          rank: correspondingScore?.rank,
          classAverage: correspondingScore?.classAverage,
          classHighest: correspondingScore?.classHighest
        };
      });
    });

    return {
      totalRecords: allScores.length,
      subjectAnalysis: Object.values(subjectAnalysis),
      allScores,
      examTagsWordCloud: examTagsWordCloudArray
    };

  } catch (error) {
    console.error('获取学生考试历史失败:', error);
    throw new Error('获取学生考试历史失败');
  }
};
*/

// 获取学生考试历史数据 (通过publicId)
export const getStudentExamHistoryByPublicId = async (publicId: string, params: {
  startDate?: string;
  endDate?: string;
}) => {
  try {
    const { startDate, endDate } = params;
    
    // 构建时间范围查询条件
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }
    
    // 直接通过publicId查询学生的所有考试成绩
    const examScores = await prisma.examScore.findMany({
      where: {
        enrollment: {
          student: {
            publicId: publicId  // 直接使用publicId查询
          }
        },
        ...(Object.keys(dateFilter).length > 0 && {
          exam: {
            examDate: dateFilter
          }
        })
      },
      include: {
        exam: {
          include: {
            class: true
          }
        },
        enrollment: {
          include: {
            student: true
          }
        },
        tags: {
          include: {
            tag: true
          }
        }
      },
      orderBy: {
        exam: {
          examDate: 'asc'
        }
      }
    });

    if (examScores.length === 0) {
      // 仍然需要返回学生信息
      const student = await prisma.customer.findUnique({
        where: { publicId },
        select: { id: true, name: true, publicId: true }
      });

      return {
        totalRecords: 0,
        subjectAnalysis: [],
        allScores: [],
        examTagsWordCloud: [],
        student: student ? {
          id: student.id,
          name: student.name,
          publicId: student.publicId
        } : undefined
      };
    }

    // 按科目分组统计
    const subjectAnalysis: { [key: string]: any } = {};
    const allScores: any[] = [];
    const examTagsWordCloud: { [key: string]: { count: number; type: string } } = {};

    // 预先获取所有相关考试的成绩数据，用于计算真实的排名和班级统计
    const examStatistics = await getExamStatisticsForStudent(examScores);

    examScores.forEach(score => {
      const subject = score.subject;
      const examDate = score.exam.examDate.toISOString().split('T')[0];
      const examKey = `${score.examId}_${subject}`;
      const examStats = examStatistics[examKey];
      
      // 收集所有成绩记录
      allScores.push({
        examId: score.examId,
        examName: score.exam.name,
        examType: score.exam.examType,
        examDate,
        subject,
        score: score.score || 0,
        totalScore: score.exam.totalScore || 100,
        normalizedScore: score.exam.totalScore && score.score ? Math.round((score.score / score.exam.totalScore) * 100) : (score.score || 0),
        isAbsent: !score.score || score.score === 0,
        rank: examStats?.rank || null,
        classAverage: examStats?.classAverage || null,
        classHighest: examStats?.classHighest || null,
        className: score.exam.class.name,
        tags: score.tags.map(tagScore => ({
          id: tagScore.tag.id,
          text: tagScore.tag.text,
          type: tagScore.tag.type
        }))
      });

      // 按科目分组
      if (!subjectAnalysis[subject]) {
        subjectAnalysis[subject] = {
          subject,
          scores: [],
          totalExams: 0,
          validScores: 0,
          absentCount: 0,
          average: 0,
          highest: 0,
          lowest: 100,
          trend: 'stable',
          improvement: 0
        };
      }

      const subjectData = subjectAnalysis[subject];
      const normalizedScore = score.exam.totalScore && score.score ? Math.round((score.score / score.exam.totalScore) * 100) : (score.score || 0);

      subjectData.scores.push({
        examId: score.examId,
        examName: score.exam.name,
        examDate,
        examType: score.exam.examType,
        date: examDate,
        score: score.score || 0,
        totalScore: score.exam.totalScore || 100,
        normalizedScore,
        isAbsent: !score.score || score.score === 0,
        tags: score.tags.map(tagScore => ({
          id: tagScore.tag.id,
          text: tagScore.tag.text,
          type: tagScore.tag.type
        })),
        rank: examStats?.rank || null,
        classAverage: examStats?.classAverage || null,
        classHighest: examStats?.classHighest || null
      });

      subjectData.totalExams++;
      
      if (score.score && score.score > 0) {
        subjectData.validScores++;
        subjectData.average = ((subjectData.average * (subjectData.validScores - 1)) + normalizedScore) / subjectData.validScores;
        subjectData.highest = Math.max(subjectData.highest, normalizedScore);
        subjectData.lowest = Math.min(subjectData.lowest, normalizedScore);
      } else {
        subjectData.absentCount++;
      }

      // 收集标签词云数据，保留标签类型信息
      score.tags.forEach(tagScore => {
        const tagText = tagScore.tag.text;
        const tagType = tagScore.tag.type;
        if (!examTagsWordCloud[tagText]) {
          examTagsWordCloud[tagText] = { count: 0, type: tagType };
        }
        examTagsWordCloud[tagText].count += 1;
      });
    });

    // 计算趋势
    Object.values(subjectAnalysis).forEach((subject: any) => {
      if (subject.scores.length >= 2) {
        const recentScores = subject.scores.slice(-3);
        const oldScores = subject.scores.slice(0, -3);
        
        if (oldScores.length > 0) {
          const recentAvg = recentScores.reduce((sum: number, s: any) => sum + s.normalizedScore, 0) / recentScores.length;
          const oldAvg = oldScores.reduce((sum: number, s: any) => sum + s.normalizedScore, 0) / oldScores.length;
          const improvement = recentAvg - oldAvg;
          
          subject.improvement = Math.round(improvement * 100) / 100;
          if (improvement > 3) {
            subject.trend = 'improving';
          } else if (improvement < -3) {
            subject.trend = 'declining';
          }
        }
      }
      
      // 保留两位小数
      subject.average = Math.round(subject.average * 100) / 100;
      subject.highest = Math.round(subject.highest * 100) / 100;
      subject.lowest = Math.round(subject.lowest * 100) / 100;
    });

    // 转换词云数据格式，使用数据库中的真实标签类型
    const examTagsWordCloudArray = Object.entries(examTagsWordCloud).map(([text, data]) => ({
      text,
      value: data.count,
      type: data.type === 'EXAM_POSITIVE' ? 'positive' as const : 'negative' as const
    })).sort((a, b) => b.value - a.value);

    // 更新科目分析中的成绩数据，确保包含班级统计
    Object.values(subjectAnalysis).forEach((subject: any) => {
      subject.scores = subject.scores.map((scoreData: any) => {
        const correspondingScore = allScores.find(s => 
          s.examId === scoreData.examId && s.subject === subject.subject
        );
        return {
          ...scoreData,
          rank: correspondingScore?.rank,
          classAverage: correspondingScore?.classAverage,
          classHighest: correspondingScore?.classHighest
        };
      });
    });

    // 获取学生信息
    const student = examScores[0]?.enrollment?.student;

    return {
      totalRecords: allScores.length,
      subjectAnalysis: Object.values(subjectAnalysis),
      allScores,
      examTagsWordCloud: examTagsWordCloudArray,
      student: student ? {
        id: student.id,
        name: student.name,
        publicId: student.publicId
      } : undefined
    };

  } catch (error) {
    console.error('通过publicId获取学生考试历史失败:', error);
    throw error;
  }
};