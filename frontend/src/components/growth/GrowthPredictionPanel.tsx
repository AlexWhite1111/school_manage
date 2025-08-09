import React, { useState, useEffect } from 'react';
import {
  Space,
  Button,
  DatePicker,
  Select,
  Row,
  Col,
  Statistic,
  Typography,
  message,
  Card,
  List,
  Tag,
  Tooltip,
  Alert
} from 'antd';
import {
  ThunderboltOutlined,
  LineChartOutlined,
  CalendarOutlined,
  RiseOutlined,
  FallOutlined,
  MinusOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

import ProjectCard from '@/components/ui/ProjectCard';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { GrowthApi } from '@/api/growthApi';
import type { GrowthTag } from '@/api/growthApi';

// Recharts components
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// ================================
// 类型定义
// ================================

interface PredictionData {
  date: string;
  predictedLevel: number;
  predictedTrend: number;
  confidenceInterval: {
    upper: number;
    lower: number;
  };
}

interface GrowthPredictionPanelProps {
  enrollmentId: number;
}

// ================================
// 主组件
// ================================

const GrowthPredictionPanel: React.FC<GrowthPredictionPanelProps> = ({ 
  enrollmentId 
}) => {
  const [loading, setLoading] = useState(false);
  const [availableTags, setAvailableTags] = useState<GrowthTag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<number | undefined>(undefined);
  const [targetDate, setTargetDate] = useState<dayjs.Dayjs>(dayjs().add(7, 'days'));
  const [predictionData, setPredictionData] = useState<PredictionData | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<PredictionData[]>([]);

  // 获取可用标签
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await GrowthApi.getGrowthTags({ isActive: true });
        setAvailableTags(tags);
        if (tags.length > 0) {
          setSelectedTagId(tags[0].id);
        }
      } catch (error) {
        console.error('获取标签失败:', error);
        message.error('获取标签失败');
      }
    };
    fetchTags();
  }, []);

  // 执行预测
  const handlePredict = async () => {
    if (!selectedTagId) {
      message.warning('请选择要预测的标签');
      return;
    }

    setLoading(true);
    try {
      // 调用预测API - 这里需要后端实现相应的API
      const response = await fetch(`/api/growth/kalman/predict/${enrollmentId}/${selectedTagId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetDate: targetDate.toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('预测请求失败');
      }

      const result = await response.json();
      
      if (result.success) {
        setPredictionData(result.data);
        
        // 生成时间序列预测数据
        await generateTimeSeriesPrediction();
        
        message.success('预测完成');
      } else {
        throw new Error(result.error?.message || '预测失败');
      }
    } catch (error) {
      console.error('预测失败:', error);
      message.error('预测失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 生成时间序列预测
  const generateTimeSeriesPrediction = async () => {
    if (!selectedTagId) return;

    try {
      const startDate = dayjs();
      const endDate = targetDate;
      const dataPoints = Math.min(Math.ceil(endDate.diff(startDate, 'days')), 30);

      // 调用时间序列预测API
      const response = await fetch(`/api/growth/kalman/predict-series/${enrollmentId}/${selectedTagId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          dataPoints: dataPoints
        })
      });

      if (!response.ok) {
        throw new Error('时间序列预测API请求失败');
      }

      const result = await response.json();
      if (result.success) {
        setTimeSeriesData(result.data);
      } else {
        throw new Error(result.error?.message || '时间序列预测失败');
      }
    } catch (error) {
      console.error('生成时间序列预测失败:', error);
      message.error('时间序列预测功能暂时不可用');
      setTimeSeriesData([]);
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0.05) {
      return <RiseOutlined style={{ color: '#52c41a' }} />;
    } else if (trend < -0.05) {
      return <FallOutlined style={{ color: '#ff4d4f' }} />;
    } else {
      return <MinusOutlined style={{ color: '#fa8c16' }} />;
    }
  };

  const getTrendDescription = (trend: number) => {
    if (trend > 0.05) {
      return '预测呈上升趋势';
    } else if (trend < -0.05) {
      return '预测呈下降趋势';
    } else {
      return '预测保持稳定';
    }
  };

  return (
    <ProjectCard 
      title={
        <Space>
          <ThunderboltOutlined />
          <Title level={4} style={{ margin: 0 }}>成长预测分析</Title>
        </Space>
      }
      style={{ marginBottom: '24px' }}
    >
      <Alert
        message="预测功能说明"
        description="基于卡尔曼滤波器算法，对学生未来的成长趋势进行科学预测。预测结果仅供参考，实际表现可能受多种因素影响。"
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      {/* 预测参数设置 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={8}>
          <div style={{ marginBottom: '8px' }}>
            <Text strong>选择标签</Text>
          </div>
          <Select
            value={selectedTagId}
            onChange={setSelectedTagId}
            style={{ width: '100%' }}
            placeholder="选择要预测的标签"
          >
            {availableTags.map(tag => (
              <Option key={tag.id} value={tag.id}>
                <Space>
                  <Tag color={tag.sentiment === 'POSITIVE' ? 'green' : 'red'}>
                    {tag.sentiment === 'POSITIVE' ? '正面' : '负面'}
                  </Tag>
                  {tag.text}
                </Space>
              </Option>
            ))}
          </Select>
        </Col>

        <Col xs={24} sm={8}>
          <div style={{ marginBottom: '8px' }}>
            <Text strong>预测目标日期</Text>
          </div>
          <DatePicker
            value={targetDate}
            onChange={(date) => date && setTargetDate(date)}
            style={{ width: '100%' }}
            disabledDate={(current) => current && current.isBefore(dayjs().add(1, 'day'))}
            placeholder="选择预测日期"
          />
        </Col>

        <Col xs={24} sm={8}>
          <div style={{ marginBottom: '8px' }}>
            <Text strong>执行预测</Text>
          </div>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={handlePredict}
            loading={loading}
            style={{ width: '100%' }}
            disabled={!selectedTagId}
          >
            开始预测
          </Button>
        </Col>
      </Row>

      {/* 预测结果 */}
      {predictionData && (
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="预测水平"
                value={predictionData.predictedLevel.toFixed(2)}
                precision={2}
                valueStyle={{ fontSize: '20px', color: '#1677ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="预测趋势"
                value={predictionData.predictedTrend.toFixed(3)}
                precision={3}
                prefix={getTrendIcon(predictionData.predictedTrend)}
                valueStyle={{ 
                  fontSize: '20px',
                  color: predictionData.predictedTrend > 0 ? '#52c41a' : '#ff4d4f'
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ display: 'block', marginBottom: '8px' }}>
                  置信区间
                </Text>
                <Text strong style={{ fontSize: '16px' }}>
                  [{predictionData.confidenceInterval.lower.toFixed(2)}, {predictionData.confidenceInterval.upper.toFixed(2)}]
                </Text>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* 预测趋势图表 */}
      {timeSeriesData.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <Title level={5} style={{ marginBottom: '16px' }}>
            <LineChartOutlined /> 预测趋势图表
          </Title>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => dayjs(value).format('MM-DD')}
                />
                <YAxis />
                <RechartsTooltip 
                  labelFormatter={(value) => `日期: ${dayjs(value).format('YYYY-MM-DD')}`}
                  formatter={(value: any, name: string) => {
                    if (name === 'predictedLevel') return [value.toFixed(2), '预测水平'];
                    if (name === 'predictedTrend') return [value.toFixed(3), '预测趋势'];
                    return [value, name];
                  }}
                />
                <Legend />
                
                {/* 置信区间 */}
                <Area
                  type="monotone"
                  dataKey="confidenceInterval.upper"
                  stackId="confidence"
                  stroke="none"
                  fill="#1677ff"
                  fillOpacity={0.1}
                  name="置信区间上界"
                />
                <Area
                  type="monotone"
                  dataKey="confidenceInterval.lower"
                  stackId="confidence"
                  stroke="none"
                  fill="#ffffff"
                  fillOpacity={1}
                  name="置信区间下界"
                />
                
                {/* 预测线 */}
                <Line
                  type="monotone"
                  dataKey="predictedLevel"
                  stroke="#1677ff"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="预测水平"
                />
                <Line
                  type="monotone"
                  dataKey="predictedTrend"
                  stroke="#52c41a"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 2 }}
                  name="预测趋势"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 预测分析总结 */}
      {predictionData && (
        <Card size="small" title="预测分析总结">
          <List size="small">
            <List.Item>
              <Space>
                <InfoCircleOutlined style={{ color: '#1677ff' }} />
                <Text>
                  预测到 {targetDate.format('YYYY年MM月DD日')}，该标签的成长水平将达到 
                  <Text strong> {predictionData.predictedLevel.toFixed(2)}</Text>
                </Text>
              </Space>
            </List.Item>
            <List.Item>
              <Space>
                {getTrendIcon(predictionData.predictedTrend)}
                <Text>
                  {getTrendDescription(predictionData.predictedTrend)}，趋势值为 
                  <Text strong> {predictionData.predictedTrend.toFixed(3)}</Text>
                </Text>
              </Space>
            </List.Item>
            <List.Item>
              <Space>
                <InfoCircleOutlined style={{ color: '#fa8c16' }} />
                <Text>
                  预测置信区间为 [{predictionData.confidenceInterval.lower.toFixed(2)}, {predictionData.confidenceInterval.upper.toFixed(2)}]，
                  区间宽度反映了预测的不确定性
                </Text>
              </Space>
            </List.Item>
          </List>
        </Card>
      )}

      {/* 空状态 */}
      {!predictionData && !loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <CalendarOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
          <div>选择标签和日期，点击"开始预测"查看成长趋势预测</div>
        </div>
      )}
    </ProjectCard>
  );
};

export default GrowthPredictionPanel; 