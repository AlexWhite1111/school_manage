import React, { useState, useEffect } from 'react';
import { Typography, Row, Col, Space, Button, message, Card } from 'antd';
import { 
  ReloadOutlined, 
  TeamOutlined, 
  BookOutlined, 
  DollarOutlined, 
  DownloadOutlined,
  DatabaseOutlined,
  UserOutlined,
  FileExcelOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import FinancialOverviewCard from '@/components/dashboard/FinancialOverviewCard';
import FollowUpRemindersCard from '@/components/dashboard/FollowUpRemindersCard';
import { getDashboardSummary, refreshDashboardData, DashboardSummaryResponse } from '@/api/dashboardApi';
import * as globalApi from '@/api/globalApi';
import type { FinancialData } from '@/components/dashboard/FinancialOverviewCard';
import type { FollowUpCustomer } from '@/components/dashboard/FollowUpRemindersCard';

const { Title, Text } = Typography;

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
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
      
      // 在开发环境中使用模拟数据
      if (import.meta.env.DEV) {
        console.warn('使用模拟数据 (开发环境)');
        setDashboardData({
          financial: {
            monthlyReceived: 125000.50,
            monthlyDue: 180000.00,
            totalOutstanding: 45000.00
          },
          followUps: [
            {
              id: 1,
              name: '张小明',
              sourceChannel: '朋友推荐',
              nextFollowUpDate: new Date().toISOString().split('T')[0],
              phone: '13800138001'
            },
            {
              id: 2,
              name: '李小华',  
              sourceChannel: '网络咨询',
              nextFollowUpDate: new Date().toISOString().split('T')[0],
              phone: '13800138002'
            },
            {
              id: 3,
              name: '王小红',
              sourceChannel: '老客户介绍',
              nextFollowUpDate: new Date().toISOString().split('T')[0],
              phone: '13800138003'
            }
          ]
        });
        setError(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 页面初始化
  useEffect(() => {
    loadDashboardData();
  }, []);

  // 财务卡片点击处理 - 跳转到财务中心
  const handleFinancialCardClick = () => {
    // 根据 DashboardWorkflow.md: 点击卡片会跳转至"极简财务中心"模块主页
    navigate('/finance');
  };

  // 客户点击处理 - 跳转到客户档案页面
  const handleCustomerClick = (customerId: number) => {
    // 根据 DashboardWorkflow.md: 点击客户姓名会直接跳转至该客户的"客户档案(Lead Profile)"页面
    navigate(`/crm/${customerId}`);
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
          blob = await globalApi.exportCustomers();
          filename = globalApi.generateTimestampedFilename('客户信息');
          break;
        case 'growth-logs':
          blob = await globalApi.exportGrowthLogs();
          filename = globalApi.generateTimestampedFilename('学生成长记录');
          break;
        case 'finance':
          blob = await globalApi.exportFinance();
          filename = globalApi.generateTimestampedFilename('财务数据');
          break;
        default:
          throw new Error('未知的导出类型');
      }
      
      globalApi.downloadFile(blob, filename);
      message.success('导出完成');
    } catch (error: any) {
      console.error(`导出${type}失败:`, error);
      message.error(error.message || '导出失败，请稍后重试');
    } finally {
      setExporting(prev => ({ ...prev, [type]: false }));
    }
  };

  // 转换数据格式以适配组件接口
  const financialData: FinancialData | undefined = dashboardData ? {
    monthlyReceived: dashboardData.financial.monthlyReceived,
    monthlyDue: dashboardData.financial.monthlyDue,
    totalOutstanding: dashboardData.financial.totalOutstanding
  } : undefined;

  const followUpCustomers: FollowUpCustomer[] = dashboardData?.followUps || [];

  // 快速导航卡片配置
  const quickNavItems = [
    {
      title: '客户管理',
      description: '管理客户档案和跟进',
      icon: <TeamOutlined />,
      path: '/crm',
      color: '#1890ff'
    },
    {
      title: '学生成长',
      description: '记录学生成长日志',
      icon: <BookOutlined />,
      path: '/student-log',
      color: '#52c41a'
    },
    {
      title: '财务中心',
      description: '管理收费和订单',
      icon: <DollarOutlined />,
      path: '/finance',
      color: '#fa8c16'
    }
  ];

  // 数据导出卡片配置
  const exportItems = [
    {
      title: '客户信息',
      description: '导出客户档案数据',
      icon: <UserOutlined />,
      type: 'customers' as const,
      color: '#1890ff'
    },
    {
      title: '成长记录',
      description: '导出学生成长日志',
      icon: <RocketOutlined />,
      type: 'growth-logs' as const,
      color: '#52c41a'
    },
    {
      title: '财务数据',
      description: '导出订单和收款记录',
      icon: <FileExcelOutlined />,
      type: 'finance' as const,
      color: '#fa8c16'
    }
  ];

  return (
    <div style={{ padding: '0' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题和刷新按钮 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={2} style={{ margin: 0, marginBottom: '8px' }}>
              核心仪表盘
            </Title>
            <Text type="secondary">
              欢迎回来！这里是您的业务概览和今日待办事项。
            </Text>
          </div>
          
          {/* 手动刷新按钮 */}
          <Button 
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={handleRefresh}
            style={{ flexShrink: 0 }}
          >
            刷新数据
          </Button>
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
            <Button 
              type="link" 
              size="small" 
              onClick={() => loadDashboardData()}
              style={{ marginLeft: '8px', padding: 0, height: 'auto' }}
            >
              重试
            </Button>
          </div>
        )}

        {/* 主要信息卡片 */}
        <Row gutter={[24, 24]} style={{ minHeight: '350px' }}>
          {/* 财务速览卡片 */}
          <Col xs={24} lg={12} style={{ display: 'flex' }}>
            <div style={{ width: '100%' }}>
            <FinancialOverviewCard 
              data={financialData}
              loading={loading}
              onClick={handleFinancialCardClick}
            />
            </div>
          </Col>

          {/* 待办提醒卡片 */}
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

        {/* 快速导航卡片 */}
        <div>
          <Title level={3} style={{ marginBottom: '16px' }}>
            快速导航
          </Title>
          <Row gutter={[16, 16]}>
            {quickNavItems.map((item) => (
              <Col xs={24} sm={12} lg={8} key={item.path}>
                <Card
                  hoverable
                  onClick={() => handleQuickNavigation(item.path)}
                  style={{ 
                    textAlign: 'center',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                  styles={{ body: { padding: '24px 16px' } }}
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
                  styles={{ body: { padding: '24px 16px' } }}
                  actions={[
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      loading={exporting[item.type]}
                      onClick={() => handleExport(item.type)}
                      style={{ backgroundColor: item.color, borderColor: item.color }}
                    >
                      {exporting[item.type] ? '导出中...' : '导出CSV'}
                    </Button>
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