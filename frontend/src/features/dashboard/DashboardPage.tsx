import AppButton from '@/components/AppButton';
import React, { useState, useEffect } from 'react';
import { Typography, Row, Col, Space, message, Divider, Card } from 'antd';
import { UnifiedCardPresets } from '@/theme/card';
import { 
  ReloadOutlined, 
  TeamOutlined, 
  BookOutlined, 
  DownloadOutlined,
  DatabaseOutlined,
  UserOutlined,
  FileExcelOutlined,
  RocketOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useResponsive } from '@/hooks/useResponsive';
import FollowUpRemindersCard from '@/components/dashboard/FollowUpRemindersCard';
import OverviewStatsCard from '@/components/dashboard/OverviewStatsCard';
import CustomerStatsCard from '@/components/dashboard/CustomerStatsCard';
import AttendanceStatsCard from '@/components/dashboard/AttendanceStatsCard';
import ExamStatsCard from '@/components/dashboard/ExamStatsCard';
import GrowthActivityCard from '@/components/dashboard/GrowthActivityCard';
import { getDashboardSummary, refreshDashboardData, DashboardSummaryResponse } from '@/api/dashboardApi';
import { 
  exportCustomersCsv,
  exportGrowthLogsCsv,
  exportFinanceCsv,
  downloadFile as downloadBlob,
  generateTimestampedFilename
} from '@/api/export';
import type { FollowUpCustomer } from '@/components/dashboard/FollowUpRemindersCard';

const { Title, Text } = Typography;

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<Record<string, boolean>>({});

  // 加载仪表盘数据
  const loadDashboardData = async (isRefresh = false) => {
    try {
      setError(null);
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = isRefresh 
        ? await refreshDashboardData()
        : await getDashboardSummary();
      
      setDashboardData(data);
      
      if (isRefresh) {
        message.success('数据已刷新');
      }
    } catch (error: any) {
      console.error('加载仪表盘数据失败:', error);
      setError(error.message || '加载数据失败，请稍后重试');

      // 不再使用模拟数据，让用户看到真实的错误状态
      setDashboardData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 页面初始化
  useEffect(() => {
    loadDashboardData();
  }, []);

  // 客户点击处理 - 跳转到客户档案页面
  const handleCustomerClick = (customer: any) => {
    // 根据 DashboardWorkflow.md: 点击客户姓名会直接跳转至该客户的"客户档案(Lead Profile)"页面
    navigate(`/crm/${customer.publicId}`);
  };

  // 手动刷新数据
  const handleRefresh = () => {
    loadDashboardData(true);
  };

  // 快速导航处理
  const handleQuickNavigation = (path: string) => {
    navigate(path);
  };

  // 数据导出处理
  const handleExport = async (type: 'customers' | 'growth-logs' | 'finance') => {
    try {
      setExporting(prev => ({ ...prev, [type]: true }));
      
      let blob: Blob;
      let filename: string;
      
      switch (type) {
        case 'customers':
          blob = await exportCustomersCsv();
          filename = generateTimestampedFilename('客户信息');
          break;
        case 'growth-logs':
          blob = await exportGrowthLogsCsv();
          filename = generateTimestampedFilename('学生成长记录');
          break;
        case 'finance':
          blob = await exportFinanceCsv();
          filename = generateTimestampedFilename('财务数据');
          break;
        default:
          throw new Error('未知的导出类型');
      }
      
      downloadBlob(blob, filename);
      message.success('导出完成');
    } catch (error: any) {
      console.error(`导出${type}失败:`, error);
      message.error(error.message || '导出失败，请稍后重试');
    } finally {
      setExporting(prev => ({ ...prev, [type]: false }));
    }
  };

  // 转换数据格式以适配组件接口
  const followUpCustomers: FollowUpCustomer[] = dashboardData?.followUps || [];

  // 快速导航卡片配置
  const quickNavItems = [
    {
      title: '客户管理',
      description: '管理客户档案和跟进',
      icon: <TeamOutlined />,
      path: '/crm',
      color: 'var(--ant-color-primary)'
    },
    {
      title: '学生成长',
      description: '记录学生成长日志',
      icon: <BookOutlined />,
      path: '/student-log',
      color: 'var(--ant-color-success)'
    }
  ];

  // 数据导出卡片配置
  const exportItems = [
    {
      title: '客户信息',
      description: '导出客户档案数据',
      icon: <UserOutlined />,
      type: 'customers' as const,
      color: 'var(--ant-color-primary)'
    },
    {
      title: '成长记录',
      description: '导出学生成长日志',
      icon: <RocketOutlined />,
      type: 'growth-logs' as const,
      color: 'var(--ant-color-success)'
    },
    {
      title: '财务数据',
      description: '导出订单和收款记录',
      icon: <FileExcelOutlined />,
      type: 'finance' as const,
      color: 'var(--ant-color-warning)'
    }
  ];

  return (
    <div data-page-container>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题和刷新按钮 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={2} style={{ margin: 0, marginBottom: '8px' }}>
              核心仪表盘
            </Title>
            {/* 移除欢迎副标题以提升信息密度 */}
          </div>
          
          {/* 手动刷新按钮 */}
          <AppButton 
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={handleRefresh}
            style={{ flexShrink: 0 }}
          >
            刷新数据
          </AppButton>
        </div>

        {/* 错误提示 */}
        {error && !dashboardData && (
          <div style={{ 
            padding: '16px', 
            background: 'var(--ant-color-error-bg)', 
            border: '1px solid var(--ant-color-error-border)',
            borderRadius: '6px',
            color: 'var(--ant-color-error)'
          }}>
            <Text type="danger">
              {error}
            </Text>
            <AppButton 
              hierarchy="link" 
              size="sm" 
              onClick={() => loadDashboardData()}
              style={{ marginLeft: '8px', padding: 0, height: 'auto' }}
            >
              重试
            </AppButton>
          </div>
        )}

        {/* 核心概览统计 */}
        <OverviewStatsCard 
          data={dashboardData?.overview}
          loading={loading}
        />

        <Divider style={{ margin: '24px 0' }}>
          <DashboardOutlined style={{ marginRight: '8px' }} />
          核心业务数据
        </Divider>

        {/* 主要业务数据卡片 */}
      <Row gutter={isMobile ? [16, 16] : [24, 24]} style={{ marginBottom: 'var(--space-6)' }}>
          {/* 客户统计卡片 */}
          <Col xs={24} lg={12} style={{ display: 'flex' }}>
            <div style={{ width: '100%' }}>
              <CustomerStatsCard 
                data={dashboardData?.customerStats}
                loading={loading}
              />
            </div>
          </Col>
        </Row>

        {/* 考勤和考试统计 */}
      <Row gutter={isMobile ? [16, 16] : [24, 24]} style={{ marginBottom: 'var(--space-6)' }}>
          <Col xs={24} lg={12} style={{ display: 'flex' }}>
            <div style={{ width: '100%' }}>
              <AttendanceStatsCard 
                data={dashboardData?.attendance}
                loading={loading}
              />
            </div>
          </Col>

          <Col xs={24} lg={12} style={{ display: 'flex' }}>
            <div style={{ width: '100%' }}>
              <ExamStatsCard 
                data={dashboardData?.examStats}
                loading={loading}
              />
            </div>
          </Col>
        </Row>

        {/* 成长活动和待办提醒 */}
      <Row gutter={isMobile ? [16, 16] : [24, 24]} style={{ marginBottom: 'var(--space-6)' }}>
          <Col xs={24} lg={12} style={{ display: 'flex' }}>
            <div style={{ width: '100%' }}>
              <GrowthActivityCard 
                data={dashboardData?.growthActivity}
                loading={loading}
              />
            </div>
          </Col>

          <Col xs={24} lg={12} style={{ display: 'flex' }}>
            <div style={{ width: '100%' }}>
              <FollowUpRemindersCard 
                customers={followUpCustomers}
                loading={loading}
                onCustomerClick={handleCustomerClick}
              />
            </div>
          </Col>
        </Row>

        {/* 快速导航已移除，保留核心业务模块 */}

        {/* 数据导出中心 */}
        <div>
          <Title level={3} style={{ marginBottom: '16px' }}>
            <DatabaseOutlined style={{ marginRight: '8px' }} />
            数据导出中心
          </Title>
          <Row gutter={[16, 16]}>
            {exportItems.map((item) => (
              <Col xs={24} sm={12} lg={8} key={item.type}>
                <Card
                  style={{ 
                    textAlign: 'center',
                    borderRadius: '8px'
                  }}
                  styles={{ body: { padding: 'var(--space-6) var(--space-4)' } }}
                  actions={[
                    <AppButton
                      hierarchy="primary"
                      icon={<DownloadOutlined />}
                      loading={exporting[item.type]}
                      onClick={() => handleExport(item.type)}
                      style={{ backgroundColor: item.color, borderColor: item.color }}
                    >
                      {exporting[item.type] ? '导出中...' : '导出CSV'}
                    </AppButton>
                  ]}
                >
                  <div style={{ 
                    fontSize: '32px', 
                    color: item.color, 
                    marginBottom: '12px' 
                  }}>
                    {item.icon}
                  </div>
                  <Title level={4} style={{ margin: '0 0 8px 0' }}>
                    {item.title}
                  </Title>
                  <Text type="secondary">
                    {item.description}
                  </Text>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        {/* 数据更新时间提示 */}
        {dashboardData && !loading && (
          <div style={{ 
            textAlign: 'center', 
            marginTop: '16px',
            color: 'var(--ant-color-text-tertiary)',
            fontSize: '12px'
          }}>
            数据更新时间：{new Date().toLocaleString()}
          </div>
        )}
      </Space>
    </div>
  );
};

export default DashboardPage; 