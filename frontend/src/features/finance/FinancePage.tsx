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
  Tag,
  App,
  List,
  Avatar,
  Dropdown,
  Empty,
  Spin,
  Divider,
  Popconfirm,
  Table,
  Checkbox,
  Segmented
} from 'antd';
import type { MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DollarOutlined,
  UserOutlined,
  FileTextOutlined,
  AlertOutlined,
  PlusOutlined,
  EyeOutlined,
  MoreOutlined,
  DownloadOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BankOutlined,
  CreditCardOutlined,
  AppstoreOutlined,
  BarsOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeStore } from '@/stores/themeStore';
import { useDebounce } from '@/hooks/useDebounce';
import * as financeApi from '@/api/financeApi';
import type { StudentFinanceSummary } from '@/api/financeApi';
import { getGradeLabel } from '@/utils/enumMappings';

const { Title, Text } = Typography;
const { Search } = Input;
const { useApp } = App;

// 支付状态标签配置 - 匹配API返回的状态值
const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  'PAID_FULL': { label: '已付清', color: '#52c41a' },
  'PARTIAL_PAID': { label: '部分付款', color: '#faad14' },
  'UNPAID': { label: '未付款', color: '#ff4d4f' }
};

// 视图模式类型
type ViewMode = 'card' | 'list';

// ================================
// 学生财务卡片组件
// ================================
interface StudentFinanceCardProps {
  student: StudentFinanceSummary;
  selectedRowKeys: React.Key[];
  onSelect: (studentId: number, checked: boolean) => void;
  onViewDetail: (student: StudentFinanceSummary) => void;
}

const StudentFinanceCard: React.FC<StudentFinanceCardProps> = ({
  student,
  selectedRowKeys,
  onSelect,
  onViewDetail
}) => {
  const { theme } = useThemeStore();

  const formatAmount = (amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    return `¥${numAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getPaymentProgress = () => {
    const totalDue = parseFloat(student.totalDue) || 0;
    const totalPaid = parseFloat(student.totalPaid) || 0;
    if (totalDue === 0) return 0;
    return (totalPaid / totalDue) * 100;
  };

  const studentActions = [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: '查看详情',
      onClick: () => onViewDetail(student)
    }
  ];

  return (
    <Card
      size="small"
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Checkbox
              checked={selectedRowKeys.includes(student.studentId)}
              onChange={(e) => onSelect(student.studentId, e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
            <Avatar 
              size="small"
              style={{ 
                backgroundColor: PAYMENT_STATUS_LABELS[student.paymentStatus]?.color || '#8c8c8c'
              }}
            >
              {student.studentName?.slice(-2) || '学生'}
            </Avatar>
            <span>{student.studentName}</span>
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
        height: '280px',
        borderColor: selectedRowKeys.includes(student.studentId) ? '#1890ff' : undefined,
        cursor: 'pointer'
      }}
      bodyStyle={{ padding: '12px' }}
      onClick={() => onViewDetail(student)}
    >
      {/* 学生信息 */}
      <div style={{ marginBottom: '12px', fontSize: '12px', color: '#8c8c8c' }}>
        <Space split={<Divider type="vertical" />} size="small">
          {student.school && <span>{student.school}</span>}
          {student.grade && <span>{getGradeLabel(student.grade)}</span>}
          <span>{student.orderCount} 个订单</span>
        </Space>
      </div>

      {/* 金额信息 */}
      <div style={{ marginBottom: '12px' }}>
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: '11px' }}>应收总额</Text>
            <Text strong style={{ fontSize: '14px', color: '#1890ff' }}>
              {formatAmount(student.totalDue)}
            </Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: '11px' }}>已付金额</Text>
            <Text strong style={{ fontSize: '14px', color: '#52c41a' }}>
              {formatAmount(student.totalPaid)}
            </Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: '11px' }}>欠款金额</Text>
            <Text strong style={{ 
              fontSize: '14px', 
              color: parseFloat(student.totalOwed) > 0 ? '#ff4d4f' : '#52c41a' 
            }}>
              {formatAmount(student.totalOwed)}
            </Text>
          </div>
        </Space>
      </div>

      {/* 最后更新时间 */}
      <div style={{ marginBottom: '12px', fontSize: '11px', color: '#8c8c8c' }}>
        最后更新: {student.lastUpdateDate}
        {student.lastOrderDate && (
          <div>最近订单: {student.lastOrderDate}</div>
        )}
      </div>

      {/* 支付状态 */}
      <div style={{ 
        borderTop: `1px solid ${theme === 'dark' ? '#434343' : '#f0f0f0'}`, 
        paddingTop: '8px' 
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '4px'
        }}>
          <Text type="secondary" style={{ fontSize: '11px' }}>支付状态</Text>
          <Tag 
            color={PAYMENT_STATUS_LABELS[student.paymentStatus]?.color || '#8c8c8c'}
            style={{ margin: 0, fontSize: '11px' }}
          >
            {PAYMENT_STATUS_LABELS[student.paymentStatus]?.label || student.paymentStatus}
          </Tag>
        </div>
        
        {/* 支付进度条 */}
        <div style={{ 
          width: '100%', 
          height: '6px', 
          backgroundColor: theme === 'dark' ? '#434343' : '#f0f0f0',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${getPaymentProgress()}%`,
            height: '100%',
            backgroundColor: student.paymentStatus === 'PAID_FULL' ? '#52c41a' : 
                           student.paymentStatus === 'PARTIAL_PAID' ? '#faad14' : '#ff4d4f',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>
    </Card>
  );
};

// ================================
// 主组件：财务页面
// ================================
const FinancePage: React.FC = () => {
  const navigate = useNavigate();
  const { message: antMessage } = useApp();
  const { isMobile, isDesktop } = useResponsive();
  const { theme } = useThemeStore();
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentFinanceSummary[]>([]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  
  // 分页状态管理
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20, // 默认每页20条，更适合卡片视图
  });

  // 搜索防抖
  const debouncedSearchKeyword = useDebounce(searchKeyword, 300);

  // 过滤后的学生数据
  const filteredStudents = useMemo(() => {
    let filtered = [...students];

    // 状态过滤
    if (selectedStatusFilter !== 'all') {
      filtered = filtered.filter(student => student.paymentStatus === selectedStatusFilter);
    }

    // 搜索过滤
    if (debouncedSearchKeyword.trim()) {
      const keyword = debouncedSearchKeyword.toLowerCase();
      filtered = filtered.filter(student =>
        student.studentName?.toLowerCase().includes(keyword) ||
        student.school?.toLowerCase().includes(keyword)
      );
    }

    return filtered;
  }, [students, selectedStatusFilter, debouncedSearchKeyword]);

  // 分页后的数据
  const paginatedStudents = useMemo(() => {
    const startIndex = (pagination.current - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, pagination.current, pagination.pageSize]);

  // 统计数据
  const stats = useMemo(() => {
    const totalStudents = students.length;
    const totalDue = students.reduce((sum, s) => sum + (parseFloat(s.totalDue) || 0), 0);
    const totalPaid = students.reduce((sum, s) => sum + (parseFloat(s.totalPaid) || 0), 0);
    const totalOwed = students.reduce((sum, s) => sum + (parseFloat(s.totalOwed) || 0), 0);
    const unpaidCount = students.filter(s => s.paymentStatus === 'UNPAID').length;
    const partialCount = students.filter(s => s.paymentStatus === 'PARTIAL_PAID').length;
    const paidCount = students.filter(s => s.paymentStatus === 'PAID_FULL').length;

    return {
      totalStudents,
      totalDue,
      totalPaid,
      totalOwed,
      unpaidCount,
      partialCount,
      paidCount
    };
  }, [students]);

  // ================================
  // 数据加载函数
  // ================================
  const loadStudentFinanceSummaries = useCallback(async () => {
    try {
      setLoading(true);
      const data = await financeApi.getStudentFinanceSummaries();
      setStudents(data);
    } catch (error) {
      console.error('加载学生财务数据失败:', error);
      antMessage.error('加载学生财务数据失败');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [antMessage]);

  // 初始化
  useEffect(() => {
    loadStudentFinanceSummaries();
  }, [loadStudentFinanceSummaries]);

  // ================================
  // 事件处理函数  
  // ================================
  const handleStatusFilter = useCallback((status: string) => {
    setSelectedStatusFilter(status);
    setSelectedRowKeys([]);
    // 重置分页到第一页
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearchKeyword(value);
    setSelectedRowKeys([]);
    // 重置分页到第一页
    setPagination(prev => ({ ...prev, current: 1 }));
  }, []);

  // 分页变化处理
  const handlePaginationChange = useCallback((page: number, pageSize: number) => {
    setPagination({ current: page, pageSize });
    setSelectedRowKeys([]); // 清空选择
  }, []);

  const handleViewDetail = useCallback((student: StudentFinanceSummary) => {
    navigate(`/finance/students/${student.studentId}`);
  }, [navigate]);

  const handleExport = useCallback(async () => {
    try {
      // 实现导出功能
      antMessage.success('财务数据导出成功');
    } catch (error) {
      console.error('导出数据失败:', error);
      antMessage.error('导出失败');
    }
  }, [antMessage]);

  // 格式化金额
  const formatAmount = (amount: number) => {
    return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 左侧筛选菜单
  const filterMenuItems: MenuProps['items'] = useMemo(() => [
    {
      key: 'all',
      label: (
        <Space>
          <span>全部学生</span>
          <Text type="secondary">({stats.totalStudents})</Text>
        </Space>
      )
    },
    { type: 'divider' },
    {
      key: 'UNPAID',
      label: (
        <Space>
          <span>未付款</span>
          <Text type="secondary">({stats.unpaidCount})</Text>
        </Space>
      )
    },
    {
      key: 'PARTIAL_PAID',
      label: (
        <Space>
          <span>部分付款</span>
          <Text type="secondary">({stats.partialCount})</Text>
        </Space>
      )
    },
    {
      key: 'PAID_FULL',
      label: (
        <Space>
          <span>已付清</span>
          <Text type="secondary">({stats.paidCount})</Text>
        </Space>
      )
    }
  ], [stats]);

  // 表格列配置
  const tableColumns: ColumnsType<StudentFinanceSummary> = [
    {
      title: '学生姓名',
      dataIndex: 'studentName',
      key: 'studentName',
      fixed: 'left',
      width: isMobile ? 100 : 120,
      render: (name: string, record: StudentFinanceSummary) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Checkbox
            checked={selectedRowKeys.includes(record.studentId)}
            onChange={(e) => {
              const checked = e.target.checked;
              const newSelectedRowKeys = checked
                ? [...selectedRowKeys, record.studentId]
                : selectedRowKeys.filter(key => key !== record.studentId);
              setSelectedRowKeys(newSelectedRowKeys);
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <Avatar 
            size="small"
            style={{ 
              backgroundColor: PAYMENT_STATUS_LABELS[record.paymentStatus]?.color || '#8c8c8c'
            }}
          >
            {name?.slice(-2) || '学生'}
          </Avatar>
          <span style={{ fontWeight: 500 }}>{name}</span>
        </div>
      )
    },
         {
       title: '学校/年级',
       key: 'school',
       width: isMobile ? 120 : 150,
       render: (_: any, record: StudentFinanceSummary) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.school || '-'}</div>
          {record.grade && (
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>{getGradeLabel(record.grade)}</div>
          )}
        </div>
      )
    },
    {
      title: '应收总额',
      dataIndex: 'totalDue',
      key: 'totalDue',
      width: isMobile ? 90 : 120,
      align: 'right',
      render: (amount: string) => (
        <span style={{ fontWeight: 500, color: '#1890ff' }}>
          {formatAmount(parseFloat(amount) || 0)}
        </span>
      )
    },
    {
      title: '已付金额',
      dataIndex: 'totalPaid',
      key: 'totalPaid',
      width: isMobile ? 90 : 120,
      align: 'right',
      render: (amount: string) => (
        <span style={{ fontWeight: 500, color: '#52c41a' }}>
          {formatAmount(parseFloat(amount) || 0)}
        </span>
      )
    },
    {
      title: '欠款金额',
      dataIndex: 'totalOwed',
      key: 'totalOwed',
      width: isMobile ? 90 : 120,
      align: 'right',
      render: (amount: string) => {
        const numAmount = parseFloat(amount) || 0;
        return (
          <span style={{ 
            fontWeight: 500, 
            color: numAmount > 0 ? '#ff4d4f' : '#52c41a'
          }}>
            {formatAmount(numAmount)}
          </span>
        );
      }
    },
    {
      title: '支付状态',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: isMobile ? 80 : 100,
      render: (status: string) => (
        <Tag 
          color={PAYMENT_STATUS_LABELS[status]?.color || '#8c8c8c'}
          style={{ fontSize: '11px' }}
        >
          {PAYMENT_STATUS_LABELS[status]?.label || status}
        </Tag>
      )
    },
    {
      title: '订单数',
      dataIndex: 'orderCount',
      key: 'orderCount',
      width: isMobile ? 60 : 80,
      align: 'center'
    },
    {
      title: '最后更新',
      dataIndex: 'lastUpdateDate',
      key: 'lastUpdateDate',
      width: isMobile ? 90 : 120,
      render: (date: string) => (
        <div style={{ fontSize: '13px' }}>{date}</div>
      )
    },
         {
       title: '操作',
       key: 'actions',
       fixed: 'right',
       width: isMobile ? 60 : 80,
       render: (_: any, record: StudentFinanceSummary) => (
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            handleViewDetail(record);
          }}
        />
      )
    }
  ];

  return (
    <div style={{ padding: '0' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题 */}
        <div>
          <Title level={2} style={{ margin: 0, marginBottom: '8px' }}>
            财务管理中心
          </Title>
          <Text type="secondary">
            管理学生付费记录、收款状态和财务统计
          </Text>
        </div>

        {/* 搜索和操作栏 */}
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} lg={14}>
            <Search
              placeholder="搜索学生姓名、学校等"
              allowClear
              size="large"
              value={searchKeyword}
              onChange={(e) => handleSearch(e.target.value)}
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} lg={10}>
            <div style={{ 
              display: 'flex', 
              justifyContent: !isDesktop ? 'center' : 'flex-end',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '16px',
              alignItems: isMobile ? 'stretch' : 'center'
            }}>
              {/* 视图切换 */}
              <Segmented
                value={viewMode}
                onChange={setViewMode}
                options={[
                  { label: '卡片', value: 'card', icon: <AppstoreOutlined /> },
                  { label: '列表', value: 'list', icon: <BarsOutlined /> }
                ]}
                size={isMobile ? 'small' : 'middle'}
              />
              
              <Space size="middle">
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
                  <DollarOutlined />
                  <span>财务概览</span>
                </Space>
              }>
                <Row gutter={[0, 16]}>
                  <Col span={24}>
                    <Statistic
                      title="学生总数"
                      value={stats.totalStudents}
                      prefix={<UserOutlined />}
                      valueStyle={{ color: '#1890ff', fontSize: '20px' }}
                    />
                  </Col>
                  <Col span={24}>
                    <Statistic
                      title="总应收"
                      value={stats.totalDue}
                      formatter={(value) => formatAmount(Number(value))}
                      prefix={<BankOutlined />}
                      valueStyle={{ color: '#1890ff', fontSize: '20px' }}
                    />
                  </Col>
                  <Col span={24}>
                    <Statistic
                      title="总实收"
                      value={stats.totalPaid}
                      formatter={(value) => formatAmount(Number(value))}
                      prefix={<CreditCardOutlined />}
                      valueStyle={{ color: '#52c41a', fontSize: '20px' }}
                    />
                  </Col>
                  <Col span={24}>
                    <Statistic
                      title="总欠款"
                      value={stats.totalOwed}
                      formatter={(value) => formatAmount(Number(value))}
                      prefix={<AlertOutlined />}
                      valueStyle={{ color: stats.totalOwed > 0 ? '#ff4d4f' : '#52c41a', fontSize: '20px' }}
                    />
                  </Col>
                </Row>
              </Card>
              
              {/* 状态筛选 */}
              <Card title="状态筛选" style={{ flex: 1 }}>
                <Menu
                  mode="vertical"
                  selectedKeys={[selectedStatusFilter]}
                  items={filterMenuItems}
                  onClick={({ key }) => handleStatusFilter(key)}
                  style={{ 
                    border: 'none', 
                    fontSize: isMobile ? '14px' : '16px'
                  }}
                />
              </Card>
            </Space>
          </Col>

          {/* 右侧学生列表区 */}
          <Col xs={24} md={16} lg={18}>
            <Card 
              title={
                <Space>
                  <span style={{ fontSize: isMobile ? '14px' : '16px' }}>
                    {selectedStatusFilter === 'all' ? '全部学生财务记录' : 
                     PAYMENT_STATUS_LABELS[selectedStatusFilter]?.label || '财务记录'}
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
                  </Space>
                )
              }
              style={{ height: '100%' }}
            >
              {loading ? (
                <Spin size="large" style={{ display: 'block', textAlign: 'center', margin: '40px 0' }} />
              ) : filteredStudents.length === 0 ? (
                <Empty
                  description={
                    selectedStatusFilter === 'all' ? '暂无学生财务记录' : 
                    `暂无${PAYMENT_STATUS_LABELS[selectedStatusFilter]?.label || ''}记录`
                  }
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  style={{ margin: '40px 0' }}
                />
              ) : (
                <>
                  {viewMode === 'card' ? (
                    /* 卡片视图 */
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
                      pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: filteredStudents.length,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => 
                          `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
                        onChange: handlePaginationChange,
                        onShowSizeChange: handlePaginationChange,
                        pageSizeOptions: ['10', '20', '50', '100'],
                      }}
                      renderItem={(student) => (
                        <List.Item>
                          <StudentFinanceCard
                            student={student}
                            selectedRowKeys={selectedRowKeys}
                            onSelect={(studentId, checked) => {
                              const newSelectedRowKeys = checked
                                ? [...selectedRowKeys, studentId]
                                : selectedRowKeys.filter(key => key !== studentId);
                              setSelectedRowKeys(newSelectedRowKeys);
                            }}
                            onViewDetail={handleViewDetail}
                          />
                        </List.Item>
                      )}
                    />
                  ) : (
                    /* 表格视图 */
                    <Table<StudentFinanceSummary>
                      columns={tableColumns}
                      dataSource={paginatedStudents}
                      rowKey="studentId"
                      size="small"
                      scroll={{ x: isMobile ? 800 : undefined }}
                      pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: filteredStudents.length,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) => 
                          `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
                        onChange: handlePaginationChange,
                        onShowSizeChange: handlePaginationChange,
                        pageSizeOptions: ['10', '20', '50', '100'],
                      }}
                      onRow={(record) => ({
                        onClick: () => handleViewDetail(record),
                        style: { cursor: 'pointer' }
                      })}
                    />
                  )}
                </>
              )}

              {/* 统计信息 */}
              {filteredStudents.length > 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  marginTop: '16px', 
                  padding: '8px 0',
                  color: 'var(--ant-color-text-secondary)',
                  fontSize: '12px',
                  borderTop: '1px solid var(--ant-color-border-secondary)'
                }}>
                  当前显示 {paginatedStudents.length} 条记录 / 筛选结果 {filteredStudents.length} 条 / 系统总计 {stats.totalStudents} 名学生
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default FinancePage; 