import AppButton from '@/components/AppButton';
import React from 'react';
import { Typography, Space, Avatar, Tag, Tooltip, Card } from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
  BookOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import type { StudentInfoHeaderProps } from '@/types/unifiedGrowthReport';
import { useThemeStore } from '@/stores/themeStore';
import { useNavigate } from 'react-router-dom';
import { useResponsive } from '@/hooks/useResponsive';
import { GRADE_LABELS } from '@/utils/enumMappings';

const { Title, Text } = Typography;

/**
 * 统一的学生信息头部组件
 * 整合了三个原页面的学生信息显示功能
 */
const StudentInfoHeader: React.FC<StudentInfoHeaderProps & {
  dateSelectorBottom?: React.ReactNode;
  onRefresh?: () => void;
  onExport?: () => void;
}> = ({
  student,
  onBack,
  showActions = true,
  loading = false,
  className,
  style,
  dateSelectorBottom,
  onRefresh,
  onExport
}) => {
  const { theme } = useThemeStore();
  const { isMobile } = useResponsive();
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card
        className={className}
        style={style}
        loading={true}
        size={isMobile ? 'small' : 'default'}
      >
        <div style={{ height: '120px' }} />
      </Card>
    );
  }

  if (!student) {
    return (
      <Card
        className={className}
        style={style}
        size={isMobile ? 'small' : 'default'}
      >
        <div style={{ textAlign: 'center', color: 'var(--ant-color-text-tertiary)' }}>
          <UserOutlined style={{ fontSize: '24px', marginBottom: 'var(--space-2)' }} />
          <div>学生信息加载中...</div>
        </div>
      </Card>
    );
  }

  const getGradeColor = (grade?: string) => {
    if (!grade) return 'default';
    if (grade.includes('初')) return 'blue';
    if (grade.includes('高')) return 'green';
    return 'default';
  };

  const cardStyle = {
    background: theme === 'dark' ? 'var(--ant-color-bg-layout)' : 'var(--ant-color-bg-container)',
    borderRadius: '12px',
    boxShadow: theme === 'dark' 
      ? '0 4px 12px rgba(0, 0, 0, 0.3)' 
      : '0 4px 12px rgba(0, 0, 0, 0.1)',
    ...style
  };

  return (
    <Card
      className={className}
      style={cardStyle}
      size={isMobile ? 'small' : 'default'}
styles={{ body: { padding: isMobile ? 'var(--space-4)' : 'var(--space-6)' } }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        {/* 返回按钮 */}
        {showActions && onBack && (
          <AppButton
            hierarchy="tertiary"
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
            style={{ 
              marginTop: '4px',
              color: theme === 'dark' ? 'var(--ant-color-bg-container)' : 'var(--ant-color-text-tertiary)'
            }}
          />
        )}

        {/* 学生头像 */}
        <Avatar
          size={isMobile ? 48 : 64}
          icon={<UserOutlined />}
          style={{
            backgroundColor: 'var(--ant-color-primary)',
            flexShrink: 0
          }}
        />

        {/* 学生信息（点击上半部分跳转客户档案） */}
        <div
          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
          onClick={(e) => {
            // 避免点击下方时间选择器、刷新/导出区域误触
            const target = e.target as HTMLElement;
            if (target.closest('.ant-picker') || target.closest('.ant-btn')) return;
            if (student?.publicId) {
              navigate(`/crm?publicId=${encodeURIComponent(student.publicId)}`);
            } else {
              navigate('/crm');
            }
          }}
        >
          {/* 姓名（第一行） */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-2)',
            flexWrap: 'wrap'
          }}>
            <Title 
              level={isMobile ? 4 : 3} 
              style={{ 
                margin: 0,
                color: theme === 'dark' ? 'var(--ant-color-bg-container)' : '#262626'
              }}
            >
              {student.name}
            </Title>
            
          </div>

          {/* 第二行：学号 + 内嵌小字（年级/在读）紧随其后 */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            marginTop: 'var(--space-1)',
            whiteSpace: 'nowrap',
            maxWidth: '100%'
          }}>
            {student.publicId && (
              <Tag color="blue" style={{
                margin: 0,
                fontSize: 'var(--font-size-xs)',
                lineHeight: 1.2,
                padding: '0 var(--space-1)',
                borderRadius: 'var(--radius-sm)'
              }}>
                {student.publicId}
              </Tag>
            )}
            {student.grade && (
              <span style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--ant-color-primary)'
              }}>
                · {GRADE_LABELS[student.grade] || student.grade}
              </span>
            )}
            <span style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--ant-color-success)'
            }}>
              · 在读
            </span>
          </div>
        </div>

        {/* 右侧：弱化操作（图标），不改变原有信息布局 */}
        {(onRefresh || onExport) && (
          <div style={{ marginLeft: 'auto' }}>
            <Space>
              {onRefresh && (
                <AppButton hierarchy="tertiary" size="sm" icon={<ReloadOutlined />} onClick={onRefresh} />
              )}
              {onExport && (
                <AppButton hierarchy="tertiary" size="sm" icon={<DownloadOutlined />} onClick={onExport} />
              )}
            </Space>
          </div>
        )}
      </div>

      {/* 底部：时间选择器（自适应全宽） */}
      {dateSelectorBottom && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          {dateSelectorBottom}
        </div>
      )}
    </Card>
  );
};

export default StudentInfoHeader;