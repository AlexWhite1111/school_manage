import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Alert, Card, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const { Title, Text } = Typography;

interface LoginForm {
  username: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();
  const { login, isAuthenticated, user, token } = useAuth();

  // 根据用户角色跳转到对应页面
  useEffect(() => {
    console.log('🔍 LoginPage useEffect 触发:', { isAuthenticated, user: !!user, userRole: user?.role });
    
    if (isAuthenticated && user?.role) {
      console.log('🔄 LoginPage: 检测到已认证，用户角色:', user.role);
      
      let redirectPath = '/dashboard'; // 默认路径
      
      switch (user.role) {
        case 'STUDENT':
          // 学生跳转到专属成长报告页面，使用用户名（学号）
          redirectPath = `/student-log/report/${user.username}`;
          break;
        case 'TEACHER':
          redirectPath = '/student-log';
          break;
        case 'MANAGER':
        case 'SUPER_ADMIN':
        default:
          redirectPath = '/dashboard';
          break;
      }
      
      console.log(`🎯 角色 ${user.role} 重定向到: ${redirectPath}`);
      navigate(redirectPath);
    } else {
      console.log('🔍 LoginPage: 尚未满足重定向条件:', { 
        isAuthenticated, 
        hasUser: !!user, 
        hasRole: !!user?.role 
      });
    }
  }, [isAuthenticated, user, navigate]);

  // 添加调试信息
  useEffect(() => {
    console.log('🔍 LoginPage 认证状态:', { isAuthenticated, hasUser: !!user, hasToken: !!token });
  }, [isAuthenticated, user, token]);

  const handleSubmit = async (values: LoginForm) => {
    setLoading(true);
    setError('');

    try {
      // 前端校验
      if (!values.username || !values.password) {
        setError('用户名和密码不能为空');
        setLoading(false);
        return;
      }

      // 直接使用useAuth的登录方法，避免重复逻辑
      await login(values.username, values.password);
      console.log('🎉 登录流程完成，等待状态更新...');

      // 注意：不在这里立即跳转，而是让useEffect处理跳转
      // navigate('/dashboard'); // 移除这行

    } catch (err: any) {
      console.error('登录失败:', err);
      
      // 处理不同类型的错误
      if (err.code === 401) {
        setError('账号或密码错误，请重试');
        // 清除密码输入框
        form.setFieldValue('password', '');
      } else if (err.code === 'NETWORK_ERROR') {
        setError('网络连接超时，请检查您的网络并稍后重试');
      } else if (err.code >= 500) {
        setError('登录服务异常，请稍后重试');
      } else {
        setError(err.message || '登录失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          borderRadius: '12px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ color: '#1890ff', marginBottom: 8 }}>
            欢迎登录
          </Title>
          <Text type="secondary">
            请输入您的账号信息
          </Text>
          <div style={{ marginTop: 12, padding: '8px 16px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: '4px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              💡 演示账号: <strong>admin</strong> / <strong>Bai==1001</strong>
            </Text>
          </div>
        </div>

        <Form
          form={form}
          name="login"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { type: 'string', message: '用户名必须是字符串' }
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              placeholder="用户名/账号"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { type: 'string', message: '密码必须是字符串' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>

          {error && (
            <Form.Item>
              <Alert
                message={error}
                type="error"
                showIcon
                style={{ marginBottom: 0 }}
              />
            </Form.Item>
          )}

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: 'auto', padding: '12px 0', fontSize: '16px' }}
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">
            <Link to="/forgot-password" style={{ color: '#1890ff' }}>忘记密码？</Link>
            {' · '}
            <Link to="/register" style={{ color: '#1890ff' }}>注册新账号</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage; 