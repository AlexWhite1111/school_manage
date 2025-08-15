import AppButton from '@/components/AppButton';
import React, { useState } from 'react';
import { Modal, Slider, Input, message, Tooltip, Space } from 'antd';
import { PlusOutlined, TagOutlined } from '@ant-design/icons';
import { GrowthTag, GrowthLogRequest } from '../../api/growthApi';
import { growthUtils } from '../../utils/growthUtils';

interface GrowthTagButtonProps {
  tag: GrowthTag;
  enrollmentId: number;
  studentName: string;
  onRecord: (data: GrowthLogRequest) => Promise<void>;
  size?: 'small' | 'middle' | 'large';
  type?: 'primary' | 'default' | 'dashed' | 'text' | 'link';
  disabled?: boolean;
  showQuickRecord?: boolean; // 是否显示快速记录选项
}

const GrowthTagButton: React.FC<GrowthTagButtonProps> = ({
  tag,
  enrollmentId,
  studentName,
  onRecord,
  size = 'small',
  type = 'default',
  disabled = false,
  showQuickRecord = true
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [weight, setWeight] = useState(tag.defaultWeight);
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);

  // 快速记录（使用默认权重）
  const handleQuickRecord = async () => {
    try {
      setLoading(true);
      await onRecord({
        enrollmentId,
        tagId: tag.id,
        weight: tag.defaultWeight
      });
      message.success(`已为 ${studentName} 记录"${tag.text}"表现`);
    } catch (error) {
      message.error('记录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 详细记录（自定义权重和上下文）
  const handleDetailedRecord = async () => {
    if (!growthUtils.isValidWeight(weight)) {
      message.error('权重必须是1-10之间的整数');
      return;
    }

    try {
      setLoading(true);
      await onRecord({
        enrollmentId,
        tagId: tag.id,
        weight,
        context: context.trim() || undefined
      });
      message.success(`已为 ${studentName} 记录"${tag.text}"表现`);
      setModalVisible(false);
      setContext('');
      setWeight(tag.defaultWeight);
    } catch (error) {
      message.error('记录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const getWeightMarks = () => {
    return {
      1: '1',
      3: '3',
      5: '5',
      7: '7',
      10: '10'
    };
  };

  const getButtonColor = () => {
    return tag.sentiment === 'POSITIVE' ? 'var(--ant-color-success)' : 'var(--ant-color-error)';
  };

  return (
    <>
      <Space.Compact>
        {/* 主按钮 - 快速记录 */}
        <Tooltip title={`快速记录"${tag.text}"（权重${tag.defaultWeight}）`}>
          <AppButton
            type={type}
            size={size}
            icon={<TagOutlined />}
            loading={loading}
            disabled={disabled}
            onClick={handleQuickRecord}
            style={{ 
              borderColor: getButtonColor(),
              color: type === 'default' ? getButtonColor() : undefined
            }}
          >
            {tag.text}
          </AppButton>
        </Tooltip>

        {/* 详细记录按钮 */}
        {showQuickRecord && (
          <Tooltip title="自定义权重和上下文">
            <AppButton
              type={type}
              size={size}
              icon={<PlusOutlined />}
              disabled={disabled}
              onClick={() => setModalVisible(true)}
              style={{ 
                borderColor: getButtonColor(),
                color: type === 'default' ? getButtonColor() : undefined
              }}
            />
          </Tooltip>
        )}
      </Space.Compact>

      {/* 详细记录弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TagOutlined style={{ color: getButtonColor() }} />
            <span>记录成长表现</span>
          </div>
        }
        open={modalVisible}
        onOk={handleDetailedRecord}
        onCancel={() => {
          setModalVisible(false);
          setContext('');
          setWeight(tag.defaultWeight);
        }}
        confirmLoading={loading}
        okText="确认记录"
        cancelText="取消"
        width={480}
      >
          <div style={{ padding: 'var(--space-4) 0' }}>
          {/* 学生和标签信息 */}
            <div style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-3)', backgroundColor: 'var(--ant-color-bg-layout)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ marginBottom: '4px' }}>
              <strong>学生：</strong>{studentName}
            </div>
            <div style={{ marginBottom: '4px' }}>
              <strong>标签：</strong>
              <span style={{ color: getButtonColor() }}>{tag.text}</span>
              <span style={{ 
                marginLeft: '8px', 
                fontSize: '12px', 
                color: 'var(--ant-color-text-tertiary)',
                padding: '2px 6px',
                backgroundColor: tag.sentiment === 'POSITIVE' ? 'var(--ant-color-success-bg)' : 'var(--ant-color-error-bg)',
                borderRadius: '4px'
              }}>
                {tag.sentiment === 'POSITIVE' ? '正面' : '负面'}
              </span>
            </div>
            {tag.description && (
              <div style={{ fontSize: '12px', color: 'var(--ant-color-text-tertiary)' }}>
                {tag.description}
              </div>
            )}
          </div>

          {/* 权重选择 */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <div style={{ marginBottom: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'medium' }}>表现权重</span>
              <span style={{ 
                fontSize: '16px', 
                fontWeight: 'bold', 
                color: getButtonColor() 
              }}>
                {weight} - {growthUtils.getWeightDescription(weight)}
              </span>
            </div>
            <Slider
              min={1}
              max={10}
              marks={getWeightMarks()}
              step={1}
              value={weight}
              onChange={setWeight}
              tooltip={{
                formatter: (value) => `${value} - ${growthUtils.getWeightDescription(value!)}`
              }}
            />
            <div style={{ fontSize: '12px', color: 'var(--ant-color-text-tertiary)', marginTop: '8px' }}>
              权重越高表示该次表现越突出，对成长分数影响越大
            </div>
          </div>

          {/* 上下文输入 */}
            <div>
              <div style={{ marginBottom: 'var(--space-2)', fontWeight: 'medium' }}>
              上下文说明
              <span style={{ fontSize: '12px', color: 'var(--ant-color-text-tertiary)', marginLeft: '8px' }}>
                （可选，最多50字符）
              </span>
            </div>
            <Input.TextArea
              placeholder="例如：课堂表现、作业完成、同学互动等"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              maxLength={50}
              rows={3}
              showCount
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default GrowthTagButton; 