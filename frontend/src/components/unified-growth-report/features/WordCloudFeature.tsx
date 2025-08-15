import React, { useMemo } from 'react';
import { Space, Typography, Tag, Row, Col, Empty, Divider, Card } from 'antd';
import { UnifiedCardPresets } from '@/theme/card';
import {
  CloudOutlined,
  SmileOutlined,
  FrownOutlined,
  FireOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import IntelligentWordCloud from '@/components/advanced/IntelligentWordCloud';
import type { GrowthSummary } from '@/api/growthApi';
import type { UnifiedReportConfig } from '@/types/unifiedGrowthReport';
import { useResponsive } from '@/hooks/useResponsive';
import { theme } from 'antd';

const { Title, Text } = Typography;

interface WordCloudFeatureProps {
  data: GrowthSummary | null;
  viewMode?: UnifiedReportConfig['viewMode'];
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

interface WordCloudItem {
  text: string;
  value: number;
  sentiment: 'POSITIVE' | 'NEGATIVE';
  frequency: number;
}

/**
 * 词云功能组件
 * 从原页面的词云功能整合而来
 */
const WordCloudFeature: React.FC<WordCloudFeatureProps> = ({
  data,
  viewMode = 'detailed',
  loading = false,
  className,
  style
}) => {
  const { isMobile } = useResponsive();
  const preset = UnifiedCardPresets.mobileCompact(isMobile);
  const { token } = theme.useToken();

  // 将成长状态转换为词云数据
  const wordCloudData = useMemo(() => {
    if (!data?.states) return [];

    return data.states.map(state => ({
      text: state.tagName,
      value: Math.round(state.level * 10), // 将level转换为0-100的值
      sentiment: state.sentiment,
      frequency: state.totalObservations
    })).sort((a, b) => b.value - a.value); // 按值排序
  }, [data?.states]);

  // 分离正面和负面标签
  const { positiveWords, negativeWords, topWords } = useMemo(() => {
    const positive = wordCloudData.filter(item => item.sentiment === 'POSITIVE');
    const negative = wordCloudData.filter(item => item.sentiment === 'NEGATIVE');
    const top = wordCloudData.slice(0, 10); // 取前10个最重要的标签

    return {
      positiveWords: positive,
      negativeWords: negative,
      topWords: top
    };
  }, [wordCloudData]);

  // 获取字体大小（基于值）
  const getFontSize = (value: number, maxValue: number) => {
    const minSize = 12;
    const maxSize = 32;
    const normalizedValue = maxValue > 0 ? value / maxValue : 0;
    return Math.max(minSize, Math.min(maxSize, minSize + (maxSize - minSize) * normalizedValue));
  };

  // 获取标签颜色
  const getTagColor = (sentiment: string, value: number) => {
    return sentiment === 'POSITIVE' ? 'var(--ant-color-success)' : 'var(--ant-color-error)';
  };

  if (loading) {
    return (
      <Card 
        className={className} 
        style={{ ...preset.style, ...style }}
        styles={preset.styles}
        title="标签词云"
        loading={true}
      >
        <div style={{ height: '300px' }} />
      </Card>
    );
  }

  if (!data || wordCloudData.length === 0) {
    return (
      <Card 
        className={className} 
        style={{ ...preset.style, ...style }}
        styles={preset.styles}
        title={
          <Space>
            <CloudOutlined />
            <span>标签词云</span>
          </Space>
        }
      >
        <Empty 
          description="暂无标签数据"
          style={{ padding: 'var(--space-8) 0' }}
        />
      </Card>
    );
  }

  const maxValue = Math.max(...wordCloudData.map(item => item.value));

  // 紧凑模式
  if (viewMode === 'compact') {
    return (
      <Card 
        className={className} 
        style={{ ...preset.style, ...style }}
        styles={preset.styles}
        title={
          <Space>
            <CloudOutlined />
            <span>成长标签</span>
            <Tag color="blue">{wordCloudData.length}</Tag>
          </Space>
        }
        size="small"
      >
        <div style={{ 
          textAlign: 'center', 
          padding: 'var(--space-5)',
          lineHeight: '2.5'
        }}>
          {topWords.map((item, index) => (
            <Tag
              key={index}
              color={getTagColor(item.sentiment, item.value)}
              style={{
                fontSize: `${getFontSize(item.value, maxValue) * 0.8}px`,
                margin: 'var(--space-1)',
                padding: 'var(--space-1) var(--space-2)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              {item.text}
            </Tag>
          ))}
        </div>
      </Card>
    );
  }

  // 专业模式
  if (viewMode === 'professional') {
    return (
      <Card 
        className={className} 
        style={{ ...preset.style, ...style }}
        styles={preset.styles}
        title={
          <Space>
            <ThunderboltOutlined />
            <span>关键标签分析</span>
          </Space>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card size="small" style={{ ...preset.style }} styles={preset.styles} title={
                <Space>
                  <SmileOutlined style={{ color: 'var(--ant-color-success)' }} />
                  <span>优势标签</span>
                </Space>
              }>
                <Space wrap>
                  {positiveWords.slice(0, 5).map((item, index) => (
                    <Tag
                      key={index}
                      color="green"
                      style={{ marginBottom: 'var(--space-1)' }}
                    >
                      {item.text} ({item.value})
                    </Tag>
                  ))}
                </Space>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" style={{ ...preset.style }} styles={preset.styles} title={
                <Space>
                  <FrownOutlined style={{ color: 'var(--ant-color-error)' }} />
                  <span>关注标签</span>
                </Space>
              }>
                <Space wrap>
                  {negativeWords.slice(0, 5).map((item, index) => (
                    <Tag
                      key={index}
                      color="red"
                      style={{ marginBottom: 'var(--space-1)' }}
                    >
                      {item.text} ({item.value})
                    </Tag>
                  ))}
                </Space>
              </Card>
            </Col>
          </Row>
        </Space>
      </Card>
    );
  }

  // 详细模式（默认）
  return (
    <Card 
      className={className} 
      style={{ ...preset.style, ...style, boxShadow: 'none', border: 'none', background: 'transparent' }}
      styles={{ body: { padding: 0 } }}
      title={null}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 主词云区域 */}
        <IntelligentWordCloud
          data={wordCloudData.map(item => ({
            text: item.text,
            value: item.value,
            type: item.sentiment === 'POSITIVE' ? 'positive' : 'negative'
          }))}
          loading={loading}
          height={280}
          maxWords={60}
          enableAnimation={true}
          enableTooltip={true}
          colorScheme="semantic"
          allowExport={true}
          exportName="growth-wordcloud"
        />

        <Divider />

        {/* 分类展示 */}
        <Row gutter={[24, 16]}>
          <Col xs={24} md={12}>
            <Card 
              size="small" 
              title={
                <Space>
                  <SmileOutlined style={{ color: 'var(--ant-color-success)' }} />
                  <span>正面表现</span>
                  <Tag color="green">{positiveWords.length}</Tag>
                </Space>
              }
              styles={{ body: { minHeight: '120px' } }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {positiveWords.map((item, index) => (
                  <Tag
                    key={index}
                    color="green"
                    style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      marginBottom: 'var(--space-1)'
                    }}
                    title={`观察次数: ${item.frequency}`}
                  >
                    {item.text}
                    <span style={{ 
                      marginLeft: 'var(--space-1)',
                      fontSize: '10px',
                      opacity: 0.8
                    }}>
                      {item.value}
                    </span>
                  </Tag>
                ))}
              </div>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card 
              size="small" 
              title={
                <Space>
                  <FrownOutlined style={{ color: 'var(--ant-color-error)' }} />
                  <span>需要关注</span>
                  <Tag color="red">{negativeWords.length}</Tag>
                </Space>
              }
              styles={{ body: { minHeight: '120px' } }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {negativeWords.map((item, index) => (
                  <Tag
                    key={index}
                    color="red"
                    style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      marginBottom: 'var(--space-1)'
                    }}
                    title={`观察次数: ${item.frequency}`}
                  >
                    {item.text}
                    <span style={{ 
                      marginLeft: 'var(--space-1)',
                      fontSize: '10px',
                      opacity: 0.8
                    }}>
                      {item.value}
                    </span>
                  </Tag>
                ))}
              </div>
            </Card>
          </Col>
        </Row>

        {/* 热力指标 */}
        <Card size="small" style={{ background: 'var(--ant-color-fill-alter)' }}>
          <Row gutter={[16, 8]} align="middle">
            <Col flex="auto">
              <Space>
                <FireOutlined style={{ color: 'var(--ant-color-warning)' }} />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  热力指标: 最高 {maxValue} 分，
                  正面标签 {positiveWords.length} 个，
                  关注标签 {negativeWords.length} 个
                </Text>
              </Space>
            </Col>
          </Row>
        </Card>
      </Space>
    </Card>
  );
};

export default WordCloudFeature;