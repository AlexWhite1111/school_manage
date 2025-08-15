import AppButton from '@/components/AppButton';
import React, { useState, useEffect } from 'react';
import { Tabs, Select, Switch, Row, Col, Typography, Spin, Alert, Card, Tooltip } from 'antd';
import { UnifiedCardPresets } from '@/theme/card';
import { 
  BarChartOutlined, 
  ReloadOutlined,
  BookOutlined,
  FundOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import UnifiedRangePicker from '@/components/common/UnifiedRangePicker';
import { UNIFIED_TIME_RANGE_PRESETS, UNIFIED_DATE_FORMAT } from '@/config/timeRange';
import CustomerAnalyticsTab from './components/CustomerAnalyticsTab';
import ExamAnalyticsTab from './components/ExamAnalyticsTab';
import FinanceAnalyticsTab from './components/FinanceAnalyticsTab';
import { createCustomTimeRangeParams } from '@/api/analyticsApi';
import type { AnalyticsTimeRangeParams } from '@/types/api';
import { useResponsive } from '@/hooks/useResponsive';

const { Title, Text } = Typography;
const { Option } = Select;

/**
 * 数据分析主页面
 */
const AnalyticsPage: React.FC = () => {
  // ===============================
  // 状态管理
  // ===============================
  
  const { isMobile } = useResponsive();
  const [activeTab, setActiveTab] = useState<'customer' | 'exam' | 'finance'>('customer');
  const defaultRange = UNIFIED_TIME_RANGE_PRESETS.find(p => p.key === 'last3m')!.getValue();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(defaultRange);
  const [enableComparison, setEnableComparison] = useState<boolean>(false);
  const [comparisonType, setComparisonType] = useState<'previous_period' | 'same_period_last_year'>('previous_period');
  const [timeParams, setTimeParams] = useState<AnalyticsTimeRangeParams | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // ===============================
  // 计算时间参数
  // ===============================
  
  useEffect(() => {
    if (!dateRange) {
      setTimeParams(null);
      return;
    }
    const [start, end] = dateRange;
    const params = createCustomTimeRangeParams(
      start.format(UNIFIED_DATE_FORMAT),
      end.format(UNIFIED_DATE_FORMAT),
      enableComparison,
      comparisonType
    );
    setTimeParams(params);
  }, [dateRange, enableComparison, comparisonType]);

  // ===============================
  // 事件处理
  // ===============================

  const handleDateRangeChange = (dates: [Dayjs, Dayjs] | null) => {
    setDateRange(dates);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key as 'customer' | 'exam' | 'finance');
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
        <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px' }}>
          {mainPeriod} {!isMobile && '|'} {isMobile && <br />}对比周期：{compPeriod} ({compType})
        </Text>
      );
    }

    return (
      <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px' }}>
        {mainPeriod}
      </Text>
    );
  };

  // ===============================
  // 选项卡配置
  // ===============================

  const renderTabLabel = (icon: React.ReactNode, text: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: isMobile ? '13px' : '14px' }}>
      {icon}
      <span>{text}</span>
    </span>
  );

  const tabItems = [
    {
      key: 'customer',
      label: (
        renderTabLabel(<BarChartOutlined style={{ fontSize: isMobile ? 14 : 16 }} />, '客户')
      ),
      children: timeParams ? (
        <CustomerAnalyticsTab 
          timeParams={timeParams} 
          refreshKey={refreshKey}
        />
      ) : (
        <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: 'var(--space-7)' }} />
      ),
    },
    {
      key: 'exam',
      label: (
        renderTabLabel(<BookOutlined style={{ fontSize: isMobile ? 14 : 16 }} />, '考试')
      ),
      children: timeParams ? (
        <ExamAnalyticsTab 
          timeParams={timeParams} 
          refreshKey={refreshKey}
        />
      ) : (
        <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: 'var(--space-7)' }} />
      ),
    },
    {
      key: 'finance',
      label: (
        renderTabLabel(<FundOutlined style={{ fontSize: isMobile ? 14 : 16 }} />, '财务')
      ),
      children: timeParams ? (
        <FinanceAnalyticsTab 
          timeParams={timeParams} 
          refreshKey={refreshKey}
        />
      ) : (
        <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: 'var(--space-7)' }} />
      ),
    },
  ];

  // ===============================
  // 渲染组件
  // ===============================

  return (
    <div data-page-container>
      {/* 页面标题 */}
      <div style={{ marginBottom: isMobile ? 'var(--space-4)' : 'var(--space-6)' }}>
        <Title level={2} style={{ margin: 0, fontSize: isMobile ? '20px' : '28px' }}>
          数据分析中心
        </Title>
        
      </div>

      {/* 全局控制器 */}
      {(() => { const preset = UnifiedCardPresets.mobileCompact(isMobile); return (
      <Card style={{ ...preset.style, marginBottom: isMobile ? 'var(--space-4)' : 'var(--space-6)' }} styles={preset.styles}>
        <Row gutter={[16, 16]} align="middle">
          {/* 统一日期范围选择器 */}
          <Col xs={24} sm={12} md={8} lg={6} xl={6}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px', fontSize: isMobile ? '13px' : '14px' }}>
                时间范围
              </Text>
              <UnifiedRangePicker
                value={dateRange as any}
                onChange={(dates, _strings) => handleDateRangeChange(dates as any)}
                size={isMobile ? 'middle' : 'large'}
              />
            </div>
          </Col>

          {/* 对比功能开关 + 刷新图标（同行） */}
          <Col xs={24} sm={12} md={8} lg={6} xl={6}>
            <div>
              <Text strong style={{ 
                display: 'block', 
                marginBottom: '8px',
                fontSize: isMobile ? '13px' : '14px'
              }}>
                时间对比
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Switch
                  checked={enableComparison}
                  onChange={setEnableComparison}
                  checkedChildren="启用"
                  unCheckedChildren="关闭"
                />
                <Tooltip title="刷新数据">
                  <AppButton
                    hierarchy="tertiary"
                    icon={<ReloadOutlined />}
                    onClick={handleRefresh}
                    shape="circle"
                    size={isMobile ? 'middle' : 'large'}
                    aria-label="刷新数据"
                  />
                </Tooltip>
              </div>
            </div>
          </Col>

          {/* 对比类型选择 */}
          {enableComparison && (
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <div>
                <Text strong style={{ 
                  display: 'block', 
                  marginBottom: '8px',
                  fontSize: isMobile ? '13px' : '14px'
                }}>
                  对比类型
                </Text>
                <Select
                  value={comparisonType}
                  onChange={setComparisonType}
                  style={{ width: '100%' }}
                  size={isMobile ? 'middle' : 'large'}
                >
                  <Option value="previous_period">上一周期</Option>
                  <Option value="same_period_last_year">去年同期</Option>
                </Select>
              </div>
            </Col>
          )}

          
        </Row>

        {/* 时间范围描述 */}
        <div style={{ 
          marginTop: 'var(--space-4)', 
          padding: isMobile ? 'var(--space-2)' : 'var(--space-3)', 
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--ant-color-fill-tertiary)',
          border: '1px solid var(--ant-color-border)'
        }}>
          {renderTimeRangeDescription()}
        </div>
      </Card>
      ); })()}

      {/* 主要内容区域 */}
      {(() => { const preset = UnifiedCardPresets.mobileCompact(isMobile); return (
      <Card style={preset.style} styles={preset.styles}>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          size={isMobile ? 'small' : 'middle'}
          tabBarGutter={isMobile ? 8 : 10}
          tabBarStyle={{ 
            marginBottom: isMobile ? '12px' : '16px',
            fontSize: isMobile ? '13px' : '14px',
            gap: isMobile ? 8 : 10
          }}
        />
      </Card>
      ); })()}
    </div>
  );
};

export default AnalyticsPage; 