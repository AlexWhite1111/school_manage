import React, { useState, useEffect } from 'react';
import { 
  Modal, Input, Select, Button, Table, Tag, message, Space, Divider, 
  Typography, Popconfirm, Switch, Tooltip, Badge, Alert 
} from 'antd';
import { 
  PlusOutlined, DeleteOutlined, RedoOutlined, ExclamationCircleOutlined, 
  EyeOutlined, EyeInvisibleOutlined 
} from '@ant-design/icons';
import * as studentLogApi from '@/api/studentLogApi';
import { PREDEFINED_POSITIVE_TAGS, PREDEFINED_NEGATIVE_TAGS } from '@/constants/predefinedTags';
import type { Tag as GrowthTag, TagType } from '@/types/api';

const { Title, Text } = Typography;

interface GrowthTagManagerProps {
  open: boolean;
  tags: GrowthTag[];
  onClose: () => void;
  onTagsUpdate: (tags: GrowthTag[]) => void;
}

const GrowthTagManager: React.FC<GrowthTagManagerProps> = ({
  open,
  tags,
  onClose,
  onTagsUpdate
}) => {
  const [localTags, setLocalTags] = useState<GrowthTag[]>(tags);
  const [newText, setNewText] = useState('');
  const [newType, setNewType] = useState<'positive' | 'negative'>('positive');
  const [creating, setCreating] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setLocalTags(tags);
  }, [tags]);

  // 刷新标签列表
  const refreshTags = async () => {
    setRefreshing(true);
    try {
      const fetched = await studentLogApi.getGrowthTags('all', showDeleted);
      const growthOnly = fetched.filter(t => t.type === 'GROWTH_POSITIVE' || t.type === 'GROWTH_NEGATIVE');
      setLocalTags(growthOnly);
      setSelectedRowKeys([]); // 清空选择，避免与最新数据不一致
      onTagsUpdate(growthOnly.filter(tag => !tag.deletedAt)); // 只传递未删除的标签给父组件
      message.success('标签列表已刷新');
    } catch (error) {
      console.error('刷新标签列表失败:', error);
      message.error('刷新标签列表失败');
    } finally {
      setRefreshing(false);
    }
  };

  // 切换显示已删除标签
  const toggleShowDeleted = async (checked: boolean) => {
    setShowDeleted(checked);
    setRefreshing(true);
    try {
      const fetched = await studentLogApi.getGrowthTags('all', checked);
      const growthOnly = fetched.filter(t => t.type === 'GROWTH_POSITIVE' || t.type === 'GROWTH_NEGATIVE');
      setLocalTags(growthOnly);
      setSelectedRowKeys([]); // 清空选择
    } catch (error) {
      console.error('切换显示模式失败:', error);
      message.error('切换显示模式失败');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newText.trim()) {
      return message.warning('请输入标签内容');
    }
    
    setCreating(true);
    try {
      const apiType = (newType === 'positive' ? 'GROWTH_POSITIVE' : 'GROWTH_NEGATIVE') as TagType;
      const newTag = await studentLogApi.createGrowthTag({ 
        text: newText.trim(), 
        type: apiType, 
        isPersonal: true 
      });
      
      await refreshTags(); // 刷新列表
      setNewText('');
      message.success('标签创建成功');
    } catch (error) {
      console.error('创建标签失败:', error);
      message.error('创建标签失败');
    } finally {
      setCreating(false);
    }
  };

  const createPredefinedTag = async (text: string, type: 'positive' | 'negative') => {
    try {
      const apiType = (type === 'positive' ? 'GROWTH_POSITIVE' : 'GROWTH_NEGATIVE') as TagType;
      const newTag = await studentLogApi.createGrowthTag({ 
        text, 
        type: apiType, 
        isPersonal: false 
      });
      
      await refreshTags(); // 刷新列表
      message.success(`预设标签"${text}"创建成功`);
    } catch (error: any) {
      console.error('创建预设标签失败:', error);
      // 如果已存在 (409)，则刷新列表显示已有标签
      if (error?.response?.status === 409) {
        await refreshTags();
        message.success(`已添加预设标签"${text}"`);
        return;
      }
      message.error(`创建预设标签"${text}"失败`);
    }
  };

  const activeTagTexts = localTags.filter(tag => !tag.deletedAt).map(tag => tag.text);
  const missingPositiveTags = PREDEFINED_POSITIVE_TAGS.filter(text => !activeTagTexts.includes(text));
  const missingNegativeTags = PREDEFINED_NEGATIVE_TAGS.filter(text => !activeTagTexts.includes(text));

  const deletedTagCount = localTags.filter(tag => tag.deletedAt).length;
  const selectedDeletedTags = localTags.filter(t => 
    selectedRowKeys.includes(t.id) && t.deletedAt && t.isPersonal
  );
  const selectedActiveTags = localTags.filter(t => 
    selectedRowKeys.includes(t.id) && !t.deletedAt && t.isPersonal
  );

  const columns = [
    {
      title: '标签',
      dataIndex: 'text',
      key: 'text',
      render: (text: string, record: GrowthTag) => (
        <span style={{ opacity: record.deletedAt ? 0.6 : 1 }}>
          <Tag color={record.deletedAt ? 'default' : undefined}>
            {text}
          </Tag>
          {record.deletedAt && <Tag color="red" style={{ fontSize: '11px' }}>已删除</Tag>}
        </span>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string, record: GrowthTag) => (
        <Tag color={
          record.deletedAt ? 'default' : 
          type === 'GROWTH_POSITIVE' ? 'green' : 'red'
        }>
          {type === 'GROWTH_POSITIVE' ? '正面' : '负面'}
        </Tag>
      )
    },
    {
      title: '来源',
      dataIndex: 'isPersonal',
      key: 'isPersonal',
      render: (isPersonal: boolean, record: GrowthTag) => (
        <Tag color={record.deletedAt ? 'default' : isPersonal ? 'blue' : 'orange'}>
          {isPersonal ? '自定义' : '预设'}
        </Tag>
      )
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      key: 'usageCount',
      render: (count: number) => <Badge count={count} showZero color="#faad14" />
    },
    {
      title: '状态',
      key: 'status',
      render: (_: any, record: GrowthTag) => {
        if (record.deletedAt) {
          return (
            <Space>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {new Date(record.deletedAt).toLocaleDateString()}
              </Text>
              {record.deletedBy && (
                <Tooltip title={`删除者: ${record.deletedBy.username}`}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    by {record.deletedBy.username}
                  </Text>
                </Tooltip>
              )}
            </Space>
          );
        }
        return <Tag color="green">活跃</Tag>;
      }
    }
  ];

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    
    setDeleting(true);
    try {
      const selectedTags = localTags.filter(t => selectedRowKeys.includes(t.id));
      const personalTags = selectedTags.filter(t => t.isPersonal);
      
      if (personalTags.length === 0) {
        message.warning('只能删除个人自定义标签');
        return;
      }

      await Promise.all(
        personalTags.map(tag => studentLogApi.deleteGrowthTag(tag.id))
      );
      
      await refreshTags(); // 刷新列表
      setSelectedRowKeys([]);
      message.success(`已软删除 ${personalTags.length} 个标签`);
    } catch (error) {
      console.error('批量删除标签失败:', error);
      message.error('批量删除标签失败');
    } finally {
      setDeleting(false);
    }
  };

  const handleBatchRestore = async () => {
    if (selectedRowKeys.length === 0) return;
    
    setRestoring(true);
    try {
      const selectedTags = localTags.filter(t => selectedRowKeys.includes(t.id) && t.deletedAt);
      const personalTags = selectedTags.filter(t => t.isPersonal);
      
      if (personalTags.length === 0) {
        message.warning('只能恢复个人自定义标签');
        return;
      }

      await Promise.all(
        personalTags.map(tag => studentLogApi.restoreGrowthTag(tag.id))
      );
      
      await refreshTags(); // 刷新列表
      setSelectedRowKeys([]);
      message.success(`已恢复 ${personalTags.length} 个标签`);
    } catch (error) {
      console.error('批量恢复标签失败:', error);
      message.error('批量恢复标签失败');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Modal
      title="成长标签管理"
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
    >
      <div style={{ marginBottom: 24 }}>
        <Title level={4}>创建自定义标签</Title>
        <Space.Compact style={{ display: 'flex', marginBottom: 16 }}>
          <Input
            placeholder="输入标签文本"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onPressEnter={handleCreateTag}
            style={{ flex: 1 }}
          />
          <Select
            value={newType}
            onChange={setNewType}
            style={{ width: 120 }}
          >
            <Select.Option value="positive">正面</Select.Option>
            <Select.Option value="negative">负面</Select.Option>
          </Select>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleCreateTag}
            loading={creating}
          >
            新建
          </Button>
        </Space.Compact>
      </div>

      {(missingPositiveTags.length > 0 || missingNegativeTags.length > 0) && (
        <>
          <Divider />
          <div style={{ marginBottom: 24 }}>
            <Title level={4}>添加预设标签</Title>
            <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
              以下是系统预设的标签，点击可快速添加到词库中
            </Text>
            
            {missingPositiveTags.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ color: '#52c41a', marginBottom: 8, display: 'block' }}>
                  正面标签:
                </Text>
                <Space wrap>
                  {missingPositiveTags.map(text => (
                    <Button
                      key={text}
                      size="small"
                      type="dashed"
                      style={{ color: '#52c41a', borderColor: '#52c41a' }}
                      onClick={() => createPredefinedTag(text, 'positive')}
                    >
                      + {text}
                    </Button>
                  ))}
                </Space>
              </div>
            )}

            {missingNegativeTags.length > 0 && (
              <div>
                <Text strong style={{ color: '#ff4d4f', marginBottom: 8, display: 'block' }}>
                  负面标签:
                </Text>
                <Space wrap>
                  {missingNegativeTags.map(text => (
                    <Button
                      key={text}
                      size="small"
                      type="dashed"
                      style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}
                      onClick={() => createPredefinedTag(text, 'negative')}
                    >
                      + {text}
                    </Button>
                  ))}
                </Space>
              </div>
            )}
          </div>
          <Divider />
        </>
      )}

      <div>
        <Space style={{ marginBottom: 8 }} wrap>
          {/* 显示 / 隐藏已删除标签开关 */}
          <Tooltip title={showDeleted ? '隐藏已删除标签' : `显示已删除标签 (${deletedTagCount})`}>
            <Switch
              checked={showDeleted}
              onChange={toggleShowDeleted}
              checkedChildren={<EyeInvisibleOutlined />}
              unCheckedChildren={<EyeOutlined />}
            />
          </Tooltip>

          {/* 刷新按钮 */}
          <Tooltip title="刷新">
            <Button icon={<RedoOutlined />} onClick={refreshTags} loading={refreshing} />
          </Tooltip>

          {/* 删除按钮（仅当选择了活跃个人标签） */}
          {selectedActiveTags.length > 0 && (
            <Popconfirm title="确定删除选中的标签吗？" onConfirm={handleBatchDelete} okText="删除" cancelText="取消">
              <Button type="primary" danger icon={<DeleteOutlined />} loading={deleting}>删除选中 ({selectedActiveTags.length})</Button>
            </Popconfirm>
          )}

          {/* 恢复按钮（仅当选择了已删除个人标签） */}
          {selectedDeletedTags.length > 0 && (
            <Popconfirm title="确定恢复选中的标签吗？" onConfirm={handleBatchRestore} okText="恢复" cancelText="取消">
              <Button type="primary" icon={<RedoOutlined />} loading={restoring}>恢复选中 ({selectedDeletedTags.length})</Button>
            </Popconfirm>
          )}
        </Space>
        <Title level={4}>现有标签</Title>
        <Table
          columns={columns}
          dataSource={localTags}
          rowKey="id"
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: (record: GrowthTag) => ({ disabled: !record.isPersonal })
          }}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: false }}
        />
      </div>
    </Modal>
  );
};

export default GrowthTagManager; 