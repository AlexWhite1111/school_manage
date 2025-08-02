import React from 'react';
import { Avatar, Dropdown, Typography, Space, Button } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useThemeStore } from '@/stores/themeStore';
import { useResponsive } from '@/hooks/useResponsive';
import * as authApi from '@/api/authApi';
import type { MenuProps } from 'antd';

const { Text } = Typography;

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme } = useThemeStore();
  const { isSmall } = useResponsive();

  // 处理登出
  const handleLogout = async () => {
    try {
      // 调用登出API
      await authApi.logout();
    } catch (error) {
      console.error('登出API调用失败:', error);
      // 即使API调用失败，也继续执行客户端登出
    } finally {
      // 清除客户端认证状态
      logout();
      // 跳转到登录页
      navigate('/login');
    }
  };

  // 用户头像下拉菜单项
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: (
        <Space>
          <SettingOutlined />
          进入个人界面
        </Space>
      ),
      onClick: () => navigate('/profile'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: (
        <Space>
          <LogoutOutlined />
          登出
        </Space>
      ),
      onClick: handleLogout,
    },
  ];

  return (
    <>
      {user ? (
        <Dropdown
          menu={{ items: userMenuItems }}
          placement="bottomRight"
          arrow
          trigger={['click']}
        >
          <Button
            type="text"
            style={{
              height: 'auto',
              padding: isSmall ? '6px 8px' : '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: isSmall ? '4px' : '8px',
              borderRadius: '8px',
              transition: 'all 0.3s ease',
              // 主题适配
              color: theme === 'dark' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.65)',
            }}
          >
            <Avatar
              size={isSmall ? 24 : 28}
              icon={<UserOutlined />}
              style={{ 
                backgroundColor: '#1890ff',
                transition: 'all 0.3s ease'
              }}
            />
            {!isSmall && (
              <Space direction="vertical" size={0} style={{ textAlign: 'left' }}>
                <Text 
                  strong 
                  style={{ 
                    fontSize: '14px',
                    color: theme === 'dark' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)'
                  }}
                >
                  {user.displayName || user.username}
                </Text>
                {user.email && (
                  <Text 
                    type="secondary" 
                    style={{ 
                      fontSize: '12px',
                      color: theme === 'dark' ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.45)'
                    }}
                  >
                    {user.email}
                  </Text>
                )}
              </Space>
            )}
          </Button>
        </Dropdown>
      ) : (
        <Button 
          type="primary" 
          onClick={() => navigate('/login')}
          style={{
            borderRadius: '8px',
            transition: 'all 0.3s ease'
          }}
        >
          登录
        </Button>
      )}
    </>
  );
};

export default Header; 