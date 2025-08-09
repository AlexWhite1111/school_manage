import React, { useState } from 'react';
import { Form, Input, Button, Select, Card, Typography, message, Space } from 'antd';
import { UserOutlined, TeamOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { registerUser, UserRole } from '@/api/authApi';
import { usePermissions } from '@/hooks/usePermissions';

const { Title, Text } = Typography;
const { Option } = Select;

interface RegisterForm {
  username: string;
  role: UserRole;
}

const RegisterPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isSuperAdmin } = usePermissions();

  // 权限检查
  if (!isSuperAdmin()) {
    return (
      <div style={{ 
        padding: '24px', 
        textAlign: 'center',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <Title level={3} type="danger">权限不足</Title>
        <Text>只有超级管理员才能注册新用户</Text>
      </div>
    );
  }

  const handleSubmit = async (values: RegisterForm) => {
    setLoading(true);
    
    try {
      // 使用默认密码123456
      const userData = {
        ...values,
        password: '123456'
      };
      
      await registerUser(userData);
      
      message.success('用户注册成功！默认密码为：123456');
      form.resetFields();
      
      // 注册成功后可以跳转到用户管理页面
      navigate('/settings');
      
    } catch (error: any) {
      console.error('注册失败:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('注册失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 500,
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          borderRadius: '12px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ color: '#1890ff', marginBottom: 8 }}>
            创建新的系统用户账号
          </Title>
          <Text type="secondary">
            只需选择用户名和角色，密码默认为 123456
          </Text>
        </div>

        <Form
          form={form}
          name="register"
          onFinish={handleSubmit}
          autoComplete="off"
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' },
              { max: 20, message: '用户名最多20个字符' },
              { pattern: /^[a-zA-Z0-9_]+$/, message: '用户名只能包含字母、数字和下划线' }
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              placeholder="用户名"
            />
          </Form.Item>

          <Form.Item
            name="role"
            label="用户角色"
            rules={[
              { required: true, message: '请选择用户角色' }
            ]}
          >
            <Select
              placeholder="选择用户角色"
              prefix={<TeamOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
            >
              <Option value={UserRole.MANAGER}>管理员</Option>
              <Option value={UserRole.TEACHER}>教师</Option>
              <Option value={UserRole.STUDENT}>学生</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{ height: 'auto', padding: '12px 0', fontSize: '16px' }}
              >
                {loading ? '注册中...' : '注册用户'}
              </Button>
              
                            <Button 
                type="default"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/settings')}
                block
              >
                设置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default RegisterPage; 