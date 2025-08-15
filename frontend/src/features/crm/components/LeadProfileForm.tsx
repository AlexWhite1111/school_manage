
import AppButton from '@/components/AppButton';
import React, { useState, useEffect } from 'react';
import { Form, Input, Select, DatePicker, Row, Col, Space, Typography, Divider, Tag, List, Popconfirm, Spin, App, Affix, Collapse, Card, FloatButton } from 'antd';
import { UnifiedCardPresets } from '@/theme/card';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useResponsive } from '@/hooks/useResponsive';
import dayjs from 'dayjs';
import * as crmApi from '@/api/crmApi';
import type { 
  Customer, 
  CreateCustomerRequest, 
  CommunicationLog, 
  Tag as TagType,
  TagType as TagTypeEnum
} from '@/types/api';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { useApp } = App;

// 家庭画像标签分类配置（仅定义分类与标题；标签项从后端加载）
const TAG_CATEGORIES = [
  { key: 'FAMILY_JOB', title: '家长职业与工作情况' },
  { key: 'FAMILY_INCOME', title: '家庭经济与收入层次' },
  { key: 'FAMILY_EDUCATION_CONCEPT', title: '家庭教育观念' },
  { key: 'FAMILY_FOCUS', title: '家庭关注重点' },
  { key: 'FAMILY_ROLE', title: '父母角色与强势程度' },
  { key: 'CHILD_PERSONALITY', title: '孩子性格特征' },
  { key: 'CHILD_ACADEMIC_LEVEL', title: '孩子学习成绩水平' },
  { key: 'CHILD_DISCIPLINE', title: '孩子服从与自律程度' }
];

interface LeadProfileFormProps {
  customerPublicId?: string; // 🔧 统一：只使用publicId，移除customerId
  onSave?: (customer: Customer) => void;
}

const LeadProfileForm: React.FC<LeadProfileFormProps> = ({ customerPublicId, onSave }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { message: antMessage } = useApp();
  const { isMobile, isSmall } = useResponsive();
  
  // 状态管理 - 🔧 统一：使用publicId逻辑，但内部仍需customerId用于API调用
  const [loading, setLoading] = useState(!!customerPublicId);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [customerId, setCustomerId] = useState<number | undefined>(undefined); // 内部使用的数据库ID
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [allTags, setAllTags] = useState<TagType[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>([]);
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [newLogContent, setNewLogContent] = useState('');
  const [editLogContent, setEditLogContent] = useState('');
  const [addingNewLog, setAddingNewLog] = useState(false);
  // 动态家长管理
  const [parentCount, setParentCount] = useState(1); // 默认显示1个家长表单

  // 加载客户数据 - 🔧 统一：只通过publicId加载
  const loadCustomerData = async () => {
    console.log('🔍 LeadProfileForm.loadCustomerData 被调用', { customerPublicId });
    
    if (!customerPublicId) {
      console.log('❌ 没有publicId，跳过加载（新建客户模式）');
      return;
    }
    
    try {
      setLoading(true);
      console.log('📥 开始通过publicId加载客户数据...', customerPublicId);
      
      const customerData = await crmApi.getCustomerByPublicId(customerPublicId);
      
      console.log('✅ 成功获取客户数据:', customerData);
      setCustomer(customerData);
      setCustomerId(customerData.id); // 设置内部customerId用于后续API调用
      setSelectedTagIds(customerData.tags || []);
      setCommunicationLogs(customerData.communicationLogs || []);
      
      // 设置家长数量
      if (customerData.parents && customerData.parents.length > 0) {
        setParentCount(customerData.parents.length);
      }
      
      // 填充表单
      form.setFieldsValue({
        ...customerData,
        birthDate: customerData.birthDate ? dayjs(customerData.birthDate) : undefined,
        firstContactDate: customerData.firstContactDate ? dayjs(customerData.firstContactDate) : undefined,
        nextFollowUpDate: customerData.nextFollowUpDate ? dayjs(customerData.nextFollowUpDate) : undefined,
      });
    } catch (error: any) {
      console.error('加载客户数据失败:', error);
      antMessage.error('加载客户数据失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 加载标签数据
  const loadTags = async () => {
    try {
      const tags = await crmApi.getTags();
      setAllTags(tags);
    } catch (error: any) {
      console.error('加载标签失败:', error);
      antMessage.error('加载标签失败: ' + (error.message || '未知错误'));
    }
  };

  // 初始化
  useEffect(() => {
    loadTags();
    if (customerPublicId) {
      loadCustomerData();
    }
  }, [customerPublicId]);

  // 保存基础信息和家庭画像 - 🔧 修复：正确判断创建vs更新逻辑
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // 清洗家长信息：过滤掉完全空白的家长条目，并标准化字段
      const rawParents = Array.isArray(values.parents) ? values.parents : [];
      const sanitizedParents = rawParents
        .filter((p: any) => p && (p.name || p.relationship || p.phone))
        .map((p: any) => ({
          name: (p.name || '').trim(),
          relationship: (p.relationship || '').trim(),
          phone: (p.phone || '').toString().replace(/\D/g, ''),
          wechatId: (p.wechatId || '').trim() || undefined
        }));

      // 至少需要一位家长，且第一位家长需完整：关系、联系方式（姓名不再必填）
      if (
        sanitizedParents.length === 0 ||
        !sanitizedParents[0].relationship ||
        !sanitizedParents[0].phone
      ) {
        antMessage.error('请至少填写一位家长的关系和联系方式');
        setSaving(false);
        return;
      }

      const requestData: Partial<CreateCustomerRequest> = {
        ...values,
        birthDate: values.birthDate?.format('YYYY-MM-DD'),
        firstContactDate: values.firstContactDate?.format('YYYY-MM-DD'),
        nextFollowUpDate: values.nextFollowUpDate?.format('YYYY-MM-DD'),
        tags: selectedTagIds || [],
        parents: sanitizedParents
      };

      let updatedCustomer: Customer;
      
      // 🔧 修复：正确判断是更新还是创建
      if (customerId) {
        console.log('🔄 更新现有客户:', customerId);
        updatedCustomer = await crmApi.updateCustomer(customerId, requestData);
        antMessage.success(`客户 ${updatedCustomer.name} 的信息已成功更新！`);
      } else {
        console.log('✨ 创建新客户');
        updatedCustomer = await crmApi.createCustomer(requestData as CreateCustomerRequest);
        // 🔧 修复：创建成功后设置customerId，防止后续保存时重复创建
        setCustomerId(updatedCustomer.id);
        antMessage.success(`客户 ${updatedCustomer.name} 已成功创建！`);
      }

      setCustomer(updatedCustomer);
      
      if (onSave) {
        onSave(updatedCustomer);
      }
      
    } catch (error: any) {
      // 表单校验错误：高亮首个错误项并滚动定位
      if (error?.errorFields?.length) {
        const first = error.errorFields[0];
        const firstMsg = first?.errors?.[0] || '请完善必填项';
        antMessage.error(firstMsg);
        if (first?.name) {
          try { form.scrollToField(first.name, { behavior: 'smooth', block: 'center' }); } catch {}
        }
        return;
      }
      console.error('保存客户信息失败:', error);
      const msg = error?.message || error?.data?.message || '信息保存失败，请检查网络后重试。';
      antMessage.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // 删除客户 - 🔧 修复：使用正确的customerId状态
  const handleDelete = async () => {
    if (!customerId || !customer) {
      console.warn('⚠️ 删除操作被阻止：缺少客户ID或客户信息', { customerId, customer: !!customer });
      antMessage.error('无法删除客户：客户信息不完整');
      return;
    }
    
    try {
      setDeleting(true);
      console.log('🗑️ 开始删除客户:', customerId, customer.name);
      await crmApi.deleteCustomer(customerId);
      
      antMessage.success(`客户 ${customer.name} 已成功删除`);
      
      // 删除成功后返回客户列表页面
      navigate('/crm');
      
    } catch (error: any) {
      console.error('删除客户失败:', error);
      antMessage.error('删除客户失败，请检查网络后重试。');
    } finally {
      setDeleting(false);
    }
  };

  // 将最新选中标签持久化到后端（存在customerId时实时保存）
  const persistSelectedTags = async (newIds: number[]) => {
    setSelectedTagIds(newIds);
    if (customerId) {
      try {
        await crmApi.updateCustomer(customerId, { tags: newIds });
        // 不打断用户操作，不弹出提示
      } catch (e) {
        console.error('实时保存标签失败:', e);
      }
    }
  };

  // 处理标签选择（已有标签）
  const handleTagToggle = (tagId: number, checked: boolean) => {
    setSelectedTagIds(prev => {
      const newIds = checked ? [...prev, tagId] : prev.filter(id => id !== tagId);
      // 实时保存
      persistSelectedTags(newIds);
      return newIds;
    });
  };

  // 处理预设词条：如果已存在则切换；否则创建个人标签后选中
  const handlePredefinedToggle = async (text: string, type: TagTypeEnum, checked: boolean) => {
    const siblings = allTags.filter(t => t.type === type && t.text === text);
    if (siblings.length > 0) {
      // 选择优先级最高的一个
      const preferred = [...siblings].sort((a, b) => {
        // 预置优先，其次全局，最后个人
        const score = (t: TagType) => (t.isPredefined ? 3 : !t.isPersonal ? 2 : 1);
        return score(b as any) - score(a as any);
      })[0];
      handleToggleByText(text, type, preferred.id, checked);
      return;
    }
    if (!checked) return;
    try {
      const newTag = await crmApi.createTag({ text, type, isPersonal: true });
      setAllTags(prev => [...prev, newTag]);
      const newIds = [...selectedTagIds, newTag.id];
      await persistSelectedTags(newIds);
    } catch (e) {
      console.error('创建预设词条个人标签失败:', e);
    }
  };

  // 基于“同名词条”进行选择切换：确保同名只保留一个选中实例（优先级：预置>全局>个人）
  const handleToggleByText = (text: string, type: TagTypeEnum, preferredId: number, checked: boolean) => {
    const idsOfSameText = allTags
      .filter(t => t.type === type && t.text === text)
      .map(t => t.id);
    setSelectedTagIds(prev => {
      const withoutSame = prev.filter(id => !idsOfSameText.includes(id));
      if (checked) {
        return [...withoutSame, preferredId];
      }
      return withoutSame;
    });
  };

  // 创建自定义标签（乐观更新策略）
  const handleCreateCustomTag = async (text: string, type: TagTypeEnum) => {
    if (!text.trim()) return;

    // 创建临时标签对象
    const tempTag: TagType = {
      id: Date.now(), // 临时ID
      text: text.trim(),
      type,
      isPredefined: false,
      isPersonal: true,    // 新增：默认创建个人标签
      usageCount: 0        // 新增：初始使用次数
    };

    try {
      // 1. 乐观更新 - 立即添加临时标签到本地状态
      setAllTags(prev => [...prev, tempTag]);
      setSelectedTagIds(prev => [...prev, tempTag.id]);

      // 2. 后台静默同步 - 默认创建个人标签
      const realTag = await crmApi.createTag({ 
        text: text.trim(), 
        type, 
        isPersonal: true 
      });
      
      // 3. 状态校准 - 用真实标签替换临时标签
      setAllTags(prev => prev.map(tag => 
        tag.id === tempTag.id ? realTag : tag
      ));
      setSelectedTagIds(prev => prev.map(id => 
        id === tempTag.id ? realTag.id : id
      ));

      // 显示成功提示，区分个人标签
      antMessage.success(`已创建个人标签"${text.trim()}"，仅您可见`);

    } catch (error: any) {
      console.error('创建自定义标签失败:', error);
      // 回滚乐观更新
      setAllTags(prev => prev.filter(tag => tag.id !== tempTag.id));
      setSelectedTagIds(prev => prev.filter(id => id !== tempTag.id));
      
      // 根据错误类型显示不同的提示
      if (error.response?.data?.message?.includes('已创建过')) {
        antMessage.error('您已创建过相同的个人标签');
      } else {
        antMessage.error('创建个人标签失败: ' + (error.response?.data?.message || error.message || '未知错误'));
      }
    }
  };

  // 默认词条只用于“高亮展示”已存在的后端标签；不承担创建职责

  // ========== 沟通纪要管理（即时保存）========== 🔧 修复：使用正确的customerId状态

  // 添加新纪要
  const handleAddNewLog = async () => {
    if (!newLogContent.trim()) {
      antMessage.warning('请输入沟通内容');
      return;
    }
    
    if (!customerId) {
      console.warn('⚠️ 添加沟通纪要被阻止：缺少客户ID', { customerId });
      antMessage.error('无法添加沟通纪要：请先保存客户信息');
      return;
    }

    try {
      console.log('📝 开始添加沟通纪要:', customerId, newLogContent.trim());
      const newLog = await crmApi.createCommunicationLog(customerId, {
        content: newLogContent.trim()
      });
      
      setCommunicationLogs(prev => [newLog, ...prev]); // 最新的在最上方
      setNewLogContent('');
      setAddingNewLog(false);
      antMessage.success('沟通纪要已添加');
    } catch (error: any) {
      console.error('添加沟通纪要失败:', error);
      antMessage.error('添加失败: ' + (error.message || '未知错误'));
    }
  };

  // 编辑纪要
  const handleEditLog = async (logId: number) => {
    if (!editLogContent.trim()) return;

    try {
      const updatedLog = await crmApi.updateCommunicationLog(logId, {
        content: editLogContent.trim()
      });
      
      setCommunicationLogs(prev => prev.map(log => 
        log.id === logId ? updatedLog : log
      ));
      setEditingLogId(null);
      setEditLogContent('');
      antMessage.success('沟通纪要已更新');
    } catch (error: any) {
      console.error('更新沟通纪要失败:', error);
      antMessage.error('更新失败: ' + (error.message || '未知错误'));
    }
  };

  // 删除纪要
  const handleDeleteLog = async (logId: number) => {
    try {
      await crmApi.deleteCommunicationLog(logId);
      setCommunicationLogs(prev => prev.filter(log => log.id !== logId));
      antMessage.success('沟通纪要已删除');
    } catch (error: any) {
      console.error('删除沟通纪要失败:', error);
      antMessage.error('删除失败: ' + (error.message || '未知错误'));
    }
  };

  // 开始编辑纪要
  const startEditLog = (log: CommunicationLog) => {
    setEditingLogId(log.id);
    setEditLogContent(log.content);
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingLogId(null);
    setEditLogContent('');
  };

  // 渲染家庭画像标签区域
  const renderFamilyPortraitTags = () => {
      return TAG_CATEGORIES.map(category => {
      const categoryTags = allTags.filter(tag => tag.type === category.key);

      // 去重：同名只显示一个，优先级：预置 > 全局 > 个人
      const prioritized = [
        ...categoryTags.filter(t => t.isPredefined),
        ...categoryTags.filter(t => !t.isPredefined && !t.isPersonal),
        ...categoryTags.filter(t => t.isPersonal)
      ];
      const byText = new Map<string, TagType>();
      prioritized.forEach(t => { if (!byText.has(t.text)) byText.set(t.text, t as TagType); });
      const dedupedTags = Array.from(byText.values());

      return (
        <Card key={category.key} size="small" style={{ marginBottom: 16 }}>
          <Title level={5} style={{ marginBottom: 12 }}>
            {category.title}
          </Title>
          
          <Space size={[8, 8]} wrap>
            {dedupedTags.map(tag => {
                const idsOfSameText = categoryTags.filter(t => t.text === tag.text).map(t => t.id);
                const isChecked = idsOfSameText.some(id => selectedTagIds.includes(id));
                return (
                  <Tag.CheckableTag
                    key={tag.id}
                    checked={isChecked}
                    onChange={(checked) => handleToggleByText(tag.text, category.key as TagTypeEnum, tag.id, checked)}
                  >
                    {tag.text}
                  </Tag.CheckableTag>
                );
              })}
            
            {/* 自定义标签输入 - 优化后 */}
            <Input
              size="small"
              placeholder="自定义..."
              style={{ width: 100 }}
              onPressEnter={(e) => {
                const value = e.currentTarget.value;
                if (value.trim()) {
                  handleCreateCustomTag(value.trim(), category.key as TagTypeEnum);
                  e.currentTarget.value = '';
                }
              }}
            />
          </Space>
        </Card>
      );
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>正在加载客户档案...</Text>
        </div>
      </div>
    );
  }

  const preset = isMobile ? UnifiedCardPresets.mobileCompact(true) : UnifiedCardPresets.desktopDefault(false);

  return (
    <div data-page-container>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题 - 🔧 修复：动态显示标题 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0, marginBottom: '8px' }}>
              {customerPublicId ? `客户档案 - ${customer?.name || '加载中...'}` : '新建客户'}
            </Title>
            {/* 删除说明性小字 */}
          </div>
          
          {/* 桌面端也统一使用右下角悬浮操作按钮，不再在标题区显示按钮 */}
        </div>

        <Row gutter={[isMobile ? 12 : 24, isMobile ? 12 : 24]}>
          {/* 基础信息区 */}
          <Col xs={24} lg={14} style={isMobile ? { paddingBottom: 64 } : undefined}>
            <Card title="基础信息" style={{ ...preset.style, height: '100%', marginLeft: isMobile ? 'var(--space-1)' : 0, marginRight: isMobile ? 'var(--space-1)' : 0 }} styles={preset.styles}>
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
                initialValues={{
                  status: 'POTENTIAL'
                }}
              >
                {/* 移动端快速操作提示 */}
                {/* 删除移动端提示小字 */}
                {/* 孩子信息 */}
                <Title level={4}>1. 孩子信息</Title>
                <Row gutter={[12, 12]}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={<span><Text type="danger">*</Text> 孩子姓名</span>}
                      name="name"
                      rules={[{ required: true, message: '请输入孩子姓名' }]}
                    >
                      <Input placeholder="请输入孩子的真实姓名" />
                    </Form.Item>
                  </Col>
                </Row>

                {/* 2×2：性别 | 出生年月 */}
                <Row gutter={[12, 12]}>
                  <Col xs={12} sm={12}>
                    <Form.Item label="性别" name="gender">
                      <Select placeholder="选择性别">
                        <Option value="MALE">男</Option>
                        <Option value="FEMALE">女</Option>
                        <Option value="OTHER">其他</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={12}>
                    <Form.Item label="出生年月" name="birthDate">
                      <DatePicker className="w-full" picker="date" placeholder="选择出生日期" />
                    </Form.Item>
                  </Col>
                </Row>

                {/* 2×2：学校 | 年级 */}
                <Row gutter={[12, 12]}>
                  <Col xs={12} sm={12}>
                    <Form.Item label="学校" name="school">
                      <Input placeholder="如：博文小学" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={12}>
                    <Form.Item label="年级" name="grade">
                      <Select placeholder="请选择年级" allowClear>
                        <Option value="CHU_YI">初一</Option>
                        <Option value="CHU_ER">初二</Option>
                        <Option value="CHU_SAN">初三</Option>
                        <Option value="GAO_YI">高一</Option>
                        <Option value="GAO_ER">高二</Option>
                        <Option value="GAO_SAN">高三</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                {/* 家长信息 */}
                 <Title level={4}>{isMobile ? '2. 家长' : '2. 家长信息'}</Title>
                {/* 动态家长表单 */}
                {Array.from({ length: parentCount }).map((_, index) => (
                  <div key={index} style={{ 
                    marginBottom: 'var(--space-4)', 
                    padding: 'var(--space-3)', 
                    border: '1px solid var(--ant-color-border-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    position: 'relative'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: 'var(--space-3)'
                    }}>
                      <Text strong>家长 {index + 1}</Text>
                      {index > 0 && (
                        <AppButton 
                          hierarchy="tertiary" 
                          danger 
                          size="sm"
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            setParentCount(prev => prev - 1);
                            // 清理表单字段
                            const parents = form.getFieldValue('parents') || [];
                            parents.splice(index, 1);
                            form.setFieldValue('parents', parents);
                          }}
                        >
                          移除
                        </AppButton>
                      )}
                    </div>
                    
                <Row gutter={[12, 12]}>
                  <Col xs={12} sm={12}>
                    <Form.Item
                      label={isMobile ? '姓名' : '家长姓名'}
                      name={['parents', index, 'name']}
                    >
                      <Input placeholder={isMobile ? '家长姓名(选填)' : '选填：家长姓名'} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={12}>
                    <Form.Item
                      label={isMobile ? (<span><Text type="danger">*</Text> 关系</span>) : (<span><Text type="danger">*</Text> 与孩子关系</span>)}
                          name={['parents', index, 'relationship']}
                          rules={[{ required: index === 0, message: '请选择关系' }]}
                    >
                      <Select placeholder={isMobile ? '关系' : '与孩子关系'}>
                        <Option value="父亲">父亲</Option>
                        <Option value="母亲">母亲</Option>
                        <Option value="爷爷">爷爷</Option>
                        <Option value="奶奶">奶奶</Option>
                        <Option value="外公">外公</Option>
                        <Option value="外婆">外婆</Option>
                        <Option value="其他">其他</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={12} sm={12}>
                    <Form.Item
                      label={isMobile ? (<span><Text type="danger">*</Text> 联系方式</span>) : (<span><Text type="danger">*</Text> 家长联系方式</span>)}
                          name={['parents', index, 'phone']}
                      rules={[
                            { required: index === 0, message: '请输入联系电话' },
                        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
                      ]}
                    >
                      <Input placeholder={isMobile ? '联系方式' : '请输入11位手机号码'} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={12}>
                        <Form.Item label={isMobile ? '微信号' : '家长微信号'} name={['parents', index, 'wechatId']}>
                      <Input placeholder={isMobile ? '微信号(选填)' : '选填：微信号'} />
                    </Form.Item>
                  </Col>
                </Row>
                  </div>
                ))}

                {/* 添加家长按钮 - 真正有功能的 */}
                {parentCount < 3 && (
                <Form.Item>
                  <AppButton
                    hierarchy="tertiary"
                    icon={<PlusOutlined />}
                      onClick={() => setParentCount(prev => prev + 1)}
                    style={{ width: '100%' }}
                  >
                      添加家长 ({parentCount}/3)
                  </AppButton>
                </Form.Item>
                )}

                {/* 联系与来源信息 */}
                <Title level={4}>{isMobile ? '3. 联系/来源' : '3. 联系与来源信息'}</Title>
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="家庭住址或所在区域"
                      name="address"
                    >
                      <TextArea 
                        rows={3} 
                        placeholder="请输入详细地址或大致区域，便于分配就近校区" 
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={12} sm={12}>
                    <Form.Item label="来源渠道" name="sourceChannel">
                      <Select placeholder="请选择来源渠道" allowClear>
                        <Option value="JIAZHANG_TUIJIAN">家长推荐</Option>
                        <Option value="PENGYOU_QINQI">朋友亲戚</Option>
                        <Option value="XUESHENG_SHEJIAO">学生社交圈</Option>
                        <Option value="GUANGGAO_CHUANDAN">广告传单</Option>
                        <Option value="DITUI_XUANCHUAN">地推宣传</Option>
                        <Option value="WEIXIN_GONGZHONGHAO">微信公众号</Option>
                        <Option value="DOUYIN">抖音</Option>
                        <Option value="QITA_MEITI">其他媒体</Option>
                        <Option value="HEZUO">合作</Option>
                        <Option value="QITA">其他</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={12}>
                    <Form.Item label="首次接触日期" name="firstContactDate">
                      <DatePicker 
                        className="w-full" 
                        placeholder="选择首次接触的日期" 
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* 客户状态 */}
                <Title level={4}>{isMobile ? '4. 状态' : '4. 客户状态'}</Title>
                <Row gutter={16}>
                  <Col xs={12} sm={12}>
                    <Form.Item
                      label={isMobile ? (<span><Text type="danger">*</Text> 状态</span>) : (<span><Text type="danger">*</Text> 当前客户状态</span>)}
                      name="status"
                      rules={[{ required: true, message: '请选择客户状态' }]}
                    >
                      <Select>
                        <Option value="POTENTIAL">潜在用户</Option>
                        <Option value="INITIAL_CONTACT">初步沟通</Option>
                        <Option value="INTERESTED">意向用户</Option>
                        <Option value="TRIAL_CLASS">试课</Option>
                        <Option value="ENROLLED">已报名</Option>
                        <Option value="LOST">流失客户</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={12} sm={12}>
                    <Form.Item
                      label={isMobile ? '下次跟进' : '下次跟进日期'}
                      name="nextFollowUpDate"
                    >
                      <DatePicker className="w-full" placeholder="选择下次跟进日期（选填）" />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Card>
          </Col>

          {/* 家庭画像区 - 移动端用折叠收纳减少首屏拥挤 */}
          <Col xs={24} lg={10}>
            {isMobile ? (
              <Collapse
                bordered={false}
                defaultActiveKey={['portrait']}
                items={[{
                  key: 'portrait',
                  label: '家庭画像',
                  children: (
                    <div
                      style={{
                        maxHeight: '400px',
                        minHeight: '280px',
                        overflowY: 'auto',
                        paddingRight: '4px'
                      }}
                      className="custom-scrollbar"
                    >
                      {renderFamilyPortraitTags()}
                    </div>
                  )
                }]}
              />
            ) : (
              <Card title="家庭画像" style={{ ...preset.style, height: '100%', marginLeft: isMobile ? 'var(--space-1)' : 0, marginRight: isMobile ? 'var(--space-1)' : 0 }} styles={preset.styles}>
                <div 
                  style={{ 
                    maxHeight: 'none',
                    overflowY: 'visible',
                    paddingRight: 'var(--space-2)'
                  }}
                >
                  {renderFamilyPortraitTags()}
                </div>
              </Card>
            )}
          </Col>
        </Row>

        {/* 沟通纪要区 - 🔧 统一：只有已保存的客户才能添加沟通纪要 */}
        {customerId && (
          <Card title={isMobile ? '沟通纪要' : '沟通纪要'} style={{ ...preset.style, marginLeft: isMobile ? 'var(--space-1)' : 0, marginRight: isMobile ? 'var(--space-1)' : 0 }} styles={preset.styles}>
            {/* 添加新纪要 */}
            <div style={{ marginBottom: 16 }}>
              {addingNewLog ? (
                  <TextArea
                    value={newLogContent}
                    onChange={(e) => setNewLogContent(e.target.value)}
                  onBlur={async () => {
                    if (newLogContent.trim()) {
                      await handleAddNewLog();
                    } else {
                        setAddingNewLog(false);
                        setNewLogContent('');
                    }
                  }}
                  onPressEnter={async (e) => {
                    if (e.shiftKey) return; // Shift+Enter 换行
                    e.preventDefault();
                    if (newLogContent.trim()) {
                      await handleAddNewLog();
                    }
                  }}
                  placeholder="输入沟通内容，失去焦点或按回车键自动保存..."
                  rows={4}
                  autoFocus
                  style={{
                    border: '2px solid var(--ant-color-primary)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                />
              ) : (
                <AppButton 
                  hierarchy="tertiary" 
                  onClick={() => setAddingNewLog(true)}
                  style={{ 
                    width: '100%',
                    height: '44px',
                    border: '1px dashed var(--ant-color-border)',
                    color: 'var(--ant-color-text-secondary)',
                    backgroundColor: 'transparent'
                  }}
                >
                  添加沟通纪要
                </AppButton>
              )}
            </div>

            {/* 纪要列表 */}
            <List
              dataSource={communicationLogs}
              locale={{ emptyText: '暂无沟通纪要' }}
              renderItem={(log, index) => (
                <List.Item
                  style={{ 
                    cursor: 'pointer',
                    padding: 'var(--space-3) var(--space-2)',
                    borderRadius: 'var(--radius-md)',
                    // 🚀 性能优化：只过渡需要的属性，避免transition: all
                    transition: 'background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
                    marginBottom: 'var(--space-2)',
                    // 启用硬件加速
                    willChange: 'transform, background-color, box-shadow',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--ant-color-fill-alter)';
                    e.currentTarget.style.transform = 'translateX(2px)';
                    // 显示删除按钮
                    const deleteBtn = e.currentTarget.querySelector('.log-delete-btn') as HTMLElement;
                    if (deleteBtn) deleteBtn.style.opacity = '0.7';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                    // 隐藏删除按钮
                    const deleteBtn = e.currentTarget.querySelector('.log-delete-btn') as HTMLElement;
                    if (deleteBtn) deleteBtn.style.opacity = '0';
                  }}
                >
                  {/* 自定义布局：时间在左上方 */}
                  <div style={{ width: '100%', position: 'relative' }}>
                    {/* 时间标签 - 固定在左上方 */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      fontSize: '10px',
                      color: 'var(--ant-color-text-quaternary)',
                      fontFamily: 'Monaco, Consolas, monospace',
                      backgroundColor: 'var(--ant-color-fill-alter)',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-xs, 4px)',
                      lineHeight: 1,
                      zIndex: 1,
                      border: '1px solid var(--ant-color-border-secondary)'
                    }}>
                      {dayjs(log.updatedAt).format(isSmall ? 'MM-DD HH:mm' : 'MM-DD HH:mm')}
                    </div>

                    {/* 操作按钮 - 固定在右上方 */}
                    {/* 纪要内容 */}
                    <div style={{
                      paddingTop: isSmall ? '22px' : '26px',
                      paddingRight: '30px',
                      paddingLeft: 0,
                      position: 'relative'
                    }}>
                      {editingLogId === log.id ? (
                          <TextArea
                            value={editLogContent}
                            onChange={(e) => setEditLogContent(e.target.value)}
                          onBlur={async () => {
                            if (editLogContent.trim() && editLogContent.trim() !== log.content) {
                              await handleEditLog(log.id);
                            } else {
                              cancelEdit();
                            }
                          }}
                          onPressEnter={async (e) => {
                            if (e.shiftKey) return; // Shift+Enter 换行
                            e.preventDefault();
                            if (editLogContent.trim() && editLogContent.trim() !== log.content) {
                              await handleEditLog(log.id);
                            } else {
                              cancelEdit();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              cancelEdit();
                            }
                          }}
                            rows={3}
                            autoFocus
                          placeholder="编辑内容，失去焦点或按回车键自动保存..."
                          style={{
                            border: '2px solid var(--ant-color-warning)',
                            borderRadius: 'var(--radius-sm)'
                          }}
                        />
                      ) : (
                        <div style={{ 
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.6,
                          fontSize: '14px',
                          color: 'var(--ant-color-text)',
                          wordBreak: 'break-word',
                          cursor: 'text',
                          padding: 'var(--space-1) 0'
                        }}
                        onClick={() => startEditLog(log)}
                        >
                          {log.content}
                        </div>
                      )}
                     
                      {/* 删除按钮 - 悬停时显示在内容右侧 */}
                      {editingLogId !== log.id && (
                        <Popconfirm
                          title={
                            <div style={{ maxWidth: '200px' }}>
                              <div style={{ marginBottom: 'var(--space-1)', fontWeight: 'bold' }}>
                                确定要删除这条纪要吗？
                              </div>
                              <div style={{ 
                                fontSize: '12px', 
                                color: 'var(--ant-color-text-secondary)',
                                backgroundColor: 'var(--ant-color-fill-alter)',
                                padding: 'var(--space-1) 6px',
                                borderRadius: 'var(--radius-xs, 4px)',
                                border: '1px solid var(--ant-color-border-secondary)',
                                maxHeight: '60px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                "{log.content.length > 50 ? log.content.substring(0, 50) + '...' : log.content}"
                              </div>
                            </div>
                          }
                          onConfirm={async () => await handleDeleteLog(log.id)}
                          okText="确定"
                          cancelText="取消"
                        >
                          <AppButton 
                            hierarchy="tertiary" 
                            danger 
                            size="sm"
                            icon={<DeleteOutlined />}
                            style={{ 
                              position: 'absolute',
                              right: '0px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              padding: 'var(--space-1)',
                              fontSize: '12px',
                              height: '24px',
                              width: '24px',
                              opacity: 0,
                              transition: 'opacity 0.2s ease'
                            }}
                            className="log-delete-btn"
                          />
                        </Popconfirm>
                      )}
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </Card>
        )}

        {/* 移动端悬浮操作按钮（统一圆形按钮，避让底部导航与安全区） */}
        {(isMobile || !isMobile) && (
          <FloatButton.Group
            shape="circle"
            style={{
              right: 16,
              bottom: `calc(var(--page-bottom-safe) + var(--space-2))`,
              zIndex: 1010
            }}
            trigger="hover"
          >
            {customerPublicId && customerId && customer && (
              <Popconfirm
                title="确认删除客户"
                description={<Text>此操作无法恢复，确定删除 <Text strong>{customer.name}</Text> ？</Text>}
                onConfirm={handleDelete}
                okText="删除"
                cancelText="取消"
                okType="danger"
              >
                <FloatButton
                  icon={<DeleteOutlined />}
                  tooltip="删除"
                  style={{ backgroundColor: 'var(--ant-color-error)', color: '#fff' }}
                />
              </Popconfirm>
            )}
            <FloatButton
              type="primary"
              icon={<SaveOutlined />}
              tooltip={customerPublicId ? '保存修改' : '创建客户'}
              onClick={handleSave}
            />
          </FloatButton.Group>
        )}
      </Space>
    </div>
  );
};

export default LeadProfileForm; 