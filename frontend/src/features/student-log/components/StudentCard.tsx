
import AppButton from '@/components/AppButton';
import React from 'react';
import { Avatar, Space, Tag, Checkbox, Dropdown, Divider, Row, Col, Tooltip, Typography, Card } from 'antd';
import {
  UserOutlined,
  MoreOutlined,
  EyeOutlined,
  UserSwitchOutlined,
  BookFilled,
  StarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { useThemeStore } from '@/stores/themeStore';
import { useResponsive } from '@/hooks/useResponsive';
import { getGradeLabel } from '@/utils/enumMappings';
import type { ClassStudent } from '@/types/api';
import styles from './StudentCard.module.css';
import { UnifiedCardPresets } from '@/theme/card';

const { Text } = Typography;

interface StudentCardProps {
  student: ClassStudent;
  selectedRowKeys: React.Key[];
  attendanceLoading: { [key: number]: string | null };
  isCompleted: boolean;
  onSelect: (enrollmentId: number, checked: boolean) => void;
  onAttendance: (student: ClassStudent, status: string) => void;
  onGrowthRecord: (student: ClassStudent) => void;
  onMarkCompleted: (enrollmentId: number) => void;
  onReassignToClass: (student: ClassStudent) => void;
  onViewDetail: (student: ClassStudent) => void;
}

// 考勤状态配置
const ATTENDANCE_CONFIG = {
  PRESENT: { 
    label: '出席', 
    icon: CheckCircleOutlined, 
    color: 'var(--ant-color-success)',
    ghost: false 
  },
  LATE: { 
    label: '迟到', 
    icon: ClockCircleOutlined, 
    color: 'var(--ant-color-warning)',
    ghost: false 
  },
  ABSENT: { 
    label: '请假', 
    icon: ExclamationCircleOutlined, 
    color: 'var(--ant-color-primary)',
    ghost: true 
  },
  NO_SHOW: { 
    label: '缺席', 
    icon: CloseCircleOutlined, 
    color: 'var(--ant-color-error)',
    ghost: true 
  }
};

const StudentCard: React.FC<StudentCardProps> = ({
  student,
  selectedRowKeys,
  attendanceLoading,
  isCompleted,
  onSelect,
  onAttendance,
  onGrowthRecord,
  onMarkCompleted,
  onReassignToClass,
  onViewDetail
}) => {
  const { theme } = useThemeStore();
  const { isMobile } = useResponsive();
  const preset = UnifiedCardPresets.mobileCompact(isMobile);

  const isSelected = selectedRowKeys.includes(student.enrollmentId);
  const currentTimeSlot = new Date().getHours() < 12 ? 'AM' : 'PM';
  const currentAttendance = student.todayAttendance?.[currentTimeSlot];
  const currentAttendanceColor = currentAttendance
    ? ATTENDANCE_CONFIG[currentAttendance as keyof typeof ATTENDANCE_CONFIG]?.color
    : undefined;

  // 操作菜单
  const dropdownItems = [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: '查看详情',
      onClick: () => onViewDetail(student)
    },
    { type: 'divider' as const },
    ...(isCompleted ? [
      {
        key: 'reassign',
        icon: <UserSwitchOutlined />,
        label: '重新分配班级',
        onClick: () => onReassignToClass(student)
      }
    ] : [
      {
        key: 'complete',
        icon: <BookFilled />,
        label: '标记为已完课',
        onClick: () => onMarkCompleted(student.enrollmentId)
      }
    ])
  ];

  // 渲染考勤按钮
  const renderAttendanceButtons = () => {
    return (
      <Row gutter={[8, 8]}>
        {Object.entries(ATTENDANCE_CONFIG).map(([status, config]) => {
          const IconComponent = config.icon;
          const isActive = currentAttendance === status;
          const loading = attendanceLoading[student.enrollmentId] === status;
          
          return (
            <Col span={isMobile ? 6 : 12} key={status}>
              <Tooltip title={config.label}>
                <AppButton
                  size="sm"
                  block
                  hierarchy={isActive ? 'primary' : 'secondary'}
                  disabled={isCompleted}
                  loading={loading}
                  icon={<IconComponent />}
                  onClick={() => onAttendance(student, status)}
                  className={styles.attendanceButton}
                  style={{
                    borderColor: isActive ? undefined : (config.color as string),
                    color: isActive ? undefined : (config.color as string)
                  }}
                >
                  {isMobile ? '' : config.label}
                </AppButton>
              </Tooltip>
            </Col>
          );
        })}
      </Row>
    );
  };

  return (
    <Card
      size="small"
      hoverable={!isCompleted}
      style={{
        ...preset.style,
        borderColor: isSelected ? 'var(--ant-color-primary)' : preset.style?.borderColor,
        borderWidth: isSelected ? 2 : 1,
        opacity: isCompleted ? 0.85 : 1
      }}
      styles={{ body: { ...preset.styles.body, display: 'flex', flexDirection: 'column' } }}
      actions={[
        <Tooltip title="记录成长表现" key="growth">
          <AppButton
            hierarchy="primary"
            tone="success"
            size="sm"
            style={{
              background: 'var(--ant-color-success)',
              borderColor: 'var(--ant-color-success)',
              color: 'var(--app-text-inverse)'
            }}
            disabled={isCompleted}
            icon={<StarOutlined />}
            onClick={() => onGrowthRecord(student)}
          >
            记录表现
          </AppButton>
        </Tooltip>
      ]}
    >
      <div className={styles.cardBody}>
        {/* 右上角角落复选框 */}
        <div className={styles.cornerCheckbox}>
          <Checkbox
            checked={isSelected}
            onChange={(e) => onSelect(student.enrollmentId, e.target.checked)}
          />
        </div>
        {/* 卡片头部 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: 12
        }}>
        <Space align="start" size={8}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }} onClick={() => onViewDetail(student)}>
            <Space align="center" size={8}>
              <Avatar 
                size={isMobile ? 32 : 36}
                style={{ 
                  fontSize: isMobile ? 12 : 14, 
                  fontWeight: 600,
                  backgroundColor: isCompleted ? 'var(--ant-color-border-secondary)' : (currentAttendanceColor || 'var(--ant-color-primary)')
                }}
              >
                {student.name?.slice(-2) || '学生'}
              </Avatar>
              <div>
                <Text 
                  strong 
                  style={{ 
                    fontSize: isMobile ? 13 : 14,
                    display: 'block',
                    lineHeight: 1.2
                  }}
                >
                  {student.name}
                </Text>
                {(student.school || student.grade) && (
                  <Text 
                    type="secondary" 
                    style={{ 
                      fontSize: isMobile ? 10 : 11,
                      lineHeight: 1.2
                    }}
                  >
                    {[student.school, student.grade && getGradeLabel(student.grade)]
                      .filter(Boolean)
                      .join(' • ')}
                  </Text>
                )}
              </div>
            </Space>
          </div>
        </Space>

        <Space align="start" size={4}>
          {isCompleted && (
            <Tag 
              color="var(--ant-color-warning)" 
              style={{ 
                fontSize: isMobile ? 10 : 11,
                margin: 0,
                borderRadius: 4
              }}
            >
              已完课
            </Tag>
          )}
          <Dropdown 
            menu={{ items: dropdownItems }}
            trigger={['click']}
            placement="bottomRight"
          >
            <AppButton
              hierarchy="tertiary"
              size="sm"
              icon={<MoreOutlined />}
            />
          </Dropdown>
        </Space>
      </div>

      {/* 考勤状态标签 */}
      {currentAttendance && (
        <div style={{ marginBottom: 12 }}>
          <Tag
            color={ATTENDANCE_CONFIG[currentAttendance as keyof typeof ATTENDANCE_CONFIG]?.color}
            style={{
              fontSize: isMobile ? 10 : 11,
              fontWeight: 500,
              borderRadius: 4
            }}
          >
            今日{currentTimeSlot === 'AM' ? '上午' : '下午'}：
            {ATTENDANCE_CONFIG[currentAttendance as keyof typeof ATTENDANCE_CONFIG]?.label}
          </Tag>
        </div>
      )}

      {/* 考勤按钮区域 */}
      <div style={{ flex: 1 }}>
        <Text 
          type="secondary" 
          style={{ 
            fontSize: isMobile ? 10 : 11,
            fontWeight: 500,
            marginBottom: 8,
            display: 'block',
            color: 'var(--ant-color-info)'
          }}
        >
          考勤签到
        </Text>
        {renderAttendanceButtons()}
        </div>
      </div>
    </Card>
  );
};

export default StudentCard; 