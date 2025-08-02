import React, { useState } from 'react';
import { Typography, Space, Divider, Button, Row, Col } from 'antd';
import FinancialOverviewCard, { FinancialData } from '@/components/dashboard/FinancialOverviewCard';

const { Title, Paragraph } = Typography;

const ShowcasePage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  // 模拟数据
  const mockFinancialData: FinancialData = {
    monthlyReceived: 125000.50,
    monthlyDue: 180000.00,
    totalOutstanding: 45000.00
  };

  const simulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>组件样板间 (Component Showcase)</Title>
          <Paragraph>
            这里是我们精心打造高质量组件的实验室。每个组件都会在这里经过精雕细琢，
            确保达到项目的美学和功能标准，然后再应用到实际的业务页面中。
          </Paragraph>
        </div>

        <Divider />

        <div>
          <Title level={3}>财务速览卡片 (Financial Overview Card)</Title>
          <Paragraph>
            根据 DashboardWorkflow.md 设计，展示核心财务指标：本月实收、本月应收、当前待收总额。
            支持点击跳转到财务中心，具备优雅的加载状态和主题切换功能。
          </Paragraph>
          
          <Space style={{ marginBottom: '16px' }}>
            <Button onClick={simulateLoading}>
              模拟加载状态
            </Button>
          </Space>

          <Row gutter={[24, 24]}>
            <Col span={12}>
              <div>
                <Title level={5}>正常状态</Title>
                <FinancialOverviewCard 
                  data={mockFinancialData}
                  onClick={() => alert('点击跳转到财务中心')}
                />
              </div>
            </Col>
            
            <Col span={12}>
              <div>
                <Title level={5}>加载状态</Title>
                <FinancialOverviewCard 
                  loading={isLoading}
                  data={mockFinancialData}
                />
              </div>
            </Col>
          </Row>
        </div>
      </Space>
    </div>
  );
};

export default ShowcasePage; 