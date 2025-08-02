import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Result } from 'antd';
import { UserOutlined, MailOutlined } from '@ant-design/icons';
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
  const [resetToken, setResetToken] = useState<string>('');

  const handleSubmit = async (values: ForgotPasswordForm) => {
    setLoading(true);
    
    try {
      const result = await forgotPassword(values);
      setResetToken(result.resetToken);
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
          <Result
            status="success"
            title="重置请求已发送"
            subTitle={
              <div>
                <Paragraph>
                  我们已经为您生成了密码重置令牌。在正式环境中，这将通过邮件发送给您。
                </Paragraph>
                <Paragraph>
                  <Text strong>演示令牌：</Text>
                  <Text code copyable>{resetToken}</Text>
                </Paragraph>
                <Paragraph>
                  请复制此令牌并前往重置密码页面使用。
                </Paragraph>
              </div>
            }
            extra={[
              <Link to="/reset-password" key="reset">
                <Button type="primary">前往重置密码</Button>
              </Link>,
              <Link to="/login" key="back">
                <Button>返回登录</Button>
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
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
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{ height: 'auto', padding: '12px 0', fontSize: '16px' }}
            >
              {loading ? '发送中...' : '发送重置请求'}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">
            <Link to="/login" style={{ color: '#1890ff' }}>返回登录</Link>
            {' · '}
            <Link to="/reset-password" style={{ color: '#1890ff' }}>已有重置令牌？</Link>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage; 