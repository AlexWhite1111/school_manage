import React from 'react';
import { useParams } from 'react-router-dom';
import LeadProfileForm from '@/features/crm/components/LeadProfileForm';

const CrmDetailPage: React.FC = () => {
  const { publicId } = useParams<{ publicId: string }>();
  
  // 🔧 修复：区分新建和编辑模式
  // 当URL是/crm/new时，publicId会是"new"字符串，此时应该视为新建模式
  const isNewCustomer = publicId === 'new';
  const actualPublicId = isNewCustomer ? undefined : publicId;

  console.log('🔍 CrmDetailPage 路由参数:', { publicId, isNewCustomer, actualPublicId });

  return (
    <LeadProfileForm 
      customerPublicId={actualPublicId}
      onSave={(customer) => {
        console.log('客户信息已保存:', customer);
        // TODO: 可以在这里添加保存成功后的逻辑，比如跳转到客户详情页
      }}
    />
  );
};

export default CrmDetailPage; 