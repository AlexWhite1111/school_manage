import React from 'react';
import { Row, Col, Statistic, Progress, Space, Typography } from 'antd';
import { 
  CalendarOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import ProjectCard from '@/components/ui/ProjectCard';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

const { Text, Title } = Typography;

interface AttendanceStatsData {
  todayAttendanceRate: number;
  weeklyAttendanceRate: number;
  totalPresentToday: number;
  totalAbsentToday: number;
}

interface AttendanceStatsCardProps {
  data?: AttendanceStatsData;
  loading?: boolean;
}

const AttendanceStatsCard: React.FC<AttendanceStatsCardProps> = ({
  data,
  loading = false
}) => {
  if (loading) {
    return (
      <ProjectCard title="考勤统计" style={{ minHeight: '200px' }}>
        <SkeletonLoader variant="card" />
      </ProjectCard>
    );
  }

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return '#52c41a';
    if (rate >= 70) return '#fa8c16';
    return '#ff4d4f';
  };

  return (
    <ProjectCard 
      title={
        <Space align="center">
          <CalendarOutlined style={{ color: 'var(--ant-color-primary)' }} />
          <Title level={4} style={{ margin: 0 }}>考勤统计</Title>
        </Space>
      }
      style={{ height: '100%' }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 出勤率指标 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <div style={{ 
              textAlign: 'center',
              padding: '16px',
              background: 'var(--ant-color-fill-alter)',
              borderRadius: '8px'
            }}>
              <Progress
                type="circle"
                percent={data?.todayAttendanceRate || 0}
                size={80}
                strokeColor={getAttendanceColor(data?.todayAttendanceRate || 0)}
                format={(percent) => (
                  <Text style={{ fontSize: '14px', fontWeight: 'bold' }}>
                    {percent}%
                  </Text>
                )}
              />
              <div style={{ marginTop: '8px' }}>
                <Text strong style={{ fontSize: '12px' }}>今日出勤率</Text>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div style={{ 
              textAlign: 'center',
              padding: '16px',
              background: 'var(--ant-color-fill-alter)',
              borderRadius: '8px'
            }}>
              <Progress
                type="circle"
                percent={data?.weeklyAttendanceRate || 0}
                size={80}
                strokeColor={getAttendanceColor(data?.weeklyAttendanceRate || 0)}
                format={(percent) => (
                  <Text style={{ fontSize: '14px', fontWeight: 'bold' }}>
                    {percent}%
                  </Text>
                )}
              />
              <div style={{ marginTop: '8px' }}>
                <Text strong style={{ fontSize: '12px' }}>本周出勤率</Text>
              </div>
            </div>
          </Col>
        </Row>

        {/* 今日详细统计 */}
        <div>
          <Text strong style={{ fontSize: '14px', marginBottom: '12px', display: 'block' }}>
            <BarChartOutlined style={{ marginRight: '6px' }} />
            今日考勤详情
          </Text>
          <Row gutter={[16, 8]}>
            <Col xs={12}>
              <Statistic
                title="出勤人数"
                value={data?.totalPresentToday || 0}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                suffix="人"
                valueStyle={{ fontSize: '16px', color: '#52c41a' }}
              />
            </Col>
            <Col xs={12}>
              <Statistic
                title="缺勤人数"
                value={data?.totalAbsentToday || 0}
                prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                suffix="人"
                valueStyle={{ fontSize: '16px', color: '#ff4d4f' }}
              />
            </Col>
          </Row>
        </div>
      </Space>
    </ProjectCard>
  );
};

export default AttendanceStatsCard; 