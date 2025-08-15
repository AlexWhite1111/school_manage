import { useEffect } from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { BrowserRouter } from 'react-router-dom';
import { useThemeStore } from '@/stores/themeStore';
import { getAntdTheme } from '@/theme/tokens';
import { applyAppCssVars } from '@/theme/tokens';
import AppRouter from '@/routes/AppRouter';
import './index.css';

function App() {
  const { theme } = useThemeStore();

  // 为document添加主题数据属性，用于CSS选择器
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    applyAppCssVars(theme);
  }, [theme]);

  return (
    <ConfigProvider 
      locale={zhCN}
      theme={getAntdTheme(theme)}
    >
      <AntApp>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;