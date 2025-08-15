import React from 'react';
import { Row, Col, Statistic, Space, Card } from 'antd';
import { UnifiedCardPresets } from '@/theme/card';
import { useResponsive } from '@/hooks/useResponsive';
import { 
  TeamOutlined, 
  BookOutlined, 
  FileTextOutlined, 
  ClockCircleOutlined 
} from '@ant-design/icons';

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
  const { isMobile } = useResponsive();
  if (loading) {
  const preset = UnifiedCardPresets.desktopDefault(isMobile);
  return (
    <Card title="机构概览" style={{ minHeight: '160px', ...preset.style }} styles={preset.styles}>
        <SkeletonLoader variant="card" />
      </Card>
    );
  }

  const stats = [
    {
      title: '总学生数',
      value: data?.totalStudents || 0,
      icon: <TeamOutlined style={{ color: 'var(--ant-color-primary)' }} />,
      suffix: '人'
    },
    {
      title: '班级数量',
      value: data?.totalClasses || 0,
      icon: <BookOutlined style={{ color: 'var(--ant-color-success)' }} />,
      suffix: '个'
    },
    {
      title: '本月考试',
      value: data?.activeExams || 0,
      icon: <FileTextOutlined style={{ color: 'var(--ant-color-warning)' }} />,
      suffix: '场'
    },
    {
      title: '待跟进',
      value: data?.pendingFollowUps || 0,
      icon: <ClockCircleOutlined style={{ color: '#f5222d' }} />,
      suffix: '位'
    }
  ];

  const preset = UnifiedCardPresets.desktopDefault(isMobile);
  return (
    <Card 
      title="机构概览" 
      style={{ height: '100%', ...preset.style }}
      styles={preset.styles}
    >
      {isMobile ? (
        <div className="metric-row">
          <span className="metric-item"><span className="metric-number">{stats[0].value}</span><span>学生</span></span>
          <span className="metric-sep">|</span>
          <span className="metric-item"><span className="metric-number">{stats[1].value}</span><span>班级</span></span>
          <span className="metric-sep">|</span>
          <span className="metric-item"><span className="metric-number">{stats[2].value}</span><span>考试</span></span>
          <span className="metric-sep">|</span>
          <span className="metric-item"><span className="metric-number">{stats[3].value}</span><span>待跟进</span></span>
        </div>
      ) : (
        <Row gutter={[16, 16]} style={{ height: '100%', alignItems: 'stretch' }}>
          {stats.map((stat, index) => (
            <Col xs={12} sm={6} key={index}>
              <div style={{ textAlign: 'center', padding: '16px 8px', background: 'var(--ant-color-fill-alter)', borderRadius: '8px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <div style={{ fontSize: '24px' }}>{stat.icon}</div>
                  <Statistic title={stat.title} value={stat.value} suffix={stat.suffix} valueStyle={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--ant-color-text)' }} />
                </Space>
              </div>
            </Col>
          ))}
        </Row>
      )}
    </Card>
  );
};

export default OverviewStatsCard; 