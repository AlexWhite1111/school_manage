// Use AntD Card directly instead of custom UnifiedCard
import React, { useEffect, useMemo, useState } from 'react';
import { Col, Row, Statistic, Alert, Spin, Table, Tag, Space, Typography, Card } from 'antd';
import { UnifiedCardPresets } from '@/theme/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { useResponsive } from '@/hooks/useResponsive';
import { getFinanceAnalyticsSummary } from '@/api/analyticsApi';
import type { AnalyticsTimeRangeParams, FinanceAnalyticsSummary } from '@/types/api';

const { Text } = Typography;

interface FinanceAnalyticsTabProps {
  timeParams: AnalyticsTimeRangeParams;
  refreshKey: number;
}

const FinanceAnalyticsTab: React.FC<FinanceAnalyticsTabProps> = ({ timeParams, refreshKey }) => {
  const { isMobile } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FinanceAnalyticsSummary | null>(null);

  const loadData = async () => {
    if (!timeParams) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getFinanceAnalyticsSummary({ startDate: timeParams.startDate, endDate: timeParams.endDate });
      setData(result);
    } catch (err) {
      setError('财务分析数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeParams, refreshKey]);

  const revenueChartData = useMemo(() => data?.revenueTrend ?? [], [data]);
  const dueChartData = useMemo(() => data?.dueTrend ?? [], [data]);

  if (!timeParams) {
    return (
      <Alert message="请选择时间范围" type="info" showIcon />
    );
  }

  if (error) {
    return (
      <Alert message="数据加载失败" description={error} type="error" showIcon />
    );
  }

  return (
    <Spin spinning={loading}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 关键指标 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic title="总实收" value={data?.keyMetrics.totalReceived ?? 0} precision={2} prefix="¥" />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic title="总应收" value={data?.keyMetrics.totalDue ?? 0} precision={2} prefix="¥" />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic title="总欠款" value={data?.keyMetrics.totalOutstanding ?? 0} precision={2} prefix="¥" valueStyle={{ color: 'var(--ant-color-error)' }} />
            </Card>
          </Col>
        </Row>

        {/* 收入与应收趋势 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card size="small" title="收入趋势">
              <div style={{ height: isMobile ? 260 : 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="4 5" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip formatter={(value: any) => [`¥${Number(value).toFixed(2)}`, '实收']} />
                    <Legend />
                    <Line type="monotone" dataKey="amount" name="实收" stroke="var(--ant-color-success)" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card size="small" title="应收趋势">
              <div style={{ height: isMobile ? 260 : 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dueChartData}>
                    <CartesianGrid strokeDasharray="4 5" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip formatter={(value: any) => [`¥${Number(value).toFixed(2)}`, '应收']} />
                    <Legend />
                    <Bar dataKey="amount" name="应收" fill="var(--ant-color-primary)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 欠款分布与Top欠款学生 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={10}>
            <Card size="small" title="欠款状态分布">
              <Table
                size="small"
                pagination={false}
                dataSource={data?.outstandingByStatus.map((s, idx) => ({ key: idx, ...s })) ?? []}
                columns={[
                  { title: '状态', dataIndex: 'status', key: 'status', render: (v) => {
                    const map: any = {
                      PAID_FULL: { color: 'green', text: '已付清' },
                      PARTIAL_PAID: { color: 'orange', text: '部分付款' },
                      UNPAID: { color: 'red', text: '未付款' },
                    };
                    const m = map[v] || { color: 'default', text: v };
                    return <Tag color={m.color}>{m.text}</Tag>;
                  } },
                  { title: '数量', dataIndex: 'count', key: 'count' },
                ]}
              />
            </Card>
          </Col>
          <Col xs={24} md={14}>
            <Card size="small" title="Top 欠款学生">
              <Table
                size="small"
                pagination={{ pageSize: 5 }}
                dataSource={data?.topDebtors.map((s, idx) => ({ key: idx, ...s })) ?? []}
                columns={[
                  { title: '学生', dataIndex: 'studentName', key: 'studentName' },
                  { title: '欠款金额', dataIndex: 'totalOwed', key: 'totalOwed', render: (v) => `¥${Number(v).toFixed(2)}` },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </Space>
    </Spin>
  );
};

export default FinanceAnalyticsTab;

