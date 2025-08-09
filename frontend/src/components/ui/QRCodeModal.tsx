import React, { useState, useEffect } from 'react';
import { Modal, Space, Typography, Button, message, Tooltip, Segmented } from 'antd';
import { QrcodeOutlined, CopyOutlined, ShareAltOutlined } from '@ant-design/icons';
import QRCode from 'qrcode';

const { Title, Text, Paragraph } = Typography;

interface QRCodeModalProps {
  visible: boolean;
  onClose: () => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ visible, onClose }) => {
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('primary');
  const [loading, setLoading] = useState(false);

  // 获取可用的网络地址
  const getNetworkAddresses = () => {
    const currentUrl = window.location;
    const port = currentUrl.port || (currentUrl.protocol === 'https:' ? '443' : '80');
    const pathname = currentUrl.pathname;
    const search = currentUrl.search;
    
    // 模拟从后端获取的网络地址（实际应用中应该通过API获取）
    return [
      {
        key: 'primary',
        label: '主要WiFi地址',
        url: `http://192.168.0.216:5173${pathname}${search}`,
        description: '推荐：同WiFi网络设备使用'
      },
      {
        key: 'secondary',
        label: '备用地址1',
        url: `http://172.23.16.1:5173${pathname}${search}`,
        description: 'Docker/WSL环境使用'
      },
      {
        key: 'tertiary',
        label: '备用地址2',
        url: `http://198.18.0.1:5173${pathname}${search}`,
        description: 'VPN环境使用'
      }
    ];
  };

  const networkAddresses = getNetworkAddresses();
  const currentAddress = networkAddresses.find(addr => addr.key === selectedNetwork);

  // 生成二维码
  const generateQRCode = async (url: string) => {
    setLoading(true);
    try {
      const qrDataURL = await QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeData(qrDataURL);
    } catch (error) {
      console.error('生成二维码失败:', error);
      message.error('生成二维码失败');
    } finally {
      setLoading(false);
    }
  };

  // 复制链接到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('链接已复制到剪贴板');
    } catch (error) {
      // 降级处理
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      message.success('链接已复制到剪贴板');
    }
  };

  // 网络地址选项
  const networkOptions = networkAddresses.map(addr => ({
    label: addr.label,
    value: addr.key,
  }));

  // 当选择的网络地址变化时重新生成二维码
  useEffect(() => {
    if (visible && currentAddress) {
      generateQRCode(currentAddress.url);
    }
  }, [visible, selectedNetwork, currentAddress]);

  return (
    <Modal
      title={
        <Space>
          <QrcodeOutlined />
          二维码访问
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={400}
      centered
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* 网络地址选择 */}
        <div>
          <Title level={5}>选择网络地址:</Title>
          <Segmented
            options={networkOptions}
            value={selectedNetwork}
            onChange={setSelectedNetwork}
            style={{ width: '100%' }}
          />
          {currentAddress && (
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
              {currentAddress.description}
            </Text>
          )}
        </div>

        {/* 二维码显示 */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              padding: '16px',
              border: '1px solid #f0f0f0',
              borderRadius: '8px',
              backgroundColor: '#fafafa',
              display: 'inline-block',
            }}
          >
            {loading ? (
              <div style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text>生成中...</Text>
              </div>
            ) : (
              qrCodeData && <img src={qrCodeData} alt="QR Code" style={{ display: 'block' }} />
            )}
          </div>
        </div>

        {/* 访问地址 */}
        {currentAddress && (
          <div>
            <Title level={5}>访问地址:</Title>
            <Paragraph
              copyable={{
                text: currentAddress.url,
                onCopy: () => message.success('地址已复制'),
              }}
              style={{
                backgroundColor: '#f6f8fa',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '12px',
              }}
            >
              {currentAddress.url}
            </Paragraph>
          </div>
        )}

        {/* 操作按钮 */}
        <Space style={{ width: '100%', justifyContent: 'center' }}>
          <Tooltip title="复制链接">
            <Button
              icon={<CopyOutlined />}
              onClick={() => currentAddress && copyToClipboard(currentAddress.url)}
            >
              复制链接
            </Button>
          </Tooltip>
          <Tooltip title="分享二维码">
            <Button
              icon={<ShareAltOutlined />}
              onClick={() => {
                if (qrCodeData) {
                  const link = document.createElement('a');
                  link.download = 'qrcode.png';
                  link.href = qrCodeData;
                  link.click();
                  message.success('二维码已下载');
                }
              }}
            >
              下载二维码
            </Button>
          </Tooltip>
        </Space>

        {/* 使用说明 */}
        <div style={{ backgroundColor: '#f0f9ff', padding: '12px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
          <Title level={5} style={{ color: '#0284c7', marginBottom: '8px' }}>
            📱 使用说明:
          </Title>
          <ul style={{ marginBottom: 0, paddingLeft: '20px', color: '#0369a1' }}>
            <li>确保移动设备连接同一WiFi网络</li>
            <li>使用手机扫描二维码或手动输入地址</li>
            <li>如无法访问，请尝试其他网络地址</li>
            <li>首次加载可能需要等待几秒</li>
          </ul>
        </div>
      </Space>
    </Modal>
  );
};

export default QRCodeModal; 