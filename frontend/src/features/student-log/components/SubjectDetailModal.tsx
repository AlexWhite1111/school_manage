import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Button,
  Space,
  Select,
  DatePicker,
  Typography,
  Tag,
  Spin,
  Empty,
  Statistic,
  Row,
  Col,
  Card,
  message
} from 'antd';
import {
  BookOutlined,
  ReloadOutlined,
  TrophyOutlined,
  CalendarOutlined,
  RiseOutlined,
  FallOutlined,
  MinusOutlined
} from '@ant-design/icons';
import { useResponsive } from '@/hooks/useResponsive';
import { useThemeStore } from '@/stores/themeStore';
import * as examApi from '@/api/examApi';
import * as studentLogApi from '@/api/studentLogApi';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

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

// 考试类型中文映射
const examTypeLabels: Record<string, string> = {
  'DAILY_QUIZ': '日常测验',
  'WEEKLY_TEST': '周测',
  'MONTHLY_EXAM': '月考',
  'MIDTERM': '期中考试',
  'FINAL': '期末考试'
};

interface SubjectDetailModalProps {
  visible: boolean;
  onClose: () => void;
  subjectData: {
    subject: string;
    studentPublicId?: string; // 改用publicId
    classId?: number;
    averageScore: number;
    highest: number;
    lowest: number;
    totalExams: number;
    validScores: number;
    absentCount: number;
    trend: 'improving' | 'declining' | 'stable';
    improvement: number;
  };
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

const SubjectDetailModal: React.FC<SubjectDetailModalProps> = ({
  visible,
  onClose,
  subjectData,
  dateRange
}) => {
  const { isMobile, isTablet } = useResponsive();
  const { theme } = useThemeStore();

  // 状态管理
  const [loading, setLoading] = useState(false);
  const [examHistory, setExamHistory] = useState<any[]>([]);
  const [selectedExamType, setSelectedExamType] = useState<string>('all');
  const [customDateRange, setCustomDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    dateRange ? [dayjs(dateRange.startDate), dayjs(dateRange.endDate)] : null
  );

  // 主题样式
  const themeStyles = {
    cardBackground: theme === 'dark' ? '#141414' : '#ffffff',
    textPrimary: theme === 'dark' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
    textSecondary: theme === 'dark' ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)',
    successColor: theme === 'dark' ? '#52c41a' : '#389e0d',
    warningColor: theme === 'dark' ? '#faad14' : '#d48806',
    errorColor: theme === 'dark' ? '#ff4d4f' : '#cf1322',
    primaryColor: theme === 'dark' ? '#1890ff' : '#1890ff',
    borderColor: theme === 'dark' ? '#303030' : '#e8e8e8',
  };

  // 动态Modal宽度
  const getModalWidth = () => {
    if (isMobile) return '95vw';
    if (isTablet) return '90vw';
    return 1000;
  };

  // 获取趋势图标
  const getTrendIcon = (trend: string, improvement: number) => {
    if (trend === 'improving') {
      return <RiseOutlined style={{ color: themeStyles.successColor }} />;
    } else if (trend === 'declining') {
      return <FallOutlined style={{ color: themeStyles.errorColor }} />;
    }
    return <MinusOutlined style={{ color: themeStyles.textSecondary }} />;
  };

  // 加载考试历史数据
  const loadExamHistory = async () => {
    if (!subjectData.studentPublicId) {
      console.warn('缺少学生publicId，无法加载考试历史');
      return;
    }

    setLoading(true);
    try {
      const filters: any = {
        subject: subjectData.subject
      };

      if (selectedExamType !== 'all') {
        filters.examType = selectedExamType;
      }

      if (customDateRange) {
        filters.startDate = customDateRange[0].format('YYYY-MM-DD');
        filters.endDate = customDateRange[1].format('YYYY-MM-DD');
      } else if (dateRange) {
        filters.startDate = dateRange.startDate;
        filters.endDate = dateRange.endDate;
      }

      console.log('🔍 加载考试历史 - 筛选条件:', filters);
      const result = await examApi.getStudentExamHistoryByPublicId(subjectData.studentPublicId!, filters);
      console.log('📊 API返回数据:', result);
      
      // 筛选出当前科目的成绩
      const currentSubjectData = result.subjectAnalysis.find(
        item => item.subject === subjectData.subject
      );
      
      if (currentSubjectData) {
        console.log('📋 当前科目数据:', currentSubjectData);
        console.log('📝 原始成绩数据:', currentSubjectData.scores);
        
        // 按时间倒序排序（最新的在前面）
        const sortedScores = (currentSubjectData.scores || []).sort((a: any, b: any) => 
          new Date(b.examDate).getTime() - new Date(a.examDate).getTime()
        );
        
        console.log('📅 排序后的数据:', sortedScores);
        
        // 如果选择了特定考试类型，进行前端二次筛选（以防后端筛选有问题）
        let filteredScores = sortedScores;
        if (selectedExamType !== 'all') {
          filteredScores = sortedScores.filter((score: any) => 
            score.examType === selectedExamType
          );
          console.log(`🔍 考试类型筛选 (${selectedExamType}):`, filteredScores);
        }
        
        setExamHistory(filteredScores);
      } else {
        console.warn('⚠️ 未找到当前科目的数据:', subjectData.subject);
        setExamHistory([]);
      }
    } catch (error) {
      console.error('❌ 加载考试历史失败:', error);
      message.error('加载考试历史失败');
      setExamHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadExamHistory();
    }
  }, [visible, selectedExamType, customDateRange]);

  // 表格列定义
  const columns = [
    {
      title: '考试名称',
      dataIndex: 'examName',
      key: 'examName',
      render: (text: string, record: any) => (
        <div>
          <Text strong>{text}</Text>
          <div>
                         <Tag color="blue">
               {examTypeLabels[record.examType] || record.examType}
             </Tag>
          </div>
        </div>
      ),
    },
    {
      title: '考试日期',
      dataIndex: 'examDate',
      key: 'examDate',
      render: (date: string) => (
        <Space>
          <CalendarOutlined style={{ color: themeStyles.textSecondary }} />
          <Text>{dayjs(date).format('YYYY-MM-DD')}</Text>
        </Space>
      ),
      responsive: ['sm'] as any,
      sorter: (a: any, b: any) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime(),
    },
    {
      title: '个人分数',
      dataIndex: 'score',
      key: 'score',
      render: (score: number, record: any) => {
        if (record.isAbsent) {
          return <Text type="secondary">缺考</Text>;
        }
        
        // 确保数据安全性
        const displayScore = record.normalizedScore || score || 0;
        const scoreText = typeof displayScore === 'number' ? displayScore.toFixed(1) : '0.0';
        
        return (
          <div>
            <Text style={{
              color: displayScore >= 80 ? themeStyles.successColor :
                     displayScore >= 60 ? themeStyles.warningColor : themeStyles.errorColor,
              fontWeight: 'bold',
              fontSize: '16px'
            }}>
              {scoreText}
            </Text>
            {record.totalScore && (
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  原始: {(record.score || 0).toFixed(1)}/{record.totalScore}
                </Text>
              </div>
            )}
          </div>
        );
      },
      sorter: (a: any, b: any) => (a.normalizedScore || a.score || 0) - (b.normalizedScore || b.score || 0),
    },
    {
      title: '班级排名',
      dataIndex: 'rank',
      key: 'rank',
      render: (rank: number, record: any) => {
        if (record.isAbsent) {
          return <Text type="secondary">-</Text>;
        }
        
        return (
          <Space>
            <TrophyOutlined style={{ 
              color: rank <= 5 ? themeStyles.successColor : 
                     rank <= 15 ? themeStyles.warningColor : themeStyles.textSecondary 
            }} />
            <Text strong>#{rank}</Text>
          </Space>
        );
      },
      responsive: ['md'] as any,
    },
    {
      title: '班级平均',
      dataIndex: 'classAverage',
      key: 'classAverage',
      render: (avg: number) => (
        <Text type="secondary">{avg ? avg.toFixed(1) : '-'}</Text>
      ),
      responsive: ['lg'] as any,
    },
    {
      title: '班级最高',
      dataIndex: 'classHighest',
      key: 'classHighest',
      render: (highest: number) => (
        <Text type="success">{highest ? highest.toFixed(1) : '-'}</Text>
      ),
      responsive: ['lg'] as any,
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <BookOutlined />
          <span>{subjectLabels[subjectData.subject]} - 考试详情</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={getModalWidth()}
      footer={[
        <Button key="refresh" icon={<ReloadOutlined />} onClick={loadExamHistory} loading={loading}>
          刷新
        </Button>,
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
      style={{ top: isMobile ? 20 : 50 }}
    >
      {/* 科目概览统计 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[8, 8]}>
          <Col xs={12} sm={6}>
            <Statistic
              title="平均分"
              value={subjectData.averageScore}
              precision={1}
              valueStyle={{ 
                color: subjectData.averageScore >= 80 ? themeStyles.successColor :
                       subjectData.averageScore >= 60 ? themeStyles.warningColor : themeStyles.errorColor,
                fontSize: isMobile ? '16px' : '20px'
              }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="最高分"
              value={subjectData.highest}
              precision={1}
              valueStyle={{ 
                color: themeStyles.successColor,
                fontSize: isMobile ? '16px' : '20px'
              }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="参考次数"
              value={subjectData.totalExams}
              valueStyle={{ 
                color: themeStyles.primaryColor,
                fontSize: isMobile ? '16px' : '20px'
              }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: themeStyles.textSecondary, fontSize: '14px', marginBottom: '4px' }}>
                趋势
              </div>
              <Space>
                {getTrendIcon(subjectData.trend, subjectData.improvement)}
                <Text style={{
                  color: subjectData.improvement > 0 ? themeStyles.successColor :
                         subjectData.improvement < 0 ? themeStyles.errorColor : themeStyles.textSecondary,
                  fontSize: isMobile ? '16px' : '20px',
                  fontWeight: 'bold'
                }}>
                  {subjectData.improvement > 0 ? '+' : ''}{subjectData.improvement.toFixed(1)}%
                </Text>
              </Space>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 筛选控制区 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12}>
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>考试类型</Text>
              <Select
                style={{ width: '100%' }}
                value={selectedExamType}
                onChange={setSelectedExamType}
                size={isMobile ? 'middle' : 'small'}
              >
                <Option value="all">全部类型</Option>
                {Object.entries(examTypeLabels).map(([value, label]) => (
                  <Option key={value} value={value}>{label}</Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={12}>
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>时间范围</Text>
              <RangePicker
                style={{ width: '100%' }}
                value={customDateRange}
                onChange={(dates) => setCustomDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                format="YYYY-MM-DD"
                size={isMobile ? 'middle' : 'small'}
                placeholder={['开始日期', '结束日期']}
              />
            </Space>
          </Col>
        </Row>
        
        {/* 筛选状态提示 */}
        <div style={{ marginTop: '12px', padding: '8px', backgroundColor: themeStyles.cardBackground, borderRadius: '4px' }}>
          <Space wrap>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              当前显示: 
            </Text>
            <Tag color="blue">
              {selectedExamType === 'all' ? '全部类型' : examTypeLabels[selectedExamType]}
            </Tag>
            {customDateRange && (
              <Tag color="green">
                {customDateRange[0].format('YYYY-MM-DD')} ~ {customDateRange[1].format('YYYY-MM-DD')}
              </Tag>
            )}
            <Text type="secondary" style={{ fontSize: '12px' }}>
              共 {examHistory.length} 条记录
            </Text>
          </Space>
        </div>
      </Card>

      {/* 考试历史表格 */}
      <Spin spinning={loading}>
        {examHistory.length > 0 ? (
          <Table
            columns={columns}
            dataSource={examHistory.map((item, index) => ({
              key: `${item.examId}-${index}`,
              ...item
            }))}
            pagination={{
              pageSize: isMobile ? 5 : 10,
              size: 'small',
              showSizeChanger: !isMobile,
              showQuickJumper: !isMobile,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`
            }}
            size={isMobile ? 'middle' : 'small'}
            scroll={{ x: 'max-content' }}
          />
        ) : (
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无考试记录"
            style={{ padding: '40px 0' }}
          />
        )}
      </Spin>
    </Modal>
  );
};

export default SubjectDetailModal; 