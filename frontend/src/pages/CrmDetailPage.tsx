import React from 'react';
import { useParams } from 'react-router-dom';
import LeadProfileForm from '@/features/crm/components/LeadProfileForm';

const CrmDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const customerId = id ? parseInt(id, 10) : undefined;

  return (
    <LeadProfileForm 
      customerId={customerId}
      onSave={(customer) => {
        console.log('客户信息已保存:', customer);
      }}
    />
  );
};

export default CrmDetailPage; 