import AppButton from '@/components/AppButton';
import React, { useState, useEffect } from 'react';
import { Table, Space, Tag, Modal, Form, Input, InputNumber, message, Popconfirm, Spin, Typography, Row, Col, Divider, Empty, App, Card, Dropdown, DatePicker } from 'antd';
import UnifiedRangePicker from '@/components/common/UnifiedRangePicker';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  DownOutlined, 
  UpOutlined,
  FileTextOutlined,
  
  MoreOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getStudentFinanceDetails,
  getStudentFinanceDetailsByPublicId,
  createOrder,
  updateOrder,
  deleteOrder,
  addPaymentToOrder,
  updatePayment,
  deletePayment,
  type StudentFinanceDetails,
  type FinancialOrder,
  type Payment,
  type CreateOrderRequest,
  type UpdateOrderRequest,
  type CreatePaymentRequest,
  type UpdatePaymentRequest
} from '@/api/financeApi';
import { useResponsive } from '@/hooks/useResponsive';
import { getGradeLabel } from '@/utils/enumMappings';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface FinanceDetailViewProps {
  studentId?: number;
  studentPublicId?: string;
  onBack?: () => void;
}

const FinanceDetailView: React.FC<FinanceDetailViewProps> = ({ studentId, studentPublicId, onBack }) => {
  const { isMobile } = useResponsive();
  const { message: messageApi } = App.useApp();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState<StudentFinanceDetails | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<number[]>([]);
  
  // CSS样式注入 - 支持暗色主题
  const injectStyles = () => {
    const styleId = 'finance-detail-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .parent-info-card {
        background: var(--ant-color-fill-quaternary, rgba(0, 0, 0, 0.02));
        border: 1px solid var(--ant-color-border-secondary, rgba(5, 5, 5, 0.06));
      }
      
      .finance-student-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      }
      
      [data-theme="dark"] .parent-info-card {
        background: rgba(255, 255, 255, 0.04);
        border-color: rgba(255, 255, 255, 0.12);
      }
      
      [data-theme="dark"] .finance-student-card:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      }
    `;
    document.head.appendChild(style);
  };
  
  // 注入样式
  React.useEffect(() => {
    injectStyles();
  }, []);
  
  // 模态框状态
  const [createOrderVisible, setCreateOrderVisible] = useState(false);
  const [editOrderVisible, setEditOrderVisible] = useState(false);
  const [addPaymentVisible, setAddPaymentVisible] = useState(false);
  const [editPaymentVisible, setEditPaymentVisible] = useState(false);
  
  // 当前编辑的数据
  const [currentOrder, setCurrentOrder] = useState<FinancialOrder | null>(null);
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null);
  
  // 表单实例
  const [createOrderForm] = Form.useForm();
  const [editOrderForm] = Form.useForm();
  const [addPaymentForm] = Form.useForm();
  const [editPaymentForm] = Form.useForm();

  // 获取学生财务详情
  const loadStudentData = async () => {
    if (!studentId && !studentPublicId) return;
    
    setLoading(true);
    try {
      let data: StudentFinanceDetails;
      
      if (studentPublicId) {
        data = await getStudentFinanceDetailsByPublicId(studentPublicId);
      } else if (studentId) {
        data = await getStudentFinanceDetails(String(studentId));
      } else {
        return;
      }
      
      setStudentData(data);
    } catch (error) {
      console.error('获取学生财务详情失败:', error);
      messageApi.error('获取学生财务详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [studentId, studentPublicId]);

  // 格式化金额（处理字符串格式的Decimal）
  const formatAmount = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '¥0.00';
    return `¥${numAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 获取订单状态标签
  const getOrderStatusTag = (order: FinancialOrder) => {
    const statusConfig = {
      'PAID_FULL': { color: 'green', text: '已付清' },
      'PARTIAL_PAID': { color: 'orange', text: '部分支付' },
      'UNPAID': { color: 'red', text: '未支付' }
    };
    
    const config = statusConfig[order.orderStatus];
    if (!config) {
      return <Tag color="default">未知状态</Tag>;
    }
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 计算财务概览（从订单数据计算）
  const calculateFinancialSummary = (orders: FinancialOrder[]) => {
    let totalDue = 0;
    let totalPaid = 0;
    
    orders.forEach(order => {
      totalDue += parseFloat(order.totalDue) || 0;
      totalPaid += parseFloat(order.totalPaid) || 0;
    });
    
    const totalOwed = totalDue - totalPaid;
    
    let paymentStatus: 'PAID_FULL' | 'PARTIAL_PAID' | 'UNPAID' = 'UNPAID';
    if (totalOwed <= 0) {
      paymentStatus = 'PAID_FULL';
    } else if (totalPaid > 0) {
      paymentStatus = 'PARTIAL_PAID';
    }
    
    return {
      totalDue: totalDue.toString(),
      totalPaid: totalPaid.toString(),
      totalOwed: totalOwed.toString(),
      paymentStatus
    };
  };

  // 创建订单
  const handleCreateOrder = async (values: any) => {
    if (!studentData?.student?.publicId) return;
    
    try {
      const orderData: CreateOrderRequest = {
        publicId: studentData.student.publicId,
        // 兼容可选
        studentId: studentData.student.id,
        name: values.name,
        totalDue: values.totalDue,
        coursePeriodStart: values.coursePeriod?.[0]?.format('YYYY-MM-DD'),
        coursePeriodEnd: values.coursePeriod?.[1]?.format('YYYY-MM-DD'),
        dueDate: values.dueDate?.format('YYYY-MM-DD'),
      };
      
      await createOrder(orderData);
      messageApi.success('订单创建成功');
      setCreateOrderVisible(false);
      createOrderForm.resetFields();
      loadStudentData(); // 刷新数据
    } catch (error: any) {
      console.error('创建订单失败:', error);
      const msg = error?.response?.data?.message || error?.message || '创建订单失败';
      messageApi.error(msg);
    }
  };

  // 编辑订单
  const handleEditOrder = (order: FinancialOrder) => {
    setCurrentOrder(order);
    editOrderForm.setFieldsValue({
      name: order.name,
      totalDue: parseFloat(order.totalDue),
      coursePeriod: order.coursePeriodStart && order.coursePeriodEnd 
        ? [dayjs(order.coursePeriodStart), dayjs(order.coursePeriodEnd)]
        : undefined,
      dueDate: order.dueDate ? dayjs(order.dueDate) : undefined,
    });
    setEditOrderVisible(true);
  };

  // 更新订单
  const handleUpdateOrder = async (values: any) => {
    if (!currentOrder) return;
    
    try {
      const orderData: UpdateOrderRequest = {
        name: values.name,
        totalDue: values.totalDue,
        coursePeriodStart: values.coursePeriod?.[0]?.format('YYYY-MM-DD'),
        coursePeriodEnd: values.coursePeriod?.[1]?.format('YYYY-MM-DD'),
        dueDate: values.dueDate?.format('YYYY-MM-DD'),
      };
      
      await updateOrder(currentOrder.id, orderData);
      messageApi.success('订单更新成功');
      setEditOrderVisible(false);
      editOrderForm.resetFields();
      setCurrentOrder(null);
      loadStudentData(); // 刷新数据
    } catch (error) {
      console.error('更新订单失败:', error);
      messageApi.error('更新订单失败');
    }
  };

  // 删除订单
  const handleDeleteOrder = async (orderId: number) => {
    try {
      await deleteOrder(orderId);
      messageApi.success('订单删除成功');
      loadStudentData(); // 刷新数据
    } catch (error) {
      console.error('删除订单失败:', error);
      messageApi.error('删除订单失败');
    }
  };

  // 添加收款记录
  const handleAddPayment = (order: FinancialOrder) => {
    setCurrentOrder(order);
    const remainingAmount = parseFloat(order.remainingAmount) || 0;
    addPaymentForm.setFieldsValue({
      paymentDate: dayjs(),
      amount: remainingAmount > 0 ? remainingAmount : undefined,
    });
    setAddPaymentVisible(true);
  };

  // 提交收款记录
  const handleCreatePayment = async (values: any) => {
    if (!currentOrder) return;
    
    try {
      const paymentData: CreatePaymentRequest = {
        amount: values.amount,
        paymentDate: values.paymentDate.format('YYYY-MM-DD'),
        notes: values.notes,
      };
      
      await addPaymentToOrder(currentOrder.id, paymentData);
      messageApi.success('收款记录添加成功');
      setAddPaymentVisible(false);
      addPaymentForm.resetFields();
      setCurrentOrder(null);
      loadStudentData(); // 刷新数据
    } catch (error) {
      console.error('添加收款记录失败:', error);
      messageApi.error('添加收款记录失败');
    }
  };

  // 编辑收款记录
  const handleEditPayment = (payment: Payment) => {
    setCurrentPayment(payment);
    editPaymentForm.setFieldsValue({
      amount: parseFloat(payment.amount),
      paymentDate: dayjs(payment.paymentDate),
      notes: payment.notes,
    });
    setEditPaymentVisible(true);
  };

  // 更新收款记录
  const handleUpdatePayment = async (values: any) => {
    if (!currentPayment) return;
    
    try {
      const paymentData: UpdatePaymentRequest = {
        amount: values.amount,
        paymentDate: values.paymentDate.format('YYYY-MM-DD'),
        notes: values.notes,
      };
      
      await updatePayment(currentPayment.id, paymentData);
      messageApi.success('收款记录更新成功');
      setEditPaymentVisible(false);
      editPaymentForm.resetFields();
      setCurrentPayment(null);
      loadStudentData(); // 刷新数据
    } catch (error) {
      console.error('更新收款记录失败:', error);
      messageApi.error('更新收款记录失败');
    }
  };

  // 删除收款记录
  const handleDeletePayment = async (paymentId: number) => {
    try {
      await deletePayment(paymentId);
      messageApi.success('收款记录删除成功');
      loadStudentData(); // 刷新数据
    } catch (error) {
      console.error('删除收款记录失败:', error);
      messageApi.error('删除收款记录失败');
    }
  };

  // 收款记录表格列配置
  const paymentColumns: ColumnsType<Payment> = [
    {
      title: '收款日期',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      width: isMobile ? 100 : 120,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: isMobile ? 80 : 100,
      align: 'right' as const,
      render: (amount: string) => (
        <span style={{ fontWeight: 500, color: 'var(--ant-color-success)' }}>
          {formatAmount(amount)}
        </span>
      ),
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (notes: string) => notes || '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: isMobile ? 100 : 120,
      render: (_: any, payment: Payment) => (
        <Space size="small">
          <AppButton
            hierarchy="tertiary"
            size="sm"
            icon={<EditOutlined />}
            onClick={() => handleEditPayment(payment)}
          />
          <Popconfirm
            title="确定要删除这条收款记录吗？"
            description="删除后将更新订单状态"
            onConfirm={() => handleDeletePayment(payment.id)}
            okText="确定"
            cancelText="取消"
          >
            <AppButton
              hierarchy="tertiary"
              size="sm"
              icon={<DeleteOutlined />}
              danger
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!studentData) {
    return (
      <div style={{ padding: 'var(--space-6)' }}>
        <Empty description="未找到学生数据" />
      </div>
    );
  }

  // 计算财务汇总
  const summary = studentData.financialSummary || calculateFinancialSummary(studentData.orders);
  const totalOwed = parseFloat(summary.totalOwed) || 0;

  return (
    <div className="finance-detail-view" data-page-container>
      {/* 页面头部 */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 'var(--space-4)'
        }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              财务详情 - {studentData.student.name}
            </Title>
            {/* 移除冗余返回按钮，保留整洁标题区 */}
          </div>
          
          <AppButton
            hierarchy="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateOrderVisible(true)}
            size="lg"
          >
            新建收费订单
          </AppButton>
        </div>
      </div>

      {/* 学生基础信息和财务概览 */}
              <Row gutter={isMobile ? [16, 16] : [24, 24]} style={{ marginBottom: 'var(--space-7)' }}>
        <Col xs={24} md={12}>
          <Card 
            title="学生档案"
            size="small"
            hoverable
            className="finance-student-card"
            style={{ 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              borderRadius: 'var(--radius-lg)',
              height: 'fit-content'
            }}
            onClick={() => {
              console.log('点击学生档案，学生publicId:', studentData.student.publicId);
              navigate(`/crm/${studentData.student.publicId}`);
            }}
styles={{ body: { padding: 'var(--space-5)' } }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* 学生基本信息 */}
              <div>
                   <div style={{ 
                     fontSize: '20px', 
                  fontWeight: 600, 
                     marginBottom: 'var(--space-4)',
                  display: 'flex',
                  alignItems: 'center',
                     gap: 'var(--space-3)'
                }}>
                  <span>{studentData.student.name}</span>
                  {studentData.student.status && (
                    <Tag 
                      color={
                        studentData.student.status === 'ENROLLED' ? 'green' :
                        studentData.student.status === 'TRIAL_CLASS' ? 'orange' :
                        studentData.student.status === 'INTERESTED' ? 'blue' : 'default'
                      }
                      style={{ fontSize: '12px' }}
                    >
                      {studentData.student.status === 'ENROLLED' ? '已报名' :
                       studentData.student.status === 'TRIAL_CLASS' ? '试课' :
                       studentData.student.status === 'INTERESTED' ? '意向' : 
                       studentData.student.status}
                    </Tag>
                  )}
                </div>
                
                <Row gutter={isMobile ? [16, 12] : [24, 12]}>
                  <Col span={12}>
                    <div>
                      <Text type="secondary" style={{ fontSize: '13px', display: 'block', marginBottom: 6 }}>
                        学校
                      </Text>
                      <div style={{ 
                        fontWeight: 500, 
                        fontSize: '15px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {studentData.student.school || '未填写'}
                      </div>
                    </div>
                  </Col>
                  {studentData.student.grade && (
                    <Col span={12}>
                      <div>
                        <Text type="secondary" style={{ fontSize: '13px', display: 'block', marginBottom: 6 }}>
                          年级
                        </Text>
                        <div style={{ fontWeight: 500, fontSize: '15px' }}>
                          {getGradeLabel(studentData.student.grade)}
                        </div>
                      </div>
                    </Col>
                  )}
                </Row>
              </div>

              {/* 家长信息 */}
              {studentData.student.parents && studentData.student.parents.length > 0 && (
                <div>
                   <div style={{ 
                     display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                     marginBottom: 'var(--space-4)'
                  }}>
                    <Text type="secondary" style={{ fontSize: '13px', fontWeight: 500 }}>
                      家长信息
                    </Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {studentData.student.parents.length} 人
                    </Text>
                  </div>
                  
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    {studentData.student.parents.map((parent) => (
                      <div 
                        key={parent.id} 
                        className="parent-info-card"
                         style={{ 
                           padding: 'var(--space-4)', 
                           borderRadius: 'var(--radius-md)',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                         <div style={{ 
                           display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start',
                           gap: 'var(--space-4)'
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              fontWeight: 600, 
                               marginBottom: 'var(--space-2)',
                              fontSize: '15px',
                              display: 'flex',
                              alignItems: 'center',
                               gap: 'var(--space-2)'
                            }}>
                              <span>{parent.name}</span>
                              {parent.relationship && (
                                <Tag 
                                   style={{ 
                                     fontSize: '11px',
                                     fontWeight: 400,
                                     margin: 0,
                                     borderRadius: 'var(--radius-sm)'
                                   }}
                                  color="blue"
                                >
                                  {parent.relationship}
                                </Tag>
                              )}
                            </div>
                            
                            <Space direction="vertical" size="small">
                              {parent.phone && (
                                <Text style={{ fontSize: '13px', color: 'var(--ant-color-text-secondary)' }}>
                                  {parent.phone}
                                </Text>
                              )}
                              {parent.wechatId && (
                                <Text style={{ fontSize: '13px', color: 'var(--ant-color-text-secondary)' }}>
                                  {parent.wechatId}
                                </Text>
                              )}
                            </Space>
                          </div>
                        </div>
                      </div>
                    ))}
                  </Space>
                </div>
              )}
            </Space>
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card 
            title="财务概览" 
            size="small"
            style={{ 
              borderRadius: 'var(--radius-lg)',
              height: 'fit-content'
            }}
styles={{ body: { padding: 'var(--space-5)' } }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Text strong style={{ fontSize: '15px' }}>总应收：</Text>
                <div style={{ 
                  fontSize: '24px',
                  fontWeight: 600,
                  color: 'var(--ant-color-primary)',
                  marginTop: 'var(--space-1)'
                }}>
                  {formatAmount(summary.totalDue)}
                </div>
              </div>
              
              <div>
                <Text strong style={{ fontSize: '15px' }}>总实收：</Text>
                <div style={{ 
                  fontSize: '24px',
                  fontWeight: 600,
                  color: 'var(--ant-color-success)',
                  marginTop: 'var(--space-1)'
                }}>
                  {formatAmount(summary.totalPaid)}
                </div>
              </div>
              
              <div>
                <Text strong style={{ fontSize: '15px' }}>总欠款：</Text>
                <div style={{ 
                  fontSize: '24px',
                  fontWeight: 600,
                  color: totalOwed > 0 ? 'var(--ant-color-error)' : 'var(--ant-color-success)',
                  marginTop: 'var(--space-1)'
                }}>
                  {formatAmount(summary.totalOwed)}
                </div>
              </div>
              
              <div>
                <Text strong style={{ fontSize: '15px' }}>缴费状态：</Text>
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <Tag 
                    color={
                      summary.paymentStatus === 'PAID_FULL' ? 'green' :
                      summary.paymentStatus === 'PARTIAL_PAID' ? 'orange' : 'red'
                    }
                    style={{ fontSize: '13px', padding: '4px 12px' }}
                  >
                    {summary.paymentStatus === 'PAID_FULL' ? '全部结清' :
                     summary.paymentStatus === 'PARTIAL_PAID' ? '部分结清' : '均未支付'}
                  </Tag>
                </div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 订单列表 */}
      <div>
        <Title level={4} style={{ marginBottom: 24, fontSize: '18px' }}>
          <FileTextOutlined /> 订单列表
        </Title>
        
        {studentData.orders.length === 0 ? (
          <Empty description="暂无订单记录" />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {studentData.orders.map((order) => (
            <Card
                key={order.id}
                size="small"
              style={{ borderRadius: 'var(--radius-lg)' }}
styles={{ body: { padding: 'var(--space-6)' } }}
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text strong style={{ fontSize: '16px' }}>{order.name}</Text>
                      <div style={{ marginTop: 6 }}>
                        {getOrderStatusTag(order)}
                      </div>
                    </div>
                    <Space size={isMobile ? 'small' : 'middle'}>
                      <AppButton
                        hierarchy="primary"
                        size={isMobile ? 'sm' : 'middle'}
                        icon={<PlusOutlined />}
                        onClick={() => handleAddPayment(order)}
                        disabled={parseFloat(order.remainingAmount) <= 0}
                        style={isMobile ? { height: 28, padding: '0 8px' } : undefined}
                      >
                        {isMobile ? '收款' : '添加收款'}
                      </AppButton>
                      <Dropdown
                        menu={{
                          items: [
                            {
                              key: 'edit',
                              label: '编辑订单',
                              disabled: order.payments.length > 0,
                              onClick: () => handleEditOrder(order)
                            },
                            {
                              key: 'delete',
                              label: '删除订单',
                              danger: true,
                              disabled: order.payments.length > 0,
                              onClick: () => {
                                if (order.payments.length > 0) return;
                                // 二次确认
                                Modal.confirm({
                                  title: '确定删除该订单？',
                                  content: '此操作不可撤销',
                                  okText: '删除',
                                  cancelText: '取消',
                                  okButtonProps: { danger: true },
                                  onOk: () => handleDeleteOrder(order.id)
                                });
                              }
                            }
                          ]
                        }}
                        placement={isMobile ? 'topRight' : 'bottomRight'}
                        getPopupContainer={(trigger) => trigger.parentElement || document.body}
                      >
                        <AppButton 
                          hierarchy="tertiary"
                          size="sm" 
                          icon={<MoreOutlined style={{ fontSize: 16 }} />} 
                          style={isMobile ? { height: 28, padding: '0 6px', marginLeft: -4 } : undefined}
                        />
                      </Dropdown>
                    </Space>
                  </div>
                }
                extra={
                  <AppButton
                    hierarchy="tertiary"
                    size="sm"
                    icon={expandedOrders.includes(order.id) ? <UpOutlined /> : <DownOutlined />}
                    onClick={() => {
                      if (expandedOrders.includes(order.id)) {
                        setExpandedOrders(expandedOrders.filter(id => id !== order.id));
                      } else {
                        setExpandedOrders([...expandedOrders, order.id]);
                      }
                    }}
                  >
                    {expandedOrders.includes(order.id) ? '收起' : '展开'}
                  </AppButton>
                }
              >
                {/* 订单信息 */}
                 <Row gutter={isMobile ? [16, 16] : [32, 16]} style={{ marginBottom: 'var(--space-5)' }}>
                  <Col xs={12} sm={6}>
                    <div>
                      <Text type="secondary" style={{ fontSize: '13px' }}>应收总额</Text>
                      <div style={{ 
                        fontWeight: 600, 
                        color: 'var(--ant-color-primary)',
                        fontSize: '18px',
                        marginTop: 4
                      }}>
                        {formatAmount(order.totalDue)}
                      </div>
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <div>
                      <Text type="secondary" style={{ fontSize: '13px' }}>已收金额</Text>
                      <div style={{ 
                        fontWeight: 600, 
                        color: 'var(--ant-color-success)',
                        fontSize: '18px',
                        marginTop: 4
                      }}>
                        {formatAmount(order.totalPaid)}
                      </div>
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <div>
                      <Text type="secondary" style={{ fontSize: '13px' }}>剩余未付</Text>
                      <div style={{ 
                        fontWeight: 600, 
                        color: parseFloat(order.remainingAmount) > 0 ? 'var(--ant-color-error)' : 'var(--ant-color-success)',
                        fontSize: '18px',
                        marginTop: 4
                      }}>
                        {formatAmount(order.remainingAmount)}
                      </div>
                    </div>
                  </Col>
                  <Col xs={12} sm={6}>
                    <div>
                      <Text type="secondary" style={{ fontSize: '13px' }}>结账日期</Text>
                      <div style={{ 
                        fontWeight: 500,
                        fontSize: '15px',
                        marginTop: 4
                      }}>
                        {order.dueDate ? dayjs(order.dueDate).format('YYYY-MM-DD') : '-'}
                      </div>
                    </div>
                  </Col>
                </Row>

                {order.coursePeriodStart && order.coursePeriodEnd && (
                   <div style={{ marginBottom: 'var(--space-4)' }}>
                    <Text type="secondary" style={{ fontSize: '13px' }}>课程周期：</Text>
                    <Text style={{ marginLeft: 8, fontSize: '14px' }}>
                      {dayjs(order.coursePeriodStart).format('YYYY-MM-DD')} 至 {dayjs(order.coursePeriodEnd).format('YYYY-MM-DD')}
                    </Text>
                  </div>
                )}

                 <div style={{ marginBottom: 'var(--space-5)' }}>
                  <Text type="secondary" style={{ fontSize: '13px' }}>创建时间：</Text>
                  <Text style={{ marginLeft: 8, fontSize: '14px' }}>
                    {dayjs(order.createdAt).format('YYYY-MM-DD HH:mm')}
                  </Text>
                </div>

                {/* 收款记录详情 */}
                {expandedOrders.includes(order.id) && (
                   <div style={{ marginTop: 'var(--space-6)' }}>
                     <Divider style={{ margin: 'var(--space-5) 0 var(--space-4) 0' }} />
                     <Title level={5} style={{ fontSize: '16px', marginBottom: 'var(--space-4)' }}>收款记录</Title>
                    {order.payments.length === 0 ? (
                      <Empty description="暂无收款记录" />
                    ) : (
                      <Table<Payment>
                        dataSource={order.payments}
                        columns={paymentColumns}
                        rowKey="id"
                        size="small"
                        pagination={false}
                        scroll={{ x: isMobile ? 400 : undefined }}
                      />
                    )}
                  </div>
                )}
              </Card>
            ))}
          </Space>
        )}
      </div>

      {/* 创建订单模态框 */}
      <Modal
        title="新建收费订单"
        open={createOrderVisible}
        onCancel={() => {
          setCreateOrderVisible(false);
          createOrderForm.resetFields();
        }}
        footer={null}
        width={isMobile ? '90%' : 600}
      >
        <Form
          form={createOrderForm}
          layout="vertical"
          onFinish={handleCreateOrder}
        >
          <Form.Item
            name="name"
            label="订单名称"
            rules={[{ required: true, message: '请输入订单名称' }]}
          >
            <Input placeholder="例如：2024年秋季班学费" />
          </Form.Item>

          <Form.Item
            name="totalDue"
            label="应收总额"
            rules={[
              { required: true, message: '请输入应收总额' },
              { type: 'number', min: 0.01, message: '金额必须大于0' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="0.00"
              precision={2}
              min={0}
              addonBefore="¥"
            />
          </Form.Item>

          <Form.Item
            name="coursePeriod"
            label="课程周期"
          >
            <UnifiedRangePicker className="w-full" getPopupContainer={() => document.body} />
          </Form.Item>

          <Form.Item
            name="dueDate"
            label="结账日期"
          >
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <AppButton 
                onClick={() => {
                  setCreateOrderVisible(false);
                  createOrderForm.resetFields();
                }}
              >
                取消
              </AppButton>
              <AppButton hierarchy="primary" type="submit">
                确认创建
              </AppButton>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑订单模态框 */}
      <Modal
        title="编辑订单信息"
        open={editOrderVisible}
        onCancel={() => {
          setEditOrderVisible(false);
          editOrderForm.resetFields();
          setCurrentOrder(null);
        }}
        footer={null}
        width={isMobile ? '90%' : 600}
      >
        <Form
          form={editOrderForm}
          layout="vertical"
          onFinish={handleUpdateOrder}
        >
          <Form.Item
            name="name"
            label="订单名称"
            rules={[{ required: true, message: '请输入订单名称' }]}
          >
            <Input placeholder="例如：2024年秋季班学费" />
          </Form.Item>

          <Form.Item
            name="totalDue"
            label="应收总额"
            rules={[
              { required: true, message: '请输入应收总额' },
              { type: 'number', min: 0.01, message: '金额必须大于0' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="0.00"
              precision={2}
              min={0}
              addonBefore="¥"
            />
          </Form.Item>

          <Form.Item
            name="coursePeriod"
            label="课程周期"
          >
            <UnifiedRangePicker className="w-full" getPopupContainer={() => document.body} />
          </Form.Item>

          <Form.Item
            name="dueDate"
            label="结账日期"
          >
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <AppButton 
                onClick={() => {
                  setEditOrderVisible(false);
                  editOrderForm.resetFields();
                  setCurrentOrder(null);
                }}
              >
                取消
              </AppButton>
              <AppButton hierarchy="primary" type="submit">
                确认更新
              </AppButton>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加收款记录模态框 */}
      <Modal
        title="添加收款记录"
        open={addPaymentVisible}
        onCancel={() => {
          setAddPaymentVisible(false);
          addPaymentForm.resetFields();
          setCurrentOrder(null);
        }}
        footer={null}
        width={isMobile ? '90%' : 500}
      >
        <Form
          form={addPaymentForm}
          layout="vertical"
          onFinish={handleCreatePayment}
        >
          <Form.Item
            name="paymentDate"
            label="收款日期"
            rules={[{ required: true, message: '请选择收款日期' }]}
          >
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item
            name="amount"
            label="金额"
            rules={[
              { required: true, message: '请输入收款金额' },
              { type: 'number', min: 0.01, message: '金额必须大于0' },
              ...(currentOrder ? [{
                validator: (_: any, value: number) => {
                  const maxAmount = parseFloat(currentOrder.remainingAmount);
                  if (value && value > maxAmount) {
                    return Promise.reject(new Error(`金额不能超过剩余未付金额 ${formatAmount(currentOrder.remainingAmount)}`));
                  }
                  return Promise.resolve();
                }
              }] : [])
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="0.00"
              precision={2}
              min={0}
              max={currentOrder ? parseFloat(currentOrder.remainingAmount) : undefined}
              addonBefore="¥"
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="备注"
          >
            <TextArea
              placeholder="收款方式、备注等"
              rows={3}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <AppButton 
                onClick={() => {
                  setAddPaymentVisible(false);
                  addPaymentForm.resetFields();
                  setCurrentOrder(null);
                }}
              >
                取消
              </AppButton>
              <AppButton hierarchy="primary" type="submit">
                确认添加
              </AppButton>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑收款记录模态框 */}
      <Modal
        title="编辑收款记录"
        open={editPaymentVisible}
        onCancel={() => {
          setEditPaymentVisible(false);
          editPaymentForm.resetFields();
          setCurrentPayment(null);
        }}
        footer={null}
        width={isMobile ? '90%' : 500}
      >
        <Form
          form={editPaymentForm}
          layout="vertical"
          onFinish={handleUpdatePayment}
        >
          <Form.Item
            name="paymentDate"
            label="收款日期"
            rules={[{ required: true, message: '请选择收款日期' }]}
          >
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item
            name="amount"
            label="金额"
            rules={[
              { required: true, message: '请输入收款金额' },
              { type: 'number', min: 0.01, message: '金额必须大于0' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="0.00"
              precision={2}
              min={0}
              addonBefore="¥"
            />
          </Form.Item>

          <Form.Item
            name="notes"
            label="备注"
          >
            <TextArea
              placeholder="收款方式、备注等"
              rows={3}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <AppButton 
                onClick={() => {
                  setEditPaymentVisible(false);
                  editPaymentForm.resetFields();
                  setCurrentPayment(null);
                }}
              >
                取消
              </AppButton>
              <AppButton hierarchy="primary" type="submit">
                确认更新
              </AppButton>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FinanceDetailView; 