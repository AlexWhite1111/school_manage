import AppButton from '@/components/AppButton';
import React, { useState, useEffect } from 'react';
import { Row, Col, Slider, InputNumber, Select, Divider, Space, Tooltip, message, Card } from 'antd';
import { InfoCircleOutlined, SaveOutlined, ReloadOutlined, ExperimentOutlined } from '@ant-design/icons';
import { kalmanText, kalmanLayout, colPairProps, colSingleProps, sliderConfigs, kalmanButtons, kalmanHeader } from '@/config/kalmanPanelConfig';
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
      style={{ marginTop: kalmanLayout.topMargin }}
      headStyle={{ display: 'flex', alignItems: 'center' }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <ExperimentOutlined />
          <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            卡尔曼滤波器参数配置
          </span>
        </div>
      }
      extra={null}
    >
      {/* 题头下方的操作栏（第二行） */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: kalmanLayout.toolbarGap }}>
        <AppButton 
          size={kalmanButtons.headerSize as any}
          hierarchy={kalmanButtons.resetHierarchy as any}
          icon={<ReloadOutlined />} 
          onClick={handleReset}
          disabled={!hasChanges}
        >
          重置默认
        </AppButton>
        <AppButton 
          size={kalmanButtons.headerSize as any}
          hierarchy={kalmanButtons.saveHierarchy as any}
          icon={<SaveOutlined />} 
          onClick={handleSave}
          loading={loading}
          disabled={!hasChanges}
        >
          保存配置
        </AppButton>
      </div>
      {/* 快速预设 */}
      <div style={{ marginBottom: kalmanLayout.sectionGap }}>
        <h4>{kalmanText.titles.quickPresets}</h4>
        <Space wrap>
          {Object.entries(presets).map(([key, preset]) => (
            <AppButton key={key} size={kalmanButtons.presetSize as any} onClick={() => applyPreset(key as keyof typeof presets)}>{preset.name}</AppButton>
          ))}
        </Space>
      </div>

      <Divider />

      {/* 核心参数：2、2、1 分行布局 */}
      <h4>{kalmanText.titles.core}</h4>
      <Row gutter={kalmanLayout.rowGutter} style={{ marginBottom: kalmanLayout.sectionGap }}>
        {/* 行1：Q, P */}
        <Col {...colPairProps}>
          <div style={{ marginBottom: kalmanLayout.labelMarginBottom, display: 'flex', alignItems: 'center' }}>
            <span>{kalmanText.labels.processNoise}</span>
            <Tooltip title={getParameterDescription('processNoise')}>
              <InfoCircleOutlined style={{ marginLeft: 4, color: 'var(--ant-color-text-tertiary)' }} />
            </Tooltip>
          </div>
          <Row gutter={kalmanLayout.innerGutter}>
            <Col flex="auto">
              <Slider min={sliderConfigs.processNoise.min} max={sliderConfigs.processNoise.max} step={sliderConfigs.processNoise.step} value={localConfig.processNoise} onChange={(v) => handleValueChange('processNoise', v)} marks={sliderConfigs.processNoise.marks as any} />
            </Col>
            <Col style={{ minWidth: 120 }}>
              <InputNumber min={sliderConfigs.processNoise.min} max={sliderConfigs.processNoise.max} step={sliderConfigs.processNoise.step} precision={sliderConfigs.processNoise.precision} value={localConfig.processNoise} onChange={(v) => handleValueChange('processNoise', v || 0.1)} style={{ width: '100%' }} />
            </Col>
          </Row>
        </Col>
        <Col {...colPairProps}>
          <div style={{ marginBottom: kalmanLayout.labelMarginBottom, display: 'flex', alignItems: 'center' }}>
            <span>{kalmanText.labels.initialUncertainty}</span>
            <Tooltip title={getParameterDescription('initialUncertainty')}>
              <InfoCircleOutlined style={{ marginLeft: 4, color: 'var(--ant-color-text-tertiary)' }} />
            </Tooltip>
          </div>
          <Row gutter={kalmanLayout.innerGutter}>
            <Col flex="auto">
              <Slider min={sliderConfigs.initialUncertainty.min} max={sliderConfigs.initialUncertainty.max} step={sliderConfigs.initialUncertainty.step} value={localConfig.initialUncertainty} onChange={(v) => handleValueChange('initialUncertainty', v)} marks={sliderConfigs.initialUncertainty.marks as any} />
            </Col>
            <Col style={{ minWidth: 120 }}>
              <InputNumber min={sliderConfigs.initialUncertainty.min} max={sliderConfigs.initialUncertainty.max} step={sliderConfigs.initialUncertainty.step} precision={sliderConfigs.initialUncertainty.precision} value={localConfig.initialUncertainty} onChange={(v) => handleValueChange('initialUncertainty', v || 10.0)} style={{ width: '100%' }} />
            </Col>
          </Row>
        </Col>
      </Row>

      <Row gutter={kalmanLayout.rowGutter} style={{ marginBottom: kalmanLayout.sectionGap }}>
        {/* 行2：λ, minObservations */}
        <Col {...colPairProps}>
          <div style={{ marginBottom: kalmanLayout.labelMarginBottom, display: 'flex', alignItems: 'center' }}>
            <span>{kalmanText.labels.timeDecayFactor}</span>
            <Tooltip title={getParameterDescription('timeDecayFactor')}>
              <InfoCircleOutlined style={{ marginLeft: 4, color: 'var(--ant-color-text-tertiary)' }} />
            </Tooltip>
          </div>
          <Row gutter={kalmanLayout.innerGutter}>
            <Col flex="auto">
              <Slider min={sliderConfigs.timeDecayFactor.min} max={sliderConfigs.timeDecayFactor.max} step={sliderConfigs.timeDecayFactor.step} value={localConfig.timeDecayFactor} onChange={(v) => handleValueChange('timeDecayFactor', v)} marks={sliderConfigs.timeDecayFactor.marks as any} />
            </Col>
            <Col style={{ minWidth: 120 }}>
              <InputNumber min={sliderConfigs.timeDecayFactor.min} max={sliderConfigs.timeDecayFactor.max} step={sliderConfigs.timeDecayFactor.step} precision={sliderConfigs.timeDecayFactor.precision} value={localConfig.timeDecayFactor} onChange={(v) => handleValueChange('timeDecayFactor', v || 0.01)} style={{ width: '100%' }} />
            </Col>
          </Row>
        </Col>
        <Col {...colPairProps}>
          <div style={{ marginBottom: kalmanLayout.labelMarginBottom, display: 'flex', alignItems: 'center' }}>
            <span>{kalmanText.labels.minObservations}</span>
            <Tooltip title={getParameterDescription('minObservations')}>
              <InfoCircleOutlined style={{ marginLeft: 4, color: 'var(--ant-color-text-tertiary)' }} />
            </Tooltip>
          </div>
          <InputNumber min={1} max={10} value={localConfig.minObservations} onChange={(v) => handleValueChange('minObservations', v || 3)} style={{ width: '100%' }} />
        </Col>
      </Row>

      <Row gutter={kalmanLayout.rowGutter} style={{ marginBottom: kalmanLayout.sectionGap }}>
        {/* 行3：maxDaysBetween（单列） */}
        <Col {...colSingleProps}>
          <div style={{ marginBottom: kalmanLayout.labelMarginBottom, display: 'flex', alignItems: 'center' }}>
            <span>{kalmanText.labels.maxDaysBetween}</span>
            <Tooltip title={getParameterDescription('maxDaysBetween')}>
              <InfoCircleOutlined style={{ marginLeft: 4, color: 'var(--ant-color-text-tertiary)' }} />
            </Tooltip>
          </div>
          <InputNumber min={7} max={90} value={localConfig.maxDaysBetween} onChange={(v) => handleValueChange('maxDaysBetween', v || 30)} style={{ width: 240 }} />
        </Col>
      </Row>
    </Card>
  );
};

export default KalmanConfigPanel; 