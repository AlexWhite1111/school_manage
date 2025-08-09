import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Typography, 
  Row, 
  Col, 
  Card, 
  Input, 
  Button, 
  Table, 
  Menu, 
  Space, 
  Statistic, 
  Modal, 
  Upload, 
  Dropdown,
  Tag,
  App,
  Tooltip,
} from 'antd';
import type { TableColumnsType, MenuProps } from 'antd';
import {
  SearchOutlined,
  DownloadOutlined,
  UploadOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  MoreOutlined,
  EyeOutlined,
  UserSwitchOutlined,
  TeamOutlined,
  PlusOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';
import { useResponsive } from '@/hooks/useResponsive';
import * as crmApi from '@/api/crmApi';
import type { Customer, CustomerStats, CustomerStatus } from '@/types/api';
import { getGradeLabel, getSourceChannelLabel } from '@/utils/enumMappings';

const { Title, Text } = Typography;
const { Search } = Input;
const { confirm } = Modal;
const { useApp } = App;

// 客户状态映射 - 移到组件外部避免重复创建
const CUSTOMER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  'all': { label: '总客户', color: '#1890ff' },
  'POTENTIAL': { label: '潜在用户', color: '#722ed1' },
  'INITIAL_CONTACT': { label: '初步沟通', color: '#13c2c2' },
  'INTERESTED': { label: '意向用户', color: '#52c41a' },
  'TRIAL_CLASS': { label: '试课', color: '#faad14' },
  'ENROLLED': { label: '已报名', color: '#1890ff' },
  'LOST': { label: '流失客户', color: '#f5222d' }
};

const CrmPage: React.FC = () => {
  const navigate = useNavigate();
  const { message: antMessage } = useApp();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  // 状态管理
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [pagination, setPagination] = useState<{ current: number; pageSize: number }>({ current: 1, pageSize: 15 });

  // 🚀 优化搜索防抖时间：降低到200ms，提升响应性
  const debouncedSearchKeyword = useDebounce(searchKeyword, 200);

  // 加载统计数据
  const loadStats = useCallback(async () => {
    try {
      const statsData = await crmApi.getCustomerStats();
      setStats(statsData);
    } catch (error: any) {
      console.error('加载统计数据失败:', error);
      antMessage.error('加载统计数据失败: ' + (error.message || '未知错误'));
    }
  }, []);

  // 🚀 优化加载客户列表：添加搜索状态指示器
  const loadCustomers = useCallback(async (status: string = 'all', search?: string) => {
    try {
      // 如果是搜索，只显示搜索加载状态，不影响主列表
      if (search !== undefined) {
        setSearchLoading(true);
      } else {
        setLoading(true);
      }
      
      const params: crmApi.GetCustomersParams = {
        limit: 100 // 优化：减少一次性加载数量，提升性能
      };
      
      if (status !== 'all') {
        params.status = status;
      }
      
      // 保留高级模糊搜索功能
      if (search?.trim()) {
        params.search = search.trim();
      }

      const customersData = await crmApi.getCustomers(params);
      setCustomers(customersData);
      
    } catch (error: any) {
      console.error('加载客户列表失败:', error);
      antMessage.error('加载客户列表失败: ' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  }, []);

  // 页面初始化
  useEffect(() => {
    loadStats();
    loadCustomers();
  }, []);

  // 🚀 优化搜索效果：添加搜索状态管理
  useEffect(() => {
    loadCustomers(selectedStatus, debouncedSearchKeyword);
  }, [selectedStatus, debouncedSearchKeyword]);

  // 处理状态筛选
  const handleStatusFilter = useCallback((status: string) => {
    setSelectedStatus(status);
    setSelectedRowKeys([]); // 清空选择
  }, []);

  // 🚀 优化搜索处理：添加实时反馈
  const handleSearch = useCallback((value: string) => {
    setSearchKeyword(value);
    setSelectedRowKeys([]); // 清空选择
    // 如果有搜索内容，立即显示搜索状态
    if (value.trim()) {
      setSearchLoading(true);
    }
  }, []);

  // 查看/编辑客户
  const handleViewCustomer = useCallback((customer: any) => {
    navigate(`/crm/${customer.publicId}`);
  }, [navigate]);

  // 快速变更客户状态
  const handleChangeStatus = useCallback(async (customerId: number, newStatus: CustomerStatus, customerName: string) => {
    try {
      await crmApi.updateCustomer(customerId, { status: newStatus });
      antMessage.success(`客户 ${customerName} 的状态已更新为 ${CUSTOMER_STATUS_LABELS[newStatus]?.label}`);
      // 批量更新，减少API调用
      Promise.all([
        loadCustomers(selectedStatus, debouncedSearchKeyword),
        loadStats()
      ]);
    } catch (error: any) {
      console.error('更新客户状态失败:', error);
      antMessage.error('状态更新失败: ' + (error.message || '未知错误'));
    }
  }, [selectedStatus, debouncedSearchKeyword]);

  // 批量删除确认
  const handleBatchDelete = useCallback(() => {
    if (selectedRowKeys.length === 0) {
      antMessage.warning('请先选择要删除的客户');
      return;
    }

    confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `您确定要删除选中的 ${selectedRowKeys.length} 位客户吗？此操作不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await crmApi.deleteCustomers(selectedRowKeys as number[]);
          antMessage.success('批量删除成功');
          setSelectedRowKeys([]);
          // 批量更新，减少API调用
          Promise.all([
            loadCustomers(selectedStatus, debouncedSearchKeyword),
            loadStats()
          ]);
        } catch (error: any) {
          console.error('批量删除失败:', error);
          antMessage.error('删除失败: ' + (error.message || '未知错误'));
        }
      }
    });
  }, [selectedRowKeys, selectedStatus, debouncedSearchKeyword]);

  // 导出数据
  const handleExport = useCallback(async () => {
    try {
      const params: crmApi.ExportCustomersParams = {};
      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }
      if (debouncedSearchKeyword) {
        params.search = debouncedSearchKeyword;
      }

      const blob = await crmApi.exportCustomers(params);
      const filename = crmApi.generateTimestampedFilename('客户信息');
      crmApi.downloadFile(blob, filename);
      antMessage.success('数据导出成功');
    } catch (error: any) {
      console.error('导出数据失败:', error);
      antMessage.error('导出失败: ' + (error.message || '未知错误'));
    }
  }, [selectedStatus, debouncedSearchKeyword]);

  // 导入数据
  const handleImport = useCallback(async (file: File) => {
    try {
      const result = await crmApi.importCustomers(file);
      antMessage.success(`导入完成：成功 ${result.results.success} 条，失败 ${result.results.failed} 条`);
      // 批量更新，减少API调用
      Promise.all([
        loadCustomers(selectedStatus, debouncedSearchKeyword),
        loadStats()
      ]);
    } catch (error: any) {
      console.error('导入数据失败:', error);
      antMessage.error('导入失败: ' + (error.message || '未知错误'));
    }
    return false; // 阻止默认上传行为
  }, [selectedStatus, debouncedSearchKeyword]);

  // 客户操作菜单
  const getCustomerActions = useCallback((customer: Customer): MenuProps['items'] => [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: '查看/编辑',
      onClick: () => handleViewCustomer(customer)
    },
    {
      key: 'divider1',
      type: 'divider'
    },
    {
      key: 'status',
      icon: <UserSwitchOutlined />,
      label: '变更状态',
      children: Object.entries(CUSTOMER_STATUS_LABELS)
        .filter(([key]) => key !== 'all' && key !== customer.status)
        .map(([status, config]) => ({
          key: status,
          label: config.label,
          onClick: () => handleChangeStatus(customer.id, status as CustomerStatus, customer.name)
        }))
    }
  ], [handleViewCustomer, handleChangeStatus]);

  // 🚀 性能优化：缓存渲染函数
  const renderCustomerName = useCallback((name: string, record: Customer) => (
    <Button 
      type="link" 
      onClick={() => handleViewCustomer(record)}
      style={{ padding: 0, height: 'auto' }}
    >
      {name}
    </Button>
  ), [handleViewCustomer]);

  const renderSchoolOrGrade = useCallback((value: string) => value || '-', []);

  const renderGrade = useCallback((grade: string) => {
    return getGradeLabel(grade);
  }, []);

  const renderSourceChannel = useCallback((sourceChannel: string) => {
    return getSourceChannelLabel(sourceChannel);
  }, []);

  const renderParentName = useCallback((_: any, record: Customer) => {
    const primaryParent = record.parents?.[0];
    return primaryParent ? primaryParent.name : '-';
  }, []);

  const renderParentPhone = useCallback((_: any, record: Customer) => {
    const primaryParent = record.parents?.[0];
    return primaryParent?.phone || '-';
  }, []);

  const renderCustomerStatus = useCallback((status: CustomerStatus) => {
    const config = CUSTOMER_STATUS_LABELS[status];
    return (
      <Tag color={config?.color || 'default'}>
        {config?.label || status}
      </Tag>
    );
  }, []);

  const renderActions = useCallback((_: any, record: Customer) => (
    <Dropdown 
      menu={{ items: getCustomerActions(record) }}
      trigger={['click']}
      placement="bottomRight"
    >
      <Button 
        type="text" 
        icon={<MoreOutlined />}
        size="small"
      />
    </Dropdown>
  ), [getCustomerActions]);

  // 表格列定义
  const columns: TableColumnsType<Customer> = useMemo(() => [
    {
      title: '客户姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      render: renderCustomerName
    },
    {
      title: '学校',
      dataIndex: 'school',
      key: 'school',
      width: 150,
      render: renderSchoolOrGrade
    },
    {
      title: '年级',
      dataIndex: 'grade',
      key: 'grade',
      width: 100,
      render: renderGrade
    },
    {
      title: '家长姓名',
      key: 'parents',
      width: 120,
      render: renderParentName
    },
    {
      title: '联系方式',
      key: 'phone',
      width: 130,
      render: renderParentPhone
    },
    {
      title: '来源渠道',
      dataIndex: 'sourceChannel',
      key: 'sourceChannel',
      width: 120,
      render: renderSourceChannel
    },
    {
      title: '客户状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: renderCustomerStatus
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: renderActions
    }
  ], [renderCustomerName, renderSchoolOrGrade, renderGrade, renderSourceChannel, renderParentName, renderParentPhone, renderCustomerStatus, renderActions]);

  // 左侧筛选菜单
  const filterMenuItems: MenuProps['items'] = useMemo(() => [
    {
      key: 'all',
      label: (
        <Space>
          <span>总客户</span>
          <Text type="secondary">({stats?.totalCustomers || 0})</Text>
        </Space>
      )
    },
    { type: 'divider' },
    ...Object.entries(CUSTOMER_STATUS_LABELS)
      .filter(([key]) => key !== 'all')
      .map(([status, config]) => ({
        key: status,
        label: (
          <Space>
            <span>{config.label}</span>
            <Text type="secondary">({stats?.statusCounts?.[status as CustomerStatus] || 0})</Text>
          </Space>
        )
      }))
  ], [stats]);

  // 分页处理
  const handlePaginationChange = useCallback((page: number, pageSize: number) => {
    setPagination({ current: page, pageSize });
    setSelectedRowKeys([]); // 清空选择
  }, []);

  // 行选择处理
  const handleRowSelectionChange = useCallback((newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  }, []);

  // 🎯 智能搜索提示
  const getSearchPlaceholder = () => {
    if (searchKeyword.length === 0) {
      return "搜索客户姓名、学校、家长、电话等 (支持拼音首字母)";
    }
    const isAlphaOnly = /^[a-zA-Z]+$/.test(searchKeyword);
    if (isAlphaOnly && searchKeyword.length >= 2) {
      return "拼音首字母搜索中...";
    }
    return "正在搜索...";
  };

  return (
    <div style={{ padding: '0' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题 */}
        <div>
          <Title level={2} style={{ margin: 0, marginBottom: '8px' }}>
            客户管理
          </Title>
          <Text type="secondary">
            管理客户档案、跟进记录和业务状态
          </Text>
        </div>

        {/* 数据看板 */}
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6} lg={6}>
            <Card>
              <Statistic
                title="总客户数"
                value={stats?.totalCustomers || 0}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#1890ff', fontSize: isMobile ? '18px' : '24px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={6}>
            <Card>
              <Statistic
                title="本月新增"
                value={stats?.monthlyNewCustomers || 0}
                valueStyle={{ color: '#52c41a', fontSize: isMobile ? '18px' : '24px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={6}>
            <Card>
              <Statistic
                title="已报名"
                value={stats?.statusCounts?.ENROLLED || 0}
                valueStyle={{ color: '#1890ff', fontSize: isMobile ? '18px' : '24px' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={6}>
            <Card>
              <Statistic
                title="意向用户"
                value={stats?.statusCounts?.INTERESTED || 0}
                valueStyle={{ color: '#52c41a', fontSize: isMobile ? '18px' : '24px' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 🚀 优化搜索和操作栏 - 添加搜索状态指示器 */}
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} lg={12}>
            <Search
              placeholder={getSearchPlaceholder()}
              allowClear
              size="large"
              value={searchKeyword}
              onChange={(e) => handleSearch(e.target.value)}
              onSearch={handleSearch}
              suffix={searchLoading ? <LoadingOutlined style={{ color: '#1890ff' }} /> : undefined}
              enterButton={
                <Tooltip title="支持姓名、学校、家长、电话、拼音首字母搜索">
                  <SearchOutlined />
                </Tooltip>
              }
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
                onClick={() => navigate('/crm/new')}
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
                新建客户
              </Button>
              
              <Space size="middle" style={{ 
                width: isMobile ? '100%' : 'auto',
                justifyContent: isMobile ? 'space-between' : 'flex-end'
              }}>
                <Upload
                  accept=".csv"
                  showUploadList={false}
                  beforeUpload={handleImport}
                >
                  <Button 
                    icon={<UploadOutlined />} 
                    size={isMobile ? 'middle' : 'middle'}
                    style={{ 
                      borderRadius: '6px',
                      flex: isMobile ? 1 : 'none'
                    }}
                  >
                    {isMobile ? '导入' : '导入数据'}
                  </Button>
                </Upload>
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
          {/* 左侧筛选导航区 */}
          <Col xs={24} md={8} lg={6}>
            <Card title="筛选客户" style={{ height: '100%' }}>
              <Menu
                mode="vertical"
                selectedKeys={[selectedStatus]}
                items={filterMenuItems}
                onClick={({ key }) => handleStatusFilter(key)}
                style={{ 
                  border: 'none', 
                  fontSize: isMobile ? '14px' : '16px'
                }}
              />
            </Card>
          </Col>

          {/* 右侧客户列表区 */}
          <Col xs={24} md={16} lg={18}>
            <Card 
              title={
                <Space>
                  <span style={{ fontSize: isMobile ? '14px' : '16px' }}>
                    {CUSTOMER_STATUS_LABELS[selectedStatus]?.label || '客户列表'}
                  </span>
                  {debouncedSearchKeyword && (
                    <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px' }}>
                      (搜索: "{debouncedSearchKeyword}")
                    </Text>
                  )}
                  {searchLoading && (
                    <LoadingOutlined style={{ color: '#1890ff', fontSize: '14px' }} />
                  )}
                </Space>
              }
              extra={
                selectedRowKeys.length > 0 && (
                  <Space>
                    <Text style={{ fontSize: isMobile ? '12px' : '14px' }}>
                      已选择 {selectedRowKeys.length} 位
                    </Text>
                    <Button 
                      danger 
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={handleBatchDelete}
                    >
                      {isMobile ? '删除' : '批量删除'}
                    </Button>
                  </Space>
                )
              }
              style={{ height: '100%' }}
            >
              <Table<Customer>
                columns={columns}
                dataSource={customers}
                rowKey="id"
                loading={loading}
                scroll={{ x: 800 }}
                size={isMobile ? 'small' : 'middle'}
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: customers.length,
                  showSizeChanger: true,
                  pageSizeOptions: ['15', '30', '60'],
                  showQuickJumper: true,
                  showTotal: (total) => `共 ${total} 条`,
                  onChange: handlePaginationChange,
                }}
                rowSelection={{
                  selectedRowKeys,
                  onChange: handleRowSelectionChange,
                  getCheckboxProps: (record: Customer) => ({
                    name: record.name,
                  }),
                }}
                locale={{
                  emptyText: debouncedSearchKeyword 
                    ? `未找到匹配的客户` 
                    : selectedStatus === 'all' 
                      ? '暂无客户数据'
                      : `暂无${CUSTOMER_STATUS_LABELS[selectedStatus]?.label}`
                }}
              />
              
              {/* 轻量统计信息 */}
              {customers.length > 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  marginTop: '16px', 
                  padding: '8px 0',
                  color: '#8c8c8c',
                  fontSize: '12px',
                  borderTop: '1px solid #f0f0f0'
                }}>
                  当前显示 {customers.length} 条记录
                  {stats?.totalCustomers && ` / 共 ${stats.totalCustomers} 位客户`}
                  {debouncedSearchKeyword && /^[a-zA-Z]+$/.test(debouncedSearchKeyword) && (
                    <span style={{ marginLeft: '8px', color: '#1890ff' }}>
                      · 包含拼音匹配
                    </span>
                  )}
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default CrmPage; 