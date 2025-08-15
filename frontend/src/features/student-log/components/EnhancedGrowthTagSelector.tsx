import { Button } from 'antd';
import React, { useState, useEffect } from 'react';
import { Modal, Typography, Avatar, Badge, Slider, Input, Space, Grid, Tooltip, Tag, message, Card } from 'antd';
import {
  SmileOutlined,
  FrownOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeStore } from '@/stores/themeStore';
import type { GrowthTag } from '@/api/growthApi';
import type { ClassStudent } from '@/types/api';
import { 
  getSentimentLabel, 
  getSentimentColor,
  getWeightColor,
  getWeightLabel
} from '@/constants/growthConstants';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

// ================================
// 增强版成长标签选择器
// ================================
interface EnhancedGrowthTagSelectorProps {
  open: boolean;
  student: ClassStudent;
  growthTags: GrowthTag[];
  onSelect: (student: ClassStudent, tagId: number, weight?: number, context?: string) => void;
  onCancel: () => void;
}

const EnhancedGrowthTagSelector: React.FC<EnhancedGrowthTagSelectorProps> = ({
  open,
  student,
  growthTags,
  onSelect,
  onCancel
}) => {
  const { theme } = useThemeStore();
  const { isMobile } = useResponsive();
  const screens = useBreakpoint();
  
  // 状态管理
  const [selectedTag, setSelectedTag] = useState<GrowthTag | null>(null);
  const [weight, setWeight] = useState<number>(5);
  const [context, setContext] = useState<string>('');
  const [showWeightSelector, setShowWeightSelector] = useState(false);

  // 重置状态
  useEffect(() => {
    if (!open) {
      setSelectedTag(null);
      setWeight(5);
      setContext('');
      setShowWeightSelector(false);
    }
  }, [open]);

  // 分组标签 - 修复：处理sentiment可能为null的情况
  const positiveTags = growthTags.filter(tag => tag.sentiment === 'POSITIVE' && tag.isGrowthTag);
  const negativeTags = growthTags.filter(tag => tag.sentiment === 'NEGATIVE' && tag.isGrowthTag);

  // 处理标签选择
  const handleTagClick = (tag: GrowthTag) => {
    setSelectedTag(tag);
    setWeight(tag.defaultWeight || 5); // ✅ 修复：处理defaultWeight可能为null
    setShowWeightSelector(true);
  };

  // 确认选择
  const handleConfirm = () => {
    if (!selectedTag) {
      message.warning('请先选择一个标签');
      return;
    }

    if (weight < 1 || weight > 10) {
      message.warning('权重必须在1-10之间');
      return;
    }

    if (context.length > 50) {
      message.warning('上下文说明不能超过50个字符');
      return;
    }

    onSelect(student, selectedTag.id, weight, context.trim() || undefined);
    onCancel();
  };

  // 取消选择
  const handleBack = () => {
    setSelectedTag(null);
    setWeight(5);
    setContext('');
    setShowWeightSelector(false);
  };

  // 权重标记函数已从constants导入，删除重复定义

  // 渲染标签组
  const renderTagGroup = (tags: GrowthTag[], title: string, icon: React.ReactNode, color: string) => (
  <div style={{ marginBottom: 'var(--space-4)' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: 'var(--space-2)',
        paddingBottom: 'var(--space-1)',
        borderBottom: `1px solid ${color}33`
      }}>
        {icon}
        <Text strong style={{ 
          fontSize: '14px', 
          marginInlineStart: '8px',
          color: color
        }}>
          {title}
        </Text>
        <Badge 
          count={tags.length} 
          style={{ 
            backgroundColor: color,
            marginInlineStart: '8px'
          }} 
          size="small"
        />
      </div>
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: isMobile 
          ? 'repeat(2, 1fr)' 
          : screens.lg 
            ? 'repeat(3, 1fr)' 
            : 'repeat(2, 1fr)',
        gap: 'var(--space-2)'
      }}>
        {tags.map(tag => (
          <Card
            key={tag.id}
            size="small"
            hoverable
            onClick={() => handleTagClick(tag)}
            style={{
              borderColor: color,
              borderWidth: '1px',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            styles={{
              body: { 
                padding: 'var(--space-2)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-1)'
              }
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'flex-start', 
              alignItems: 'center'
            }}>
              <Text strong style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                {tag.text}
              </Text>
              {/* 右上角不再显示权重Tag，改为第二行小字 */}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ant-color-text-secondary)' }}>
              <span>用 {tag.usageCount} · 周 {tag.recentUsage.thisWeek}</span>
              <span style={{ color: getWeightColor(tag.defaultWeight || 5) }}>权 {tag.defaultWeight || 5}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  // 权重选择界面
  const renderWeightSelector = () => (
    <div style={{ padding: '20px 0' }}>
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: selectedTag?.sentiment === 'POSITIVE' ? 'var(--ant-color-success)' : 'var(--ant-color-error)'
            }} />
            <Text strong style={{ color: selectedTag?.sentiment ? getSentimentColor(selectedTag.sentiment as 'POSITIVE' | 'NEGATIVE') : undefined }}>
              {selectedTag?.text}
            </Text>
          </div>
        }
        extra={
          <Button type="link" onClick={handleBack} size="small">重新选择</Button>
        }
  style={{ marginBottom: 'var(--space-5)' }}
      >
        {selectedTag?.description && (
          <Text type="secondary" style={{ fontSize: '13px' }}>
            {selectedTag.description}
          </Text>
        )}
      </Card>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 权重选择 */}
        <div>
  <div style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Text strong>表现程度</Text>
            <Tooltip title="1-3轻微，4-6一般，7-8明显，9-10非常明显">
              <InfoCircleOutlined style={{ color: 'var(--ant-color-text-secondary)' }} />
            </Tooltip>
            <Tag color={getWeightColor(weight)} style={{ marginInlineStart: 'auto' }}>
              权重 {weight} - {getWeightLabel(weight)}
            </Tag>
          </div>
          <Slider
            min={1}
            max={10}
            value={weight}
            onChange={setWeight}
            marks={{
              1: '1',
              3: '3',
              5: '5',
              7: '7',
              10: '10'
            }}
            step={1}
            tooltip={{
              formatter: (value) => `权重 ${value} - ${getWeightLabel(value || 5)}`
            }}
          />
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '12px', 
            color: 'var(--ant-color-text-secondary)',
  marginTop: 'var(--space-2)'
          }}>
            <span>轻微表现</span>
            <span>标准表现 (默认:{selectedTag?.defaultWeight || 5})</span>
            <span>非常明显</span>
          </div>
        </div>

        {/* 上下文输入 */}
        <div>
  <div style={{ marginBottom: 'var(--space-2)' }}>
            <Text strong>上下文说明</Text>
            <Text type="secondary" style={{ fontSize: '12px', marginInlineStart: '8px' }}>
              (可选，最多50字符)
            </Text>
          </div>
          <TextArea
            placeholder="如：课堂表现、作业完成情况、与同学互动等..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            maxLength={50}
            showCount
            rows={3}
            style={{ resize: 'none' }}
          />
        </div>
      </Space>
    </div>
  );

  return (
    <Modal
      title={
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: '12px'
        }}>
          <Avatar 
            size={40}
            style={{ 
              backgroundColor: student.gender === 'MALE' ? 'var(--ant-color-primary)' : 
                             student.gender === 'FEMALE' ? '#eb2f96' : 'var(--ant-color-info)'
            }}
          >
            {student.name?.slice(-2) || '学生'}
          </Avatar>
          <div>
            <Text strong style={{ fontSize: '16px' }}>
              {student.name} - 成长表现记录
            </Text>
  <div style={{ fontSize: '12px', color: 'var(--ant-color-text-secondary)', marginTop: '2px' }}>
              {showWeightSelector ? '设置表现程度和上下文' : '请选择今日的表现词条'}
            </div>
          </div>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={
        showWeightSelector ? [
          <Button key="back" onClick={handleBack}>重新选择</Button>,
          <Button key="cancel" onClick={onCancel}>取消</Button>,
          <Button key="confirm" type="primary" onClick={handleConfirm}>确认记录</Button>
        ] : [
          <Button key="cancel" onClick={onCancel}>取消</Button>
        ]
      }
      width={isMobile ? '95%' : showWeightSelector ? 700 : 900}
      centered
      styles={{
        body: { 
          padding: 'var(--space-6)',
          maxHeight: '70vh',
          overflow: 'auto'
        }
      }}
      destroyOnClose
    >
      {showWeightSelector ? (
        renderWeightSelector()
      ) : (
        <div style={{ padding: 'var(--space-2) 0' }}>
          {          renderTagGroup(
            positiveTags, 
            getSentimentLabel('POSITIVE'), 
            <SmileOutlined style={{ fontSize: '18px', color: getSentimentColor('POSITIVE') }} />,
            getSentimentColor('POSITIVE')
          )}
          
          {renderTagGroup(
            negativeTags, 
            getSentimentLabel('NEGATIVE'), 
            <FrownOutlined style={{ fontSize: '18px', color: getSentimentColor('NEGATIVE') }} />,
            getSentimentColor('NEGATIVE')
          )}
          
          {positiveTags.length === 0 && negativeTags.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 0',
              color: 'var(--ant-color-text-secondary)'
            }}>
              <Text>暂无成长标签，请先在系统中添加标签</Text>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default EnhancedGrowthTagSelector; 