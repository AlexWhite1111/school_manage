import AppButton from '@/components/AppButton';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Typography, Row, Col, Input, Table, Menu, Space, Statistic, Modal, Upload, Dropdown, Tag, App, Tooltip, Card, theme as themeApi } from 'antd';
import AppSearchInput from '@/components/common/AppSearchInput';
import { UnifiedCardPresets } from '@/theme/card';
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
import { CUSTOMER_STATUS_META, getCustomerStatusColor, getCustomerStatusLabel } from '@/config/analyticsColors';

const { Title, Text } = Typography;
const { Search } = Input;
const { confirm } = Modal;
const { useApp } = App;

// 客户状态映射：统一引用全局配置
const CUSTOMER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  all: { label: '总客户', color: 'var(--ant-color-primary)' },
  POTENTIAL: CUSTOMER_STATUS_META.POTENTIAL,
  INITIAL_CONTACT: CUSTOMER_STATUS_META.INITIAL_CONTACT,
  INTERESTED: CUSTOMER_STATUS_META.INTERESTED,
  TRIAL_CLASS: CUSTOMER_STATUS_META.TRIAL_CLASS,
  ENROLLED: CUSTOMER_STATUS_META.ENROLLED,
  LOST: CUSTOMER_STATUS_META.LOST,
};

const CrmPage: React.FC = () => {
  const navigate = useNavigate();
  const { message: antMessage } = useApp();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const { token } = themeApi.useToken();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageGap = isMobile ? 12 : 24;
  const sectionGutter: [number, number] = isMobile ? [8, 8] : [16, 16];
  const compactBtnH = isMobile ? 36 : 40;
  
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
      antMessage.success(`客户 ${customerName} 的状态已更新为 ${getCustomerStatusLabel(newStatus)}`);
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

  // 供移动端菜单触发文件选择
  const triggerImport = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

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
    <AppButton 
      hierarchy="link" 
      onClick={() => handleViewCustomer(record)}
      style={{ padding: 0, height: 'auto' }}
    >
      {name}
    </AppButton>
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

  const renderCustomerStatus = useCallback((status: CustomerStatus) => (
    <Tag color={getCustomerStatusColor(status)}>
      {getCustomerStatusLabel(status)}
    </Tag>
  ), []);

  const renderActions = useCallback((_: any, record: Customer) => (
    <Dropdown 
      menu={{ items: getCustomerActions(record) }}
      trigger={['click']}
      placement="bottomRight"
    >
      <AppButton 
        hierarchy="tertiary" 
        icon={<MoreOutlined />}
        size="small"
        style={{ padding: 0, width: 28, height: 28 }}
      />
    </Dropdown>
  ), [getCustomerActions]);

  // 表格列定义
  const columns: TableColumnsType<Customer> = useMemo(() => [
    {
      title: '客户姓名',
      dataIndex: 'name',
      key: 'name',
      width: isMobile ? 120 : 120,
      ellipsis: true,
      render: renderCustomerName
    },
    {
      title: '学校',
      dataIndex: 'school',
      key: 'school',
      width: isMobile ? 100 : 150,
      ellipsis: true,
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
      title: isMobile ? '' : '操作',
      key: 'actions',
      width: isMobile ? 44 : 100,
      fixed: 'right',
      align: 'right' as const,
      render: renderActions
    }
  ], [renderCustomerName, renderSchoolOrGrade, renderGrade, renderSourceChannel, renderParentName, renderParentPhone, renderCustomerStatus, renderActions, isMobile]);

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

  // 手机端筛选按钮顺序（3x2）
  const statusKeysForGrid: Array<keyof typeof CUSTOMER_STATUS_LABELS> = [
    'POTENTIAL', 'INITIAL_CONTACT', 'INTERESTED',
    'TRIAL_CLASS', 'ENROLLED', 'LOST'
  ];

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
    <div data-page-container>
      <Space direction="vertical" size={pageGap} style={{ width: '100%' }}>
        {/* 页面标题 */}
        <div>
          <Title level={2} style={{ margin: 0, marginBottom: '8px' }}>
            客户管理
          </Title>
          {!isMobile && (
            <Text type="secondary">
              管理客户档案、跟进记录和业务状态
            </Text>
          )}
        </div>

        {/* 数据看板 */}
          {isMobile ? (() => { const preset = UnifiedCardPresets.mobileCompact(isMobile); return (
           <Card style={preset.style} styles={preset.styles}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, color: token.colorPrimary }}><TeamOutlined /></div>
                <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.1 }}>{stats?.totalCustomers || 0}</div>
                <div style={{ fontSize: 9, color: token.colorTextTertiary }}>总</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.1, color: token.colorSuccess }}>{stats?.monthlyNewCustomers || 0}</div>
                <div style={{ fontSize: 9, color: token.colorTextTertiary }}>新增</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.1, color: token.colorPrimary }}>{stats?.statusCounts?.ENROLLED || 0}</div>
                <div style={{ fontSize: 9, color: token.colorTextTertiary }}>报名</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.1, color: token.colorSuccess }}>{stats?.statusCounts?.INTERESTED || 0}</div>
                <div style={{ fontSize: 9, color: token.colorTextTertiary }}>意向</div>
              </div>
            </div>
          </Card> ); })() : (
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6} lg={6}>
               {(() => { const preset = UnifiedCardPresets.desktopDefault(isMobile); return (
               <Card style={preset.style} styles={preset.styles}>
                <Statistic
                  title="总客户数"
                  value={stats?.totalCustomers || 0}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: token.colorPrimary, fontSize: 24 }}
                />
              </Card> ); })()}
            </Col>
            <Col xs={12} sm={6} lg={6}>
               {(() => { const preset = UnifiedCardPresets.desktopDefault(isMobile); return (
               <Card style={preset.style} styles={preset.styles}>
                <Statistic
                  title="本月新增"
                  value={stats?.monthlyNewCustomers || 0}
                  valueStyle={{ color: token.colorSuccess, fontSize: 24 }}
                />
              </Card> ); })()}
            </Col>
            <Col xs={12} sm={6} lg={6}>
               {(() => { const preset = UnifiedCardPresets.desktopDefault(isMobile); return (
               <Card style={preset.style} styles={preset.styles}>
                <Statistic
                  title="已报名"
                  value={stats?.statusCounts?.ENROLLED || 0}
                  valueStyle={{ color: token.colorPrimary, fontSize: 24 }}
                />
              </Card> ); })()}
            </Col>
            <Col xs={12} sm={6} lg={6}>
               {(() => { const preset = UnifiedCardPresets.desktopDefault(isMobile); return (
               <Card style={preset.style} styles={preset.styles}>
                <Statistic
                  title="意向用户"
                  value={stats?.statusCounts?.INTERESTED || 0}
                  valueStyle={{ color: token.colorSuccess, fontSize: 24 }}
                />
              </Card> ); })()}
            </Col>
          </Row>
        )}

        {/* 🚀 优化搜索和操作栏 - 添加搜索状态指示器 */}
        <Row gutter={sectionGutter} align="middle">
          <Col xs={24} lg={12}>
            <AppSearchInput
              placeholder={getSearchPlaceholder()}
              value={searchKeyword}
              onChange={(v) => handleSearch(v)}
              onSearch={handleSearch}
              loading={searchLoading}
              size={isMobile ? 'middle' : 'large'}
            />
          </Col>
          <Col xs={24} lg={12}>
            {isMobile ? (
              <></>
            ) : (
              <div style={{ 
                display: 'flex', 
                justifyContent: !isDesktop ? 'center' : 'flex-end',
                flexDirection: 'row',
                gap: 'var(--space-4)',
                alignItems: 'center'
              }}>
                <AppButton 
                  hierarchy="primary"
                  icon={<PlusOutlined />}
                  size={'large'}
                  onClick={() => navigate('/crm/new')}
                  style={{ 
                    borderRadius: 'var(--radius-md)',
                    fontWeight: 600,
                    height: '48px',
                    paddingLeft: 'var(--space-6)',
                    paddingRight: 'var(--space-6)'
                  }}
                >
                  新建客户
                </AppButton>
                <Upload
                  accept=".csv"
                  showUploadList={false}
                  beforeUpload={handleImport}
                >
                  <AppButton 
                    icon={<UploadOutlined />} 
                    size={'middle'}
                    style={{ borderRadius: 'var(--radius-sm)' }}
                  >
                    导入数据
                  </AppButton>
                </Upload>
                <AppButton 
                  icon={<DownloadOutlined />}
                  onClick={handleExport}
                  size={'middle'}
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  导出数据
                </AppButton>
              </div>
            )}
          </Col>
        </Row>

        {/* 主内容区 */}
        <Row gutter={[24, 24]} style={{ minHeight: '500px' }}>
          {/* 左侧筛选导航区（手机端网格，桌面端菜单） */}
          <Col xs={24} md={8} lg={6}>
            {(() => { const preset = UnifiedCardPresets.mobileCompact(isMobile); return (
            <Card 
              title={
                isMobile ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span>筛选客户</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: -4 }}>
                      <AppButton
                        hierarchy="tertiary"
                        shape="circle"
                        icon={<PlusOutlined />}
                        onClick={() => navigate('/crm/new')}
                        style={{ width: 34, height: 34, color: token.colorPrimary }}
                        title="新建客户"
                      />
                      <Dropdown
                        menu={{
                          items: [
                            { key: 'import', label: '导入', icon: <UploadOutlined /> },
                            { key: 'export', label: '导出', icon: <DownloadOutlined /> },
                          ],
                          onClick: ({ key }) => {
                            if (key === 'import') triggerImport();
                            if (key === 'export') handleExport();
                          }
                        }}
                        placement="bottomRight"
                      >
                        <AppButton hierarchy="tertiary" shape="circle" icon={<MoreOutlined />} style={{ width: 34, height: 34, color: token.colorTextSecondary }} />
                      </Dropdown>
                    </div>
                  </div>
                ) : '筛选客户'
              }
              style={{ height: '100%', ...preset.style }}
            >
              {isMobile ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                  {/* 顶部总客户 - 大横条 */}
                  <AppButton
                    key={'all'}
                    hierarchy={selectedStatus === 'all' ? 'primary' : 'secondary'}
                    onClick={() => handleStatusFilter('all')}
                    style={{ height: 40, fontWeight: 600 }}
                  >
                    总客户 ({stats?.totalCustomers || 0})
                  </AppButton>
                  {/* 六个小分类 3x2 动态适配 */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: 8,
                    }}
                  >
                  {statusKeysForGrid.map((k) => (
                    <AppButton
                      key={k}
                      hierarchy={selectedStatus === k ? 'primary' : 'secondary'}
                      onClick={() => handleStatusFilter(k)}
                      style={{ height: compactBtnH, padding: '0 8px' }}
                    >
                      {CUSTOMER_STATUS_LABELS[k].label} ({stats?.statusCounts?.[k as unknown as CustomerStatus] || 0})
                    </AppButton>
                  ))}
                  </div>
                </div>
              ) : (
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
              )}
            </Card>
            ); })()}
          </Col>

          {/* 右侧客户列表区 */}
          <Col xs={24} md={16} lg={18}>
            {(() => { const preset = UnifiedCardPresets.mobileCompact(isMobile); return (
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
                    <LoadingOutlined style={{ color: 'var(--ant-color-primary)', fontSize: '14px' }} />
                  )}
                </Space>
              }
              extra={
                selectedRowKeys.length > 0 && (
                  <Space>
                    <Text style={{ fontSize: isMobile ? '12px' : '14px' }}>
                      已选择 {selectedRowKeys.length} 位
                    </Text>
                    <AppButton 
                      danger 
                      size="sm"
                      icon={<DeleteOutlined />}
                      onClick={handleBatchDelete}
                    >
                      {isMobile ? '删除' : '批量删除'}
                    </AppButton>
                  </Space>
                )
              }
              style={{ height: '100%', ...preset.style }}
            >
              <Table<Customer>
                columns={columns}
                dataSource={customers}
                rowKey="id"
                loading={loading}
                 scroll={{ x: 520 }}
                size={'small'}
                pagination={{
                  current: pagination.current,
                  pageSize: pagination.pageSize,
                  total: customers.length,
                  showSizeChanger: !isMobile,
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
                rowClassName={() => 'crm-row-compact'}
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
                  color: 'var(--ant-color-text-secondary)',
                  fontSize: '12px',
                  borderTop: '1px solid #f0f0f0'
                }}>
                  当前显示 {customers.length} 条记录
                  {stats?.totalCustomers && ` / 共 ${stats.totalCustomers} 位客户`}
                  {debouncedSearchKeyword && /^[a-zA-Z]+$/.test(debouncedSearchKeyword) && (
                    <span style={{ marginLeft: '8px', color: 'var(--ant-color-primary)' }}>
                      · 包含拼音匹配
                    </span>
                  )}
                </div>
              )}
            </Card>
            ); })()}
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default CrmPage; 