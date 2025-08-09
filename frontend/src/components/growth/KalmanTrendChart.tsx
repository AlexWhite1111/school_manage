import React, { useMemo } from 'react';
import { Card, Select, DatePicker, Switch, Tooltip, Space, Tag } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Line } from '@ant-design/charts';
import { ChartData, ChartFilters } from '../../api/growthApi';
import { growthUtils } from '../../utils/growthUtils';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

interface KalmanTrendChartProps {
  data: ChartData;
  loading?: boolean;
  onFiltersChange?: (filters: ChartFilters) => void;
  showControls?: boolean;
  height?: number;
}

const KalmanTrendChart: React.FC<KalmanTrendChartProps> = ({
  data,
  loading = false,
  onFiltersChange,
  showControls = true,
  height = 400
}) => {
  // 处理图表数据
  const chartData = useMemo(() => {
    if (!data?.timeSeriesData) return [];

    const result: any[] = [];

    data.timeSeriesData.forEach(point => {
      const date = point.date;
      
      // 实际水平线
      result.push({
        date,
        value: point.level,
        type: '预估水平',
        category: 'level'
      });

      // 趋势线
      result.push({
        date,
        value: point.trend,
        type: '趋势速度',
        category: 'trend'
      });

      // 置信区间上界
      result.push({
        date,
        value: point.confidenceUpper,
        type: '置信区间上界',
        category: 'confidence'
      });

      // 置信区间下界
      result.push({
        date,
        value: point.confidenceLower,
        type: '置信区间下界',
        category: 'confidence'
      });

      // 实际事件点（如果有观测）
      if (point.actualEvents > 0) {
        result.push({
          date,
          value: point.level,
          type: '实际观测',
          category: 'actual',
          size: Math.min(point.actualEvents * 2, 10) // 根据事件数量调整点的大小
        });
      }
    });

    return result;
  }, [data]);

  // 图表配置
  const config = {
    data: chartData,
    xField: 'date',
    yField: 'value',
    seriesField: 'type',
    height,
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000,
      },
    },
    color: (datum: any) => {
      switch (datum.type) {
        case '预估水平':
          return '#1890ff';
        case '趋势速度':
          return '#52c41a';
        case '置信区间上界':
        case '置信区间下界':
          return '#d9d9d9';
        case '实际观测':
          return '#ff4d4f';
        default:
          return '#666';
      }
    },
    lineStyle: (datum: any) => {
      if (datum.type.includes('置信区间')) {
        return {
          lineDash: [4, 4],
          opacity: 0.6
        };
      }
      return {
        lineWidth: datum.type === '预估水平' ? 3 : 2
      };
    },
    point: {
      size: (datum: any) => {
        if (datum.type === '实际观测') {
          return datum.size || 4;
        }
        return 0; // 其他线不显示点
      },
      style: (datum: any) => {
        if (datum.type === '实际观测') {
          return {
            fill: '#ff4d4f',
            stroke: '#fff',
            lineWidth: 2
          };
        }
        return {};
      }
    },
    area: {
      style: (datum: any) => {
        // 为置信区间添加填充区域
        if (datum.type.includes('置信区间')) {
          return {
            fill: '#1890ff',
            fillOpacity: 0.1
          };
        }
        return null;
      }
    },
    tooltip: {
      formatter: (datum: any) => {
        const value = typeof datum.value === 'number' ? datum.value.toFixed(3) : datum.value;
        let unit = '';
        
        if (datum.type === '趋势速度') {
          unit = '/天';
        } else if (datum.type === '实际观测') {
          return {
            name: datum.type,
            value: `${value} (${datum.size/2}次观测)`
          };
        }
        
        return {
          name: datum.type,
          value: value + unit
        };
      }
    },
    legend: {
      position: 'top',
      itemName: {
        formatter: (text: string) => {
          const nameMap: Record<string, string> = {
            '预估水平': '预估水平 (μ)',
            '趋势速度': '趋势速度 (ν)',
            '置信区间上界': '95%置信区间',
            '置信区间下界': '95%置信区间',
            '实际观测': '实际观测点'
          };
          return nameMap[text] || text;
        }
      }
    },
    xAxis: {
      type: 'time',
      tickCount: 8,
      label: {
        formatter: (text: string) => {
          return dayjs(text).format('MM-DD');
        }
      }
    },
    yAxis: {
      label: {
        formatter: (text: string) => {
          return parseFloat(text).toFixed(1);
        }
      },
      grid: {
        line: {
          style: {
            stroke: '#f0f0f0',
            lineWidth: 1,
            lineDash: [3, 3]
          }
        }
      }
    },
    annotations: data?.currentState ? [
      {
        type: 'line',
        start: ['min', data.currentState.level],
        end: ['max', data.currentState.level],
        style: {
          stroke: '#ff4d4f',
          lineDash: [2, 2],
          opacity: 0.6
        },
        text: {
          content: `当前水平: ${data.currentState.level.toFixed(2)}`,
          position: 'end',
          style: {
            textAlign: 'end',
            fontSize: 12,
            fill: '#ff4d4f'
          }
        }
      }
    ] : []
  };

  const handlePeriodChange = (period: string) => {
    onFiltersChange?.({ period: period as any });
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates.length === 2) {
      onFiltersChange?.({
        startDate: dates[0].format('YYYY-MM-DD'),
        endDate: dates[1].format('YYYY-MM-DD')
      });
    } else {
      onFiltersChange?.({
        startDate: undefined,
        endDate: undefined
      });
    }
  };

  const handleConfidenceToggle = (checked: boolean) => {
    onFiltersChange?.({ includeConfidence: checked });
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <span>成长趋势分析</span>
            {data && (
              <Tag color={data.sentiment === 'POSITIVE' ? 'green' : 'red'}>
                {data.tagName}
              </Tag>
            )}
          </Space>
          <Tooltip title="基于卡尔曼滤波器的动态趋势预测，置信区间反映预测的不确定性">
            <InfoCircleOutlined style={{ color: '#999' }} />
          </Tooltip>
        </div>
      }
      loading={loading}
      style={{ marginBottom: '16px' }}
    >
      {showControls && (
        <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <span style={{ marginRight: '8px' }}>时间周期:</span>
            <Select
              defaultValue="month"
              style={{ width: 120 }}
              onChange={handlePeriodChange}
            >
              <Option value="week">最近一周</Option>
              <Option value="month">最近一月</Option>
              <Option value="quarter">最近三月</Option>
              <Option value="year">最近一年</Option>
            </Select>
          </div>

          <div>
            <span style={{ marginRight: '8px' }}>自定义范围:</span>
            <RangePicker
              onChange={handleDateRangeChange}
              format="YYYY-MM-DD"
              placeholder={['开始日期', '结束日期']}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '8px' }}>显示置信区间:</span>
            <Switch
              defaultChecked
              onChange={handleConfidenceToggle}
            />
          </div>
        </div>
      )}

      {data?.currentState && (
        <div style={{ 
          marginBottom: '16px', 
          padding: '12px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '6px',
          display: 'flex',
          justifyContent: 'space-around'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
              {data.currentState.level.toFixed(2)}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>当前水平 (μ)</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: growthUtils.getColorByTrend(growthUtils.getTrendDirection(data.currentState.trend))
            }}>
              {data.currentState.trend > 0 ? '+' : ''}{data.currentState.trend.toFixed(3)}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>趋势速度 (ν)</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
              {growthUtils.formatConfidence(data.currentState.confidence)}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>置信度</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#666' }}>
              最后更新: {growthUtils.formatTimeAgo(data.currentState.lastUpdated)}
            </div>
          </div>
        </div>
      )}

      <Line {...config} />

      <div style={{ 
        marginTop: '12px', 
        fontSize: '12px', 
        color: '#666',
        padding: '8px',
        backgroundColor: '#fafafa',
        borderRadius: '4px'
      }}>
        <InfoCircleOutlined style={{ marginRight: '4px' }} />
        <strong>图表说明：</strong>
        蓝色实线为卡尔曼滤波器预估的成长水平，绿色线为趋势变化速度，
        灰色虚线为95%置信区间，红色点为实际观测记录。
        趋势速度为正表示改善，为负表示下降。
      </div>
    </Card>
  );
};

export default KalmanTrendChart; 