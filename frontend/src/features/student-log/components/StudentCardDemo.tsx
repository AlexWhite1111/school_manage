import React from 'react';
import { Space, Divider, Typography } from 'antd';
import StudentCard from './StudentCard';
import { AttendanceStatus, TagType } from '@/types/api';
import type { ClassStudent } from '@/types/api';

const { Title, Text } = Typography;

// 模拟学生数据
const mockStudents: ClassStudent[] = [
  {
    id: 1,
    name: '张小明',
    gender: 'MALE',
    birthDate: '2008-03-15',
    school: '北京第一中学',
    grade: '高一',
    status: 'ENROLLED',
    enrollmentId: 101,
    enrollmentDate: '2024-09-01',
    todayAttendance: {
      AM: AttendanceStatus.PRESENT,
      PM: null
    },
    recentGrowthTags: [
      { id: 1, text: '主动提问', type: TagType.GROWTH_POSITIVE, createdAt: '2024-01-15T10:00:00Z' },
      { id: 2, text: '按时完成作业', type: TagType.GROWTH_POSITIVE, createdAt: '2024-01-15T14:00:00Z' }
    ],
    otherEnrollments: [
      { id: 1, className: '数学提高班' }
    ],
    quickStats: {
      weeklyAttendanceRate: 95,
      recentPositiveTags: 8,
      recentNegativeTags: 1
    }
  },
  {
    id: 2,
    name: '李小红',
    gender: 'FEMALE',
    birthDate: '2008-07-20',
    school: '北京第二中学',
    grade: '高一',
    status: 'ENROLLED',
    enrollmentId: 102,
    enrollmentDate: '2024-09-01',
    todayAttendance: {
      AM: AttendanceStatus.LATE,
      PM: AttendanceStatus.PRESENT
    },
    recentGrowthTags: [
      { id: 3, text: '课堂积极', type: TagType.GROWTH_POSITIVE, createdAt: '2024-01-15T10:00:00Z' },
      { id: 4, text: '作业拖拉', type: TagType.GROWTH_NEGATIVE, createdAt: '2024-01-15T16:00:00Z' }
    ],
    quickStats: {
      weeklyAttendanceRate: 88,
      recentPositiveTags: 5,
      recentNegativeTags: 3
    }
  },
  {
    id: 3,
    name: '王小强',
    gender: 'MALE',
    birthDate: '2008-12-05',
    school: '北京第三中学',
    grade: '高二',
    status: 'TRIAL_CLASS',
    enrollmentId: 103,
    enrollmentDate: '2024-10-01',
    todayAttendance: {
      AM: AttendanceStatus.ABSENT,
      PM: null
    },
    recentGrowthTags: [],
    quickStats: {
      weeklyAttendanceRate: 75,
      recentPositiveTags: 2,
      recentNegativeTags: 4
    }
  }
];

const StudentCardDemo: React.FC = () => {
  const handleStudentClick = (studentId: number) => {
    console.log('学生点击:', studentId);
  };

  const handleRefresh = () => {
    console.log('刷新数据');
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <Title level={2}>学生卡片组件演示</Title>
      <Text type="secondary">
        展示了优化后的学生卡片设计，包括简洁的信息展示、响应式签到按钮和成长词条选择功能
      </Text>
      
      <Divider />
      
      <Title level={3}>不同状态的学生卡片</Title>
      <div className="student-cards-grid" style={{ maxWidth: '1200px' }}>
        {mockStudents.map(student => (
          <StudentCard
            key={student.id}
            student={student}
            onStudentClick={handleStudentClick}
            onRefresh={handleRefresh}
          />
        ))}
      </div>
      
      <Divider />
      
      <Title level={3}>批量选择模式</Title>
      <div className="student-cards-grid" style={{ maxWidth: '800px' }}>
        <StudentCard
          student={mockStudents[0]}
          batchDeleteMode={true}
          selected={true}
          onSelect={(selected) => console.log('选择状态:', selected)}
          onRefresh={handleRefresh}
        />
        <StudentCard
          student={mockStudents[1]}
          batchDeleteMode={true}
          selected={false}
          onSelect={(selected) => console.log('选择状态:', selected)}
          onRefresh={handleRefresh}
        />
      </div>
      
      <Divider />
      
      <div style={{ marginTop: '24px' }}>
        <Title level={4}>设计特点</Title>
        <ul>
          <li><strong>简洁信息：</strong>只显示学生姓名和必要的时间提示</li>
          <li><strong>响应式签到：</strong>四个签到按钮默认无色，选中时填充相应颜色</li>
          <li><strong>智能时段：</strong>根据北京时间自动判断上午/下午考勤</li>
          <li><strong>分组词条：</strong>成长表现词条按正面/负面分组显示</li>
          <li><strong>自适应布局：</strong>在不同屏幕尺寸下自动调整卡片大小和按钮布局</li>
          <li><strong>优雅交互：</strong>悬浮效果、加载状态和视觉反馈</li>
        </ul>
      </div>
    </div>
  );
};

export default StudentCardDemo; 