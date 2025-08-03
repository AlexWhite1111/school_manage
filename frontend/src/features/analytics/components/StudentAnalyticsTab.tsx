import React, { useState, useEffect } from 'react';
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
  Divider,
  Progress,
  List,
  Avatar,
  Tooltip
} from 'antd';
import { Line } from '@ant-design/charts';
import { 
  LineChartOutlined,
  TagsOutlined,
  CalendarOutlined,
  UserOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  RiseOutlined,
  FallOutlined
} from '@ant-design/icons';
import { useThemeStore } from '@/stores/themeStore';
import { useResponsive } from '@/hooks/useResponsive';
import { 
  getStudentGrowthAnalytics,
  getStudentsForAnalytics 
} from '@/api/analyticsApi';
import type { 
  AnalyticsTimeRangeParams,
  StudentGrowthAnalytics 
} from '@/types/api';

const { Title, Text } = Typography;
const { Option } = Select;

interface StudentAnalyticsTabProps {
  timeParams: AnalyticsTimeRangeParams;
  refreshKey: number;
}

const StudentAnalyticsTab: React.FC<StudentAnalyticsTabProps> = ({
  timeParams,
  refreshKey
}) => {
  const { theme } = useThemeStore();
  const { isMobile } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [students, setStudents] = useState<{ id: number; name: string; classNames: string[] }[]>([]);
  const [growthData, setGrowthData] = useState<StudentGrowthAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    positiveColor: theme === 'dark' ? '#52c41a' : '#52c41a',
    negativeColor: theme === 'dark' ? '#ff7875' : '#ff4d4f'
  };

  // ===============================
  // 加载学生列表
  // ===============================

  const loadStudents = async () => {
    setStudentsLoading(true);
    try {
      const studentsData = await getStudentsForAnalytics();
      setStudents(studentsData);
      
      // 自动选择第一个学生
      if (studentsData.length > 0 && !selectedStudentId) {
        setSelectedStudentId(studentsData[0].id);
      }
    } catch (err) {
      console.error('❌ 学生列表加载失败:', err);
      setError('学生列表加载失败');
    } finally {
      setStudentsLoading(false);
    }
  };

  // ===============================
  // 加载学生成长数据
  // ===============================

  const loadGrowthData = async () => {
    if (!selectedStudentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 加载学生成长数据...', { studentId: selectedStudentId, timeParams });
      
      const growthResult = await getStudentGrowthAnalytics(selectedStudentId, timeParams);
      console.log('📊 学生成长API返回数据:', growthResult);
      setGrowthData(growthResult);
      
      console.log('✅ 学生成长数据加载成功');
    } catch (err) {
      console.error('❌ 学生成长数据加载失败:', err);
      setError(err instanceof Error ? err.message : '数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    console.log('🔄 StudentAnalyticsTab useEffect triggered:', { selectedStudentId, timeParams, refreshKey });
    if (selectedStudentId) {
      loadGrowthData();
    }
  }, [selectedStudentId, timeParams, refreshKey]);

  // ===============================
  // 渲染成长趋势图
  // ===============================

  const renderGrowthTrendChart = () => {
    if (!growthData?.growthTrend || growthData.growthTrend.length === 0) {
      return (
        <Empty 
          description="暂无成长趋势数据" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    // 准备图表数据
    const chartData = growthData.growthTrend.flatMap(item => [
      {
        date: item.date,
        count: item.positiveCount || 0,
        type: '正面标签',
      },
      {
        date: item.date,
        count: item.negativeCount || 0,
        type: '需要改进',
      },
    ]);

    const config: any = {
      data: chartData,
      xField: 'date',
      yField: 'count',
      seriesField: 'type',
      smooth: true,
      animation: {
        appear: {
          animation: 'path-in',
          duration: 1000,
        },
      },
      color: ['#52c41a', '#ff7875'], // 更明确的颜色对比
      point: {
        size: isMobile ? 3 : 4,
        shape: 'circle',
      },
      lineStyle: {
        lineWidth: isMobile ? 2 : 3,
      },
      tooltip: {
        formatter: (datum: any) => ({
          name: datum.type,
          value: `${datum.count} 次`,
        }),
        showCrosshairs: true,
        shared: true,
      },
      legend: {
        position: isMobile ? 'bottom' : 'top',
        itemSpacing: isMobile ? 16 : 24,
      },
      xAxis: {
        type: 'time',
        mask: 'MM-DD',
        tickCount: isMobile ? 4 : 6,
        label: {
          style: {
            fontSize: isMobile ? 10 : 12,
          },
        },
      },
      yAxis: {
        min: 0,
        tickCount: isMobile ? 4 : 5,
        label: {
          style: {
            fontSize: isMobile ? 10 : 12,
          },
        },
        grid: {
          line: {
            style: {
              stroke: theme === 'dark' ? '#434343' : '#f0f0f0',
              lineWidth: 1,
              lineDash: [4, 5],
            },
          },
        },
      },
      theme,
      autoFit: true,
      padding: isMobile ? [20, 20, 40, 40] : [20, 20, 40, 60],
    };

    return (
      <div style={{ height: isMobile ? '280px' : '350px', width: '100%' }}>
        <Line {...config} />
      </div>
    );
  };

  // ===============================
  // 渲染高频标签
  // ===============================

  const renderTopTags = () => {
    if (!growthData?.topTags) return null;

    return (
      <Row gutter={[16, 16]}>
        {/* 积极标签 */}
        <Col span={12}>
          <Card
            size="small"
            title={
              <Space>
                <RiseOutlined style={{ color: themeStyles.positiveColor }} />
                <Text style={{ color: themeStyles.textPrimary }}>
                  高频积极标签
                </Text>
              </Space>
            }
            bordered={false}
            style={{ 
              background: themeStyles.cardBackground,
              borderRadius: '8px'
            }}
          >
            <List
              size="small"
              dataSource={growthData.topTags.positive}
              renderItem={(tag, index) => (
                <List.Item style={{ padding: '8px 0' }}>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        size="small" 
                        style={{ 
                          backgroundColor: themeStyles.positiveColor,
                          color: 'white'
                        }}
                      >
                        {index + 1}
                      </Avatar>
                    }
                    title={
                      <Text style={{ color: themeStyles.textPrimary }}>
                        {tag.tagText}
                      </Text>
                    }
                    description={
                      <Tag color="green">
                        {tag.count} 次
                      </Tag>
                    }
                  />
                </List.Item>
              )}
            />
            {(!growthData.topTags.positive || growthData.topTags.positive.length === 0) && (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Alert
                  message="暂无数据"
                  description="当前时间段内没有积极标签记录"
                  type="info"
                  showIcon
                />
              </div>
            )}
          </Card>
        </Col>

        {/* 消极标签 */}
        <Col span={12}>
          <Card
            size="small"
            title={
              <Space>
                <FallOutlined style={{ color: themeStyles.negativeColor }} />
                <Text style={{ color: themeStyles.textPrimary }}>
                  高频消极标签
                </Text>
              </Space>
            }
            bordered={false}
            style={{ 
              background: themeStyles.cardBackground,
              borderRadius: '8px'
            }}
          >
            <List
              size="small"
              dataSource={growthData.topTags.negative}
              renderItem={(tag, index) => (
                <List.Item style={{ padding: '8px 0' }}>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        size="small" 
                        style={{ 
                          backgroundColor: themeStyles.negativeColor,
                          color: 'white'
                        }}
                      >
                        {index + 1}
                      </Avatar>
                    }
                    title={
                      <Text style={{ color: themeStyles.textPrimary }}>
                        {tag.tagText}
                      </Text>
                    }
                    description={
                      <Tag color="red">
                        {tag.count} 次
                      </Tag>
                    }
                  />
                </List.Item>
              )}
            />
            {(!growthData.topTags.negative || growthData.topTags.negative.length === 0) && (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Alert
                  message="暂无数据"
                  description="当前时间段内没有消极标签记录"
                  type="info"
                  showIcon
                />
              </div>
            )}
          </Card>
        </Col>
      </Row>
    );
  };

  // ===============================
  // 渲染考勤概览
  // ===============================

  const renderAttendanceSummary = () => {
    if (!growthData?.attendanceSummary) return null;

    const { attendanceSummary } = growthData;
    
    return (
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Statistic
            title="总出勤天数"
            value={attendanceSummary.totalDays}
            prefix={<CalendarOutlined style={{ color: themeStyles.primaryColor }} />}
            valueStyle={{ color: themeStyles.textPrimary }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="出勤率"
            value={attendanceSummary.attendanceRate}
            suffix="%"
            precision={1}
            prefix={<CheckCircleOutlined style={{ color: themeStyles.successColor }} />}
            valueStyle={{ 
              color: attendanceSummary.attendanceRate >= 80 
                ? themeStyles.successColor 
                : attendanceSummary.attendanceRate >= 60 
                  ? themeStyles.warningColor 
                  : themeStyles.errorColor 
            }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="正常出勤"
            value={attendanceSummary.presentDays}
            prefix={<CheckCircleOutlined style={{ color: themeStyles.successColor }} />}
            valueStyle={{ color: themeStyles.textPrimary }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="缺勤/未到"
            value={attendanceSummary.absentDays + attendanceSummary.noShowDays}
            prefix={<ExclamationCircleOutlined style={{ color: themeStyles.errorColor }} />}
            valueStyle={{ color: themeStyles.textPrimary }}
          />
        </Col>
      </Row>
    );
  };

  // ===============================
  // 错误状态
  // ===============================

  if (error) {
    return (
      <Alert
        message="数据加载失败"
        description={error}
        type="error"
        showIcon
        style={{ margin: '20px' }}
      />
    );
  }

  // ===============================
  // 渲染主要内容
  // ===============================

  return (
    <div style={{ padding: '0 24px' }}>
      {/* 学生选择器 */}
      <Card
        bordered={false}
        style={{ 
          background: themeStyles.cardBackground,
          borderRadius: '12px',
          marginBottom: '24px',
          boxShadow: theme === 'dark' 
            ? '0 2px 8px rgba(0, 0, 0, 0.3)' 
            : '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Row align="middle" gutter={[16, 0]}>
          <Col span={4}>
            <Text strong style={{ color: themeStyles.textPrimary }}>
              <UserOutlined style={{ marginRight: '8px', color: themeStyles.primaryColor }} />
              选择学生
            </Text>
          </Col>
          <Col span={8}>
            <Select
              placeholder="请选择要分析的学生"
              value={selectedStudentId}
              onChange={setSelectedStudentId}
              loading={studentsLoading}
              style={{ width: '100%' }}
              showSearch
              filterOption={(input, option) => {
                // 使用学生名称进行搜索（确保类型一致）
                const valueAsNumber = Number(option?.value);
                const student = students.find(s => s.id === valueAsNumber);
                return student ? student.name.toLowerCase().includes(input.toLowerCase()) : false;
              }}
            >
              {students.map(student => (
                <Option key={student.id} value={student.id}>
                  <Space>
                    <Text>{student.name}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      ({student.classNames.join(', ')})
                    </Text>
                  </Space>
                </Option>
              ))}
            </Select>
          </Col>
          {growthData && (
            <Col span={12}>
              <Space size="large">
                <Text style={{ color: themeStyles.textSecondary }}>
                  分析周期：{growthData.dateRange.startDate} 至 {growthData.dateRange.endDate}
                </Text>
                <Tag color={themeStyles.primaryColor}>
                  {growthData.studentName}
                </Tag>
              </Space>
            </Col>
          )}
        </Row>
      </Card>

      {selectedStudentId && (
        <Spin spinning={loading} tip="正在加载学生成长数据...">
          <Row gutter={[16, 16]}>
            {/* 成长趋势图 */}
            <Col span={24}>
              <Card
                title={
                  <Space>
                    <LineChartOutlined style={{ color: themeStyles.primaryColor }} />
                    <Text strong style={{ color: themeStyles.textPrimary }}>
                      成长趋势分析
                    </Text>
                  </Space>
                }
                bordered={false}
                style={{ 
                  background: themeStyles.cardBackground,
                  borderRadius: '12px',
                  marginBottom: '24px',
                  boxShadow: theme === 'dark' 
                    ? '0 2px 8px rgba(0, 0, 0, 0.3)' 
                    : '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div style={{ minHeight: '300px' }}>
                  {renderGrowthTrendChart()}
                </div>
              </Card>
            </Col>

            {/* 高频标签统计 */}
            <Col span={24}>
              <Card
                title={
                  <Space>
                    <TagsOutlined style={{ color: themeStyles.primaryColor }} />
                    <Text strong style={{ color: themeStyles.textPrimary }}>
                      高频成长标签
                    </Text>
                  </Space>
                }
                bordered={false}
                style={{ 
                  background: themeStyles.cardBackground,
                  borderRadius: '12px',
                  marginBottom: '24px',
                  boxShadow: theme === 'dark' 
                    ? '0 2px 8px rgba(0, 0, 0, 0.3)' 
                    : '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
              >
                {renderTopTags()}
              </Card>
            </Col>

            {/* 考勤概览 */}
            <Col span={24}>
              <Card
                title={
                  <Space>
                    <CalendarOutlined style={{ color: themeStyles.primaryColor }} />
                    <Text strong style={{ color: themeStyles.textPrimary }}>
                      考勤概览
                    </Text>
                  </Space>
                }
                bordered={false}
                style={{ 
                  background: themeStyles.cardBackground,
                  borderRadius: '12px',
                  boxShadow: theme === 'dark' 
                    ? '0 2px 8px rgba(0, 0, 0, 0.3)' 
                    : '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
              >
                {renderAttendanceSummary()}
              </Card>
            </Col>
          </Row>
        </Spin>
      )}

      {!selectedStudentId && !loading && (
        <Card
          bordered={false}
          style={{ 
            background: themeStyles.cardBackground,
            borderRadius: '12px',
            textAlign: 'center',
            padding: '60px 20px'
          }}
        >
          <Empty
            description={
              <Text style={{ color: themeStyles.textSecondary }}>
                请先选择一个学生进行成长分析
              </Text>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      )}
    </div>
  );
};

export default StudentAnalyticsTab; 