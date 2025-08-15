import AppButton from '@/components/AppButton';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Typography, Row, Col, Input, Menu, Space, Statistic, Modal, Tag, App, List, Avatar, Dropdown, Badge, FloatButton, Empty, Spin, Divider, Grid, Checkbox, Popconfirm, Pagination, Select, Card } from 'antd';
import AppSearchInput from '@/components/common/AppSearchInput';
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
  DownOutlined,
  UpOutlined,
  BookFilled
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeStore } from '@/stores/themeStore';
import { useDebounce } from '@/hooks/useDebounce';
import { getGradeLabel, getSourceChannelLabel } from '@/utils/enumMappings';

import type { ClassStudent, Class, Customer, Exam, ExamType, Subject } from '@/types/api';
import * as studentLogApi from '@/api/studentLogApi';
import * as examApi from '@/api/examApi';
import { exportGrowthLogsCsv, downloadFile as downloadBlob, generateTimestampedFilename } from '@/api/export';
import { CreateExamModal, ExamHistoryModal } from './components/ExamManagementModals';
import StudentCard from './components/StudentCard';
import EnhancedGrowthTagSelector from './components/EnhancedGrowthTagSelector';
import EnhancedGrowthTagManager from './components/EnhancedGrowthTagManager';
import { useGrowthData } from '@/hooks/useGrowthData';
import type { GrowthTag } from '@/api/growthApi';
import { marginStyles } from '@/utils/styleUtils';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const { useApp } = App;
const { useBreakpoint } = Grid;
const { confirm } = Modal;

// 学生状态标签
const STUDENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  'ENROLLED': { label: '已报名', color: 'var(--ant-color-success)' },
  'TRIAL_CLASS': { label: '试听中', color: 'var(--ant-color-warning)' },
  'INTERESTED': { label: '有意向', color: 'var(--ant-color-primary)' },
  'POTENTIAL': { label: '潜在客户', color: 'var(--ant-color-text-secondary)' }
};

// ================================
// 原有的GrowthTagSelector已被EnhancedGrowthTagSelector替换
// ================================

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
          <PlusOutlined style={{ color: 'var(--ant-color-primary)' }} />
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
        body: { padding: 'var(--space-6)' }
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
          <EditOutlined style={{ color: 'var(--ant-color-primary)' }} />
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
        body: { padding: 'var(--space-6)' }
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
            <UserAddOutlined style={{ color: 'var(--ant-color-primary)', fontSize: '16px' }} />
            <span style={{ fontSize: '16px', fontWeight: 600 }}>添加学生到班级</span>
          </Space>
          <Badge 
            count={selectedStudentIds.length} 
            style={{ backgroundColor: 'var(--ant-color-success)' }}
            showZero={false}
          >
            <Tag color="blue" style={{ margin: 0, padding: 'var(--space-1) var(--space-2)' }}>
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
          padding: 'var(--space-6)',
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
                      padding: 'var(--space-4)',
                      margin: '0 0 8px 0',
                      border: `2px solid ${isSelected ? 'var(--ant-color-primary)' : 'transparent'}`,
                      borderRadius: '8px',
                      backgroundColor: isSelected 
                        ? (theme === 'dark' ? '#111b26' : '#e6f7ff')
                        : (theme === 'dark' ? 'var(--ant-color-bg-container)' : 'var(--ant-color-bg-container)'),
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
                            backgroundColor: student.gender === 'MALE' ? 'var(--ant-color-primary)' : 
                                           student.gender === 'FEMALE' ? '#eb2f96' : 'var(--ant-color-info)',
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
                              color: isSelected ? 'var(--ant-color-primary)' : undefined
                            }}
                          >
                            {student.name}
                          </Text>
                          <Tag 
                            color={STUDENT_STATUS_LABELS[student.status]?.color || 'var(--ant-color-text-secondary)'}
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
                              <BookOutlined style={{ marginInlineEnd: '4px' }} />
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
          <UserSwitchOutlined style={{ color: 'var(--ant-color-primary)' }} />
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
        body: { padding: 'var(--space-6)' }
      }}
    >
      {student && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-3)',
            padding: 'var(--space-4)',
            backgroundColor: theme === 'dark' ? 'var(--ant-color-bg-container)' : '#f5f5f5',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-4)'
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
                {student.name}
              </Text>
              <div style={{ fontSize: '12px', color: 'var(--ant-color-text-secondary)' }}>
                将从"已完课学生"重新分配到班级
              </div>
            </div>
          </div>

            <div style={{ marginBottom: 'var(--space-2)' }}>
            <Text strong>选择目标班级：</Text>
          </div>
          
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 'var(--space-3)'
          }}>
            {classes.map(cls => (
              <Card
                key={cls.id}
                size="small"
                style={{
                  cursor: 'pointer',
                  borderColor: selectedClassId === cls.id ? 'var(--ant-color-primary)' : undefined,
                  backgroundColor: selectedClassId === cls.id 
                    ? (theme === 'dark' ? '#111b26' : '#e6f7ff')
                    : undefined
                }}
                styles={{ body: { padding: 'var(--space-3)' } }}
                onClick={() => setSelectedClassId(cls.id)}
              >
                <div style={{ textAlign: 'center' }}>
                  <TeamOutlined style={{ 
                    fontSize: '20px', 
                    color: selectedClassId === cls.id ? 'var(--ant-color-primary)' : 'var(--ant-color-text-secondary)',
                    marginBottom: 'var(--space-2)'
                  }} />
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: selectedClassId === cls.id ? 600 : 400,
                    color: selectedClassId === cls.id ? 'var(--ant-color-primary)' : undefined
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

// StudentCard组件已移动到独立文件 ./components/StudentCard.tsx

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
  
  // 分页状态 - 响应式调整每页数量
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: isMobile ? 8 : 12, // 移动端8个，桌面端12个
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
  // 手机端班级筛选折叠
  const [filterCollapsed, setFilterCollapsed] = useState(true);
  // 手机端数据概览折叠
  const [overviewCollapsed, setOverviewCollapsed] = useState(true);

  useEffect(() => {
    // 移动端默认折叠，桌面端展开
    setOverviewCollapsed(isMobile);
    setFilterCollapsed(true);
  }, [isMobile]);
  const [createClassLoading, setCreateClassLoading] = useState(false);
  const [editClassLoading, setEditClassLoading] = useState(false);
  const [addStudentsLoading, setAddStudentsLoading] = useState(false);
  const [reassignStudentLoading, setReassignStudentLoading] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState<{ [key: number]: string | null }>({});
  // Growth数据管理 - 使用新的Hook替换原有状态
  const {
    growthTags,
    loading: growthLoading,
    recordGrowthLog: recordGrowthLogApi,
    loadGrowthTags
  } = useGrowthData();
  
  // 成长标签选择弹窗状态
  const [growthTagSelectorOpen, setGrowthTagSelectorOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<ClassStudent | null>(null);
  
  // 考试管理相关状态
  const [examModalVisible, setExamModalVisible] = useState(false);
  const [examHistoryVisible, setExamHistoryVisible] = useState(false);
  const [examCreateLoading, setExamCreateLoading] = useState(false);
  const [examMetadata, setExamMetadata] = useState<{
    subjects: Array<{ value: string; label: string }>;
    examTypes: Array<{ value: string; label: string }>;
  } | null>(null);
  const [classExams, setClassExams] = useState<Exam[]>([]);

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
    // 去除随机“今日成长记录数”，等待真实统计API接入
    const todayGrowthLogs = 0;

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

  // 原有的loadGrowthTags函数已被Hook替换，删除重复定义

  // 初始化 - Growth标签通过Hook自动加载
  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

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
            <p style={{ color: 'var(--ant-color-error)' }}>
              ⚠️ 该班级中还有 {studentCount} 名学生，删除后这些学生将被标记为"已完课"状态。
            </p>
          ) : (
            <p style={{ color: 'var(--ant-color-success)' }}>该班级中没有学生，可以安全删除。</p>
          )}
          <p style={{ fontSize: '12px', color: 'var(--ant-color-text-secondary)' }}>此操作不可恢复。</p>
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

  // 增强版Growth记录处理函数 - 支持权重和上下文
  const handleEnhancedGrowthRecord = async (
    student: ClassStudent, 
    tagId: number, 
    weight?: number, 
    context?: string
  ) => {
    if (completedStudents.has(student.enrollmentId)) {
      antMessage.warning('已完课学生无法记录成长表现');
      return;
    }

    try {
      await recordGrowthLogApi({
        enrollmentId: student.enrollmentId,
        tagId,
        weight,
        context
      });
      
      // 刷新学生列表以显示最新数据
      loadStudents(selectedClassId, debouncedSearchKeyword);
    } catch (error) {
      console.error('记录成长日志失败:', error);
      // 错误信息通过Hook已经显示，这里不重复显示
    }
  };

  // 保留原有函数以兼容其他调用（如果有的话）
  const handleGrowthRecord = async (student: ClassStudent, tagId: number) => {
    return handleEnhancedGrowthRecord(student, tagId);
  };

  const handleOpenGrowthTagSelector = (student: ClassStudent) => {
    if (completedStudents.has(student.enrollmentId)) {
      antMessage.warning('已完课学生无法记录成长表现');
      return;
    }
    setSelectedStudent(student);
    setGrowthTagSelectorOpen(true);
  };

  // ================================
  // 考试管理处理函数
  // ================================
  
  // 加载考试元数据
  const loadExamMetadata = useCallback(async () => {
    try {
      const metadata = await examApi.getExamMetadata();
      setExamMetadata(metadata);
    } catch (error) {
      console.error('加载考试元数据失败:', error);
      antMessage.error('加载考试元数据失败');
    }
  }, [antMessage]);

  // 加载班级考试列表
  const loadClassExams = useCallback(async (classId: number, filters?: any) => {
    try {
      const exams = await examApi.getClassExams(classId, filters);
      setClassExams(exams);
    } catch (error) {
      console.error('加载班级考试失败:', error);
      antMessage.error('加载班级考试失败');
    }
  }, [antMessage]);

  // 创建考试
  const handleCreateExam = useCallback(async (values: any) => {
    if (!selectedClassId || selectedClassId === 'all' || selectedClassId === 'completed') {
      antMessage.error('请先选择具体班级');
      return;
    }

    // 验证所选班级是否存在
    const classIdNum = parseInt(selectedClassId);
    const selectedClass = classes.find(c => c.id === classIdNum);
    if (!selectedClass) {
      antMessage.error('所选班级无效，请重新选择班级');
      return;
    }

    setExamCreateLoading(true);
    try {
      const result = await examApi.createExam(values);
      antMessage.success(`考试创建成功！为 ${result.studentCount} 名学生创建了 ${result.subjectCount} 个科目的成绩记录`);
      setExamModalVisible(false);
      
      // 重新加载班级考试列表
      await loadClassExams(parseInt(selectedClassId));
      
      // 自动跳转到考试详情页面
      navigate(`/student-log/exam/${result.exam.id}`);
    } catch (error: any) {
      console.error('创建考试失败:', error);
      antMessage.error(error.message || '创建考试失败');
    } finally {
      setExamCreateLoading(false);
    }
  }, [selectedClassId, antMessage, loadClassExams, classes]);

  // 打开往期考试弹窗
  const handleOpenExamHistory = useCallback(async () => {
    if (!selectedClassId || selectedClassId === 'all' || selectedClassId === 'completed') {
      antMessage.error('请先选择具体班级');
      return;
    }

    setExamHistoryVisible(true);
    await loadClassExams(parseInt(selectedClassId));
  }, [selectedClassId, antMessage, loadClassExams]);

  // 处理考试搜索  
  const handleExamSearch = useCallback(async (filters: {
    name?: string;
    examType?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    if (!selectedClassId || selectedClassId === 'all' || selectedClassId === 'completed') {
      return;
    }

    try {
      // 转换examType为正确的枚举类型
      const examFilters: any = { ...filters };
      if (filters.examType) {
        examFilters.examType = filters.examType as any;
      }
      await loadClassExams(parseInt(selectedClassId), examFilters);
    } catch (error) {
      console.error('搜索考试失败:', error);
      antMessage.error('搜索考试失败');
    }
  }, [selectedClassId, loadClassExams, antMessage]);

  // 查看考试详情
  const handleExamClick = useCallback((exam: Exam) => {
    navigate(`/student-log/exam/${exam.id}`, {
      state: { from: '/student-log' }
    });
  }, [navigate]);

  // 删除考试
  const handleDeleteExam = useCallback(async (examId: number) => {
    confirm({
      title: '确认删除考试',
      content: '删除后将无法恢复，但已录入的成绩数据会保留。确定要删除这场考试吗？',
      okText: '确定删除',
      cancelText: '取消',
      onOk: async () => {
        try {
          await examApi.deleteExam(examId);
          antMessage.success('考试删除成功');
          
          // 重新加载班级考试列表
          if (selectedClassId && selectedClassId !== 'all' && selectedClassId !== 'completed') {
            await loadClassExams(parseInt(selectedClassId));
          }
        } catch (error: any) {
          console.error('删除考试失败:', error);
          antMessage.error(error.message || '删除考试失败');
        }
      }
    });
  }, [selectedClassId, antMessage, loadClassExams]);

  // 初始化考试元数据
  useEffect(() => {
    loadExamMetadata();
  }, [loadExamMetadata]);

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
      const blob = await exportGrowthLogsCsv();
      downloadBlob(blob, generateTimestampedFilename('学生成长记录'));
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
            <AppButton
              hierarchy="tertiary"
              size="sm"
              icon={<EditOutlined style={{ fontSize: '12px' }} />}
              onClick={(e) => {
                e.stopPropagation();
                setEditingClass(cls);
                setEditClassModalOpen(true);
              }}
              style={{ 
                padding: 'var(--space-0) var(--space-1)',
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
              <AppButton
                hierarchy="tertiary"
                size="sm"
                danger
                icon={<DeleteOutlined style={{ fontSize: '12px' }} />}
                onClick={(e) => e.stopPropagation()}
                style={{ 
                  padding: 'var(--space-0) var(--space-1)',
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
    <div data-page-container>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题 */}
        <div>
          <Title level={2} style={{ margin: '0 0 8px 0' }}>
            学生成长日志
          </Title>
        </div>

        {/* 搜索和操作栏 */}
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} lg={12}>
            <AppSearchInput
              placeholder="搜索学生姓名、学校、年级等"
              value={searchKeyword}
              onChange={(v) => handleSearch(v)}
              onSearch={handleSearch}
            />
          </Col>
          <Col xs={24} lg={12}>
            {/* 创建班级主按钮已移除，移动端改到“班级筛选”卡片题头的图标按钮 */}
          </Col>
        </Row>

        {/* 主内容区 */}
        <Row gutter={isMobile ? [16, 16] : [24, 24]} style={{ minHeight: '500px' }}>
          {/* 左侧筛选导航区 - 包含统计数据（移动端置底） */}
          <Col xs={24} md={8} lg={6} style={{ order: isMobile ? 2 : 0 }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* 统计数据卡片 */}
              <Card title={
                <span style={{ fontSize: isMobile ? 'var(--font-size-sm)' : 'var(--font-size-lg)' }}>数据概览</span>
              } extra={
                <Space>
                  <AppButton hierarchy="tertiary" size="sm" icon={<DownloadOutlined />} onClick={handleExport}>
                    导出
                  </AppButton>
                  {isMobile && (
                    <AppButton hierarchy="tertiary" size="sm" onClick={() => setOverviewCollapsed(!overviewCollapsed)}>
                      {overviewCollapsed ? '展开' : '收起'} {overviewCollapsed ? <DownOutlined /> : <UpOutlined />}
                    </AppButton>
                  )}
                </Space>
              }>
                {!isMobile || !overviewCollapsed ? (
                <Row gutter={[16, isMobile ? 12 : 16]}>
                  <Col xs={12} sm={12} md={24}>
                    <Statistic
                      title="班级总数"
                      value={stats.totalClasses}
                      prefix={<TeamOutlined />}
                      valueStyle={{ color: 'var(--ant-color-primary)', fontSize: isMobile ? '18px' : '20px' }}
                    />
                  </Col>
                  <Col xs={12} sm={12} md={24}>
                    <Statistic
                      title="在班学生"
                      value={stats.totalStudents - stats.completedCount}
                      prefix={<UserOutlined />}
                      valueStyle={{ color: 'var(--ant-color-success)', fontSize: isMobile ? '18px' : '20px' }}
                    />
                  </Col>
                  <Col xs={12} sm={12} md={24}>
                    <Statistic
                      title="今日出席"
                      value={stats.activeStudents}
                      prefix={<CheckCircleOutlined />}
                      valueStyle={{ color: 'var(--ant-color-primary)', fontSize: isMobile ? '18px' : '20px' }}
                    />
                  </Col>
                  <Col xs={12} sm={12} md={24}>
                    <Statistic
                      title="已完课学生"
                      value={stats.completedCount}
                      prefix={<BookFilled />}
                      valueStyle={{ color: 'var(--ant-color-error)', fontSize: isMobile ? '18px' : '20px' }}
                    />
                  </Col>
                </Row>
                ) : null}
              </Card>
              
              {/* 班级筛选 - 移动端默认折叠；题头弱化“新建班级”为图标按钮 */}
              <Card 
                title={
                  <span style={{ fontSize: isMobile ? 'var(--font-size-sm)' : 'var(--font-size-lg)' }}>班级筛选</span>
                }
                style={{ flex: 1 }}
                size={isMobile ? 'small' : 'default'}
                extra={
                  isMobile ? (
                    <Space align="center" size="small">
                      <Text type="secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                        {selectedClassId === 'all' ? '全部学生' : 
                          selectedClassId === 'completed' ? '已完课' :
                          classes.find(c => c.id.toString() === selectedClassId)?.name || ''}
                      </Text>
                      <AppButton hierarchy="tertiary" size="sm" icon={<PlusOutlined />} onClick={() => setCreateClassModalOpen(true)} />
                      <AppButton hierarchy="tertiary" size="sm" onClick={() => setFilterCollapsed(!filterCollapsed)}>
                        {filterCollapsed ? '展开' : '收起'} {filterCollapsed ? <DownOutlined /> : <UpOutlined />}
                      </AppButton>
                    </Space>
                  ) : (
                    undefined
                  )
                }
              >
                {!isMobile || !filterCollapsed ? (
                  <Menu
                  mode="vertical"
                  selectedKeys={[selectedClassId]}
                  items={filterMenuItems}
                  onClick={({ key }) => handleClassFilter(key)}
                  style={{ 
                    border: 'none', 
                    fontSize: isMobile ? '13px' : '16px'
                  }}
                />
                ) : null}
                
                {/* 考试管理 - 只在选择具体班级时显示 */}
                {!isMobile && selectedClassId !== 'all' && selectedClassId !== 'completed' && (
                  <>
                    <Divider />
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <AppButton
                        hierarchy="primary"
                        icon={<BookOutlined />}
                        onClick={() => setExamModalVisible(true)}
                        block
                        size={isMobile ? 'small' : 'middle'}
                        style={{
                          backgroundColor: 'var(--ant-color-success)',
                          borderColor: 'var(--ant-color-success)'
                        }}
                      >
                        添加考试记录
                      </AppButton>
                      <AppButton
                        icon={<BarChartOutlined />}
                        onClick={handleOpenExamHistory}
                        block
                        size={isMobile ? 'small' : 'middle'}
                      >
                        查看往期考试
                      </AppButton>
                    </Space>
                  </>
                )}
              </Card>

              {/* 数据追踪报告 */}
              <Card 
                title={
                  <Space>
                    <TrophyOutlined style={{ color: 'var(--ant-color-warning)' }} />
                    <span style={{ fontSize: isMobile ? '14px' : '16px' }}>数据追踪报告</span>
                    <AppButton hierarchy="tertiary" icon={<EditOutlined />} onClick={() => setTagManagerOpen(true)} />
                  </Space>
                }
                size={isMobile ? 'small' : 'default'}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <AppButton
                    hierarchy="primary"
                    icon={<BarChartOutlined />}
                    block
                    size={isMobile ? 'middle' : 'large'}
                    onClick={() => navigate('/student-log/analytics')}
                    style={{
                      height: isMobile ? '40px' : '48px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: isMobile ? '14px' : '16px',
                      boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
                    }}
                  >
                    查看学生成长分析
                  </AppButton>
                  
                  {!isMobile && (
                    <div style={{ 
                      padding: 'var(--space-3)', 
                      background: theme === 'dark' ? 'var(--ant-color-bg-container)' : '#f8f9fa', 
                      borderRadius: '6px',
                      border: theme === 'dark' ? '1px solid #424242' : '1px solid #e9ecef'
                    }}>
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text style={{ fontSize: '12px', color: 'var(--ant-color-text-tertiary)', fontWeight: 500 }}>
                          ✨ 功能亮点
                        </Text>
                        <Text style={{ fontSize: '11px', color: 'var(--ant-color-text-secondary)' }}>
                          • 学生成长趋势分析
                        </Text>
                        <Text style={{ fontSize: '11px', color: 'var(--ant-color-text-secondary)' }}>
                          • 个人成长报告查看
                        </Text>
                        <Text style={{ fontSize: '11px', color: 'var(--ant-color-text-secondary)' }}>
                          • 成长数据可视化展示
                        </Text>
                      </Space>
                    </div>
                  )}
                </Space>
              </Card>
            </Space>
          </Col>

          {/* 右侧学生列表区（移动端置顶） */}
          <Col xs={24} md={16} lg={18} style={{ order: isMobile ? 1 : 0 }}>
            <Card 
              title={
                <Space>
                  <span style={{ fontSize: isMobile ? '14px' : '16px' }}>
                    {selectedClassId === 'all' ? '全部在班学生' : 
                     selectedClassId === 'completed' ? '已完课学生' :
                     classes.find(c => c.id.toString() === selectedClassId)?.name || '学生列表'}
                  </span>
                  {debouncedSearchKeyword && (
                    <Text type="secondary" style={{ fontSize: isMobile ? '11px' : '14px' }}>
                      (搜索: "{debouncedSearchKeyword}")
                    </Text>
                  )}
                </Space>
              }
              extra={
                selectedRowKeys.length > 0 && (
                  <Space>
                    <Text style={{ fontSize: isMobile ? '11px' : '14px' }}>
                      已选择 {selectedRowKeys.length} 名
                    </Text>
                    <AppButton 
                      danger 
                      size={isMobile ? 'small' : 'small'}
                      icon={<DeleteOutlined />}
                      onClick={handleBatchDelete}
                      style={{
                        fontSize: isMobile ? '12px' : '14px'
                      }}
                    >
                      {isMobile ? 
                        (selectedClassId === 'completed' ? '删除' : '标记完课') : 
                        (selectedClassId === 'completed' ? '批量删除' : '批量标记完课')
                      }
                    </AppButton>
                  </Space>
                )
              }
              style={{ 
                height: '100%',
                fontSize: isMobile ? '13px' : '14px'
              }}
styles={{ body: {
                padding: isMobile ? 'var(--space-4)' : 'var(--space-6)'
}}}
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
                  style={{ margin: isMobile ? '20px 0' : '40px 0' }}
                />
              ) : (
                <>
                  {/* 学生卡片网格 */}
                  <Row 
                    gutter={[
                      isMobile ? 8 : 16, 
                      isMobile ? 12 : 16
                    ]}
                    style={{ margin: 0 }}
                  >
                    {paginatedStudents.map((student) => (
                      <Col
                        key={student.enrollmentId}
                        xs={24}
                        sm={12}
                        md={12}
                        lg={8}
                        xl={6}
                        xxl={6}
                        style={{ 
                          display: 'flex',
                          marginBottom: isMobile ? 8 : 12
                        }}
                      >
                        <div style={{ width: '100%' }}>
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
                            onViewDetail={(student) => navigate(`/student-log/report/${student.publicId}`)}
                          />
                        </div>
                      </Col>
                    ))}
                  </Row>

                  {/* 分页组件 */}
                  {students.length > pagination.pageSize && (
                    <div style={{ 
                      marginTop: isMobile ? 16 : 24, 
                      textAlign: 'center',
                      padding: isMobile ? 'var(--space-2) 0' : '0'
                    }}>
                      <Pagination
                        current={pagination.current}
                        total={pagination.total}
                        pageSize={pagination.pageSize}
                        onChange={handlePaginationChange}
                        showSizeChanger={!isMobile}
                        showQuickJumper={!isMobile}
                        showTotal={(total, range) => 
                          isMobile ? 
                          `${range[0]}-${range[1]} / ${total}` :
                          `第 ${range[0]}-${range[1]} 条，共 ${total} 名学生`
                        }
                        pageSizeOptions={isMobile ? ['4', '8', '12'] : ['8', '12', '16', '24']}
                        style={{ 
                          padding: isMobile ? 'var(--space-2) 0' : 'var(--space-4) 0'
                        }}
                        size={isMobile ? 'small' : 'default'}
                        simple={isMobile}
                      />
                    </div>
                  )}
                </>
              )}

              {/* 统计信息 */}
              {students.length > 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  marginTop: isMobile ? '12px' : '16px', 
                  padding: isMobile ? 'var(--space-1) 0' : 'var(--space-2) 0',
                  color: 'var(--ant-color-text-secondary)',
                  fontSize: isMobile ? '11px' : '12px',
                  borderTop: '1px solid var(--ant-color-border-secondary)'
                }}>
                  总计 {students.length} 名学生 
                  {students.length > pagination.pageSize && !isMobile && (
                    <span>，当前显示第 {(pagination.current - 1) * pagination.pageSize + 1}-{Math.min(pagination.current * pagination.pageSize, students.length)} 条</span>
                  )}
                  {selectedClassId === 'all' && ` (在班: ${activeStudentsList.length}, 已完课: ${completedStudentsList.length})`}
                  {stats.totalStudents && !isMobile && ` / 系统总计 ${stats.totalStudents} 名学生`}
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* 悬浮操作按钮 - 添加学生和批量操作 */}
        <FloatButton.Group
          shape="circle"
          style={{ right: 24, bottom: 'var(--page-bottom-safe)' }}
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
                backgroundColor: 'var(--ant-color-error)',
                borderColor: 'var(--ant-color-error)'
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

        {/* 增强版成长标签选择弹窗 */}
        {selectedStudent && (
          <EnhancedGrowthTagSelector
            open={growthTagSelectorOpen}
            student={selectedStudent}
            growthTags={growthTags}
            onSelect={handleEnhancedGrowthRecord}
            onCancel={() => setGrowthTagSelectorOpen(false)}
          />
        )}

        {/* 增强版Growth标签管理器 */}
        <EnhancedGrowthTagManager
          open={tagManagerOpen}
          onClose={() => setTagManagerOpen(false)}
        />

        {/* 考试管理Modal组件 */}
        <CreateExamModal
          open={examModalVisible}
          loading={examCreateLoading}
          classId={selectedClassId !== 'all' && selectedClassId !== 'completed' ? parseInt(selectedClassId) : 0}
          className={
            selectedClassId !== 'all' && selectedClassId !== 'completed' 
              ? classes.find(c => c.id.toString() === selectedClassId)?.name || ''
              : ''
          }
          examMetadata={examMetadata}
          onOk={handleCreateExam}
          onCancel={() => setExamModalVisible(false)}
        />

        <ExamHistoryModal
          open={examHistoryVisible}
          classId={parseInt(selectedClassId || '0')}
          className={
            selectedClassId !== 'all' && selectedClassId !== 'completed'
              ? classes.find(c => c.id.toString() === selectedClassId)?.name || ''
              : ''
          }
          exams={classExams}
          loading={loading}
          onCancel={() => setExamHistoryVisible(false)}
          onExamClick={handleExamClick}
          onDeleteExam={handleDeleteExam}
          onSearch={handleExamSearch}
        />
      </Space>
    </div>
  );
};

export default StudentLogPage; 