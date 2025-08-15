import React, { useMemo } from 'react';
import { Row, Col, Statistic, Progress, Typography, Space, Tag, Table, Empty, Tooltip, Badge, Card } from 'antd';
import {
  TrophyOutlined,
  RiseOutlined, 
  FallOutlined,
  BookOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  UserOutlined,
  MinusOutlined
} from '@ant-design/icons';
import type { ExamAnalysisPanelProps } from '@/types/unifiedGrowthReport';
import { useResponsive } from '@/hooks/useResponsive';
import { theme } from 'antd';
import { getSubjectLabel } from '@/utils/enumMappings';
import { EXCELLENT_SCORE_THRESHOLD, PASS_SCORE_THRESHOLD, getScoreBand } from '@/config/examStandards';

const { Title, Text } = Typography;

/**
 * 考试分析面板组件
 * 从原StudentGrowthReport中迁移而来
 */
const ExamAnalysisPanel: React.FC<ExamAnalysisPanelProps> = ({
  data,
  showDetails = true,
  loading = false,
  className,
  style,
  onSubjectClick
}) => {
  const { isMobile } = useResponsive();
  const { token } = theme.useToken();

  // 计算考试统计数据
  const examStats = useMemo(() => {
    if (!data?.subjectAnalysis) {
      return {
        totalExams: 0,
        totalSubjects: 0,
        averageScore: 0,
        improvingSubjects: 0,
        decliningSubjects: 0,
        attendanceRate: 0
      };
    }

    const subjects = data.subjectAnalysis;
    const totalExams = subjects.reduce((sum, s) => sum + s.totalExams, 0);
    const totalSubjects = subjects.length;
    const averageScore = subjects.reduce((sum, s) => sum + s.average, 0) / totalSubjects || 0;
    const improvingSubjects = subjects.filter(s => s.trend === 'improving').length;
    const decliningSubjects = subjects.filter(s => s.trend === 'declining').length;
    
    // 计算出勤率
    const totalValidScores = subjects.reduce((sum, s) => sum + s.validScores, 0);
    const totalPossibleScores = subjects.reduce((sum, s) => sum + s.totalExams, 0);
    // 四舍五入到1位小数，避免显示 93.60000000000001% 等浮点误差
    const attendanceRate = totalPossibleScores > 0 
      ? Math.round(((totalValidScores / totalPossibleScores) * 100) * 10) / 10 
      : 0;

    return {
      totalExams,
      totalSubjects,
      averageScore,
      improvingSubjects,
      decliningSubjects,
      attendanceRate
    };
  }, [data?.subjectAnalysis]);

  // 科目表格数据
  const subjectTableData = useMemo(() => {
    if (!data?.subjectAnalysis) return [];
    
    return data.subjectAnalysis.map((subject, index) => ({
      key: index,
      subject: subject.subject,
      subjectName: getSubjectLabel(subject.subject), // 中文科目名称
      totalExams: subject.totalExams,
      validScores: subject.validScores,
      absentCount: subject.absentCount,
      average: subject.average,
      highest: subject.highest,
      lowest: subject.lowest,
      trend: subject.trend,
      improvement: subject.improvement,
      participationRate: subject.totalExams > 0 ? (subject.validScores / subject.totalExams) * 100 : 0
    }));
  }, [data?.subjectAnalysis]);

  // 获取趋势显示
  const getTrendDisplay = (trend: string, improvement: number) => {
    switch (trend) {
      case 'improving':
        return {
          icon: <RiseOutlined style={{ color: 'var(--ant-color-success)' }} />,
          color: 'var(--ant-color-success)',
          text: `+${improvement.toFixed(1)}%`
        };
      case 'declining':
        return {
          icon: <FallOutlined style={{ color: 'var(--ant-color-error)' }} />,
          color: 'var(--ant-color-error)',
          text: `${improvement.toFixed(1)}%`
        };
      default:
        return {
          icon: <CheckCircleOutlined style={{ color: 'var(--ant-color-primary)' }} />,
          color: 'var(--ant-color-primary)',
          text: '稳定'
        };
    }
  };

  // 表格列定义 - 使用flex布局横向填充
  const columns = [
    {
      title: '科目',
      dataIndex: 'subjectName',
      key: 'subjectName',
      flex: 1,
      minWidth: isMobile ? 80 : 100,
      render: (subjectName: string, record: any) => (
        <Space>
          <BookOutlined style={{ color: 'var(--ant-color-primary)' }} />
          <Text 
            strong 
            style={{ 
              cursor: onSubjectClick ? 'pointer' : 'default',
              color: onSubjectClick ? 'var(--ant-color-primary)' : undefined
            }}
            onClick={() => onSubjectClick && onSubjectClick(record)}
          >
            {subjectName}
          </Text>
        </Space>
      ),
    },
    // 参与：仅显示“有效/总数”和百分比（小字，灰色），舍弃缺考计数
    {
      title: '参与',
      key: 'participationOverview',
      flex: 1.4,
      minWidth: isMobile ? 120 : 160,
      align: 'center' as const,
      render: (_: any, record: any) => {
        const rate = Number(record.participationRate) || 0;
        const rateColor = rate >= 90 ? 'var(--ant-color-success)' : rate >= 70 ? 'var(--ant-color-warning)' : 'var(--ant-color-error)';
        return (
          <Space direction="vertical" size={2} style={{ textAlign: 'center' }}>
            <Text strong style={{ fontSize: '14px', color: rateColor }}>{record.validScores}/{record.totalExams}</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>{rate.toFixed(1)}%</Text>
          </Space>
        );
      }
    },
    {
      title: '平均分',
      dataIndex: 'average',
      key: 'average',
      flex: 1,
      minWidth: isMobile ? 70 : 90,
      align: 'center' as const,
      render: (average: number) => (
        <Text strong style={{ 
          color: average >= 80 ? 'var(--ant-color-success)' : 
                 average >= 60 ? 'var(--ant-color-warning)' : 'var(--ant-color-error)',
          fontSize: '16px'
        }}>
          {average.toFixed(1)}
        </Text>
      ),
    },
    {
      title: '分数区间',
      key: 'scoreRange',
      flex: 1.2,
      minWidth: isMobile ? 90 : 110,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Space direction="vertical" size={2}>
          <Text style={{ 
            fontSize: '13px', 
            color: 'rgba(82, 196, 26, 0.9)',
            fontWeight: 500,
            letterSpacing: '0.2px'
          }}>
            最高: {record.highest}
          </Text>
          <Text style={{ 
            fontSize: '13px', 
            color: 'rgba(255, 77, 79, 0.9)',
            fontWeight: 500,
            letterSpacing: '0.2px'
          }}>
            最低: {record.lowest}
          </Text>
        </Space>
      ),
    },
    {
      title: '趋势',
      dataIndex: 'trend',
      key: 'trend',
      flex: 1,
      minWidth: isMobile ? 80 : 100,
      align: 'center' as const,
      render: (trend: string, record: any) => {
        const display = getTrendDisplay(trend, record.improvement);
        return (
          <Tooltip title={`变化幅度: ${display.text}`}>
            <Space direction="vertical" size={2} style={{ textAlign: 'center' }}>
              <div>{display.icon}</div>
              <Text style={{ 
                color: display.color, 
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.2px'
              }}>
                {trend === 'improving' ? '进步' : trend === 'declining' ? '下降' : '稳定'}
              </Text>
            </Space>
          </Tooltip>
        );
      },
    },
  ];

  if (loading) {
    return (
      <Card 
        className={className} 
        style={style}
        title="考试分析"
        loading={true}
      >
        <div style={{ height: '300px' }} />
      </Card>
    );
  }

  if (!data || !data.subjectAnalysis || data.subjectAnalysis.length === 0) {
    return (
      <Card 
        className={className} 
        style={style}
        title={
          <Space>
            <BookOutlined />
            <span>考试分析</span>
          </Space>
        }
      >
        <Empty 
          description="暂无考试数据"
          style={{ padding: '40px 0' }}
        />
      </Card>
    );
  }

  return (
    <Card 
      className={className} 
      style={style}
      title={
        <Space>
          <BookOutlined />
          <span>考试分析</span>
          {examStats.totalSubjects > 0 && (
            <Tag color="blue">{examStats.totalSubjects} 个科目</Tag>
          )}
        </Space>
      }
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 总体统计 - 桌面端 4 卡片；移动端合并为单卡片 2×2 Grid */}
        {isMobile ? (
          <Card size="small" style={{ width: '100%' }}>
            <Card.Grid hoverable={false} style={{ width: '50%', padding: 12, textAlign: 'center', border: 'none', boxShadow: 'none' }}>
              <Statistic
                title="总考试次数"
                value={examStats.totalExams}
                prefix={<TrophyOutlined style={{ color: 'var(--ant-color-primary)' }} />}
                valueStyle={{ color: 'var(--ant-color-primary)', fontSize: '20px' }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>涵盖 {examStats.totalSubjects} 个科目</Text>
            </Card.Grid>
            <Card.Grid hoverable={false} style={{ width: '50%', padding: 12, textAlign: 'center', border: 'none', boxShadow: 'none' }}>
              <Statistic
                title="整体平均分"
                value={examStats.averageScore}
                precision={1}
                suffix=" 分"
                prefix={<BarChartOutlined style={{ color: 'var(--ant-color-info)' }} />}
                valueStyle={{ 
                  color: examStats.averageScore >= 80 ? 'var(--ant-color-success)' : 
                         examStats.averageScore >= 60 ? 'var(--ant-color-warning)' : 'var(--ant-color-error)',
                  fontSize: '20px'
                }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {examStats.averageScore >= 80 ? '优秀水平' : 
                 examStats.averageScore >= 60 ? '良好水平' : '需要提升'}
              </Text>
            </Card.Grid>
            <Card.Grid hoverable={false} style={{ width: '50%', padding: 12, textAlign: 'center', border: 'none', boxShadow: 'none' }}>
              <Statistic
                title="进步科目"
                value={examStats.improvingSubjects}
                suffix={` / ${examStats.totalSubjects}`}
                valueStyle={{ color: 'var(--ant-color-success)', fontSize: '20px' }}
                prefix={<RiseOutlined style={{ color: 'var(--ant-color-success)' }} />}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                进步率: {examStats.totalSubjects > 0 ? ((examStats.improvingSubjects / examStats.totalSubjects) * 100).toFixed(1) : 0}%
              </Text>
            </Card.Grid>
            <Card.Grid hoverable={false} style={{ width: '50%', padding: 12, textAlign: 'center', border: 'none', boxShadow: 'none' }}>
              <Statistic
                title="出勤率"
                value={examStats.attendanceRate}
                precision={1}
                suffix="%"
                prefix={<UserOutlined style={{ color: 'var(--ant-color-warning)' }} />}
                valueStyle={{ 
                  color: examStats.attendanceRate >= 90 ? 'var(--ant-color-success)' : 'var(--ant-color-warning)',
                  fontSize: '20px'
                }}
              />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {examStats.attendanceRate >= 90 ? '出勤优秀' : '需要关注'}
              </Text>
            </Card.Grid>
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card size="small" style={{ textAlign: 'center', height: '100%' }}>
                <Statistic
                  title="总考试次数"
                  value={examStats.totalExams}
                  prefix={<TrophyOutlined style={{ color: 'var(--ant-color-primary)' }} />}
                  valueStyle={{ color: 'var(--ant-color-primary)', fontSize: '24px' }}
                />
                <Text type="secondary" style={{ 
                  fontSize: '13px',
                  color: 'rgba(0, 0, 0, 0.6)',
                  fontWeight: 500,
                  letterSpacing: '0.2px'
                }}>
                  涵盖 {examStats.totalSubjects} 个科目
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card size="small" style={{ textAlign: 'center', height: '100%' }}>
                <Statistic
                  title="整体平均分"
                  value={examStats.averageScore}
                  precision={1}
                  suffix=" 分"
                  prefix={<BarChartOutlined style={{ color: 'var(--ant-color-info)' }} />}
                  valueStyle={{ 
                    color: examStats.averageScore >= 80 ? 'var(--ant-color-success)' : 
                           examStats.averageScore >= 60 ? 'var(--ant-color-warning)' : 'var(--ant-color-error)',
                    fontSize: '24px'
                  }}
                />
                <Text type="secondary" style={{ 
                  fontSize: '13px',
                  color: examStats.averageScore >= 80 ? 'rgba(82, 196, 26, 0.8)' : 
                         examStats.averageScore >= 60 ? 'rgba(250, 173, 20, 0.8)' : 'rgba(255, 77, 79, 0.8)',
                  fontWeight: 500,
                  letterSpacing: '0.2px'
                }}>
                  {examStats.averageScore >= 80 ? '优秀水平' : 
                   examStats.averageScore >= 60 ? '良好水平' : '需要提升'}
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card size="small" style={{ textAlign: 'center', height: '100%' }}>
                <Statistic
                  title="进步科目"
                  value={examStats.improvingSubjects}
                  suffix={` / ${examStats.totalSubjects}`}
                  valueStyle={{ color: 'var(--ant-color-success)', fontSize: '24px' }}
                  prefix={<RiseOutlined style={{ color: 'var(--ant-color-success)' }} />}
                />
                <Text type="secondary" style={{ 
                  fontSize: '13px',
                  color: 'rgba(82, 196, 26, 0.8)',
                  fontWeight: 500,
                  letterSpacing: '0.2px'
                }}>
                  进步率: {examStats.totalSubjects > 0 ? ((examStats.improvingSubjects / examStats.totalSubjects) * 100).toFixed(1) : 0}%
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card size="small" style={{ textAlign: 'center', height: '100%' }}>
                <Statistic
                  title="出勤率"
                  value={examStats.attendanceRate}
                  precision={1}
                  suffix="%"
                  prefix={<UserOutlined style={{ color: 'var(--ant-color-warning)' }} />}
                  valueStyle={{ 
                    color: examStats.attendanceRate >= 90 ? 'var(--ant-color-success)' : 'var(--ant-color-warning)',
                    fontSize: '24px'
                  }}
                />
                <Text type="secondary" style={{ 
                  fontSize: '13px',
                  color: examStats.attendanceRate >= 90 ? 'rgba(82, 196, 26, 0.8)' : 'rgba(250, 173, 20, 0.8)',
                  fontWeight: 500,
                  letterSpacing: '0.2px'
                }}>
                  {examStats.attendanceRate >= 90 ? '出勤优秀' : '需要关注'}
                </Text>
              </Card>
            </Col>
          </Row>
        )}

        {/* 进度指标与成绩分布（移动端精简：根据反馈移除） */}

        {/* 详细科目表格 - 扩展布局 */}
        {showDetails && (
          <Card size="small" style={{ width: '100%' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={5} style={{ margin: 0 }}>
                  <BookOutlined style={{ marginRight: '8px', color: 'var(--ant-color-primary)' }} />
                  科目详细分析
                </Title>
                {subjectTableData.length > 0 && (
                  <Tag color="blue">{subjectTableData.length} 个科目</Tag>
                )}
              </div>
              <Table
                dataSource={subjectTableData}
                columns={columns}
                pagination={false}
                size={isMobile ? 'small' : 'middle'}
                scroll={{ x: true }}
                bordered
                style={{ width: '100%' }}
              />
            </Space>
          </Card>
        )}

        {/* 数据概览 */}
        <Card size="small" style={{ background: 'var(--ant-color-fill-alter)' }}>
          <Row gutter={[16, 8]}>
            <Col span={24}>
              <Text type="secondary" style={{ 
                fontSize: '13px',
                color: 'rgba(0, 0, 0, 0.65)',
                fontWeight: 500,
                letterSpacing: '0.3px',
                lineHeight: '1.6'
              }}>
                数据概览: 共 {data.totalRecords} 条考试记录，
                涵盖 {examStats.totalSubjects} 个科目，
                总计 {examStats.totalExams} 次考试
              </Text>
            </Col>
          </Row>
        </Card>
      </Space>
    </Card>
  );
};

export default ExamAnalysisPanel;