import React, { useState, useEffect, useRef } from 'react';
import { Layout, Button, Menu, Typography } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  BulbOutlined, 
  BulbFilled, 
  MenuFoldOutlined, 
  MenuUnfoldOutlined,
  DashboardOutlined,
  TeamOutlined,
  DollarOutlined,
  BookOutlined,
  BarChartOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useThemeStore } from '@/stores/themeStore';
import { useResponsive } from '@/hooks/useResponsive';
import { usePermissions } from '@/hooks/usePermissions';
import CustomHeader from './Header';

const { Header: AntHeader, Sider, Content, Footer } = Layout;
const { Text } = Typography;

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, toggleTheme } = useThemeStore();
  const { user, getMenuItems, getCurrentRoleDisplayName } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { isMobile, isSmall } = useResponsive();
  const siderRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  // 响应式处理
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true); // 移动端默认收起
    }
  }, [isMobile]);

  // 手势支持 - 滑动打开/关闭侧边栏
  useEffect(() => {
    if (!isMobile) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX.current;
      const deltaY = Math.abs(touchEndY - touchStartY.current);
      
      // 只有水平滑动距离大于垂直滑动距离时才响应
      if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 50) {
        if (deltaX > 0 && touchStartX.current < 50 && collapsed) {
          // 从左边缘向右滑动，打开侧边栏
          setCollapsed(false);
        } else if (deltaX < 0 && !collapsed) {
          // 向左滑动，关闭侧边栏
          setCollapsed(true);
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, collapsed]);

  // 根据当前路径获取选中的菜单项
  const getSelectedKey = () => {
    const { pathname } = location;
    if (pathname === '/' || pathname === '/dashboard') return 'dashboard';
    if (pathname.startsWith('/customers') || pathname.startsWith('/crm')) return 'crm';
    if (pathname.startsWith('/finance')) return 'finance';
    if (pathname.startsWith('/students') || pathname.startsWith('/student-log')) return 'student-log';
    if (pathname.startsWith('/reports')) return 'reports';
    if (pathname.startsWith('/settings')) return 'settings';
    return 'dashboard';
  };

  // 图标映射
  const iconMap = {
    dashboard: <DashboardOutlined />,
    crm: <TeamOutlined />,
    finance: <DollarOutlined />,
    'student-log': <BookOutlined />,
    'student-report': <BookOutlined />,
    reports: <BarChartOutlined />,
    settings: <SettingOutlined />,
  };

  // 基于角色获取菜单项
  const roleBasedMenuItems = getMenuItems();
  const menuItems = roleBasedMenuItems.map((item: any) => ({
    key: item.key,
    icon: iconMap[item.key as keyof typeof iconMap] || <DashboardOutlined />,
    label: item.label,
    path: item.path
  }));

  // 菜单点击处理
  const handleMenuClick = ({ key }: { key: string }) => {
    // 移动端点击菜单后自动收起
    if (isMobile) {
      setCollapsed(true);
    }

    // 根据菜单项配置的路径进行跳转
    const menuItem = menuItems.find((item: any) => item.key === key);
    if (menuItem) {
      navigate(menuItem.path);
    } else {
      navigate('/dashboard');
    }
  };

  // 切换侧边栏状态
  const toggleSider = () => {
    setCollapsed(!collapsed);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 侧边栏 */}
      <Sider 
        ref={siderRef}
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={250}
        collapsedWidth={isMobile ? 0 : 80}
        // ✅ **核心修复**：只保留这部分样式修改，解决动画冲突
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: isMobile ? 1001 : 100,
          background: theme === 'light' 
            ? 'rgba(255, 255, 255, 0.95)' 
            : 'rgba(20, 20, 20, 0.95)',
          // ✅ **核心修复**：优化默认的transition，使其更平滑
          transition: 'width 0.2s cubic-bezier(0.23, 1, 0.32, 1)',
          backdropFilter: isMobile ? 'none' : 'blur(8px)',
          WebkitBackdropFilter: isMobile ? 'none' : 'blur(8px)',
          borderRight: theme === 'light' 
            ? '1px solid rgba(0,0,0,0.06)' 
            : '1px solid rgba(255,255,255,0.12)',
          boxShadow: theme === 'light' 
            ? '2px 0 8px rgba(0,0,0,0.1)' 
            : '2px 0 8px rgba(0,0,0,0.3)',
          willChange: 'width', // ✅ **核心修复**：提示浏览器优化width动画
        }}
        breakpoint="md"
        onBreakpoint={(broken) => {
          if (broken) setCollapsed(true);
        }}
        theme={theme === 'dark' ? 'dark' : 'light'}
      >
        {/* 侧边栏内汉堡菜单 - 桌面端显示 */}
        {!isMobile && (
          <div style={{ 
            height: '64px', 
            margin: '16px 16px 0 16px', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleSider}
              style={{
                fontSize: '16px',
                width: 40,
                height: 40,
                color: theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.65)',
              }}
            />
            {!collapsed && (
              <Text style={{ 
                color: theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.85)', 
                fontWeight: 600,
                marginLeft: '12px'
              }}>
                教培管理系统
              </Text>
            )}
          </div>
        )}

        {/* 导航菜单 */}
        <Menu
          theme={theme === 'dark' ? 'dark' : 'light'}
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            border: 'none',
            background: 'transparent',
            marginTop: isMobile ? '16px' : '0',
          }}
        />
      </Sider>

      {/* 主布局容器 */}
      <Layout style={{ 
        marginLeft: isMobile ? 0 : (collapsed ? 80 : 250),
        transition: 'margin-left 0.2s cubic-bezier(0.23, 1, 0.32, 1)', // ✅ **核心修复**：与Sider动画同步
      }}>
        {/* 顶部导航栏 */}
        <AntHeader 
          style={{ 
            padding: '0 24px',
            background: theme === 'light' 
              ? 'rgba(255, 255, 255, 0.95)' 
              : 'rgba(20, 20, 20, 0.95)',
            // 🚀 性能优化：移动端禁用毛玻璃
            backdropFilter: isMobile ? 'none' : 'blur(8px)',
            WebkitBackdropFilter: isMobile ? 'none' : 'blur(8px)',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            boxShadow: theme === 'light' 
              ? '0 1px 8px rgba(0,0,0,0.1)' 
              : '0 1px 8px rgba(0,0,0,0.4)',
            position: 'sticky',
            top: 0,
            zIndex: isMobile ? 1000 : 99,
            borderBottom: theme === 'light' 
              ? '1px solid rgba(0,0,0,0.06)' 
              : '1px solid rgba(255,255,255,0.12)',
          }}>
          
          {/* 左侧：移动端汉堡菜单 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {isMobile && (
              <Button
                type="text"
                icon={<MenuUnfoldOutlined />}
                onClick={toggleSider}
                style={{
                  fontSize: '18px',
                  width: 44,
                  height: 44,
                  color: theme === 'dark' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.65)',
                }}
              />
            )}
          </div>

          {/* 中间：系统标题 */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <Text style={{ 
              fontSize: isSmall ? '16px' : '18px', 
              fontWeight: 600, 
              color: '#1890ff',
              display: isSmall ? 'none' : 'inline' // 超小屏隐藏标题
            }}>
              教培管理系统
            </Text>
          </div>

          {/* 右侧：用户信息和主题切换 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              type="text"
              shape="circle"
              icon={theme === 'light' ? <BulbOutlined /> : <BulbFilled />}
              onClick={toggleTheme}
              style={{
                fontSize: '16px',
                width: 40,
                height: 40,
                color: theme === 'dark' ? '#fadb14' : '#1890ff',
              }}
              title={theme === 'light' ? '切换到暗色模式' : '切换到亮色模式'}
            />
            <CustomHeader />
          </div>
        </AntHeader>

        {/* 主内容区 */}
        <Content style={{ 
          margin: isSmall ? '16px' : '24px',
          padding: isSmall ? '16px' : '24px',
          background: 'var(--ant-color-bg-container)',
          borderRadius: '12px',
          minHeight: 'calc(100vh - 112px)',
          overflow: 'auto',
          // 暗色模式下的渐变背景
          ...(theme === 'dark' && {
            background: 'linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%)',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          })
        }}>
          {children}
        </Content>

        {/* 页脚 */}
        <Footer style={{ 
          textAlign: 'center',
          padding: '12px 24px',
          background: 'transparent',
          color: 'var(--ant-color-text-secondary)',
          fontSize: '12px',
          display: isSmall ? 'none' : 'block' // 超小屏隐藏页脚
        }}>
          {import.meta.env.VITE_APP_TITLE || 'Admin System'} ©{new Date().getFullYear()}
        </Footer>
      </Layout>

      {/* 移动端遮罩层 */}
      {isMobile && !collapsed && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: theme === 'dark' 
              ? 'rgba(0, 0, 0, 0.7)' 
              : 'rgba(0, 0, 0, 0.45)',
            // 🚀 性能优化：移动端禁用毛玻璃，减少GPU负载
            backdropFilter: 'none',
            WebkitBackdropFilter: 'none',
            zIndex: 1000,
            // 🚀 性能优化：只过渡opacity
            transition: 'opacity 0.3s ease',
            cursor: 'pointer'
          }}
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* 滑动提示 - 仅在移动端首次访问显示 */}
      {isMobile && collapsed && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: '4px',
            height: '60px',
            background: 'linear-gradient(90deg, #1890ff, transparent)',
            borderRadius: '0 4px 4px 0',
            zIndex: 999,
            opacity: 0.6,
            animation: 'slideHint 3s ease-in-out infinite'
          }}
        />
      )}
    </Layout>
  );
};

export default AppLayout; 