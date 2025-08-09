import React from 'react';
import { Row, Col, Statistic, List, Typography, Space, Progress } from 'antd';
import { 
  FileTextOutlined, 
  TrophyOutlined, 
  RiseOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import ProjectCard from '@/components/ui/ProjectCard';
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
  if (loading) {
    return (
      <ProjectCard title="考试统计" style={{ minHeight: '300px' }}>
        <SkeletonLoader variant="card" />
      </ProjectCard>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return '#52c41a';
    if (score >= 70) return '#fa8c16';
    return '#ff4d4f';
  };

  return (
    <ProjectCard 
      title={
        <Space align="center">
          <FileTextOutlined style={{ color: 'var(--ant-color-primary)' }} />
          <Title level={4} style={{ margin: 0 }}>考试统计</Title>
        </Space>
      }
      style={{ height: '100%' }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 考试概览 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Statistic
              title="最近考试"
              value={data?.recentExams || 0}
              prefix={<RiseOutlined />}
              suffix="场"
              valueStyle={{ color: 'var(--ant-color-primary)' }}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic
              title="即将考试"
              value={data?.upcomingExams || 0}
              prefix={<ClockCircleOutlined />}
              suffix="场"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic
              title="平均分"
              value={data?.averageScore || 0}
              prefix={<TrophyOutlined />}
              precision={1}
              valueStyle={{ color: getScoreColor(data?.averageScore || 0) }}
            />
          </Col>
        </Row>

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
                        background: index < 3 ? '#fa8c16' : 'var(--ant-color-fill)',
                        color: index < 3 ? '#fff' : 'var(--ant-color-text-secondary)',
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
    </ProjectCard>
  );
};

export default ExamStatsCard; 