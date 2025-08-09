import React from 'react';
import { Row, Col, Statistic, Space } from 'antd';
import { 
  TeamOutlined, 
  BookOutlined, 
  FileTextOutlined, 
  ClockCircleOutlined 
} from '@ant-design/icons';
import ProjectCard from '@/components/ui/ProjectCard';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

interface OverviewStatsData {
  totalStudents: number;
  totalClasses: number;
  activeExams: number;
  pendingFollowUps: number;
}

interface OverviewStatsCardProps {
  data?: OverviewStatsData;
  loading?: boolean;
}

const OverviewStatsCard: React.FC<OverviewStatsCardProps> = ({
  data,
  loading = false
}) => {
  if (loading) {
    return (
      <ProjectCard title="机构概览" style={{ minHeight: '160px' }}>
        <SkeletonLoader variant="card" />
      </ProjectCard>
    );
  }

  const stats = [
    {
      title: '总学生数',
      value: data?.totalStudents || 0,
      icon: <TeamOutlined style={{ color: '#1890ff' }} />,
      suffix: '人'
    },
    {
      title: '班级数量',
      value: data?.totalClasses || 0,
      icon: <BookOutlined style={{ color: '#52c41a' }} />,
      suffix: '个'
    },
    {
      title: '本月考试',
      value: data?.activeExams || 0,
      icon: <FileTextOutlined style={{ color: '#fa8c16' }} />,
      suffix: '场'
    },
    {
      title: '待跟进',
      value: data?.pendingFollowUps || 0,
      icon: <ClockCircleOutlined style={{ color: '#f5222d' }} />,
      suffix: '位'
    }
  ];

  return (
    <ProjectCard 
      title="机构概览" 
      style={{ height: '100%' }}
    >
      <Row gutter={[16, 16]} style={{ height: '100%', alignItems: 'stretch' }}>
        {stats.map((stat, index) => (
          <Col xs={12} sm={6} key={index}>
            <div style={{ 
              textAlign: 'center',
              padding: '16px 8px',
              background: 'var(--ant-color-fill-alter)',
              borderRadius: '8px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ fontSize: '24px' }}>
                  {stat.icon}
                </div>
                <Statistic
                  title={stat.title}
                  value={stat.value}
                  suffix={stat.suffix}
                  valueStyle={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold',
                    color: 'var(--ant-color-text)'
                  }}
                />
              </Space>
            </div>
          </Col>
        ))}
      </Row>
    </ProjectCard>
  );
};

export default OverviewStatsCard; 