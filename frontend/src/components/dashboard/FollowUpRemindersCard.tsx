import React from 'react';
import { Typography, List, Avatar, Space, Empty, Badge, Tag } from 'antd';
import { UserOutlined, PhoneOutlined, TeamOutlined } from '@ant-design/icons';
import ProjectCard from '@/components/ui/ProjectCard';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

const { Title, Text } = Typography;

export interface FollowUpCustomer {
  id: number;
  name: string;
  sourceChannel: string;
  nextFollowUpDate: string;
  phone?: string;
  parentName?: string;
  parentRelationship?: string;
  status?: string;
}

export interface FollowUpRemindersCardProps {
  customers?: FollowUpCustomer[];
  loading?: boolean;
  onCustomerClick?: (customer: FollowUpCustomer) => void;
}

// 客户状态颜色映射
const getStatusColor = (status?: string) => {
  switch (status) {
    case 'POTENTIAL': return 'default';
    case 'INITIAL_CONTACT': return 'blue';
    case 'INTERESTED': return 'cyan';
    case 'TRIAL_CLASS': return 'orange';
    case 'ENROLLED': return 'green';
    case 'LOST': return 'red';
    default: return 'default';
  }
};

// 客户状态文本映射
const getStatusText = (status?: string) => {
  switch (status) {
    case 'POTENTIAL': return '潜在用户';
    case 'INITIAL_CONTACT': return '初步沟通';
    case 'INTERESTED': return '意向用户';
    case 'TRIAL_CLASS': return '试课';
    case 'ENROLLED': return '已报名';
    case 'LOST': return '流失客户';
    default: return '未知状态';
  }
};

const FollowUpRemindersCard: React.FC<FollowUpRemindersCardProps> = ({
  customers = [],
  loading = false,
  onCustomerClick
}) => {
  if (loading) {
    return (
      <ProjectCard 
        title="今日需跟进的客户"
        style={{ minHeight: '300px' }}
      >
        <SkeletonLoader variant="list" />
      </ProjectCard>
    );
  }

  const followUpCount = customers.length;

  return (
    <ProjectCard 
      title={
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space align="center">
            <TeamOutlined style={{ color: 'var(--ant-color-primary)' }} />
            <Title level={4} style={{ margin: 0 }}>今日需跟进的客户</Title>
          </Space>
          {followUpCount > 0 && (
            <Badge 
              count={followUpCount} 
              style={{ backgroundColor: 'var(--ant-color-primary)' }}
            />
          )}
        </Space>
      }
      style={{ minHeight: '300px', height: '100%' }}
    >
      {followUpCount === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Text type="secondary">
              今日无待办事项，保持好状态！
            </Text>
          }
          style={{ padding: '20px 0' }}
        />
      ) : (
          <List
            dataSource={customers}
            renderItem={(customer, index) => (
              <List.Item
                style={{
                  cursor: 'pointer',
                  padding: '12px 8px',
                  borderRadius: '8px',
                // 🚀 性能优化：只过渡需要的属性，避免transition: all
                transition: 'background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
                  marginBottom: '8px',
                // 启用硬件加速
                willChange: 'transform, background-color, box-shadow',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--ant-color-fill-alter)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onClick={() => onCustomerClick?.(customer)}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar 
                      icon={<UserOutlined />} 
                      style={{ 
                        backgroundColor: 'var(--ant-color-primary)',
                      flexShrink: 0
                      }}
                    size={36}
                    />
                  }
                  title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space size="small" align="center">
                          <Text strong style={{ fontSize: '14px' }}>
                            {customer.name}
                          </Text>
                          <Tag 
                            color={getStatusColor(customer.status)} 
                        style={{ fontSize: '10px', padding: '0 4px' }}
                          >
                            {getStatusText(customer.status)}
                          </Tag>
                        </Space>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          #{index + 1}
                        </Text>
                    </div>
                  }
                  description={
                  <Space direction="vertical" size={2}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      来源：{customer.sourceChannel}
                    </Text>
                    {(customer.phone || customer.parentName) && (
                      <Space size="small" wrap>
                        {customer.parentName && (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            家长：{customer.parentName}
                          </Text>
                        )}
                        {customer.phone && (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            <PhoneOutlined style={{ marginRight: '2px' }} />
                            {customer.phone}
                          </Text>
                        )}
                      </Space>
                    )}
                  </Space>
                  }
                />
              </List.Item>
            )}
            style={{
            maxHeight: '320px',
              overflowY: 'auto',
              padding: '0 4px'
            }}
            className="custom-scrollbar"
          />
      )}
    </ProjectCard>
  );
};

export default FollowUpRemindersCard; 