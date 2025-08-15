import { Card } from 'antd';
import { UnifiedCardPresets } from '@/theme/card';
import React, { useState, useEffect } from 'react';
import { Row, Col, Select, Alert, Spin, Empty, Typography, Tag, Statistic, Space, Divider, Progress, List, Avatar, Tooltip, theme as themeApi } from 'antd';
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
import { 
  LineChartOutlined,
  TagsOutlined,
  CalendarOutlined,
  UserOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  RiseOutlined,
  FallOutlined
} from '@ant-design/icons';
import { useThemeStore } from '@/stores/themeStore';
import { useResponsive } from '@/hooks/useResponsive';
import { 
  getStudentGrowthAnalytics,
  getStudentsForAnalytics 
} from '@/api/analyticsApi';
import type { 
  AnalyticsTimeRangeParams,
  StudentGrowthAnalytics 
} from '@/types/api';

const { Title, Text } = Typography;
const { Option } = Select;

interface StudentAnalyticsTabProps {
  timeParams: AnalyticsTimeRangeParams;
  refreshKey: number;
}

const StudentAnalyticsTab: React.FC<StudentAnalyticsTabProps> = ({
  timeParams,
  refreshKey
}) => {
  const { theme } = useThemeStore();
  const { isMobile } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  // TODO: Migrate to publicId after backend stabilization
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [students, setStudents] = useState<{ id: number; publicId: string; name: string; classNames: string[] }[]>([]);
  const [growthData, setGrowthData] = useState<StudentGrowthAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ===============================
  // 主题适配的样式配置
  // ===============================

  const { token } = themeApi.useToken();
  const themeStyles = {
    cardBackground: token.colorBgContainer,
    borderColor: token.colorBorder,
    textPrimary: token.colorText,
    textSecondary: token.colorTextSecondary,
    successColor: token.colorSuccess,
    warningColor: token.colorWarning,
    errorColor: token.colorError,
    primaryColor: token.colorPrimary,
    positiveColor: token.colorSuccess,
    negativeColor: token.colorError
  } as const;

  // ===============================
  // 加载学生列表
  // ===============================

  const loadStudents = async () => {
    setStudentsLoading(true);
    try {
      const studentsData = await getStudentsForAnalytics();
      setStudents(studentsData);
      
      // 自动选择第一个学生
      if (studentsData.length > 0 && !selectedStudentId) {
        setSelectedStudentId(studentsData[0].id);
      }
    } catch (err) {
      console.error('❌ 学生列表加载失败:', err);
      setError('学生列表加载失败');
    } finally {
      setStudentsLoading(false);
    }
  };

  // ===============================
  // 加载学生成长数据
  // ===============================

  const loadGrowthData = async () => {
    if (!selectedStudentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 加载学生成长数据...', { studentId: selectedStudentId, timeParams });
      
      // 优先使用后端返回的真实 publicId；若暂无（后端未重启或老数据），回退为使用数字ID
      const student = students.find(s => s.id === selectedStudentId);
      const publicIdToUse = student?.publicId && student.publicId.trim().length > 0
        ? student.publicId
        : String(selectedStudentId);
      const growthResult = await getStudentGrowthAnalytics(publicIdToUse, timeParams);
      console.log('📊 学生成长API返回数据:', growthResult);
      setGrowthData(growthResult);
      
      console.log('✅ 学生成长数据加载成功');
    } catch (err) {
      console.error('❌ 学生成长数据加载失败:', err);
      setError(err instanceof Error ? err.message : '数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    console.log('🔄 StudentAnalyticsTab useEffect triggered:', { selectedStudentId, timeParams, refreshKey });
    if (selectedStudentId) {
      loadGrowthData();
    }
  }, [selectedStudentId, timeParams, refreshKey]);

  // ===============================
  // 渲染成长趋势图
  // ===============================

  const renderGrowthTrendChart = () => {
    if (!growthData?.growthTrend || growthData.growthTrend.length === 0) {
      return (
        <Empty 
          description="暂无成长趋势数据" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    // 准备图表数据 - 转换为Recharts需要的透视表格式
    const chartData = growthData.growthTrend.map(item => ({
      date: item.date,
      '正面标签': item.positiveCount || 0,
      '需要改进': item.negativeCount || 0,
    }));

    return (
      <div style={{ height: isMobile ? '280px' : '350px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid 
              strokeDasharray="4 5" 
              stroke={theme === 'dark' ? '#434343' : '#f0f0f0'}
            />
            <XAxis 
              dataKey="date" 
              type="category"
              scale="point"
              tickCount={isMobile ? 4 : 6}
              style={{ fontSize: isMobile ? 10 : 12 }}
            />
            <YAxis 
              domain={[0, 'dataMax']}
              tickCount={isMobile ? 4 : 5}
              style={{ fontSize: isMobile ? 10 : 12 }}
            />
            <RechartsTooltip 
              formatter={(value: any, name: any) => [`${value} 次`, name]}
              shared={true}
            />
            <Legend 
              verticalAlign={isMobile ? 'bottom' : 'top'}
              height={36}
            />
            <Line
              type="monotone"
              dataKey="正面标签"
              stroke="var(--ant-color-success)"
              strokeWidth={isMobile ? 2 : 3}
              dot={{ r: isMobile ? 3 : 4 }}
              name="正面标签"
            />
            <Line
              type="monotone"
              dataKey="需要改进"
              stroke="var(--ant-color-error)"
              strokeWidth={isMobile ? 2 : 3}
              dot={{ r: isMobile ? 3 : 4 }}
              name="需要改进"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // ===============================
  // 渲染高频标签
  // ===============================

  const renderTopTags = () => {
    if (!growthData?.topTags) return null;

    return (
      <Row gutter={[16, 16]}>
        {/* 积极标签 */}
        <Col span={12}>
          <Card
            size="small"
            title={
              <Space>
                <RiseOutlined style={{ color: themeStyles.positiveColor }} />
                <Text style={{ color: themeStyles.textPrimary }}>
                  高频积极标签
                </Text>
              </Space>
            }
            bordered={false}
            style={{ 
              background: themeStyles.cardBackground,
              borderRadius: '8px'
            }}
          >
            <List
              size="small"
              dataSource={growthData.topTags.positive}
              renderItem={(tag, index) => (
                <List.Item style={{ padding: '8px 0' }}>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        size="small" 
                        style={{ 
                          backgroundColor: themeStyles.positiveColor,
                          color: 'white'
                        }}
                      >
                        {index + 1}
                      </Avatar>
                    }
                    title={
                      <Text style={{ color: themeStyles.textPrimary }}>
                        {tag.tagText}
                      </Text>
                    }
                    description={
                      <Tag color="green">
                        {tag.count} 次
                      </Tag>
                    }
                  />
                </List.Item>
              )}
            />
            {(!growthData.topTags.positive || growthData.topTags.positive.length === 0) && (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Alert
                  message="暂无数据"
                  description="当前时间段内没有积极标签记录"
                  type="info"
                  showIcon
                />
              </div>
            )}
          </Card>
        </Col>

        {/* 消极标签 */}
        <Col span={12}>
          <Card
            size="small"
            title={
              <Space>
                <FallOutlined style={{ color: themeStyles.negativeColor }} />
                <Text style={{ color: themeStyles.textPrimary }}>
                  高频消极标签
                </Text>
              </Space>
            }
            bordered={false}
            style={{ 
              background: themeStyles.cardBackground,
              borderRadius: '8px'
            }}
          >
            <List
              size="small"
              dataSource={growthData.topTags.negative}
              renderItem={(tag, index) => (
                <List.Item style={{ padding: '8px 0' }}>
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        size="small" 
                        style={{ 
                          backgroundColor: themeStyles.negativeColor,
                          color: 'white'
                        }}
                      >
                        {index + 1}
                      </Avatar>
                    }
                    title={
                      <Text style={{ color: themeStyles.textPrimary }}>
                        {tag.tagText}
                      </Text>
                    }
                    description={
                      <Tag color="red">
                        {tag.count} 次
                      </Tag>
                    }
                  />
                </List.Item>
              )}
            />
            {(!growthData.topTags.negative || growthData.topTags.negative.length === 0) && (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <Alert
                  message="暂无数据"
                  description="当前时间段内没有消极标签记录"
                  type="info"
                  showIcon
                />
              </div>
            )}
          </Card>
        </Col>
      </Row>
    );
  };

  // ===============================
  // 渲染考勤概览
  // ===============================

  const renderAttendanceSummary = () => {
    if (!growthData?.attendanceSummary) return null;

    const { attendanceSummary } = growthData;
    
    return (
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Statistic
            title="总出勤天数"
            value={attendanceSummary.totalDays}
            prefix={<CalendarOutlined style={{ color: themeStyles.primaryColor }} />}
            valueStyle={{ color: themeStyles.textPrimary }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="出勤率"
            value={attendanceSummary.attendanceRate}
            suffix="%"
            precision={1}
            prefix={<CheckCircleOutlined style={{ color: themeStyles.successColor }} />}
            valueStyle={{ 
              color: attendanceSummary.attendanceRate >= 80 
                ? themeStyles.successColor 
                : attendanceSummary.attendanceRate >= 60 
                  ? themeStyles.warningColor 
                  : themeStyles.errorColor 
            }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="正常出勤"
            value={attendanceSummary.presentDays}
            prefix={<CheckCircleOutlined style={{ color: themeStyles.successColor }} />}
            valueStyle={{ color: themeStyles.textPrimary }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="缺勤/未到"
            value={attendanceSummary.absentDays + attendanceSummary.noShowDays}
            prefix={<ExclamationCircleOutlined style={{ color: themeStyles.errorColor }} />}
            valueStyle={{ color: themeStyles.textPrimary }}
          />
        </Col>
      </Row>
    );
  };

  // ===============================
  // 错误状态
  // ===============================

  if (error) {
    return (
      <Alert
        message="数据加载失败"
        description={error}
        type="error"
        showIcon
        style={{ margin: '20px' }}
      />
    );
  }

  // ===============================
  // 渲染主要内容
  // ===============================

  const preset = UnifiedCardPresets.desktopDefault(false);

  return (
    <div data-page-container>
      {/* 学生选择器 */}
      <Card
        bordered={false}
        style={{ ...preset.style, background: themeStyles.cardBackground, marginBottom: 'var(--space-6)' }}
        styles={preset.styles}
      >
        <Row align="middle" gutter={[16, 0]}>
          <Col span={4}>
            <Text strong style={{ color: themeStyles.textPrimary }}>
              <UserOutlined style={{ marginRight: '8px', color: themeStyles.primaryColor }} />
              选择学生
            </Text>
          </Col>
          <Col span={8}>
            <Select
              placeholder="请选择要分析的学生"
              value={selectedStudentId}
              onChange={setSelectedStudentId}
              loading={studentsLoading}
              style={{ width: '100%' }}
              showSearch
              filterOption={(input, option) => {
                // 使用学生名称进行搜索（确保类型一致）
                const valueAsNumber = Number(option?.value);
                const student = students.find(s => s.id === valueAsNumber);
                return student ? student.name.toLowerCase().includes(input.toLowerCase()) : false;
              }}
            >
              {students.map(student => (
                <Option key={student.id} value={student.id}>
                  <Space>
                    <Text>{student.name}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      ({student.classNames.join(', ')})
                    </Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      · {student.publicId}
                    </Text>
                  </Space>
                </Option>
              ))}
            </Select>
          </Col>
          {growthData && (
            <Col span={12}>
              <Space size="large">
                <Text style={{ color: themeStyles.textSecondary }}>
                  {growthData.dateRange.startDate} 至 {growthData.dateRange.endDate}
                </Text>
                <Tag color={themeStyles.primaryColor}>
                  {growthData.studentName}
                </Tag>
              </Space>
            </Col>
          )}
        </Row>
      </Card>

      {selectedStudentId && (
        <Spin spinning={loading} tip="正在加载学生成长数据...">
          <Row gutter={[16, 16]}>
            {/* 成长趋势图 */}
            <Col span={24}>
              <Card
                title={
                  <Space>
                    <LineChartOutlined style={{ color: themeStyles.primaryColor }} />
                    <Text strong style={{ color: themeStyles.textPrimary }}>
                      成长趋势分析
                    </Text>
                  </Space>
                }
                bordered={false}
                style={{ ...preset.style, background: themeStyles.cardBackground, marginBottom: 'var(--space-6)' }}
                styles={preset.styles}
              >
                <div style={{ minHeight: '300px' }}>
                  {renderGrowthTrendChart()}
                </div>
              </Card>
            </Col>

            {/* 高频标签统计 */}
            <Col span={24}>
              <Card
                title={
                  <Space>
                    <TagsOutlined style={{ color: themeStyles.primaryColor }} />
                    <Text strong style={{ color: themeStyles.textPrimary }}>
                      高频成长标签
                    </Text>
                  </Space>
                }
                bordered={false}
                style={{ ...preset.style, background: themeStyles.cardBackground, marginBottom: 'var(--space-6)' }}
                styles={preset.styles}
              >
                {renderTopTags()}
              </Card>
            </Col>

            {/* 考勤概览 */}
            <Col span={24}>
              <Card
                title={
                  <Space>
                    <CalendarOutlined style={{ color: themeStyles.primaryColor }} />
                    <Text strong style={{ color: themeStyles.textPrimary }}>
                      考勤概览
                    </Text>
                  </Space>
                }
                bordered={false}
                style={{ ...preset.style, background: themeStyles.cardBackground }}
                styles={preset.styles}
              >
                {renderAttendanceSummary()}
              </Card>
            </Col>
          </Row>
        </Spin>
      )}

      {!selectedStudentId && !loading && (
        <Card
          bordered={false}
          style={{ ...preset.style, background: themeStyles.cardBackground, textAlign: 'center', padding: 'var(--space-8) var(--space-4)' }}
          styles={preset.styles}
        >
          <Empty
            description={
              <Text style={{ color: themeStyles.textSecondary }}>
                请先选择一个学生进行成长分析
              </Text>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      )}
    </div>
  );
};

export default StudentAnalyticsTab; 