import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Typography, Breadcrumb } from 'antd';
import { HomeOutlined, DollarOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import FinanceDetailView from '@/features/finance/components/FinanceDetailView';
import { useResponsive } from '@/hooks/useResponsive';

const { Title } = Typography;

const FinanceDetailPage: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  // 验证studentId参数
  const studentIdNum = studentId ? parseInt(studentId, 10) : null;
  
  if (!studentIdNum || isNaN(studentIdNum)) {
    return (
      <div style={{ padding: isMobile ? 16 : 24, textAlign: 'center' }}>
        <Title level={3}>无效的学生ID</Title>
        <Button type="primary" onClick={() => navigate('/finance')}>
          返回财务中心
        </Button>
      </div>
    );
  }

  const handleBack = () => {
    navigate('/finance');
  };

  return (
    <div style={{ padding: isMobile ? 16 : 24 }}>
      {/* 面包屑导航 */}
      <div style={{ marginBottom: 16 }}>
        <Breadcrumb
          items={[
            {
              href: '/',
              title: <HomeOutlined />,
            },
            {
              href: '/finance',
              title: (
                <span>
                  <DollarOutlined />
                  <span style={{ marginLeft: 4 }}>财务中心</span>
                </span>
              ),
            },
            {
              title: '学生详情',
            },
          ]}
        />
      </div>

      {/* 返回按钮 */}
      {!isMobile && (
        <div style={{ marginBottom: 16 }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBack}
            type="link"
            style={{ padding: 0 }}
          >
            返回财务中心
          </Button>
        </div>
      )}

      {/* 财务详情组件 */}
      <FinanceDetailView 
        studentId={studentIdNum}
        onBack={isMobile ? handleBack : undefined}
      />
    </div>
  );
};

export default FinanceDetailPage; 