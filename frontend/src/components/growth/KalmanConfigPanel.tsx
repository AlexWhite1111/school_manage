import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Slider, InputNumber, Button, Select, Divider, Alert, Space, Tooltip, message } from 'antd';
import { InfoCircleOutlined, SaveOutlined, ReloadOutlined, ExperimentOutlined } from '@ant-design/icons';
import { KalmanConfig, ConfigUpdate } from '../../api/growthApi';

const { Option } = Select;

interface KalmanConfigPanelProps {
  config: KalmanConfig;
  onSave: (configUpdate: ConfigUpdate) => Promise<void>;
  onReset?: () => void;
  loading?: boolean;
}

const KalmanConfigPanel: React.FC<KalmanConfigPanelProps> = ({
  config,
  onSave,
  onReset,
  loading = false
}) => {
  const [localConfig, setLocalConfig] = useState<KalmanConfig>(config);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
    setHasChanges(false);
  }, [config]);

  const handleValueChange = (field: keyof KalmanConfig, value: number | string) => {
    const newConfig = { ...localConfig, [field]: value };
    setLocalConfig(newConfig);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      const updateData: ConfigUpdate = {
        name: localConfig.name,
        description: localConfig.description,
        processNoise: localConfig.processNoise,
        initialUncertainty: localConfig.initialUncertainty,
        timeDecayFactor: localConfig.timeDecayFactor,
        minObservations: localConfig.minObservations,
        maxDaysBetween: localConfig.maxDaysBetween
      };
      await onSave(updateData);
      setHasChanges(false);
      message.success('配置保存成功');
    } catch (error) {
      message.error('配置保存失败');
    }
  };

  const handleReset = () => {
    setLocalConfig(config);
    setHasChanges(false);
    onReset?.();
  };

  // 预设配置
  const presets = {
    fast_response: {
      name: '快速响应型',
      description: '对新变化反应迅速，适合短期观察',
      processNoise: 0.5,
      initialUncertainty: 5.0,
      timeDecayFactor: 0.05,
      minObservations: 2,
      maxDaysBetween: 14
    },
    balanced: {
      name: '平衡稳定型',
      description: '平衡响应速度和稳定性，适合日常使用',
      processNoise: 0.1,
      initialUncertainty: 10.0,
      timeDecayFactor: 0.01,
      minObservations: 3,
      maxDaysBetween: 30
    },
    long_term: {
      name: '长期跟踪型',
      description: '注重长期趋势，减少短期波动影响',
      processNoise: 0.05,
      initialUncertainty: 20.0,
      timeDecayFactor: 0.005,
      minObservations: 5,
      maxDaysBetween: 60
    }
  };

  const applyPreset = (presetKey: keyof typeof presets) => {
    const preset = presets[presetKey];
    setLocalConfig({
      ...localConfig,
      ...preset
    });
    setHasChanges(true);
  };

  const getParameterDescription = (param: string) => {
    const descriptions = {
      processNoise: '控制模型对系统变化的敏感度。值越大，模型越容易适应新的变化，但也更容易受到噪声影响。',
      initialUncertainty: '初始状态的不确定性。值越大，表示对初始估计的信心越低，算法会更快地调整到真实值。',
      timeDecayFactor: '时间衰减因子。控制历史数据的影响衰减速度，值越大，历史数据影响衰减越快。',
      minObservations: '最少观测次数。低于此值时，置信度会相应降低，确保数据的可靠性。',
      maxDaysBetween: '最大天数间隔。超过此值认为状态可能已过时，会增加不确定性。'
    };
    return descriptions[param as keyof typeof descriptions];
  };

  return (
    <Card
      title={
        <Space>
          <ExperimentOutlined />
          <span>卡尔曼滤波器参数配置</span>
        </Space>
      }
      extra={
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleReset}
            disabled={!hasChanges}
          >
            重置
          </Button>
          <Button 
            type="primary" 
            icon={<SaveOutlined />} 
            onClick={handleSave}
            loading={loading}
            disabled={!hasChanges}
          >
            保存配置
          </Button>
        </Space>
      }
    >
      {hasChanges && (
        <Alert
          message="配置已修改"
          description="请保存配置以使更改生效"
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* 预设配置 */}
      <div style={{ marginBottom: '24px' }}>
        <h4>快速预设</h4>
        <Space wrap>
          {Object.entries(presets).map(([key, preset]) => (
            <Button
              key={key}
              onClick={() => applyPreset(key as keyof typeof presets)}
              style={{ marginBottom: '8px' }}
            >
              {preset.name}
            </Button>
          ))}
        </Space>
      </div>

      <Divider />

      {/* 基础信息 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={12}>
          <div style={{ marginBottom: '8px' }}>配置名称</div>
          <Select
            value={localConfig.name}
            onChange={(value) => handleValueChange('name', value)}
            style={{ width: '100%' }}
          >
            <Option value="default">默认配置</Option>
            <Option value="middle_school">初中配置</Option>
            <Option value="high_school">高中配置</Option>
            <Option value="custom">自定义配置</Option>
          </Select>
        </Col>
        <Col span={12}>
          <div style={{ marginBottom: '8px' }}>配置描述</div>
          <Select
            value={localConfig.description}
            onChange={(value) => handleValueChange('description', value)}
            style={{ width: '100%' }}
          >
            <Option value="标准配置，适用于大多数场景">标准配置</Option>
            <Option value="针对初中生特点优化的配置">初中生优化</Option>
            <Option value="针对高中生特点优化的配置">高中生优化</Option>
            <Option value="根据具体需求自定义的配置">自定义配置</Option>
          </Select>
        </Col>
      </Row>

      {/* 核心参数配置 */}
      <h4>核心滤波参数</h4>
      
      {/* 过程噪声 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
        <Col span={18}>
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
            <span>过程噪声 (Q)</span>
            <Tooltip title={getParameterDescription('processNoise')}>
              <InfoCircleOutlined style={{ marginLeft: '4px', color: '#999' }} />
            </Tooltip>
          </div>
          <Slider
            min={0.001}
            max={1.0}
            step={0.001}
            value={localConfig.processNoise}
            onChange={(value) => handleValueChange('processNoise', value)}
            marks={{
              0.001: '0.001',
              0.1: '0.1',
              0.5: '0.5',
              1.0: '1.0'
            }}
          />
        </Col>
        <Col span={6}>
          <div style={{ marginBottom: '8px' }}>&nbsp;</div>
          <InputNumber
            min={0.001}
            max={1.0}
            step={0.001}
            value={localConfig.processNoise}
            onChange={(value) => handleValueChange('processNoise', value || 0.1)}
            precision={3}
            style={{ width: '100%' }}
          />
        </Col>
      </Row>

      {/* 初始不确定性 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
        <Col span={18}>
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
            <span>初始不确定性 (P)</span>
            <Tooltip title={getParameterDescription('initialUncertainty')}>
              <InfoCircleOutlined style={{ marginLeft: '4px', color: '#999' }} />
            </Tooltip>
          </div>
          <Slider
            min={1.0}
            max={100.0}
            step={0.1}
            value={localConfig.initialUncertainty}
            onChange={(value) => handleValueChange('initialUncertainty', value)}
            marks={{
              1.0: '1.0',
              10.0: '10.0',
              50.0: '50.0',
              100.0: '100.0'
            }}
          />
        </Col>
        <Col span={6}>
          <div style={{ marginBottom: '8px' }}>&nbsp;</div>
          <InputNumber
            min={1.0}
            max={100.0}
            step={0.1}
            value={localConfig.initialUncertainty}
            onChange={(value) => handleValueChange('initialUncertainty', value || 10.0)}
            precision={1}
            style={{ width: '100%' }}
          />
        </Col>
      </Row>

      {/* 时间衰减因子 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
        <Col span={18}>
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
            <span>时间衰减因子 (λ)</span>
            <Tooltip title={getParameterDescription('timeDecayFactor')}>
              <InfoCircleOutlined style={{ marginLeft: '4px', color: '#999' }} />
            </Tooltip>
          </div>
          <Slider
            min={0.001}
            max={0.1}
            step={0.001}
            value={localConfig.timeDecayFactor}
            onChange={(value) => handleValueChange('timeDecayFactor', value)}
            marks={{
              0.001: '0.001',
              0.01: '0.01',
              0.05: '0.05',
              0.1: '0.1'
            }}
          />
        </Col>
        <Col span={6}>
          <div style={{ marginBottom: '8px' }}>&nbsp;</div>
          <InputNumber
            min={0.001}
            max={0.1}
            step={0.001}
            value={localConfig.timeDecayFactor}
            onChange={(value) => handleValueChange('timeDecayFactor', value || 0.01)}
            precision={3}
            style={{ width: '100%' }}
          />
        </Col>
      </Row>

      <Divider />

      {/* 业务参数 */}
      <h4>业务参数</h4>
      
      <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
        <Col span={12}>
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
            <span>最少观测次数</span>
            <Tooltip title={getParameterDescription('minObservations')}>
              <InfoCircleOutlined style={{ marginLeft: '4px', color: '#999' }} />
            </Tooltip>
          </div>
          <InputNumber
            min={1}
            max={10}
            value={localConfig.minObservations}
            onChange={(value) => handleValueChange('minObservations', value || 3)}
            style={{ width: '100%' }}
          />
        </Col>
        <Col span={12}>
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
            <span>最大天数间隔</span>
            <Tooltip title={getParameterDescription('maxDaysBetween')}>
              <InfoCircleOutlined style={{ marginLeft: '4px', color: '#999' }} />
            </Tooltip>
          </div>
          <InputNumber
            min={7}
            max={90}
            value={localConfig.maxDaysBetween}
            onChange={(value) => handleValueChange('maxDaysBetween', value || 30)}
            style={{ width: '100%' }}
          />
        </Col>
      </Row>

      {/* 配置说明 */}
      <Alert
        message="参数调优建议"
        description={
          <div>
            <p><strong>快速响应场景：</strong>增大过程噪声，减小时间衰减因子，适合需要快速反应的情况。</p>
            <p><strong>稳定跟踪场景：</strong>减小过程噪声，增大初始不确定性，适合长期稳定观察。</p>
            <p><strong>数据稀少场景：</strong>减少最少观测次数，增大最大天数间隔，适合观测频率较低的情况。</p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginTop: '16px' }}
      />
    </Card>
  );
};

export default KalmanConfigPanel; 