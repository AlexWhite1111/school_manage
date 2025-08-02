import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Card,
  Row,
  Col,
  Space,
  Typography,
  Divider,
  Tag,
  List,
  Popconfirm,
  Spin,
  App
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined
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

// 家庭画像标签分类配置
const TAG_CATEGORIES = [
  {
    key: 'FAMILY_JOB',
    title: '家长职业与工作情况',
    predefined: ['全职妈妈', '双职工家庭', '自由职业', '企业高管', '公务员']
  },
  {
    key: 'FAMILY_INCOME', 
    title: '家庭经济与收入层次',
    predefined: ['中等收入', '高收入', '经济压力较大']
  },
  {
    key: 'FAMILY_EDUCATION_CONCEPT',
    title: '家庭教育观念', 
    predefined: ['应试导向', '素质教育', '兴趣优先', '重视全面发展']
  },
  {
    key: 'FAMILY_FOCUS',
    title: '家庭关注重点',
    predefined: ['成绩提升', '习惯养成', '心理健康', '特长发展']
  },
  {
    key: 'FAMILY_ROLE',
    title: '父母角色与强势程度',
    predefined: ['母亲主导', '父亲主导', '父母平衡', '隔代抚养']
  },
  {
    key: 'CHILD_PERSONALITY',
    title: '孩子性格特征', 
    predefined: ['外向', '内向', '敏感', '独立', '依赖']
  },
  {
    key: 'CHILD_ACADEMIC_LEVEL',
    title: '孩子学习成绩水平',
    predefined: ['优异', '中等', '需提升', '偏科']
  },
  {
    key: 'CHILD_DISCIPLINE',
    title: '孩子服从与自律程度',
    predefined: ['自律性强', '需督促', '易分心', '主动性高']
  }
];

interface LeadProfileFormProps {
  customerId?: number;
  onSave?: (customer: Customer) => void;
}

const LeadProfileForm: React.FC<LeadProfileFormProps> = ({ customerId, onSave }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { message: antMessage } = useApp();
  const { isMobile, isSmall } = useResponsive();
  
  // 状态管理
  const [loading, setLoading] = useState(!!customerId);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  // 加载客户数据
  const loadCustomerData = async () => {
    if (!customerId) return;
    
    try {
      setLoading(true);
      const customerData = await crmApi.getCustomerById(customerId);
      setCustomer(customerData);
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
    if (customerId) {
      loadCustomerData();
    }
  }, [customerId]);

  // 保存基础信息和家庭画像
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const requestData: Partial<CreateCustomerRequest> = {
        ...values,
        birthDate: values.birthDate?.format('YYYY-MM-DD'),
        firstContactDate: values.firstContactDate?.format('YYYY-MM-DD'),
        nextFollowUpDate: values.nextFollowUpDate?.format('YYYY-MM-DD'),
        tags: selectedTagIds
      };

      let updatedCustomer: Customer;
      if (customerId) {
        updatedCustomer = await crmApi.updateCustomer(customerId, requestData);
      } else {
        updatedCustomer = await crmApi.createCustomer(requestData as CreateCustomerRequest);
      }

      setCustomer(updatedCustomer);
      antMessage.success(`客户 **${updatedCustomer.name}** 的信息已成功保存！`);
      
      if (onSave) {
        onSave(updatedCustomer);
      }
      
    } catch (error: any) {
      console.error('保存客户信息失败:', error);
      antMessage.error('信息保存失败，请检查网络后重试。');
    } finally {
      setSaving(false);
    }
  };

  // 删除客户
  const handleDelete = async () => {
    if (!customerId || !customer) return;
    
    try {
      setDeleting(true);
      await crmApi.deleteCustomer(customerId);
      
      antMessage.success(`客户 **${customer.name}** 已成功删除`);
      
      // 删除成功后返回客户列表页面
      navigate('/crm');
      
    } catch (error: any) {
      console.error('删除客户失败:', error);
      antMessage.error('删除客户失败，请检查网络后重试。');
    } finally {
      setDeleting(false);
    }
  };

  // 处理标签选择
  const handleTagToggle = (tagId: number, checked: boolean) => {
    setSelectedTagIds(prev => 
      checked 
        ? [...prev, tagId]
        : prev.filter(id => id !== tagId)
    );
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

  // ========== 沟通纪要管理（即时保存）==========

  // 添加新纪要
  const handleAddNewLog = async () => {
    if (!newLogContent.trim() || !customerId) return;

    try {
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
      const predefinedTags = categoryTags.filter(tag => tag.isPredefined);
      const customTags = categoryTags.filter(tag => !tag.isPredefined);

      return (
        <Card key={category.key} size="small" style={{ marginBottom: 16 }}>
          <Title level={5} style={{ marginBottom: 12 }}>
            {category.title}
          </Title>
          
          <Space size={[8, 8]} wrap>
            {/* 预设标签 */}
            {predefinedTags.map(tag => (
              <Tag.CheckableTag
                key={tag.id}
                checked={selectedTagIds.includes(tag.id)}
                onChange={(checked) => handleTagToggle(tag.id, checked)}
              >
                {tag.text}
              </Tag.CheckableTag>
            ))}
            
            {/* 自定义标签 */}
            {customTags.map(tag => (
              <Tag.CheckableTag
                key={tag.id}
                checked={selectedTagIds.includes(tag.id)}
                onChange={(checked) => handleTagToggle(tag.id, checked)}
              >
                {tag.text}
              </Tag.CheckableTag>
            ))}
            
            {/* 自定义标签输入 - 优化后 */}
            <Input
              size="small"
              placeholder="自定义..."
              style={{ width: 100 }}
              onPressEnter={(e) => {
                const value = e.currentTarget.value;
                if (value.trim()) {
                  handleCreateCustomTag(value, category.key as TagTypeEnum);
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

  return (
    <div style={{ padding: '0' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0, marginBottom: '8px' }}>
              客户档案 - {customer?.name || '新客户'}
            </Title>
            <Text type="secondary">
              页面默认为编辑模式，所有字段均可直接修改
            </Text>
          </div>
          
          <Space>
            <Button onClick={() => navigate('/crm')}>
              返回
            </Button>
            {customerId && customer && (
              <Popconfirm
                title="确认删除客户"
                description={
                  <div style={{ maxWidth: '280px' }}>
                    <Text>确定要删除客户 <Text strong>"{customer.name}"</Text> 吗？</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      此操作将永久删除该客户的所有信息，包括沟通记录、标签关联等，且无法恢复。
                    </Text>
                  </div>
                }
                onConfirm={handleDelete}
                okText="确认删除"
                cancelText="取消"
                okType="danger"
                placement="bottomRight"
                icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />}
              >
                <Button 
                  danger
                  icon={<DeleteOutlined />}
                  loading={deleting}
                  disabled={saving || deleting}
                >
                  删除客户
                </Button>
              </Popconfirm>
            )}
            <Button 
              type="primary" 
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
              size="large"
              disabled={deleting}
            >
              确认保存
            </Button>
          </Space>
        </div>

        <Row gutter={[24, 24]}>
          {/* 基础信息区 */}
          <Col xs={24} lg={14}>
            <Card title="基础信息" style={{ height: '100%' }}>
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
                initialValues={{
                  status: 'POTENTIAL'
                }}
              >
                {/* 孩子信息 */}
                <Title level={4}>1. 孩子信息</Title>
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={<span><Text type="danger">*</Text> 孩子姓名</span>}
                      name="name"
                      rules={[{ required: true, message: '请输入孩子姓名' }]}
                    >
                      <Input placeholder="请输入孩子的真实姓名" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="性别" name="gender">
                      <Select placeholder="选择性别">
                        <Option value="MALE">男</Option>
                        <Option value="FEMALE">女</Option>
                        <Option value="OTHER">其他</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item label="出生年月" name="birthDate">
                      <DatePicker style={{ width: '100%' }} picker="date" placeholder="选择出生日期" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label="学校" name="school">
                      <Input placeholder="如：博文小学" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
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
                <Title level={4}>2. 家长信息</Title>
                {/* 动态家长表单 */}
                {Array.from({ length: parentCount }).map((_, index) => (
                  <div key={index} style={{ 
                    marginBottom: 16, 
                    padding: 12, 
                    border: '1px solid var(--ant-color-border-secondary)',
                    borderRadius: 6,
                    position: 'relative'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: 12
                    }}>
                      <Text strong>家长 {index + 1}</Text>
                      {index > 0 && (
                        <Button 
                          type="text" 
                          danger 
                          size="small"
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
                        </Button>
                      )}
                    </div>
                    
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={<span><Text type="danger">*</Text> 家长姓名</span>}
                          name={['parents', index, 'name']}
                          rules={[{ required: index === 0, message: '请输入家长姓名' }]}
                    >
                      <Input placeholder="请输入家长姓名" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={<span><Text type="danger">*</Text> 与孩子关系</span>}
                          name={['parents', index, 'relationship']}
                          rules={[{ required: index === 0, message: '请选择关系' }]}
                    >
                      <Select placeholder="与孩子关系">
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
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={<span><Text type="danger">*</Text> 家长联系方式</span>}
                          name={['parents', index, 'phone']}
                      rules={[
                            { required: index === 0, message: '请输入联系电话' },
                        { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
                      ]}
                    >
                      <Input placeholder="请输入11位手机号码" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                        <Form.Item label="家长微信号" name={['parents', index, 'wechatId']}>
                      <Input placeholder="选填：微信号" />
                    </Form.Item>
                  </Col>
                </Row>
                  </div>
                ))}

                {/* 添加家长按钮 - 真正有功能的 */}
                {parentCount < 3 && (
                <Form.Item>
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                      onClick={() => setParentCount(prev => prev + 1)}
                    style={{ width: '100%' }}
                  >
                      添加家长 ({parentCount}/3)
                  </Button>
                </Form.Item>
                )}

                {/* 联系与来源信息 */}
                <Title level={4}>3. 联系与来源信息</Title>
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={<span><Text type="danger">*</Text> 家庭住址或所在区域</span>}
                      name="address"
                      rules={[{ required: true, message: '请输入地址信息' }]}
                    >
                      <TextArea 
                        rows={3} 
                        placeholder="请输入详细地址或大致区域，便于分配就近校区" 
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
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
                  <Col xs={24} sm={12}>
                    <Form.Item label="首次接触日期" name="firstContactDate">
                      <DatePicker 
                        style={{ width: '100%' }} 
                        placeholder="选择首次接触的日期" 
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* 客户状态 */}
                <Title level={4}>4. 客户状态</Title>
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={<span><Text type="danger">*</Text> 当前客户状态</span>}
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
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="下次跟进日期"
                      name="nextFollowUpDate"
                      help="设置的日期到期后，该客户将出现在主仪表盘的'待办提醒'列表中"
                    >
                      <DatePicker style={{ width: '100%' }} placeholder="选择下次跟进日期（选填）" />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Card>
          </Col>

          {/* 家庭画像区 */}
          <Col xs={24} lg={10}>
            <Card title="家庭画像" style={{ height: '100%' }}>
              <div 
                style={{ 
                  maxHeight: isMobile ? '400px' : 'none',
                  minHeight: isMobile ? '300px' : 'auto',
                  overflowY: isMobile ? 'auto' : 'visible',
                  paddingRight: isMobile ? '4px' : '8px',
                  // 移动端滚动条样式 - 隐藏但保持功能
                  ...(isMobile && {
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  })
                }}
                className={isMobile ? "custom-scrollbar" : ""}
              >
                {renderFamilyPortraitTags()}
              </div>
            </Card>
          </Col>
        </Row>

        {/* 沟通纪要区 */}
        {customerId && (
          <Card title="沟通纪要" extra={
            <Text type="secondary" style={{ fontSize: '12px' }}>
              此区域即时保存，不依赖于页面底部的全局"确认保存"按钮
            </Text>
          }>
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
                    borderRadius: '6px'
                  }}
                />
              ) : (
                <Button 
                  type="dashed" 
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
                </Button>
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
                    padding: '12px 8px',
                    borderRadius: '8px',
                    // 🚀 性能优化：只过渡需要的属性，避免transition: all
                    transition: 'background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
                    marginBottom: '8px',
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
                      borderRadius: '2px',
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
                      paddingLeft: '0px',
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
                            borderRadius: '6px'
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
                          padding: '4px 0'
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
                              <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
                                确定要删除这条纪要吗？
                              </div>
                              <div style={{ 
                                fontSize: '12px', 
                                color: 'var(--ant-color-text-secondary)',
                                backgroundColor: 'var(--ant-color-fill-alter)',
                                padding: '4px 6px',
                                borderRadius: '3px',
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
                          <Button 
                            type="text" 
                            danger 
                            size="small"
                            icon={<DeleteOutlined />}
                            style={{ 
                              position: 'absolute',
                              right: '0px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              padding: '4px',
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

        {/* 页面页脚信息 */}
        {customer && (
          <div style={{ 
            position: 'relative',
            marginTop: isSmall ? '16px' : '24px',
            paddingTop: isSmall ? '12px' : '16px'
          }}>
            {/* 左下角时间信息 */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--ant-color-text-tertiary)',
              fontSize: '11px',
              fontFamily: 'Monaco, Consolas, monospace'
            }}>
              <span style={{
                fontSize: '8px',
                color: 'var(--ant-color-text-quaternary)'
              }}>
                •
              </span>
              <span>
                {dayjs(customer.updatedAt).format(isSmall ? 'MM-DD HH:mm' : 'YYYY-MM-DD HH:mm')}
              </span>
              <span style={{
                marginLeft: '8px',
                fontSize: '10px',
                color: 'var(--ant-color-text-quaternary)'
              }}>
                #{customer.id}
              </span>
            </div>
          </div>
        )}
      </Space>
    </div>
  );
};

export default LeadProfileForm; 