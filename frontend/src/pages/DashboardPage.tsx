import React, { useState, useEffect } from 'react';
import { Typography, Row, Col, Space, Button, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import FinancialOverviewCard from '@/components/dashboard/FinancialOverviewCard';
import FollowUpRemindersCard from '@/components/dashboard/FollowUpRemindersCard';
import { getDashboardSummary, refreshDashboardData, DashboardSummaryResponse } from '@/api/dashboardApi';
import type { FinancialData } from '@/components/dashboard/FinancialOverviewCard';
import type { FollowUpCustomer } from '@/components/dashboard/FollowUpRemindersCard';

const { Title } = Typography;

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      
      // 在真实环境中，如果API未就绪，使用模拟数据
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
    navigate(`/customers/${customerId}`);
  };

  // 手动刷新数据
  const handleRefresh = () => {
    loadDashboardData(true);
  };

  // 转换数据格式以适配组件接口
  const financialData: FinancialData | undefined = dashboardData ? {
    monthlyReceived: dashboardData.financial.monthlyReceived,
    monthlyDue: dashboardData.financial.monthlyDue,
    totalOutstanding: dashboardData.financial.totalOutstanding
  } : undefined;

  const followUpCustomers: FollowUpCustomer[] = dashboardData?.followUps || [];

  return (
    <div style={{ padding: '0' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题和刷新按钮 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={2} style={{ margin: 0, marginBottom: '8px' }}>
              核心仪表盘
            </Title>
            <Typography.Text type="secondary">
              欢迎回来！这里是您的业务概览和今日待办事项。
            </Typography.Text>
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
            <Typography.Text type="danger">
              {error}
            </Typography.Text>
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

        {/* 卡片网格布局 */}
        <Row gutter={[24, 24]}>
          {/* 财务速览卡片 */}
          <Col xs={24} lg={12}>
            <FinancialOverviewCard 
              data={financialData}
              loading={loading}
              onClick={handleFinancialCardClick}
            />
          </Col>

          {/* 待办提醒卡片 */}
          <Col xs={24} lg={12}>
            <FollowUpRemindersCard 
              customers={followUpCustomers}
              loading={loading}
              onCustomerClick={handleCustomerClick}
            />
          </Col>
        </Row>

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