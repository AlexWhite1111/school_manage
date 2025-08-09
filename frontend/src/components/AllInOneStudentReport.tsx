import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  Space, 
  Button, 
  Typography, 
  Row, 
  Col,
  Spin,
  Alert,
  message,
  Divider,
  DatePicker,
  Tag,
  Progress,
  theme,
  ConfigProvider
} from 'antd';
import { 
  ArrowLeftOutlined,
  ReloadOutlined,
  DownloadOutlined,
  RocketOutlined,
  BookOutlined,
  CloudOutlined,
  RiseOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  BulbOutlined,
  TrophyOutlined,
  LineChartOutlined,
  PieChartOutlined,
  RadarChartOutlined,
  FireOutlined,
  StarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

// 导入设计系统
import { designTokens, semanticColors } from '@/theme/designTokens';
import { useResponsiveSize, useResponsiveColumns } from '@/hooks/useResponsiveSize';
import { useResponsive } from '@/hooks/useResponsive';

// 导入API
import { GrowthApi } from '@/api/growthApi';
import * as examApi from '@/api/examApi';
import type { GrowthSummary } from '@/api/growthApi';

// 导入已实现的组件
import StudentInfoHeader from '@/components/unified-growth-report/core/StudentInfoHeader';
import GrowthOverview from '@/components/unified-growth-report/core/GrowthOverview';
import ExamAnalysisPanel from '@/components/unified-growth-report/panels/ExamAnalysisPanel';
import GrowthPredictionPanel from '@/components/unified-growth-report/panels/GrowthPredictionPanel';
import WordCloudFeature from '@/components/unified-growth-report/features/WordCloudFeature';
import ExamScoreTrendChart from '@/features/student-log/components/ExamScoreTrendChart';
import SubjectDetailModal from '@/features/student-log/components/SubjectDetailModal';
import SubjectRadarChart from '@/components/unified-growth-report/charts/SubjectRadarChart';
import ExamWordCloud from '@/components/common/WordCloudPanel/ExamWordCloud';

import GrowthScoreDisplay from '@/components/unified-growth-report/features/GrowthScoreDisplay';
import KalmanStatePanel from './growth/KalmanStatePanel';

const { Title, Text } = Typography;

interface AllInOneStudentReportProps {
  publicId: string;
  onBack?: () => void;
}

/**
 * All-in-One 学生成长报告组件
 * 合并原来三个页面的所有功能：
 * 1. StudentGrowthReport - 考试分析、标签管理、雷达图
 * 2. StudentGrowthReportPage - 成长预测、卡尔曼滤波
 * 3. EnhancedStudentGrowthReport - 词云、配置面板
 */
const AllInOneStudentReport: React.FC<AllInOneStudentReportProps> = ({
  publicId,
  onBack
}) => {
  const navigate = useNavigate();
  const responsiveSize = useResponsiveSize();
  const { getColSpan } = useResponsiveColumns();
  const { token } = theme.useToken();
  const { isMobile } = useResponsive();
  const buttonSize: 'small' | 'middle' | 'large' = isMobile ? 'middle' : 'middle';
  const headerTitleLevel: 1 | 2 | 3 | 4 | 5 = isMobile ? 4 : 3;
  
  // 统一状态管理
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [growthData, setGrowthData] = useState<GrowthSummary | null>(null);
  const [examData, setExamData] = useState<any>(null);
  const [kalmanConfig, setKalmanConfig] = useState<any>(null);
  
  // SubjectDetailModal状态
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // 时间选择器状态
  const [globalDateRange, setGlobalDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(6, 'month'),
    dayjs()
  ]);

  // 响应式样式配置
  const responsiveStyles = useMemo(() => ({
    container: {
      padding: responsiveSize.cardPadding,
      background: token.colorBgLayout,
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100%',
      overflow: 'hidden'
    },
    card: {
      borderRadius: token.borderRadius,
      boxShadow: token.boxShadowTertiary,
      background: token.colorBgContainer
    },
    mobileOptimized: {
      fontSize: responsiveSize.fontSize.body,
      lineHeight: 1.6,
      padding: responsiveSize.cardPadding
    }
  }), [responsiveSize, token]);

  // 日期计算函数
  const calculateDateRange = React.useCallback(() => {
    return {
      startDate: globalDateRange[0].format('YYYY-MM-DD'),
      endDate: globalDateRange[1].format('YYYY-MM-DD')
    };
  }, [globalDateRange]);

  // 统一数据加载
  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { startDate, endDate } = calculateDateRange();
      
      console.log(`🚀 开始加载学生 ${publicId} 的所有数据...`, { startDate, endDate });
      
      // 并行加载学生相关数据 - 移除系统配置加载
      const [growth, exam] = await Promise.all([
        GrowthApi.getStudentGrowthSummaryByPublicId(publicId),
        examApi.getStudentExamHistoryByPublicId(publicId, {
          startDate,
          endDate
        }).catch(err => {
          console.warn('考试数据加载失败:', err);
          return null; // 考试数据可选
        })
      ]);

      console.log('✅ 成长数据加载成功:', growth);
      console.log('✅ 考试数据加载结果:', exam);
      
      // 详细检查examData结构
      if (exam) {
        console.log('📊 考试数据详细检查:');
        console.log('- examTagsWordCloud存在:', !!exam.examTagsWordCloud);
        console.log('- examTagsWordCloud长度:', exam.examTagsWordCloud?.length || 0);
        console.log('- examTagsWordCloud内容:', exam.examTagsWordCloud);
        console.log('- 考试数据完整结构:', JSON.stringify(exam, null, 2));
      } else {
        console.log('❌ 考试数据为空或null');
      }

      setGrowthData(growth);
      setExamData(exam);
      setKalmanConfig(null); // 学生页面不需要系统配置
      
    } catch (err: any) {
      console.error('❌ 数据加载失败:', err);
      setError(err.message || '数据加载失败');
      message.error('加载学生数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和时间变化监听
  useEffect(() => {
    if (publicId) {
      loadAllData();
    }
  }, [publicId, globalDateRange]); // 添加globalDateRange依赖

  // 刷新功能
  const handleRefresh = () => {
    loadAllData();
  };

  // 返回功能
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  // 处理科目点击事件
  const handleSubjectClick = (subjectData: any) => {
    setSelectedSubject({
      ...subjectData,
      studentPublicId: publicId, // 传递publicId
    });
    setModalVisible(true);
  };

  // 优化的加载状态
  if (loading) {
    return (
      <div style={{ 
        ...responsiveStyles.container,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh'
      }}>
        <Spin size="large" />
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Typography.Title level={4} style={{ color: token.colorTextSecondary }}>
            正在加载学生 {publicId} 的完整报告...
          </Typography.Title>
          <Typography.Text style={{ color: token.colorTextTertiary }}>
            <BarChartOutlined /> 正在获取成长数据和考试记录，请稍候
          </Typography.Text>
        </div>
        <div style={{ 
          marginTop: 16, 
          padding: '8px 16px', 
          background: token.colorBgContainer, 
          borderRadius: token.borderRadius,
          fontSize: '12px',
          color: token.colorTextTertiary
        }}>
          <BulbOutlined /> 首次加载可能需要几秒钟时间
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div style={{ padding: responsiveSize.cardPadding }}>
        <Alert
          message="数据加载失败"
          description={error}
          type="error"
          showIcon
          action={
            <Space>
              <Button size="small" onClick={handleRefresh}>
                重试
              </Button>
              <Button size="small" onClick={handleBack}>
                返回
              </Button>
            </Space>
          }
        />
      </div>
    );
  }

  // 没有数据
  if (!growthData) {
    return (
      <div style={{ padding: responsiveSize.cardPadding }}>
        <Alert
          message="暂无数据"
          description={`学生 ${publicId} 暂无成长数据`}
          type="info"
          showIcon
          action={
            <Space>
              <Button size="small" onClick={handleRefresh}>
                刷新
              </Button>
              <Button size="small" onClick={handleBack}>
                返回
              </Button>
            </Space>
          }
        />
      </div>
    );
  }

  return (
    <div style={responsiveStyles.container}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* 优化后的页面头部 - 合并头部信息和控制区域 */}
        <Card style={responsiveStyles.card}>
          <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
            <Col xs={24} sm={16}>
              <Space wrap>
                <Button 
                  icon={<ArrowLeftOutlined />} 
                  onClick={handleBack}
                  size={buttonSize}
                >
                  返回
                </Button>
                <Title level={headerTitleLevel} style={{ margin: 0, color: token.colorText }}>
                  学生成长报告 - {growthData.student.name}
                </Title>
              </Space>
            </Col>
            <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
              <Space wrap>
                <Button 
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={() => message.info('PDF导出功能开发中...')}
                  size={buttonSize}
                >
                  导出PDF
                </Button>
              </Space>
            </Col>
          </Row>
          
          {/* 集成的时间筛选和控制区域 */}
          <Row gutter={[16, 8]} align="middle">
            <Col xs={24} lg={14}>
              <div style={responsiveStyles.mobileOptimized}>
                <Typography.Text style={{ 
                  fontSize: '11px',
                  color: token.colorTextTertiary 
                }}>
                  <BarChartOutlined /> 个人成长与考试分析报告
                </Typography.Text>
                <br />
                <Typography.Text style={{ 
                  fontSize: '10px', 
                  color: token.colorTextTertiary,
                  lineHeight: '1.2'
                }}>
                  <ClockCircleOutlined /> 时间筛选影响: 考试数据、趋势图、科目详情 | <LineChartOutlined /> 成长数据: 显示全部历史记录
                </Typography.Text>
              </div>
            </Col>
            <Col xs={24} lg={10}>
              <Space 
                style={{ 
                  width: '100%', 
                  justifyContent: window.innerWidth < 768 ? 'flex-start' : 'flex-end'
                }}
                direction={window.innerWidth < 768 ? 'vertical' : 'horizontal'}
                size="small"
              >
                <DatePicker.RangePicker 
                  size={buttonSize}
                  style={{ width: '100%', minWidth: '280px' }}
                  value={globalDateRange}
                  onChange={(dates) => setGlobalDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
                  presets={[
                    { label: '近1月', value: [dayjs().subtract(1, 'month'), dayjs()] },
                    { label: '近3月', value: [dayjs().subtract(3, 'month'), dayjs()] },
                    { label: '近6月', value: [dayjs().subtract(6, 'month'), dayjs()] },
                    { label: '本学期', value: [dayjs().subtract(4, 'month'), dayjs()] }
                  ]}
                  placeholder={['开始时间', '结束时间']}
                />
                <Button 
                  size={buttonSize} 
                  icon={<ReloadOutlined />} 
                  onClick={handleRefresh}
                >
                  刷新
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 学生信息头部 */}
        <StudentInfoHeader
          student={growthData.student}
          loading={false}
        />

        {/* ===== 个人成长分析模块 ===== */}
        <Divider orientation="left" style={{ marginTop: 32, marginBottom: 24 }}>
          <Space>
            <div style={{
              background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorSuccess})`,
              borderRadius: '50%',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <RocketOutlined style={{ color: '#fff', fontSize: '18px' }} />
            </div>
            <Typography.Title level={3} style={{ 
              margin: 0, 
              background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorSuccess})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              个人成长分析
            </Typography.Title>
            <Tag style={{ 
              background: `linear-gradient(135deg, ${token.colorInfo}, ${token.colorInfoBg})`,
              border: 'none',
              color: token.colorInfoText
            }}>卡尔曼算法</Tag>
            <Tag style={{ 
              background: `linear-gradient(135deg, ${token.colorWarning}, ${token.colorWarningBg})`,
              border: 'none',
              color: token.colorWarningText
            }}>智能预测</Tag>
          </Space>
        </Divider>

        {/* 个人成长模块内容 - 优化布局，专注核心数据 */}
        <Row gutter={[responsiveSize.gridGutter, responsiveSize.gridGutter]} style={{ marginBottom: responsiveSize.componentSpacing }}>
          
          {/* 主要成长分析面板 - 使用科学的加权平均算法 */}
          <Col xs={24}>
            {growthData?.states && growthData.states.length > 0 ? (
              <KalmanStatePanel
                states={growthData.states}
                showDetails={true}
              />
            ) : (
              <Card
                title={
                  <Space>
                    <RiseOutlined style={{ color: token.colorSuccess }} />
                    <span>智能成长分析</span>
                    <Tag color="blue">AI算法</Tag>
                    <Tag color="green">卡尔曼滤波</Tag>
                  </Space>
                }
                style={{ height: '100%' }}
              >
                <div style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
                  <RocketOutlined style={{ fontSize: '48px', color: token.colorTextTertiary, marginBottom: '16px' }} />
                  <div style={{ fontSize: '16px', marginBottom: '8px' }}>暂无成长数据</div>
                  <div style={{ fontSize: '14px', color: token.colorTextSecondary }}>
                    请先进行学习活动，系统将自动记录您的成长轨迹
                  </div>
                </div>
              </Card>
            )}
          </Col>

          {/* 成长趋势洞察 - 新增趋势分析卡片 */}
          {growthData?.states && growthData.states.length > 0 && (
            <Col xs={24} lg={12}>
              <Card 
                style={responsiveStyles.card}
                title={
                   <Space>
                     <RiseOutlined style={{ color: token.colorSuccess }} />
                     <span>成长趋势洞察</span>
                     <Tag color="processing">趋势分析</Tag>
                   </Space>
                 }
              >
                {(() => {
                  const upwardTrends = growthData.states.filter(s => s.trendDirection === 'UP');
                  const downwardTrends = growthData.states.filter(s => s.trendDirection === 'DOWN');
                  const stableTrends = growthData.states.filter(s => s.trendDirection === 'STABLE');
                  const recentlyActive = growthData.states.filter(s => {
                    const daysSinceUpdate = dayjs().diff(dayjs(s.lastUpdatedAt), 'day');
                    return daysSinceUpdate <= 7;
                  });

                  return (
                    <div>
                      {/* 趋势统计 */}
                      <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
                        <Col span={6}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ 
                              fontSize: responsiveSize.fontSize.title, 
                              fontWeight: 'bold', 
                              color: token.colorSuccess,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}>
                              <ArrowUpOutlined />
                              {upwardTrends.length}
                            </div>
                            <div style={{ fontSize: responsiveSize.fontSize.caption, color: token.colorTextSecondary }}>
                              上升趋势
                            </div>
                          </div>
                        </Col>
                        <Col span={6}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ 
                              fontSize: responsiveSize.fontSize.title, 
                              fontWeight: 'bold', 
                              color: token.colorWarning,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}>
                              <MinusOutlined />
                              {stableTrends.length}
                            </div>
                            <div style={{ fontSize: responsiveSize.fontSize.caption, color: token.colorTextSecondary }}>
                              稳定表现
                            </div>
                          </div>
                        </Col>
                        <Col span={6}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ 
                              fontSize: responsiveSize.fontSize.title, 
                              fontWeight: 'bold', 
                              color: token.colorError,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}>
                              <ArrowDownOutlined />
                              {downwardTrends.length}
                            </div>
                            <div style={{ fontSize: responsiveSize.fontSize.caption, color: token.colorTextSecondary }}>
                              需要关注
                            </div>
                          </div>
                        </Col>
                        <Col span={6}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ 
                              fontSize: responsiveSize.fontSize.title, 
                              fontWeight: 'bold', 
                              color: token.colorPrimary,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}>
                              <FireOutlined />
                              {recentlyActive.length}
                            </div>
                            <div style={{ fontSize: responsiveSize.fontSize.caption, color: token.colorTextSecondary }}>
                              近期活跃
                            </div>
                          </div>
                        </Col>
                      </Row>

                      {/* 重点关注区域 */}
                      {(upwardTrends.length > 0 || downwardTrends.length > 0) && (
                        <div>
                          {upwardTrends.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ 
                                fontSize: '14px', 
                                fontWeight: 'bold', 
                                color: token.colorSuccess, 
                                marginBottom: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <TrophyOutlined /> 优势领域 (持续上升)
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {upwardTrends.slice(0, 4).map(state => (
                                  <Tag 
                                    key={state.tagId} 
                                    color="success" 
                                    style={{ margin: 0 }}
                                  >
                                    {state.tagName}
                                  </Tag>
                                ))}
                              </div>
                            </div>
                          )}

                          {downwardTrends.length > 0 && (
                            <div>
                              <div style={{ 
                                fontSize: '14px', 
                                fontWeight: 'bold', 
                                color: token.colorError, 
                                marginBottom: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <ExclamationCircleOutlined /> 改进机会 (需要关注)
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {downwardTrends.slice(0, 4).map(state => (
                                  <Tag 
                                    key={state.tagId} 
                                    color="error" 
                                    style={{ margin: 0 }}
                                  >
                                    {state.tagName}
                                  </Tag>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </Card>
            </Col>
          )}

          {/* 成长活跃度分析 */}
          {growthData?.states && growthData.states.length > 0 && (
            <Col xs={24} lg={12}>
              <Card 
                style={responsiveStyles.card}
                title={
                  <Space>
                    <BarChartOutlined style={{ color: token.colorPrimary }} />
                    <span>成长活跃度</span>
                    <Tag color="cyan">数据洞察</Tag>
                  </Space>
                }
              >
                {(() => {
                  const totalObservations = growthData.states.reduce((sum, s) => sum + s.totalObservations, 0);
                  const avgConfidence = growthData.states.reduce((sum, s) => sum + s.confidence, 0) / growthData.states.length;
                  const positiveStates = growthData.states.filter(s => s.sentiment === 'POSITIVE');
                  const negativeStates = growthData.states.filter(s => s.sentiment === 'NEGATIVE');
                  const mostActiveTag = growthData.states.reduce((prev, current) => 
                    prev.totalObservations > current.totalObservations ? prev : current
                  );

                  return (
                    <div>
                      <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
                        <Col span={12}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: responsiveSize.fontSize.title, fontWeight: 'bold', color: token.colorPrimary }}>
                              {totalObservations}
                            </div>
                            <div style={{ fontSize: responsiveSize.fontSize.caption, color: token.colorTextSecondary }}>
                              总观测次数
                            </div>
                          </div>
                        </Col>
                        <Col span={12}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: responsiveSize.fontSize.title, fontWeight: 'bold', color: token.colorSuccess }}>
                              {Math.round(avgConfidence * 100)}%
                            </div>
                            <div style={{ fontSize: responsiveSize.fontSize.caption, color: token.colorTextSecondary }}>
                              平均置信度
                            </div>
                          </div>
                        </Col>
                      </Row>

                      <div style={{ 
                        background: `linear-gradient(135deg, ${token.colorBgLayout}, ${token.colorBgContainer})`,
                        borderRadius: token.borderRadius,
                        padding: '16px',
                        marginBottom: '16px'
                      }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                          🏆 最活跃标签
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Tag color={mostActiveTag.sentiment === 'POSITIVE' ? 'green' : 'red'} style={{ fontSize: '13px' }}>
                            {mostActiveTag.tagName}
                          </Tag>
                          <div style={{ fontSize: '12px', color: token.colorTextSecondary }}>
                            {mostActiveTag.totalObservations} 次观测
                          </div>
                        </div>
                      </div>

                      <Row gutter={[8, 8]}>
                        <Col span={12}>
                          <div style={{ textAlign: 'center', padding: '12px', background: token.colorSuccessBg, borderRadius: token.borderRadius }}>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: token.colorSuccess }}>
                              {positiveStates.length}
                            </div>
                            <div style={{ fontSize: '12px', color: token.colorSuccess }}>正面标签</div>
                          </div>
                        </Col>
                        <Col span={12}>
                          <div style={{ textAlign: 'center', padding: '12px', background: token.colorErrorBg, borderRadius: token.borderRadius }}>
                            <div style={{ fontSize: '16px', fontWeight: 'bold', color: token.colorError }}>
                              {negativeStates.length}
                            </div>
                            <div style={{ fontSize: '12px', color: token.colorError }}>关注标签</div>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  );
                })()}
              </Card>
            </Col>
          )}

          {/* 成长标签词云 - 保留但优化 */}
          {growthData?.states && growthData.states.length > 0 && (
            <Col xs={24}>
              <Card 
                style={responsiveStyles.card}
                title={
                  <Space>
                    <CloudOutlined style={{ color: token.colorSuccess }} />
                    <span>成长标签词云</span>
                    <Tag color="success" icon={<RocketOutlined />}>
                      成长轨迹
                    </Tag>
                  </Space>
                }
              >
                <WordCloudFeature
                  data={growthData}
                  viewMode="detailed"
                  loading={false}
                />
              </Card>
            </Col>
          )}

        </Row>

        {/* ===== 考试分析模块 ===== */}
        <Divider orientation="left" style={{ 
          marginTop: 32, 
          marginBottom: 24,
          borderColor: token.colorBorder
        }}>
          <Space>
            <Typography.Title level={3} style={{ margin: 0 }}>
              考试分析报告
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
              数据源: 考试系统 · 时间范围: 可筛选
            </Typography.Text>
          </Space>
        </Divider>

        {/* 考试分析模块内容 - 重新布局：左侧考试分析，右侧雷达图 */}
        <Row gutter={[responsiveSize.gridGutter, responsiveSize.gridGutter]}>
          
          {/* 考试统计表格 - 增强富文本和可视化 */}
          {examData && (
            <Col xs={24} lg={14}>
              <Card 
                style={responsiveStyles.card}
                title={
                  <Space>
                    <BarChartOutlined style={{ color: token.colorPrimary }} />
                    <span>考试统计分析</span>
                    <Tag color="processing" icon={<FireOutlined />}>
                      智能分析
                    </Tag>
                  </Space>
                }
                extra={
                  <Space>
                    <Tag color="success" icon={<StarOutlined />}>
                      {examData.subjects?.length || 0} 个科目
                    </Tag>
                  </Space>
                }
              >
                <ExamAnalysisPanel
                  data={examData}
                  showDetails={true}
                  loading={false}
                  onSubjectClick={handleSubjectClick}
                />
                
                {/* 增加考试分析的可视化元素 */}
                {examData.subjects && examData.subjects.length > 0 && (
                  <div style={{ 
                    marginTop: 16, 
                    padding: 16, 
                    background: `linear-gradient(135deg, ${token.colorBgLayout}, ${token.colorBgContainer})`,
                    borderRadius: token.borderRadius,
                    border: `1px solid ${token.colorBorder}`
                  }}>
                    <Typography.Text strong style={{ color: token.colorText }}>
                      📊 快速洞察
                    </Typography.Text>
                    <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
                      <Col span={8}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: responsiveSize.fontSize.body, fontWeight: 'bold', color: token.colorSuccess }}>
                            {examData.subjects.filter((s: any) => s.trend === '进步').length}
                          </div>
                          <div style={{ fontSize: responsiveSize.fontSize.caption, color: token.colorTextSecondary }}>
                            进步科目
                          </div>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: responsiveSize.fontSize.body, fontWeight: 'bold', color: token.colorWarning }}>
                            {examData.subjects.filter((s: any) => s.trend === '稳定').length}
                          </div>
                          <div style={{ fontSize: responsiveSize.fontSize.caption, color: token.colorTextSecondary }}>
                            稳定科目
                          </div>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: responsiveSize.fontSize.body, fontWeight: 'bold', color: token.colorError }}>
                            {examData.subjects.filter((s: any) => s.trend === '下降').length}
                          </div>
                          <div style={{ fontSize: responsiveSize.fontSize.caption, color: token.colorTextSecondary }}>
                            关注科目
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </div>
                )}
              </Card>
            </Col>
          )}

          {/* 雷达图分析 - 移到右侧 */}
          <Col xs={24} lg={10}>
            <Card 
              style={responsiveStyles.card}
              title={
                <Space>
                  <RadarChartOutlined style={{ color: token.colorInfo }} />
                  <span>科目雷达分析</span>
                  <Tag color="cyan" icon={<PieChartOutlined />}>
                    多维对比
                  </Tag>
                </Space>
              }
            >
              <SubjectRadarChart examData={examData} />
            </Card>
          </Col>

          {/* 考试成绩趋势图 - 全宽满高度 */}
          {growthData?.student && (
            <Col xs={24}>
              <div style={{ height: '100%', minHeight: '500px' }}>
                <ExamScoreTrendChart
                  publicId={publicId}
                  dateRange={{
                    startDate: globalDateRange[0].format('YYYY-MM-DD'),
                    endDate: globalDateRange[1].format('YYYY-MM-DD')
                  }}
                />
              </div>
            </Col>
          )}

          {/* 考试表现词云 - 在考试分析模块中 */}
          <Col xs={24}>
            <Card 
              style={responsiveStyles.card}
              title={
                <Space>
                  <CloudOutlined style={{ color: token.colorPrimary }} />
                  <span>考试表现词云</span>
                  <Tag color="processing" icon={<FireOutlined />}>
                    情感分析
                  </Tag>
                </Space>
              }
            >
              {examData?.examTagsWordCloud && examData.examTagsWordCloud.length > 0 ? (
                <ExamWordCloud
                  data={examData.examTagsWordCloud.map((item: any) => ({
                    text: item.text,
                    value: item.value,
                    type: item.type === 'EXAM_POSITIVE' ? 'positive' : 'negative'
                  }))}
                />
              ) : (
                <div style={{ color: token.colorTextTertiary }}>暂无考试词云数据</div>
              )}
            </Card>
          </Col>

        </Row>

        {/* 页面底部信息和快捷操作 - 纯色背景 */}
        <Card 
          size="small" 
          style={{ 
            background: token.colorBgContainer,
            borderTop: `1px solid ${token.colorBorder}`,
            borderRadius: 0,
            marginTop: 32
          }}
        >
          <Row gutter={[16, 8]} align="middle">
            <Col flex="auto">
              <Text style={{ 
                fontSize: responsiveSize.fontSize.caption, 
                color: token.colorTextSecondary 
              }}>
                <TrophyOutlined /> All-in-One 学生成长报告 | 
                合并了考试分析、成长预测、词云展示等所有功能 | 
                数据来源: 成长系统 + 考试系统
              </Text>
            </Col>
            <Col>
              <Space>
                <Button 
                  size="small" 
                  type="text" 
                  onClick={() => message.info('标签管理功能已移至班级管理页面')}
                  style={{ fontSize: responsiveSize.fontSize.caption, padding: '2px 8px' }}
                >
                  🏷️ 标签管理
                </Button>
                <Text style={{ 
                  fontSize: responsiveSize.fontSize.caption, 
                  color: token.colorTextSecondary 
                }}>
                  最后更新: {new Date().toLocaleString()}
                </Text>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* SubjectDetailModal - 恢复的科目详情功能! */}
        {selectedSubject && (
          <SubjectDetailModal
            visible={modalVisible}
            onClose={() => {
              setModalVisible(false);
              setSelectedSubject(null);
            }}
            subjectData={selectedSubject}
            dateRange={{
              startDate: globalDateRange[0].format('YYYY-MM-DD'),
              endDate: globalDateRange[1].format('YYYY-MM-DD')
            }}
          />
        )}

      </Space>
    </div>
  );
};

export default AllInOneStudentReport;