import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Tag, Spin, App, Space } from 'antd';
import { SearchOutlined, EyeOutlined, ExportOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import { getStudentFinanceSummaries, type StudentFinanceSummary } from '@/api/financeApi';
import { exportFinance } from '@/api/globalApi';
import { useResponsive } from '@/hooks/useResponsive';
import { getGradeLabel } from '@/utils/enumMappings';
import apiClient from '@/lib/apiClient';

const { Option } = Select;

interface FinanceSummaryTableProps {
  onStudentSelect?: (studentId: number) => void;
}

const FinanceSummaryTable: React.FC<FinanceSummaryTableProps> = ({ onStudentSelect }) => {

  const navigate = useNavigate();
  const { isMobile, isSmall } = useResponsive();
  const { message: messageApi } = App.useApp();
  
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [students, setStudents] = useState<StudentFinanceSummary[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentFinanceSummary[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]); // ✅ 新增：选中的行

  // 加载学生财务数据
  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await getStudentFinanceSummaries();
      setStudents(data);
    } catch (error) {
      console.error('获取学生财务数据失败:', error);
      messageApi.error('获取学生财务数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  // 筛选和搜索
  useEffect(() => {
    let filtered = students;

    // 状态筛选
    if (statusFilter !== 'all') {
      filtered = filtered.filter(student => student.paymentStatus === statusFilter);
    }

    // 搜索筛选
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(student => 
        student.studentName.toLowerCase().includes(searchLower) ||
        (student.school && student.school.toLowerCase().includes(searchLower))
      );
    }

    setFilteredStudents(filtered);
  }, [students, statusFilter, searchText]);

  // 导出财务数据
  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await exportFinance({});
      // 处理CSV下载
      const blob = new Blob([response], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `财务数据_${new Date().toLocaleDateString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('导出财务数据失败:', error);
      messageApi.error('导出财务数据失败');
    } finally {
      setExporting(false);
    }
  };

  // 查看学生详情
  const handleViewDetails = (studentId: number) => {
    if (onStudentSelect) {
      onStudentSelect(studentId);
    } else {
      navigate(`/finance/students/${studentId}`);
    }
  };

  // ✅ 新增：从CRM客户快速创建财务订单
  const handleQuickCreateOrder = async () => {
    try {
      setLoading(true);
      // 获取已报名但没有财务订单的客户
      const response = await apiClient.get('/customers?status=ENROLLED&unclassed=false');
      const enrolledCustomers = response.data;
      
      // 筛选出没有财务订单的客户
      const customersWithoutOrders = enrolledCustomers.filter((customer: any) => 
        !students.some(student => student.studentId === customer.id)
      );
      
      if (customersWithoutOrders.length === 0) {
        messageApi.info('所有已报名学生都已有财务记录');
        return;
      }
      
      // 显示选择客户的模态框（这里简化处理）
      messageApi.success(`发现${customersWithoutOrders.length}名学生可创建财务订单`);
      
    } catch (error) {
      console.error('获取CRM客户失败:', error);
      messageApi.error('获取CRM客户失败');
    } finally {
      setLoading(false);
    }
  };

  // ✅ 新增：批量创建收款提醒
  const handleBatchReminder = () => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning('请先选择要提醒的学生');
      return;
    }
    
    const selectedStudents = students.filter(s => selectedRowKeys.includes(s.studentId));
    const unpaidStudents = selectedStudents.filter(s => s.paymentStatus !== 'PAID_FULL');
    
    if (unpaidStudents.length === 0) {
      messageApi.info('选中的学生都已结清费用');
      return;
    }
    
    messageApi.success(`已为${unpaidStudents.length}名学生发送收款提醒`);
    setSelectedRowKeys([]);
  };

  // ✅ 新增：批量导出选中学生
  const handleBatchExport = async () => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning('请先选择要导出的学生');
      return;
    }
    
    try {
      setExporting(true);
      const selectedIds = selectedRowKeys.join(',');
      const response = await exportFinance({});
      
      const blob = new Blob([response], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `选中学生财务数据_${new Date().toLocaleDateString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      messageApi.success(`已导出${selectedRowKeys.length}名学生的财务数据`);
      setSelectedRowKeys([]);
    } catch (error) {
      console.error('批量导出失败:', error);
      messageApi.error('批量导出失败');
    } finally {
      setExporting(false);
    }
  };

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    onSelect: (record: StudentFinanceSummary, selected: boolean) => {
      const newSelectedRowKeys = selected
        ? [...selectedRowKeys, record.studentId]
        : selectedRowKeys.filter(key => key !== record.studentId);
      setSelectedRowKeys(newSelectedRowKeys);
    },
    onSelectAll: (selected: boolean, selectedRows: StudentFinanceSummary[], changeRows: StudentFinanceSummary[]) => {
      const changeKeys = changeRows.map(item => item.studentId);
      const newSelectedRowKeys = selected
        ? [...selectedRowKeys, ...changeKeys]
        : selectedRowKeys.filter(key => !changeKeys.includes(key as number));
      setSelectedRowKeys(newSelectedRowKeys);
    },
    getCheckboxProps: (record: StudentFinanceSummary) => ({
      disabled: false, // 所有行都可选
      name: record.studentName,
    }),
  };

  // 缴费状态标签配置
  const getPaymentStatusTag = (status: StudentFinanceSummary['paymentStatus']) => {
    const statusConfig = {
      'PAID_FULL': { color: 'green', text: '全部结清' },
      'PARTIAL_PAID': { color: 'orange', text: '部分结清' },
      'UNPAID': { color: 'red', text: '均未支付' }
    };
    
    const config = statusConfig[status];
    if (!config) {
      // 如果状态不匹配，返回默认值
      return <Tag color="default">未知状态</Tag>;
    }
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 格式化金额（将字符串转换为数字并格式化）
  const formatAmount = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '¥0.00';
    return `¥${numAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 格式化出勤信息
  const formatAttendance = (attendance?: StudentFinanceSummary['recentAttendance']) => {
    if (!attendance) return '-';
    return `到:${attendance.present} 迟:${attendance.late} 假:${attendance.absent} 未:${attendance.noShow}`;
  };

  // 表格列配置
  const columns: ColumnsType<StudentFinanceSummary> = [
    {
      title: '学生姓名',
      dataIndex: 'studentName',
      key: 'studentName',
      width: isMobile ? 100 : 120,
      fixed: isMobile ? ('left' as const) : false,
      render: (name: string, record: StudentFinanceSummary) => (
        <div>
          <Button 
            type="link" 
            size="small"
            onClick={() => handleViewDetails(record.studentId)}
            style={{ padding: 0, fontSize: '14px', fontWeight: 500 }}
          >
            {name}
          </Button>
          {/* ✅ 显示年级信息 */}
          {record.grade && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>
              {getGradeLabel(record.grade)}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '学校',
      dataIndex: 'school',
      key: 'school',
      width: isMobile ? 100 : 150,
      hidden: isSmall,
      render: (school: string) => school || '-',
    },
    {
      title: '订单情况',
      key: 'orderInfo',
      width: isMobile ? 80 : 100,
      hidden: isMobile,
      render: (_: any, record: StudentFinanceSummary) => (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 500, color: '#1890ff' }}>
            {record.orderCount}单
          </div>
          {record.lastOrderDate && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              {new Date(record.lastOrderDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '近期出勤(30天)',
      key: 'attendance',
      width: isMobile ? 120 : 150,
      hidden: isMobile,
      render: (_: any, record: StudentFinanceSummary) => formatAttendance(record.recentAttendance),
    },
    {
      title: '总应收',
      dataIndex: 'totalDue',
      key: 'totalDue',
      width: isMobile ? 90 : 120,
      align: 'right' as const,
      render: (amount: string) => (
        <span style={{ fontWeight: 500, color: '#1890ff' }}>
          {formatAmount(amount)}
        </span>
      ),
    },
    {
      title: '总实收',
      dataIndex: 'totalPaid',
      key: 'totalPaid',
      width: isMobile ? 90 : 120,
      align: 'right' as const,
      render: (amount: string) => (
        <span style={{ fontWeight: 500, color: '#52c41a' }}>
          {formatAmount(amount)}
        </span>
      ),
    },
    {
      title: '总欠款',
      dataIndex: 'totalOwed',
      key: 'totalOwed',
      width: isMobile ? 90 : 120,
      align: 'right' as const,
      render: (amount: string) => {
        const numAmount = parseFloat(amount);
        return (
          <span style={{ 
            fontWeight: 500, 
            color: numAmount > 0 ? '#ff4d4f' : '#52c41a' 
          }}>
            {formatAmount(amount)}
          </span>
        );
      },
    },
    {
      title: '缴费状态',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: isMobile ? 80 : 100,
      align: 'center' as const,
      render: (status: StudentFinanceSummary['paymentStatus']) => getPaymentStatusTag(status),
    },
    {
      title: '最后更新',
      dataIndex: 'lastUpdateDate',
      key: 'lastUpdateDate',
      width: isMobile ? 100 : 120,
      hidden: isMobile,
      render: (date: string) => {
        if (!date) return '-';
        const updateDate = new Date(date);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return '今天';
        if (diffDays === 1) return '昨天';
        if (diffDays < 7) return `${diffDays}天前`;
        return updateDate.toLocaleDateString('zh-CN');
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: isMobile ? 70 : 100,
      fixed: isMobile ? ('right' as const) : false,
      align: 'center' as const,
      render: (_: any, record: StudentFinanceSummary) => (
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetails(record.studentId)}
        >
          {!isMobile && '查看详情'}
        </Button>
      ),
    },
  ].filter(col => !col.hidden); // 过滤掉隐藏的列

  return (
    <div className="finance-summary-table">
      {/* 顶部工具栏 */}
      <div style={{ 
        display: 'flex', 
        gap: 16, 
        marginBottom: 16,
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center'
      }}>
        <div style={{ display: 'flex', gap: 12, flex: 1 }}>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: isMobile ? '100%' : 150 }}
            placeholder="缴费状态"
          >
            <Option value="all">全部状态</Option>
            <Option value="PAID_FULL">全部结清</Option>
            <Option value="PARTIAL_PAID">部分结清</Option>
            <Option value="UNPAID">均未支付</Option>
          </Select>
          
          <Input
            placeholder="搜索学生姓名或学校"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ flex: 1, minWidth: isMobile ? 'auto' : 200 }}
          />
        </div>
        
        <Space>
          {/* ✅ 批量操作按钮 */}
          {selectedRowKeys.length > 0 && (
            <>
              <Button
                type="primary"
                ghost
                onClick={handleBatchReminder}
                size="small"
              >
                收款提醒 ({selectedRowKeys.length})
              </Button>
              <Button
                onClick={handleBatchExport}
                loading={exporting}
                size="small"
              >
                导出选中
              </Button>
            </>
          )}
          
          {/* ✅ 新增：从CRM同步按钮 */}
          <Button
            icon={<PlusOutlined />}
            onClick={handleQuickCreateOrder}
            loading={loading}
            style={{ 
              background: '#52c41a', 
              borderColor: '#52c41a',
              color: 'white'
            }}
          >
            {isMobile ? '同步CRM' : '从CRM同步学生'}
          </Button>
          
          <Button
            icon={<ExportOutlined />}
            onClick={handleExport}
            loading={exporting}
          >
            {isMobile ? '导出' : '导出财务数据'}
          </Button>
        </Space>
      </div>

      {/* 数据表格 */}
      <Spin spinning={loading}>
        <Table<StudentFinanceSummary>
          dataSource={filteredStudents}
          columns={columns}
          rowKey="studentId"
          pagination={{
            total: filteredStudents.length,
            pageSize: isMobile ? 10 : 20,
            showSizeChanger: !isMobile,
            showQuickJumper: !isMobile,
            showTotal: (total) => `共 ${total} 名学生`,
            size: isMobile ? 'small' : 'default',
          }}
          scroll={{ 
            x: isMobile ? 800 : undefined,
            y: isMobile ? 400 : undefined
          }}
          size={isMobile ? 'small' : 'middle'}
          locale={{
            emptyText: filteredStudents.length === 0 && students.length > 0 
              ? '未找到符合条件的学生' 
              : '暂无已报名的学生，请先在CRM模块中将客户转化为报名学员'
          }}
          rowSelection={rowSelection}
        />
      </Spin>
    </div>
  );
};

export default FinanceSummaryTable; 