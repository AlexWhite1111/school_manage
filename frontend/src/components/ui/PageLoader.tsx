import React from 'react';
import { Spin } from 'antd';

interface PageLoaderProps {
  fullScreen?: boolean;
}

const PageLoader: React.FC<PageLoaderProps> = ({ fullScreen = false }) => {
  if (fullScreen) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Spin size="large" />
      </div>
    );
  }
  return <Spin />;
};

export default PageLoader; 