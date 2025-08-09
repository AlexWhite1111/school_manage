import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Divider,
  Typography,
  Space,
  Alert,
  Switch,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  ArrowLeftOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useThemeStore } from '@/stores/themeStore';
import { usePermissions } from '@/hooks/usePermissions';
import * as authApi from '@/api/authApi';
import type { User, UpdateUserRequest, ChangePasswordRequest } from '@/api/authApi';

const { Title, Text } = Typography;

interface UserInfoForm {
  username: string;
  displayName?: string;
  email?: string;
  phone?: string;
}

interface PasswordForm {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ProfilePage: React.FC = () => {
  const [userForm] = Form.useForm<UserInfoForm>();
  const [passwordForm] = Form.useForm<PasswordForm>();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useThemeStore();
  const { isSuperAdmin } = usePermissions();
  const isDark = theme === 'dark';

  // 加载用户信息
  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const data = await authApi.getCurrentUser();
      setUserInfo(data);
      // 填充表单
      userForm.setFieldsValue({
        username: data.username,
        displayName: data.displayName || '',
        email: data.email || '',
        phone: data.phone || '',
      });
    } catch (err: any) {
      console.error('获取用户信息失败:', err);
      message.error('获取用户信息失败');
    }
  };

  // 更新用户信息
  const handleUpdateUserInfo = async (values: UserInfoForm) => {
    setLoading(true);
    setError('');

    try {
      // 前端校验
      if (!values.displayName?.trim()) {
        setError('昵称不能为空');
        setLoading(false);
        return;
      }

      // 只发送有变化的字段
      const updateData: UpdateUserRequest = {};
      
      // 超级管理员可以修改用户名
      if (isSuperAdmin() && values.username !== userInfo?.username) {
        updateData.username = values.username;
      }
      
      if (values.displayName !== userInfo?.displayName) {
        updateData.displayName = values.displayName;
      }
      if (values.email !== userInfo?.email) {
        updateData.email = values.email;
      }
      if (values.phone !== userInfo?.phone) {
        updateData.phone = values.phone;
      }

      // 如果没有变化，不发送请求
      if (Object.keys(updateData).length === 0) {
        message.info('没有信息需要更新');
        setLoading(false);
        return;
      }

      const updatedUser = await authApi.updateUserInfo(updateData);
      setUserInfo(updatedUser);
      message.success('信息更新成功！');

      // 重新加载用户信息以同步右上角显示
      await loadUserInfo();
      
      // 刷新页面以更新全局状态
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (err: any) {
      console.error('更新用户信息失败:', err);
      if (err.code === 409) {
        setError('用户名或邮箱已被使用');
      } else {
        setError(err.message || '更新失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  // 修改密码
  const handleChangePassword = async (values: PasswordForm) => {
    setPasswordLoading(true);

    try {
      // 前端校验
      if (!values.oldPassword || !values.newPassword) {
        message.error('旧密码和新密码不能为空');
        setPasswordLoading(false);
        return;
      }

      if (values.newPassword !== values.confirmPassword) {
        message.error('两次输入的新密码不一致');
        setPasswordLoading(false);
        return;
      }

      if (values.newPassword.length < 6) {
        message.error('新密码长度至少为6个字符');
        setPasswordLoading(false);
        return;
      }

      await authApi.changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });

      message.success('密码修改成功，请使用新密码重新登录');
      
      // 清除认证状态并跳转到登录页
      logout();
      navigate('/login');

    } catch (err: any) {
      console.error('修改密码失败:', err);
      if (err.code === 400) {
        message.error('当前密码不正确，请重试');
      } else {
        message.error(err.message || '操作失败，请稍后重试');
      }
      // 为安全起见，清空所有密码输入框
      passwordForm.resetFields();
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '24px',
      background: isDark ? '#141414' : '#f5f5f5',
      minHeight: '100vh'
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* 页面头部 */}
        <div style={{ marginBottom: 24 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ marginBottom: 16 }}
          />
          <Title level={2}>个人中心</Title>
        </div>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 界面模式切换 */}
          <Card title="界面设置" size="small">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                {isDark ? <MoonOutlined /> : <SunOutlined />}
                <Text>界面模式</Text>
              </Space>
              <Switch
                checked={isDark}
                onChange={toggleTheme}
                checkedChildren="夜间"
                unCheckedChildren="白天"
              />
            </div>
          </Card>

          {/* 修改用户信息 */}
          <Card title="修改用户信息">
            {error && (
              <Alert
                message={error}
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
                closable
                onClose={() => setError('')}
              />
            )}
            
            <Form
              form={userForm}
              layout="vertical"
              onFinish={handleUpdateUserInfo}
              autoComplete="off"
            >
              <Form.Item
                label={isSuperAdmin() ? "用户名" : "用户名（不可修改）"}
                name="username"
                rules={[
                  { required: true, message: '用户名不能为空' },
                  { type: 'string', message: '用户名必须是字符串' }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="请输入用户名"
                  autoComplete="username"
                  disabled={!isSuperAdmin()}
                />
              </Form.Item>

              <Form.Item
                label="昵称"
                name="displayName"
                rules={[
                  { required: true, message: '昵称不能为空' }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="请输入昵称"
                  autoComplete="nickname"
                />
              </Form.Item>

              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="请输入邮箱地址（选填）"
                  autoComplete="email"
                />
              </Form.Item>

              <Form.Item
                label="手机号"
                name="phone"
                rules={[
                  { 
                    pattern: /^1[3-9]\d{9}$/,
                    message: '请输入有效的手机号码'
                  }
                ]}
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="请输入手机号码（选填）"
                  autoComplete="tel"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  style={{ width: '120px' }}
                >
                  {loading ? '保存中...' : '保存修改'}
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {/* 修改密码 */}
          <Card title="修改密码">
            <Alert
              message="密码修改成功后，您需要重新登录"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={handleChangePassword}
              autoComplete="off"
            >
              <Form.Item
                label="当前密码"
                name="oldPassword"
                rules={[{ required: true, message: '请输入当前密码' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请输入当前密码"
                  autoComplete="current-password"
                />
              </Form.Item>

              <Form.Item
                label="新密码"
                name="newPassword"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 6, message: '密码长度至少为6个字符' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请输入新密码（至少6个字符）"
                  autoComplete="new-password"
                />
              </Form.Item>

              <Form.Item
                label="确认新密码"
                name="confirmPassword"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: '请确认新密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请再次输入新密码"
                  autoComplete="new-password"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={passwordLoading}
                  danger
                  style={{ width: '120px' }}
                >
                  {passwordLoading ? '修改中...' : '确认修改密码'}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Space>

        {/* 页脚信息 */}
        {userInfo && (
          <div style={{ 
            textAlign: 'center', 
            marginTop: 32, 
            padding: 16,
            borderTop: '1px solid #f0f0f0'
          }}>
            <Text type="secondary">
              最新编辑时间: {new Date().toLocaleString('zh-CN')}
            </Text>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage; 