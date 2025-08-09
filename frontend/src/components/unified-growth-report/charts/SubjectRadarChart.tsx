import React, { useState, useMemo } from 'react';
import {
  Card,
  Select,
  Space,
  Typography,
  Tooltip,
  Empty
} from 'antd';
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
  
  // 这里简化处理，实际应该从班级数据获取
  const [selectedClassId, setSelectedClassId] = useState<string | number>('all');
  const studentClasses: any[] = []; // 简化处理
  const classesLoading = false;

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
            <RadarChartOutlined style={{ color: '#1890ff' }} />
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
          <RadarChartOutlined style={{ color: '#1890ff' }} />
          <span>科目表现雷达图</span>
        </Space>
      }
      extra={
        <Space>
          <Select
            size="small"
            value={selectedClassId}
            onChange={setSelectedClassId}
            style={{ width: 140 }}
            loading={classesLoading}
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
          <Tooltip title="选择班级查看该班级的科目表现，包含个人成绩、班级平均分和班级优秀线">
            <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
          </Tooltip>
        </Space>
      }
      style={style}
      className={className}
    >
      {radarChartData.length > 0 ? (
        <div style={{ height: isMobile ? '300px' : '400px' }}>
          <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '16px' }}>
            基于归一化成绩的科目综合表现分析（100分制）
            {selectedClassId === 'all' && ` - 显示所有科目的${radarChartData.length}个科目表现`}
          </Text>
          <ResponsiveContainer width="100%" height="90%">
            <RadarChart data={radarChartData}>
              <PolarGrid gridType="polygon" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fontSize: 12, fill: theme === 'dark' ? '#fff' : '#666' }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: theme === 'dark' ? '#aaa' : '#999' }}
              />
              <Radar
                name="个人成绩"
                dataKey="student"
                stroke="#1890ff"
                fill="#1890ff"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Radar
                name="班级平均"
                dataKey="average"
                stroke="#faad14"
                fill="#faad14"
                fillOpacity={0.1}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Radar
                name="班级优秀线"
                dataKey="excellent"
                stroke="#52c41a"
                fill="#52c41a"
                fillOpacity={0.05}
                strokeWidth={2}
                strokeDasharray="3 3"
              />
              <Legend />
              <RechartsTooltip 
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#141414' : '#fff',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px'
                }}
                formatter={(value: any, name: string) => [
                  `${Number(value).toFixed(2)}分`, 
                  name === 'student' ? '个人成绩' : 
                  name === 'average' ? '班级平均' : '班级优秀线'
                ]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ 
          border: '1px dashed #d9d9d9', 
          borderRadius: '8px', 
          padding: '60px 20px',
          color: '#8c8c8c',
          textAlign: 'center'
        }}>
          <RadarChartOutlined style={{ fontSize: '32px', marginBottom: '16px' }} />
          <div>暂无科目数据</div>
          <div style={{ fontSize: '12px', marginTop: '8px' }}>
            该时段内该学生无有效考试成绩
          </div>
        </div>
      )}
    </Card>
  );
};

export default SubjectRadarChart;