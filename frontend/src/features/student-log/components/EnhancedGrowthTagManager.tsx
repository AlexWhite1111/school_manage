import React, { useState, useEffect } from 'react';
import { 
  Modal, Input, Select, Button, Table, Tag, message, Space, Divider, 
  Typography, Popconfirm, Switch, Tooltip, Badge, Alert, InputNumber,
  Form, Card
} from 'antd';
import { 
  PlusOutlined, DeleteOutlined, RedoOutlined, ExclamationCircleOutlined, 
  EyeOutlined, EyeInvisibleOutlined, EditOutlined 
} from '@ant-design/icons';
import { useGrowthData } from '@/hooks/useGrowthData';
import type { GrowthTag, CreateGrowthTagRequest } from '@/api/growthApi';
import { 
  SENTIMENT_LABELS, 
  getSentimentLabel, 
  getSentimentColor,
  getWeightColor,
  type GrowthSentiment 
} from '@/constants/growthConstants';

const { Title, Text } = Typography;
const { Option } = Select;

interface EnhancedGrowthTagManagerProps {
  open: boolean;
  onClose: () => void;
}

const EnhancedGrowthTagManager: React.FC<EnhancedGrowthTagManagerProps> = ({
  open,
  onClose
}) => {
  const {
    growthTags,
    loading,
    createGrowthTag,
    updateGrowthTag,
    deleteGrowthTag,
    loadGrowthTags
  } = useGrowthData();

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [editingTag, setEditingTag] = useState<GrowthTag | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // 处理创建标签
  const handleCreateTag = async (values: any) => {
    try {
      const createData: CreateGrowthTagRequest = {
        text: values.text.trim(),
        sentiment: values.sentiment,
        defaultWeight: values.defaultWeight,
        description: values.description?.trim(),
      };
      
      await createGrowthTag(createData);
      form.resetFields();
      message.success('标签创建成功');
    } catch (error) {
      console.error('创建标签失败:', error);
    }
  };

  // 打开编辑模态框
  const handleEditTag = (tag: GrowthTag) => {
    setEditingTag(tag);
    editForm.setFieldsValue({
      text: tag.text,
      sentiment: tag.sentiment,
      defaultWeight: tag.defaultWeight,
      description: tag.description || '',
    });
    setEditModalOpen(true);
  };

  // 处理编辑标签
  const handleUpdateTag = async (values: any) => {
    if (!editingTag) return;

    try {
      const updateData = {
        text: values.text.trim(),
        sentiment: values.sentiment,
        defaultWeight: values.defaultWeight,
        description: values.description?.trim(),
      };
      
      await updateGrowthTag(editingTag.id, updateData);
      setEditModalOpen(false);
      setEditingTag(null);
      editForm.resetFields();
      message.success('标签更新成功');
    } catch (error) {
      console.error('更新标签失败:', error);
      message.error('更新标签失败');
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditModalOpen(false);
    setEditingTag(null);
    editForm.resetFields();
  };

  // 处理批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的标签');
      return;
    }

    setDeleting(true);
    try {
      const promises = selectedRowKeys.map(id => deleteGrowthTag(Number(id)));
      await Promise.all(promises);
      setSelectedRowKeys([]);
      message.success(`成功删除 ${promises.length} 个标签`);
    } catch (error) {
      console.error('批量删除失败:', error);
      message.error('批量删除失败');
    } finally {
      setDeleting(false);
    }
  };

  // 切换显示已删除标签
  const toggleShowDeleted = async (checked: boolean) => {
    setShowDeleted(checked);
    // 重新加载标签，包含已删除的
    try {
      await loadGrowthTags({
        // 这里需要API支持includeDeleted参数
      });
    } catch (error) {
      console.error('切换显示模式失败:', error);
    }
  };

  // 过滤显示的标签
  // GrowthTag 没有 deletedAt 字段，使用 isActive 作为启用状态
  const displayTags = showDeleted 
    ? growthTags 
    : growthTags.filter(tag => tag.isActive !== false);

  // 表格列定义
  const columns = [
    {
      title: '标签名称',
      dataIndex: 'text',
      key: 'text',
      render: (text: string, record: GrowthTag) => (
        <Space>
          <Text strong={record.isActive !== false} type={record.isActive === false ? 'secondary' : undefined}>
            {text}
          </Text>
                     {record.isActive === false && <Tag color="red">已禁用</Tag>}
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'sentiment',
      key: 'sentiment',
      render: (sentiment: string | null) => {
        if (sentiment === 'POSITIVE') {
          return <Tag color={getSentimentColor('POSITIVE')}>{getSentimentLabel('POSITIVE')}</Tag>;
        } else if (sentiment === 'NEGATIVE') {
          return <Tag color={getSentimentColor('NEGATIVE')}>{getSentimentLabel('NEGATIVE')}</Tag>;
        }
        return <Tag color="gray">未设置</Tag>;
      },
    },
    {
      title: '默认权重',
      dataIndex: 'defaultWeight',
      key: 'defaultWeight',
      render: (weight: number | null) => (
        <Tag color={weight ? getWeightColor(weight) : 'gray'}>
          {weight || '未设置'}
        </Tag>
      ),
    },
    {
      title: '使用次数',
      dataIndex: 'usageCount',
      key: 'usageCount',
      render: (count: number) => (
        <Badge count={count} style={{ backgroundColor: '#52c41a' }} />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: GrowthTag) => (
        <Space size="middle">
           {record.isActive !== false ? (
            <>
              <Button 
                type="link" 
                size="small" 
                icon={<EditOutlined />}
                onClick={() => handleEditTag(record)}
              >
                编辑
              </Button>
              <Popconfirm
                title="确定删除这个标签吗？"
                onConfirm={() => deleteGrowthTag(record.id)}
                okText="确定"
                cancelText="取消"
              >
                <Button type="link" danger size="small" icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </>
          ) : (
            <Button type="link" size="small" icon={<RedoOutlined />}>
              恢复
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    getCheckboxProps: (record: GrowthTag) => ({
      disabled: record.isActive === false,
    }),
  };

  return (
    <Modal
      title={
        <Space>
          <PlusOutlined style={{ color: '#1890ff' }} />
          <span>Growth标签管理</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
      styles={{
        body: { padding: '24px' }
      }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 创建新标签表单 */}
        <Card title="创建新标签" size="small">
          <Form
            form={form}
            layout="inline"
            onFinish={handleCreateTag}
            style={{ width: '100%' }}
          >
            <Form.Item
              name="text"
              rules={[
                { required: true, message: '请输入标签名称' },
                { min: 2, max: 20, message: '标签名称长度为2-20字符' }
              ]}
              style={{ width: 200 }}
            >
              <Input placeholder="标签名称" maxLength={20} />
            </Form.Item>
            
            <Form.Item
              name="sentiment"
              rules={[{ required: true, message: '请选择标签类型' }]}
              style={{ width: 150 }}
            >
              <Select placeholder="选择类型">
                <Option value="POSITIVE">{getSentimentLabel('POSITIVE')}</Option>
                <Option value="NEGATIVE">{getSentimentLabel('NEGATIVE')}</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              name="defaultWeight"
              rules={[
                { required: true, message: '请设置默认权重' },
                { type: 'number', min: 1, max: 10, message: '权重范围1-10' }
              ]}
              style={{ width: 120 }}
            >
              <InputNumber
                placeholder="权重"
                min={1}
                max={10}
                style={{ width: '100%' }}
              />
            </Form.Item>
            
            <Form.Item
              name="description"
              style={{ width: 200 }}
            >
              <Input placeholder="描述(可选)" maxLength={100} />
            </Form.Item>
            
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                创建标签
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* 操作工具栏 */}
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Button
              type="primary"
              danger
              disabled={selectedRowKeys.length === 0}
              loading={deleting}
              onClick={handleBatchDelete}
              icon={<DeleteOutlined />}
            >
              批量删除 ({selectedRowKeys.length})
            </Button>
            
            <Button
              onClick={() => loadGrowthTags()}
              loading={loading}
              icon={<RedoOutlined />}
            >
              刷新列表
            </Button>
          </Space>
          
          <Space>
            <Text type="secondary">显示已删除标签</Text>
            <Switch
              checked={showDeleted}
              onChange={toggleShowDeleted}
              size="small"
            />
          </Space>
        </Space>

        {/* 标签列表表格 */}
        <Table
          columns={columns}
          dataSource={displayTags}
          rowKey="id"
          rowSelection={rowSelection}
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `显示 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
          }}
          size="small"
        />

        {/* 统计信息 */}
        <Alert
          message={
            <Space split={<Divider type="vertical" />}>
              <Text>总标签数: {growthTags.length}</Text>
              <Text>{getSentimentLabel('POSITIVE')}: {growthTags.filter(t => t.sentiment === 'POSITIVE').length}</Text>
              <Text>{getSentimentLabel('NEGATIVE')}: {growthTags.filter(t => t.sentiment === 'NEGATIVE').length}</Text>
              <Text>已禁用: {growthTags.filter(t => t.isActive === false).length}</Text>
            </Space>
          }
          type="info"
          showIcon
        />
      </Space>

      {/* 编辑标签模态框 */}
      <Modal
      title={
        <Space>
          <EditOutlined style={{ color: '#1890ff' }} />
          <span>编辑标签</span>
        </Space>
      }
      open={editModalOpen}
      onCancel={handleCancelEdit}
      footer={null}
      destroyOnClose
      width={600}
    >
      <Form
        form={editForm}
        layout="vertical"
        onFinish={handleUpdateTag}
        initialValues={{
          defaultWeight: 5,
        }}
      >
        <Form.Item
          label="标签名称"
          name="text"
          rules={[
            { required: true, message: '请输入标签名称' },
            { min: 2, max: 20, message: '标签名称长度在2-20个字符之间' }
          ]}
        >
          <Input placeholder="输入标签名称" maxLength={20} showCount />
        </Form.Item>

        <Form.Item
          label="标签类型"
          name="sentiment"
          rules={[{ required: true, message: '请选择标签类型' }]}
        >
          <Select placeholder="选择标签的正负面性质">
            <Option value="POSITIVE">{getSentimentLabel('POSITIVE')}</Option>
            <Option value="NEGATIVE">{getSentimentLabel('NEGATIVE')}</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="默认权重"
          name="defaultWeight"
          rules={[
            { required: true, message: '请设置默认权重' },
            { type: 'number', min: 1, max: 10, message: '权重必须在1-10之间' }
          ]}
        >
          <InputNumber
            min={1}
            max={10}
            style={{ width: '100%' }}
            placeholder="设置默认权重 (1-10)"
          />
        </Form.Item>

        <Form.Item
          label="标签描述"
          name="description"
          rules={[
            { max: 100, message: '描述不能超过100个字符' }
          ]}
        >
          <Input.TextArea
            placeholder="输入标签描述（可选）"
            maxLength={100}
            showCount
            rows={3}
          />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleCancelEdit}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              保存修改
            </Button>
          </Space>
        </Form.Item>
      </Form>
      </Modal>
    </Modal>
  );
};

export default EnhancedGrowthTagManager; 