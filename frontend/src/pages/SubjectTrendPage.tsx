
import AppButton from '@/components/AppButton';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Select, Space, Statistic, Typography, Alert, Spin, Empty, Table, Tag, Input, Progress, message, theme as themeApi, Card } from 'antd';
import UnifiedRangePicker from '@/components/common/UnifiedRangePicker';
import { UnifiedCardPresets } from '@/theme/card';
import {
  ArrowLeftOutlined,
  LineChartOutlined,
  BarChartOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  UserOutlined,
  BookOutlined,
  SearchOutlined,
  ReloadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { Line, Area } from '@ant-design/charts';
import { useThemeStore } from '@/stores/themeStore';
import { useResponsive } from '@/hooks/useResponsive';
import * as examApi from '@/api/examApi';
import * as studentLogApi from '@/api/studentLogApi';
import type { Class, Subject, ExamType } from '@/types/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
 

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

const SubjectTrendPage: React.FC = () => {
  const { classId, subject } = useParams<{ classId: string; subject: string }>();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const { token } = themeApi.useToken();
  const { isMobile } = useResponsive();

  // 状态管理
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedExamType, setSelectedExamType] = useState<ExamType | 'all'>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [trendData, setTrendData] = useState<any>(null);
  const [studentsData, setStudentsData] = useState<any>(null);
  const [studentSearchText, setStudentSearchText] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 主题适配样式
  const themeStyles = {
    cardBackground: token.colorBgContainer,
    textPrimary: token.colorText,
    textSecondary: token.colorTextSecondary,
    successColor: token.colorSuccess,
    warningColor: token.colorWarning,
    errorColor: token.colorError,
    primaryColor: token.colorPrimary,
  } as const;

  // 数据加载
  const loadClasses = async () => {
    try {
      const classesData = await studentLogApi.getClasses();
      setClasses(classesData);
    } catch (err) {
      console.error('❌ 班级列表加载失败:', err);
      setError('班级列表加载失败');
    }
  };

  const loadTrendData = async () => {
    if (!classId || !subject) return;
    
    setLoading(true);
    try {
      const filters: any = {
        examType: selectedExamType === 'all' ? undefined : selectedExamType
      };
      
      if (dateRange) {
        filters.startDate = dateRange[0].format('YYYY-MM-DD');
        filters.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      const trendResult = await examApi.getSubjectTrend(
        parseInt(classId), 
        subject as Subject, 
        filters
      );
      setTrendData(trendResult);
      setError(null);
    } catch (err) {
      console.error('❌ 科目趋势数据加载失败:', err);
      setError('科目趋势数据加载失败，可能需要登录或权限不足');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsData = async () => {
    if (!classId || !subject) return;
    
    setStudentsLoading(true);
    try {
      const filters: any = {
        examType: selectedExamType === 'all' ? undefined : selectedExamType
      };
      
      if (dateRange) {
        filters.startDate = dateRange[0].format('YYYY-MM-DD');
        filters.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      if (selectedStudentId) {
        filters.studentId = selectedStudentId;
      }

      const studentsResult = await examApi.getSubjectStudentsAnalysis(
        parseInt(classId), 
        subject as Subject, 
        filters
      );
      setStudentsData(studentsResult);
    } catch (err) {
      console.error('❌ 学生数据加载失败:', err);
      message.error('学生数据加载失败');
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (classId && subject) {
      loadTrendData();
      loadStudentsData();
    }
  }, [classId, subject, selectedExamType, dateRange, selectedStudentId]);

  // 数据处理
  const currentClass = useMemo(() => {
    return classes.find(c => c.id === parseInt(classId || '0'));
  }, [classes, classId]);

  const filteredStudents = useMemo(() => {
    if (!studentsData?.students) return [];
    
    return studentsData.students.filter((student: any) =>
      student.studentName.toLowerCase().includes(studentSearchText.toLowerCase())
    );
  }, [studentsData, studentSearchText]);

  // 图表配置
  const trendChartConfig = useMemo(() => {
    if (!trendData?.trend) return null;

    return {
      data: trendData.trend,
      xField: 'examDate',
      yField: 'normalizedAverage',
      smooth: true,
      point: {
        size: 4,
        shape: 'circle'
      },
      tooltip: {
        formatter: (datum: any) => ({
          name: '平均分',
          value: `${datum.normalizedAverage}% (${datum.examName})`
        })
      },
      color: themeStyles.primaryColor,
      lineStyle: {
        lineWidth: 3,
      },
      areaStyle: {
        fillOpacity: 0.3,
      }
    };
  }, [trendData, themeStyles.primaryColor]);

  const participationChartConfig = useMemo(() => {
    if (!trendData?.trend) return null;

    return {
      data: trendData.trend,
      xField: 'examDate',
      yField: 'participationRate',
      smooth: true,
      point: {
        size: 4,
        shape: 'circle'
      },
      tooltip: {
        formatter: (datum: any) => ({
          name: '参与率',
          value: `${datum.participationRate}% (${datum.examName})`
        })
      },
      color: themeStyles.successColor,
      lineStyle: {
        lineWidth: 2,
      }
    };
  }, [trendData, themeStyles.successColor]);

  // 学生表格配置
  const studentColumns = [
    {
      title: '学生姓名',
      dataIndex: 'studentName',
      key: 'studentName',
      width: 120,
      fixed: 'left' as const
    },
    {
      title: '平均分',
      dataIndex: 'averageScore',
      key: 'averageScore',
      width: 80,
      render: (score: number) => (
        <Text strong style={{ color: score >= 85 ? themeStyles.successColor : score >= 60 ? themeStyles.warningColor : themeStyles.errorColor }}>
          {score}%
        </Text>
      ),
      sorter: (a: any, b: any) => a.averageScore - b.averageScore,
      defaultSortOrder: 'descend' as const
    },
    {
      title: '趋势',
      dataIndex: 'trend',
      key: 'trend',
      width: 80,
      render: (trend: string, record: any) => {
        const icon = trend === 'improving' ? <ArrowUpOutlined /> : 
                    trend === 'declining' ? <ArrowDownOutlined /> : null;
        const color = trend === 'improving' ? themeStyles.successColor : 
                     trend === 'declining' ? themeStyles.errorColor : themeStyles.textSecondary;
        
        return (
          <Space>
            {icon && <span style={{ color }}>{icon}</span>}
            <Text style={{ color }}>
              {record.improvement > 0 ? '+' : ''}{record.improvement}%
            </Text>
          </Space>
        );
      }
    },
    {
      title: '参考次数',
      dataIndex: 'validScores',
      key: 'validScores',
      width: 80,
      render: (validScores: number, record: any) => (
        <Text>{validScores}/{record.totalExams}</Text>
      )
    },
    {
      title: '参与率',
      dataIndex: 'participationRate',
      key: 'participationRate',
      width: 80,
      render: (rate: number) => (
        <Progress 
          percent={rate} 
          size="small" 
          status={rate >= 90 ? 'success' : rate >= 70 ? 'normal' : 'exception'}
          format={percent => `${percent}%`}
        />
      )
    },
    {
      title: '最高分',
      dataIndex: 'highestScore',
      key: 'highestScore',
      width: 70,
      render: (score: number) => <Text>{score}%</Text>
    },
    {
      title: '最低分',
      dataIndex: 'lowestScore',
      key: 'lowestScore',
      width: 70,
      render: (score: number) => <Text>{score}%</Text>
    }
  ];

  // 智能洞察
  const generateInsights = () => {
    if (!trendData || !studentsData) return [];
    
    const insights = [];
    const { summary } = trendData;
    const { overview } = studentsData;
    
    // 成绩趋势洞察
    if (summary.improvement > 5) {
      insights.push({
        type: 'success',
        message: `📈 整体成绩呈上升趋势，近期平均提升 ${summary.improvement}%`
      });
    } else if (summary.improvement < -5) {
      insights.push({
        type: 'warning',
        message: `📉 整体成绩有下降趋势，需关注教学调整，近期下降 ${Math.abs(summary.improvement)}%`
      });
    }
    
    // 参与率洞察
    if (summary.averageParticipationRate < 85) {
      insights.push({
        type: 'warning',
        message: `⚠️ 平均参与率较低 (${summary.averageParticipationRate}%)，建议加强出勤管理`
      });
    }
    
    // 学生表现洞察
    if (studentsData.students) {
      const improvingStudents = studentsData.students.filter((s: any) => s.trend === 'improving').length;
      const decliningStudents = studentsData.students.filter((s: any) => s.trend === 'declining').length;
      
      if (improvingStudents > decliningStudents) {
        insights.push({
          type: 'success',
          message: `🎯 ${improvingStudents} 名学生成绩呈上升趋势，整体学习状态良好`
        });
      }
      
      if (decliningStudents > overview.totalStudents * 0.3) {
        insights.push({
          type: 'error',
          message: `🚨 ${decliningStudents} 名学生成绩下降，需要重点关注`
        });
      }
    }
    
    return insights;
  };

  // 事件处理
  const handleBack = () => {
    navigate('/analytics');
  };

  const handleRefresh = () => {
    loadTrendData();
    loadStudentsData();
  };

  const handleStudentSearch = (studentId: number | null) => {
    setSelectedStudentId(studentId);
  };

  // 渲染组件
  if (error) {
    return (
      <div data-page-container>
        <Alert 
          message="数据加载失败" 
          description={error}
          type="error" 
          showIcon 
          action={
            <AppButton size="sm" onClick={handleRefresh}>
              重试
            </AppButton>
          }
        />
      </div>
    );
  }

  return (
    <div data-page-container>
      {/* 页面头部 */}
      {(() => { const preset = UnifiedCardPresets.desktopDefault(false); return (
      <Card style={{ ...preset.style, marginBottom: 'var(--space-6)' }} styles={preset.styles}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="large">
              <AppButton 
                icon={<ArrowLeftOutlined />} 
                onClick={handleBack}
                size={isMobile ? 'middle' : 'large'}
              />
              <div>
                <Title level={3} style={{ margin: 0 }}>
                  {subjectLabels[subject as Subject]} 科目分析
                </Title>
                <Text type="secondary">
                  {currentClass?.name} · 历史趋势与学生表现分析
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <AppButton 
              icon={<ReloadOutlined />} 
              onClick={handleRefresh}
              loading={loading}
            >
              刷新数据
            </AppButton>
          </Col>
        </Row>
      </Card>
      ); })()}

      {/* 筛选控制区 */}
      {(() => { const preset = UnifiedCardPresets.desktopDefault(false); return (
      <Card style={{ ...preset.style, marginBottom: 'var(--space-6)' }} styles={preset.styles}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>考试类型</Text>
              <Select
                style={{ width: '100%' }}
                value={selectedExamType}
                onChange={setSelectedExamType}
              >
                <Option value="all">全部类型</Option>
                {Object.entries(examTypeLabels).map(([value, label]) => (
                  <Option key={value} value={value}>{label}</Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={10} md={8}>
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>时间范围</Text>
              <UnifiedRangePicker
                className="w-full"
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                placeholder={['开始日期', '结束日期']}
              />
            </Space>
          </Col>
          <Col xs={24} sm={6} md={6}>
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>学生搜索</Text>
              <Input
                placeholder="搜索学生姓名"
                prefix={<SearchOutlined />}
                value={studentSearchText}
                onChange={(e) => setStudentSearchText(e.target.value)}
                allowClear
              />
            </Space>
          </Col>
          {studentsData?.students && (
            <Col xs={24} sm={6} md={4}>
              <Space direction="vertical" size={0} style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>单个学生</Text>
                <Select
                  style={{ width: '100%' }}
                  placeholder="选择学生"
                  value={selectedStudentId}
                  onChange={handleStudentSearch}
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={studentsData.students.map((student: any) => ({
                    value: student.studentId,
                    label: student.studentName
                  }))}
                />
              </Space>
            </Col>
          )}
        </Row>
      </Card>
      ); })()}

      {loading ? (
        (() => { const preset = UnifiedCardPresets.desktopDefault(false); return (
        <Card style={preset.style} styles={preset.styles}>
          <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 'var(--space-4)' }}>
              <Text type="secondary">加载科目分析数据中...</Text>
            </div>
          </div>
        </Card> ); })()
      ) : !trendData ? (
        (() => { const preset = UnifiedCardPresets.desktopDefault(false); return (
        <Card style={preset.style} styles={preset.styles}>
          <Empty
            description="暂无数据"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card> ); })()
      ) : (
        <>
          {/* 智能洞察 */}
          {generateInsights().length > 0 && (
            (() => { const preset = UnifiedCardPresets.desktopDefault(false); return (
            <Card title="智能洞察" style={{ ...preset.style, marginBottom: 'var(--space-6)' }} styles={preset.styles}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {generateInsights().map((insight, index) => (
                  <Alert
                    key={index}
                    message={insight.message}
                    type={insight.type as any}
                    showIcon
                  />
                ))}
              </Space>
            </Card>
            ); })()
          )}

          {/* 核心指标卡片 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 'var(--space-6)' }}>
            <Col xs={12} sm={6}>
              {(() => { const preset = UnifiedCardPresets.desktopDefault(false); return (
              <Card size="small" style={preset.style} styles={preset.styles}>
                <Statistic
                  title="考试总数"
                  value={trendData.summary.totalExams}
                  prefix={<BookOutlined />}
                  valueStyle={{ color: themeStyles.primaryColor }}
                />
              </Card> ); })()}
            </Col>
            <Col xs={12} sm={6}>
              {(() => { const preset = UnifiedCardPresets.desktopDefault(false); return (
              <Card size="small" style={preset.style} styles={preset.styles}>
                <Statistic
                  title="学生总数"
                  value={trendData.summary.totalStudents}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: themeStyles.successColor }}
                />
              </Card> ); })()}
            </Col>
            <Col xs={12} sm={6}>
              {(() => { const preset = UnifiedCardPresets.desktopDefault(false); return (
              <Card size="small" style={preset.style} styles={preset.styles}>
                <Statistic
                  title="平均成绩"
                  value={trendData.summary.averageScore}
                  suffix="%"
                  valueStyle={{ 
                    color: trendData.summary.averageScore >= 80 ? themeStyles.successColor : 
                           trendData.summary.averageScore >= 60 ? themeStyles.warningColor : themeStyles.errorColor
                  }}
                />
              </Card> ); })()}
            </Col>
            <Col xs={12} sm={6}>
            {(() => { const preset = UnifiedCardPresets.desktopDefault(false); return (
            <Card size="small" style={preset.style} styles={preset.styles}>
                <Statistic
                  title="成绩趋势"
                  value={Math.abs(trendData.summary.improvement)}
                  suffix="%"
                  prefix={
                    trendData.summary.improvement > 0 ? 
                    <ArrowUpOutlined style={{ color: themeStyles.successColor }} /> :
                    trendData.summary.improvement < 0 ?
                    <ArrowDownOutlined style={{ color: themeStyles.errorColor }} /> :
                    <InfoCircleOutlined style={{ color: themeStyles.textSecondary }} />
                  }
                  valueStyle={{ 
                    color: trendData.summary.improvement > 0 ? themeStyles.successColor :
                           trendData.summary.improvement < 0 ? themeStyles.errorColor : themeStyles.textSecondary
                  }}
                />
            </Card> ); })()}
            </Col>
          </Row>

          {/* 趋势图表 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 'var(--space-6)' }}>
            <Col xs={24} lg={12}>
              {(() => { const preset = UnifiedCardPresets.desktopDefault(false); return (
              <Card title={
                <Space>
                  <LineChartOutlined />
                  <span>成绩趋势</span>
                </Space>
              } style={preset.style} styles={preset.styles}>
                {trendChartConfig ? (
                  <div style={{ height: '300px' }}>
                    <Area {...trendChartConfig} />
                  </div>
                ) : (
                  <Empty description="暂无趋势数据" />
                )}
              </Card>
              ); })()}
            </Col>
            <Col xs={24} lg={12}>
              <Card title={
                <Space>
                  <BarChartOutlined />
                  <span>参与率趋势</span>
                </Space>
              }>
                {participationChartConfig ? (
                  <div style={{ height: '300px' }}>
                    <Line {...participationChartConfig} />
                  </div>
                ) : (
                  <Empty description="暂无参与率数据" />
                )}
              </Card>
            </Col>
          </Row>

          {/* 学生表现表格 */}
          <Card 
            title={
              <Space>
                <UserOutlined />
                <span>学生表现分析</span>
                {selectedStudentId && (
                  <Tag color="blue">
                    已筛选: {studentsData?.students?.find((s: any) => s.studentId === selectedStudentId)?.studentName}
                  </Tag>
                )}
              </Space>
            }
            extra={
              <Space>
                <Text type="secondary">
                  共 {filteredStudents.length} 名学生
                </Text>
              </Space>
            }
          >
            <Table
              columns={studentColumns}
              dataSource={filteredStudents}
              rowKey="studentId"
              loading={studentsLoading}
              pagination={{
                total: filteredStudents.length,
                pageSize: isMobile ? 5 : 10,
                showSizeChanger: !isMobile,
                showQuickJumper: !isMobile,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
              }}
              scroll={{ x: 600 }}
              size={isMobile ? 'small' : 'middle'}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default SubjectTrendPage; 