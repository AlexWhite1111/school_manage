import React, { useEffect } from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { BrowserRouter } from 'react-router-dom';
import { useThemeStore } from '@/stores/themeStore';
import { getAntdTheme } from '@/theme/antdTheme';
import AppRouter from '@/routes/AppRouter';
import './index.css';

function App() {
  const { theme } = useThemeStore();

  // 为document添加主题数据属性，用于CSS选择器
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
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