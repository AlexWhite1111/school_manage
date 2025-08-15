import { Card } from 'antd';
import { UnifiedCardPresets } from '@/theme/card';
import React, { useState, useEffect } from 'react';
import { Row, Col, Statistic, Table, Alert, Spin, Empty, Typography, Tag, Progress, Tooltip, Space, Divider, theme as themeApi } from 'antd';
import { 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  TeamOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FunnelPlotOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useThemeStore } from '@/stores/themeStore';
import { 
  getCustomerKeyMetrics, 
  getCustomerFunnel,
  getSourceChannelAnalysis 
} from '@/api/analyticsApi';
import type { 
  AnalyticsTimeRangeParams,
  AnalyticsKeyMetrics,
  CustomerFunnelData,
  SourceChannelAnalysis,
  CustomerStatus 
} from '@/types/api';
import { useResponsive } from '@/hooks/useResponsive';
import { getAppTokens } from '@/theme/tokens';
import { getSourceChannelLabel } from '@/utils/enumMappings';
import { getFunnelStageColor } from '@/config/analyticsColors';

const { Title, Text } = Typography;
const { Column } = Table;

interface CustomerAnalyticsTabProps {
  timeParams: AnalyticsTimeRangeParams;
  refreshKey: number;
}

const CustomerAnalyticsTab: React.FC<CustomerAnalyticsTabProps> = ({
  timeParams,
  refreshKey
}) => {
  const { theme } = useThemeStore();
  const { isMobile } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [keyMetrics, setKeyMetrics] = useState<AnalyticsKeyMetrics | null>(null);
  const [funnelData, setFunnelData] = useState<CustomerFunnelData | null>(null);
  const [channelData, setChannelData] = useState<SourceChannelAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ===============================
  // 数据加载
  // ===============================

  const loadAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 加载客户分析数据...', timeParams);
      
      // 并行加载所有数据
      const [metricsResult, funnelResult, channelResult] = await Promise.all([
        getCustomerKeyMetrics(timeParams),
        getCustomerFunnel(timeParams),
        getSourceChannelAnalysis(timeParams)
      ]);

      console.log('📊 API返回数据:', { metricsResult, funnelResult, channelResult });
      
      setKeyMetrics(metricsResult);
      setFunnelData(funnelResult);
      setChannelData(channelResult);
      
      console.log('✅ 客户分析数据加载成功');
    } catch (err) {
      console.error('❌ 客户分析数据加载失败:', err);
      setError(err instanceof Error ? err.message : '数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔄 CustomerAnalyticsTab useEffect triggered:', { timeParams, refreshKey });
    loadAnalyticsData();
  }, [timeParams, refreshKey]);

  // ===============================
  // 主题适配的样式配置
  // ===============================

  const { token } = themeApi.useToken();
  const themeStyles = {
    cardBackground: token.colorBgContainer,
    borderColor: token.colorBorder,
    textPrimary: token.colorText,
    textSecondary: token.colorTextSecondary,
    successColor: token.colorSuccess,
    warningColor: token.colorWarning,
    errorColor: token.colorError,
    primaryColor: token.colorPrimary,
    // 颜色不再在组件内定义，通过配置按阶段映射
  } as const;

  // ===============================
  // 渲染指标变化
  // ===============================

  const renderMetricChange = (current: number, change?: number, changePercentage?: number) => {
    if (change === undefined || changePercentage === undefined) {
      return null;
    }

    const isPositive = change > 0;
    const color = isPositive ? themeStyles.successColor : themeStyles.errorColor;
    const icon = isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />;

    return (
      <div style={{ marginTop: '4px' }}>
        <Text style={{ color, fontSize: '12px' }}>
          {icon} {Math.abs(changePercentage).toFixed(1)}% ({Math.abs(change)})
        </Text>
      </div>
    );
  };

  // ===============================
  // 客户状态中文映射
  // ===============================

  const getStatusLabel = (status: CustomerStatus): string => {
    const statusMap = {
      'POTENTIAL': '潜在客户',
      'INITIAL_CONTACT': '初步沟通',
      'INTERESTED': '意向客户',
      'TRIAL_CLASS': '试课',
      'ENROLLED': '报名',
      'LOST': '流失客户'
    };
    return statusMap[status] || status;
  };

  // ===============================
  // 渲染客户漏斗图
  // ===============================

  const renderFunnelChart = () => {
    if (!funnelData) {
      return (
        <Empty 
          description="暂无漏斗数据" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    if (!funnelData.stages || funnelData.stages.length === 0) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Alert
            message="数据为空"
            description="当前时间段内没有客户数据"
            type="info"
            showIcon
          />
        </div>
      );
    }

    return (
      <div style={{ padding: isMobile ? '12px' : '20px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {funnelData.stages.map((stage) => {
            const color = getFunnelStageColor(stage.stage);
            const widthPercentage = stage.percentage;
            
            return (
              <div key={stage.stage} style={{ width: '100%' }}>
                {/* 移动端布局 */}
                {isMobile ? (
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    {/* 阶段标签和进度条 */}
                    <div>
                      <Text strong style={{ 
                        color: themeStyles.textPrimary,
                        fontSize: '14px',
                        display: 'block',
                        marginBottom: '8px'
                      }}>
                        {getStatusLabel(stage.stage)}
                      </Text>
                      <Progress 
                        percent={widthPercentage} 
                        showInfo={false}
                        strokeColor={color}
                        trailColor={theme === 'dark' ? 'var(--ant-color-bg-layout)' : 'var(--ant-color-bg-layout)'}
                        strokeWidth={16}
                      />
                    </div>
                    
                    {/* 数据统计放在下方 */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <Tag color={color} style={{ margin: 0, fontSize: '12px' }}>
                        {stage.count} 人
                      </Tag>
                      <Text style={{ color: themeStyles.textSecondary, fontSize: '11px' }}>
                        {stage.percentage.toFixed(1)}%
                      </Text>
                      {stage.conversionRate !== undefined && (
                        <Text style={{ color: themeStyles.successColor, fontSize: '11px' }}>
                          转化率 {stage.conversionRate.toFixed(1)}%
                        </Text>
                      )}
                    </div>
                  </Space>
                ) : (
                  /* 桌面端布局 */
                  <Row align="middle" gutter={[16, 0]}>
                    {/* 阶段标签 */}
                    <Col span={6}>
                      <Text strong style={{ color: themeStyles.textPrimary }}>
                        {getStatusLabel(stage.stage)}
                      </Text>
                    </Col>
                    
                    {/* 进度条 */}
                    <Col span={12}>
                      <Progress 
                        percent={widthPercentage} 
                        showInfo={false}
                        strokeColor={color}
                        trailColor={token.colorBgLayout}
                        strokeWidth={20}
                      />
                    </Col>
                    
                    {/* 数据统计 */}
                    <Col span={6}>
                      <Space size="large">
                        <Tooltip title="客户数量">
                          <Tag color={color} style={{ margin: 0 }}>
                            {stage.count} 人
                          </Tag>
                        </Tooltip>
                        <Tooltip title="占总数比例">
                          <Text style={{ color: themeStyles.textSecondary, fontSize: '12px' }}>
                            {stage.percentage.toFixed(1)}%
                          </Text>
                        </Tooltip>
                        {stage.conversionRate !== undefined && (
                          <Tooltip title="从上一阶段转化率">
                            <Text style={{ color: themeStyles.successColor, fontSize: '12px' }}>
                              转化率 {stage.conversionRate.toFixed(1)}%
                            </Text>
                          </Tooltip>
                        )}
                      </Space>
                    </Col>
                  </Row>
                )}
              </div>
            );
          })}
        </Space>
        
        {/* 总体统计 */}
        <Divider style={{ borderColor: themeStyles.borderColor, margin: isMobile ? '12px 0' : undefined }} />
        <Row gutter={isMobile ? [8, 8] : [16, 16]}>
          <Col xs={24} sm={8}>
            <Statistic
              title="总新增客户"
              value={funnelData.totalNewCustomers}
              prefix={<TeamOutlined style={{ color: themeStyles.primaryColor }} />}
              valueStyle={{ 
                color: themeStyles.textPrimary,
                fontSize: isMobile ? '18px' : '24px'
              }}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic
              title="最终报名"
              value={funnelData.finalEnrolledCount}
              prefix={<TrophyOutlined style={{ color: themeStyles.successColor }} />}
              valueStyle={{ 
                color: themeStyles.textPrimary,
                fontSize: isMobile ? '18px' : '24px'
              }}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Statistic
              title="整体转化率"
              value={funnelData.overallConversionRate}
              suffix="%"
              precision={1}
              prefix={<FunnelPlotOutlined style={{ color: themeStyles.warningColor }} />}
              valueStyle={{ 
                color: themeStyles.textPrimary,
                fontSize: isMobile ? '18px' : '24px'
              }}
            />
          </Col>
        </Row>
      </div>
    );
  };

  // ===============================
  // 渲染来源渠道表格
  // ===============================

  const renderChannelTable = () => {
    if (!channelData || !channelData.channels || channelData.channels.length === 0) {
      return (
        <Empty 
          description="暂无渠道数据" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    return (
      <Table
        dataSource={channelData.channels}
        pagination={false}
        size="middle"
        rowKey="channel"
        style={{ 
          background: themeStyles.cardBackground,
          borderRadius: '8px'
        }}
      >
        <Column
          title="来源"
          dataIndex="channel"
          key="channel"
          render={(channel: string) => (
            <Text strong style={{ color: themeStyles.textPrimary }}>
              {getSourceChannelLabel(channel) || '未知渠道'}
            </Text>
          )}
        />
        <Column
          title="客户"
          dataIndex="customerCount"
          key="customerCount"
          align="center"
          render={(count: number) => (
            <Tag color={themeStyles.primaryColor}>{count} 人</Tag>
          )}
        />
        <Column
          title="报名"
          dataIndex="enrolledCount"
          key="enrolledCount"
          align="center"
          render={(count: number) => (
            <Tag color={themeStyles.successColor}>{count} 人</Tag>
          )}
        />
        <Column
          title="转化"
          dataIndex="conversionRate"
          key="conversionRate"
          align="center"
          sorter={(a, b) => a.conversionRate - b.conversionRate}
          render={(rate: number) => {
            const color = rate >= 20 ? themeStyles.successColor : 
                         rate >= 10 ? themeStyles.warningColor : 
                         themeStyles.errorColor;
            return (
              <Text style={{ color, fontWeight: 'bold' }}>
                {rate.toFixed(1)}%
              </Text>
            );
          }}
        />
      </Table>
    );
  };

  // ===============================
  // 错误状态
  // ===============================

  if (error) {
    return (
      <Alert
        message="数据加载失败"
        description={error}
        type="error"
        showIcon
        style={{ margin: '20px' }}
      />
    );
  }

  // ===============================
  // 渲染主要内容
  // ===============================

  const preset = UnifiedCardPresets.mobileCompact(isMobile);

  return (
    <Spin spinning={loading} tip="正在加载客户分析数据...">
      <div data-page-container>
        {/* 核心指标卡片：移动端合并为单卡片2×2，桌面端保持四卡片 */}
        {isMobile ? (
          (() => { const mPreset = UnifiedCardPresets.mobileCompact(isMobile); return (
          <Card bordered={false} style={{ ...mPreset.style, background: themeStyles.cardBackground, marginBottom: 'var(--space-3)' }} styles={mPreset.styles}>
            <Row gutter={[8, 8]}>
              <Col span={12} style={{ paddingBottom: 0 }}>
                <Statistic
                  title={<Text style={{ color: themeStyles.textSecondary }}>新增客户</Text>}
                  value={keyMetrics?.newCustomers.current || 0}
                  prefix={<TeamOutlined style={{ color: themeStyles.primaryColor }} />}
                  valueStyle={{ color: themeStyles.textPrimary, fontSize: '18px' }}
                />
                {renderMetricChange(
                  keyMetrics?.newCustomers.current || 0,
                  keyMetrics?.newCustomers.change,
                  keyMetrics?.newCustomers.changePercentage
                )}
              </Col>
              <Col span={12} style={{ paddingBottom: 0 }}>
                <Statistic
                  title={<Text style={{ color: themeStyles.textSecondary }}>转化率</Text>}
                  value={keyMetrics?.conversionRate.current || 0}
                  suffix="%"
                  precision={1}
                  prefix={<TrophyOutlined style={{ color: themeStyles.successColor }} />}
                  valueStyle={{ color: themeStyles.textPrimary, fontSize: '18px' }}
                />
                {renderMetricChange(
                  keyMetrics?.conversionRate.current || 0,
                  keyMetrics?.conversionRate.change,
                  keyMetrics?.conversionRate.changePercentage
                )}
              </Col>
              <Col span={12} style={{ paddingBottom: 0 }}>
                <Statistic
                  title={<Text style={{ color: themeStyles.textSecondary }}>平均转化天数</Text>}
                  value={keyMetrics?.averageConversionDays.current || 0}
                  suffix="天"
                  prefix={<ClockCircleOutlined style={{ color: themeStyles.warningColor }} />}
                  valueStyle={{ color: themeStyles.textPrimary, fontSize: '18px' }}
                />
                {renderMetricChange(
                  keyMetrics?.averageConversionDays.current || 0,
                  keyMetrics?.averageConversionDays.change,
                  keyMetrics?.averageConversionDays.changePercentage
                )}
              </Col>
              <Col span={12} style={{ paddingBottom: 0 }}>
                <Statistic
                  title={<Text style={{ color: themeStyles.textSecondary }}>总收入</Text>}
                  value={keyMetrics?.totalRevenue?.current || 0}
                  prefix={<DollarOutlined style={{ color: themeStyles.successColor }} />}
                  valueStyle={{ color: themeStyles.textPrimary, fontSize: '18px' }}
                />
                {keyMetrics?.totalRevenue && renderMetricChange(
                  keyMetrics.totalRevenue.current,
                  keyMetrics.totalRevenue.change,
                  keyMetrics.totalRevenue.changePercentage
                )}
              </Col>
            </Row>
          </Card>
          ); })()
        ) : (
          <Row gutter={[16, 16]} style={{ marginBottom: 'var(--space-6)' }}>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ ...preset.style, background: themeStyles.cardBackground }} styles={preset.styles}>
                <Statistic title={<Text style={{ color: themeStyles.textSecondary }}>新增客户</Text>} value={keyMetrics?.newCustomers.current || 0} prefix={<TeamOutlined style={{ color: themeStyles.primaryColor }} />} valueStyle={{ color: themeStyles.textPrimary }} />
                {renderMetricChange(keyMetrics?.newCustomers.current || 0, keyMetrics?.newCustomers.change, keyMetrics?.newCustomers.changePercentage)}
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ ...preset.style, background: themeStyles.cardBackground }} styles={preset.styles}>
                <Statistic title={<Text style={{ color: themeStyles.textSecondary }}>转化率</Text>} value={keyMetrics?.conversionRate.current || 0} suffix="%" precision={1} prefix={<TrophyOutlined style={{ color: themeStyles.successColor }} />} valueStyle={{ color: themeStyles.textPrimary }} />
                {renderMetricChange(keyMetrics?.conversionRate.current || 0, keyMetrics?.conversionRate.change, keyMetrics?.conversionRate.changePercentage)}
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ ...preset.style, background: themeStyles.cardBackground }} styles={preset.styles}>
                <Statistic title={<Text style={{ color: themeStyles.textSecondary }}>平均转化天数</Text>} value={keyMetrics?.averageConversionDays.current || 0} suffix="天" prefix={<ClockCircleOutlined style={{ color: themeStyles.warningColor }} />} valueStyle={{ color: themeStyles.textPrimary }} />
                {renderMetricChange(keyMetrics?.averageConversionDays.current || 0, keyMetrics?.averageConversionDays.change, keyMetrics?.averageConversionDays.changePercentage)}
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bordered={false} style={{ ...preset.style, background: themeStyles.cardBackground }} styles={preset.styles}>
                <Statistic title={<Text style={{ color: themeStyles.textSecondary }}>总收入</Text>} value={keyMetrics?.totalRevenue?.current || 0} prefix={<DollarOutlined style={{ color: themeStyles.successColor }} />} valueStyle={{ color: themeStyles.textPrimary }} />
                {keyMetrics?.totalRevenue && renderMetricChange(keyMetrics.totalRevenue.current, keyMetrics.totalRevenue.change, keyMetrics.totalRevenue.changePercentage)}
              </Card>
            </Col>
          </Row>
        )}

        {/* 客户转化漏斗图 */}
        <Row gutter={isMobile ? [8, 8] : [16, 16]}>
          <Col xs={24} lg={14}>
            <Card
              title={
                <Space>
                  <FunnelPlotOutlined style={{ color: themeStyles.primaryColor }} />
                  <Text strong style={{ color: themeStyles.textPrimary }}>
                    客户转化漏斗
                  </Text>
                </Space>
              }
              bordered={false}
              style={{ ...preset.style, background: themeStyles.cardBackground }}
              styles={preset.styles}
            >
              {funnelData ? renderFunnelChart() : (
                <Empty 
                  description="暂无漏斗数据" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Card>
          </Col>

          {/* 来源渠道分析 */}
          <Col xs={24} lg={10}>
            <Card
              title={
                <Space>
                  <BarChartOutlined style={{ color: themeStyles.primaryColor }} />
                  <Text strong style={{ color: themeStyles.textPrimary }}>
                    来源渠道分析
                  </Text>
                </Space>
              }
              bordered={false}
              style={{ ...preset.style, background: themeStyles.cardBackground }}
              styles={preset.styles}
            >
              {channelData ? renderChannelTable() : (
                <Empty 
                  description="暂无渠道数据" 
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </Spin>
  );
};

export default CustomerAnalyticsTab; 