import React from 'react';
import { Empty, Typography } from 'antd';
import { SmileOutlined, FrownOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useThemeStore } from '@/stores/themeStore';
import { useResponsive } from '@/hooks/useResponsive';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

const { Text } = Typography;

interface TrendChartProps {
  data: Array<{
    date: string;
    positive: number;
    negative: number;
  }>;
  showPositive: boolean;
  showNegative: boolean;
  loading?: boolean;
}

const TrendChart: React.FC<TrendChartProps> = ({ data, showPositive, showNegative, loading }) => {
  const { theme } = useThemeStore();
  const { isMobile } = useResponsive();

  if (loading) {
    return <SkeletonLoader variant="card" />;
  }

  const hasData = data && data.length > 0;

  if (!hasData) {
    return (
      <div style={{ minHeight: '300px', padding: isMobile ? '8px' : '16px' }}>
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="该时段内无标签数据"
        />
      </div>
    );
  }

  // 格式化数据用于图表显示
  const chartData = data.map(item => ({
    date: dayjs(item.date).format('MM-DD'),
    positive: showPositive ? item.positive : 0,
    negative: showNegative ? item.negative : 0,
    positiveValue: item.positive,
    negativeValue: item.negative
  }));

  return (
    <div style={{ minHeight: '300px', padding: isMobile ? '8px' : '16px' }}>
      <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#52c41a" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#52c41a" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff4d4f" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ff4d4f" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={theme === 'dark' ? '#434343' : '#f0f0f0'} 
          />
          <XAxis 
            dataKey="date" 
            tick={{ 
              fontSize: isMobile ? 10 : 12, 
              fill: theme === 'dark' ? '#a0a0a0' : '#666' 
            }}
            axisLine={{ stroke: theme === 'dark' ? '#434343' : '#d9d9d9' }}
          />
          <YAxis 
            tick={{ 
              fontSize: isMobile ? 10 : 12, 
              fill: theme === 'dark' ? '#a0a0a0' : '#666' 
            }}
            axisLine={{ stroke: theme === 'dark' ? '#434343' : '#d9d9d9' }}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div style={{
                    background: theme === 'dark' ? '#1f1f1f' : '#fff',
                    border: `1px solid ${theme === 'dark' ? '#434343' : '#d9d9d9'}`,
                    borderRadius: '6px',
                    padding: '8px 12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}>
                    <Text style={{ fontWeight: 'bold', marginBottom: '4px', display: 'block' }}>
                      {label}
                    </Text>
                    {payload.map((entry: any, index: number) => {
                      if (entry.dataKey === 'positive' && showPositive && entry.payload.positiveValue > 0) {
                        return (
                          <div key={index} style={{ color: '#52c41a', fontSize: '12px' }}>
                            <SmileOutlined style={{ marginRight: '4px' }} />
                            正面标签: {entry.payload.positiveValue}
                          </div>
                        );
                      }
                      if (entry.dataKey === 'negative' && showNegative && entry.payload.negativeValue > 0) {
                        return (
                          <div key={index} style={{ color: '#ff4d4f', fontSize: '12px' }}>
                            <FrownOutlined style={{ marginRight: '4px' }} />
                            负面标签: {entry.payload.negativeValue}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend 
            wrapperStyle={{ 
              fontSize: isMobile ? '11px' : '12px',
              color: theme === 'dark' ? '#a0a0a0' : '#666'
            }}
          />
          
          {showPositive && (
            <Area
              type="monotone"
              dataKey="positive"
              stroke="#52c41a"
              strokeWidth={2}
              fill="url(#positiveGradient)"
              name="正面标签"
              connectNulls={false}
            />
          )}
          
          {showNegative && (
            <Area
              type="monotone"
              dataKey="negative"
              stroke="#ff4d4f"
              strokeWidth={2}
              fill="url(#negativeGradient)"
              name="负面标签"
              connectNulls={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart; 