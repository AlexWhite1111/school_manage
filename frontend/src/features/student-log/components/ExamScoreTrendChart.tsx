
import AppButton from '@/components/AppButton';
import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Select, Radio, Space, Typography, Spin, Empty, Tooltip, Tag, Card } from 'antd';
import {
  LineChartOutlined,
  InfoCircleOutlined,
  TrophyOutlined,
  BookOutlined
} from '@ant-design/icons';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useThemeStore } from '@/stores/themeStore';
import { theme as antdTheme } from 'antd';
import { getAppTokens } from '@/theme/tokens';
import { useResponsive } from '@/hooks/useResponsive';
import * as examApi from '@/api/examApi';
import dayjs from 'dayjs';

const { Text } = Typography;
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

// 颜色配置由 tokens 统一提供（避免分散）
const getSubjectColors = (mode: 'light' | 'dark') => getAppTokens(mode).colors.subjectPalette;

interface ExamScoreTrendChartProps {
  studentId?: number;  // 保持向后兼容
  publicId?: string;   // 新增publicId支持
  dateRange: {
    startDate: string;
    endDate: string;
  };
}



const ExamScoreTrendChart: React.FC<ExamScoreTrendChartProps> = ({
  studentId,
  publicId,
  dateRange
}) => {
  const { theme } = useThemeStore();
  const { token } = antdTheme.useToken();
  const appTokens = getAppTokens(theme);
  const { isMobile } = useResponsive();

  // 状态管理
  const [loading, setLoading] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['MATH', 'CHINESE']); // 默认选择数学和语文
  const [scoreMode, setScoreMode] = useState<'normalized' | 'original'>('normalized');
  const [examHistory, setExamHistory] = useState<any>(null);
  const [examStatistics, setExamStatistics] = useState<Map<number, any>>(new Map()); // 存储每个考试的班级统计数据
  const [selectedReferenceSubject, setSelectedReferenceSubject] = useState<string>('MATH'); // 参考线科目

  // 主题样式
  const themeStyles = {
    cardBackground: token.colorBgContainer,
    textPrimary: token.colorText,
    textSecondary: token.colorTextSecondary,
    successColor: token.colorSuccess,
    warningColor: token.colorWarning,
    errorColor: token.colorError,
    primaryColor: token.colorPrimary,
    borderColor: token.colorBorder,
  } as const;

  // 加载考试数据和班级统计数据
  const loadExamData = async () => {
    setLoading(true);
    try {
      // 1. 获取学生考试历史 - 统一使用publicId
      if (!publicId) {
        throw new Error('缺少学生publicId');
      }
      
      const result = await examApi.getStudentExamHistoryByPublicId(publicId, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      
      setExamHistory(result);
      
      // 2. 提取所有考试ID
      const examIds = new Set<number>();
      result.subjectAnalysis?.forEach((subject: any) => {
        subject.scores?.forEach((score: any) => {
          if (score.examId) {
            examIds.add(score.examId);
          }
        });
      });
      
      // 3. 获取每个考试的班级统计数据
      const statisticsMap = new Map<number, any>();
      await Promise.all(
        Array.from(examIds).map(async (examId) => {
          try {
            const stats = await examApi.getExamStatistics(examId);
            statisticsMap.set(examId, stats);
            console.log(`✅ 考试 ${examId} 班级统计数据加载成功:`, stats);
          } catch (error) {
            console.error(`❌ 考试 ${examId} 班级统计数据加载失败:`, error);
          }
        })
      );
      
      setExamStatistics(statisticsMap);
      console.log('📊 所有班级统计数据加载完成:', statisticsMap);
      
    } catch (error) {
      console.error('加载考试数据失败:', error);
      setExamHistory(null);
      setExamStatistics(new Map());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (publicId) {
      loadExamData();
    }
  }, [publicId, dateRange]);

  // =============================
  // 构建图表数据（高效 O(N)）
  // =============================
  interface ChartItem {
    date: string;
    examName: string;
    examId: string;
    displayDate: string;
    totalScore: number;
    passLine: number;
    classAverage: number | null;
    excellentLine: number | null;
    [subjectLabel: string]: any; // 动态科目分数
  }

  const buildChartData = (): ChartItem[] => {
    if (!examHistory) return [];

    // Map<examKey, ChartItem & { examId: number }>
    const examMap = new Map<string, any>();

    selectedSubjects.forEach(subject => {
      const subjData = examHistory.subjectAnalysis.find((s: any) => s.subject === subject);
      if (!subjData) return;

      subjData.scores.forEach((score: any) => {
        const examKey = `${score.examDate}-${score.examId}`;
        if (!examMap.has(examKey)) {
          // 初始化考试基本信息
          examMap.set(examKey, {
            date: score.examDate,
            examName: score.examName,
            examId: score.examId,
            displayDate: dayjs(score.examDate).format('MM/DD'),
            totalScore: score.totalScore,
            passLine: scoreMode === 'normalized' ? 60 : (60 / 100) * score.totalScore,
            classAverage: null,
            excellentLine: null
          });
        }

        const examData = examMap.get(examKey);

        // 计算学生分数显示值
        const normalizedScore = score.normalizedScore ?? ((score.score / score.totalScore) * 100);
        const displayScore = scoreMode === 'normalized'
          ? (score.isAbsent ? null : normalizedScore)
          : (score.isAbsent ? null : score.score);

        examData[subjectLabels[subject]] = displayScore;
      });
    });

    // 计算平均线和优秀线（使用真实班级数据）
    const result: ChartItem[] = [];

    examMap.forEach((examData: any) => {
      const examId = examData.examId;
      const examStats = examStatistics.get(examId);
      
      if (examStats && selectedReferenceSubject) {
        console.log(`🔍 处理考试 ${examId} (${examData.examName}) 的班级统计数据:`, examStats);
        
        // 查找参考科目的班级统计数据
        const subjectStats = examStats.subjectAnalysis?.find(
          (subj: any) => subj.subject === selectedReferenceSubject
        );
        
        if (subjectStats) {
          console.log(`📈 找到 ${selectedReferenceSubject} 科目的班级统计:`, subjectStats);
          
          // 🎯 使用真实的班级统计数据 - 关键：后端返回原始分数，需转换为归一化
          const totalScore = examData.totalScore; // 该考试的总分(如150分)
          
          // 后端返回的是原始分数，需要归一化为0-100
          const classAvgRaw = subjectStats.average; // 原始平均分 (如120/150)
          const highestRaw = subjectStats.highest; // 原始最高分 (如145/150)
          const lowestRaw = subjectStats.lowest; // 原始最低分 (如80/150)
          const excellentRate = subjectStats.excellentRate; // 优秀率 (0-100)
          
          // 归一化到0-100
          const classAvgNorm = (classAvgRaw / totalScore) * 100;
          const highestNorm = (highestRaw / totalScore) * 100;
          const lowestNorm = (lowestRaw / totalScore) * 100;
          
          console.log(`🔍 ${selectedReferenceSubject} 数据转换:`, {
            totalScore,
            raw: { avg: classAvgRaw, high: highestRaw, low: lowestRaw },
            normalized: { avg: classAvgNorm, high: highestNorm, low: lowestNorm },
            excellentRate
          });
          
          // 计算优秀线：基于真实班级数据的自适应标准
          let excellentLineNorm;
          
          // 🎯 关键修复：使用该科目独立的分位数，而不是全局混合分位数
          if (subjectStats.percentiles?.p85) {
            // 使用该科目的p85分位数作为优秀线参考
            const p85Raw = subjectStats.percentiles.p85;
            excellentLineNorm = (p85Raw / totalScore) * 100;
            console.log(`📊 使用${selectedReferenceSubject}科目p85作为优秀线: ${p85Raw}/${totalScore} = ${excellentLineNorm.toFixed(1)}%`);
          } else if (subjectStats.percentiles?.p90) {
                          // 使用该科目的p90稍微调低一点
            const p90Raw = subjectStats.percentiles.p90;
            const p90Norm = (p90Raw / totalScore) * 100;
                          // p90需要稍微降低以适应新的优秀线标准
            excellentLineNorm = Math.max(classAvgNorm, p90Norm - (p90Norm - classAvgNorm) * 0.2);
                          console.log(`📊 基于${selectedReferenceSubject}科目p90估算优秀线: p90=${p90Norm.toFixed(1)}% → 优秀线=${excellentLineNorm.toFixed(1)}%`);
          } else {
                          // 备用计算：基于该科目的优秀率和分数分布估算优秀线
            if (excellentRate > 0 && excellentRate < 100) {
                              // 如果优秀率已知，基于正态分布估算优秀线
              const range = highestNorm - classAvgNorm;
                              // 基于正态分布的经验公式计算
              const adjustmentFactor = Math.min(0.7, Math.max(0.3, 1.04 - excellentRate / 100 * 0.5));
              excellentLineNorm = Math.min(100, classAvgNorm + range * adjustmentFactor);
                              console.log(`📈 基于${selectedReferenceSubject}科目优秀率估算优秀线: 优秀率=${excellentRate}% → 优秀线=${excellentLineNorm.toFixed(1)}%`);
            } else if (excellentRate >= 100) {
                              // 全员优秀，优秀线设为平均分稍上
              excellentLineNorm = Math.min(100, classAvgNorm + (highestNorm - classAvgNorm) * 0.3);
                              console.log(`🏆 ${selectedReferenceSubject}科目全员优秀，优秀线设为平均分上30%: ${excellentLineNorm.toFixed(1)}%`);
            } else {
                              // 无人优秀，优秀线设为平均分上50%
              excellentLineNorm = Math.min(100, classAvgNorm + (100 - classAvgNorm) * 0.5);
                              console.log(`⚠️ ${selectedReferenceSubject}科目无人优秀，估算优秀线: ${excellentLineNorm.toFixed(1)}%`);
            }
          }
          
          if (scoreMode === 'normalized') {
            examData.classAverage = classAvgNorm;
            examData.excellentLine = excellentLineNorm;
          } else {
            // 转换为原始分数
            examData.classAverage = (classAvgNorm / 100) * examData.totalScore;
            examData.excellentLine = (excellentLineNorm / 100) * examData.totalScore;
          }
          
          console.log(`✅ ${selectedReferenceSubject} 参考线计算完成:`, {
            classAverage: examData.classAverage,
            excellentLine: examData.excellentLine,
            mode: scoreMode
          });
        } else {
          console.log(`⚠️ 未找到 ${selectedReferenceSubject} 科目的班级统计数据`);
        }
      }

      result.push(examData as ChartItem);
    });

    // 按日期排序
    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Memo 包装
  const chartData = useMemo(() => buildChartData(), [examHistory, selectedSubjects, scoreMode, selectedReferenceSubject, examStatistics]);


  // 处理科目选择
  const handleSubjectChange = (values: string[]) => {
    setSelectedSubjects(values);
    
    // 智能更新参考科目逻辑
    if (values.length === 0) {
      // 如果没有选择任何科目，清空参考科目
      setSelectedReferenceSubject('');
    } else if (!values.includes(selectedReferenceSubject)) {
      // 如果当前参考科目不在新的选择列表中，自动选择第一个科目作为参考
      setSelectedReferenceSubject(values[0]);
    }
    // 如果当前参考科目仍在选择列表中，保持不变
  };

  // 全选/取消全选功能
  const allSubjects = Object.keys(subjectLabels);
  const isAllSelected = selectedSubjects.length === allSubjects.length;
  
  const handleSelectAll = () => {
    if (isAllSelected) {
      // 取消全选，保留数学作为默认科目
      setSelectedSubjects(['MATH']);
      setSelectedReferenceSubject('MATH');
    } else {
      // 全选，保持当前参考科目（如果有效）或选择数学作为参考
      setSelectedSubjects(allSubjects);
      if (!allSubjects.includes(selectedReferenceSubject)) {
        setSelectedReferenceSubject('MATH');
      }
    }
  };

  // 渲染动态参考线
  const renderDynamicReferenceLines = () => {
    // 只有在有选择科目且有参考科目时才显示参考线
    if (selectedSubjects.length === 0 || !selectedReferenceSubject) {
      return null;
    }

    return (
      <>
        {/* 及格线 - 始终显示 */}
        <Line
          type="monotone"
          dataKey="passLine"
          stroke={themeStyles.errorColor}
          strokeDasharray="5 5"
          strokeWidth={1}
          dot={false}
          connectNulls={false}
          name="及格线"
        />
        
        {/* 班级平均线 - 基于参考科目，只在有数据时显示 */}
        <Line
          type="monotone"
          dataKey="classAverage"
          stroke={themeStyles.warningColor}
          strokeDasharray="3 3"
          strokeWidth={1}
          dot={false}
          connectNulls={false}
          name={`${subjectLabels[selectedReferenceSubject] || ''}平均线`}
        />
        
        {/* 优秀线 - 基于参考科目，只在有数据时显示 */}
        <Line
          type="monotone"
          dataKey="excellentLine"
          stroke={themeStyles.successColor}
          strokeDasharray="5 5"
          strokeWidth={1}
          dot={false}
          connectNulls={false}
                          name={`${subjectLabels[selectedReferenceSubject] || ''}优秀线`}
        />
      </>
    );
  };

  return (
    <Card
      title={
        <Space>
          <LineChartOutlined style={{ color: themeStyles.primaryColor }} />
          <span>考试成绩趋势分析</span>
          <Tooltip title="展示选中科目的历次考试成绩变化趋势，包含参考线对比">
            <InfoCircleOutlined style={{ color: themeStyles.textSecondary }} />
          </Tooltip>
        </Space>
      }
style={{ marginBottom: 'var(--space-6)' }}
    >
      {/* 控制器区域 */}
<Row gutter={[16, 16]} style={{ marginBottom: 'var(--space-4)' }}>
                  <Col xs={24} sm={12} md={6}>
            <Space direction="vertical" size={0} style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  <BookOutlined style={{ marginRight: '4px' }} />
                  选择科目
                </Text>
                <AppButton 
                  hierarchy="link" 
                  size="sm" 
                  onClick={handleSelectAll}
                  style={{ padding: 0, height: 'auto', fontSize: '12px' }}
                >
                  {isAllSelected ? '取消全选' : '全选'}
                </AppButton>
              </div>
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                value={selectedSubjects}
                onChange={handleSubjectChange}
                placeholder="请选择要对比的科目"
                maxTagCount={isMobile ? 1 : 'responsive'}
                size={isMobile ? 'middle' : 'small'}
              >
                {Object.entries(subjectLabels).map(([value, label]) => (
                  <Option key={value} value={value}>
                    {label}
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            {isMobile ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, width: '100%' }}>
                <div style={{ flex: 1 }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    <TrophyOutlined style={{ marginRight: '4px' }} />参考线科目
                  </Text>
                  <Select
                    style={{ width: '100%' }}
                    value={selectedReferenceSubject}
                    onChange={setSelectedReferenceSubject}
                    size="middle"
                    disabled={selectedSubjects.length === 0}
                    placeholder="选择参考基准科目"
                  >
                    {selectedSubjects.map(subject => (
                      <Option key={subject} value={subject}>
                        {subjectLabels[subject]}
                      </Option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Radio.Group
                    value={scoreMode}
                    onChange={(e) => setScoreMode(e.target.value)}
                    size="middle"
                  >
                    <Radio.Button value="normalized">归一化</Radio.Button>
                    <Radio.Button value="original">原始分</Radio.Button>
                  </Radio.Group>
                </div>
              </div>
            ) : (
              <Space direction="vertical" size={0} style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  <TrophyOutlined style={{ marginRight: '4px' }} />
                  参考线科目
                </Text>
                <Select
                  style={{ width: '100%' }}
                  value={selectedReferenceSubject}
                  onChange={setSelectedReferenceSubject}
                  size="small"
                  disabled={selectedSubjects.length === 0}
                  placeholder="选择参考基准科目"
                >
                  {selectedSubjects.map(subject => (
                    <Option key={subject} value={subject}>
                      {subjectLabels[subject]}
                    </Option>
                  ))}
                </Select>
                <Text type="secondary" style={{ fontSize: '10px', marginTop: '2px' }}>
                  显示该科目在各次考试的基准线
                </Text>
              </Space>
            )}
          </Col>
          
          <Col xs={24} sm={12} md={6}>
            {!isMobile && (
              <Space direction="vertical" size={0} style={{ width: '100%' }}>
                <Radio.Group
                  value={scoreMode}
                  onChange={(e) => setScoreMode(e.target.value)}
                  size={isMobile ? 'middle' : 'small'}
                >
                  <Radio.Button value="normalized">归一化</Radio.Button>
                  <Radio.Button value="original">原始分</Radio.Button>
                </Radio.Group>
              </Space>
            )}
          </Col>
          
          <Col xs={24} sm={24} md={6}>
          <Space direction="vertical" size={0}>
            <Text type="secondary" style={{ fontSize: '12px' }}>参考线说明</Text>
            <Space wrap>
              <Tag color="red">及格线(60分)</Tag>
              <Tag color="gold">
                {selectedSubjects.includes(selectedReferenceSubject) 
                  ? `${subjectLabels[selectedReferenceSubject]}平均分` 
                  : '班级平均'
                }
              </Tag>
              <Tag color="green">
                {selectedSubjects.includes(selectedReferenceSubject) 
                                  ? `${subjectLabels[selectedReferenceSubject]}优秀线`
                : '优秀线'
                }
              </Tag>
            </Space>
<Text type="secondary" style={{ fontSize: '10px', marginTop: '4px' }}>
              平均分和优秀线基于该科目每次考试动态计算
            </Text>
          </Space>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Spin spinning={loading}>
        {chartData.length > 0 ? (
          <div style={{ height: isMobile ? '300px' : '400px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData}
                margin={{ 
                  top: 12, 
                  right: isMobile ? 10 : 30, 
                  left: isMobile ? 8 : 20, 
                  bottom: isMobile ? 40 : 60 
                }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={themeStyles.borderColor}
                  opacity={0.3}
                />
                <XAxis 
                  dataKey="displayDate"
                  tick={{ 
                    fontSize: isMobile ? 10 : 12, 
                    fill: themeStyles.textSecondary 
                  }}
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? 'end' : 'middle'}
                  height={isMobile ? 48 : 68}
                  label={{
                    value: scoreMode === 'normalized' ? '归一化成绩' : '原始成绩',
                    position: 'insideBottom',
                    offset: -4,
                    style: { fill: themeStyles.textSecondary, fontSize: isMobile ? 10 : 12 }
                  }}
                />
                <YAxis 
                  tick={{ 
                    fontSize: isMobile ? 10 : 12, 
                    fill: themeStyles.textSecondary 
                  }}
                  domain={scoreMode === 'normalized' ? [0, 100] : ['dataMin - 10', 'dataMax + 10']}
                  width={isMobile ? 28 : 40}
                  label={undefined}
                />
                <RechartsTooltip 
                  contentStyle={{
                    backgroundColor: themeStyles.cardBackground,
                    border: `1px solid ${themeStyles.borderColor}`,
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                  formatter={(value: any, name: string) => [
                    value !== null ? `${value.toFixed(1)}分` : '缺考',
                    name
                  ]}
                                     labelFormatter={(label: any, payload: any) => {
                     if (payload && payload[0]) {
                       return `${payload[0].payload.examName} (${label})`;
                     }
                     return label;
                   }}
                />
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: '10px',
                    fontSize: isMobile ? '12px' : '14px'
                  }}
                />
                
                {/* 参考线 */}
                {renderDynamicReferenceLines()}
                
                {/* 科目成绩线 */}
                {selectedSubjects.map((subject, index) => (
                  <Line
                    key={subject}
                    type="monotone"
                    dataKey={subjectLabels[subject]}
            stroke={getSubjectColors(theme)[index % getSubjectColors(theme).length]}
                    strokeWidth={2}
                    dot={{ 
                      r: isMobile ? 3 : 4,
                      strokeWidth: 2
                    }}
                    activeDot={{ 
                      r: isMobile ? 5 : 6,
                      strokeWidth: 0
                    }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无考试数据或请选择要分析的科目"
            style={{ padding: '60px 0' }}
          />
        )}
      </Spin>
    </Card>
  );
};

export default ExamScoreTrendChart; 