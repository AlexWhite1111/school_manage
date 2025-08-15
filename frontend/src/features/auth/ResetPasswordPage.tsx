
import AppButton from '@/components/AppButton';
import React, { useState } from 'react';
import { Form, Input, Typography, message, Result, Card } from 'antd';
import { UnifiedCardPresets } from '@/theme/card';
import { LockOutlined, SafetyOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '@/api/authApi';

const { Title, Text } = Typography;

interface ResetPasswordForm {
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}

const ResetPasswordPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 从URL参数中获取重置令牌
  const tokenFromUrl = searchParams.get('token');
  
  React.useEffect(() => {
    if (tokenFromUrl) {
      form.setFieldValue('resetToken', tokenFromUrl);
    }
  }, [tokenFromUrl, form]);

  const handleSubmit = async (values: ResetPasswordForm) => {
    // 密码确认验证
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    
    try {
      await resetPassword({
        resetToken: values.resetToken,
        newPassword: values.newPassword
      });
      
      setResetSuccess(true);
      message.success('密码重置成功！');
    } catch (error: any) {
      console.error('重置密码失败:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('重置失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const preset = UnifiedCardPresets.desktopDefault(false);

  if (resetSuccess) {
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
          style={{ ...preset.style, width: '100%', maxWidth: 500 }}
          styles={preset.styles}
        >
          <Result
            status="success"
            title="密码重置成功"
            subTitle="您的密码已成功重置，现在可以使用新密码登录系统。"
            extra={[
              <AppButton 
                hierarchy="primary" 
                onClick={() => navigate('/login')}
                key="login"
              >
                前往登录
              </AppButton>
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
        style={{ ...preset.style, width: '100%', maxWidth: 400 }}
        styles={preset.styles}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ color: 'var(--ant-color-primary)', marginBottom: 8 }}>
            重置密码
          </Title>
          <Text type="secondary">
            请输入重置令牌和新密码
          </Text>
        </div>

        <Form
          form={form}
          name="reset-password"
          onFinish={handleSubmit}
          autoComplete="off"
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="resetToken"
            label="重置令牌"
            rules={[
              { required: true, message: '请输入重置令牌' }
            ]}
          >
            <Input
              prefix={<SafetyOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              placeholder="重置令牌"
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              placeholder="新密码"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            rules={[
              { required: true, message: '请确认新密码' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              placeholder="确认新密码"
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
              {loading ? '重置中...' : '重置密码'}
            </AppButton>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">
            <Link to="/login" style={{ color: 'var(--ant-color-primary)' }}>
              <ArrowLeftOutlined /> 登录
            </Link>
            {' · '}
            <Link to="/forgot-password" style={{ color: 'var(--ant-color-primary)' }}>重新获取令牌</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default ResetPasswordPage; 