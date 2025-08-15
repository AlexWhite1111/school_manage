import React from 'react';
import { Row, Col, Statistic, List, Typography, Space, Progress, Card } from 'antd';
import { UnifiedCardPresets } from '@/theme/card';
import { useResponsive } from '@/hooks/useResponsive';
import { 
  FileTextOutlined, 
  TrophyOutlined, 
  RiseOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';

import SkeletonLoader from '@/components/ui/SkeletonLoader';

const { Text, Title } = Typography;

interface ExamStatsData {
  recentExams: number;
  upcomingExams: number;
  averageScore: number;
  subjectPerformance: { subject: string; averageScore: number; examCount: number }[];
}

interface ExamStatsCardProps {
  data?: ExamStatsData;
  loading?: boolean;
}

const ExamStatsCard: React.FC<ExamStatsCardProps> = ({
  data,
  loading = false
}) => {
  const { isMobile } = useResponsive();
  if (loading) {
  const preset = UnifiedCardPresets.desktopDefault(isMobile);
  return (
    <Card title="考试统计" style={{ minHeight: '300px', ...preset.style }} styles={preset.styles}>
        <SkeletonLoader variant="card" />
      </Card>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'var(--ant-color-success)';
    if (score >= 70) return 'var(--ant-color-warning)';
    return 'var(--ant-color-error)';
  };

  const preset = UnifiedCardPresets.desktopDefault(isMobile);
  return (
    <Card 
      title={
        <Space align="center">
          <FileTextOutlined style={{ color: 'var(--ant-color-primary)' }} />
          <Title level={4} style={{ margin: 0 }}>考试统计</Title>
        </Space>
      }
      style={{ height: '100%', ...preset.style }}
      styles={preset.styles}
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {/* 考试概览 */}
        {isMobile ? (
          <div className="metric-row">
            <span className="metric-item" data-tone="primary">
              <span className="metric-number">{data?.recentExams ?? 0}</span>
              <span>最近</span>
            </span>
            <span className="metric-sep">|</span>
            <span className="metric-item" data-tone="warning">
              <span className="metric-number">{data?.upcomingExams ?? 0}</span>
              <span>即将</span>
            </span>
            <span className="metric-sep">|</span>
            <span className="metric-item" data-tone={((data?.averageScore ?? 0) >= 85) ? 'success' : ((data?.averageScore ?? 0) >= 70) ? 'warning' : 'error'}>
              <span className="metric-number">{(data?.averageScore ?? 0).toFixed(1)}</span>
              <span>平均</span>
            </span>
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Statistic title="最近考试" value={data?.recentExams || 0} suffix="场" valueStyle={{ color: 'var(--ant-color-primary)' }} />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic title="即将考试" value={data?.upcomingExams || 0} suffix="场" valueStyle={{ color: 'var(--ant-color-warning)' }} />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic title="平均分" value={data?.averageScore || 0} precision={1} valueStyle={{ color: getScoreColor(data?.averageScore || 0) }} />
            </Col>
          </Row>
        )}

        {/* 科目表现排行 */}
        <div>
          <Text strong style={{ fontSize: '14px', marginBottom: '12px', display: 'block' }}>
            科目表现排行
          </Text>
          {data?.subjectPerformance && data.subjectPerformance.length > 0 ? (
            <List
              size="small"
              dataSource={data.subjectPerformance}
              renderItem={(item, index) => (
                <List.Item style={{ padding: '8px 0' }}>
                  <Row style={{ width: '100%', alignItems: 'center' }}>
                    <Col span={2}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: index < 3 ? 'var(--ant-color-warning)' : 'var(--ant-color-fill)',
                        color: index < 3 ? 'var(--ant-color-bg-container)' : 'var(--ant-color-text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 'bold'
                      }}>
                        {index + 1}
                      </div>
                    </Col>
                    <Col span={8}>
                      <Text style={{ fontSize: '12px', fontWeight: '500' }}>
                        {item.subject}
                      </Text>
                    </Col>
                    <Col span={10}>
                      <Progress 
                        percent={(item.averageScore / 100) * 100} 
                        size="small" 
                        strokeColor={getScoreColor(item.averageScore)}
                        showInfo={false}
                      />
                    </Col>
                    <Col span={4} style={{ textAlign: 'right' }}>
                      <Text style={{ 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        color: getScoreColor(item.averageScore)
                      }}>
                        {item.averageScore}
                      </Text>
                    </Col>
                  </Row>
                </List.Item>
              )}
              style={{ maxHeight: '180px', overflow: 'auto' }}
            />
          ) : (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              暂无考试数据
            </Text>
          )}
        </div>
      </Space>
    </Card>
  );
};

export default ExamStatsCard; 