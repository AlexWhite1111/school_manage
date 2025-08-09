import React from 'react';
import {
  Card,
  Typography,
  Button,
  Space,
  Avatar,
  Descriptions,
  Tag,
  Tooltip
} from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
  BookOutlined,
  CalendarOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import type { StudentInfoHeaderProps } from '@/types/unifiedGrowthReport';
import { useThemeStore } from '@/stores/themeStore';
import { useResponsive } from '@/hooks/useResponsive';
import { GRADE_LABELS } from '@/utils/enumMappings';

const { Title, Text } = Typography;

/**
 * 统一的学生信息头部组件
 * 整合了三个原页面的学生信息显示功能
 */
const StudentInfoHeader: React.FC<StudentInfoHeaderProps> = ({
  student,
  onBack,
  showActions = true,
  loading = false,
  className,
  style
}) => {
  const { theme } = useThemeStore();
  const { isMobile } = useResponsive();

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
        <div style={{ textAlign: 'center', color: '#999' }}>
          <UserOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
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
    background: theme === 'dark' ? '#141414' : '#fff',
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
      bodyStyle={{ padding: isMobile ? '16px' : '24px' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        {/* 返回按钮 */}
        {showActions && onBack && (
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
            style={{ 
              marginTop: '4px',
              color: theme === 'dark' ? '#fff' : '#666'
            }}
          />
        )}

        {/* 学生头像 */}
        <Avatar
          size={isMobile ? 48 : 64}
          icon={<UserOutlined />}
          style={{
            backgroundColor: '#1890ff',
            flexShrink: 0
          }}
        />

        {/* 学生信息 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 姓名和学号 */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '8px',
            flexWrap: 'wrap'
          }}>
            <Title 
              level={isMobile ? 4 : 3} 
              style={{ 
                margin: 0,
                color: theme === 'dark' ? '#fff' : '#262626'
              }}
            >
              {student.name}
            </Title>
            
            {student.publicId && (
              <Tag color="blue" style={{ margin: 0 }}>
                学号: {student.publicId}
              </Tag>
            )}
            
            {student.grade && (
              <Tag color={getGradeColor(student.grade)} style={{ margin: 0 }}>
                <BookOutlined style={{ marginRight: '4px' }} />
                {GRADE_LABELS[student.grade] || student.grade}
              </Tag>
            )}
          </div>

          {/* 详细信息 - 桌面端显示 */}
          {!isMobile && (
            <Descriptions
              size="small"
              column={3}
              style={{ marginTop: '12px' }}
              items={[
                {
                  key: 'status',
                  label: (
                    <Space>
                      <CalendarOutlined />
                      <span>状态</span>
                    </Space>
                  ),
                  children: (
                    <Tag color="green">在读</Tag>
                  )
                }
              ].filter(Boolean) as any[]}
            />
          )}

          {/* 移动端简化信息 */}
          {isMobile && (
            <Space wrap style={{ marginTop: '8px' }}>
              <Text 
                type="secondary" 
                style={{ fontSize: '12px' }}
              >
                <UserOutlined style={{ marginRight: '4px' }} />
                状态: 在读
              </Text>
            </Space>
          )}
        </div>

        {/* 右侧操作区域 */}
        {showActions && !isMobile && (
          <div style={{ flexShrink: 0 }}>
            <Space direction="vertical" size="small">
              <Tooltip title="查看完整档案">
                <Button type="default" size="small">
                  详细信息
                </Button>
              </Tooltip>
              <Tooltip title="导出报告">
                <Button type="primary" size="small">
                  导出报告
                </Button>
              </Tooltip>
            </Space>
          </div>
        )}
      </div>
    </Card>
  );
};

export default StudentInfoHeader;