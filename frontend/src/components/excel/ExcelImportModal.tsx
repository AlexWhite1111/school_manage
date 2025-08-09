// src/components/excel/ExcelImportModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  Upload,
  Button,
  message,
  Alert,
  Progress,
  Typography,
  Space,
  Divider,
  List,
  Tag
} from 'antd';
import {
  InboxOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { importCustomers, downloadImportTemplate, type ImportResult } from '@/api/export';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

interface ExcelImportModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  open,
  onCancel,
  onSuccess
}) => {
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 重置状态
  const resetState = () => {
    setUploading(false);
    setImportResult(null);
    setSelectedFile(null);
  };

  // 下载模板
  const handleDownloadTemplate = async () => {
    try {
      await downloadImportTemplate();
      message.success('模板下载成功');
    } catch (error) {
      console.error('下载模板失败:', error);
      message.error('下载模板失败，请重试');
    }
  };

  // 文件上传配置
  const uploadProps: UploadProps = {
    name: 'excel',
    multiple: false,
    accept: '.xlsx,.xls',
    beforeUpload: (file) => {
      // 验证文件类型
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                     file.type === 'application/vnd.ms-excel' ||
                     file.name.endsWith('.xlsx') ||
                     file.name.endsWith('.xls');
      
      if (!isExcel) {
        message.error('只能上传 Excel 文件 (.xlsx, .xls)');
        return false;
      }

      // 验证文件大小 (10MB)
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过 10MB');
        return false;
      }

      setSelectedFile(file);
      return false; // 阻止自动上传
    },
    onRemove: () => {
      setSelectedFile(null);
      setImportResult(null);
    },
  };

  // 开始导入
  const handleImport = async () => {
    if (!selectedFile) {
      message.error('请先选择要上传的Excel文件');
      return;
    }

    setUploading(true);
    setImportResult(null);

    try {
      const result = await importCustomers(selectedFile);
      setImportResult(result);

      if (result.success) {
        message.success('数据导入完成');
        // 延迟一段时间后自动关闭弹窗
        setTimeout(() => {
          onSuccess();
          handleCancel();
        }, 3000);
      } else {
        message.error('数据导入失败');
      }
    } catch (error: any) {
      console.error('导入失败:', error);
      message.error('导入失败: ' + (error.response?.data?.message || error.message || '未知错误'));
    } finally {
      setUploading(false);
    }
  };

  // 关闭弹窗
  const handleCancel = () => {
    resetState();
    onCancel();
  };

  return (
    <Modal
      title="导入客户数据"
      open={open}
      onCancel={handleCancel}
      width={800}
      footer={null}
      destroyOnClose
    >
      <div style={{ padding: '16px 0' }}>
        
        {/* 使用说明 */}
        <Alert
          message="导入说明"
          description={
            <div>
              <Paragraph style={{ marginBottom: 8 }}>
                1. 请先下载模板文件，按照模板格式填写数据
              </Paragraph>
              <Paragraph style={{ marginBottom: 8 }}>
                2. 支持 .xlsx 和 .xls 格式，文件大小不超过 10MB
              </Paragraph>
              <Paragraph style={{ marginBottom: 8 }}>
                3. 姓名和家长姓名1为必填字段
              </Paragraph>
              <Paragraph style={{ marginBottom: 0 }}>
                4. 只有管理员权限可以导入数据
              </Paragraph>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        {/* 下载模板 */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            size="large"
            onClick={handleDownloadTemplate}
          >
            下载导入模板
          </Button>
        </div>

        <Divider>上传文件</Divider>

        {/* 文件上传 */}
        <Dragger {...uploadProps} style={{ marginBottom: 24 }}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">
            点击或拖拽文件到此区域上传
          </p>
          <p className="ant-upload-hint">
            支持 .xlsx 和 .xls 格式的Excel文件
          </p>
        </Dragger>

        {/* 已选择文件信息 */}
        {selectedFile && (
          <Alert
            message={`已选择文件: ${selectedFile.name}`}
            description={`文件大小: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`}
            type="success"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        {/* 导入按钮 */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Space>
            <Button onClick={handleCancel}>
              取消
            </Button>
            <Button
              type="primary"
              size="large"
              loading={uploading}
              disabled={!selectedFile}
              onClick={handleImport}
            >
              {uploading ? '导入中...' : '开始导入'}
            </Button>
          </Space>
        </div>

        {/* 导入进度 */}
        {uploading && (
          <div style={{ marginBottom: 24 }}>
            <Progress percent={50} status="active" />
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 8 }}>
              正在处理文件，请稍候...
            </Text>
          </div>
        )}

        {/* 导入结果 */}
        {importResult && (
          <div>
            <Divider>导入结果</Divider>
            
            {importResult.success ? (
              <Alert
                message="导入成功"
                description={
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Tag color="success" icon={<CheckCircleOutlined />}>
                        成功导入 {importResult.data?.importedCount || 0} 条记录
                      </Tag>
                      {importResult.data && importResult.data.skippedCount > 0 && (
                        <Tag color="warning" icon={<ExclamationCircleOutlined />}>
                          跳过 {importResult.data.skippedCount} 条记录
                        </Tag>
                      )}
                    </div>
                    
                    {importResult.data?.errors && importResult.data.errors.length > 0 && (
                      <div>
                        <Text strong>错误详情：</Text>
                        <List
                          size="small"
                          dataSource={importResult.data.errors.slice(0, 10)} // 最多显示10个错误
                          renderItem={error => (
                            <List.Item>
                              <Text type="danger">{error}</Text>
                            </List.Item>
                          )}
                        />
                        {importResult.data.errors.length > 10 && (
                          <Text type="secondary">
                            还有 {importResult.data.errors.length - 10} 个错误未显示...
                          </Text>
                        )}
                      </div>
                    )}
                  </Space>
                }
                type="success"
                showIcon
              />
            ) : (
              <Alert
                message="导入失败"
                description={
                  <div>
                    <Text>{importResult.message}</Text>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <List
                        style={{ marginTop: 8 }}
                        size="small"
                        dataSource={importResult.errors}
                        renderItem={error => (
                          <List.Item>
                            <Text type="danger">{error}</Text>
                          </List.Item>
                        )}
                      />
                    )}
                  </div>
                }
                type="error"
                showIcon
              />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ExcelImportModal; 