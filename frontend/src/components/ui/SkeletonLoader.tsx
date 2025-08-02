import React from 'react';
import { Skeleton, SkeletonProps } from 'antd';

export interface SkeletonLoaderProps extends SkeletonProps {
  variant?: 'text' | 'card' | 'list' | 'avatar' | 'financial';
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  variant = 'text', 
  ...skeletonProps 
}) => {
  const getSkeletonConfig = () => {
    switch (variant) {
      case 'card':
        return {
          active: true,
          paragraph: { rows: 3, width: ['100%', '80%', '60%'] },
          title: { width: '40%' },
        };
      
      case 'list':
        return {
          active: true,
          avatar: true,
          paragraph: { rows: 2, width: ['100%', '80%'] },
          title: { width: '60%' },
        };
      
      case 'avatar':
        return {
          active: true,
          avatar: { size: 'large' as const, shape: 'circle' as const },
          paragraph: { rows: 1, width: '50%' },
          title: false,
        };
      
      case 'financial':
        return {
          active: true,
          paragraph: { 
            rows: 3, 
            width: ['30%', '50%', '40%'] 
          },
          title: { width: '25%' },
        };
      
      case 'text':
      default:
        return {
          active: true,
          paragraph: { rows: 2, width: ['100%', '60%'] },
          title: { width: '40%' },
        };
    }
  };

  return (
    <Skeleton 
      {...getSkeletonConfig()} 
      {...skeletonProps} 
    />
  );
};

export default SkeletonLoader; 