import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Row,
  Col,
  Table,
  Button,
  Tag,
  Space,
  Typography,
  Card,
  Statistic,
  Divider,
  List,
  Badge,
  Tooltip,
  Progress,
    Collapse,
} from 'antd';
import {
  BookOutlined,
  TrophyOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  SearchOutlined,
  CalendarOutlined,
  FilterOutlined,
  ClearOutlined
} from '@ant-design/icons';
import type { ExamType, Subject, Exam, CreateExamRequest } from '@/types/api';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;
const { Search } = Input;
const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
const { Panel } = Collapse;

// 科目中文映射
const subjectLabels: Record<string, string> = {
  'CHINESE': '语文',
  'MATH': '数学', 
  'ENGLISH': '英语',
  'PHYSICS': '物理',
  'CHEMISTRY': '化学',
  'BIOLOGY': '生物',
  'HISTORY': '历史',
  'GEOGRAPHY': '地理',
  'POLITICS': '政治'
};

// 考试类型中文映射
const examTypeLabels: Record<string, string> = {
  'DAILY_QUIZ': '日常测验',
  'WEEKLY_TEST': '周测',
  'MONTHLY_EXAM': '月考', 
  'MIDTERM': '期中考试',
  'FINAL': '期末考试'
};

// ================================
// 创建考试Modal组件
// ================================
interface CreateExamModalProps {
  open: boolean;
  loading: boolean;
  classId: number;
  className: string;
  examMetadata: {
    subjects: Array<{ value: string; label: string }>;
    examTypes: Array<{ value: string; label: string }>;
  } | null;
  onOk: (values: CreateExamRequest) => Promise<void>;
  onCancel: () => void;
}

export const CreateExamModal: React.FC<CreateExamModalProps> = ({
  open,
  loading,
  classId,
  className,
  examMetadata,
  onOk,
  onCancel
}) => {
  const [form] = Form.useForm();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await onOk({
        ...values,
        examDate: values.examDate.format('YYYY-MM-DD'),
        classId
      });
      form.resetFields();
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={
        <Space>
          <BookOutlined style={{ color: '#52c41a' }} />
          <span>为班级"{className}"创建考试</span>
        </Space>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={600}
      okText="创建考试"
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="考试名称"
              name="name"
              rules={[{ required: true, message: '请输入考试名称' }]}
            >
              <Input placeholder="如：第一次月考、期中考试" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="考试类型"
              name="examType"
              rules={[{ required: true, message: '请选择考试类型' }]}
            >
              <Select placeholder="选择考试类型">
                {examMetadata?.examTypes?.map(type => (
                  <Option key={type.value} value={type.value}>
                    {type.label}
                  </Option>
                )) || []}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="考试日期"
              name="examDate"
              rules={[{ required: true, message: '请选择考试日期' }]}
              initialValue={dayjs()}
            >
              <DatePicker 
                style={{ width: '100%' }}
                placeholder="选择考试日期"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="总分"
              name="totalScore"
              initialValue={100}
            >
              <InputNumber
                min={1}
                max={300}
                style={{ width: '100%' }}
                placeholder="默认100分"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="考试科目"
          name="subjects"
          rules={[{ required: true, message: '请选择至少一个科目' }]}
        >
          <Select
            mode="multiple"
            placeholder="选择考试科目"
            maxTagCount={5}
          >
            {examMetadata?.subjects?.map(subject => (
              <Option key={subject.value} value={subject.value}>
                {subjectLabels[subject.value] || subject.label}
              </Option>
            )) || []}
          </Select>
        </Form.Item>

        <Form.Item
          label="考试说明"
          name="description"
        >
          <TextArea
            rows={3}
            placeholder="可选：添加考试相关说明..."
            showCount
            maxLength={200}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ================================
// 往期考试查看Modal组件
// ================================
interface ExamHistoryModalProps {
  open: boolean;
  classId: number;
  className: string;
  exams: Exam[];
  loading: boolean;
  onCancel: () => void;
  onExamClick: (exam: Exam) => void;
  onDeleteExam: (examId: number) => void;
  onSearch: (filters: {
    name?: string;
    examType?: string;
    startDate?: string;
    endDate?: string;
  }) => void;
}

export const ExamHistoryModal: React.FC<ExamHistoryModalProps> = ({
  open,
  classId,
  className,
  exams,
  loading,
  onCancel,
  onExamClick,
  onDeleteExam,
  onSearch
}) => {
  // 搜索状态
  const [searchName, setSearchName] = useState<string>('');
  const [searchExamType, setSearchExamType] = useState<string | undefined>(undefined);
  const [searchDateRange, setSearchDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  
  // 执行搜索
  const handleSearch = () => {
    const filters: any = {};
    
    if (searchName.trim()) {
      filters.name = searchName.trim();
    }
    
    if (searchExamType) {
      filters.examType = searchExamType;
    }
    
    if (searchDateRange && searchDateRange[0] && searchDateRange[1]) {
      filters.startDate = searchDateRange[0]!.format('YYYY-MM-DD');
      filters.endDate = searchDateRange[1]!.format('YYYY-MM-DD');
    }
    
    onSearch(filters);
  };
  
  // 清空搜索
  const handleClearSearch = () => {
    setSearchName('');
    setSearchExamType(undefined);
    setSearchDateRange(null);
    onSearch({});
  };
  
  // 当弹窗打开时，重置搜索条件
  useEffect(() => {
    if (open) {
      setSearchName('');
      setSearchExamType(undefined);
      setSearchDateRange(null);
    }
  }, [open]);
  // 按考试类型分组
  const examsByType = (exams || []).reduce((acc, exam) => {
    if (!acc[exam.examType]) {
      acc[exam.examType] = [];
    }
    acc[exam.examType].push(exam);
    return acc;
  }, {} as Record<ExamType, Exam[]>);

  const getExamTypeLabel = (type: ExamType) => {
    return examTypeLabels[type] || type;
  };

  const getExamTypeColor = (type: ExamType) => {
    const colorMap = {
      'DAILY_QUIZ': 'default',
      'WEEKLY_TEST': 'processing',
      'MONTHLY_EXAM': 'warning',
      'MIDTERM': 'success',
      'FINAL': 'error'
    };
    return colorMap[type] || 'default';
  };

  const renderExamCard = (exam: Exam) => (
    <Card
      key={exam.id}
      size="small"
      hoverable
      style={{ marginBottom: 8 }}
      onClick={() => onExamClick(exam)}
      actions={[
        <Tooltip title="查看详情">
          <Button type="text" icon={<BarChartOutlined />} />
        </Tooltip>,
        <Tooltip title="删除考试">
          <Button 
            type="text" 
            danger 
            onClick={(e) => {
              e.stopPropagation();
              onDeleteExam(exam.id);
            }}
          >
            删除
          </Button>
        </Tooltip>
      ]}
    >
      <Card.Meta
        title={
          <Space>
            <Text strong>{exam.name}</Text>
            <Tag color={getExamTypeColor(exam.examType)}>
              {getExamTypeLabel(exam.examType)}
            </Tag>
          </Space>
        }
        description={
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text type="secondary">
              📅 {dayjs(exam.examDate).format('YYYY年MM月DD日')}
            </Text>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="总分"
                  value={exam.totalScore || 100}
                  prefix={<TrophyOutlined />}
                  valueStyle={{ fontSize: '14px' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="参考人数"
                  value={exam.totalStudents || 0}
                  prefix={<UserOutlined />}
                  valueStyle={{ fontSize: '14px' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="录入率"
                  value={Math.round((exam.completionRate || 0))}
                  suffix="%"
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ fontSize: '14px' }}
                />
              </Col>
            </Row>
            {exam.subjects && exam.subjects.length > 0 && (
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>科目：</Text>
                {exam.subjects.slice(0, 3).map((subject, index) => (
                  <Tag key={subject} style={{ marginLeft: 4, fontSize: '12px' }}>
                    {subjectLabels[subject] || subject}
                  </Tag>
                ))}
                {exam.subjects.length > 3 && (
                  <Tag style={{ marginLeft: 4, fontSize: '12px' }}>
                    +{exam.subjects.length - 3}
                  </Tag>
                )}
              </div>
            )}
          </Space>
        }
      />
    </Card>
  );

  return (
    <Modal
      title={
        <Space>
          <BarChartOutlined style={{ color: '#1890ff' }} />
          <span>班级"{className}"往期考试</span>
          <Badge count={exams.length} showZero />
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel}>
          关闭
        </Button>
      ]}
      width={900}
      style={{ top: 20 }}
    >
      {/* 搜索区域 */}
      <Collapse 
        ghost 
        style={{ marginBottom: 16 }}
        items={[
          {
            key: 'search',
            label: (
              <Space>
                <SearchOutlined style={{ color: '#1890ff' }} />
                <span style={{ fontWeight: 500 }}>搜索过滤</span>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {(searchName || searchExamType || searchDateRange) ? '已设置过滤条件' : '点击展开搜索选项'}
                </Text>
              </Space>
            ),
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>考试名称</Text>
                    <Search
                      placeholder="输入考试名称关键词"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      onSearch={handleSearch}
                      allowClear
                      size="small"
                      style={{ width: '100%' }}
                    />
                  </Space>
                </Col>
                
                <Col xs={24} sm={12} md={8}>
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>考试性质</Text>
                    <Select
                      placeholder="选择考试类型"
                      value={searchExamType}
                      onChange={setSearchExamType}
                      allowClear
                      size="small"
                      style={{ width: '100%' }}
                    >
                      {Object.entries(examTypeLabels).map(([value, label]) => (
                        <Option key={value} value={value}>{label}</Option>
                      ))}
                    </Select>
                  </Space>
                </Col>
                
                <Col xs={24} sm={24} md={8}>
                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>考试时间</Text>
                    <RangePicker
                      placeholder={['开始日期', '结束日期']}
                      value={searchDateRange}
                      onChange={setSearchDateRange}
                      size="small"
                      style={{ width: '100%' }}
                      format="YYYY-MM-DD"
                    />
                  </Space>
                </Col>
                
                <Col span={24}>
                  <Space>
                    <Button 
                      type="primary" 
                      size="small" 
                      icon={<SearchOutlined />}
                      onClick={handleSearch}
                    >
                      搜索
                    </Button>
                    <Button 
                      size="small" 
                      icon={<ClearOutlined />}
                      onClick={handleClearSearch}
                    >
                      清空
                    </Button>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      共找到 {exams.length} 场考试
                    </Text>
                  </Space>
                </Col>
              </Row>
            )
          }
        ]}
      />
      
      <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
        {exams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <BookOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">暂无考试记录</Text>
            </div>
          </div>
        ) : (
          Object.keys(examsByType).map(type => (
            <div key={type} style={{ marginBottom: 24 }}>
              <Title level={5} style={{ marginBottom: 12 }}>
                <Tag color={getExamTypeColor(type as ExamType)}>
                  {getExamTypeLabel(type as ExamType)}
                </Tag>
                ({examsByType[type as ExamType].length}场)
              </Title>
              {examsByType[type as ExamType]
                .sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime())
                .map(renderExamCard)}
              {Object.keys(examsByType).indexOf(type) < Object.keys(examsByType).length - 1 && (
                <Divider />
              )}
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}; 