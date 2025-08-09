import React from 'react';
import {
  Card,
  Avatar,
  Button,
  Space,
  Tag,
  Checkbox,
  Dropdown,
  Divider,
  Row,
  Col,
  Tooltip,
  Typography
} from 'antd';
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
    color: '#52c41a',
    ghost: false 
  },
  LATE: { 
    label: '迟到', 
    icon: ClockCircleOutlined, 
    color: '#faad14',
    ghost: false 
  },
  ABSENT: { 
    label: '请假', 
    icon: ExclamationCircleOutlined, 
    color: '#1890ff',
    ghost: true 
  },
  NO_SHOW: { 
    label: '缺席', 
    icon: CloseCircleOutlined, 
    color: '#ff4d4f',
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

  const isSelected = selectedRowKeys.includes(student.enrollmentId);
  const currentTimeSlot = new Date().getHours() < 12 ? 'AM' : 'PM';
  const currentAttendance = student.todayAttendance?.[currentTimeSlot];

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
      <Row gutter={[4, 4]}>
        {Object.entries(ATTENDANCE_CONFIG).map(([status, config]) => {
          const IconComponent = config.icon;
          const isActive = currentAttendance === status;
          const loading = attendanceLoading[student.enrollmentId] === status;
          
          return (
            <Col span={12} key={status}>
              <Tooltip title={config.label}>
                <Button
                  size="small"
                  block
                  type={isActive ? 'primary' : 'default'}
                  ghost={config.ghost && !isActive}
                  disabled={isCompleted}
                  loading={loading}
                  icon={<IconComponent />}
                  onClick={() => onAttendance(student, status)}
                  className={styles.attendanceButton}
                  style={{
                    height: isMobile ? 28 : 32,
                    fontSize: isMobile ? 11 : 12,
                    borderColor: isActive ? config.color : undefined,
                    color: isActive ? undefined : config.color
                  }}
                >
                  {isMobile ? '' : config.label}
                </Button>
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
        height: 'auto',
        minHeight: isMobile ? 160 : 180,
        borderRadius: 8,
        borderColor: isSelected ? '#1890ff' : undefined,
        borderWidth: isSelected ? 2 : 1,
        opacity: isCompleted ? 0.75 : 1,
        transition: 'all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)',
        boxShadow: isSelected 
          ? '0 4px 12px rgba(24, 144, 255, 0.15)' 
          : '0 1px 3px rgba(0, 0, 0, 0.12)',
        background: theme === 'dark' 
          ? (isCompleted ? '#1a1a1a' : '#141414')
          : (isCompleted ? '#fafafa' : '#ffffff')
      }}
      bodyStyle={{
        padding: isMobile ? 12 : 16,
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      actions={[
        <Tooltip title="记录成长表现" key="growth">
          <Button
            type="text"
            size="small"
            disabled={isCompleted}
            icon={<StarOutlined />}
            onClick={() => onGrowthRecord(student)}
            style={{
              color: isCompleted ? '#d9d9d9' : '#1890ff',
              fontSize: isMobile ? 11 : 12
            }}
          >
            记录表现
          </Button>
        </Tooltip>
      ]}
    >
      <div className={styles.cardBody}>
        {/* 卡片头部 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: 12
        }}>
        <Space align="start" size={8}>
          <Checkbox
            checked={isSelected}
            onChange={(e) => onSelect(student.enrollmentId, e.target.checked)}
            style={{ marginTop: 2 }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Space align="center" size={8}>
              <Avatar 
                size={isMobile ? 32 : 36}
                style={{ 
                  backgroundColor: isCompleted ? '#bfbfbf' : '#1890ff',
                  fontSize: isMobile ? 12 : 14,
                  fontWeight: 600
                }}
              >
                {student.name?.slice(-2) || '学生'}
              </Avatar>
              <div>
                <Text 
                  strong 
                  style={{ 
                    fontSize: isMobile ? 13 : 14,
                    color: isCompleted ? '#8c8c8c' : undefined,
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
              color="orange" 
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
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              style={{
                fontSize: 12,
                color: '#8c8c8c'
              }}
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
            display: 'block'
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