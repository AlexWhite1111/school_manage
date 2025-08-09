import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Empty, theme, Tooltip, Button, Space } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import html2canvas from 'html2canvas';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

interface WordDatum {
  text: string;
  value: number;
  type?: 'positive' | 'negative';
}

export interface IntelligentWordCloudProps {
  data: WordDatum[];
  loading?: boolean;
  maxWords?: number;
  height?: number;
  width?: number;
  enableAnimation?: boolean;
  enableTooltip?: boolean;
  colorScheme?: 'default' | 'gradient' | 'semantic';
  allowExport?: boolean;
  exportName?: string;
}

interface WordPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  word: WordDatum;
  rotation: number;
}

/**
 * IntelligentWordCloud - 智能词云组件
 * 特性：
 * 1. 智能布局算法，防止词条重叠和超出边界
 * 2. 螺旋式布局，优化空间利用率
 * 3. 自适应字体大小和颜色
 * 4. 支持动画和交互效果
 * 5. 响应式设计
 */
const IntelligentWordCloud: React.FC<IntelligentWordCloudProps> = ({
  data,
  loading = false,
  maxWords = 50,
  height = 300,
  width,
  enableAnimation = true,
  enableTooltip = true,
  colorScheme = 'semantic',
  allowExport = true,
  exportName = 'wordcloud',
}) => {
  const { token } = theme.useToken();
  const containerRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [positions, setPositions] = useState<WordPosition[]>([]);

  // 导出功能
  const handleExport = async () => {
    if (!exportRef.current) return;
    const canvas = await html2canvas(exportRef.current, {
      backgroundColor: undefined,
      useCORS: true,
    });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportName}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  // 监听容器尺寸变化
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({
          width: width || rect.width,
          height: height
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [width, height]);

  // 数据处理和位置计算
  const processedPositions = useMemo(() => {
    if (!data || data.length === 0 || containerSize.width === 0) return [];

    // 按value排序并限制数量，优先显示重要词汇
    const sortedData = [...data]
      .sort((a, b) => b.value - a.value)
      .slice(0, Math.min(maxWords, Math.floor(containerSize.width * containerSize.height / 2000))); // 根据容器大小动态调整最大词数

    if (sortedData.length === 0) return [];

    const maxValue = Math.max(...sortedData.map(d => d.value));
    const minValue = Math.min(...sortedData.map(d => d.value));
    
    // 优化的字体大小计算，减少基于数量的大小差异，避免误导
    const getFontSize = (value: number, index: number) => {
      const ratio = maxValue === minValue ? 1 : (value - minValue) / (maxValue - minValue);
      const baseMinSize = Math.max(12, containerSize.width * 0.02);
      const baseMaxSize = Math.min(32, containerSize.width * 0.05); // 减小最大字体
      
      // 减小字体大小差异，避免误导重点
      const densityFactor = Math.max(0.8, 1 - sortedData.length / 120);
      const minSize = baseMinSize * densityFactor;
      const maxSize = baseMaxSize * densityFactor;
      
      // 减少基于排序的重要性差异
      const importanceFactor = index < 3 ? 1.05 : 1; // 只对前3个词稍微加大
      
      // 使用平方根来减少大小差异
      const adjustedRatio = Math.sqrt(ratio);
      
      return (minSize + adjustedRatio * (maxSize - minSize)) * importanceFactor;
    };

    // 优化的颜色获取，增强正负性对比
    const getColor = (item: WordDatum, index: number) => {
      if (colorScheme === 'semantic') {
        if (item.type === 'negative') {
          // 负面词条使用更明显的红色系
          return '#ff4d4f'; // 更鲜明的红色
        }
        if (item.type === 'positive') {
          // 正面词条使用更明显的绿色系
          return '#52c41a'; // 更鲜明的绿色
        }
        // 中性词条使用蓝色系
        return '#1890ff';
      }
      
      if (colorScheme === 'gradient') {
        const hue = (index * 137.508) % 360; // 黄金角度分布
        return `hsl(${hue}, 70%, 50%)`;
      }
      
      // default colorScheme - 使用更丰富的颜色
      const colors = [
        '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
        '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb'
      ];
      return colors[index % colors.length];
    };

    // 创建临时canvas来精确测量文字尺寸
    const measureText = (text: string, fontSize: number): { width: number; height: number } => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return { width: text.length * fontSize * 0.6, height: fontSize * 1.2 };
      
      ctx.font = `${fontSize}px ${token.fontFamily || 'Arial'}`;
      const metrics = ctx.measureText(text);
      
      return {
        width: metrics.width + 4, // 添加一些padding
        height: fontSize * 1.3 // 考虑行高
      };
    };

    // 改进的碰撞检测函数
    const isColliding = (rect1: any, rect2: any, padding = 8) => {
      return !(
        rect1.x + rect1.width + padding < rect2.x ||
        rect2.x + rect2.width + padding < rect1.x ||
        rect1.y + rect1.height + padding < rect2.y ||
        rect2.y + rect2.height + padding < rect1.y
      );
    };

    // 改进的螺旋式布局算法
    const calculatePositions = (): WordPosition[] => {
      const positions: WordPosition[] = [];
      const centerX = containerSize.width / 2;
      const centerY = containerSize.height / 2;
      const maxRadius = Math.min(containerSize.width, containerSize.height) / 2 - 30;

      for (let i = 0; i < sortedData.length; i++) {
        const word = sortedData[i];
        const fontSize = getFontSize(word.value, i);
        const color = getColor(word, i);
        
        // 精确测量文字尺寸
        const { width: textWidth, height: textHeight } = measureText(word.text, fontSize);
        
        let placed = false;
        let attempts = 0;
        const maxAttempts = 800; // 增加尝试次数
        let currentFontSize = fontSize;
        let currentWidth = textWidth;
        let currentHeight = textHeight;
        
        // 多层螺旋搜索
        while (!placed && attempts < maxAttempts) {
          // 使用更细密的螺旋
          const angle = attempts * 0.05; // 减小角度步长
          const radius = Math.min(angle * 1.5, maxRadius); // 减小半径增长速度
          
          // 去除随机偏移，保持确定性布局
          const randomOffset = { x: 0, y: 0 };
          
          const x = centerX + radius * Math.cos(angle) - currentWidth / 2 + randomOffset.x;
          const y = centerY + radius * Math.sin(angle) - currentHeight / 2 + randomOffset.y;
          
          // 确保在边界内，留更多边距
          const margin = 15;
          const boundedX = Math.max(margin, Math.min(x, containerSize.width - currentWidth - margin));
          const boundedY = Math.max(margin, Math.min(y, containerSize.height - currentHeight - margin));
          
          const newRect = {
            x: boundedX,
            y: boundedY,
            width: currentWidth,
            height: currentHeight
          };
          
          // 检查碰撞
          const hasCollision = positions.some(pos => 
            isColliding(newRect, {
              x: pos.x,
              y: pos.y,
              width: pos.width,
              height: pos.height
            })
          );
          
          if (!hasCollision) {
            positions.push({
              x: boundedX,
              y: boundedY,
              width: currentWidth,
              height: currentHeight,
              fontSize: currentFontSize,
              color,
              word,
              rotation: 0
            });
            placed = true;
          } else {
            // 每100次尝试后逐步缩小字体
            if (attempts > 0 && attempts % 100 === 0 && currentFontSize > 10) {
              currentFontSize *= 0.85;
              const newMeasurement = measureText(word.text, currentFontSize);
              currentWidth = newMeasurement.width;
              currentHeight = newMeasurement.height;
            }
          }
          
          attempts++;
        }
        
        // 最后的强制放置策略
        if (!placed) {
          // 使用最小字体尝试网格放置
          const minFontSize = Math.max(8, containerSize.width * 0.015);
          const minMeasurement = measureText(word.text, minFontSize);
          
          // 网格搜索
          const gridSize = 20;
          let gridPlaced = false;
          
          for (let gx = 15; gx < containerSize.width - minMeasurement.width - 15 && !gridPlaced; gx += gridSize) {
            for (let gy = 15; gy < containerSize.height - minMeasurement.height - 15 && !gridPlaced; gy += gridSize) {
              const gridRect = {
                x: gx,
                y: gy,
                width: minMeasurement.width,
                height: minMeasurement.height
              };
              
              const hasGridCollision = positions.some(pos => 
                isColliding(gridRect, {
                  x: pos.x,
                  y: pos.y,
                  width: pos.width,
                  height: pos.height
                }, 6)
              );
              
              if (!hasGridCollision) {
                positions.push({
                  x: gx,
                  y: gy,
                  width: minMeasurement.width,
                  height: minMeasurement.height,
                  fontSize: minFontSize,
                  color,
                  word,
                  rotation: 0
                });
                gridPlaced = true;
              }
            }
          }
          
          // 如果网格搜索也失败，则跳过这个词
          if (!gridPlaced) {
            console.warn(`无法放置词条: ${word.text}`);
          }
        }
      }
      
      return positions;
    };

    return calculatePositions();
  }, [data, maxWords, containerSize, token, colorScheme]);

  // 更新位置状态
  useEffect(() => {
    setPositions(processedPositions);
  }, [processedPositions]);

  if (loading) {
    return <SkeletonLoader variant="card" style={{ height }} />;
  }

  if (!data || data.length === 0) {
    return (
      <div
        style={{ 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: token.colorBgContainer,
          borderRadius: token.borderRadius 
        }}
      >
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无词云数据" />
      </div>
    );
  }

  const WordElement: React.FC<{ position: WordPosition; index: number }> = ({ position, index }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    const wordStyle: React.CSSProperties = {
      position: 'absolute',
      left: position.x,
      top: position.y,
      fontSize: `${position.fontSize}px`,
      color: position.color,
      fontFamily: token.fontFamily,
      fontWeight: position.fontSize > 24 ? 'bold' : 'normal',
      cursor: 'pointer',
      userSelect: 'none',
      whiteSpace: 'nowrap',
      transform: `rotate(${position.rotation}deg) ${isHovered ? 'scale(1.1)' : 'scale(1)'}`,
      transition: enableAnimation ? 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
      opacity: isHovered ? 0.8 : 1,
      textShadow: isHovered ? `0 0 8px ${position.color}40` : 'none',
      animationDelay: enableAnimation ? `${index * 0.1}s` : '0s',
      animation: enableAnimation ? 'wordFadeIn 0.6s ease-out forwards' : 'none',
    };

    const content = (
      <span
        style={wordStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          console.log('Clicked word:', position.word.text, 'value:', position.word.value);
        }}
      >
        {position.word.text}
      </span>
    );

    if (enableTooltip) {
      return (
        <Tooltip 
          title={`${position.word.text}: ${position.word.value}${position.word.type ? ` (${position.word.type})` : ''}`}
          placement="top"
        >
          {content}
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <div style={{ position: 'relative' }}>
      <style>
        {`
          @keyframes wordFadeIn {
            from {
              opacity: 0;
              transform: scale(0.5) rotate(0deg);
            }
            to {
              opacity: 1;
              transform: scale(1) rotate(0deg);
            }
          }
        `}
      </style>
      <div
        ref={exportRef}
        style={{
          height,
          width: width || '100%',
          background: `linear-gradient(135deg, ${token.colorBgContainer} 0%, ${token.colorFillAlter} 100%)`,
          borderRadius: token.borderRadius,
          position: 'relative',
          overflow: 'hidden',
          border: `1px solid ${token.colorBorder}`,
          boxShadow: token.boxShadow,
        }}
      >
        <div
          ref={containerRef}
          style={{
            height: '100%',
            width: '100%',
            position: 'relative',
          }}
        >
          {positions.map((position, index) => (
            <WordElement 
              key={`${position.word.text}-${index}`} 
              position={position} 
              index={index}
            />
          ))}
          
          {/* 统计信息 */}
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              background: `${token.colorBgContainer}90`,
              padding: '4px 8px',
              borderRadius: token.borderRadius,
              fontSize: '12px',
              color: token.colorTextSecondary,
              backdropFilter: 'blur(4px)',
            }}
          >
            {positions.length} / {data.length} 词条
          </div>
        </div>
      </div>
      
      {/* 导出按钮 */}
      {allowExport && (
        <Space style={{ position: 'absolute', top: 8, right: 8 }}>
          <Button size="small" icon={<DownloadOutlined />} onClick={handleExport}>
            导出 PNG
          </Button>
        </Space>
      )}
    </div>
  );
};

export default IntelligentWordCloud;