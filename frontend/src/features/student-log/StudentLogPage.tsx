import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Typography, 
  Row, 
  Col, 
  Card, 
  Input, 
  Button, 
  Menu, 
  Space, 
  Statistic, 
  Modal, 
  Tag,
  App,
  List,
  Avatar,
  Dropdown,
  Badge,
  FloatButton,
  Empty,
  Spin,
  Divider,
  Grid,
  Checkbox,
  Popconfirm,
  Pagination,
  Select
} from 'antd';
import type { MenuProps } from 'antd';
import {
  TeamOutlined,
  BarChartOutlined,
  BookOutlined,
  UserAddOutlined,
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined,
  DownloadOutlined,
  TrophyOutlined,
  UserOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  SmileOutlined,
  FrownOutlined,
  StarOutlined,
  ExclamationCircleOutlined,
  UserSwitchOutlined,
  EditOutlined,

  BookFilled
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeStore } from '@/stores/themeStore';
import { useDebounce } from '@/hooks/useDebounce';
import { getGradeLabel, getSourceChannelLabel } from '@/utils/enumMappings';

import type { ClassStudent, Class, Customer } from '@/types/api';
import * as studentLogApi from '@/api/studentLogApi';
import GrowthTagManager from './components/GrowthTagManager';
import { PREDEFINED_POSITIVE_TAGS, PREDEFINED_NEGATIVE_TAGS } from '@/constants/predefinedTags';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const { useApp } = App;
const { useBreakpoint } = Grid;
const { confirm } = Modal;

// 学生状态标签
const STUDENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  'ENROLLED': { label: '已报名', color: '#52c41a' },
  'TRIAL_CLASS': { label: '试听中', color: '#faad14' },
  'INTERESTED': { label: '有意向', color: '#1890ff' },
  'POTENTIAL': { label: '潜在客户', color: '#8c8c8c' }
};

// ================================
// 成长表现选择弹窗组件
// ================================
interface GrowthTagSelectorProps {
  open: boolean;
  student: ClassStudent;
  growthTags: any[];
  onSelect: (student: ClassStudent, tagId: number) => void;
  onCancel: () => void;
}

const GrowthTagSelector: React.FC<GrowthTagSelectorProps> = ({
  open,
  student,
  growthTags,
  onSelect,
  onCancel
}) => {
  const { theme } = useThemeStore();
  const { isMobile } = useResponsive();
  const screens = useBreakpoint();

  const positiveTags = growthTags.filter(tag => tag.type === 'GROWTH_POSITIVE');
  const negativeTags = growthTags.filter(tag => tag.type === 'GROWTH_NEGATIVE');

  const handleTagClick = (tagId: number) => {
    onSelect(student, tagId);
    onCancel();
  };

  const renderTagGroup = (tags: any[], title: string, icon: React.ReactNode, color: string) => (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '16px',
        paddingBottom: '8px',
        borderBottom: `2px solid ${color}20`
      }}>
        {icon}
        <Text strong style={{ 
          fontSize: '16px', 
          marginLeft: '8px',
          color: color
        }}>
          {title}
        </Text>
        <Badge 
          count={tags.length} 
          style={{ 
            backgroundColor: color,
            marginLeft: '8px'
          }} 
          size="small"
        />
      </div>
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: isMobile 
          ? 'repeat(2, 1fr)' 
          : screens.lg 
            ? 'repeat(4, 1fr)' 
            : 'repeat(3, 1fr)',
        gap: '12px'
      }}>
        {tags.map(tag => (
          <Button
            key={tag.id}
            onClick={() => handleTagClick(tag.id)}
            style={{
              height: 'auto',
              padding: '12px 16px',
              textAlign: 'left',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              backgroundColor: theme === 'dark' ? '#1f1f1f' : '#ffffff',
              borderColor: color,
              borderWidth: '1px',
              borderStyle: 'solid',
              borderRadius: '8px',
              transition: 'all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '56px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${color}10`;
              e.currentTarget.style.borderColor = color;
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 4px 12px ${color}30`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'dark' ? '#1f1f1f' : '#ffffff';
              e.currentTarget.style.borderColor = color;
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Text style={{ 
              fontSize: '14px',
              fontWeight: 500,
              color: theme === 'dark' ? '#ffffff' : '#000000',
              lineHeight: '1.4'
            }}>
              {tag.text}
            </Text>
          </Button>
        ))}
      </div>
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
              backgroundColor: student.gender === 'MALE' ? '#1890ff' : 
                             student.gender === 'FEMALE' ? '#eb2f96' : '#722ed1'
            }}
          >
            {student.name?.slice(-2) || '学生'}
          </Avatar>
          <div>
            <Text strong style={{ fontSize: '16px' }}>
              {student.name} - 成长表现记录
            </Text>
            <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: '2px' }}>
              请选择今日的表现词条
            </div>
          </div>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} size="large">
          取消
        </Button>
      ]}
      width={isMobile ? '95%' : 900}
      centered
      styles={{
        body: { 
          padding: '24px',
          maxHeight: '70vh',
          overflow: 'auto'
        }
      }}
      destroyOnClose
    >
      <div style={{ padding: '8px 0' }}>
        {renderTagGroup(
          positiveTags, 
          '正面表现', 
          <SmileOutlined style={{ fontSize: '18px', color: '#52c41a' }} />,
          '#52c41a'
        )}
        
        {renderTagGroup(
          negativeTags, 
          '需要改进', 
          <FrownOutlined style={{ fontSize: '18px', color: '#ff4d4f' }} />,
          '#ff4d4f'
        )}
        
        {positiveTags.length === 0 && negativeTags.length === 0 && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无成长标签，请先在系统中添加标签"
            style={{ margin: '40px 0' }}
          />
        )}
      </div>
    </Modal>
  );
};

// ================================
// 创建班级弹窗组件
// ================================
interface CreateClassModalProps {
  open: boolean;
  loading: boolean;
  onOk: (name: string) => void;
  onCancel: () => void;
}

const CreateClassModal: React.FC<CreateClassModalProps> = ({ 
  open, 
  loading, 
  onOk, 
  onCancel 
}) => {
  const [className, setClassName] = useState('');

  const handleOk = () => {
    if (!className.trim()) {
      Modal.error({ title: '错误', content: '请输入班级名称' });
      return;
    }
    onOk(className.trim());
  };

  const handleCancel = () => {
    setClassName('');
    onCancel();
  };

  useEffect(() => {
    if (!open) {
      setClassName('');
    }
  }, [open]);

  return (
    <Modal
      title={
        <Space>
          <PlusOutlined style={{ color: '#1890ff' }} />
          <span>创建新班级</span>
        </Space>
      }
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="创建班级"
      cancelText="取消"
      destroyOnClose
      centered
      styles={{
        body: { padding: '24px' }
      }}
    >
      <div style={{ margin: '16px 0' }}>
        <Input
          placeholder="请输入班级名称，如：高一(A)班、初三数学提升班"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          onPressEnter={handleOk}
          maxLength={50}
          showCount
          autoFocus
          size="large"
          style={{ 
            borderRadius: '8px',
            fontSize: '14px'
          }}
        />
      </div>
    </Modal>
  );
};

// ================================
// 编辑班级弹窗组件
// ================================
interface EditClassModalProps {
  open: boolean;
  loading: boolean;
  classInfo: Class | null;
  onOk: (classId: number, newName: string) => void;
  onCancel: () => void;
}

const EditClassModal: React.FC<EditClassModalProps> = ({ 
  open, 
  loading, 
  classInfo,
  onOk, 
  onCancel 
}) => {
  const [className, setClassName] = useState('');

  useEffect(() => {
    if (open && classInfo) {
      setClassName(classInfo.name);
    } else if (!open) {
      setClassName('');
    }
  }, [open, classInfo]);

  const handleOk = () => {
    if (!className.trim()) {
      Modal.error({ title: '错误', content: '请输入班级名称' });
      return;
    }
    if (!classInfo) return;
    onOk(classInfo.id, className.trim());
  };

  const handleCancel = () => {
    setClassName('');
    onCancel();
  };

  return (
    <Modal
      title={
        <Space>
          <EditOutlined style={{ color: '#1890ff' }} />
          <span>编辑班级</span>
        </Space>
      }
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="保存修改"
      cancelText="取消"
      destroyOnClose
      centered
      styles={{
        body: { padding: '24px' }
      }}
    >
      <div style={{ margin: '16px 0' }}>
        <Input
          placeholder="请输入班级名称"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          onPressEnter={handleOk}
          maxLength={50}
          showCount
          autoFocus
          size="large"
          style={{ 
            borderRadius: '8px',
            fontSize: '14px'
          }}
        />
      </div>
    </Modal>
  );
};

// ================================
// 添加学生弹窗组件
// ================================
interface AddStudentsModalProps {
  open: boolean;
  loading: boolean;
  classId?: number;
  onOk: (studentIds: number[]) => void;
  onCancel: () => void;
}

const AddStudentsModal: React.FC<AddStudentsModalProps> = ({ 
  open, 
  loading, 
  classId,
  onOk, 
  onCancel 
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [availableStudents, setAvailableStudents] = useState<Customer[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const { isMobile } = useResponsive();
  const { theme } = useThemeStore();

  const searchStudents = useCallback(async (search?: string) => {
    if (!classId) return;
    
    setStudentsLoading(true);
    try {
      const students = await studentLogApi.getEnrollableStudents(classId, {
        search,
        limit: 50
      });
      setAvailableStudents(students);
    } catch (error) {
      console.error('搜索学生失败:', error);
      Modal.error({ title: '错误', content: '搜索学生失败' });
    } finally {
      setStudentsLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    if (open) {
      searchStudents();
      setSelectedStudentIds([]);
      setSearchValue('');
    }
  }, [open, searchStudents]);

  const handleOk = () => {
    if (selectedStudentIds.length === 0) {
      Modal.warning({ title: '提示', content: '请选择要添加的学生' });
      return;
    }
    onOk(selectedStudentIds);
  };

  const handleCancel = () => {
    setSelectedStudentIds([]);
    setSearchValue('');
    onCancel();
  };

  const filteredStudents = availableStudents.filter(student =>
    !searchValue || 
    student.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    student.school?.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <Modal
      title={
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          paddingRight: '40px'
        }}>
          <Space>
            <UserAddOutlined style={{ color: '#1890ff', fontSize: '16px' }} />
            <span style={{ fontSize: '16px', fontWeight: 600 }}>添加学生到班级</span>
          </Space>
          <Badge 
            count={selectedStudentIds.length} 
            style={{ backgroundColor: '#52c41a' }}
            showZero={false}
          >
            <Tag color="blue" style={{ margin: 0, padding: '4px 8px' }}>
              {filteredStudents.length} 名可选
            </Tag>
          </Badge>
        </div>
      }
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={isMobile ? '95%' : 800}
      centered
      styles={{
        body: { 
          padding: '24px',
          maxHeight: '70vh', 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
      okText={selectedStudentIds.length > 0 ? `确认添加 ${selectedStudentIds.length} 名学生` : '确认添加'}
      cancelText="取消"
      okButtonProps={{
        disabled: selectedStudentIds.length === 0,
        size: 'large'
      }}
      cancelButtonProps={{
        size: 'large'
      }}
    >
      <div style={{ marginBottom: '20px' }}>
        <Search
          placeholder="搜索学生姓名或学校..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          size="large"
          allowClear
          style={{ borderRadius: '8px' }}
        />
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <Spin spinning={studentsLoading}>
          {filteredStudents.length === 0 ? (
            <Empty 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无可添加的学生"
              style={{ margin: '60px 0' }}
            />
          ) : (
            <List
              itemLayout="horizontal"
              dataSource={filteredStudents}
              split={false}
              renderItem={(student) => {
                const isSelected = selectedStudentIds.includes(student.id);
                return (
                  <List.Item
                    style={{
                      padding: '16px',
                      margin: '0 0 8px 0',
                      border: `2px solid ${isSelected ? '#1890ff' : 'transparent'}`,
                      borderRadius: '8px',
                      backgroundColor: isSelected 
                        ? (theme === 'dark' ? '#111b26' : '#e6f7ff')
                        : (theme === 'dark' ? '#1f1f1f' : '#ffffff'),
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1)',
                      boxShadow: isSelected 
                        ? '0 4px 12px rgba(24, 144, 255, 0.15)'
                        : '0 2px 8px rgba(0, 0, 0, 0.06)',
                    }}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                      } else {
                        setSelectedStudentIds(prev => [...prev, student.id]);
                      }
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          size={48}
                          style={{ 
                            backgroundColor: student.gender === 'MALE' ? '#1890ff' : 
                                           student.gender === 'FEMALE' ? '#eb2f96' : '#722ed1',
                            fontSize: '16px',
                            fontWeight: 600
                          }}
                        >
                          {student.name.slice(-2)}
                        </Avatar>
                      }
                      title={
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between'
                        }}>
                          <Text 
                            strong 
                            style={{ 
                              fontSize: '16px',
                              color: isSelected ? '#1890ff' : undefined
                            }}
                          >
                            {student.name}
                          </Text>
                          <Tag 
                            color={STUDENT_STATUS_LABELS[student.status]?.color || '#8c8c8c'}
                            style={{ margin: 0 }}
                          >
                            {STUDENT_STATUS_LABELS[student.status]?.label || student.status}
                          </Tag>
                        </div>
                      }
                      description={
                        <Space split={<Divider type="vertical" />} size="small">
                          {student.school && (
                            <Text type="secondary" style={{ fontSize: '13px' }}>
                              <BookOutlined style={{ marginRight: '4px' }} />
                              {student.school}
                            </Text>
                          )}
                          {student.grade && (
                            <Text type="secondary" style={{ fontSize: '13px' }}>
                              {getGradeLabel(student.grade)}
                            </Text>
                          )}
                          {student.sourceChannel && (
                            <Text type="secondary" style={{ fontSize: '13px' }}>
                              来源: {getSourceChannelLabel(student.sourceChannel)}
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          )}
        </Spin>
      </div>
    </Modal>
  );
};

// ================================
// 重新分配学生弹窗组件
// ================================
interface ReassignStudentModalProps {
  open: boolean;
  loading: boolean;
  student: ClassStudent | null;
  classes: Class[];
  onOk: (studentId: number, classId: number) => void;
  onCancel: () => void;
}

const ReassignStudentModal: React.FC<ReassignStudentModalProps> = ({ 
  open, 
  loading, 
  student,
  classes,
  onOk, 
  onCancel 
}) => {
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const { theme } = useThemeStore();

  useEffect(() => {
    if (!open) {
      setSelectedClassId(null);
    }
  }, [open]);

  const handleOk = () => {
    if (!selectedClassId || !student) {
      Modal.warning({ title: '提示', content: '请选择要分配到的班级' });
      return;
    }
    onOk(student.id, selectedClassId);
  };

  return (
    <Modal
      title={
        <Space>
          <UserSwitchOutlined style={{ color: '#1890ff' }} />
          <span>重新分配班级</span>
        </Space>
      }
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      okText="确认分配"
      cancelText="取消"
      destroyOnClose
      centered
      styles={{
        body: { padding: '24px' }
      }}
    >
      {student && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            padding: '16px',
            backgroundColor: theme === 'dark' ? '#1f1f1f' : '#f5f5f5',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <Avatar 
              size={40}
              style={{ 
                backgroundColor: student.gender === 'MALE' ? '#1890ff' : 
                               student.gender === 'FEMALE' ? '#eb2f96' : '#722ed1'
              }}
            >
              {student.name?.slice(-2) || '学生'}
            </Avatar>
            <div>
              <Text strong style={{ fontSize: '16px' }}>
                {student.name}
              </Text>
              <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                将从"已完课学生"重新分配到班级
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '8px' }}>
            <Text strong>选择目标班级：</Text>
          </div>
          
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            {classes.map(cls => (
              <Card
                key={cls.id}
                size="small"
                style={{
                  cursor: 'pointer',
                  borderColor: selectedClassId === cls.id ? '#1890ff' : undefined,
                  backgroundColor: selectedClassId === cls.id 
                    ? (theme === 'dark' ? '#111b26' : '#e6f7ff')
                    : undefined
                }}
                bodyStyle={{ padding: '12px' }}
                onClick={() => setSelectedClassId(cls.id)}
              >
                <div style={{ textAlign: 'center' }}>
                  <TeamOutlined style={{ 
                    fontSize: '20px', 
                    color: selectedClassId === cls.id ? '#1890ff' : '#8c8c8c',
                    marginBottom: '8px'
                  }} />
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: selectedClassId === cls.id ? 600 : 400,
                    color: selectedClassId === cls.id ? '#1890ff' : undefined
                  }}>
                    {cls.name}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
};

// ================================
// 学生卡片组件
// ================================
interface StudentCardProps {
  student: ClassStudent;
  selectedRowKeys: React.Key[];
  attendanceLoading: { [key: number]: string | null };
  isCompleted: boolean;
  onSelect: (enrollmentId: number, checked: boolean) => void;
  onAttendance: (student: ClassStudent, status: string) => void;
  onGrowthRecord: (student: ClassStudent) => void;
  onMarkCompleted: (enrollmentId: number) => void;
  onReassignToClass: (student: ClassStudent) => void;
  onViewDetail: (student: ClassStudent) => void;
}

const StudentCard: React.FC<StudentCardProps> = ({
  student,
  selectedRowKeys,
  attendanceLoading,
  isCompleted,
  onSelect,
  onAttendance,
  onGrowthRecord,
  onMarkCompleted,
  onReassignToClass,
  onViewDetail
}) => {
  const { theme } = useThemeStore();

  const studentActions = [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: '查看详情',
      onClick: () => onViewDetail(student)
    },
    {
      key: 'divider1',
      type: 'divider' as const
    },
    ...(isCompleted ? [
      {
        key: 'reassign',
        icon: <UserSwitchOutlined />,
        label: '重新分配班级',
        onClick: () => onReassignToClass(student)
      }
    ] : [
      {
        key: 'complete',
        icon: <BookFilled />,
        label: '标记为已完课',
        onClick: () => onMarkCompleted(student.enrollmentId)
      }
    ])
  ];

  return (
    <Card
      size="small"
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Checkbox
              checked={selectedRowKeys.includes(student.enrollmentId)}
              onChange={(e) => onSelect(student.enrollmentId, e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
            <Avatar 
              size="small"
              style={{ 
                backgroundColor: student.gender === 'MALE' ? '#1890ff' : 
                               student.gender === 'FEMALE' ? '#eb2f96' : '#722ed1',
                opacity: isCompleted ? 0.6 : 1
              }}
            >
              {student.name?.slice(-2) || '学生'}
            </Avatar>
            <span style={{ opacity: isCompleted ? 0.6 : 1 }}>{student.name}</span>
            {isCompleted && (
              <Tag color="orange">已完课</Tag>
            )}
          </Space>
          <Dropdown 
            menu={{ items: studentActions }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
            />
          </Dropdown>
        </div>
      }
      style={{
        height: '220px',
        borderColor: selectedRowKeys.includes(student.enrollmentId) ? '#1890ff' : undefined,
        opacity: isCompleted ? 0.8 : 1
      }}
      bodyStyle={{ padding: '12px' }}
    >
      {/* 学生信息 */}
      <div style={{ marginBottom: '12px', fontSize: '12px', color: '#8c8c8c' }}>
        <Space split={<Divider type="vertical" />} size="small">
          {student.school && <span>{student.school}</span>}
          {student.grade && (
            <span>{getGradeLabel(student.grade)}</span>
          )}
        </Space>
      </div>

      {/* 签到按钮 */}
      <div style={{ marginBottom: '12px' }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <Button 
              size="small" 
              disabled={isCompleted}
              style={{ flex: 1, fontSize: '11px' }}
              type={student.todayAttendance?.[new Date().getHours() < 12 ? 'AM' : 'PM'] === 'PRESENT' ? 'primary' : 'default'}
              loading={attendanceLoading[student.enrollmentId] === 'PRESENT'}
              onClick={() => onAttendance(student, 'PRESENT')}
            >
              出席
            </Button>
            <Button 
              size="small" 
              disabled={isCompleted}
              style={{ flex: 1, fontSize: '11px' }}
              type={student.todayAttendance?.[new Date().getHours() < 12 ? 'AM' : 'PM'] === 'LATE' ? 'primary' : 'default'}
              loading={attendanceLoading[student.enrollmentId] === 'LATE'}
              onClick={() => onAttendance(student, 'LATE')}
            >
              迟到
            </Button>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <Button 
              size="small" 
              disabled={isCompleted}
              style={{ flex: 1, fontSize: '11px' }}
              type={student.todayAttendance?.[new Date().getHours() < 12 ? 'AM' : 'PM'] === 'ABSENT' ? 'primary' : 'default'}
              loading={attendanceLoading[student.enrollmentId] === 'ABSENT'}
              onClick={() => onAttendance(student, 'ABSENT')}
            >
              请假
            </Button>
            <Button 
              size="small" 
              disabled={isCompleted}
              style={{ flex: 1, fontSize: '11px' }}
              type={student.todayAttendance?.[new Date().getHours() < 12 ? 'AM' : 'PM'] === 'NO_SHOW' ? 'primary' : 'default'}
              loading={attendanceLoading[student.enrollmentId] === 'NO_SHOW'}
              onClick={() => onAttendance(student, 'NO_SHOW')}
            >
              缺席
            </Button>
          </div>
        </Space>
      </div>

      {/* 成长表现选择 */}
      <div style={{ 
        borderTop: `1px solid ${theme === 'dark' ? '#434343' : '#f0f0f0'}`, 
        paddingTop: '8px' 
      }}>
        <div style={{ 
          fontSize: '11px', 
          color: theme === 'dark' ? '#a0a0a0' : '#8c8c8c', 
          marginBottom: '6px' 
        }}>
          成长表现
        </div>
        <Button
          size="small"
          disabled={isCompleted}
          style={{ 
            width: '100%',
            height: '32px',
            borderRadius: '6px',
            borderStyle: 'dashed',
            borderColor: isCompleted ? '#d9d9d9' : '#1890ff',
            color: isCompleted ? '#bfbfbf' : '#1890ff'
          }}
          icon={<StarOutlined />}
          onClick={() => onGrowthRecord(student)}
        >
          记录表现
        </Button>
      </div>
    </Card>
  );
};

// ================================
// 主组件：学生成长日志页面
// ================================
const StudentLogPage: React.FC = () => {
  const navigate = useNavigate();
  const { message: antMessage } = useApp();
  const { isMobile, isDesktop } = useResponsive();

  // 当前主题
  const { theme } = useThemeStore();
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [classStudentsMap, setClassStudentsMap] = useState<Record<number, ClassStudent[]>>({});
  
  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 16, // 默认每页16个学生卡片 (4x4网格)
    total: 0,
  });
  
  // 已完课学生管理 (前端轻量化处理)
  const [completedStudents, setCompletedStudents] = useState<Set<number>>(new Set());

  // 计算分页后的学生数据
  const paginatedStudents = useMemo(() => {
    const startIndex = (pagination.current - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return students.slice(startIndex, endIndex);
  }, [students, pagination.current, pagination.pageSize]);

  // 更新分页总数
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      total: students.length,
      current: 1 // 当学生列表变化时重置到第一页
    }));
  }, [students.length]);

  // 分页变化处理
  const handlePaginationChange = (page: number, pageSize?: number) => {
    setPagination(prev => ({
      ...prev,
      current: page,
      pageSize: pageSize || prev.pageSize
    }));
  };

  // UI状态
  const [createClassModalOpen, setCreateClassModalOpen] = useState(false);
  const [editClassModalOpen, setEditClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [addStudentsModalOpen, setAddStudentsModalOpen] = useState(false);
  const [reassignStudentModalOpen, setReassignStudentModalOpen] = useState(false);
  const [reassigningStudent, setReassigningStudent] = useState<ClassStudent | null>(null);
  const [createClassLoading, setCreateClassLoading] = useState(false);
  const [editClassLoading, setEditClassLoading] = useState(false);
  const [addStudentsLoading, setAddStudentsLoading] = useState(false);
  const [reassignStudentLoading, setReassignStudentLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState<{ [key: number]: string | null }>({});
  const [growthTags, setGrowthTags] = useState<any[]>([]);
  
  // 成长标签选择弹窗状态
  const [growthTagSelectorOpen, setGrowthTagSelectorOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<ClassStudent | null>(null);

  // 搜索防抖
  const debouncedSearchKeyword = useDebounce(searchKeyword, 300);

  // 统计数据
  const stats = useMemo(() => {
    const totalClasses = classes.length;
    const totalStudents = students.length;
    const activeStudents = students.filter(s => 
      !completedStudents.has(s.enrollmentId) &&
      s.todayAttendance && 
      Object.values(s.todayAttendance).some(status => status === 'PRESENT')
    ).length;
    const completedCount = students.filter(s => completedStudents.has(s.enrollmentId)).length;
    const todayGrowthLogs = Math.floor(Math.random() * 30 + 10);

    return {
      totalClasses,
      totalStudents,
      activeStudents,
      completedCount,
      todayGrowthLogs
    };
  }, [classes, students, completedStudents]);

  // ================================
  // 数据加载函数
  // ================================
  const loadClasses = useCallback(async () => {
    try {
      const classesData = await studentLogApi.getClasses();
      setClasses(classesData);
    } catch (error) {
      console.error('加载班级列表失败:', error);
      antMessage.error('加载班级列表失败');
    }
  }, [antMessage]);

  const loadStudents = useCallback(async (classId?: string, search?: string) => {
    try {
      setLoading(true);
      let studentsData: ClassStudent[] = [];
      
      if (!classId || classId === 'all') {
        const allStudentsPromises = classes.map(cls => 
          studentLogApi.getClassStudents(cls.id, {
            includeOtherEnrollments: true,
            includeStats: true,
            includeRecentTags: false
          })
        );
        const allStudentsArrays = await Promise.all(allStudentsPromises);
        
        const newClassStudentsMap: Record<number, ClassStudent[]> = {};
        classes.forEach((cls, index) => {
          newClassStudentsMap[cls.id] = allStudentsArrays[index];
        });
        setClassStudentsMap(newClassStudentsMap);
        
        studentsData = allStudentsArrays.flat();
      } else if (classId === 'completed') {
        // 显示已完课学生
        const allStudentsPromises = classes.map(cls => 
          studentLogApi.getClassStudents(cls.id, {
            includeOtherEnrollments: true,
            includeStats: true,
            includeRecentTags: false
          })
        );
        const allStudentsArrays = await Promise.all(allStudentsPromises);
        studentsData = allStudentsArrays.flat().filter(s => completedStudents.has(s.enrollmentId));
      } else {
        const classIdNumber = parseInt(classId);
        studentsData = await studentLogApi.getClassStudents(classIdNumber, {
          includeOtherEnrollments: true,
          includeStats: true,
          includeRecentTags: false
        });
        
        setClassStudentsMap(prev => ({
          ...prev,
          [classIdNumber]: studentsData
        }));
      }

      if (search?.trim()) {
        studentsData = studentsData.filter(student =>
          student.name?.toLowerCase().includes(search.toLowerCase()) ||
          student.school?.toLowerCase().includes(search.toLowerCase()) ||
          student.grade?.toLowerCase().includes(search.toLowerCase())
        );
      }

      setStudents(studentsData);
    } catch (error) {
      console.error('加载学生列表失败:', error);
      antMessage.error('加载学生列表失败');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [classes, completedStudents, antMessage]);

  const loadGrowthTags = useCallback(async () => {
    try {
      const tags = await studentLogApi.getGrowthTags('all');
      const allowedSet = new Set<string>([...PREDEFINED_POSITIVE_TAGS, ...PREDEFINED_NEGATIVE_TAGS]);
      const growthTagsOnly = tags.filter(tag => {
        const isGrowthType = tag.type === 'GROWTH_POSITIVE' || tag.type === 'GROWTH_NEGATIVE';
        if (!isGrowthType) return false;
        if (!tag.isPredefined) return true; // 全局自定义或个人标签
        return allowedSet.has(tag.text); // 仅保留工作流文档允许的预设词
      });
      setGrowthTags(growthTagsOnly);
    } catch (error) {
      console.error('加载成长标签失败:', error);
    }
  }, []);

  // 初始化
  useEffect(() => {
    Promise.all([loadClasses(), loadGrowthTags()]);
  }, [loadClasses, loadGrowthTags]);

  useEffect(() => {
    if (classes.length > 0) {
      loadStudents(selectedClassId, debouncedSearchKeyword);
    }
  }, [selectedClassId, debouncedSearchKeyword, loadStudents, classes.length]);

  // ================================
  // 事件处理函数
  // ================================
  const handleClassFilter = useCallback((classId: string) => {
    setSelectedClassId(classId);
    setSelectedRowKeys([]);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearchKeyword(value);
    setSelectedRowKeys([]);
  }, []);

  const handleCreateClass = async (name: string) => {
    setCreateClassLoading(true);
    try {
      const newClass = await studentLogApi.createClass({ name });
      setClasses(prev => [...prev, newClass]);
      setCreateClassModalOpen(false);
      antMessage.success('班级创建成功');
    } catch (error) {
      console.error('创建班级失败:', error);
      antMessage.error('创建班级失败');
    } finally {
      setCreateClassLoading(false);
    }
  };

  const handleEditClass = async (classId: number, newName: string) => {
    setEditClassLoading(true);
    try {
      // 模拟API调用 - 实际项目中需要实现相应的API
      // await studentLogApi.updateClass(classId, { name: newName });
      setClasses(prev => prev.map(cls => 
        cls.id === classId ? { ...cls, name: newName } : cls
      ));
      setEditClassModalOpen(false);
      setEditingClass(null);
      antMessage.success('班级修改成功');
    } catch (error) {
      console.error('修改班级失败:', error);
      antMessage.error('修改班级失败');
    } finally {
      setEditClassLoading(false);
    }
  };

  const handleDeleteClass = useCallback((classInfo: Class) => {
    const studentCount = classStudentsMap[classInfo.id]?.length || 0;
    
    confirm({
      title: '确认删除班级',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>您确定要删除班级 <strong>"{classInfo.name}"</strong> 吗？</p>
          {studentCount > 0 ? (
            <p style={{ color: '#ff4d4f' }}>
              ⚠️ 该班级中还有 {studentCount} 名学生，删除后这些学生将被标记为"已完课"状态。
            </p>
          ) : (
            <p style={{ color: '#52c41a' }}>该班级中没有学生，可以安全删除。</p>
          )}
          <p style={{ fontSize: '12px', color: '#8c8c8c' }}>此操作不可恢复。</p>
        </div>
      ),
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          // 如果班级中有学生，先将他们标记为已完课
          if (studentCount > 0) {
            const studentsInClass = classStudentsMap[classInfo.id] || [];
            const newCompletedStudents = new Set(completedStudents);
            studentsInClass.forEach(student => {
              newCompletedStudents.add(student.enrollmentId);
            });
            setCompletedStudents(newCompletedStudents);
          }
          
          await studentLogApi.deleteClass(classInfo.id);
          setClasses(prev => prev.filter(cls => cls.id !== classInfo.id));
          
          // 如果当前选中的是被删除的班级，切换到全部班级
          if (selectedClassId === classInfo.id.toString()) {
            setSelectedClassId('all');
          }
          
          antMessage.success('班级删除成功' + (studentCount > 0 ? `，${studentCount} 名学生已标记为已完课` : ''));
        } catch (error) {
          console.error('删除班级失败:', error);
          antMessage.error('删除班级失败');
        }
      }
    });
  }, [classStudentsMap, completedStudents, selectedClassId, antMessage]);

  const handleAddStudents = async (studentIds: number[]) => {
    if (selectedClassId === 'all' || selectedClassId === 'completed') {
      antMessage.warning('请先选择一个具体班级');
      return;
    }
    
    setAddStudentsLoading(true);
    try {
      const classIdNumber = parseInt(selectedClassId);
      await studentLogApi.enrollStudentsToClass(classIdNumber, { studentIds });
      await loadStudents(selectedClassId, debouncedSearchKeyword);
      setAddStudentsModalOpen(false);
      antMessage.success(`成功添加 ${studentIds.length} 名学生`);
    } catch (error) {
      console.error('添加学生失败:', error);
      antMessage.error('添加学生失败');
    } finally {
      setAddStudentsLoading(false);
    }
  };

  const handleAttendance = async (student: ClassStudent, status: string) => {
    if (completedStudents.has(student.enrollmentId)) {
      antMessage.warning('已完课学生无法记录考勤');
      return;
    }

    const enrollmentId = student.enrollmentId;
    setAttendanceLoading(prev => ({ ...prev, [enrollmentId]: status }));
    
    try {
      const currentTimeSlot = new Date().getHours() < 12 ? 'AM' : 'PM';
      await studentLogApi.recordAttendance({
        enrollmentId,
        status: status as any,
        timeSlot: currentTimeSlot as any
      });
      
      antMessage.success(`考勤记录成功`);
      loadStudents(selectedClassId, debouncedSearchKeyword);
    } catch (error) {
      console.error('记录考勤失败:', error);
      antMessage.error('记录考勤失败');
    } finally {
      setAttendanceLoading(prev => ({ ...prev, [enrollmentId]: null }));
    }
  };

  const handleGrowthRecord = async (student: ClassStudent, tagId: number) => {
    if (completedStudents.has(student.enrollmentId)) {
      antMessage.warning('已完课学生无法记录成长表现');
      return;
    }

    try {
      await studentLogApi.recordGrowthLog({
        enrollmentId: student.enrollmentId,
        tagId
      });
      
      const tag = growthTags.find(t => t.id === tagId);
      antMessage.success(`添加"${tag?.text}"成功`);
      loadStudents(selectedClassId, debouncedSearchKeyword);
    } catch (error) {
      console.error('添加成长记录失败:', error);
      antMessage.error('添加成长记录失败');
    }
  };

  const handleOpenGrowthTagSelector = (student: ClassStudent) => {
    if (completedStudents.has(student.enrollmentId)) {
      antMessage.warning('已完课学生无法记录成长表现');
      return;
    }
    setSelectedStudent(student);
    setGrowthTagSelectorOpen(true);
  };

  const handleMarkCompleted = useCallback((enrollmentId: number) => {
    confirm({
      title: '确认标记为已完课',
      icon: <BookFilled />,
      content: '确定要将该学生标记为已完课吗？已完课的学生将从班级中移除，无法继续记录考勤和成长表现。',
      okText: '确认标记',
      okType: 'default',
      cancelText: '取消',
      onOk: () => {
        setCompletedStudents(prev => {
          const newSet = new Set(prev);
          newSet.add(enrollmentId);
          return newSet;
        });
        antMessage.success('学生已标记为已完课');
        loadStudents(selectedClassId, debouncedSearchKeyword);
      }
    });
  }, [selectedClassId, debouncedSearchKeyword, antMessage]);

  const handleReassignToClass = useCallback((student: ClassStudent) => {
    setReassigningStudent(student);
    setReassignStudentModalOpen(true);
  }, []);

  const handleReassignStudent = async (studentId: number, classId: number) => {
    setReassignStudentLoading(true);
    try {
      // 从已完课状态中移除
      setCompletedStudents(prev => {
        const newSet = new Set(prev);
        newSet.delete(studentId);
        return newSet;
      });

      // 将学生添加到新班级
      await studentLogApi.enrollStudentsToClass(classId, { studentIds: [studentId] });
      
      setReassignStudentModalOpen(false);
      setReassigningStudent(null);
      antMessage.success('学生重新分配成功');
      loadStudents(selectedClassId, debouncedSearchKeyword);
    } catch (error) {
      console.error('重新分配学生失败:', error);
      antMessage.error('重新分配学生失败');
    } finally {
      setReassignStudentLoading(false);
    }
  };

  const handleBatchDelete = useCallback(() => {
    if (selectedRowKeys.length === 0) {
      antMessage.warning('请先选择要移除的学生');
      return;
    }

    const isCompletedView = selectedClassId === 'completed';
    const actionText = isCompletedView ? '删除' : '移除';
    const contentText = isCompletedView 
      ? '您确定要永久删除选中的已完课学生记录吗？此操作不可恢复。'
      : `您确定要从班级中移除选中的 ${selectedRowKeys.length} 名学生吗？移除后学生将被标记为"已完课"状态。`;

    confirm({
      title: `确认${actionText}学生`,
      icon: <ExclamationCircleOutlined />,
      content: contentText,
      okText: `确认${actionText}`,
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          if (isCompletedView) {
            // 从已完课学生中删除
            setCompletedStudents(prev => {
              const newSet = new Set(prev);
              selectedRowKeys.forEach(key => newSet.delete(key as number));
              return newSet;
            });
            antMessage.success('已完课学生删除成功');
          } else {
            // 标记为已完课
            setCompletedStudents(prev => {
              const newSet = new Set(prev);
              selectedRowKeys.forEach(key => newSet.add(key as number));
              return newSet;
            });
            antMessage.success('学生已标记为已完课');
          }
          
          setSelectedRowKeys([]);
          loadStudents(selectedClassId, debouncedSearchKeyword);
        } catch (error) {
          console.error(`${actionText}学生失败:`, error);
          antMessage.error(`${actionText}学生失败`);
        }
      }
    });
  }, [selectedRowKeys, selectedClassId, debouncedSearchKeyword, antMessage]);

  const handleExport = useCallback(async () => {
    try {
      const blob = await studentLogApi.exportGrowthLogs();
      const filename = studentLogApi.generateTimestampedFilename('学生成长记录', 'csv');
      studentLogApi.downloadFile(blob, filename);
      antMessage.success('数据导出成功');
    } catch (error) {
      console.error('导出数据失败:', error);
      antMessage.error('导出失败');
    }
  }, [antMessage]);

  const getClassStudentCount = useCallback((classId: number) => {
    const allStudents = classStudentsMap[classId] || [];
    // 只计算未完课的学生
    return allStudents.filter(s => !completedStudents.has(s.enrollmentId)).length;
  }, [classStudentsMap, completedStudents]);

  // 左侧筛选菜单
  const filterMenuItems: MenuProps['items'] = useMemo(() => [
    {
      key: 'all',
      label: (
        <Space>
          <span>全部在班学生</span>
          <Text type="secondary">({students.filter(s => !completedStudents.has(s.enrollmentId)).length})</Text>
        </Space>
      )
    },
    {
      key: 'completed',
      label: (
        <Space>
          <span>已完课学生</span>
          <Text type="secondary">({stats.completedCount})</Text>
        </Space>
      )
    },
    { type: 'divider' },
    ...classes.map(cls => ({
      key: cls.id.toString(),
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Space>
            <span>{cls.name}</span>
            <Text type="secondary">
              ({getClassStudentCount(cls.id)})
            </Text>
          </Space>
          <Space size={4}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined style={{ fontSize: '12px' }} />}
              onClick={(e) => {
                e.stopPropagation();
                setEditingClass(cls);
                setEditClassModalOpen(true);
              }}
              style={{ 
                padding: '2px 4px',
                height: '20px',
                width: '20px',
                opacity: 0.6
              }}
            />
            <Popconfirm
              title="删除班级"
              description={`确定删除班级"${cls.name}"吗？`}
              onConfirm={(e) => {
                e?.stopPropagation();
                handleDeleteClass(cls);
              }}
              onCancel={(e) => e?.stopPropagation()}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined style={{ fontSize: '12px' }} />}
                onClick={(e) => e.stopPropagation()}
                style={{ 
                  padding: '2px 4px',
                  height: '20px',
                  width: '20px',
                  opacity: 0.6
                }}
              />
            </Popconfirm>
          </Space>
        </div>
      )
    }))
  ], [classes, stats.completedCount, students, completedStudents, getClassStudentCount, handleDeleteClass]);

  // 分离在班学生和已完课学生
  const activeStudentsList = students.filter(s => !completedStudents.has(s.enrollmentId));
  const completedStudentsList = students.filter(s => completedStudents.has(s.enrollmentId));

  return (
    <div style={{ padding: '0' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题 */}
        <div>
          <Title level={2} style={{ margin: 0, marginBottom: '8px' }}>
            学生成长日志
          </Title>
          <Text type="secondary">
            管理班级学生、记录考勤状态和成长表现
          </Text>
        </div>

        {/* 搜索和操作栏 */}
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} lg={12}>
            <Search
              placeholder="搜索学生姓名、学校、年级等"
              allowClear
              size="large"
              value={searchKeyword}
              onChange={(e) => handleSearch(e.target.value)}
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} lg={12}>
            <div style={{ 
              display: 'flex', 
              justifyContent: !isDesktop ? 'center' : 'flex-end',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '16px',
              alignItems: isMobile ? 'stretch' : 'center'
            }}>
              <Button 
                type="primary"
                icon={<PlusOutlined />}
                size={isMobile ? 'large' : 'large'}
                onClick={() => setCreateClassModalOpen(true)}
                style={{ 
                  borderRadius: '8px',
                  fontWeight: 600,
                  height: isMobile ? '48px' : '48px',
                  paddingLeft: '24px',
                  paddingRight: '24px',
                  boxShadow: '0 2px 8px rgba(24, 144, 255, 0.3)',
                  order: isMobile ? 1 : 0
                }}
              >
                创建班级
              </Button>
              
              <Space size="middle" style={{ 
                width: isMobile ? '100%' : 'auto',
                justifyContent: isMobile ? 'space-between' : 'flex-end'
              }}>
                <Button 
                  icon={<DownloadOutlined />}
                  onClick={handleExport}
                  size={isMobile ? 'middle' : 'middle'}
                  style={{ 
                    borderRadius: '6px',
                    flex: isMobile ? 1 : 'none'
                  }}
                >
                  {isMobile ? '导出' : '导出数据'}
                </Button>
              </Space>
            </div>
          </Col>
        </Row>

        {/* 主内容区 */}
        <Row gutter={[24, 24]} style={{ minHeight: '500px' }}>
          {/* 左侧筛选导航区 - 包含统计数据 */}
          <Col xs={24} md={8} lg={6}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* 统计数据卡片 */}
              <Card title={
                <Space>
                  <BarChartOutlined />
                  <span>数据概览</span>
                </Space>
              }>
                <Row gutter={[0, 16]}>
                  <Col span={24}>
                    <Statistic
                      title="班级总数"
                      value={stats.totalClasses}
                      prefix={<TeamOutlined />}
                      valueStyle={{ color: '#1890ff', fontSize: '20px' }}
                    />
                  </Col>
                  <Col span={24}>
                    <Statistic
                      title="在班学生"
                      value={stats.totalStudents - stats.completedCount}
                      prefix={<UserOutlined />}
                      valueStyle={{ color: '#52c41a', fontSize: '20px' }}
                    />
                  </Col>
                  <Col span={24}>
                    <Statistic
                      title="今日出席"
                      value={stats.activeStudents}
                      prefix={<CheckCircleOutlined />}
                      valueStyle={{ color: '#1890ff', fontSize: '20px' }}
                    />
                  </Col>
                  <Col span={24}>
                    <Statistic
                      title="已完课学生"
                      value={stats.completedCount}
                      prefix={<BookFilled />}
                      valueStyle={{ color: '#ff7875', fontSize: '20px' }}
                    />
                  </Col>
                </Row>
              </Card>
              
              {/* 班级筛选 */}
              <Card title="班级筛选" style={{ flex: 1 }}>
                <Menu
                  mode="vertical"
                  selectedKeys={[selectedClassId]}
                  items={filterMenuItems}
                  onClick={({ key }) => handleClassFilter(key)}
                  style={{ 
                    border: 'none', 
                    fontSize: isMobile ? '14px' : '16px'
                  }}
                />
              </Card>

              {/* 数据追踪报告 */}
              <Card 
                title={
                  <Space>
                    <TrophyOutlined style={{ color: '#faad14' }} />
                    <span>数据追踪报告</span>
                    <Button type="text" icon={<EditOutlined />} onClick={() => setTagManagerOpen(true)} />
                  </Space>
                }
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Button
                    type="primary"
                    icon={<BarChartOutlined />}
                    block
                    size="large"
                    onClick={() => navigate('/student-log/analytics')}
                    style={{
                      height: '48px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                      border: 'none',
                      fontWeight: 600,
                      boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
                    }}
                  >
                    查看学生成长分析
                  </Button>
                  
                  <div style={{ 
                    padding: '12px', 
                    background: theme === 'dark' ? '#1f1f1f' : '#f8f9fa', 
                    borderRadius: '6px',
                    border: theme === 'dark' ? '1px solid #424242' : '1px solid #e9ecef'
                  }}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Text style={{ fontSize: '12px', color: '#666', fontWeight: 500 }}>
                        ✨ 功能亮点
                      </Text>
                      <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>
                        • 学生成长趋势分析
                      </Text>
                      <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>
                        • 个人成长报告查看
                      </Text>
                      <Text style={{ fontSize: '11px', color: '#8c8c8c' }}>
                        • 成长数据可视化展示
                      </Text>
                    </Space>
                  </div>
                </Space>
              </Card>
            </Space>
          </Col>

          {/* 右侧学生列表区 */}
          <Col xs={24} md={16} lg={18}>
            <Card 
              title={
                <Space>
                  <span style={{ fontSize: isMobile ? '14px' : '16px' }}>
                    {selectedClassId === 'all' ? '全部在班学生' : 
                     selectedClassId === 'completed' ? '已完课学生' :
                     classes.find(c => c.id.toString() === selectedClassId)?.name || '学生列表'}
                  </span>
                  {debouncedSearchKeyword && (
                    <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px' }}>
                      (搜索: "{debouncedSearchKeyword}")
                    </Text>
                  )}
                </Space>
              }
              extra={
                selectedRowKeys.length > 0 && (
                  <Space>
                    <Text style={{ fontSize: isMobile ? '12px' : '14px' }}>
                      已选择 {selectedRowKeys.length} 名
                    </Text>
                    <Button 
                      danger 
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={handleBatchDelete}
                    >
                      {isMobile ? 
                        (selectedClassId === 'completed' ? '删除' : '标记完课') : 
                        (selectedClassId === 'completed' ? '批量删除' : '批量标记完课')
                      }
                    </Button>
                  </Space>
                )
              }
              style={{ height: '100%' }}
            >
              {loading ? (
                <Spin size="large" style={{ display: 'block', textAlign: 'center', margin: '40px 0' }} />
              ) : students.length === 0 ? (
                <Empty
                  description={
                    selectedClassId === 'all' ? '暂无在班学生' : 
                    selectedClassId === 'completed' ? '暂无已完课学生' :
                    '该班级暂无学生'
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ margin: '40px 0' }}
                />
              ) : (
                <>
                  {/* 学生列表 */}
                  <List
                    grid={{
                      gutter: 16,
                      xs: 1,
                      sm: 1,
                      md: 2,
                      lg: 2,
                      xl: 3,
                      xxl: 4
                    }}
                    dataSource={paginatedStudents}
                    renderItem={(student) => (
                      <List.Item>
                        <StudentCard
                          student={student}
                          selectedRowKeys={selectedRowKeys}
                          attendanceLoading={attendanceLoading}
                          isCompleted={completedStudents.has(student.enrollmentId)}
                          onSelect={(enrollmentId, checked) => {
                            const newSelectedRowKeys = checked
                              ? [...selectedRowKeys, enrollmentId]
                              : selectedRowKeys.filter(key => key !== enrollmentId);
                            setSelectedRowKeys(newSelectedRowKeys);
                          }}
                          onAttendance={handleAttendance}
                          onGrowthRecord={handleOpenGrowthTagSelector}
                          onMarkCompleted={handleMarkCompleted}
                          onReassignToClass={handleReassignToClass}
                          onViewDetail={(student) => navigate(`/student-log/report/${student.id}`)}
                        />
                      </List.Item>
                    )}
                  />

                  {/* 分页组件 */}
                  {students.length > pagination.pageSize && (
                    <div style={{ marginTop: 24, textAlign: 'center' }}>
                      <Pagination
                        current={pagination.current}
                        total={pagination.total}
                        pageSize={pagination.pageSize}
                        onChange={handlePaginationChange}
                        showSizeChanger
                        showQuickJumper
                        showTotal={(total, range) => 
                          `第 ${range[0]}-${range[1]} 条，共 ${total} 名学生`
                        }
                        pageSizeOptions={['8', '16', '24', '32']}
                        style={{ padding: '16px 0' }}
                      />
                    </div>
                  )}
                </>
              )}

              {/* 统计信息 */}
              {students.length > 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  marginTop: '16px', 
                  padding: '8px 0',
                  color: 'var(--ant-color-text-secondary)',
                  fontSize: '12px',
                  borderTop: '1px solid var(--ant-color-border-secondary)'
                }}>
                  总计 {students.length} 名学生 
                  {students.length > pagination.pageSize && (
                    <span>，当前显示第 {(pagination.current - 1) * pagination.pageSize + 1}-{Math.min(pagination.current * pagination.pageSize, students.length)} 条</span>
                  )}
                  {selectedClassId === 'all' && ` (在班: ${activeStudentsList.length}, 已完课: ${completedStudentsList.length})`}
                  {stats.totalStudents && ` / 系统总计 ${stats.totalStudents} 名学生`}
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* 悬浮操作按钮 - 添加学生和批量操作 */}
        <FloatButton.Group
          shape="circle"
          style={{ right: 24, bottom: 24 }}
        >
          {selectedClassId !== 'all' && selectedClassId !== 'completed' && (
            <FloatButton
              icon={<UserAddOutlined />}
              type="primary"
              tooltip="添加学生"
              onClick={() => setAddStudentsModalOpen(true)}
            />
          )}
          {selectedRowKeys.length > 0 && (
            <FloatButton
              icon={<DeleteOutlined />}
              tooltip={selectedClassId === 'completed' ? '删除已完课学生' : '标记为已完课'}
              onClick={handleBatchDelete}
              style={{
                backgroundColor: '#ff4d4f',
                borderColor: '#ff4d4f'
              }}
            />
          )}
        </FloatButton.Group>

        {/* 弹窗组件 */}
        <CreateClassModal
          open={createClassModalOpen}
          loading={createClassLoading}
          onOk={handleCreateClass}
          onCancel={() => setCreateClassModalOpen(false)}
        />

        <EditClassModal
          open={editClassModalOpen}
          loading={editClassLoading}
          classInfo={editingClass}
          onOk={handleEditClass}
          onCancel={() => {
            setEditClassModalOpen(false);
            setEditingClass(null);
          }}
        />

        <AddStudentsModal
          open={addStudentsModalOpen}
          loading={addStudentsLoading}
          classId={selectedClassId !== 'all' && selectedClassId !== 'completed' ? parseInt(selectedClassId) : undefined}
          onOk={handleAddStudents}
          onCancel={() => setAddStudentsModalOpen(false)}
        />

        <ReassignStudentModal
          open={reassignStudentModalOpen}
          loading={reassignStudentLoading}
          student={reassigningStudent}
          classes={classes}
          onOk={handleReassignStudent}
          onCancel={() => {
            setReassignStudentModalOpen(false);
            setReassigningStudent(null);
          }}
        />

        {/* 成长标签选择弹窗 */}
        {selectedStudent && (
          <GrowthTagSelector
            open={growthTagSelectorOpen}
            student={selectedStudent as any}
            growthTags={growthTags}
            onSelect={handleGrowthRecord}
            onCancel={() => setGrowthTagSelectorOpen(false)}
          />
        )}

        <GrowthTagManager
          open={tagManagerOpen}
          tags={growthTags}
          onClose={() => setTagManagerOpen(false)}
          onTagsUpdate={(tags)=>setGrowthTags(tags)}
        />
      </Space>
    </div>
  );
};

export default StudentLogPage; 