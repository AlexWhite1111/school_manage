
import AppButton from '@/components/AppButton';
import React, { useState, useEffect } from 'react';
import { Modal, Row, Col, Select, Space, Statistic, Typography, Alert, Spin, Empty, Tag, theme as themeApi, Card } from 'antd';
import UnifiedRangePicker from '@/components/common/UnifiedRangePicker';
import { UnifiedCardPresets } from '@/theme/card';
import {
  BookOutlined,
  ReloadOutlined,
  EyeOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { Line } from '@ant-design/charts';
import { useThemeStore } from '@/stores/themeStore';
import { useResponsive } from '@/hooks/useResponsive';
import { useNavigate } from 'react-router-dom';
import * as examApi from '@/api/examApi';
import type { Subject, ExamType } from '@/types/api';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;
 

// 科目中文映射
const subjectLabels: Record<Subject, string> = {
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
const examTypeLabels: Record<ExamType, string> = {
  'DAILY_QUIZ': '日常测验',
  'WEEKLY_TEST': '周测',
  'MONTHLY_EXAM': '月考', 
  'MIDTERM': '期中考试',
  'FINAL': '期末考试'
};

interface SubjectTrendModalProps {
  visible: boolean;
  onClose: () => void;
  classId: number;
  className: string;
  subject: Subject;
  initialTimeRange?: {
    startDate: string;
    endDate: string;
  };
}

const SubjectTrendModal: React.FC<SubjectTrendModalProps> = ({
  visible,
  onClose,
  classId,
  className,
  subject,
  initialTimeRange
}) => {
  const { theme } = useThemeStore();
  const { isMobile } = useResponsive();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [selectedExamType, setSelectedExamType] = useState<ExamType | 'all'>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(
    initialTimeRange ? [
      dayjs(initialTimeRange.startDate),
      dayjs(initialTimeRange.endDate)
    ] : null
  );
  const [trendData, setTrendData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const { token } = themeApi.useToken();
  const themeStyles = {
    successColor: token.colorSuccess,
    warningColor: token.colorWarning,
    errorColor: token.colorError,
    primaryColor: token.colorPrimary,
    textSecondary: token.colorTextSecondary
  } as const;
  const preset = UnifiedCardPresets.mobileCompact(isMobile);

  const loadTrendData = async () => {
    setLoading(true);
    try {
      const filters: any = {
        examType: selectedExamType === 'all' ? undefined : selectedExamType
      };
      
      if (dateRange) {
        filters.startDate = dateRange[0].format('YYYY-MM-DD');
        filters.endDate = dateRange[1].format('YYYY-MM-DD');
      }

      const trendResult = await examApi.getSubjectTrend(classId, subject, filters);
      setTrendData(trendResult);
      setError(null);
    } catch (err) {
      console.error('❌ 科目趋势数据加载失败:', err);
      setError('科目趋势数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadTrendData();
    }
  }, [visible, selectedExamType, dateRange]);

  const chartConfig = {
    data: trendData?.trend || [],
    xField: 'examDate',
    yField: 'normalizedAverage',
    smooth: true,
    point: { size: 3 },
    color: themeStyles.primaryColor,
    tooltip: {
      formatter: (datum: any) => ({
        name: '平均分',
        value: `${datum.normalizedAverage}% (${datum.examName})`
      })
    }
  };

  const handleViewDetails = () => {
    navigate(`/subject-trend/${classId}/${subject}`);
    onClose();
  };

  const handleRefresh = () => {
    loadTrendData();
  };

  return (
    <Modal
      title={
        <Space>
          <BookOutlined />
          <span>{subjectLabels[subject]} 趋势分析</span>
          <Tag color="blue">{className}</Tag>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={isMobile ? '95vw' : 800}
      footer={[
        <AppButton key="refresh" icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
          刷新
        </AppButton>,
        <AppButton key="details" hierarchy="primary" icon={<EyeOutlined />} onClick={handleViewDetails}>
          查看详情
        </AppButton>,
        <AppButton key="close" onClick={onClose}>
          关闭
        </AppButton>
      ]}
    >
      {/* 筛选控制区 */}
      <Card size="small" style={{ ...preset.style, marginBottom: 'var(--space-4)' }} styles={preset.styles}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12}>
            <Text type="secondary" style={{ fontSize: '12px' }}>考试类型</Text>
            <Select
              style={{ width: '100%', marginTop: 'var(--space-1)' }}
              value={selectedExamType}
              onChange={setSelectedExamType}
              size="small"
            >
              <Option value="all">全部类型</Option>
              {Object.entries(examTypeLabels).map(([value, label]) => (
                <Option key={value} value={value}>{label}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12}>
            <Text type="secondary" style={{ fontSize: '12px' }}>时间范围</Text>
            <UnifiedRangePicker
              className="w-full"
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              size="small"
            />
          </Col>
        </Row>
      </Card>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Text type="secondary">加载趋势数据中...</Text>
          </div>
        </div>
      ) : error ? (
        <Alert 
          message="数据加载失败" 
          description={error}
          type="error" 
          showIcon 
        />
      ) : !trendData ? (
        <Empty description="暂无数据" />
      ) : (
        <>
          {/* 核心指标 */}
          <Row gutter={[12, 12]} style={{ marginBottom: 'var(--space-4)' }}>
            <Col span={6}>
              <Card size="small" style={{ ...preset.style }} styles={preset.styles}>
                <Statistic
                  title="考试数"
                  value={trendData.summary.totalExams}
                  valueStyle={{ fontSize: '18px', color: themeStyles.primaryColor }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ ...preset.style }} styles={preset.styles}>
                <Statistic
                  title="平均分"
                  value={trendData.summary.averageScore}
                  suffix="%"
                  valueStyle={{ 
                    fontSize: '18px',
                    color: trendData.summary.averageScore >= 80 ? themeStyles.successColor : 
                           trendData.summary.averageScore >= 60 ? themeStyles.warningColor : themeStyles.errorColor
                  }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ ...preset.style }} styles={preset.styles}>
                <Statistic
                  title="参与率"
                  value={trendData.summary.averageParticipationRate}
                  suffix="%"
                  valueStyle={{ fontSize: '18px', color: themeStyles.successColor }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small" style={{ ...preset.style }} styles={preset.styles}>
                <Statistic
                  title="趋势"
                  value={Math.abs(trendData.summary.improvement)}
                  suffix="%"
                  prefix={
                    trendData.summary.improvement > 0 ? 
                    <ArrowUpOutlined style={{ color: themeStyles.successColor }} /> :
                    trendData.summary.improvement < 0 ?
                    <ArrowDownOutlined style={{ color: themeStyles.errorColor }} /> :
                    <InfoCircleOutlined style={{ color: themeStyles.textSecondary }} />
                  }
                  valueStyle={{ 
                    fontSize: '18px',
                    color: trendData.summary.improvement > 0 ? themeStyles.successColor :
                           trendData.summary.improvement < 0 ? themeStyles.errorColor : themeStyles.textSecondary
                  }}
                />
              </Card>
            </Col>
          </Row>

          {/* 图表区域 */}
          <Card title="成绩趋势" size="small" style={{ ...preset.style }} styles={preset.styles}>
            {trendData.trend.length > 0 ? (
              <div style={{ height: '250px' }}>
                <Line {...chartConfig} />
              </div>
            ) : (
              <Empty description="暂无趋势数据" />
            )}
          </Card>
        </>
      )}
    </Modal>
  );
};

export default SubjectTrendModal; 