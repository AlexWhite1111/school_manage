import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Button,
  Typography,
  Space,
  Select,
  DatePicker,
  Spin,
  Empty,
  Row,
  Col,
  Statistic,
  Progress,
  List,
  Tag,
  Badge,
  Tooltip,
  message,
  Divider,
  Avatar,
  Table,
  Card
} from 'antd';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  ArrowLeftOutlined,
  TrophyOutlined,
  LineChartOutlined,
  CloudOutlined,
  SmileOutlined,
  FrownOutlined,
  ReloadOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  BarChartOutlined,
  RiseOutlined,
  FallOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  FireOutlined,
  ClockCircleOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  BookOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  RadarChartOutlined,
  EditOutlined,
  TeamOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { useThemeStore } from '@/stores/themeStore';
import { useResponsive } from '../hooks/useResponsive';
import { GRADE_LABELS } from '../utils/enumMappings';


import IntelligentWordCloud from '@/components/advanced/IntelligentWordCloud';
import ExamWordCloud from '@/components/common/WordCloudPanel/ExamWordCloud';
import SubjectDetailModal from '@/features/student-log/components/SubjectDetailModal';
import ExamScoreTrendChart from '@/features/student-log/components/ExamScoreTrendChart';
import ExamTagManager from '@/features/student-log/components/ExamTagManager';
import { 
  RadarChart, 
  Radar, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Legend, 
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';
import type { StudentGrowthReport } from '@/api/studentLogApi';
import * as studentLogApi from '@/api/studentLogApi';
import * as examApi from '@/api/examApi';
import { GrowthApi } from '@/api/growthApi';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// ================================
// 组件接口定义
// ================================

interface TimeRangeOption {
  key: string;
  label: string;
  days?: number;
}

interface WordCloudItemProps {
  text: string;
  value: number;
  type: 'positive' | 'negative';
}

// 考试分析数据接口
interface ExamAnalysisData {
  totalRecords: number;
  subjectAnalysis: Array<{
    subject: string;
    scores: Array<{
      examId: number;
      examName: string;
      examDate: string;
      score: number;
      totalScore: number;
      percentage: number;
      classRank?: number;
      totalStudents?: number;
    }>;
  }>;
  examTagsWordCloud: Array<{
    text: string;
    value: number;
    type: 'positive' | 'negative';
  }>;
}

// 科目中文映射
const subjectLabels: Record<string, string> = {
  'MATH': '数学',
  'CHINESE': '语文',
  'ENGLISH': '英语',
  'PHYSICS': '物理',
  'CHEMISTRY': '化学',
  'BIOLOGY': '生物',
  'HISTORY': '历史',
  'GEOGRAPHY': '地理',
  'POLITICS': '政治'
};

// 年级中文映射 - 使用统一的映射
const gradeLabels = GRADE_LABELS;

// 考试类型中文映射
const examTypeLabels: Record<string, string> = {
  'DAILY_QUIZ': '日常测验',
  'WEEKLY_TEST': '周测',
  'MONTHLY_EXAM': '月考', 
  'MIDTERM': '期中考试',
  'FINAL': '期末考试'
};

// 时间范围选项
const timeRangeOptions: TimeRangeOption[] = [
  { key: 'week', label: '最近一周', days: 7 },
  { key: 'month', label: '最近一个月', days: 30 },
  { key: 'quarter', label: '最近三个月', days: 90 },
  { key: 'semester', label: '本学期', days: 120 },
  { key: 'year', label: '最近一年', days: 365 },
  { key: 'all', label: '全部时间' }
];

const StudentTrendPage: React.FC = () => {
  const { examId, subject, publicId } = useParams<{ examId: string; subject: string; publicId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useThemeStore();
  const { isMobile } = useResponsive();

  // 状态管理
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<StudentGrowthReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('month');
  const [customDateRange, setCustomDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [examAnalysisData, setExamAnalysisData] = useState<ExamAnalysisData | null>(null);
  const [examLoading, setExamLoading] = useState(false);
  const [selectedSubjectData, setSelectedSubjectData] = useState<any>(null);
  const [subjectDetailVisible, setSubjectDetailVisible] = useState(false);
  const [studentClasses, setStudentClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [classesLoading, setClassesLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  


  // 从location.state获取来源信息
  const fromState = location.state as any;

  // 主题适配样式
  const themeStyles = {
    cardBackground: theme === 'dark' ? '#141414' : '#ffffff',
    textPrimary: theme === 'dark' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
    textSecondary: theme === 'dark' ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)',
    successColor: theme === 'dark' ? '#52c41a' : '#389e0d',
    warningColor: theme === 'dark' ? '#faad14' : '#d48806',
    errorColor: theme === 'dark' ? '#ff4d4f' : '#cf1322',
    primaryColor: theme === 'dark' ? '#1890ff' : '#1890ff',
    borderColor: theme === 'dark' ? '#303030' : '#e8e8e8',
  };

  // 智能返回逻辑
  const handleBack = () => {
    if (fromState?.from) {
      navigate(fromState.from);
    } else {
      // 返回到考试科目详情页面
      navigate(`/student-log/exam-subject/${examId}/${subject}`);
    }
  };

  // 计算日期范围
  const calculateDateRange = useCallback((): { startDate: string; endDate: string } => {
    const now = dayjs();
    let startDate: dayjs.Dayjs;
    let endDate: dayjs.Dayjs = now;

    if (customDateRange) {
      startDate = customDateRange[0];
      endDate = customDateRange[1];
    } else {
      const timeRange = timeRangeOptions.find(option => option.key === selectedTimeRange);
      if (timeRange && timeRange.days) {
        startDate = now.subtract(timeRange.days, 'day');
      } else {
        // 全部时间：从很久以前开始
        startDate = now.subtract(2, 'year');
      }
    }

    return {
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD')
    };
  }, [selectedTimeRange, customDateRange]);

  // 加载学生报告数据
  const loadReportData = useCallback(async (showLoading = true) => {
    if (!publicId) return;
    
    if (showLoading) setLoading(true);
    try {
      const { startDate, endDate } = calculateDateRange();
      console.log('🔍 学生报告数据加载 - 时间范围:', { startDate, endDate, publicId });
      
      // 使用新的Growth API和考试API
      try {
        // 1. 获取成长概况数据
        const growthData = await GrowthApi.getStudentGrowthSummaryByPublicId(publicId);
        console.log('🔍 获取到的成长概况数据:', growthData);

        // 2. 获取考试分析数据
        let examAnalysisData = null;
        try {
          const examHistory = await examApi.getStudentExamHistoryByPublicId(publicId, {
            startDate,
            endDate
          });
          console.log('🔍 获取到的考试历史数据:', examHistory);
          examAnalysisData = examHistory;
        } catch (examError) {
          console.warn('获取考试分析数据失败:', examError);
          // 考试数据获取失败不影响页面显示，只是考试相关功能不可用
        }

        // 适配旧的数据结构 - 提供完整的StudentGrowthReport接口
        const adaptedData: StudentGrowthReport = {
          student: growthData.student,
          examAnalysis: (examAnalysisData as any) || undefined, // 使用真实的考试分析数据
          wordCloud: growthData.states?.map(state => ({
            text: state.tagName,
            value: Math.round(state.level * 10),
            type: state.sentiment === 'POSITIVE' ? 'positive' as const : 'negative' as const
          })) || [],
          positiveTagsRanking: [],
          negativeTagsRanking: [],
          growthTrend: [],
          summary: {
            totalLogs: growthData.states?.reduce((sum, state) => sum + state.totalObservations, 0) || 0,
            positiveRatio: growthData.states && growthData.states.length > 0 ?
              Math.round((growthData.states.filter(s => s.sentiment === 'POSITIVE').length / growthData.states.length) * 100) : 0,
            negativeRatio: growthData.states && growthData.states.length > 0 ?
              Math.round((growthData.states.filter(s => s.sentiment === 'NEGATIVE').length / growthData.states.length) * 100) : 0,
            mostFrequentTag: {
              text: growthData.states && growthData.states.length > 0 ?
                growthData.states.reduce((prev, curr) => prev.totalObservations > curr.totalObservations ? prev : curr).tagName : '',
              count: growthData.states && growthData.states.length > 0 ?
                growthData.states.reduce((prev, curr) => prev.totalObservations > curr.totalObservations ? prev : curr).totalObservations : 0,
              type: 'positive' as const
            }
          }
        };
        console.log('🔍 StudentTrendPage 适配数据调试:', {
          examAnalysisData,
          examTagsWordCloud: examAnalysisData?.examTagsWordCloud,
          adaptedDataExamAnalysis: adaptedData.examAnalysis,
          adaptedDataExamAnalysisWordCloud: adaptedData.examAnalysis?.examTagsWordCloud
        });
        setReportData(adaptedData);
      } catch (error) {
        console.error('通过publicId加载成长报告失败:', error);
        message.error('加载学生报告失败，可能是学号不存在或权限不足');
        navigate('/student-log/analytics');
        return;
      }
    } catch (error) {
      console.error('加载成长报告失败:', error);
      message.error('加载成长报告失败，请重试');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [publicId, calculateDateRange, navigate]);

  // 从报告数据中提取考试分析数据
  const updateExamAnalysisFromReport = useCallback(() => {
    if (reportData?.examAnalysis) {
      setExamAnalysisData(reportData.examAnalysis);
      setExamLoading(false);
    } else {
      setExamAnalysisData(null);
      setExamLoading(false);
    }
  }, [reportData]);

  // 加载学生班级信息
  const loadStudentClasses = useCallback(async () => {
    if (!publicId) return;

    setClassesLoading(true);
    try {
      // 使用publicId通过growth API获取班级信息
      const growthData = await GrowthApi.getStudentGrowthSummaryByPublicId(publicId);
      const classInfo = {
        classes: [{
          id: growthData.class.id,
          name: growthData.class.name
        }]
      };
      setStudentClasses(classInfo.classes || []);
      
      // 如果只有一个班级，自动选择该班级
      if (classInfo.classes && classInfo.classes.length === 1) {
        setSelectedClassId(classInfo.classes[0].id.toString());
      }
    } catch (error) {
      console.error('加载学生班级信息失败:', error);
      message.error('加载班级信息失败');
    } finally {
      setClassesLoading(false);
    }
  }, [publicId]);

  // 处理科目详情点击
  const handleSubjectDetail = useCallback((subjectData: any) => {
    console.log('科目详情:', subjectData);
    
    // 检查必要的数据
    if (!publicId) {
      message.error('无法获取学生信息');
      return;
    }
    
    // 准备弹窗数据 - 使用正确的字段名
    const modalData = {
      ...subjectData,
      studentPublicId: publicId, // 使用正确的publicId字段
      classId: selectedClassId !== 'all' ? parseInt(selectedClassId) : 1 // 使用选中的班级ID
    };
    
    console.log('传递给SubjectDetailModal的数据:', modalData);
    
    setSelectedSubjectData(modalData);
    setSubjectDetailVisible(true);
  }, [publicId, selectedClassId]);

  // 处理时间范围变化
  const handleTimeRangeChange = (value: string) => {
    setSelectedTimeRange(value);
    if (value !== 'custom') {
      setCustomDateRange(null);
    }
  };

  // 处理自定义日期变化
  const handleCustomDateChange = (dates: any) => {
    setCustomDateRange(dates);
    if (dates) {
      setSelectedTimeRange('custom');
    }
  };

  // 处理班级选择变化
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
  };

  // 生成PDF报告
  const generatePDFReport = async () => {
    try {
      message.loading('正在生成PDF报告...', 0);
      
      const element = document.getElementById('student-growth-report');
      if (!element) {
        message.error('无法找到报告内容');
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const studentName = reportData?.student?.name || '学生';
      const fileName = `${studentName}_成长报告_${dayjs().format('YYYY-MM-DD')}.pdf`;
      
      pdf.save(fileName);
      message.destroy();
      message.success('PDF报告生成成功');
    } catch (error) {
      message.destroy();
      message.error('生成PDF报告失败');
      console.error('生成PDF失败:', error);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadReportData();
  }, [loadReportData]);
  


  useEffect(() => {
    updateExamAnalysisFromReport();
  }, [updateExamAnalysisFromReport]);

  useEffect(() => {
    loadStudentClasses();
  }, [loadStudentClasses]);

  // 渲染加载状态
  if (loading) {
    return (
      <div style={{ padding: isMobile ? '16px' : '24px' }}>
        <div style={{ textAlign: 'center', paddingTop: '100px' }}>
        <Spin size="large" />
          <div style={{ marginTop: '16px', color: themeStyles.textSecondary }}>
            正在加载学生成长报告...
          </div>
        </div>
      </div>
    );
  }

  // 渲染错误状态
  if (error || !reportData) {
    return (
      <div style={{ padding: isMobile ? '16px' : '24px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 页面头部 */}
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={handleBack}
                size={isMobile ? 'middle' : 'large'}
              />
              <div>
                <Title level={3} style={{ margin: 0 }}>
                  学生个人分析
                </Title>
                <Text type="secondary">
                  考试: {examId} · 科目: {subjectLabels[subject as keyof typeof subjectLabels] || subject}
                </Text>
              </div>
            </Space>
          </div>

          <Empty
            description="暂无学生数据"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Space>
              <Button onClick={() => loadReportData()}>重试</Button>
              <Button icon={<ArrowLeftOutlined />} onClick={handleBack} />
            </Space>
          </Empty>
        </Space>
      </div>
    );
  }

  const student = reportData.student;
  const examAnalysis = reportData.examAnalysis;

  // 渲染考试表现词云
  const renderExamWordCloud = () => {
    if (!examAnalysis?.examTagsWordCloud || examAnalysis.examTagsWordCloud.length === 0) {
      return (
        <Empty 
          description="暂无考试表现词条"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    const examTagsData = examAnalysis.examTagsWordCloud.map((item: any) => ({
      text: item.text,
      value: item.value,
      type: (item.type === 'EXAM_POSITIVE' ? 'positive' : 'negative') as 'positive' | 'negative'
    }));

    console.log('🔍 考试词云调试信息:');
    console.log('- examAnalysisData:', examAnalysis);
    console.log('- examTagsWordCloud原始数据:', examAnalysis.examTagsWordCloud);
    console.log('- examTagsData处理后:', examTagsData);
    console.log('- examTagsData长度:', examTagsData.length);

    return <ExamWordCloud data={examTagsData} />;
  };



  // 渲染科目雷达图
  const renderSubjectRadar = () => {
    if (!examAnalysis?.subjectAnalysis || examAnalysis.subjectAnalysis.length === 0) {
      return (
        <Empty 
          description="暂无科目数据"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    let radarData = examAnalysis.subjectAnalysis.map((subjectData: any) => {
      const latestScores = subjectData.scores?.slice(-3) || [];
      const avgScore = latestScores.length > 0 
        ? latestScores.reduce((sum: number, score: any) => sum + ((score.normalizedScore ?? score.percentage ?? 0)), 0) / latestScores.length
        : 0;

      return {
        subject: subjectLabels[subjectData.subject] || subjectData.subject,
        student: Math.round(avgScore),
        average: Math.max(0, Math.min(100, subjectData.classAverage || 70)), // 班级平均分
        excellent: Math.max(0, Math.min(100, subjectData.excellentLine || 85)), // 优秀线
        fullMark: 100
      };
    });

    // 优化雷达图显示：确保至少有3个数据点
    if (radarData.length === 1) {
      // 添加两个虚拟数据点
      radarData.push(
        {
          subject: '综合能力',
          student: Math.round(radarData[0].student * 1.1),
          average: Math.round(radarData[0].average * 1.1),
          excellent: Math.round(radarData[0].excellent * 1.1),
          fullMark: 100
        },
        {
          subject: '学习态度',
          student: Math.round(radarData[0].student * 0.9),
          average: Math.round(radarData[0].average * 0.9),
          excellent: Math.round(radarData[0].excellent * 0.9),
          fullMark: 100
        }
      );
    } else if (radarData.length === 2) {
      // 添加一个虚拟数据点
      const avgStudent = Math.round((radarData[0].student + radarData[1].student) / 2);
      const avgAverage = Math.round((radarData[0].average + radarData[1].average) / 2);
      const avgExcellent = Math.round((radarData[0].excellent + radarData[1].excellent) / 2);
      radarData.push({
        subject: '综合表现',
        student: avgStudent,
        average: avgAverage,
        excellent: avgExcellent,
        fullMark: 100
      });
    }

    return (
      <div>
        <div style={{ marginBottom: '16px', fontSize: '12px', color: '#8c8c8c' }}>
          基于归一化成绩的科目综合表现分析（100分制）
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData}>
            <PolarGrid gridType="polygon" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fontSize: 12, fill: themeStyles.textSecondary }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]} 
              tick={{ fontSize: 10, fill: themeStyles.textSecondary }}
            />
            <Radar
              name="个人成绩"
              dataKey="student"
              stroke="#1890ff"
              fill="#1890ff"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Radar
              name="班级平均"
              dataKey="average"
              stroke="#faad14"
              fill="#faad14"
              fillOpacity={0.1}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
            <Radar
              name="优秀线"
              dataKey="excellent"
              stroke="#52c41a"
              fill="#52c41a"
              fillOpacity={0.05}
              strokeWidth={2}
              strokeDasharray="3 3"
            />
            <Legend />
            <RechartsTooltip 
              contentStyle={{
                backgroundColor: themeStyles.cardBackground,
                border: '1px solid #d9d9d9',
                borderRadius: '4px'
              }}
              formatter={(value: any, name: string) => [
                `${Number(value).toFixed(1)}分`, 
                name === 'student' ? '个人成绩' : 
                name === 'average' ? '班级平均' : '优秀线'
              ]}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div style={{ padding: isMobile ? '16px' : '24px' }} id="student-growth-report">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* 页面头部 */}
        <Card style={{ backgroundColor: themeStyles.cardBackground }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="large">
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={handleBack}
                size={isMobile ? 'middle' : 'large'}
                />
              <div>
                <Title level={3} style={{ margin: 0 }}>
                    {student.name} - 个人成绩分析
                </Title>
                <Text type="secondary">
                    学号: {publicId} · 年级: {gradeLabels[student.grade as keyof typeof gradeLabels] || student.grade} · 来源: {subjectLabels[subject as keyof typeof subjectLabels] || subject}考试
                </Text>
              </div>
            </Space>
          </Col>
            <Col>
              <Space>
                <Button 
                  icon={<DownloadOutlined />}
                  onClick={generatePDFReport}
                  type="primary"
                  size={isMobile ? 'middle' : 'large'}
                >
                  {!isMobile && '导出PDF'}
                </Button>
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={() => loadReportData()}
                  size={isMobile ? 'middle' : 'large'}
                >
                  {!isMobile && '刷新'}
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 筛选控制区域 */}
        <Card style={{ backgroundColor: themeStyles.cardBackground }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={8}>
              <Space>
                <Text strong>时间范围:</Text>
                <Select
                  value={selectedTimeRange}
                  onChange={handleTimeRangeChange}
                  style={{ width: 120 }}
                  size={isMobile ? 'middle' : 'small'}
                >
                  {timeRangeOptions.map(option => (
                    <Option key={option.key} value={option.key}>
                      {option.label}
                    </Option>
                  ))}
                  <Option value="custom">自定义</Option>
                </Select>
              </Space>
            </Col>
            
            {selectedTimeRange === 'custom' && (
              <Col xs={24} sm={12} md={8}>
                <RangePicker
                  value={customDateRange}
                  onChange={handleCustomDateChange}
                  size={isMobile ? 'middle' : 'small'}
                />
              </Col>
            )}

            {studentClasses.length > 1 && (
              <Col xs={24} sm={12} md={8}>
                <Space>
                  <Text strong>班级:</Text>
                  <Select
                    value={selectedClassId}
                    onChange={handleClassChange}
                    style={{ width: 120 }}
                    size={isMobile ? 'middle' : 'small'}
                    loading={classesLoading}
                  >
                    <Option value="all">全部班级</Option>
                    {studentClasses.map((cls: any) => (
                      <Option key={cls.id} value={cls.id.toString()}>
                        {cls.name}
                      </Option>
                    ))}
                  </Select>
                </Space>
              </Col>
            )}
        </Row>
      </Card>

        {/* 统计概览卡片 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ backgroundColor: themeStyles.cardBackground }}>
            <Statistic
              title="总记录数"
                value={examAnalysis?.totalRecords || 0}
                prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ backgroundColor: themeStyles.cardBackground }}>
            <Statistic
              title="平均分"
                value={(() => {
                  if (!examAnalysis?.subjectAnalysis || examAnalysis.subjectAnalysis.length === 0) return 0;
                  const total = examAnalysis.subjectAnalysis.reduce((sum: number, s: any) => sum + (s.average || 0), 0);
                  return (total / examAnalysis.subjectAnalysis.length).toFixed(1);
                })() as any}
                suffix="分"
                prefix={<BarChartOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ backgroundColor: themeStyles.cardBackground }}>
            <Statistic
              title="最高分"
                value={(() => {
                  if (!examAnalysis?.subjectAnalysis || examAnalysis.subjectAnalysis.length === 0) return 0;
                  const highs = examAnalysis.subjectAnalysis.map((s: any) => s.highest || 0);
                  return Math.max(...highs);
                })()}
                suffix="分"
                prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ backgroundColor: themeStyles.cardBackground }}>
            <Statistic
              title="进步科目"
                value={(() => {
                  if (!examAnalysis?.subjectAnalysis || examAnalysis.subjectAnalysis.length === 0) return 0;
                  return examAnalysis.subjectAnalysis.filter((s: any) => s.trend === 'improving').length;
                })()}
                suffix="个"
                prefix={<RiseOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
      </Row>

        {/* 考试成绩趋势图 */}
        <Card 
          title={
            <Space>
              <LineChartOutlined />
              <span>考试成绩趋势</span>
            </Space>
          }
          style={{ backgroundColor: themeStyles.cardBackground }}
        >
          <ExamScoreTrendChart 
            publicId={publicId}
            dateRange={calculateDateRange()}
          />
        </Card>

        {/* 科目能力雷达图和考试表现词云 - 左右布局 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <RadarChartOutlined />
                  <span>科目能力雷达图</span>
                </Space>
              }
              style={{ backgroundColor: themeStyles.cardBackground }}
            >
              {renderSubjectRadar()}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <CloudOutlined />
                  <span>考试表现词云</span>
                </Space>
              }
              style={{ backgroundColor: themeStyles.cardBackground }}
            >
              {renderExamWordCloud()}
            </Card>
          </Col>
        </Row>


      </Space>

      {/* 科目详情弹窗 */}
      {selectedSubjectData && (
        <SubjectDetailModal
          visible={subjectDetailVisible}
          onClose={() => setSubjectDetailVisible(false)}
          subjectData={selectedSubjectData}
          dateRange={calculateDateRange()}
        />
      )}
    </div>
  );
};

export default StudentTrendPage;