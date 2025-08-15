import AppButton from '@/components/AppButton';
import React, { useState, useEffect, useMemo } from 'react';
import { Space, Typography, Row, Col, Spin, Alert, message, Divider, Tag, Progress, theme, ConfigProvider, Card, Segmented } from 'antd';
import UnifiedRangePicker from '@/components/common/UnifiedRangePicker';
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
// Removed legacy designTokens import; rely on theme.useToken and CSS vars
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
  // 移动端切换：成长 / 考试
  const [activeMobileSection, setActiveMobileSection] = useState<'growth' | 'exam'>('growth');
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

  // 统一题头渲染（图标 + 主标题 + 副标题），样式与主题一致
  const renderSectionHeader = (options: { icon: React.ReactElement; title: string; subtitle?: React.ReactNode }) => {
    const { icon, title, subtitle } = options;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryHover})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {React.cloneElement(icon, { style: { color: token.colorBgContainer, fontSize: 18 } })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography.Title level={headerTitleLevel} style={{ margin: 0, color: token.colorText }}>
            {title}
          </Typography.Title>
          {subtitle && (
            <Typography.Text type="secondary" style={{ margin: 0 }}>
              {subtitle}
            </Typography.Text>
          )}
        </div>
      </div>
    );
  };

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
              <AppButton size="sm" onClick={handleRefresh}>
                重试
              </AppButton>
              <AppButton size="sm" onClick={handleBack}>
                返回
              </AppButton>
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
              <AppButton size="sm" onClick={handleRefresh}>
                刷新
              </AppButton>
              <AppButton size="sm" onClick={handleBack}>
                返回
              </AppButton>
            </Space>
          }
        />
      </div>
    );
  }

  return (
    <div style={responsiveStyles.container}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* 移动端精简头部：仅保留学生卡片，下方放弱化的导出/刷新与自适应时间选择器 */}
        <StudentInfoHeader 
          student={growthData.student} 
          loading={false}
          dateSelectorBottom={
            <div>
            <UnifiedRangePicker
              size={buttonSize}
                className="w-full"
              value={globalDateRange}
              onChange={(dates) => setGlobalDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
              placeholder={['开始时间', '结束时间']}
            />
              {isMobile && (
                <div style={{ marginTop: 8 }}>
                  <Segmented
                    size="small"
                    value={activeMobileSection}
                    onChange={(val) => setActiveMobileSection(val as 'growth' | 'exam')}
                    options={[
                      {
                        label: (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <LineChartOutlined /> 成长
                          </span>
                        ),
                        value: 'growth',
                      },
                      {
                        label: (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <BookOutlined /> 考试
                          </span>
                        ),
                        value: 'exam',
                      },
                    ]}
                  />
                </div>
              )}
            </div>
          }
          onRefresh={handleRefresh}
          onExport={() => message.info('PDF导出功能开发中...')}
        />

        {/* 学生信息头部上移呈现，避免重复 */}

        {/* ===== 个人成长分析模块 ===== */}
        {(!isMobile || activeMobileSection === 'growth') && (
          <>
        <Divider orientation="left" style={{ marginTop: 32, marginBottom: 24 }}>
              {renderSectionHeader({
                icon: <RocketOutlined />,
                title: '个人成长分析',
                subtitle: <span>卡尔曼算法 · 智能预测</span>,
              })}
        </Divider>

        {/* 个人成长模块内容 - 优化布局，专注核心数据 */}
        <Row gutter={[responsiveSize.gridGutter, responsiveSize.gridGutter]} style={{ marginBottom: responsiveSize.componentSpacing }}>

          {/* 成长洞察 - 合并趋势与活跃度为一个卡片（移动至题头下方优先展示） */}
          {growthData?.states && growthData.states.length > 0 && (
            <Col xs={24}>
              <Card
                style={responsiveStyles.card}
                title={
                  <Space>
                    <BarChartOutlined style={{ color: token.colorPrimary }} />
                    <span>成长洞察</span>
                    <Tag color="processing">关键指标</Tag>
                  </Space>
                }
              >
                {(() => {
                  const states = growthData.states;
                  const upwardTrends = states.filter(s => s.trendDirection === 'UP');
                  const downwardTrends = states.filter(s => s.trendDirection === 'DOWN');
                  const stableTrends = states.filter(s => s.trendDirection === 'STABLE');
                  const recentlyActive = states.filter(s => dayjs().diff(dayjs(s.lastUpdatedAt), 'day') <= 7);
                  const totalObservations = states.reduce((sum, s) => sum + s.totalObservations, 0);
                  const avgConfidence = states.reduce((sum, s) => sum + s.confidence, 0) / states.length;
                  const mostActiveTag = states.reduce((prev, current) => prev.totalObservations > current.totalObservations ? prev : current);
                  const topUp = upwardTrends.slice().sort((a,b)=> Math.abs(b.trend) - Math.abs(a.trend)).slice(0,2);
                  const topDown = downwardTrends.slice().sort((a,b)=> Math.abs(b.trend) - Math.abs(a.trend)).slice(0,2);

                  return (
                    <div>
                      <Row gutter={[16, 16]} style={{ marginBottom: 12 }}>
                        <Col xs={6} sm={6} md={6}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: responsiveSize.fontSize.title, fontWeight: 'bold', color: token.colorSuccess, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              <ArrowUpOutlined />{upwardTrends.length}
                            </div>
                            <div style={{ fontSize: responsiveSize.fontSize.caption, color: token.colorTextSecondary }}>上升趋势</div>
                          </div>
                        </Col>
                        <Col xs={6} sm={6} md={6}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: responsiveSize.fontSize.title, fontWeight: 'bold', color: token.colorError, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              <ArrowDownOutlined />{downwardTrends.length}
                            </div>
                            <div style={{ fontSize: responsiveSize.fontSize.caption, color: token.colorTextSecondary }}>下降趋势</div>
                          </div>
                        </Col>
                        <Col xs={6} sm={6} md={6}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: responsiveSize.fontSize.title, fontWeight: 'bold', color: token.colorWarning }}>{stableTrends.length}</div>
                            <div style={{ fontSize: responsiveSize.fontSize.caption, color: token.colorTextSecondary }}>稳定表现</div>
                          </div>
                        </Col>
                        <Col xs={6} sm={6} md={6}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: responsiveSize.fontSize.title, fontWeight: 'bold', color: token.colorPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              <FireOutlined />{recentlyActive.length}
                            </div>
                            <div style={{ fontSize: responsiveSize.fontSize.caption, color: token.colorTextSecondary }}>近期活跃</div>
                          </div>
                        </Col>
                      </Row>

                      <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                          <div style={{ padding: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
                              <TrophyOutlined style={{ color: token.colorWarning }} />
                              <span>最活跃标签</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Tag color={mostActiveTag.sentiment === 'POSITIVE' ? 'green' : 'red'} style={{ margin: 0 }}>{mostActiveTag.tagName}</Tag>
                              <div style={{ fontSize: 12, color: token.colorTextSecondary }}>{mostActiveTag.totalObservations} 次观测</div>
                            </div>
                          </div>
                        </Col>
                        <Col xs={24} md={12}>
                          <div style={{ padding: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>
                              <LineChartOutlined style={{ color: token.colorPrimary }} />
                              <span>关键趋势</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {topUp.map(s => (
                                <Tag key={`up-${s.tagId}`} color="success" style={{ margin: 0 }}>{s.tagName}</Tag>
                              ))}
                              {topDown.map(s => (
                                <Tag key={`down-${s.tagId}`} color="error" style={{ margin: 0 }}>{s.tagName}</Tag>
                              ))}
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  );
                })()}
              </Card>
            </Col>
          )}
          
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
                <div style={{ textAlign: 'center', color: 'var(--ant-color-text-tertiary)', padding: '40px' }}>
                  <RocketOutlined style={{ fontSize: '48px', color: token.colorTextTertiary, marginBottom: '16px' }} />
                  <div style={{ fontSize: '16px', marginBottom: '8px' }}>暂无成长数据</div>
                  <div style={{ fontSize: '14px', color: token.colorTextSecondary }}>
                    请先进行学习活动，系统将自动记录您的成长轨迹
                  </div>
                </div>
              </Card>
            )}
          </Col>

          {/* 成长标签词云 - 直接使用内部卡片，移除外层多余卡片 */}
          {growthData?.states && growthData.states.length > 0 && (
            <Col xs={24}>
                <WordCloudFeature
                  data={growthData}
                  viewMode="detailed"
                  loading={false}
                />
            </Col>
          )}

        </Row>
          </>
        )}

        {/* ===== 考试分析模块 ===== */}
        {(!isMobile || activeMobileSection === 'exam') && (
          <>
        <Divider orientation="left" style={{ 
          marginTop: 32, 
          marginBottom: 24,
          borderColor: token.colorBorder
        }}>
              {renderSectionHeader({
                icon: <BookOutlined />,
                title: '考试分析报告',
                subtitle: <span>数据源：考试系统 · 时间范围：可筛选</span>,
              })}
        </Divider>

        {/* 考试分析模块内容 - 重新布局：左侧考试分析，右侧雷达图 */}
        <Row gutter={[responsiveSize.gridGutter, responsiveSize.gridGutter]}>
          
          {/* 考试统计表格 - 增强富文本和可视化 */}
          {examData && (
            <Col xs={24} lg={14}>
              <Card 
                style={{ ...responsiveStyles.card, border: 'none', boxShadow: 'none', background: 'transparent', padding: 0 }}
                title={null}
                extra={null}
                bordered={false}
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

          {/* 雷达图分析 - 仅保留核心内容，去除外框 */}
          <Col xs={24} lg={10}>
              <SubjectRadarChart examData={examData} />
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
          </>
        )}

        {/* 页面底部信息和快捷操作 - 已按需求移除 */}

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