import React from 'react';
import { Row, Col, Statistic, Progress, Space, Typography, Card } from 'antd';
import { UnifiedCardPresets } from '@/theme/card';
import { useResponsive } from '@/hooks/useResponsive';
import { 
  CalendarOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  BarChartOutlined
} from '@ant-design/icons';

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
  const { isMobile } = useResponsive();
  if (loading) {
  const preset = UnifiedCardPresets.desktopDefault(isMobile);
  return (
    <Card title="考勤统计" style={{ minHeight: '200px', ...preset.style }} styles={preset.styles}>
        <SkeletonLoader variant="card" />
      </Card>
    );
  }

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return 'var(--ant-color-success)';
    if (rate >= 70) return 'var(--ant-color-warning)';
    return 'var(--ant-color-error)';
  };

  const preset = UnifiedCardPresets.desktopDefault(isMobile);
  return (
    <Card 
      title={
        <Space align="center">
          <CalendarOutlined style={{ color: 'var(--ant-color-primary)' }} />
          <Title level={4} style={{ margin: 0 }}>考勤统计</Title>
        </Space>
      }
      style={{ height: '100%', ...preset.style }}
      styles={preset.styles}
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {isMobile ? (
          <div className="metric-row">
            <span className="metric-item" data-tone={((data?.todayAttendanceRate ?? 0) >= 90) ? 'success' : ((data?.todayAttendanceRate ?? 0) >= 70) ? 'warning' : 'error'}>
              <span className="metric-number">{(data?.todayAttendanceRate ?? 0)}%</span>
              <span>今日</span>
            </span>
            <span className="metric-sep">|</span>
            <span className="metric-item" data-tone={((data?.weeklyAttendanceRate ?? 0) >= 90) ? 'success' : ((data?.weeklyAttendanceRate ?? 0) >= 70) ? 'warning' : 'error'}>
              <span className="metric-number">{(data?.weeklyAttendanceRate ?? 0)}%</span>
              <span>本周</span>
            </span>
            <span className="metric-sep">|</span>
            <span className="metric-item" data-tone="success">
              <span className="metric-number">{data?.totalPresentToday ?? 0}</span>
              <span>出勤</span>
            </span>
            <span className="metric-sep">|</span>
            <span className="metric-item" data-tone="error">
              <span className="metric-number">{data?.totalAbsentToday ?? 0}</span>
              <span>缺勤</span>
            </span>
          </div>
        ) : (
          <>
            {/* 出勤率指标（桌面） */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <div style={{ textAlign: 'center', padding: '16px', background: 'var(--ant-color-fill-alter)', borderRadius: '8px' }}>
                  <Progress type="circle" percent={data?.todayAttendanceRate || 0} size={80} strokeColor={getAttendanceColor(data?.todayAttendanceRate || 0)} />
                  <div style={{ marginTop: '8px' }}><Text strong style={{ fontSize: '12px' }}>今日出勤率</Text></div>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div style={{ textAlign: 'center', padding: '16px', background: 'var(--ant-color-fill-alter)', borderRadius: '8px' }}>
                  <Progress type="circle" percent={data?.weeklyAttendanceRate || 0} size={80} strokeColor={getAttendanceColor(data?.weeklyAttendanceRate || 0)} />
                  <div style={{ marginTop: '8px' }}><Text strong style={{ fontSize: '12px' }}>本周出勤率</Text></div>
                </div>
              </Col>
            </Row>

            {/* 今日详细统计（桌面） */}
            <div>
              <Text strong style={{ fontSize: '14px', marginBottom: '12px', display: 'block' }}>
                <BarChartOutlined style={{ marginRight: '6px' }} />
                今日考勤详情
              </Text>
              <Row gutter={[16, 8]}>
                <Col xs={12}>
                  <Statistic title="出勤人数" value={data?.totalPresentToday || 0} suffix="人" valueStyle={{ fontSize: '16px', color: 'var(--ant-color-success)' }} />
                </Col>
                <Col xs={12}>
                  <Statistic title="缺勤人数" value={data?.totalAbsentToday || 0} suffix="人" valueStyle={{ fontSize: '16px', color: 'var(--ant-color-error)' }} />
                </Col>
              </Row>
            </div>
          </>
        )}
      </Space>
    </Card>
  );
};

export default AttendanceStatsCard; 