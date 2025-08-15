import AppButton from '@/components/AppButton';
import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, Table, Tag, message, Space, Divider, Typography, Popconfirm, Switch, Tooltip, Badge, Alert } from 'antd';
import { 
  PlusOutlined, DeleteOutlined, RedoOutlined, ExclamationCircleOutlined, 
  EyeOutlined, EyeInvisibleOutlined 
} from '@ant-design/icons';
import * as studentLogApi from '@/api/studentLogApi';
import type { Tag as ExamTag, TagType } from '@/types/api';

const { Title, Text } = Typography;

interface ExamTagManagerProps {
  open: boolean;
  tags: ExamTag[];
  onClose: () => void;
  onTagsUpdate: (tags: ExamTag[]) => void;
}

const ExamTagManager: React.FC<ExamTagManagerProps> = ({
  open,
  tags,
  onClose,
  onTagsUpdate
}) => {
  const [localTags, setLocalTags] = useState<ExamTag[]>(tags);
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
      const examOnly = fetched.filter(t => t.type === 'EXAM_POSITIVE' || t.type === 'EXAM_NEGATIVE');
      setLocalTags(examOnly);
      setSelectedRowKeys([]);
      onTagsUpdate(examOnly);
    } catch (error) {
      console.error('刷新考试标签失败:', error);
      message.error('刷新考试标签失败');
    } finally {
      setRefreshing(false);
    }
  };

  // 创建新标签
  const handleCreate = async () => {
    if (!newText.trim()) {
      message.warning('请输入标签文本');
      return;
    }

    const tagType = newType === 'positive' ? 'EXAM_POSITIVE' as TagType : 'EXAM_NEGATIVE' as TagType;

    setCreating(true);
    try {
      const newTag = await studentLogApi.createGrowthTag({
        text: newText.trim(),
        type: tagType,
        isPersonal: true
      });

      const updatedTags = [...localTags, newTag];
      setLocalTags(updatedTags);
      onTagsUpdate(updatedTags);
      setNewText('');
      message.success('考试标签创建成功');
    } catch (error) {
      console.error('创建考试标签失败:', error);
      message.error('创建考试标签失败');
    } finally {
      setCreating(false);
    }
  };

  // 批量删除标签
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的标签');
      return;
    }

    setDeleting(true);
    try {
      const deletePromises = selectedRowKeys.map(id => 
        studentLogApi.deleteGrowthTag(Number(id))
      );
      await Promise.all(deletePromises);

      await refreshTags();
      setSelectedRowKeys([]);
      message.success(`成功删除 ${selectedRowKeys.length} 个考试标签`);
    } catch (error) {
      console.error('批量删除考试标签失败:', error);
      message.error('批量删除考试标签失败');
    } finally {
      setDeleting(false);
    }
  };

  // 批量恢复标签
  const handleBatchRestore = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要恢复的标签');
      return;
    }

    setRestoring(true);
    try {
      const restorePromises = selectedRowKeys.map(id => 
        studentLogApi.restoreGrowthTag(Number(id))
      );
      await Promise.all(restorePromises);

      await refreshTags();
      setSelectedRowKeys([]);
      message.success(`成功恢复 ${selectedRowKeys.length} 个考试标签`);
    } catch (error) {
      console.error('批量恢复考试标签失败:', error);
      message.error('批量恢复考试标签失败');
    } finally {
      setRestoring(false);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '标签文本',
      dataIndex: 'text',
      key: 'text',
      width: '25%',
      render: (text: string, record: ExamTag) => (
        <Space>
          <Tag 
            color={record.type === 'EXAM_POSITIVE' ? 'green' : 'red'}
            style={{
              opacity: record.deletedAt ? 0.6 : 1,
              textDecoration: record.deletedAt ? 'line-through' : 'none'
            }}
          >
            {text}
          </Tag>
          {record.deletedAt && <Badge status="error" text="已删除" />}
        </Space>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: '15%',
      render: (type: TagType) => (
        <Tag color={type === 'EXAM_POSITIVE' ? 'green' : 'red'}>
          {type === 'EXAM_POSITIVE' ? '正面表现' : '负面表现'}
        </Tag>
      )
    },
    {
      title: '标签属性',
      key: 'tagProperty',
      width: '15%',
      render: (record: ExamTag) => {
        if (record.isPredefined) {
          return <Tag color="blue">预定义</Tag>;
        }
        if (record.isPersonal) {
          return <Tag color="orange">个人</Tag>;
        }
        return <Tag color="purple">全局</Tag>;
      }
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      key: 'usageCount',
      width: '10%',
      render: (count: number) => (
        <Badge count={count} showZero color="var(--ant-color-warning)" />
      )
    },
    {
      title: '创建者',
      key: 'creator',
      width: '12%',
      render: (record: ExamTag) => (
        <Text type="secondary">
          {record.creator?.username || '系统'}
        </Text>
      )
    },
    {
      title: '状态',
      key: 'status',
      width: '10%',
      render: (record: ExamTag) => (
        record.deletedAt ? 
          <Tag color="red">已删除</Tag> : 
          <Tag color="green">正常</Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: '13%',
      render: (record: ExamTag) => {
        if (record.isPredefined) {
          return <Text type="secondary">不可操作</Text>;
        }

        if (record.deletedAt) {
          return (
            <Popconfirm
              title="确定要恢复这个考试标签吗？"
              onConfirm={() => handleBatchRestore()}
              okText="确定"
              cancelText="取消"
            >
              <AppButton 
                hierarchy="link" 
                size="sm" 
                icon={<RedoOutlined />}
                loading={restoring}
              >
                恢复
              </AppButton>
            </Popconfirm>
          );
        }

        return (
          <Popconfirm
            title="确定要删除这个考试标签吗？"
            description="删除后标签将被软删除，可以恢复"
            onConfirm={() => {
              setSelectedRowKeys([record.id]);
              handleBatchDelete();
            }}
            okText="确定"
            cancelText="取消"
          >
            <AppButton 
              hierarchy="link" 
              danger 
              size="sm" 
              icon={<DeleteOutlined />}
              loading={deleting}
            >
              删除
            </AppButton>
          </Popconfirm>
        );
      }
    }
  ];

  // 过滤数据
  const filteredTags = localTags.filter(tag => {
    if (!showDeleted && tag.deletedAt) return false;
    return true;
  });

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => setSelectedRowKeys(selectedKeys),
    getCheckboxProps: (record: ExamTag) => ({
      disabled: record.isPredefined
    })
  };

  const handleClose = () => {
    setSelectedRowKeys([]);
    setNewText('');
    setNewType('positive');
    setShowDeleted(false);
    onClose();
  };

  return (
    <Modal
      title="考试表现标签管理"
      open={open}
      onCancel={handleClose}
      width={1200}
      footer={[
        <AppButton key="close" onClick={handleClose}>
          关闭
        </AppButton>
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        
        {/* 功能说明 */}
        <Alert
          message="考试表现标签管理"
          description="管理考试评价标签，支持创建个人自定义标签。预定义标签不可删除或修改。"
          type="info"
          showIcon
        />

        {/* 创建新标签区域 */}
        <div style={{ 
          padding: '16px', 
                        backgroundColor: 'var(--ant-color-bg-layout)', 
          borderRadius: '6px',
          border: '1px solid #f0f0f0'
        }}>
          <Title level={5} style={{ margin: '0 0 12px 0' }}>
  <PlusOutlined style={{ marginRight: 'var(--space-2)', color: 'var(--ant-color-primary)' }} />
            创建新考试标签
          </Title>
          
          <Space.Compact style={{ width: '100%' }}>
            <Select
              value={newType}
              onChange={setNewType}
              style={{ width: '120px' }}
            >
              <Select.Option value="positive">
                <Tag color="green">正面表现</Tag>
              </Select.Option>
              <Select.Option value="negative">
                <Tag color="red">负面表现</Tag>
              </Select.Option>
            </Select>
            
            <Input
              placeholder="输入考试表现标签文本"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onPressEnter={handleCreate}
              style={{ flex: 1 }}
              maxLength={20}
            />
            
            <AppButton 
              hierarchy="primary" 
              onClick={handleCreate}
              loading={creating}
              icon={<PlusOutlined />}
            >
              创建
            </AppButton>
          </Space.Compact>
        </div>

        <Divider style={{ margin: '0' }} />

        {/* 标签管理区域 */}
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
  marginBottom: 'var(--space-4)'
          }}>
            <Space>
              <Title level={5} style={{ margin: 0 }}>
                考试标签列表 
                <Badge 
                  count={filteredTags.length} 
  style={{ marginLeft: 'var(--space-2)' }}
                  color="var(--ant-color-primary)"
                />
              </Title>
              
              <Tooltip title="刷新考试标签列表">
                <AppButton 
                  icon={<RedoOutlined />} 
                  onClick={refreshTags}
                  loading={refreshing}
                  size="small"
                />
              </Tooltip>
            </Space>

            <Space>
              <Space>
                {showDeleted ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                <Text type="secondary">显示已删除</Text>
                <Switch
                  checked={showDeleted}
                  onChange={setShowDeleted}
                  size="small"
                />
              </Space>

              {selectedRowKeys.length > 0 && (
                <Space>
                  {!showDeleted && (
                    <Popconfirm
                      title={`确定要删除选中的 ${selectedRowKeys.length} 个考试标签吗？`}
                      description="删除后标签将被软删除，可以恢复"
                      onConfirm={handleBatchDelete}
                      okText="确定"
                      cancelText="取消"
                    >
                      <AppButton 
                        danger 
                        icon={<DeleteOutlined />}
                        loading={deleting}
                        size="small"
                      >
                        批量删除 ({selectedRowKeys.length})
                      </AppButton>
                    </Popconfirm>
                  )}

                  {showDeleted && (
                    <Popconfirm
                      title={`确定要恢复选中的 ${selectedRowKeys.length} 个考试标签吗？`}
                      onConfirm={handleBatchRestore}
                      okText="确定"
                      cancelText="取消"
                    >
                      <AppButton 
                        hierarchy="primary"
                        icon={<RedoOutlined />}
                        loading={restoring}
                        size="small"
                      >
                        批量恢复 ({selectedRowKeys.length})
                      </AppButton>
                    </Popconfirm>
                  )}
                </Space>
              )}
            </Space>
          </div>

          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={filteredTags}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条考试标签`
            }}
            size="small"
            scroll={{ x: 1000 }}
          />
        </div>
      </Space>
    </Modal>
  );
};

export default ExamTagManager; 