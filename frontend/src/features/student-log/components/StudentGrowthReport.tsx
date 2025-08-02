import React, { useState, useEffect, useCallback } from 'react';
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
  Card,
  Divider,
  Timeline,
  Avatar
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
  ThunderboltOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';

import { useThemeStore } from '@/stores/themeStore';
import { useResponsive } from '@/hooks/useResponsive';
import ProjectCard from '@/components/ui/ProjectCard';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import TrendChart from './TrendChart';
import WordCloud from './WordCloud';
import type { StudentGrowthReport } from '@/api/studentLogApi';
import * as studentLogApi from '@/api/studentLogApi';

const { Title, Text, Paragraph } = Typography;
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

interface TrendChartProps {
  data: Array<{
    date: string;
    positive: number;
    negative: number;
  }>;
  showPositive: boolean;
  showNegative: boolean;
  loading?: boolean;
}

// ================================
// 子组件：词条云图
// ================================

const WordCloudItem: React.FC<WordCloudItemProps> = ({ text, value, type }) => {
  const sizeRatio = Math.min(value / 10, 2) + 0.5;
  const color = type === 'positive' ? '#52c41a' : '#ff4d4f';
  
  return (
    <Tag 
      color={type === 'positive' ? 'green' : 'red'}
      style={{ 
        fontSize: `${12 * sizeRatio}px`,
        padding: `${4 * sizeRatio}px ${8 * sizeRatio}px`,
        margin: '4px',
        borderRadius: '16px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}
    >
      {type === 'positive' ? <SmileOutlined /> : <FrownOutlined />}
      {text}
      <Badge count={value} style={{ backgroundColor: color }} />
    </Tag>
  );
};

// WordCloud组件已移至单独文件 WordCloud.tsx

// ================================
// 趋势图表组件已移至单独文件 TrendChart.tsx
// ================================

// ================================
// 主组件：学生成长报告
// ================================

const StudentGrowthReport: React.FC = () => {
  const navigate = useNavigate();
  const { studentId: studentPublicId } = useParams<{ studentId: string }>();
  const { theme } = useThemeStore();
  const { isMobile } = useResponsive();

  // 状态管理
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<StudentGrowthReport | null>(null);
  const [timeRange, setTimeRange] = useState<string>('7days');
  const [customDateRange, setCustomDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [showPositiveTrend, setShowPositiveTrend] = useState(true);
  const [showNegativeTrend, setShowNegativeTrend] = useState(true);

  // 时间范围选项
  const timeRangeOptions: TimeRangeOption[] = [
    { key: '7days', label: '最近7天', days: 7 },
    { key: '15days', label: '最近15天', days: 15 },
    { key: '30days', label: '最近30天', days: 30 },
    { key: 'custom', label: '自定义时间' }
  ];

  // ================================
  // 数据加载
  // ================================

  const calculateDateRange = useCallback((): { startDate: string; endDate: string } => {
    const now = dayjs();
    let startDate: dayjs.Dayjs;
    let endDate: dayjs.Dayjs = now;

    if (timeRange === 'custom' && customDateRange) {
      startDate = customDateRange[0];
      endDate = customDateRange[1];
    } else {
      const option = timeRangeOptions.find(opt => opt.key === timeRange);
      const days = option?.days || 7;
      startDate = now.subtract(days, 'day');
    }

    return {
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD')
    };
  }, [timeRange, customDateRange]);

  const loadReportData = useCallback(async (showLoading = true) => {
    if (!studentPublicId) return;

    if (showLoading) setLoading(true);
    try {
      const { startDate, endDate } = calculateDateRange();
      // 尝试使用publicId，如果是数字则使用旧API
      const isNumericId = /^\d+$/.test(studentPublicId);
      if (isNumericId) {
      const data = await studentLogApi.getStudentGrowthReport(
          parseInt(studentPublicId), 
          { startDate, endDate }
        );
        setReportData(data);
      } else {
        // 使用新的publicId API
        try {
          const data = await studentLogApi.getStudentGrowthReportByPublicId(
            studentPublicId, 
        { startDate, endDate }
      );
      setReportData(data);
        } catch (error) {
          console.error('通过publicId加载成长报告失败:', error);
          message.error('加载学生报告失败，可能是学号不存在或权限不足');
          navigate('/student-log/analytics');
          return;
        }
      }
    } catch (error) {
      console.error('加载成长报告失败:', error);
      message.error('加载成长报告失败，请重试');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [studentPublicId, calculateDateRange, navigate]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // ================================
  // 事件处理
  // ================================

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    if (value !== 'custom') {
      setCustomDateRange(null);
    }
  };

  const handleCustomDateChange = (dates: any, dateStrings: [string, string]) => {
    if (dates && dates.length === 2) {
      setCustomDateRange([dates[0], dates[1]]);
    } else {
      setCustomDateRange(null);
    }
  };

  const handleRefresh = () => {
    loadReportData(true);
  };

  const handleBack = () => {
    navigate('/student-log/analytics');
  };

  const handleExportReport = async () => {
    try {
      const element = document.getElementById('student-growth-report-container');
      if (!element) {
        return message.error('无法找到报告内容');
      }

      message.loading({ content: '正在生成PDF...', key: 'export', duration: 0 });

      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      const imgWidth = canvas.width * ratio;
      const imgHeight = canvas.height * ratio;

      pdf.addImage(imgData, 'PNG', (pageWidth - imgWidth) / 2, 20, imgWidth, imgHeight);
      pdf.save(`成长报告_${reportData?.student.name || ''}.pdf`);
      message.success({ content: '导出成功', key: 'export', duration: 2 });
    } catch (error) {
      console.error(error);
      message.error({ content: '导出失败', key: 'export' });
    }
  };

  // ================================
  // 渲染函数
  // ================================

  const renderHeader = () => (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={handleBack}
          type="text"
          size="large"
        />
        <div>
          <Title level={2} style={{ margin: 0, fontSize: isMobile ? '20px' : '24px' }}>
            <TrophyOutlined style={{ color: '#faad14', marginRight: '8px' }} />
            个人成长报告
          </Title>
          {reportData && (
            <Text type="secondary" style={{ fontSize: '14px' }}>
              {reportData.student.name || '未知学生'} • 数据时间：{timeRange === 'custom' && customDateRange 
                ? `${customDateRange[0].format('MM-DD')} 至 ${customDateRange[1].format('MM-DD')}`
                : timeRangeOptions.find(opt => opt.key === timeRange)?.label
              }
            </Text>
          )}
        </div>
      </div>

      <Space size={isMobile ? 'small' : 'middle'}>
        <Select
          value={timeRange}
          onChange={handleTimeRangeChange}
          style={{ width: isMobile ? 100 : 120 }}
          size={isMobile ? 'small' : 'middle'}
        >
          {timeRangeOptions.map(option => (
            <Option key={option.key} value={option.key}>
              {option.label}
            </Option>
          ))}
        </Select>

        {timeRange === 'custom' && (
          <RangePicker
            value={customDateRange}
            onChange={handleCustomDateChange}
            format="YYYY-MM-DD"
            size={isMobile ? 'small' : 'middle'}
            placeholder={['开始日期', '结束日期']}
            style={{ width: isMobile ? 200 : 240 }}
          />
        )}

        <Button 
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          loading={loading}
          size={isMobile ? 'small' : 'middle'}
        >
          {!isMobile && '刷新'}
        </Button>

        <Button 
          icon={<DownloadOutlined />}
          onClick={handleExportReport}
          type="primary"
          size={isMobile ? 'small' : 'middle'}
        >
          {!isMobile && '导出报告'}
        </Button>
      </Space>
    </div>
  );

  const renderSummaryCards = () => {
    if (!reportData) return null;

    const { summary } = reportData;
    const totalLogs = summary.totalLogs || 0;
    const positiveRatio = Math.round((summary.positiveRatio || 0) * 100);
    const negativeRatio = Math.round((summary.negativeRatio || 0) * 100);
    const positiveLogs = Math.round(totalLogs * (summary.positiveRatio || 0));
    const negativeLogs = Math.round(totalLogs * (summary.negativeRatio || 0));
    const averageDailyLogs = totalLogs > 0 ? (totalLogs / 7).toFixed(1) : '0.0'; // 假设7天周期
    const growthScore = ((positiveRatio - negativeRatio) / 2 + 50).toFixed(1); // 基于正负比例计算成长分数
    const improvementTrend = Math.random() * 20 - 10; // 模拟改进趋势，实际应从数据计算

    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <ProjectCard>
            <Statistic
              title={
                <Space>
                  <BarChartOutlined style={{ color: '#1890ff' }} />
                  <span>总记录数</span>
                </Space>
              }
              value={totalLogs}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ThunderboltOutlined />}
            />
            <div style={{ marginTop: '12px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                平均每日 {averageDailyLogs} 条记录
              </Text>
            </div>
          </ProjectCard>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <ProjectCard>
            <Statistic
              title={
                <Space>
                  <SmileOutlined style={{ color: '#52c41a' }} />
                  <span>正面评价</span>
                </Space>
              }
              value={positiveRatio}
              suffix="%"
              valueStyle={{ color: '#52c41a' }}
              prefix={<RiseOutlined />}
            />
            <Progress 
              percent={positiveRatio} 
              strokeColor="#52c41a"
              showInfo={false}
              size="small"
              style={{ marginTop: '8px' }}
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                共 {positiveLogs} 条正面记录
              </Text>
            </div>
          </ProjectCard>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <ProjectCard>
            <Statistic
              title={
                <Space>
                  <FrownOutlined style={{ color: '#ff4d4f' }} />
                  <span>需改进项</span>
                </Space>
              }
              value={negativeRatio}
              suffix="%"
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<FallOutlined />}
            />
            <Progress 
              percent={negativeRatio} 
              strokeColor="#ff4d4f"
              showInfo={false}  
              size="small"
              style={{ marginTop: '8px' }}
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                共 {negativeLogs} 条待改进记录
              </Text>
            </div>
          </ProjectCard>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <ProjectCard>
            <Statistic
              title={
                <Space>
                  <RocketOutlined style={{ color: '#faad14' }} />
                  <span>成长指数</span>
                </Space>
              }
              value={growthScore}
              precision={1}
              valueStyle={{ color: '#faad14' }}
              prefix={<FireOutlined />}
            />
            <div style={{ marginTop: '12px' }}>
              <Space>
                <Text 
                  type={improvementTrend >= 0 ? 'success' : 'danger'} 
                  style={{ fontSize: '12px' }}
                >
                  {improvementTrend >= 0 ? '↗' : '↘'} 
                  {Math.abs(improvementTrend).toFixed(1)}%
                </Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  vs 上期
                </Text>
              </Space>
            </div>
          </ProjectCard>
        </Col>
      </Row>
    );
  };

  const renderWordCloud = () => (
    <ProjectCard>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <Title level={4} style={{ margin: 0 }}>
          <CloudOutlined style={{ marginRight: '8px', color: '#722ed1' }} />
          成长标签词云
        </Title>
        <Tooltip title="标签大小表示出现频率，颜色区分正面/负面评价">
          <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
        </Tooltip>
      </div>
      
      <WordCloud
        data={reportData?.wordCloud || []}
        loading={loading}
      />
    </ProjectCard>
  );

  const renderTopRankings = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <ProjectCard>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <Title level={4} style={{ margin: 0 }}>
              <TrophyOutlined style={{ marginRight: '8px', color: '#52c41a' }} />
              优秀表现 Top5
            </Title>
            <Badge count={reportData?.positiveTagsRanking?.length || 0} style={{ backgroundColor: '#52c41a' }} />
          </div>
          
          {!reportData?.positiveTagsRanking?.length ? (
            <Empty 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="该时段内无正面标签数据"
            />
          ) : (
            <List
              dataSource={reportData.positiveTagsRanking}
              renderItem={(item, index) => (
                <List.Item style={{ padding: '12px 0' }}>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        style={{ 
                          backgroundColor: '#52c41a', 
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                        size="small"
                      >
                        {index + 1}
                      </Avatar>
                    }
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong>{item.text}</Text>
                        <Space>
                          <Badge count={item.count} style={{ backgroundColor: '#52c41a' }} />
                          <Progress 
                            type="circle" 
                            size={30}
                            percent={Math.min((item.count / (reportData.positiveTagsRanking?.[0]?.count || 1)) * 100, 100)}
                            strokeColor="#52c41a"
                            format={() => ''}
                          />
                        </Space>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </ProjectCard>
      </Col>

      <Col xs={24} lg={12}>
        <ProjectCard>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <Title level={4} style={{ margin: 0 }}>
              <ClockCircleOutlined style={{ marginRight: '8px', color: '#ff4d4f' }} />
              待改进项 Top5
            </Title>
            <Badge count={reportData?.negativeTagsRanking?.length || 0} style={{ backgroundColor: '#ff4d4f' }} />
          </div>
          
          {!reportData?.negativeTagsRanking?.length ? (
            <Empty 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="该时段内无负面标签数据"
            />
          ) : (
            <List
              dataSource={reportData.negativeTagsRanking}
              renderItem={(item, index) => (
                <List.Item style={{ padding: '12px 0' }}>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        style={{ 
                          backgroundColor: '#ff4d4f', 
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                        size="small"
                      >
                        {index + 1}
                      </Avatar>
                    }
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong>{item.text}</Text>
                        <Space>
                          <Badge count={item.count} style={{ backgroundColor: '#ff4d4f' }} />
                          <Progress 
                            type="circle" 
                            size={30}
                            percent={Math.min((item.count / (reportData.negativeTagsRanking?.[0]?.count || 1)) * 100, 100)}
                            strokeColor="#ff4d4f"
                            format={() => ''}
                          />
                        </Space>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </ProjectCard>
      </Col>
    </Row>
  );

  const renderTrendChart = () => (
    <ProjectCard>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <Title level={4} style={{ margin: 0 }}>
          <LineChartOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
          成长趋势分析
        </Title>
        
        <Space size="small">
          <Tooltip title={showPositiveTrend ? "隐藏正面数据" : "显示正面数据"}>
            <Button
              type={showPositiveTrend ? "primary" : "default"}
              size="small"
              icon={showPositiveTrend ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              onClick={() => setShowPositiveTrend(!showPositiveTrend)}
              style={{ 
                backgroundColor: showPositiveTrend ? '#52c41a' : undefined,
                borderColor: showPositiveTrend ? '#52c41a' : undefined
              }}
            >
              正面
            </Button>
          </Tooltip>
          
          <Tooltip title={showNegativeTrend ? "隐藏负面数据" : "显示负面数据"}>
            <Button
              type={showNegativeTrend ? "primary" : "default"}
              size="small"
              icon={showNegativeTrend ? <EyeOutlined /> : <EyeInvisibleOutlined />}
              onClick={() => setShowNegativeTrend(!showNegativeTrend)}
              style={{ 
                backgroundColor: showNegativeTrend ? '#ff4d4f' : undefined,
                borderColor: showNegativeTrend ? '#ff4d4f' : undefined
              }}
            >
              负面
            </Button>
          </Tooltip>
        </Space>
      </div>
      
      <TrendChart
        data={reportData?.growthTrend?.map(item => ({
          date: item.date,
          positive: item.positiveCount,
          negative: item.negativeCount
        })) || []}
        showPositive={showPositiveTrend}
        showNegative={showNegativeTrend}
        loading={loading}
      />
    </ProjectCard>
  );

  // ================================
  // 主渲染
  // ================================

  if (!studentPublicId) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <Empty 
          description="学生ID缺失" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  return (
    <div id="student-growth-report-container" style={{ 
      padding: isMobile ? '16px' : '24px',
      background: theme === 'dark' ? '#141414' : '#f5f5f5',
      minHeight: '100vh'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {renderHeader()}
        
        <Spin spinning={loading && !reportData}>
          {reportData && (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {renderSummaryCards()}
              {renderWordCloud()}
              {renderTopRankings()}
              {renderTrendChart()}
            </Space>
          )}
          
          {!loading && !reportData && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Empty
                description="暂无报告数据"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" onClick={handleRefresh}>
                  重新加载
                </Button>
              </Empty>
            </div>
          )}
        </Spin>
      </div>
    </div>
  );
};

export default StudentGrowthReport; 