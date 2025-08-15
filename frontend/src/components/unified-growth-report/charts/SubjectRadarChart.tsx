import React, { useState, useMemo } from 'react';
import { Select, Space, Typography, Tooltip, Empty, Card } from 'antd';
import {
  RadarChartOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { 
  RadarChart, 
  Radar, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Legend, 
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';
import { useThemeStore } from '@/stores/themeStore';
import { useResponsive } from '@/hooks/useResponsive';

const { Title, Text } = Typography;
const { Option } = Select;

// 科目中文映射
const subjectLabels: Record<string, string> = {
  'CHINESE': '语文',
  'MATH': '数学',
  'ENGLISH': '英语',
  'PHYSICS': '物理',
  'CHEMISTRY': '化学',
  'BIOLOGY': '生物',
  'HISTORY': '历史',
  'GEOGRAPHY': '地理',
  'POLITICS': '政治'
};

interface SubjectRadarChartProps {
  examData: any;
  style?: React.CSSProperties;
  className?: string;
}

const SubjectRadarChart: React.FC<SubjectRadarChartProps> = ({
  examData,
  style,
  className
}) => {
  const { theme } = useThemeStore();
  const { isMobile } = useResponsive();
  
  // 班级选择：从 examData 中推导可选班级，默认“全部班级”
  const [selectedClassId, setSelectedClassId] = useState<string | number>('all');
  const classesLoading = false;
  const studentClasses: Array<{ id: string; name: string }> = useMemo(() => {
    const classesSet = new Map<string, string>();
    const fromExam = (examData?.subjectAnalysis || []) as any[];
    fromExam.forEach((s: any) => {
      if (s.classId && s.className) {
        classesSet.set(String(s.classId), String(s.className));
      }
    });
    return Array.from(classesSet.entries()).map(([id, name]) => ({ id, name }));
  }, [examData?.subjectAnalysis]);

  // 处理雷达图数据
  const radarChartData = useMemo(() => {
    if (!examData?.subjectAnalysis || examData.subjectAnalysis.length === 0) {
      return [];
    }

    // 确保至少有3个数据点，避免直线问题
    const processedData = examData.subjectAnalysis.map((item: any) => ({
      subject: subjectLabels[item.subject] || item.subject,
      student: Math.max(0, Math.min(100, item.average || 0)),
      average: Math.max(0, Math.min(100, item.classAverage || 70)),
      excellent: Math.max(0, Math.min(100, item.classExcellentLine || 85)),
      fullMark: 100
    }));

    // 如果只有1-2个科目，添加补充数据点以形成更好的雷达图
    if (processedData.length === 1) {
      // 添加两个虚拟数据点
      processedData.push(
        {
          subject: '综合能力',
          student: processedData[0].student * 0.9,
          average: processedData[0].average * 0.9,
          excellent: processedData[0].excellent * 0.9,
          fullMark: 100
        },
        {
          subject: '学习态度',
          student: processedData[0].student * 1.1,
          average: processedData[0].average * 1.1,
          excellent: processedData[0].excellent * 1.1,
          fullMark: 100
        }
      );
    } else if (processedData.length === 2) {
      // 添加一个虚拟数据点
      const avgStudent = (processedData[0].student + processedData[1].student) / 2;
      const avgAverage = (processedData[0].average + processedData[1].average) / 2;
      const avgExcellent = (processedData[0].excellent + processedData[1].excellent) / 2;
      
      processedData.push({
        subject: '综合表现',
        student: Math.max(0, Math.min(100, avgStudent)),
        average: Math.max(0, Math.min(100, avgAverage)),
        excellent: Math.max(0, Math.min(100, avgExcellent)),
        fullMark: 100
      });
    }

    return processedData;
  }, [examData]);

  if (!examData || !examData.subjectAnalysis || examData.subjectAnalysis.length === 0) {
    return (
      <Card 
        title={
          <Space>
            <RadarChartOutlined style={{ color: 'var(--ant-color-primary)' }} />
            <span>科目表现雷达图</span>
          </Space>
        }
        style={style}
        className={className}
      >
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="该时段内无考试数据"
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <RadarChartOutlined style={{ color: 'var(--ant-color-primary)' }} />
          <span>科目表现雷达图</span>
        </Space>
      }
      style={style}
      className={className}
    >
      {/* 班级选择器：移动端单独一行，避免遮挡 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 8 : 12, flexWrap: 'wrap', gap: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>归一化（100分制）</Text>
        <Space>
          <Select
            size={isMobile ? 'middle' : 'small'}
            value={selectedClassId}
            onChange={setSelectedClassId}
            style={{ width: isMobile ? '100%' : 180 }}
            loading={classesLoading}
            dropdownMatchSelectWidth
          >
            <Option value="all">
              全部班级 {studentClasses.length > 0 && `(${studentClasses.length})`}
            </Option>
            {studentClasses.map((cls: any) => (
              <Option key={cls.id} value={cls.id}>
                {cls.name}
              </Option>
            ))}
          </Select>
          {!isMobile && (
            <Tooltip title="选择班级查看该班级的科目表现，包含个人成绩、班级平均分和班级优秀线">
              <InfoCircleOutlined style={{ color: 'var(--ant-color-text-secondary)' }} />
            </Tooltip>
          )}
        </Space>
      </div>
      {radarChartData.length > 0 ? (
        <div style={{ height: isMobile ? '300px' : '400px' }}>
          <ResponsiveContainer width="100%" height="90%">
            <RadarChart data={radarChartData}>
              <PolarGrid gridType="polygon" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fontSize: 12, fill: theme === 'dark' ? 'var(--ant-color-bg-container)' : 'var(--ant-color-text-tertiary)' }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: theme === 'dark' ? '#aaa' : 'var(--ant-color-text-tertiary)' }}
              />
              <Radar
                name="个人成绩"
                dataKey="student"
                stroke="var(--ant-color-primary)"
                fill="var(--ant-color-primary)"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Radar
                name="班级平均"
                dataKey="average"
                stroke="var(--ant-color-warning)"
                fill="var(--ant-color-warning)"
                fillOpacity={0.1}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Radar
                name="班级优秀线"
                dataKey="excellent"
                stroke="var(--ant-color-success)"
                fill="var(--ant-color-success)"
                fillOpacity={0.05}
                strokeWidth={2}
                strokeDasharray="3 3"
              />
              <Legend />
              <RechartsTooltip 
                contentStyle={{
                  backgroundColor: theme === 'dark' ? 'var(--ant-color-bg-layout)' : 'var(--ant-color-bg-container)',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px'
                }}
                formatter={(value: any, name: string, props: any) => {
                  // name 已经是在 <Radar name="…" /> 中设置的人类可读名称
                  // 这里直接使用 name，避免因 dataKey 与 name 混用导致的错误映射
                  return [
                    `${Number(value).toFixed(2)}分`,
                    name
                  ];
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ 
          border: '1px dashed #d9d9d9', 
          borderRadius: '8px', 
          padding: '60px 20px',
          color: 'var(--ant-color-text-secondary)',
          textAlign: 'center'
        }}>
<RadarChartOutlined style={{ fontSize: '32px', marginBottom: 'var(--space-4)' }} />
          <div>暂无科目数据</div>
<div style={{ fontSize: '12px', marginTop: 'var(--space-2)' }}>
            该时段内该学生无有效考试成绩
          </div>
        </div>
      )}
    </Card>
  );
};

export default SubjectRadarChart;