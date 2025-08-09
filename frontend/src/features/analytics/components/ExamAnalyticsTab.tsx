import React, { useState, useEffect, useMemo } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Select, 
  Alert, 
  Spin, 
  Empty,
  Typography,
  Tag,
  Statistic,
  Space,
  Progress,
  Button,
  Table,
  Badge
} from 'antd';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  LineChartOutlined,
  BarChartOutlined,

  BookOutlined,
  TrophyOutlined,
  UserOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  ExpandAltOutlined
} from '@ant-design/icons';
import { useThemeStore } from '@/stores/themeStore';
import { useResponsive } from '@/hooks/useResponsive';
import { useNavigate } from 'react-router-dom';
import * as examApi from '@/api/examApi';
import * as studentLogApi from '@/api/studentLogApi';
import SubjectTrendModal from '@/components/ui/SubjectTrendModal';
import type { 
  AnalyticsTimeRangeParams,
  Exam,
  ExamDetails,
  Class,
  ExamType
} from '@/types/api';
import { Subject } from '@/types/api';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

interface ExamAnalyticsTabProps {
  timeParams: AnalyticsTimeRangeParams;
  refreshKey: number;
}

// 科目中文映射
const subjectLabels: Record<Subject, string> = {
  'CHINESE': '语文',
  'MATH': '数学', 
  'ENGLISH': '英语',
  'PHYSICS': '物理',
  'CHEMISTRY': '化学',
  'BIOLOGY': '生物',
  'HISTORY': '历史',
  'GEOGRAPHY': '地理',
  'POLITICS': '政治'
};

// 考试类型中文映射
const examTypeLabels: Record<ExamType, string> = {
  'DAILY_QUIZ': '日常测验',
  'WEEKLY_TEST': '周测',
  'MONTHLY_EXAM': '月考', 
  'MIDTERM': '期中考试',
  'FINAL': '期末考试'
};

const ExamAnalyticsTab: React.FC<ExamAnalyticsTabProps> = ({
  timeParams,
  refreshKey
}) => {
  const { theme } = useThemeStore();
  const { isMobile } = useResponsive();
  const navigate = useNavigate();

  // ===============================
  // 状态管理
  // ===============================
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedExamType, setSelectedExamType] = useState<ExamType | 'all'>('all');
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'all'>('all');
  const [exams, setExams] = useState<Exam[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [examDetails, setExamDetails] = useState<Record<number, ExamDetails>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<number, boolean>>({});
  
  // 科目趋势弹窗状态
  const [subjectTrendModal, setSubjectTrendModal] = useState<{
    visible: boolean;
    classId: number;
    className: string;
    subject: Subject;
  }>({
    visible: false,
    classId: 0,
    className: '',
    subject: Subject.CHINESE
  });

  // ===============================
  // 主题适配的样式配置
  // ===============================
  const themeStyles = {
    cardBackground: theme === 'dark' ? '#141414' : '#ffffff',
    borderColor: theme === 'dark' ? '#303030' : '#e8e8e8',
    textPrimary: theme === 'dark' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
    textSecondary: theme === 'dark' ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)',
    successColor: theme === 'dark' ? '#52c41a' : '#389e0d',
    warningColor: theme === 'dark' ? '#faad14' : '#d48806',
    errorColor: theme === 'dark' ? '#ff4d4f' : '#cf1322',
    primaryColor: theme === 'dark' ? '#1890ff' : '#1890ff',
  };

  // ===============================
  // 数据加载
  // ===============================
  const loadClasses = async () => {
    try {
      const classesData = await studentLogApi.getClasses();
      setClasses(classesData);
      
      // 自动选择第一个班级
      if (classesData.length > 0 && !selectedClassId) {
        setSelectedClassId(classesData[0].id);
      }
    } catch (err) {
      console.error('❌ 班级列表加载失败:', err);
      setError('班级列表加载失败');
    }
  };

  const loadExams = async () => {
    if (!selectedClassId) return;
    
    setLoading(true);
    try {
      const examsData = await examApi.getClassExams(selectedClassId, {
        examType: selectedExamType === 'all' ? undefined : selectedExamType,
        startDate: timeParams?.startDate,
        endDate: timeParams?.endDate
      });
      setExams(examsData);
      setError(null);
    } catch (err) {
      console.error('❌ 考试数据加载失败:', err);
      setError('考试数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // 数据统计计算
  // ===============================
  const statistics = useMemo(() => {
    if (!exams.length) return null;

    const totalExams = exams.length;
    const totalStudentParticipations = exams.reduce((sum, exam) => sum + (exam.totalStudents || 0), 0);
    const totalScoreRecords = exams.reduce((sum, exam) => sum + (exam.recordedScores || 0), 0);
    const overallCompletionRate = totalStudentParticipations > 0 
      ? (totalScoreRecords / (totalStudentParticipations * exams.reduce((sum, exam) => sum + (exam.subjects?.length || 0), 0))) * 100 
      : 0;

    // 按考试类型分组统计
    const examTypeStats = exams.reduce((acc, exam) => {
      if (!acc[exam.examType]) {
        acc[exam.examType] = { count: 0, totalStudents: 0, completionRate: 0 };
      }
      acc[exam.examType].count++;
      acc[exam.examType].totalStudents += exam.totalStudents || 0;
      acc[exam.examType].completionRate += exam.completionRate || 0;
      return acc;
    }, {} as Record<ExamType, { count: number; totalStudents: number; completionRate: number }>);

    // 时间趋势数据
    const trendData = exams
      .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())
      .map(exam => ({
        date: dayjs(exam.examDate).format('MM-DD'),
        examName: exam.name,
        completionRate: exam.completionRate || 0,
        totalStudents: exam.totalStudents || 0,
        examType: examTypeLabels[exam.examType]
      }));

    return {
      totalExams,
      totalStudentParticipations,
      overallCompletionRate: Math.round(overallCompletionRate * 100) / 100,
      examTypeStats,
      trendData
    };
  }, [exams]);

  // ===============================
  // 副作用
  // ===============================
  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      loadExams();
    }
  }, [selectedClassId, selectedExamType, timeParams, refreshKey]);

  // ===============================
  // 事件处理
  // ===============================
  const handleExamClick = (exam: Exam) => {
    navigate(`/student-log/exam/${exam.id}`, {
      state: { from: '/analytics' }
    });
  };

  const handleClassChange = (classId: number) => {
    setSelectedClassId(classId);
  };

  // 加载考试详情
  const loadExamDetails = async (examId: number) => {
    if (examDetails[examId]) return; // 已加载过
    
    setLoadingDetails(prev => ({ ...prev, [examId]: true }));
    try {
      console.log('🔍 正在加载考试详情，examId:', examId);
      // 使用统计接口而不是详情接口，因为展开行需要的是统计数据
      const details = await examApi.getExamStatistics(examId);
      console.log('✅ 考试统计数据加载成功:', details);
      
      // 转换数据格式以适配展开行组件的需求
      const transformedDetails: any = {
        exam: details.exam,
        subjects: details.subjectAnalysis.map(subject => subject.subject),
        studentScores: [], // 展开行不需要具体学生分数
        subjectStats: details.subjectAnalysis.reduce((acc, subject) => {
          acc[subject.subject] = {
            totalStudents: subject.studentCount,
            recordedScores: subject.participantCount,
            absentCount: subject.absentCount,
            scores: [], // 统计接口不返回具体分数
            average: subject.average,
            highest: subject.highest,
            lowest: subject.lowest
          };
          return acc;
        }, {} as Record<string, any>)
      };
      
      setExamDetails(prev => ({ ...prev, [examId]: transformedDetails as ExamDetails }));
    } catch (err) {
      console.error('❌ 加载考试详情失败:', err);
    } finally {
      setLoadingDetails(prev => ({ ...prev, [examId]: false }));
    }
  };

  // 处理表格展开
  const handleTableExpand = (expanded: boolean, record: Exam) => {
    if (expanded) {
      setExpandedRows(prev => [...prev, record.id]);
      loadExamDetails(record.id);
    } else {
      setExpandedRows(prev => prev.filter(id => id !== record.id));
    }
  };

  // 显示科目趋势弹窗
  const showSubjectTrend = (subject: Subject, classId: number, className: string) => {
    setSubjectTrendModal({
      visible: true,
      classId,
      className,
      subject
    });
  };

  // 关闭科目趋势弹窗
  const closeSubjectTrendModal = () => {
    setSubjectTrendModal(prev => ({ ...prev, visible: false }));
  };

  // ===============================
  // 展开行渲染
  // ===============================
  const renderExpandedRow = (record: Exam) => {
    const details = examDetails[record.id];
    const loading = loadingDetails[record.id];

    if (loading) {
      return (
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Spin size="small" />
          <span style={{ marginLeft: '8px' }}>加载科目详情中...</span>
        </div>
      );
    }

    if (!details) {
      return (
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Alert message="加载失败" type="error" showIcon />
        </div>
      );
    }

    // 检查数据结构是否正确
    if (!details.subjects || !Array.isArray(details.subjects)) {
      return (
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Alert 
            message="数据格式错误" 
            description="展开详情的数据结构不正确，请检查后端接口返回格式" 
            type="warning" 
            showIcon 
          />
        </div>
      );
    }

    const currentClass = classes.find(c => c.id === selectedClassId);

    return (
      <div style={{ padding: '16px', backgroundColor: themeStyles.cardBackground }}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Typography.Title level={5} style={{ margin: '0 0 16px 0' }}>
              科目成绩统计
            </Typography.Title>
          </Col>
          {details.subjects.map(subject => {
            const stats = details.subjectStats[subject];
            if (!stats) return null;

            const averagePercent = record.totalScore ? (stats.average / record.totalScore) * 100 : stats.average;
            const participationRate = stats.totalStudents > 0 ? (stats.recordedScores / stats.totalStudents) * 100 : 0;

            return (
              <Col xs={24} sm={12} md={8} lg={6} key={subject}>
                <Card size="small" style={{ height: '180px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <Tag color="blue" style={{ fontSize: '12px' }}>
                        {subjectLabels[subject]}
                      </Tag>
                    </div>
                    <Statistic
                      title="平均分"
                      value={Math.round(averagePercent * 100) / 100}
                      suffix="%"
                      valueStyle={{ 
                        fontSize: '18px',
                        color: averagePercent >= 80 ? themeStyles.successColor : 
                               averagePercent >= 60 ? themeStyles.warningColor : themeStyles.errorColor
                      }}
                    />
                    <div style={{ marginTop: '8px', fontSize: '12px' }}>
                      <div>参与: {stats.recordedScores}/{stats.totalStudents} ({Math.round(participationRate)}%)</div>
                      <div>缺考: {stats.absentCount}人</div>
                      <div>最高: {stats.highest}分 | 最低: {stats.lowest}分</div>
                    </div>
                    <Button 
                      type="link" 
                      size="small" 
                      icon={<ExpandAltOutlined />}
                      onClick={() => showSubjectTrend(subject, record.classId, currentClass?.name || '')}
                      style={{ marginTop: '4px', padding: 0 }}
                    >
                      查看趋势
                    </Button>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>
    );
  };

  // ===============================
  // 图表配置
  // ===============================
  // Line图表数据 - 转换为Recharts需要的透视表格式
  const trendRawData = statistics?.trendData || [];
  const examTypes = [...new Set(trendRawData.map(item => item.examType))];
  const chartColors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1'];
  
  // 按日期分组并创建透视表格式
  const trendChartData = (() => {
    const dateGroups: Record<string, Record<string, number>> = {};
    
    // 按日期分组数据
    trendRawData.forEach(item => {
      if (!dateGroups[item.date]) {
        dateGroups[item.date] = {};
      }
      dateGroups[item.date][item.examType] = item.completionRate;
    });
    
    // 转换为数组格式
    return Object.entries(dateGroups).map(([date, typeData]) => ({
      date,
      ...typeData
    }));
  })();

  // Column图表数据 (保持原始数据结构不变)
  const examTypeChartData = Object.entries(statistics?.examTypeStats || {}).map(([type, stats]) => ({
    type: examTypeLabels[type as ExamType],
    count: stats.count,
    avgCompletionRate: Math.round((stats.completionRate / stats.count) * 100) / 100
  }));

  // ===============================
  // 渲染组件
  // ===============================
  if (!timeParams) {
    return (
      <Alert 
        message="请选择时间范围" 
        description="选择时间范围后将显示考试分析数据"
        type="info" 
        showIcon 
      />
    );
  }

  if (error) {
    return (
      <Alert 
        message="数据加载失败" 
        description={error}
        type="error" 
        showIcon 
        action={
          <Button size="small" onClick={loadExams}>
            重试
          </Button>
        }
      />
    );
  }

  return (
    <div style={{ padding: isMobile ? '12px' : '0' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 筛选控制区 */}
        <Card size="small">
          <Space direction={isMobile ? 'vertical' : 'horizontal'} size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>班级：</Text>
              <Select
                style={{ width: isMobile ? '100%' : 200, marginLeft: 8 }}
                placeholder="选择班级"
                value={selectedClassId}
                onChange={handleClassChange}
                loading={!classes.length}
              >
                {classes.map(cls => (
                  <Option key={cls.id} value={cls.id}>
                    {cls.name}
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>考试类型：</Text>
              <Select
                style={{ width: isMobile ? '100%' : 150, marginLeft: 8 }}
                value={selectedExamType}
                onChange={setSelectedExamType}
              >
                <Option value="all">全部类型</Option>
                {Object.entries(examTypeLabels).map(([value, label]) => (
                  <Option key={value} value={value}>{label}</Option>
                ))}
              </Select>
            </div>

            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>科目：</Text>
              <Select
                style={{ width: isMobile ? '100%' : 120, marginLeft: 8 }}
                value={selectedSubject}
                onChange={setSelectedSubject}
              >
                <Option value="all">全部科目</Option>
                {Object.entries(subjectLabels).map(([value, label]) => (
                  <Option key={value} value={value}>{label}</Option>
                ))}
              </Select>
            </div>
          </Space>
        </Card>

        {loading ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">加载考试数据中...</Text>
              </div>
            </div>
          </Card>
        ) : !statistics ? (
          <Card>
            <Empty
              description="暂无考试数据"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        ) : (
          <>
            {/* 统计概览 */}
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic
                    title="考试总数"
                    value={statistics.totalExams}
                    prefix={<BookOutlined />}
                    valueStyle={{ color: themeStyles.primaryColor, fontSize: isMobile ? '20px' : '24px' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic
                    title="参考人次"
                    value={statistics.totalStudentParticipations}
                    prefix={<UserOutlined />}
                    valueStyle={{ color: themeStyles.successColor, fontSize: isMobile ? '20px' : '24px' }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic
                    title="录入完成率"
                    value={statistics.overallCompletionRate}
                    suffix="%"
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ 
                      color: statistics.overallCompletionRate >= 90 ? themeStyles.successColor : themeStyles.warningColor,
                      fontSize: isMobile ? '20px' : '24px'
                    }}
                  />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small">
                  <Statistic
                    title="考试类型"
                    value={Object.keys(statistics.examTypeStats).length}
                    prefix={<TrophyOutlined />}
                    valueStyle={{ color: themeStyles.primaryColor, fontSize: isMobile ? '20px' : '24px' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 图表分析区 */}
            <Row gutter={[16, 16]}>
              {/* 录入完成率趋势 */}
              <Col xs={24} lg={12}>
                <Card 
                  title={
                    <Space>
                      <LineChartOutlined />
                      <span>录入完成率趋势</span>
                    </Space>
                  }
                  size="small"
                >
                  {statistics.trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={trendChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: any, name: any, props: any) => [
                            `${value}% (${props.payload.examName})`,
                            name
                          ]}
                        />
                        <Legend />
                        {examTypes.map((examType, index) => (
                          <Line
                            key={examType}
                            type="monotone"
                            dataKey={examType}
                            stroke={chartColors[index % chartColors.length]}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            name={examType}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <Empty description="暂无趋势数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  )}
                </Card>
              </Col>

              {/* 考试类型分布 */}
              <Col xs={24} lg={12}>
                <Card 
                  title={
                    <Space>
                      <BarChartOutlined />
                      <span>考试类型分布</span>
                    </Space>
                  }
                  size="small"
                >
                  {Object.keys(statistics.examTypeStats).length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={examTypeChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: any, name: any) => [
                            value,
                            name === 'count' ? '考试数量' : '平均完成率'
                          ]}
                        />
                        <Bar 
                          dataKey="count" 
                          fill={themeStyles.primaryColor}
                          name="考试数量"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Empty description="暂无分布数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  )}
                </Card>
              </Col>
            </Row>

            {/* 考试列表 */}
            <Card 
              title={
                <Space>
                  <FileTextOutlined />
                  <span>考试列表</span>
                  <Badge count={exams.length} />
                </Space>
              }
              size="small"
            >
              <Table
                dataSource={exams}
                rowKey="id"
                size="small"
                scroll={{ x: isMobile ? 800 : undefined }}
                expandable={{
                  expandedRowKeys: expandedRows,
                  onExpand: handleTableExpand,
                  expandedRowRender: renderExpandedRow,
                  expandRowByClick: false,
                  rowExpandable: (record) => (record.subjects && record.subjects.length > 0) || true
                }}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: !isMobile,
                  showQuickJumper: !isMobile,
                  showTotal: (total, range) => 
                    `第 ${range[0]}-${range[1]} 条，共 ${total} 场考试`
                }}
                columns={[
                  {
                    title: '考试名称',
                    dataIndex: 'name',
                    key: 'name',
                    render: (text, record) => (
                      <Button 
                        type="link" 
                        onClick={() => handleExamClick(record)}
                        style={{ padding: 0, height: 'auto' }}
                      >
                        {text}
                      </Button>
                    )
                  },
                  {
                    title: '考试类型',
                    dataIndex: 'examType',
                    key: 'examType',
                    render: (type: ExamType) => (
                      <Tag color="blue">{examTypeLabels[type]}</Tag>
                    )
                  },
                  {
                    title: '考试日期',
                    dataIndex: 'examDate',
                    key: 'examDate',
                    render: (date: string) => dayjs(date).format('YYYY-MM-DD')
                  },
                  {
                    title: '参考人数',
                    dataIndex: 'totalStudents',
                    key: 'totalStudents'
                  },
                  {
                    title: '录入进度',
                    dataIndex: 'completionRate',
                    key: 'completionRate',
                    render: (rate: number) => (
                      <Progress 
                        percent={Math.round(rate)} 
                        size="small"
                        status={rate >= 100 ? 'success' : rate >= 50 ? 'active' : 'exception'}
                      />
                    )
                  },
                  {
                    title: '操作',
                    key: 'action',
                    render: (_, record) => (
                      <Button 
                        type="text" 
                        icon={<EyeOutlined />}
                        size="small"
                        onClick={() => handleExamClick(record)}
                      >
                        查看详情
                      </Button>
                    )
                  }
                ]}
              />
            </Card>
          </>
        )}

        {/* 科目趋势分析弹窗 */}
        <SubjectTrendModal
          visible={subjectTrendModal.visible}
          onClose={closeSubjectTrendModal}
          classId={subjectTrendModal.classId}
          className={subjectTrendModal.className}
          subject={subjectTrendModal.subject}
          initialTimeRange={timeParams ? {
            startDate: timeParams.startDate,
            endDate: timeParams.endDate
          } : undefined}
        />
      </Space>
    </div>
  );
};

export default ExamAnalyticsTab; 