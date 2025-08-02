import React, { useState, useEffect } from 'react';
import { Typography, Space, Statistic, Row, Col } from 'antd';
import { MoneyCollectOutlined, ClockCircleOutlined } from '@ant-design/icons';
import ProjectCard from '@/components/ui/ProjectCard';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

const { Title } = Typography;

export interface FinancialData {
  monthlyReceived: number;    // 本月实收
  monthlyDue: number;         // 本月应收
  totalOutstanding: number;   // 当前待收总额
}

export interface FinancialOverviewCardProps {
  data?: FinancialData;
  loading?: boolean;
  onClick?: () => void;
}

const FinancialOverviewCard: React.FC<FinancialOverviewCardProps> = ({
  data,
  loading = false,
  onClick
}) => {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  // 响应式断点检测
  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 576) {
        setScreenSize('mobile');
      } else if (width < 992) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  // 根据屏幕尺寸获取布局配置
  const getLayoutConfig = () => {
    switch (screenSize) {
      case 'mobile':
        return {
          colSpan: 24, // 每个指标占一整行
          gutter: [0, 16] as [number, number],
          fontSize: '16px',
          titleStyle: { fontSize: '12px', marginBottom: '4px' }
        };
      case 'tablet':
        return {
          colSpan: 12, // 一行两个指标
          gutter: [16, 16] as [number, number],
          fontSize: '18px',
          titleStyle: { fontSize: '13px', marginBottom: '4px' }
        };
      default: // desktop
        return {
          colSpan: 8, // 一行三个指标
          gutter: [24, 16] as [number, number],
          fontSize: '18px',
          titleStyle: { fontSize: '14px', marginBottom: '6px' }
        };
    }
  };

  const layoutConfig = getLayoutConfig();

  if (loading || !data) {
    return (
      <ProjectCard 
        title="财务速览"
        style={{ minHeight: '300px' }}
      >
        <SkeletonLoader variant="financial" />
      </ProjectCard>
    );
  }

  return (
    <ProjectCard 
      title={
        <Space align="center">
          <MoneyCollectOutlined style={{ color: 'var(--ant-color-primary)' }} />
          <Title level={4} style={{ margin: 0, fontSize: screenSize === 'mobile' ? '16px' : '18px' }}>
            财务速览
          </Title>
        </Space>
      }
      clickable={!!onClick}
      onClick={onClick}
      style={{ 
        minHeight: '300px',
        height: '100%',
        width: '100%'
      }}
    >
      <Row gutter={layoutConfig.gutter}>
        <Col span={layoutConfig.colSpan}>
          <div style={{ textAlign: screenSize === 'mobile' ? 'left' : 'center' }}>
            <Statistic
              title="本月实收"
              value={data.monthlyReceived}
              precision={2}
              prefix="¥"
              valueStyle={{ 
                color: 'var(--ant-color-success)',
                fontSize: layoutConfig.fontSize,
                fontWeight: 600 
              }}
              formatter={(value) => {
                // 在移动端时，大数字自动换行显示
                if (screenSize === 'mobile' && typeof value === 'number' && value >= 100000) {
                  return value.toLocaleString();
                }
                return value;
              }}
            />
          </div>
        </Col>
        
        <Col span={layoutConfig.colSpan}>
          <div style={{ textAlign: screenSize === 'mobile' ? 'left' : 'center' }}>
            <Statistic
              title="本月应收"
              value={data.monthlyDue}
              precision={2}
              prefix="¥"
              valueStyle={{ 
                color: 'var(--ant-color-primary)',
                fontSize: layoutConfig.fontSize,
                fontWeight: 600 
              }}
              formatter={(value) => {
                if (screenSize === 'mobile' && typeof value === 'number' && value >= 100000) {
                  return value.toLocaleString();
                }
                return value;
              }}
            />
          </div>
        </Col>
        
        <Col span={layoutConfig.colSpan}>
          <div style={{ textAlign: screenSize === 'mobile' ? 'left' : 'center' }}>
            <Statistic
              title="当前待收总额"
              value={data.totalOutstanding}
              precision={2}
              prefix="¥"
              valueStyle={{ 
                color: data.totalOutstanding > 0 ? 'var(--ant-color-warning)' : 'var(--ant-color-success)',
                fontSize: layoutConfig.fontSize,
                fontWeight: 600 
              }}
              formatter={(value) => {
                if (screenSize === 'mobile' && typeof value === 'number' && value >= 100000) {
                  return value.toLocaleString();
                }
                return value;
              }}
            />
          </div>
        </Col>
      </Row>

      <div style={{ 
        marginTop: screenSize === 'mobile' ? '20px' : '16px', 
        padding: screenSize === 'mobile' ? '16px' : '12px', 
        background: 'var(--ant-color-fill-alter)', 
        borderRadius: '6px',
        textAlign: 'center'
      }}>
        <Typography.Text 
          type="secondary" 
          style={{ 
            fontSize: screenSize === 'mobile' ? '13px' : '12px',
            display: 'block'
          }}
        >
          <ClockCircleOutlined style={{ marginRight: '4px' }} />
          {screenSize === 'mobile' ? '轻触卡片查看财务详情' : '点击卡片查看详细财务管理'}
        </Typography.Text>
      </div>
    </ProjectCard>
  );
};

export default FinancialOverviewCard; 