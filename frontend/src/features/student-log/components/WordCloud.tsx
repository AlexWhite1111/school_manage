import React from 'react';
import { Empty } from 'antd';
import { useThemeStore } from '@/stores/themeStore';
import { useResponsive } from '@/hooks/useResponsive';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

interface WordCloudProps {
  data: Array<{
    text: string;
    value: number;
    type: 'positive' | 'negative';
  }>;
  loading?: boolean;
}

const WordCloud: React.FC<WordCloudProps> = ({ data, loading }) => {
  const { theme } = useThemeStore();
  const { isMobile } = useResponsive();

  if (loading) {
    return <SkeletonLoader variant="card" />;
  }

  const hasData = data && data.length > 0;

  if (!hasData) {
    return (
      <div style={{ minHeight: '200px', padding: isMobile ? '8px' : '16px' }}>
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无词云数据"
        />
      </div>
    );
  }

  // 找出最大值用于计算相对大小
  const maxValue = Math.max(...data.map(item => item.value));
  const minValue = Math.min(...data.map(item => item.value));

  // 计算字体大小
  const getFontSize = (value: number) => {
    const ratio = (value - minValue) / (maxValue - minValue || 1);
    const minSize = isMobile ? 12 : 14;
    const maxSize = isMobile ? 28 : 36;
    return minSize + ratio * (maxSize - minSize);
  };

  // 获取颜色
  const getColor = (type: 'positive' | 'negative', value: number) => {
    const intensity = (value - minValue) / (maxValue - minValue || 1);
    if (type === 'positive') {
      return `rgba(82, 196, 26, ${0.6 + intensity * 0.4})`;
    } else {
      return `rgba(255, 77, 79, ${0.6 + intensity * 0.4})`;
    }
  };

  // 生成随机位置和旋转角度
  const getRandomStyle = (index: number) => {
    const seed = index + data.length;
    const angle = (seed * 137.5) % 60 - 30; // -30 到 30 度
    return {
      transform: `rotate(${angle}deg)`,
      display: 'inline-block',
      margin: '4px 8px',
      transition: 'all 0.3s ease',
    };
  };

  return (
    <div style={{ 
      minHeight: '200px', 
      padding: isMobile ? '8px' : '16px',
      textAlign: 'center',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      lineHeight: 1.2
    }}>
      {data.map((item, index) => (
        <div
          key={`${item.text}-${index}`}
          style={{
            ...getRandomStyle(index),
            fontSize: `${getFontSize(item.value)}px`,
            color: getColor(item.type, item.value),
            fontWeight: 'bold',
            cursor: 'pointer',
            userSelect: 'none',
            textShadow: theme === 'dark' 
              ? '1px 1px 2px rgba(0,0,0,0.8)' 
              : '1px 1px 2px rgba(0,0,0,0.1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = `${getRandomStyle(index).transform} scale(1.1)`;
            e.currentTarget.style.textShadow = theme === 'dark' 
              ? '2px 2px 4px rgba(0,0,0,0.9)' 
              : '2px 2px 4px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = getRandomStyle(index).transform;
            e.currentTarget.style.textShadow = theme === 'dark' 
              ? '1px 1px 2px rgba(0,0,0,0.8)' 
              : '1px 1px 2px rgba(0,0,0,0.1)';
          }}
          title={`${item.text}: ${item.value}次`}
        >
          {item.text}
        </div>
      ))}
    </div>
  );
};

export default WordCloud; 