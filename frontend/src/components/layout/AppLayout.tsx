import AppButton from '@/components/AppButton';
import React, { useState, useEffect, useRef } from 'react';
import { Layout, Menu, Typography } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  SunOutlined, 
  MoonOutlined, 
  MenuFoldOutlined, 
  MenuUnfoldOutlined,
  LeftOutlined,
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
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { getAppTokens, semanticTokens, semanticTokensDark } from '@/theme/tokens';
import BottomNavigation, { BOTTOM_NAV_HEIGHT } from './BottomNavigation';

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
  const appTokens = getAppTokens(theme);
  const baseTokens = theme === 'dark' ? semanticTokensDark : semanticTokens;
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const showBackButton = pathSegments.length > 1;

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
    if (pathname.startsWith('/reports') || pathname.startsWith('/analytics')) return 'reports';
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

  // 持久化每个路由的滚动位置（顶层调用 Hook）
  useScrollRestoration(
    location.pathname,
    (typeof document !== 'undefined' ? document.getElementById('app-content') : null) as any
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 桌面端侧边栏 - 仅在非移动端显示 */}
      {!isMobile && (
      <Sider 
        ref={siderRef}
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        collapsedWidth={70}
        // ✅ **核心修复**：只保留这部分样式修改，解决动画冲突
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          background: 'var(--app-glass-bg)',
          // ✅ **核心修复**：优化默认的transition，使其更平滑
          transition: 'width 0.2s cubic-bezier(0.23, 1, 0.32, 1)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRight: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'}`,
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
            <AppButton
              hierarchy="tertiary"
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
                自然教育
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
            marginTop: '0',
          }}
        />
      </Sider>
      )}

      {/* 主布局容器 */}
       <Layout style={{ 
        marginLeft: isMobile ? 0 : (collapsed ? 70 : 220),
        transition: 'margin-left 0.2s cubic-bezier(0.23, 1, 0.32, 1)', // ✅ **核心修复**：与Sider动画同步
      }}>
        {/* 顶部导航栏 */}
        <AntHeader 
          style={{ 
            padding: '0 24px',
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)',
            background: 'var(--app-glass-bg)',
            // 🚀 性能优化：移动端禁用毛玻璃
            backdropFilter: isMobile ? 'none' : 'blur(8px)',
            WebkitBackdropFilter: isMobile ? 'none' : 'blur(8px)',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            height: 'auto',
            boxShadow: theme === 'light' 
              ? '0 1px 8px var(--ant-color-border-secondary)' 
              : '0 1px 8px var(--ant-color-fill-tertiary)',
            position: 'sticky',
            top: 0,
            zIndex: isMobile ? 1000 : 99,
            borderBottom: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'}`,
          }}>
          
          {/* 左侧：返回键（分页面） */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {showBackButton && (
              <AppButton
                hierarchy="tertiary"
                shape="circle"
                icon={<LeftOutlined />}
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    navigate('/dashboard');
                  }
                }}
                style={{
                  fontSize: '18px',
                  width: 44,
                  height: 44,
                  color: 'var(--ant-color-text-secondary)'
                }}
                title="返回"
              />
            )}
          </div>

          {/* 中间：系统标题 */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <Text style={{ 
              fontSize: isSmall ? '16px' : '18px', 
              fontWeight: 600, 
              color: 'var(--ant-color-primary)',
              display: isSmall ? 'none' : 'inline' // 超小屏隐藏标题
            }}>
              自然教育
            </Text>
          </div>

          {/* 右侧：用户信息和主题切换 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AppButton
              hierarchy="tertiary"
              shape="circle"
              icon={theme === 'light' ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleTheme}
              style={{
                fontSize: '18px',
                width: 44,
                height: 44,
                // 简化：仅以图标用色表达状态，去除自定义背景/边框
                color: theme === 'dark' ? baseTokens.color.warning : baseTokens.color.primary,
              }}
              title={theme === 'light' ? '切换到暗色模式' : '切换到亮色模式'}
            />
            <CustomHeader />
          </div>
        </AntHeader>

        {/* 主内容区（统一交由 data-page-container 控制内边距/底部安全区） */}
        <Content id="app-content" style={{ 
          margin: 0,
          padding: 0,
          background: 'transparent',
          borderRadius: 0,
          minHeight: 'calc(100vh - 112px)',
          overflow: 'auto',
          // 使出现纵向滚动条时左右留白保持对称（Windows 下尤为明显）
          scrollbarGutter: 'stable both-edges'
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
          教育CRM系统 ©{new Date().getFullYear()}
        </Footer>
      </Layout>

      {/* 移动端底部导航栏 */}
      {isMobile && <BottomNavigation />}
    </Layout>
  );
};

export default AppLayout;