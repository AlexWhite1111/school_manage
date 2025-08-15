import AppButton from '@/components/AppButton';
import React, { useState, useEffect, useCallback } from 'react';
import { List, Avatar, Input, Space, Typography, Tag, Empty, Spin, Row, Col, message, Tooltip, Badge, Select, Statistic, Progress, Pagination, Card } from 'antd';
import {
  UserOutlined,
  SearchOutlined,
  BarChartOutlined,
  DownloadOutlined,
  TeamOutlined,
  ReloadOutlined,
  EyeOutlined,
  ArrowRightOutlined,
  SmileOutlined,
  FrownOutlined,
  RocketOutlined,
  BookOutlined,
  CalendarOutlined,
  BankOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '@/stores/themeStore';
import { useResponsive } from '@/hooks/useResponsive';
import * as crmApi from '@/api/crmApi';
import { getStudentsGrowthStats, type StudentGrowthStatsSummary } from '@/api/studentLogApi';
import { getGradeLabel } from '@/utils/enumMappings';
import type { ClassStudent } from '@/types/api';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

// 筛选状态

// ================================
// 组件接口定义
// ================================

interface Student {
  id: number;
  name: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  birthDate?: string;
  school?: string;
  grade?: string;
  sourceChannel?: string;
  createdAt: string;
  status: string;
  // 成长数据统计
  growthStats?: {
    totalLogs: number;
    positiveRatio: number;
    negativeRatio: number;
    lastActivityDate?: string;
  };
  publicId?: string; // 新增 publicId 字段
}

interface StudentListViewProps {
  title?: string;
  showExportButton?: boolean;
  onStudentSelect?: (student: Student) => void;
}

// ================================
// 工具函数
// ================================

const getGenderIcon = (gender?: string) => {
  switch (gender) {
    case 'MALE': return '👦';
    case 'FEMALE': return '👧';
    default: return <UserOutlined />;
  }
};

const getStatusConfig = (status: string) => {
  const configs: { [key: string]: { color: string; text: string } } = {
    'ENROLLED': { color: 'success', text: '已报名' },
    'TRIAL_CLASS': { color: 'processing', text: '试听中' },
    'POTENTIAL': { color: 'default', text: '潜在客户' },
    'LOST': { color: 'error', text: '已流失' }
  };
  return configs[status] || { color: 'default', text: status };
};

// 在组件内部，状态定义附近添加
const StudentListView: React.FC<StudentListViewProps> = ({
  title = '学生列表',
  showExportButton = true,
  onStudentSelect
}) => {
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const { isMobile } = useResponsive();

  // ================================
  // 状态管理
  // ================================
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  
  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 12, // 默认每页12个学生卡片
    total: 0,
  });

  // 计算分页后的学生数据
  const filteredStudents = students.filter(student => {
    const matchesSearch = !searchKeyword || 
      student.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      student.school?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      student.publicId?.toLowerCase().includes(searchKeyword.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
    const matchesGrade = gradeFilter === 'all' || student.grade === gradeFilter;
    const matchesSchool = schoolFilter === 'all' || student.school === schoolFilter;
    
    return matchesSearch && matchesStatus && matchesGrade && matchesSchool;
  });

  // 分页后的数据
  const paginatedStudents = filteredStudents.slice(
    (pagination.current - 1) * pagination.pageSize,
    pagination.current * pagination.pageSize
  );

  // 更新分页总数
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      total: filteredStudents.length,
      current: 1 // 过滤条件变化时重置到第一页
    }));
  }, [filteredStudents.length, searchKeyword, statusFilter, gradeFilter, schoolFilter]);

  // 分页变化处理
  const handlePaginationChange = (page: number, pageSize?: number) => {
    setPagination(prev => ({
      ...prev,
      current: page,
      pageSize: pageSize || prev.pageSize
    }));
  };

  // ================================
  // 数据加载
  // ================================

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const [enrolledStudents, trialStudents] = await Promise.all([
        crmApi.getCustomers({ status: 'ENROLLED', limit: 1000 }),
        crmApi.getCustomers({ status: 'TRIAL_CLASS', limit: 1000 })
      ]);

      const studentsData = [...enrolledStudents, ...trialStudents];

      // 获取成长统计
      const stats: StudentGrowthStatsSummary[] = await getStudentsGrowthStats(studentsData.map(s => s.id));
      const statMap: Record<number, StudentGrowthStatsSummary> = {};
      stats.forEach(item => {
        statMap[item.studentId] = item;
      });
 
      const studentsWithStats = studentsData.map(student => {
        const stat = statMap[student.id];
        return {
          ...student,
          growthStats: stat ? {
            totalLogs: stat.totalLogs,
            positiveRatio: stat.positiveRatio,
            negativeRatio: stat.negativeRatio,
            lastActivityDate: stat.lastActivityDate ? stat.lastActivityDate.slice(0, 10) : undefined,
          } : {
            totalLogs: 0,
            positiveRatio: 0,
            negativeRatio: 0,
            lastActivityDate: undefined,
          }
        };
      });
 
      setStudents(studentsWithStats);
    } catch (error) {
      console.error('加载学生列表失败:', error);
      message.error('加载学生列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // ================================
  // 筛选和搜索
  // ================================

  // 筛选和搜索逻辑已移至 useEffect 中处理

  // ================================
  // 事件处理
  // ================================

  const handleStudentClick = (student: Student) => {
    if (onStudentSelect) {
      onStudentSelect(student);
    } else {
      // 统一使用publicId进行导航
      navigate(`/student-log/report/${student.publicId}`);
    }
  };

  const handleExportGrowthLogs = async () => {
    message.info('导出功能开发中...');
  };

  const handleRefresh = () => {
    loadStudents();
  };

  // ================================
  // 获取筛选选项
  // ================================

  const getUniqueValues = (key: keyof Student) => {
    const values = students
      .map(student => student[key])
      .filter((value, index, self) =>
        value && self.indexOf(value) === index
      ) as string[];
    return values.sort();
  };

  // ================================
  // 渲染函数
  // ================================

  const renderHeader = () => {
    // 统计数据基于过滤后的学生数据
    const totalStudents = filteredStudents.length;
    const enrolledStudents = filteredStudents.filter(s => s.status === 'ENROLLED').length;
    const trialStudents = filteredStudents.filter(s => s.status === 'TRIAL_CLASS').length;
    const totalGrowthLogs = filteredStudents.reduce((sum, s) => sum + (s.growthStats?.totalLogs || 0), 0);

    return (
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              {title}
            </Title>
          </Col>
          <Col>
            <Space>
              {showExportButton && (
                <AppButton
                  icon={<DownloadOutlined />}
                  onClick={() => message.info('导出功能开发中...')}
                >
                  导出数据
                </AppButton>
              )}
              <AppButton
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
              >
                刷新
              </AppButton>
            </Space>
          </Col>
        </Row>

        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="学生总数"
                value={totalStudents}
                prefix={<TeamOutlined style={{ color: 'var(--ant-color-primary)' }} />}
                valueStyle={{ color: 'var(--ant-color-primary)' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="已报名"
                value={enrolledStudents}
                prefix={<UserOutlined style={{ color: 'var(--ant-color-success)' }} />}
                valueStyle={{ color: 'var(--ant-color-success)' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="试听中"
                value={trialStudents}
                prefix={<BookOutlined style={{ color: 'var(--ant-color-warning)' }} />}
                valueStyle={{ color: 'var(--ant-color-warning)' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="成长记录"
                value={totalGrowthLogs}
                prefix={<BarChartOutlined style={{ color: 'var(--ant-color-info)' }} />}
                valueStyle={{ color: 'var(--ant-color-info)' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 筛选条件 */}
        <Card
          size="small"
          style={{
            backgroundColor: theme === 'dark' ? 'var(--ant-color-bg-container)' : '#fafafa',
            border: theme === 'dark' ? '1px solid #303030' : undefined
          }}
        >
          <Row gutter={[16, 8]} align="middle">
            <Col xs={24} sm={12} md={8}>
              <Search
                placeholder="搜索学生姓名、学校、年级"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                allowClear
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={8} sm={4} md={4}>
              <Select
                placeholder="状态"
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: '100%' }}
                size="middle"
              >
                <Option value="all">全部状态</Option>
                <Option value="ENROLLED">已报名</Option>
                <Option value="TRIAL_CLASS">试听中</Option>
              </Select>
            </Col>
            <Col xs={8} sm={4} md={4}>
              <Select
                placeholder="年级"
                value={gradeFilter}
                onChange={setGradeFilter}
                style={{ width: '100%' }}
                size="middle"
              >
                <Option value="all">全部年级</Option>
                {getUniqueValues('grade').map(grade => (
                  <Option key={grade} value={grade}>{getGradeLabel(grade)}</Option>
                ))}
              </Select>
            </Col>
            <Col xs={8} sm={4} md={4}>
              <Select
                placeholder="学校"
                value={schoolFilter}
                onChange={setSchoolFilter}
                style={{ width: '100%' }}
                size="middle"
              >
                <Option value="all">全部学校</Option>
                {getUniqueValues('school').map(school => (
                  <Option key={school} value={school}>{school}</Option>
                ))}
              </Select>
            </Col>
          </Row>
        </Card>
      </div>
    );
  };

  const renderStudentCard = (student: Student) => {
    const { growthStats } = student;
    const positiveRatio = Math.round((growthStats?.positiveRatio || 0) * 100);
    const negativeRatio = Math.round((growthStats?.negativeRatio || 0) * 100);
    const growthScore = ((positiveRatio - negativeRatio) / 2 + 50).toFixed(0);
    const statusConfig = getStatusConfig(student.status);

    return (
      <Card
        key={student.id}
        hoverable
        onClick={() => handleStudentClick(student)}
        styles={{
          body: { padding: 16 }
        }}
        style={{
          height: '100%',
          borderRadius: 8,
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        actions={[
          <Tooltip title="查看详细成长报告" key="view">
            <AppButton
              hierarchy="tertiary"
              icon={<EyeOutlined />}
              style={{ color: 'var(--ant-color-primary)' }}
            >
              查看报告
            </AppButton>
          </Tooltip>
        ]}
      >
        {/* 学生基本信息 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 16,
          gap: 12
        }}>
          <Avatar
            size={48}
            style={{
              backgroundColor: 'var(--ant-color-primary)',
              fontSize: 18
            }}
          >
            {typeof getGenderIcon(student.gender) === 'string'
              ? getGenderIcon(student.gender)
              : getGenderIcon(student.gender)
            }
          </Avatar>

          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4
            }}>
              <Title level={5} style={{ margin: 0, fontSize: 16 }}>
                {student.name}
              </Title>
              <ArrowRightOutlined style={{ color: 'var(--ant-color-text-secondary)', fontSize: 12 }} />
            </div>

            <Space size="small" wrap>
              <Tag color={statusConfig.color} style={{ fontSize: 11 }}>
                {statusConfig.text}
              </Tag>
              {student.grade && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {getGradeLabel(student.grade)}
                </Text>
              )}
            </Space>
          </div>
        </div>

        {/* 学校信息 */}
        {student.school && (
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <BankOutlined style={{ marginRight: 4, color: 'var(--ant-color-text-secondary)' }} />
              {student.school}
            </Text>
          </div>
        )}

        {/* 成长统计 */}
        <Row gutter={8} style={{ marginBottom: 12 }}>
          <Col span={8}>
            <Statistic
              title={<Text style={{ fontSize: 11, color: 'var(--ant-color-text-secondary)' }}>总记录</Text>}
              value={growthStats?.totalLogs || 0}
              valueStyle={{ fontSize: 16, color: 'var(--ant-color-primary)', fontWeight: 600 }}
              prefix={<BookOutlined style={{ fontSize: 12 }} />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title={<Text style={{ fontSize: 11, color: 'var(--ant-color-text-secondary)' }}>正面率</Text>}
              value={positiveRatio}
              suffix="%"
              valueStyle={{ fontSize: 16, color: 'var(--ant-color-success)', fontWeight: 600 }}
              prefix={<SmileOutlined style={{ fontSize: 12 }} />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title={<Text style={{ fontSize: 11, color: 'var(--ant-color-text-secondary)' }}>成长指数</Text>}
              value={growthScore}
              valueStyle={{ fontSize: 16, color: 'var(--ant-color-warning)', fontWeight: 600 }}
              prefix={<RocketOutlined style={{ fontSize: 12 }} />}
            />
          </Col>
        </Row>

        {/* 成长进度条 */}
        <div style={{ marginBottom: 12 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6
          }}>
            <Text style={{ fontSize: 12, color: 'var(--ant-color-text-tertiary)', fontWeight: 500 }}>
              成长表现
            </Text>
            <Space size={8}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 'var(--ant-color-success)'
                }} />
                <Text style={{ fontSize: 10, color: 'var(--ant-color-success)' }}>正面</Text>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 'var(--ant-color-error)'
                }} />
                <Text style={{ fontSize: 10, color: 'var(--ant-color-error)' }}>待改进</Text>
              </div>
            </Space>
          </div>

          <div style={{ position: 'relative' }}>
            <Progress
              percent={positiveRatio + negativeRatio}
              success={{ percent: positiveRatio }}
              strokeColor="var(--ant-color-error)"
              showInfo={false}
              size="small"
              strokeWidth={8}
              style={{ marginBottom: 0 }}
            />
          </div>
        </div>

        {/* 最后活动时间 */}
        {growthStats?.lastActivityDate && (
          <div style={{ textAlign: 'center', borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              <CalendarOutlined style={{ marginRight: 4 }} />
              最后记录：{growthStats.lastActivityDate}
            </Text>
          </div>
        )}
      </Card>
    );
  };

  const renderStudentList = () => {
    if (loading && filteredStudents.length === 0) {
      return (
        <Row gutter={[16, 16]}>
          {Array.from({ length: 8 }).map((_, index) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={index}>
              <Card loading style={{ height: 280 }}>
                <div />
              </Card>
            </Col>
          ))}
        </Row>
      );
    }

    if (!loading && filteredStudents.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              searchKeyword || statusFilter !== 'all' || gradeFilter !== 'all' || schoolFilter !== 'all'
                ? '没有找到符合条件的学生'
                : '暂无学生数据'
            }
          >
            {!(searchKeyword || statusFilter !== 'all' || gradeFilter !== 'all' || schoolFilter !== 'all') && (
              <AppButton hierarchy="primary" onClick={handleRefresh}>
                重新加载
              </AppButton>
            )}
          </Empty>
        </div>
      );
    }

    return (
      <Row gutter={[16, 16]}>
        {paginatedStudents.map(student => (
          <Col xs={24} sm={12} lg={8} xl={6} key={student.id}>
            {renderStudentCard(student)}
          </Col>
        ))}
      </Row>
    );
  };

  // ================================
  // 主渲染
  // ================================

  return (
    <div style={{
      padding: isMobile ? 16 : 24,
      background: theme === 'dark' ? 'var(--ant-color-bg-layout)' : '#f5f5f5',
      minHeight: '100vh'
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {renderHeader()}

        <Spin spinning={loading && filteredStudents.length > 0}>
          {renderStudentList()}
          <Pagination
            current={pagination.current}
            total={pagination.total}
            pageSize={pagination.pageSize}
            onChange={handlePaginationChange}
            showSizeChanger
            showTotal={(total) => `共 ${total} 条`}
            style={{ marginTop: 20, textAlign: 'right' }}
          />
        </Spin>
      </div>
    </div>
  );
};

export default StudentListView; 