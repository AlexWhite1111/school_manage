import AppButton from '@/components/AppButton';
import React, { useState, useEffect } from 'react';
import { Modal, List, Space, Tag, Input, Select, message, Divider, Typography, Popconfirm, Form, Row, Col, Empty } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  TagsOutlined,
  SmileOutlined,
  FrownOutlined
} from '@ant-design/icons';
import * as studentLogApi from '@/api/studentLogApi';
import type { Tag as ApiTag } from '@/types/api';

const { Text, Title } = Typography;
const { Option } = Select;

interface ExamTagManagerModalProps {
  visible: boolean;
  onClose: () => void;
  onTagsUpdated: () => void;
}

const ExamTagManagerModal: React.FC<ExamTagManagerModalProps> = ({
  visible,
  onClose,
  onTagsUpdated
}) => {
  const [tags, setTags] = useState<ApiTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative'>('all');
  const [newTagText, setNewTagText] = useState('');
  const [newTagType, setNewTagType] = useState<'EXAM_POSITIVE' | 'EXAM_NEGATIVE'>('EXAM_POSITIVE');
  const [editingTag, setEditingTag] = useState<ApiTag | null>(null);
  const [editText, setEditText] = useState('');

  // 加载标签数据
  const loadTags = async () => {
    setLoading(true);
    try {
      const tagsData = await studentLogApi.getExamTags('all', showDeleted);
      setTags(tagsData);
    } catch (error) {
      console.error('加载标签失败:', error);
      message.error('加载标签失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建新标签
  const handleCreateTag = async () => {
    if (!newTagText.trim()) {
      message.warning('请输入标签内容');
      return;
    }

    try {
      await studentLogApi.createGrowthTag({
        text: newTagText.trim(),
        type: newTagType as any,
        isPersonal: false
      });
      message.success('标签创建成功');
      setNewTagText('');
      setNewTagType('EXAM_POSITIVE');
      await loadTags();
      onTagsUpdated();
    } catch (error) {
      console.error('创建标签失败:', error);
      message.error('创建标签失败');
    }
  };

  // 删除标签
  const handleDeleteTag = async (tagId: number) => {
    try {
      await studentLogApi.deleteGrowthTag(tagId);
      message.success('标签删除成功');
      await loadTags();
      onTagsUpdated();
    } catch (error) {
      console.error('删除标签失败:', error);
      message.error('删除标签失败');
    }
  };

  // 恢复标签
  const handleRestoreTag = async (tagId: number) => {
    try {
      await studentLogApi.restoreGrowthTag(tagId);
      message.success('标签恢复成功');
      await loadTags();
      onTagsUpdated();
    } catch (error) {
      console.error('恢复标签失败:', error);
      message.error('恢复标签失败');
    }
  };

  // 过滤标签
  const filteredTags = tags.filter(tag => {
    if (filter === 'positive') return tag.type === 'EXAM_POSITIVE';
    if (filter === 'negative') return tag.type === 'EXAM_NEGATIVE';
    return true;
  });

  useEffect(() => {
    if (visible) {
      loadTags();
    }
  }, [visible, showDeleted]);

  return (
    <Modal
      title={
        <Space>
          <TagsOutlined />
          <span>考试标签管理</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <AppButton key="close" onClick={onClose}>
          关闭
        </AppButton>
      ]}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 创建新标签 */}
        <div>
          <Title level={5}>创建新标签</Title>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Input
                placeholder="输入标签内容"
                value={newTagText}
                onChange={(e) => setNewTagText(e.target.value)}
                onPressEnter={handleCreateTag}
              />
            </Col>
            <Col span={8}>
              <Select
                value={newTagType}
                onChange={setNewTagType}
                style={{ width: '100%' }}
              >
                <Option value="EXAM_POSITIVE">
                  <Space>
                    <SmileOutlined style={{ color: 'var(--ant-color-success)' }} />
                    正面表现
                  </Space>
                </Option>
                <Option value="EXAM_NEGATIVE">
                  <Space>
                    <FrownOutlined style={{ color: 'var(--ant-color-error)' }} />
                    待改进项
                  </Space>
                </Option>
              </Select>
            </Col>
            <Col span={4}>
              <AppButton
                hierarchy="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateTag}
                block
              >
                创建
              </AppButton>
            </Col>
          </Row>
        </div>

        <Divider />

        {/* 筛选和显示选项 */}
        <Row gutter={16} align="middle">
          <Col>
            <Text>筛选类型：</Text>
            <Select
              value={filter}
              onChange={setFilter}
              style={{ width: 120, marginLeft: 8 }}
            >
              <Option value="all">全部</Option>
              <Option value="positive">正面表现</Option>
              <Option value="negative">待改进项</Option>
            </Select>
          </Col>
          <Col>
            <AppButton
              type={showDeleted ? 'primary' : 'default'}
              size="sm"
              onClick={() => setShowDeleted(!showDeleted)}
            >
              {showDeleted ? '隐藏已删除' : '显示已删除'}
            </AppButton>
          </Col>
        </Row>

        {/* 标签列表 */}
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {filteredTags.length === 0 ? (
            <Empty description="暂无标签" />
          ) : (
            <List
              loading={loading}
              dataSource={filteredTags}
              renderItem={(tag) => (
                <List.Item
                  style={{
                    opacity: tag.deletedAt ? 0.5 : 1,
                    backgroundColor: tag.deletedAt ? '#f5f5f5' : undefined
                  }}
                  actions={[
                    tag.deletedAt ? (
                      <AppButton
                        hierarchy="link"
                        size="sm"
                        onClick={() => handleRestoreTag(tag.id)}
                      >
                        恢复
                      </AppButton>
                    ) : (
                      <Popconfirm
                        title="确定删除此标签吗？"
                        description="删除后可以恢复，但会影响已有的成绩记录。"
                        onConfirm={() => handleDeleteTag(tag.id)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <AppButton
                          hierarchy="link"
                          size="sm"
                          danger
                          icon={<DeleteOutlined />}
                        >
                          删除
                        </AppButton>
                      </Popconfirm>
                    )
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Tag
                          color={tag.type === 'EXAM_POSITIVE' ? 'green' : 'red'}
                          icon={
                            tag.type === 'EXAM_POSITIVE' ? 
                            <SmileOutlined /> : 
                            <FrownOutlined />
                          }
                        >
                          {tag.text}
                        </Tag>
                        {tag.isPredefined && (
                          <Tag color="blue">
                            系统预设
                          </Tag>
                        )}
                        {tag.deletedAt && (
                          <Tag color="default">
                            已删除
                          </Tag>
                        )}
                      </Space>
                    }
                    description={
                      <Text type="secondary">
                        使用次数: {tag.usageCount} 次
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      </Space>
    </Modal>
  );
};

export default ExamTagManagerModal; 