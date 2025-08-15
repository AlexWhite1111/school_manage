import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useThemeStore } from '@/stores/themeStore';
import { getAppTokens, semanticTokens, semanticTokensDark } from '@/theme/tokens';
import {
  DashboardOutlined,
  TeamOutlined,
  DollarOutlined,
  BookOutlined,
  BarChartOutlined,
  SettingOutlined
} from '@ant-design/icons';

// 统一的底部导航高度（包含安全区时会额外加上）
export const BOTTOM_NAV_HEIGHT = 56;

const iconMap: Record<string, React.ReactNode> = {
  dashboard: <DashboardOutlined />,
  crm: <TeamOutlined />,
  finance: <DollarOutlined />,
  'student-log': <BookOutlined />,
  'student-report': <BookOutlined />,
  reports: <BarChartOutlined />,
  settings: <SettingOutlined />,
};

const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useThemeStore();
  const { getMenuItems } = usePermissions();

  const baseTokens = theme === 'dark' ? semanticTokensDark : semanticTokens;
  const appTokens = getAppTokens(theme);

  const menuItems = getMenuItems();

  const getSelectedKey = (): string => {
    const pathname = location.pathname;
    if (pathname === '/' || pathname === '/dashboard') return 'dashboard';
    if (pathname.startsWith('/customers') || pathname.startsWith('/crm')) return 'crm';
    if (pathname.startsWith('/finance')) return 'finance';
    if (pathname.startsWith('/students') || pathname.startsWith('/student-log')) return 'student-log';
    if (pathname.startsWith('/reports') || pathname.startsWith('/analytics')) return 'reports';
    if (pathname.startsWith('/settings')) return 'settings';
    return 'dashboard';
  };

  const selectedKey = getSelectedKey();

  return (
    <nav
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: BOTTOM_NAV_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        gap: 4,
        background: 'var(--app-glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: `1px solid ${baseTokens.border.divider}`,
        boxShadow: theme === 'light' 
          ? '0 -6px 18px rgba(0,0,0,0.06)' 
          : '0 -6px 18px rgba(0,0,0,0.4)',
        zIndex: 1001,
        padding: '6px 8px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)'
      }}
    >
      {menuItems.map((item: any) => {
        const isActive = item.key === selectedKey;
        const color = isActive ? baseTokens.color.primary : 'var(--ant-color-text-tertiary)';
        return (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            style={{
              flex: 1,
              height: '100%',
              border: 'none',
              background: 'transparent',
              color,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0,
              fontSize: 0,
              borderRadius: 8,
              padding: 6,
            }}
            aria-label={item.label}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>{iconMap[item.key] || <DashboardOutlined />}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNavigation;

