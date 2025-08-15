import React, { useState, useEffect } from 'react';
import { Modal, Input, Select, Table, Tag, message, Space, Divider, Typography, Popconfirm, Switch, Badge, Alert, InputNumber, Form, Card, Button, Dropdown, Row, Col } from 'antd';
import type { MenuProps } from 'antd';
import { 
  PlusOutlined, DeleteOutlined, RedoOutlined, 
  EditOutlined, MoreOutlined 
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
// 内联文案与布局，移除对独立配置文件的依赖，避免冗余
const growthTagText = {
  manager: {
    title: 'Growth标签管理',
    createSectionTitle: '创建新标签',
    actions: {
      create: '创建标签',
      batchDelete: (count: number) => `批量删除 (${count})`,
      refresh: '刷新列表',
      showDeleted: '显示已删除标签',
      close: '关闭',
      edit: '修改',
      delete: '删除',
      restore: '恢复',
      cancel: '取消',
      save: '保存修改',
    },
    table: {
      columns: {
        text: '标签',
        sentiment: '类型',
        defaultWeight: '默认权重',
        usageCount: '使用次数',
        createdAt: '创建时间',
        action: '操作',
      },
      paginationTotal: (total: number, range: [number, number]) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
      disabledTag: '已禁用',
      unset: '未设置',
    },
    stats: {
      total: (n: number) => `总标签数: ${n}`,
      positive: (n: number) => `正面表现: ${n}`,
      negative: (n: number) => `需要改进: ${n}`,
      inactive: (n: number) => `已禁用: ${n}`,
    },
    messages: {
      createSuccess: '标签创建成功',
      updateSuccess: '标签更新成功',
      deleteSuccess: '删除标签成功',
      batchDeleteSuccess: (n: number) => `成功删除 ${n} 个标签`,
      selectBeforeDelete: '请先选择要删除的标签',
      confirmDelete: '确定删除这个标签吗？',
    },
  },
} as const;

const growthTagLayout = {
  table: { pageSize: 10, size: 'small' as const, showSizeChanger: true, showQuickJumper: true },
  modalWidthDesktop: 960,
  editModalWidth: 600,
} as const;
import { useResponsive } from '@/hooks/useResponsive';

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
  const { isMobile } = useResponsive();
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
      message.success(growthTagText.manager.messages.createSuccess);
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
      message.success(growthTagText.manager.messages.updateSuccess);
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
      message.warning(growthTagText.manager.messages.selectBeforeDelete);
      return;
    }

    setDeleting(true);
    try {
      const promises = selectedRowKeys.map(id => deleteGrowthTag(Number(id)));
      await Promise.all(promises);
      setSelectedRowKeys([]);
      message.success(growthTagText.manager.messages.batchDeleteSuccess(promises.length));
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

  // 表格列定义（桌面端）
  const desktopColumns = [
    {
      title: growthTagText.manager.table.columns.text,
      dataIndex: 'text',
      key: 'text',
      render: (text: string, record: GrowthTag) => (
        <Space>
          <Text strong={record.isActive !== false} type={record.isActive === false ? 'secondary' : undefined}>
            {text}
          </Text>
          {record.isActive === false && <Tag color="red">{growthTagText.manager.table.disabledTag}</Tag>}
        </Space>
      ),
    },
    {
      title: growthTagText.manager.table.columns.sentiment,
      dataIndex: 'sentiment',
      key: 'sentiment',
      render: (sentiment: string | null) => {
        if (sentiment === 'POSITIVE') {
          return <Tag color={getSentimentColor('POSITIVE')}>{getSentimentLabel('POSITIVE')}</Tag>;
        } else if (sentiment === 'NEGATIVE') {
          return <Tag color={getSentimentColor('NEGATIVE')}>{getSentimentLabel('NEGATIVE')}</Tag>;
        }
        return <Tag color="gray">{growthTagText.manager.table.unset}</Tag>;
      },
    },
    {
      title: growthTagText.manager.table.columns.defaultWeight,
      dataIndex: 'defaultWeight',
      key: 'defaultWeight',
      render: (weight: number | null) => (
        <Tag color={weight ? getWeightColor(weight) : 'gray'}>
          {weight || growthTagText.manager.table.unset}
        </Tag>
      ),
    },
    {
      title: growthTagText.manager.table.columns.usageCount,
      dataIndex: 'usageCount',
      key: 'usageCount',
      render: (count: number) => (
        <Badge count={count} style={{ backgroundColor: 'var(--ant-color-success)' }} />
      ),
    },
    {
      title: growthTagText.manager.table.columns.createdAt,
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: growthTagText.manager.table.columns.action,
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
                {growthTagText.manager.actions.edit}
              </Button>
              <Popconfirm
                title={growthTagText.manager.messages.confirmDelete}
                onConfirm={() => deleteGrowthTag(record.id)}
                okText={growthTagText.manager.actions.delete}
                cancelText={growthTagText.manager.actions.cancel}
              >
                <Button type="link" danger size="small" icon={<DeleteOutlined />}>
                  {growthTagText.manager.actions.delete}
                </Button>
              </Popconfirm>
            </>
          ) : (
            <Button type="link" size="small" icon={<RedoOutlined />}>
              {growthTagText.manager.actions.restore}
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // 表格列定义（移动端压缩：单列信息 + 图标操作）
  const mobileColumns = [
    {
      title: growthTagText.manager.table.columns.text,
      key: 'info',
      render: (_: any, record: GrowthTag) => {
        const dateStr = '';
        const weightText = record.defaultWeight ?? '';
        return (
          <Space size={4}>
            <Tag color={record.sentiment === 'POSITIVE' ? getSentimentColor('POSITIVE') : record.sentiment === 'NEGATIVE' ? getSentimentColor('NEGATIVE') : 'default'}>
              {record.text}
            </Tag>
            {typeof weightText === 'number' && (
              <Badge count={weightText} size="small" color={getWeightColor(weightText)} style={{ boxShadow: 'none' }} offset={[0, 0]} />
            )}
          </Space>
        );
      },
    },
    {
      title: growthTagText.manager.table.columns.action,
      key: 'action',
      width: 40,
      render: (_: any, record: GrowthTag) => {
        const items: MenuProps['items'] = [
          {
            key: 'edit',
            label: growthTagText.manager.actions.edit,
            onClick: () => handleEditTag(record),
          },
        ];
        if (record.isActive !== false) {
          items.push({
            key: 'delete',
            label: (
              <Popconfirm
                title={growthTagText.manager.messages.confirmDelete}
                onConfirm={() => deleteGrowthTag(record.id)}
                okText={growthTagText.manager.actions.delete}
                cancelText={growthTagText.manager.actions.cancel}
              >
                <span style={{ color: 'var(--ant-color-error)' }}>{growthTagText.manager.actions.delete}</span>
              </Popconfirm>
            ) as any,
          });
        }
        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        );
      },
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
          <PlusOutlined style={{ color: 'var(--ant-color-primary)' }} />
          <span>{growthTagText.manager.title}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      centered
      width={isMobile ? '99%' : growthTagLayout.modalWidthDesktop}
      footer={null}
      styles={{
        content: { margin: '0 auto' },
        body: { padding: isMobile ? 'var(--space-1)' : 'var(--space-6)' }
      }}
    >
      <Space direction="vertical" size={isMobile ? 8 : 'large'} style={{ width: '100%', paddingLeft: isMobile ? 0 : 0, paddingRight: isMobile ? 0 : 0 }}>
        {/* 创建新标签表单 */}
        <Card
          title={growthTagText.manager.createSectionTitle}
          size="small"
          style={{ width: '100%', margin: 0 }}
          styles={{ header: { padding: isMobile ? 'var(--app-card-head-padding-mobile)' : 'var(--app-card-head-padding)' }, body: { padding: isMobile ? 'var(--app-card-body-padding-mobile)' : 'var(--app-card-body-padding)' } }}
        >
          {isMobile ? (
            <Form form={form} layout="vertical" onFinish={handleCreateTag} style={{ width: '100%' }}>
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <Form.Item
                    name="text"
                    rules={[
                      { required: true, message: '请输入标签名称' },
                      { min: 2, max: 20, message: '标签名称长度为2-20字符' }
                    ]}
                  >
                    <Input placeholder="标签名称" maxLength={20} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="sentiment"
                    rules={[{ required: true, message: '请选择标签类型' }]}
                  >
                    <Select placeholder="选择类型">
                      <Option value="POSITIVE">{getSentimentLabel('POSITIVE')}</Option>
                      <Option value="NEGATIVE">{getSentimentLabel('NEGATIVE')}</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="defaultWeight"
                    rules={[
                      { required: true, message: '请设置默认权重' },
                      { type: 'number', min: 1, max: 10, message: '权重范围1-10' }
                    ]}
                  >
                    <InputNumber placeholder="权重" min={1} max={10} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="description">
                    <Input placeholder="描述(可选)" maxLength={100} />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Button type="primary" htmlType="submit" block loading={loading}>
                    {growthTagText.manager.actions.create}
                  </Button>
                </Col>
              </Row>
            </Form>
          ) : (
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
                  {growthTagText.manager.actions.create}
                </Button>
              </Form.Item>
            </Form>
          )}
        </Card>

         {/* 标签列表表格 */}
          <Table
          columns={isMobile ? mobileColumns : desktopColumns}
          dataSource={displayTags}
          rowKey="id"
          rowSelection={isMobile ? undefined : rowSelection}
          loading={loading}
          pagination={{
            pageSize: isMobile ? 8 : growthTagLayout.table.pageSize,
            showSizeChanger: growthTagLayout.table.showSizeChanger,
            showQuickJumper: growthTagLayout.table.showQuickJumper,
            showTotal: (total, range) => growthTagText.manager.table.paginationTotal(total, range as [number, number]),
          }}
          size={growthTagLayout.table.size}
           scroll={isMobile ? undefined : { x: 1000 }}
           style={{ marginTop: isMobile ? 8 : undefined, marginLeft: isMobile ? 0 : undefined, marginRight: isMobile ? 0 : undefined }}
        />

        {/* 统计信息已移除 */}
      </Space>

      {/* 编辑标签模态框 */}
      <Modal
      title={
        <Space>
          <EditOutlined style={{ color: 'var(--ant-color-primary)' }} />
          <span>编辑标签</span>
        </Space>
      }
      open={editModalOpen}
      onCancel={handleCancelEdit}
      footer={null}
      destroyOnClose
      width={growthTagLayout.editModalWidth}
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
              {growthTagText.manager.actions.cancel}
            </Button>
            <Button type="primary" htmlType="submit">
              {growthTagText.manager.actions.save}
            </Button>
          </Space>
        </Form.Item>
      </Form>
      </Modal>
    </Modal>
  );
};

export default EnhancedGrowthTagManager; 