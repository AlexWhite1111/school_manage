import AppButton from '@/components/AppButton';
import React, { useState } from 'react';
import { Form, Input, Typography, message, Result, Card } from 'antd';
import { UserOutlined, MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { forgotPassword } from '@/api/authApi';

const { Title, Text, Paragraph } = Typography;

interface ForgotPasswordForm {
  identifier: string;
}

const ForgotPasswordPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [resetTokenSent, setResetTokenSent] = useState(false);

  const handleSubmit = async (values: ForgotPasswordForm) => {
    setLoading(true);
    
    try {
      await forgotPassword(values);
      setResetTokenSent(true);
      message.success('密码重置请求已发送');
    } catch (error: any) {
      console.error('忘记密码失败:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('请求失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  if (resetTokenSent) {
    return (
      <div style={{
        minHeight: '100vh',
  background: 'var(--app-brand-gradient)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 'var(--space-5)'
      }}>
        <Card
          style={{
            width: '100%',
            maxWidth: 500,
            borderRadius: 'var(--radius-lg)'
          }}
        >
          <Result
            status="success"
            title="重置请求已发送"
            subTitle={
              <div>
                <Paragraph>我们已经为您生成了密码重置令牌，并会通过邮箱发送给您。</Paragraph>
                <Paragraph>请前往邮箱查收并继续完成密码重置。</Paragraph>
              </div>
            }
            extra={[
              <Link to="/reset-password" key="reset">
                <AppButton hierarchy="primary">前往重置密码</AppButton>
              </Link>,
              <Link to="/login" key="back">
                <AppButton icon={<ArrowLeftOutlined />}>登录</AppButton>
              </Link>
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
  background: 'var(--app-brand-gradient)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 'var(--space-5)'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 'var(--radius-lg)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ color: 'var(--ant-color-primary)', marginBottom: 8 }}>
            忘记密码
          </Title>
          <Text type="secondary">
            请输入您的用户名或邮箱
          </Text>
        </div>

        <Form
          form={form}
          name="forgot-password"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="identifier"
            rules={[
              { required: true, message: '请输入用户名或邮箱' }
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              placeholder="用户名或邮箱"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <AppButton
              hierarchy="primary"
              type="submit"
              loading={loading}
              block
              style={{ height: 'auto', padding: 'var(--space-3) 0', fontSize: '16px' }}
            >
              {loading ? '发送中...' : '发送重置请求'}
            </AppButton>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">
            <Link to="/login" style={{ color: 'var(--ant-color-primary)' }}>
              <ArrowLeftOutlined /> 登录
            </Link>
            {' · '}
            <Link to="/reset-password" style={{ color: 'var(--ant-color-primary)' }}>已有重置令牌？</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage; 