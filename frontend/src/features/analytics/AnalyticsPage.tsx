import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Tabs, 
  DatePicker, 
  Select, 
  Switch, 
  Row, 
  Col, 
  Typography, 
  Spin,
  Alert,
  Button
} from 'antd';
import { 
  CalendarOutlined, 
  BarChartOutlined, 
  ReloadOutlined 
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import CustomerAnalyticsTab from './components/CustomerAnalyticsTab';
import StudentAnalyticsTab from './components/StudentAnalyticsTab';
import { calculateTimeRangeParams, createCustomTimeRangeParams } from '@/api/analyticsApi';
import type { AnalyticsTimeRangeParams } from '@/types/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

/**
 * 数据分析主页面
 */
const AnalyticsPage: React.FC = () => {
  // ===============================
  // 状态管理
  // ===============================
  
  const [activeTab, setActiveTab] = useState<'customer' | 'student'>('customer');
  const [timeRangeType, setTimeRangeType] = useState<'7' | '15' | '30' | '90' | '180' | '365' | 'custom'>('90');
  const [customDateRange, setCustomDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [enableComparison, setEnableComparison] = useState<boolean>(false);
  const [comparisonType, setComparisonType] = useState<'previous_period' | 'same_period_last_year'>('previous_period');
  const [timeParams, setTimeParams] = useState<AnalyticsTimeRangeParams | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // ===============================
  // 计算时间参数
  // ===============================
  
  useEffect(() => {
    // 1. 当用户选中"自定义范围"但尚未真正选择日期时，不应计算参数，直接清空即可；
    if (timeRangeType === 'custom' && !customDateRange) {
      setTimeParams(null);
      return;
    }

    let params: AnalyticsTimeRangeParams;

    if (timeRangeType === 'custom' && customDateRange) {
      const [start, end] = customDateRange;
      params = createCustomTimeRangeParams(
        start.format('YYYY-MM-DD'),
        end.format('YYYY-MM-DD'),
        enableComparison,
        comparisonType
      );
    } else {
      const days = parseInt(timeRangeType, 10);
      if (isNaN(days)) {
        // 理论上不会发生，但添加保护避免意外值导致崩溃
        setTimeParams(null);
        return;
      }
      params = calculateTimeRangeParams(days, enableComparison, comparisonType);
    }

    setTimeParams(params);
  }, [timeRangeType, customDateRange, enableComparison, comparisonType]);

  // ===============================
  // 事件处理
  // ===============================

  const handleTimeRangeChange = (value: string) => {
    setTimeRangeType(value as any);
    if (value !== 'custom') {
      setCustomDateRange(null);
    }
  };

  const handleCustomDateChange = (dates: any, dateStrings?: [string, string]) => {
    const validDates = dates as [Dayjs, Dayjs] | null;
    setCustomDateRange(validDates);
    if (validDates && validDates.length === 2) {
      setTimeRangeType('custom');
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key as 'customer' | 'student');
  };

  // ===============================
  // 渲染时间范围描述
  // ===============================

  const renderTimeRangeDescription = () => {
    if (!timeParams) return null;

    const formatDate = (dateStr: string) => dayjs(dateStr).format('YYYY年MM月DD日');
    
    let mainPeriod = `${formatDate(timeParams.startDate)} 至 ${formatDate(timeParams.endDate)}`;
    
    if (enableComparison && timeParams.compareWith) {
      const compPeriod = `${formatDate(timeParams.compareWith.startDate)} 至 ${formatDate(timeParams.compareWith.endDate)}`;
      const compType = timeParams.compareWith.type === 'previous_period' ? '上一周期' : '去年同期';
      return (
        <Text type="secondary">
          分析周期：{mainPeriod} | 对比周期：{compPeriod} ({compType})
        </Text>
      );
    }

    return <Text type="secondary">分析周期：{mainPeriod}</Text>;
  };

  // ===============================
  // 选项卡配置
  // ===============================

  const tabItems = [
    {
      key: 'customer',
      label: (
        <span>
          <BarChartOutlined />
          客户分析
        </span>
      ),
      children: timeParams ? (
        <CustomerAnalyticsTab 
          timeParams={timeParams} 
          refreshKey={refreshKey}
        />
      ) : (
        <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: '50px' }} />
      ),
    },
    {
      key: 'student',
      label: (
        <span>
          <CalendarOutlined />
          学生成长分析
        </span>
      ),
      children: timeParams ? (
        <StudentAnalyticsTab 
          timeParams={timeParams} 
          refreshKey={refreshKey}
        />
      ) : (
        <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: '50px' }} />
      ),
    },
  ];

  // ===============================
  // 渲染组件
  // ===============================

  return (
    <div style={{ padding: 0 }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0 }}>
          数据分析中心
        </Title>
        <Text type="secondary">
          深度分析客户转化和学生成长数据，为业务决策提供数据支持
        </Text>
      </div>

      {/* 全局控制器 */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          {/* 时间范围选择 */}
          <Col xs={24} sm={12} md={8} lg={6}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                时间范围
              </Text>
              <Select
                value={timeRangeType}
                onChange={handleTimeRangeChange}
                style={{ width: '100%' }}
              >
                <Option value="7">最近7天</Option>
                <Option value="15">最近15天</Option>
                <Option value="30">最近30天</Option>
                <Option value="90">最近90天</Option>
                <Option value="180">最近180天</Option>
                <Option value="365">最近1年</Option>
                <Option value="custom">自定义范围</Option>
              </Select>
            </div>
          </Col>

          {/* 自定义日期选择器 */}
          {timeRangeType === 'custom' && (
            <Col xs={24} sm={12} md={8} lg={6}>
              <div>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                  自定义日期
                </Text>
                <RangePicker
                  value={customDateRange}
                  onChange={handleCustomDateChange}
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                />
              </div>
            </Col>
          )}

          {/* 对比功能开关 */}
          <Col xs={24} sm={12} md={8} lg={6}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                时间对比
              </Text>
              <Switch
                checked={enableComparison}
                onChange={setEnableComparison}
                checkedChildren="启用"
                unCheckedChildren="关闭"
              />
            </div>
          </Col>

          {/* 对比类型选择 */}
          {enableComparison && (
            <Col xs={24} sm={12} md={8} lg={6}>
              <div>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                  对比类型
                </Text>
                <Select
                  value={comparisonType}
                  onChange={setComparisonType}
                  style={{ width: '100%' }}
                >
                  <Option value="previous_period">上一周期</Option>
                  <Option value="same_period_last_year">去年同期</Option>
                </Select>
              </div>
            </Col>
          )}

          {/* 刷新按钮 */}
          <Col xs={24} sm={12} md={8} lg={6}>
            <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%' }}>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                style={{ marginTop: '25px' }}
              >
                刷新数据
              </Button>
            </div>
          </Col>
        </Row>

        {/* 时间范围描述 */}
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          borderRadius: '6px',
          backgroundColor: 'var(--ant-color-fill-tertiary)',
          border: '1px solid var(--ant-color-border)'
        }}>
          {renderTimeRangeDescription()}
        </div>
      </Card>

      {/* 主要内容区域 */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          size="large"
          tabBarStyle={{ marginBottom: '24px' }}
        />
      </Card>
    </div>
  );
};

export default AnalyticsPage; 