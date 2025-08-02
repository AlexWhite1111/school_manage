// src/components/excel/ExcelExportModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Form,
  Select,
  DatePicker,
  Checkbox,
  Space,
  Typography,
  Alert,
  Divider,
  Card,
  Statistic,
  message
} from 'antd';
import {
  DownloadOutlined,
  FilterOutlined,
  FileExcelOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { exportCustomers, type ExportFilters } from '@/api/excelApi';
import * as crmApi from '@/api/crmApi';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface ExcelExportModalProps {
  open: boolean;
  onCancel: () => void;
}

const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  open,
  onCancel
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    total: number;
    statusCounts: Record<string, number>;
  } | null>(null);

  // 状态选项
  const statusOptions = [
    { label: '潜在客户', value: 'POTENTIAL' },
    { label: '初步沟通', value: 'INITIAL_CONTACT' },
    { label: '意向客户', value: 'INTERESTED' },
    { label: '试听中', value: 'TRIAL_CLASS' },
    { label: '已报名', value: 'ENROLLED' },
    { label: '已流失', value: 'LOST' }
  ];

  // 年级选项
  const gradeOptions = [
    { label: '初一', value: 'CHU_YI' },
    { label: '初二', value: 'CHU_ER' },
    { label: '初三', value: 'CHU_SAN' },
    { label: '高一', value: 'GAO_YI' },
    { label: '高二', value: 'GAO_ER' },
    { label: '高三', value: 'GAO_SAN' }
  ];

  // 重置表单
  const resetForm = () => {
    form.resetFields();
    setPreviewData(null);
  };

  // 预览数据
  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const values = await form.validateFields();
      const filters = buildFilters(values);
      
      // 这里可以调用API获取预览统计
      // 暂时用模拟数据
      setTimeout(() => {
        setPreviewData({
          total: 150,
          statusCounts: {
            'POTENTIAL': 30,
            'TRIAL_CLASS': 45,
            'ENROLLED': 60,
            'LOST': 15
          }
        });
        setPreviewLoading(false);
      }, 1000);
    } catch (error) {
      setPreviewLoading(false);
    }
  };

  // 构建筛选条件
  const buildFilters = (values: any): ExportFilters => {
    const filters: ExportFilters = {};

    if (values.status && values.status.length > 0) {
      filters.status = values.status;
    }

    if (values.grade && values.grade.length > 0) {
      filters.grade = values.grade;
    }

    if (values.school && values.school.length > 0) {
      filters.school = values.school;
    }

    if (values.dateRange && values.dateRange.length === 2) {
      filters.dateRange = {
        start: values.dateRange[0].format('YYYY-MM-DD'),
        end: values.dateRange[1].format('YYYY-MM-DD')
      };
    }

    return filters;
  };

  // 开始导出
  const handleExport = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      const filters = buildFilters(values);
      
      await exportCustomers(filters);
      message.success('导出成功，文件已开始下载');
      onCancel();
    } catch (error: any) {
      console.error('导出失败:', error);
      message.error('导出失败: ' + (error.response?.data?.message || error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 关闭弹窗
  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  return (
    <Modal
      title={
        <Space>
          <FileExcelOutlined />
          导出客户数据
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      width={700}
      footer={
        <Space>
          <Button onClick={handleCancel}>
            取消
          </Button>
          <Button
            icon={<FilterOutlined />}
            loading={previewLoading}
            onClick={handlePreview}
          >
            预览数据
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            loading={loading}
            onClick={handleExport}
          >
            导出Excel
          </Button>
        </Space>
      }
      destroyOnClose
    >
      <div style={{ padding: '16px 0' }}>
        
        {/* 导出说明 */}
        <Alert
          message="导出说明"
          description="根据筛选条件导出客户数据，包含基本信息、家长信息、成长记录统计等完整数据"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {/* 筛选条件表单 */}
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: [],
            grade: [],
            school: []
          }}
        >
          <Title level={5}>筛选条件</Title>
          
          <Form.Item
            label="客户状态"
            name="status"
            tooltip="不选择表示导出所有状态的客户"
          >
            <Checkbox.Group options={statusOptions} />
          </Form.Item>

          <Form.Item
            label="年级"
            name="grade"
            tooltip="不选择表示导出所有年级的客户"
          >
            <Checkbox.Group options={gradeOptions} />
          </Form.Item>

          <Form.Item
            label="学校"
            name="school"
            tooltip="可多选，不选择表示导出所有学校的客户"
          >
            <Select
              mode="multiple"
              placeholder="选择学校（可多选）"
              allowClear
              style={{ width: '100%' }}
            >
              <Option value="实验小学">实验小学</Option>
              <Option value="第一小学">第一小学</Option>
              <Option value="第二小学">第二小学</Option>
              <Option value="育才小学">育才小学</Option>
              <Option value="希望小学">希望小学</Option>
              {/* 这里可以动态加载学校列表 */}
            </Select>
          </Form.Item>

          <Form.Item
            label="创建时间范围"
            name="dateRange"
            tooltip="不选择表示导出所有时间的客户"
          >
            <RangePicker
              style={{ width: '100%' }}
              placeholder={['开始日期', '结束日期']}
              format="YYYY-MM-DD"
            />
          </Form.Item>
        </Form>

        {/* 预览数据 */}
        {previewData && (
          <div style={{ marginTop: 24 }}>
            <Divider>数据预览</Divider>
            
            <Card>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Statistic
                  title="预计导出记录数"
                  value={previewData.total}
                  suffix="条"
                  valueStyle={{ color: '#1890ff' }}
                />
                
                <div>
                  <Text strong>状态分布：</Text>
                  <div style={{ marginTop: 8 }}>
                    <Space wrap>
                      {Object.entries(previewData.statusCounts).map(([status, count]) => {
                        const statusLabel = statusOptions.find(opt => opt.value === status)?.label || status;
                        return (
                          <Space key={status}>
                            <Text>{statusLabel}:</Text>
                            <Text strong>{count}条</Text>
                          </Space>
                        );
                      })}
                    </Space>
                  </div>
                </div>
              </Space>
            </Card>
          </div>
        )}

        {/* 导出内容说明 */}
        <div style={{ marginTop: 24 }}>
          <Divider>导出内容</Divider>
          <Alert
            message="导出的Excel文件将包含以下信息："
            description={
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>学生基本信息：学号、姓名、性别、出生日期、学校、年级等</li>
                <li>联系信息：地址、来源渠道、状态、联系日期等</li>
                <li>家长信息：最多2个家长的姓名、关系、电话、微信等</li>
                <li>统计信息：成长记录数、最后活动时间等</li>
                <li>备注信息：最新的沟通记录内容</li>
              </ul>
            }
            type="info"
            showIcon={false}
          />
        </div>
      </div>
    </Modal>
  );
};

export default ExcelExportModal; 