import AppButton from '@/components/AppButton';
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import FinanceDetailView from '@/features/finance/components/FinanceDetailView';
import { useResponsive } from '@/hooks/useResponsive';

const { Title } = Typography;

const FinanceDetailPage: React.FC = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  // 验证publicId参数
  if (!publicId || typeof publicId !== 'string') {
    return (
      <div style={{ padding: isMobile ? 16 : 24, textAlign: 'center' }}>
        <Title level={3}>无效的学生公共ID</Title>
        <AppButton hierarchy="primary" onClick={() => navigate('/finance')}>
          返回财务中心
        </AppButton>
      </div>
    );
  }

  const handleBack = () => {
    navigate('/finance');
  };

  return (
    <div style={{ padding: isMobile ? 16 : 24 }}>


      {!isMobile && (
        <div style={{ marginBottom: 16 }}>
          <AppButton 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBack}
            hierarchy="link"
            style={{ padding: 0 }}
          />
        </div>
      )}

      {/* 财务详情组件 */}
      <FinanceDetailView 
        studentPublicId={publicId}
        onBack={isMobile ? handleBack : undefined}
      />
    </div>
  );
};

export default FinanceDetailPage; 