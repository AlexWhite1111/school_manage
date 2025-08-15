import AppButton from '@/components/AppButton';
import React, { useState, useEffect } from 'react';
import { Space, Form, InputNumber, message, Row, Col, Statistic, Progress, List, Tag, Typography, Tooltip, Select, Switch, Divider, Card, Dropdown } from 'antd';
import {
  SettingOutlined,
  SaveOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  ExperimentOutlined,
  MonitorOutlined,
  TagsOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TrophyOutlined
} from '@ant-design/icons';


import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { featureFlags } from '@/config/kalmanPanelConfig';
import { GrowthApi } from '@/api/growthApi';
import type { KalmanConfig, GrowthTag } from '@/api/growthApi';
import { kalmanLayout, kalmanButtons, tagPanelConfig } from '@/config/kalmanPanelConfig';

const { Title, Text } = Typography;
const { Option } = Select;

// ================================
// 类型定义
// ================================

interface SystemHealthData {
  totalStates: number;
  healthyStates: number;
  staleStates: number;
  corruptedStates: number;
  averageConfidence: number;
  recommendations: string[];
}

interface GrowthConfigPanelProps {}

// ================================
// 子组件：卡尔曼滤波器参数配置
// ================================

const KalmanConfigSection: React.FC = () => {
  const [form] = Form.useForm();
  const [config, setConfig] = useState<KalmanConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 获取当前配置
  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const data = await GrowthApi.getActiveGrowthConfig();
        setConfig(data);
        form.setFieldsValue(data);
      } catch (error) {
        console.error('获取配置失败:', error);
        message.error('获取配置失败');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [form]);

  // 保存配置
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      
      if (config) {
        await GrowthApi.updateGrowthConfig(config.id, values);
        message.success('配置保存成功');
        
        // 重新获取配置
        const updatedConfig = await GrowthApi.getActiveGrowthConfig();
        setConfig(updatedConfig);
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      message.error('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  // 重置为默认值
  const handleReset = () => {
    const defaultValues = {
      processNoise: 0.1,
      initialUncertainty: 10.0,
      timeDecayFactor: 0.01,
      minObservations: 3,
      maxDaysBetween: 30
    };
    form.setFieldsValue(defaultValues);
  };

  if (loading) {
    return (
      <Card title="卡尔曼滤波器参数配置">
        <SkeletonLoader variant="card" />
      </Card>
    );
  }

  return (
      <Card 
      title={
        <Space>
          <ExperimentOutlined />
          <Title level={4} style={{ margin: 0 }}>卡尔曼滤波器参数配置</Title>
        </Space>
      }
    >
      {/* 题头下方操作栏（第二行） */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: kalmanLayout.toolbarGap }}>
        <AppButton size={kalmanButtons.headerSize as any} hierarchy={kalmanButtons.resetHierarchy as any} onClick={handleReset}>
          重置默认
        </AppButton>
        <AppButton size={kalmanButtons.headerSize as any} hierarchy={kalmanButtons.saveHierarchy as any} icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
          保存配置
        </AppButton>
      </div>
      <Form
        form={form}
        layout="vertical"
        initialValues={config || {}}
      >
        <Row gutter={24}>
          <Col xs={12} md={12}>
            <Form.Item
              name="processNoise"
              label="过程噪声 (Q)"
              tooltip="控制对模型预测的信任度，值越小越相信模型预测"
              rules={[
                { required: true, message: '请输入过程噪声值' },
                { type: 'number', min: 0.001, max: 1.0, message: '值必须在0.001-1.0之间' }
              ]}
            >
              <InputNumber
                min={0.001}
                max={1.0}
                step={0.01}
                style={{ width: '100%' }}
                placeholder="0.1"
              />
            </Form.Item>
          </Col>

          <Col xs={12} md={12}>
            <Form.Item
              name="initialUncertainty"
              label="初始不确定性 (P)"
              tooltip="新状态的初始协方差，表示初始状态的不确定程度"
              rules={[
                { required: true, message: '请输入初始不确定性值' },
                { type: 'number', min: 1.0, max: 100.0, message: '值必须在1.0-100.0之间' }
              ]}
            >
              <InputNumber
                min={1.0}
                max={100.0}
                step={1.0}
                style={{ width: '100%' }}
                placeholder="10.0"
              />
            </Form.Item>
          </Col>

          <Col xs={12} md={12}>
            <Form.Item
              name="timeDecayFactor"
              label="时间衰减因子 (λ)"
              tooltip="历史数据影响力的衰减速度，值越大历史数据影响越小"
              rules={[
                { required: true, message: '请输入时间衰减因子' },
                { type: 'number', min: 0.001, max: 0.1, message: '值必须在0.001-0.1之间' }
              ]}
            >
              <InputNumber
                min={0.001}
                max={0.1}
                step={0.001}
                style={{ width: '100%' }}
                placeholder="0.01"
              />
            </Form.Item>
          </Col>

          <Col xs={12} md={12}>
            <Form.Item
              name="minObservations"
              label="最少观测次数"
              tooltip="低于此值时置信度较低，建议增加观测"
              rules={[
                { required: true, message: '请输入最少观测次数' },
                { type: 'number', min: 1, max: 10, message: '值必须在1-10之间' }
              ]}
            >
              <InputNumber
                min={1}
                max={10}
                step={1}
                style={{ width: '100%' }}
                placeholder="3"
              />
            </Form.Item>
          </Col>

          {/* 第三行单列：最大天数间隔 */}
          <Col xs={24} md={24}>
            <Form.Item
              name="maxDaysBetween"
              label="最大天数间隔"
              tooltip="超过此天数认为状态可能已过时"
              rules={[
                { required: true, message: '请输入最大天数间隔' },
                { type: 'number', min: 7, max: 90, message: '值必须在7-90之间' }
              ]}
            >
              <InputNumber
                min={7}
                max={90}
                step={1}
                style={{ width: '100%' }}
                placeholder="30"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 预设方案 */}
        <Divider>预设方案</Divider>
        <Row gutter={16}>
          <Col span={8}>
            <AppButton 
              block 
              size="sm"
              onClick={() => form.setFieldsValue({
                processNoise: 0.05,
                initialUncertainty: 15.0,
                timeDecayFactor: 0.005,
                minObservations: 5,
                maxDaysBetween: 45
              })}
            >
              保守型
            </AppButton>
          </Col>
          <Col span={8}>
            <AppButton 
              block 
              size="sm"
              hierarchy="primary"
              onClick={() => form.setFieldsValue({
                processNoise: 0.1,
                initialUncertainty: 10.0,
                timeDecayFactor: 0.01,
                minObservations: 3,
                maxDaysBetween: 30
              })}
            >
              标准型
            </AppButton>
          </Col>
          <Col span={8}>
            <AppButton 
              block 
              size="sm"
              onClick={() => form.setFieldsValue({
                processNoise: 0.2,
                initialUncertainty: 5.0,
                timeDecayFactor: 0.02,
                minObservations: 2,
                maxDaysBetween: 14
              })}
            >
              敏感型
            </AppButton>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

// ================================
// 子组件：标签管理
// ================================

const TagManagementSection: React.FC = () => {
  const [tags, setTags] = useState<GrowthTag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTags = async () => {
      setLoading(true);
      try {
        const data = await GrowthApi.getGrowthTags({ isActive: true });
        setTags(data);
      } catch (error) {
        console.error('获取标签失败:', error);
        message.error('获取标签失败');
      } finally {
        setLoading(false);
      }
    };
    fetchTags();
  }, []);

  if (loading) {
    return (
      <Card title="成长标签管理">
        <SkeletonLoader variant="list" />
      </Card>
    );
  }

  const positiveTags = tags.filter(tag => tag.sentiment === 'POSITIVE');
  const negativeTags = tags.filter(tag => tag.sentiment === 'NEGATIVE');

  return (
    <Card 
      title={
        <Space>
          <TagsOutlined />
          <Title level={4} style={{ margin: 0 }}>成长标签管理</Title>
        </Space>
      }
      extra={
        <AppButton size={tagPanelConfig.headerButtonSize as any} hierarchy={tagPanelConfig.headerButtonHierarchy as any}>
          新建标签
        </AppButton>
      }
    >
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <div style={{ marginBottom: tagPanelConfig.groupTitleMargin }}>
            <Text strong>
              正面标签 ({positiveTags.length}个)
            </Text>
          </div>
          <List
            size={tagPanelConfig.listSize}
            dataSource={positiveTags}
            renderItem={(tag) => (
              <List.Item
                actions={[
                  <Dropdown
                    menu={{
                      items: [
                        { key: 'edit', label: '编辑' },
                        { key: 'disable', label: <span style={{ color: tagPanelConfig.negativeColor }}>禁用</span> },
                      ],
                    }}
                    trigger={["click"]}
                    placement="bottomRight"
                  >
                    <AppButton hierarchy="tertiary" size={tagPanelConfig.footerButtonSize as any}>⋯</AppButton>
                  </Dropdown>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>{tag.text}</Text>
                      <Tag color={tagPanelConfig.positiveColor}>正面</Tag>
                    </Space>
                  }
                  description={
                    <Row gutter={tagPanelConfig.metricsGutter}>
                      <Col span={12}><Text style={{ fontSize: tagPanelConfig.metricsFontSize }}>权重: {tag.defaultWeight}</Text></Col>
                      <Col span={12}><Text style={{ fontSize: tagPanelConfig.metricsFontSize }}>使用: {tag.usageCount}次</Text></Col>
                    </Row>
                  }
                />
              </List.Item>
            )}
          />
        </Col>

        <Col xs={24} md={12}>
          <div style={{ marginBottom: tagPanelConfig.groupTitleMargin }}>
            <Text strong>
              负面标签 ({negativeTags.length}个)
            </Text>
          </div>
          <List
            size={tagPanelConfig.listSize}
            dataSource={negativeTags}
            renderItem={(tag) => (
              <List.Item
                actions={[
                  <Dropdown
                    menu={{
                      items: [
                        { key: 'edit', label: '编辑' },
                        { key: 'disable', label: <span style={{ color: tagPanelConfig.negativeColor }}>禁用</span> },
                      ],
                    }}
                    trigger={["click"]}
                    placement="bottomRight"
                  >
                    <AppButton hierarchy="tertiary" size={tagPanelConfig.footerButtonSize as any}>⋯</AppButton>
                  </Dropdown>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>{tag.text}</Text>
                      <Tag color={tagPanelConfig.negativeColor}>负面</Tag>
                    </Space>
                  }
                  description={
                    <Row gutter={tagPanelConfig.metricsGutter}>
                      <Col span={12}><Text style={{ fontSize: tagPanelConfig.metricsFontSize }}>权重: {tag.defaultWeight}</Text></Col>
                      <Col span={12}><Text style={{ fontSize: tagPanelConfig.metricsFontSize }}>使用: {tag.usageCount}次</Text></Col>
                    </Row>
                  }
                />
              </List.Item>
            )}
          />
        </Col>
      </Row>

      <Divider />
      <div style={{ textAlign: 'center' }}>
        <Space>
          <AppButton size={tagPanelConfig.footerButtonSize as any}>批量导入</AppButton>
          <AppButton size={tagPanelConfig.footerButtonSize as any}>导出配置</AppButton>
          <AppButton size={tagPanelConfig.footerButtonSize as any} hierarchy={tagPanelConfig.footerButtonHierarchy as any}>重置默认</AppButton>
        </Space>
      </div>
    </Card>
  );
};

// ================================
// 子组件：系统监控
// ================================

const SystemMonitorSection: React.FC = () => {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealthData = async () => {
      setLoading(true);
      try {
        // 使用apiClient而不是直接fetch，确保正确的错误处理
        const response = await GrowthApi.getSystemHealth();
        setHealthData(response);
      } catch (error) {
        console.error('获取系统健康数据失败:', error);
        // 设置空数据而不是模拟数据
        setHealthData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchHealthData();
  }, []);

  if (loading || !healthData) {
    return (
      <Card title="系统监控">
        <SkeletonLoader variant="card" />
      </Card>
    );
  }

  const healthRate = (healthData.healthyStates / healthData.totalStates) * 100;

  return (
    <Card 
      title={
        <Space>
          <MonitorOutlined />
          <Title level={4} style={{ margin: 0 }}>系统监控</Title>
        </Space>
      }
      extra={
        <AppButton icon={<ReloadOutlined />}>
          刷新状态
        </AppButton>
      }
    >
      <Row gutter={24} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title="系统状态"
            value={healthRate}
            precision={1}
            suffix="%"
            prefix={<CheckCircleOutlined />}
            valueStyle={{ 
              color: healthRate >= 90 ? 'var(--ant-color-success)' : 
                     healthRate >= 70 ? 'var(--ant-color-warning)' : 'var(--ant-color-error)' 
            }}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title="总状态数"
            value={healthData.totalStates}
            prefix={<ThunderboltOutlined />}
            valueStyle={{ color: 'var(--ant-color-primary)' }}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title="平均置信度"
            value={Math.round(healthData.averageConfidence * 100)}
            suffix="%"
            prefix={<TrophyOutlined />}
            valueStyle={{ 
              color: healthData.averageConfidence >= 0.7 ? 'var(--ant-color-success)' : 
                     healthData.averageConfidence >= 0.5 ? 'var(--ant-color-warning)' : 'var(--ant-color-error)' 
            }}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title="需要关注"
            value={healthData.staleStates}
            prefix={<ExclamationCircleOutlined />}
            valueStyle={{ 
              color: healthData.staleStates === 0 ? 'var(--ant-color-success)' : 'var(--ant-color-warning)' 
            }}
          />
        </Col>
      </Row>

      <div style={{ marginBottom: '24px' }}>
        <Text strong style={{ marginBottom: '12px', display: 'block' }}>
          系统健康度
        </Text>
        <Progress 
          percent={healthRate} 
          status={healthRate >= 90 ? 'success' : healthRate >= 70 ? 'active' : 'exception'}
          strokeColor={healthRate >= 90 ? 'var(--ant-color-success)' : healthRate >= 70 ? 'var(--ant-color-warning)' : 'var(--ant-color-error)'}
        />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <Text strong style={{ marginBottom: '12px', display: 'block' }}>
          系统建议
        </Text>
        <List
          size="small"
          dataSource={healthData.recommendations}
          renderItem={(item, index) => (
            <List.Item>
              <Space>
                <InfoCircleOutlined style={{ color: 'var(--ant-color-primary)' }} />
                <Text>{item}</Text>
              </Space>
            </List.Item>
          )}
        />
      </div>

      <div style={{ textAlign: 'center' }}>
        <Space>
          <AppButton hierarchy="primary">系统健康检查</AppButton>
          <AppButton>数据清理</AppButton>
          <AppButton>重新计算</AppButton>
          <AppButton>性能优化</AppButton>
        </Space>
      </div>
    </Card>
  );
};

// ================================
// 主组件
// ================================

const GrowthConfigPanel: React.FC<GrowthConfigPanelProps> = () => {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* 卡尔曼滤波器参数配置 */}
      <KalmanConfigSection />

      {/* 标签管理 */}
      <TagManagementSection />

      {/* 系统监控（按开关显示） */}
      {featureFlags.showSystemMonitor ? <SystemMonitorSection /> : null}
    </Space>
  );
};

export default GrowthConfigPanel;