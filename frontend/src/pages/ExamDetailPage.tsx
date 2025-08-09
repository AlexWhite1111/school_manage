import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Table,
  Input,
  Button,
  Space,
  Tag,
  Statistic,
  Typography,
  Alert,
  Spin,
  Empty,
  Progress,
  InputNumber,
  Switch,
  Checkbox,
  Tooltip,
  Divider,
  Badge,
  message,
  Select,
  Popover,
  Form,
  Modal,
  List
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  BookOutlined,
  TrophyOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  EditOutlined,
  FileTextOutlined,
  TagsOutlined,
  PlusOutlined,
  SmileOutlined,
  FrownOutlined,
  SearchOutlined,
  DeleteOutlined,
  EditOutlined as EditIcon
} from '@ant-design/icons';
import { useThemeStore } from '@/stores/themeStore';
import { useResponsive } from '@/hooks/useResponsive';
import { App } from 'antd';
import * as examApi from '@/api/examApi';
import * as studentLogApi from '@/api/studentLogApi';
import ExamTagManagerModal from '@/components/exam/ExamTagManagerModal';
import type { ExamDetails, UpdateExamScoresRequest, Tag as TagType } from '@/types/api';
import dayjs from 'dayjs';
import ExamWordCloud from '@/components/common/WordCloudPanel/ExamWordCloud';
// 移除外部组件导入，直接在页面中实现统计分析

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

// 考试类型中文映射
const examTypeLabels: Record<string, string> = {
  'DAILY_QUIZ': '日常测验',
  'WEEKLY_TEST': '周测',
  'MONTHLY_EXAM': '月考',
  'MIDTERM': '期中考试',
  'FINAL': '期末考试'
};

// 扩展的成绩更新请求接口，包含词条信息
interface ExtendedUpdateExamScoresRequest extends UpdateExamScoresRequest {
  selectedTags?: number[]; // 选中的词条ID列表
}

const ExamDetailPage: React.FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useThemeStore();
  const { isMobile } = useResponsive();
  const { message: antMessage } = App.useApp();

  // ===============================
  // 智能返回逻辑
  // ===============================
  const getBackPath = () => {
    // 检查来源状态
    const state = location.state as any;
    if (state?.from) {
      return state.from;
    }

    // 检查referrer或默认返回路径
    const referrer = document.referrer;
    if (referrer.includes('/analytics')) {
      return '/analytics';
    }
    if (referrer.includes('/student-log')) {
      return '/student-log';
    }

    // 默认返回学生成长记录页面
    return '/student-log';
  };

  const handleBack = () => {
    const backPath = getBackPath();
    navigate(backPath);
  };

  // ===============================
  // 状态管理
  // ===============================
  const [loading, setLoading] = useState(true);
  // 软刷新：保存后局部轻量刷新，避免整页白屏
  const [softReloading, setSoftReloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [examData, setExamData] = useState<ExamDetails | null>(null);
  const [editingMode, setEditingMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, ExtendedUpdateExamScoresRequest>>(new Map());
  const [availableTags, setAvailableTags] = useState<TagType[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 新增：词条相关状态
  const [studentTagsMap, setStudentTagsMap] = useState<Map<string, number[]>>(new Map()); // 学生成绩对应的词条选择
  const [popoverVisibleMap, setPopoverVisibleMap] = useState<Map<string, boolean>>(new Map());
  const [tagManagerVisible, setTagManagerVisible] = useState(false); // 持久化Popover状态，防止Table重渲染丢失


  // 考试统计分析数据状态
  const [statisticsData, setStatisticsData] = useState<any>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);

  // 学生搜索和筛选状态
  const [studentSearchText, setStudentSearchText] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');

  // ===============================
  // 主题适配样式
  // ===============================
  const themeStyles = {
    cardBackground: theme === 'dark' ? '#141414' : '#ffffff',
    borderColor: theme === 'dark' ? '#303030' : '#e8e8e8',
    textPrimary: theme === 'dark' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
    textSecondary: theme === 'dark' ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)',
    successColor: theme === 'dark' ? '#52c41a' : '#389e0d',
    warningColor: theme === 'dark' ? '#faad14' : '#d48806',
    errorColor: theme === 'dark' ? '#ff4d4f' : '#cf1322',
    primaryColor: theme === 'dark' ? '#1890ff' : '#1890ff',
  };

  // ===============================
  // 数据加载
  // ===============================
  const loadExamData = async (options?: { soft?: boolean }) => {
    if (!examId) return;
    const useSoft = options?.soft === true;
    if (useSoft) {
      setSoftReloading(true);
    } else {
      setLoading(true);
    }
    try {
      const [examDetails, tags] = await Promise.all([
        examApi.getExamDetails(parseInt(examId)),
        studentLogApi.getExamTags('all')
      ]);

      setExamData(examDetails);
      setAvailableTags(tags);
      // 初始化学生-科目标签映射，确保进入页面即高亮
      try {
        const map = new Map<string, number[]>();
        const raw: any[] = (examDetails as any).scores || [];
        raw.forEach((s: any) => {
          const enrollId = s.enrollmentId || s.enrollment?.id || s.enrollment_id;
          const key = `${enrollId}-${s.subject}`;
          const ids = (s.tags || []).map((t: any) => (t.tag ? t.tag.id : t.id)).filter((x: any) => typeof x === 'number');
          if (key) map.set(key, ids);
        });
        setStudentTagsMap(map);
      } catch (e) {
        console.warn('初始化标签映射失败:', e);
      }
      setError(null);
    } catch (err) {
      console.error('❌ 考试详情加载失败:', err);
      setError('考试详情加载失败');
    } finally {
      if (useSoft) {
        setSoftReloading(false);
      } else {
        setLoading(false);
      }
    }
  };

  // 加载考试统计分析
  const loadStatistics = async () => {
    if (!examId) return;

    setStatisticsLoading(true);
    try {
      const data = await examApi.getExamStatistics(parseInt(examId));
      setStatisticsData(data);
    } catch (error) {
      console.error('❌ 统计分析加载失败:', error);
      antMessage.error('统计分析加载失败');
    } finally {
      setStatisticsLoading(false);
    }
  };

  useEffect(() => {
    if (examId) {
      loadExamData();
      loadStatistics();
    }
  }, [examId]);

  // ===============================
  // 数据处理和统计计算
  // ===============================
  const processedData = useMemo(() => {
    if (!examData) return null;

    // 处理后端返回的原始数据 - 后端直接返回exam对象，不是ExamDetails结构
    const rawExam = examData as any;
    const scores = rawExam.scores || [];

    // 获取所有科目
    const subjects = [...new Set(scores.map((score: any) => score.subject))] as string[];

    // 按学生分组成绩
    const studentScoresMap = new Map();

    scores.forEach((score: any) => {
      const studentId = score.enrollment.student.id;
      if (!studentScoresMap.has(studentId)) {
        studentScoresMap.set(studentId, {
          student: score.enrollment.student,
          enrollmentId: score.enrollmentId,
          scores: {}
        });
      }

      studentScoresMap.get(studentId).scores[score.subject] = {
        id: score.id,
        score: score.score,
        isAbsent: score.isAbsent,
        tags: score.tags?.map((t: any) => t.tag) || []
      };
    });

    const studentScores = Array.from(studentScoresMap.values());

    // 计算科目统计
    const subjectStats: Record<string, any> = {};

    subjects.forEach((subject: string) => {
      const subjectScores = scores.filter((score: any) => score.subject === subject);
      const validScores = subjectScores.filter((score: any) => !score.isAbsent && score.score !== null);
      const absentCount = subjectScores.filter((score: any) => score.isAbsent).length;

      const scoreValues = validScores.map((score: any) => score.score);
      const average = scoreValues.length > 0 ? scoreValues.reduce((sum: number, s: number) => sum + s, 0) / scoreValues.length : 0;
      const highest = scoreValues.length > 0 ? Math.max(...scoreValues) : 0;
      const lowest = scoreValues.length > 0 ? Math.min(...scoreValues) : 0;

      subjectStats[subject] = {
        totalStudents: subjectScores.length,
        recordedScores: validScores.length,
        absentCount,
        scores: scoreValues,
        average: Math.round(average * 100) / 100,
        highest,
        lowest
      };
    });

    return {
      exam: rawExam,
      studentScores,
      subjectStats,
      subjects
    };
  }, [examData]);

  const statistics = useMemo(() => {
    if (!processedData) return null;

    const { studentScores, subjectStats, subjects } = processedData;
    const totalStudents = studentScores.length;

    // 计算整体统计
    let totalRecordedScores = 0;
    let totalPossibleScores = 0;
    let totalAbsent = 0;

    // 修复：基于所有学生和科目来计算统计
    const totalPossibleEntries = totalStudents * subjects.length;
    let totalValidEntries = 0;
    let totalAbsentEntries = 0;

    subjects.forEach((subject: string) => {
      const stats = subjectStats[subject];
      if (stats) {
        totalRecordedScores += stats.recordedScores || 0;
        totalAbsent += stats.absentCount || 0;
        // 对于每个科目，参考人数就是班级总人数
        totalPossibleScores += totalStudents;
      }
    });

    // 计算实际录入的成绩数（包括缺考记录）
    studentScores.forEach(student => {
      subjects.forEach(subject => {
        const scoreData = student.scores[subject];
        if (scoreData) {
          if (scoreData.isAbsent) {
            totalAbsentEntries++;
          } else if (scoreData.score !== null && scoreData.score !== undefined) {
            totalValidEntries++;
          }
        }
      });
    });

    const actualParticipants = totalValidEntries; // 实际参考人数（有成绩的）
    const actualAbsent = totalAbsentEntries; // 实际缺考人数
    const actualTotal = actualParticipants + actualAbsent; // 实际录入总数

    const participationRate = totalPossibleEntries > 0 ? (actualParticipants / totalPossibleEntries) * 100 : 0;
    const absentRate = totalPossibleEntries > 0 ? (actualAbsent / totalPossibleEntries) * 100 : 0;
    const completionRate = totalPossibleEntries > 0 ? (actualTotal / totalPossibleEntries) * 100 : 0;

    return {
      totalStudents,
      subjectCount: subjects.length,
      participationRate: Math.round(participationRate * 10) / 10, // 保留一位小数
      absentRate: Math.round(absentRate * 10) / 10,
      completionRate: Math.round(completionRate * 10) / 10,
      actualParticipants,
      actualAbsent,
      actualTotal,
      totalPossibleEntries
    };
  }, [processedData]);

  // ===============================
  // 成绩处理函数
  // ===============================
  const handleScoreChange = (enrollmentId: number, subject: string, value: number | null, isAbsent: boolean = false) => {
    const key = `${enrollmentId}-${subject}`;
    const existingChange = pendingChanges.get(key);
    const change: ExtendedUpdateExamScoresRequest = {
      enrollmentId,
      subject: subject as any,
      score: isAbsent ? undefined : value || undefined,
      isAbsent,
      selectedTags: existingChange?.selectedTags || []
    };

    const newChanges = new Map(pendingChanges);
    newChanges.set(key, change);
    setPendingChanges(newChanges);
  };

  const handleAbsentChange = (enrollmentId: number, subject: string, isAbsent: boolean) => {
    handleScoreChange(enrollmentId, subject, null, isAbsent);
  };

  // 新增：处理词条选择
  const handleTagsChange = (enrollmentId: number, subject: string, selectedTagIds: number[]) => {
    const key = `${enrollmentId}-${subject}`;
    const existingChange = pendingChanges.get(key);

    if (existingChange) {
      // 更新现有的变更记录
      const updatedChange = {
        ...existingChange,
        selectedTags: selectedTagIds
      };
      const newChanges = new Map(pendingChanges);
      newChanges.set(key, updatedChange);
      setPendingChanges(newChanges);
    } else {
      // 创建新的变更记录（只有词条变更）
      const change: ExtendedUpdateExamScoresRequest = {
        enrollmentId,
        subject: subject as any,
        selectedTags: selectedTagIds
      };
      const newChanges = new Map(pendingChanges);
      newChanges.set(key, change);
      setPendingChanges(newChanges);
    }

    // 同时更新本地词条映射状态
    const tagKey = `${enrollmentId}-${subject}`;
    const newTagsMap = new Map(studentTagsMap);
    newTagsMap.set(tagKey, selectedTagIds);
    setStudentTagsMap(newTagsMap);

    // TODO: 实时保存（单元格防抖）——占位，稍后统一实现防抖与轻提示
  };

  // 获取学生的考试表现词条
  const getStudentTags = (enrollmentId: number, subject: string): number[] => {
    const key = `${enrollmentId}-${subject}`;
    const pendingChange = pendingChanges.get(key);
    if (pendingChange?.selectedTags) {
      return pendingChange.selectedTags;
    }
    return studentTagsMap.get(key) || [];
  };

  // Popover状态管理 - 防止Table重渲染导致状态丢失
  const setPopoverVisible = useCallback((enrollmentId: number, subject: string, visible: boolean) => {
    const key = `${enrollmentId}-${subject}`;
    setPopoverVisibleMap(prev => {
      const newMap = new Map(prev);
      if (visible) {
        newMap.set(key, true);
      } else {
        newMap.delete(key);
      }
      return newMap;
    });
  }, []);

  const getPopoverVisible = useCallback((enrollmentId: number, subject: string): boolean => {
    const key = `${enrollmentId}-${subject}`;
    return popoverVisibleMap.get(key) || false;
  }, [popoverVisibleMap]);



  const handleSaveChanges = async () => {
    if (!examId || pendingChanges.size === 0) return;

    setSaving(true);
    try {
      const scoresData = Array.from(pendingChanges.values()).map(change => ({
        enrollmentId: change.enrollmentId,
        subject: change.subject,
        score: change.score,
        isAbsent: change.isAbsent,
        tags: change.selectedTags || [] // 将selectedTags映射为tags字段
      }));

      // 添加调试日志
      console.log('🔍 准备发送的scoresData:', scoresData);
      console.log('🔍 第一条数据详情:', scoresData[0]);

      // 保存考试成绩
      await examApi.updateExamScores(parseInt(examId), scoresData);

      antMessage.success(`成功更新 ${scoresData.length} 条成绩记录`);
      setPendingChanges(new Map());
      // 不清空 studentTagsMap，避免短暂丢失展示导致闪烁
      setPopoverVisibleMap(new Map()); // 清除所有Popover状态
      await loadExamData({ soft: true }); // 软刷新，避免白屏
      await loadStatistics(); // 新增：重新加载统计数据
    } catch (err) {
      console.error('❌ 保存成绩失败:', err);
      antMessage.error('保存成绩失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setPendingChanges(new Map());
    setStudentTagsMap(new Map());
    setPopoverVisibleMap(new Map()); // 清除所有Popover状态
    antMessage.info('已取消所有未保存的更改');
  };

  // ===============================
  // 词条选择组件 - 优化移动端体验
  // ===============================
  const TagSelector: React.FC<{
    enrollmentId: number;
    subject: string;
    selectedTags: number[];
    onTagsChange: (tags: number[]) => void;
  }> = ({ enrollmentId, subject, selectedTags, onTagsChange }) => {
    const positiveExamTags = availableTags.filter(tag => tag.type === 'EXAM_POSITIVE');
    const negativeExamTags = availableTags.filter(tag => tag.type === 'EXAM_NEGATIVE');

    const isVisible = getPopoverVisible(enrollmentId, subject);

    // 智能关闭处理 - 只在真正需要时关闭
    const handleOpenChange = useCallback((visible: boolean) => {
      if (visible) {
        // 打开时直接设置
        setPopoverVisible(enrollmentId, subject, true);
      } else {
        // 关闭时需要判断：如果是因为Tag点击导致的状态变化，不关闭
        // 这里简化处理，延迟一帧再关闭，让Tag点击完成
        setTimeout(() => {
          setPopoverVisible(enrollmentId, subject, false);
        }, 0);
      }
    }, [enrollmentId, subject]);

    const handleComplete = useCallback(() => {
      setPopoverVisible(enrollmentId, subject, false);
    }, [enrollmentId, subject]);

    const renderTagSelector = () => (
      <div
        style={{
          maxWidth: isMobile ? '280px' : '500px',
          width: isMobile ? '280px' : '450px'
        }}
        onClick={(e) => e.stopPropagation()} // 阻止整个区域的点击冒泡
      >
        <div style={{ marginBottom: '16px' }}>
          <Text strong style={{ color: themeStyles.successColor, fontSize: isMobile ? '13px' : '14px' }}>
            <SmileOutlined /> 正面表现
          </Text>
          <div style={{
            marginTop: '12px',
            maxHeight: isMobile ? '150px' : '200px',
            overflowY: 'auto',
            padding: isMobile ? '6px' : '8px',
            border: `1px solid ${themeStyles.borderColor}`,
            borderRadius: '6px',
            background: theme === 'dark' ? '#1f1f1f' : '#fafafa'
          }}>
            {positiveExamTags.map(tag => (
              <Tag.CheckableTag
                key={tag.id}
                checked={selectedTags.includes(tag.id)}
                onChange={(checked) => {
                  const newTags = checked
                    ? [...selectedTags, tag.id]
                    : selectedTags.filter(id => id !== tag.id);
                  onTagsChange(newTags);
                }}
                onClick={(e) => e.stopPropagation()} // 阻止事件冒泡
                style={{
                  marginBottom: isMobile ? '4px' : '6px',
                  marginRight: isMobile ? '4px' : '6px',
                  padding: isMobile ? '2px 6px' : '4px 8px',
                  fontSize: isMobile ? '12px' : '13px'
                }}
              >
                {tag.text}
              </Tag.CheckableTag>
            ))}
          </div>
        </div>

        <Divider style={{ margin: isMobile ? '12px 0' : '16px 0' }} />

        <div>
          <Text strong style={{ color: themeStyles.errorColor, fontSize: isMobile ? '13px' : '14px' }}>
            <FrownOutlined /> 待改进项
          </Text>
          <div style={{
            marginTop: '12px',
            maxHeight: isMobile ? '150px' : '200px',
            overflowY: 'auto',
            padding: isMobile ? '6px' : '8px',
            border: `1px solid ${themeStyles.borderColor}`,
            borderRadius: '6px',
            background: theme === 'dark' ? '#1f1f1f' : '#fafafa'
          }}>
            {negativeExamTags.map(tag => (
              <Tag.CheckableTag
                key={tag.id}
                checked={selectedTags.includes(tag.id)}
                onChange={(checked) => {
                  const newTags = checked
                    ? [...selectedTags, tag.id]
                    : selectedTags.filter(id => id !== tag.id);
                  onTagsChange(newTags);
                }}
                onClick={(e) => e.stopPropagation()} // 阻止事件冒泡
                style={{
                  marginBottom: isMobile ? '4px' : '6px',
                  marginRight: isMobile ? '4px' : '6px',
                  padding: isMobile ? '2px 6px' : '4px 8px',
                  fontSize: isMobile ? '12px' : '13px'
                }}
              >
                {tag.text}
              </Tag.CheckableTag>
            ))}
          </div>
        </div>



        <div style={{
          marginTop: isMobile ? '12px' : '16px',
          textAlign: 'right',
          paddingTop: isMobile ? '8px' : '12px',
          borderTop: `1px solid ${themeStyles.borderColor}`
        }}>
          <Button
            type="primary"
            size={isMobile ? "middle" : "small"}
            onClick={handleComplete}
            style={{ minWidth: isMobile ? '100px' : '80px' }}
          >
            完成选择
          </Button>
        </div>
      </div>
    );

    return (
      <Popover
        content={renderTagSelector()}
        title={
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
            <TagsOutlined style={{ marginRight: '8px', color: themeStyles.primaryColor }} />
            选择考试表现词条
          </div>
        }
        trigger="click"
        placement={isMobile ? "bottom" : "topLeft"}
        open={isVisible}
        onOpenChange={handleOpenChange}
        overlayStyle={{
          maxWidth: isMobile ? '90vw' : '600px',
          minWidth: isMobile ? '300px' : '500px'
        }}
        styles={{ body: { padding: isMobile ? '12px' : '16px' } }}
      >
        <Button
          type="text"
          icon={<TagsOutlined />}
          size="small"
          onClick={() => setPopoverVisible(enrollmentId, subject, true)}
          style={{
            color: selectedTags.length > 0 ? themeStyles.primaryColor : themeStyles.textSecondary
          }}
        >
          词条 {selectedTags.length > 0 && <Badge count={selectedTags.length} size="small" />}
        </Button>
      </Popover>
    );
  };

  // ===============================
  // 表格列配置
  // ===============================
  const getTableColumns = () => {
    if (!examData) return [];

    const subjects = processedData?.subjects || [];
    const baseColumns = [
      {
        title: '学生姓名',
        dataIndex: ['student', 'name'],
        key: 'studentName',
        fixed: 'left' as const,
        width: 120,
        render: (text: string) => <Text strong>{text}</Text>
      }
    ];

    const scoreColumns = subjects.map(subject => ({
      title: subjectLabels[subject] || subject,
      dataIndex: ['scores', subject],
      key: subject,
      width: 160, // 增加宽度以容纳词条按钮
      render: (scoreData: any, record: any) => {
        const enrollmentId = record.enrollmentId;
        const key = `${enrollmentId}-${subject}`;
        const pendingChange = pendingChanges.get(key);

        const currentScore = pendingChange?.score ?? scoreData?.score;
        const currentIsAbsent = pendingChange?.isAbsent ?? scoreData?.isAbsent ?? false;
        const selectedTags = getStudentTags(enrollmentId, subject);

        return (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {editingMode ? (
              <>
                <InputNumber
                  size="small"
                  min={0}
                  max={processedData?.exam?.totalScore || 100}
                  value={currentIsAbsent ? undefined : currentScore}
                  disabled={currentIsAbsent}
                  onChange={(value) => handleScoreChange(enrollmentId, subject, value, currentIsAbsent)}
                  placeholder="分数"
                  style={{ width: '100%' }}
                />
                <Checkbox
                  checked={currentIsAbsent}
                  onChange={(e) => handleAbsentChange(enrollmentId, subject, e.target.checked)}
                  style={{ fontSize: '12px' }}
                >
                  缺考
                </Checkbox>
                <TagSelector
                  enrollmentId={enrollmentId}
                  subject={subject}
                  selectedTags={selectedTags}
                  onTagsChange={(tags) => handleTagsChange(enrollmentId, subject, tags)}
                />
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                {currentIsAbsent ? (
                  <Tag color="orange">缺考</Tag>
                ) : currentScore !== null && currentScore !== undefined ? (
                  <Text strong style={{ fontSize: '16px' }}>{currentScore}</Text>
                ) : (
                  <Text type="secondary">-</Text>
                )}
                {pendingChange && (
                  <Badge status="processing" style={{ marginLeft: 4 }} />
                )}
                {selectedTags.length > 0 && (
                  <div style={{ marginTop: '4px' }}>
                    {selectedTags.slice(0, 2).map(tagId => {
                      const tag = availableTags.find(t => t.id === tagId);
                      if (!tag) return null;
                      return (
                        <Tag
                          key={tagId}
                          color={tag.type === 'EXAM_POSITIVE' ? 'green' : 'red'}
                          style={{ fontSize: '10px', margin: '1px' }}
                        >
                          {tag.text}
                        </Tag>
                      );
                    })}
                     {selectedTags.length > 2 && (
                       <Tag style={{ fontSize: '10px' }}>
                         +{selectedTags.length - 2}
                       </Tag>
                     )}
                  </div>
                )}
              </div>
            )}
          </Space>
        );
      }
    }));

    const actionColumn = editingMode ? [] : [
      {
        title: '操作',
        key: 'action',
        fixed: 'right' as const,
        width: 100,
        render: (_: any, record: any) => (
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => {
              setEditingMode(true);
            }}
          >
            编辑
          </Button>
        )
      }
    ];

    return [...baseColumns, ...scoreColumns, ...actionColumn];
  };

  // ===============================
  // 渲染组件
  // ===============================
  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">加载考试详情中...</Text>
        </div>
      </div>
    );
  }

  if (error || !examData) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="加载失败"
          description={error || '考试数据不存在'}
          type="error"
          showIcon
          action={
            <Space>
              <Button size="small" onClick={loadExamData}>重试</Button>
              <Button size="small" icon={<ArrowLeftOutlined />} onClick={handleBack} />
            </Space>
          }
        />
      </div>
    );
  }

  const exam = processedData?.exam;
  const studentScores = processedData?.studentScores || [];

  // 渲染统计分析
  const renderStatistics = () => {
    if (statisticsLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>正在加载统计分析数据...</div>
        </div>
      );
    }

    if (!statisticsData) {
      return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Empty description="暂无统计分析数据" />
        </div>
      );
    }

    return (
      <div style={{ padding: '16px' }}>
        <Card size="small" style={{ marginBottom: '16px' }}>
          <Title level={4}>
            {statisticsData.exam.name} - 统计分析报告
          </Title>
          <Text type="secondary">
            考试日期：{new Date(statisticsData.exam.examDate).toLocaleDateString()} |
            满分：{statisticsData.exam.totalScore}分 |
            班级：{statisticsData.exam.class?.name}
          </Text>
        </Card>

        {/* 整体概览 */}
        <Card title={<><BarChartOutlined /> 整体概览</>} size="small" style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <Statistic
                title="总学生数"
                value={statisticsData.overview.totalStudents}
                prefix={<UserOutlined />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="参与人数"
                value={statisticsData.overview.participantCount}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="参与率"
                value={statisticsData.overview.participationRate}
                suffix="%"
                valueStyle={{
                  color: statisticsData.overview.participationRate >= 90 ? '#3f8600' :
                         statisticsData.overview.participationRate >= 70 ? '#faad14' : '#cf1322'
                }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="缺考人数"
                value={statisticsData.overview.absentCount}
                valueStyle={{ color: statisticsData.overview.absentCount > 0 ? '#cf1322' : '#3f8600' }}
              />
            </Col>
          </Row>
        </Card>

        {/* 科目分析 */}
        <Card title={<><BookOutlined /> 科目分析</>} size="small" style={{ marginBottom: '16px' }}>
          <Table
            dataSource={statisticsData.subjectAnalysis}
            columns={[
              {
                title: '科目',
                dataIndex: 'subject',
                key: 'subject',
                render: (subject: string) => <Tag color="blue">{subjectLabels[subject] || subject}</Tag>
              },
              {
                title: '参与人数',
                dataIndex: 'participantCount',
                key: 'participantCount'
              },
              {
                title: '平均分',
                dataIndex: 'average',
                key: 'average',
                render: (value: number) => (
                  <Text style={{
                    color: value >= 80 ? '#52c41a' : value >= 60 ? '#faad14' : '#ff4d4f'
                  }}>
                    {value.toFixed(1)}
                  </Text>
                )
              },
              {
                title: '及格率',
                dataIndex: 'passRate',
                key: 'passRate',
                render: (value: number) => `${value}%`
              }
            ]}
            rowKey="subject"
            pagination={false}
            size="small"
          />
        </Card>

        {/* 考试表现词云 */}
        {statisticsData.tagAnalysis && statisticsData.tagAnalysis.topTags && statisticsData.tagAnalysis.topTags.length > 0 && (
          <Card
            title={
              <Space>
                <TagsOutlined />
                <span>考试表现词云</span>
                <Tooltip title="基于考试成绩标签的表现分析，显示学生整体表现特征">
                  <Text type="secondary" style={{ fontSize: '12px' }}>(共{statisticsData.tagAnalysis.totalTags}个标签)</Text>
                </Tooltip>
              </Space>
            }
            size="small"
            style={{ marginBottom: '16px' }}
          >
            <div style={{ minHeight: '200px' }}>
               <ExamWordCloud
                 data={statisticsData.tagAnalysis.topTags.slice(0, 10).map((tag: any) => ({
                   text: tag.text,
                   value: tag.count,
                   type: tag.type === 'EXAM_POSITIVE' ? 'positive' : 'negative'
                 }))}
                 loading={statisticsLoading}
               />
             </div>

            {/* 词云统计信息 */}
            <Divider />
            <Row gutter={[16, 8]}>
              <Col xs={12} sm={6}>
                <Statistic
                  title="正面标签"
                  value={statisticsData.tagAnalysis.positiveCount}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<SmileOutlined />}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="待改进标签"
                  value={statisticsData.tagAnalysis.negativeCount}
                  valueStyle={{ color: '#faad14' }}
                  prefix={<FrownOutlined />}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="标签总数"
                  value={statisticsData.tagAnalysis.totalTags}
                  prefix={<TagsOutlined />}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="正面比例"
                  value={statisticsData.tagAnalysis.totalTags > 0 ?
                    Math.round((statisticsData.tagAnalysis.positiveCount / statisticsData.tagAnalysis.totalTags) * 100) : 0}
                  suffix="%"
                  valueStyle={{
                    color: statisticsData.tagAnalysis.totalTags > 0 &&
                           (statisticsData.tagAnalysis.positiveCount / statisticsData.tagAnalysis.totalTags) >= 0.6 ?
                           '#52c41a' : '#faad14'
                  }}
                />
              </Col>
            </Row>
          </Card>
        )}

        <Alert
          message="统计分析说明"
          description="此报告基于考试成绩、参与度等数据生成，为教学改进提供参考。"
          type="info"
          showIcon
          style={{ marginTop: '16px' }}
        />
      </div>
    );
  };

  return (
    <div style={{ padding: isMobile ? '16px' : '24px', position: 'relative' }}>
      {softReloading && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: theme === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.9)',
            border: `1px solid ${themeStyles.borderColor}`,
            borderRadius: 6,
            padding: '6px 10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <Spin size="small" />
          <Text type="secondary" style={{ fontSize: 12 }}>更新中…</Text>
        </div>
      )}
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面头部 */}
        <div>
          <Space style={{ marginBottom: 16 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              type="text"
            />
            <Divider type="vertical" />
            <Title level={2} style={{ margin: 0 }}>
              {exam.name}
            </Title>
            <Tag color="blue">{examTypeLabels[exam.examType]}</Tag>
          </Space>
        </div>

        {/* 考试基本信息 */}
        <Card
          title={
            <Space>
              <BookOutlined />
              <span>考试信息</span>
            </Space>
          }
          size="small"
        >
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <Statistic
                title="考试日期"
                value={dayjs(exam.examDate).format('YYYY年MM月DD日')}
                prefix={<ClockCircleOutlined />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="总分"
                value={exam.totalScore || 100}
                suffix="分"
                prefix={<TrophyOutlined />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="参考人数"
                value={statistics?.actualParticipants || 0}
                prefix={<UserOutlined />}
                                  valueStyle={{ color: themeStyles.primaryColor }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic
                title="录入进度"
                value={statistics?.completionRate || 0}
                suffix="%"
                prefix={<CheckCircleOutlined />}
                valueStyle={{
                  color: (statistics?.completionRate || 0) >= 90 ? themeStyles.successColor : themeStyles.warningColor
                }}
              />
            </Col>
          </Row>

          {exam.description && (
            <>
              <Divider />
              <div>
                <Text type="secondary">考试说明：</Text>
                <Text>{exam.description}</Text>
              </div>
            </>
          )}
        </Card>

        {/* 操作工具栏 */}
        <Card size="small">
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <Text type="secondary">操作模式：</Text>
                <Switch
                  checked={editingMode}
                  onChange={setEditingMode}
                  checkedChildren="编辑"
                  unCheckedChildren="查看"
                />
                {pendingChanges.size > 0 && (
                  <Badge count={pendingChanges.size} style={{ marginLeft: 8 }}>
                    <Text type="secondary">待保存更改</Text>
                  </Badge>
                )}
              </Space>
            </Col>
            <Col>
              <Space>
                {editingMode && pendingChanges.size > 0 && (
                  <>
                    <Button onClick={handleDiscardChanges}>
                      取消更改
                    </Button>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      loading={saving}
                      onClick={handleSaveChanges}
                    >
                      保存成绩 ({pendingChanges.size})
                    </Button>
                  </>
                )}
                <Button
                  icon={<BarChartOutlined />}
                  onClick={() => {
                    const statisticsElement = document.getElementById('exam-statistics');
                    if (statisticsElement) {
                      statisticsElement.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  查看分析
                </Button>
                <Button
                  icon={<TagsOutlined />}
                  onClick={() => setTagManagerVisible(true)}
                >
                  管理标签
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 搜索和筛选控制区 */}
        <Card size="small" style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={8} md={6}>
              <Space direction="vertical" size={0} style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>学生搜索</Text>
                <Input
                  placeholder="搜索学生姓名"
                  prefix={<SearchOutlined />}
                  value={studentSearchText}
                  onChange={(e) => setStudentSearchText(e.target.value)}
                  allowClear
                />
              </Space>
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Space direction="vertical" size={0} style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>科目筛选</Text>
                <Select
                  style={{ width: '100%' }}
                  value={selectedSubjectFilter}
                  onChange={setSelectedSubjectFilter}
                >
                  <Option value="all">全部科目</Option>
                  {(processedData?.subjects || []).map(subject => (
                    <Option key={subject} value={subject}>
                      {subjectLabels[subject] || subject}
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
            <Col xs={24} sm={8} md={6}>
              <Space direction="vertical" size={0} style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>快速操作</Text>
                <Space>
                  <Button
                    size="small"
                    onClick={() => {
                      setStudentSearchText('');
                      setSelectedSubjectFilter('all');
                    }}
                  >
                    清除筛选
                  </Button>
                  <Button
                    size="small"
                    icon={<BarChartOutlined />}
                    onClick={() => {
                      const statsElement = document.getElementById('subject-statistics');
                      if (statsElement) {
                        statsElement.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                  >
                    查看统计
                  </Button>
                </Space>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 成绩录入表格 */}
        <Card
          title={
            <Space>
              <FileTextOutlined />
              <span>成绩录入 & 表现词条</span>
              <Badge count={studentScores.filter(student =>
                student.student.name.toLowerCase().includes(studentSearchText.toLowerCase())
              ).length} />
            </Space>
          }
          size="small"
        >


          <Table
            dataSource={studentScores.filter(student =>
              student.student.name.toLowerCase().includes(studentSearchText.toLowerCase())
            )}
            columns={getTableColumns()}
            rowKey="enrollmentId"
            size="small"
            scroll={{ x: 1000 }}
            pagination={{
              pageSize: 20,
              showSizeChanger: !isMobile,
              showQuickJumper: !isMobile,
              showTotal: (total, range) =>
                `第 ${range[0]}-${range[1]} 条，共 ${total} 名学生`
            }}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <Text strong>统计</Text>
                </Table.Summary.Cell>
                {(processedData?.subjects || []).map((subject, index) => (
                  <Table.Summary.Cell key={subject} index={index + 1}>
                    <Space direction="vertical" size="small" style={{ textAlign: 'center', width: '100%' }}>
                      <Text style={{ fontSize: '12px' }}>
                        平均：{processedData?.subjectStats[subject]?.average || 0}
                      </Text>
                      <Text style={{ fontSize: '12px' }}>
                        最高：{processedData?.subjectStats[subject]?.highest || 0}
                      </Text>
                    </Space>
                  </Table.Summary.Cell>
                ))}
                {!editingMode && <Table.Summary.Cell index={-1} />}
              </Table.Summary.Row>
            )}
          />
        </Card>

        {/* 科目统计 */}
        <Card
          id="subject-statistics"
          title={
            <Space>
              <BarChartOutlined />
              <span>科目统计</span>
            </Space>
          }
          size="small"
        >
          <Row gutter={[16, 16]}>
            {Object.entries(processedData?.subjectStats || {}).map(([subject, stats]) => (
              <Col xs={24} sm={12} md={8} lg={6} key={subject}>
                <Card
                  size="small"
                  hoverable
                  style={{
                    background: themeStyles.cardBackground,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => navigate(`/student-log/exam-subject/${examId}/${subject}`, {
                    state: { from: `/student-log/exam/${examId}` }
                  })}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space>
                      <Text strong style={{ color: themeStyles.primaryColor }}>
                        {subjectLabels[subject] || subject}
                      </Text>
                      <BarChartOutlined style={{ color: themeStyles.textSecondary }} />
                    </Space>
                    <Row gutter={8}>
                      <Col span={12}>
                        <Statistic
                          title="平均分"
                          value={stats.average}
                          precision={1}
                          valueStyle={{ fontSize: '16px' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="最高分"
                          value={stats.highest}
                          valueStyle={{ fontSize: '16px', color: themeStyles.successColor }}
                        />
                      </Col>
                    </Row>
                    <Progress
                      percent={Math.round((stats.recordedScores / stats.totalStudents) * 100)}
                      size="small"
                      format={(percent) => `录入率 ${percent}%`}
                    />
                    <Text type="secondary" style={{ fontSize: '12px', textAlign: 'center' }}>
                      点击查看详细分析 →
                    </Text>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        {/* 统计分析 */}
        <Card
          id="exam-statistics"
          title={
            <Space>
              <BarChartOutlined />
              <span>统计分析</span>
            </Space>
          }
          size="small"
        >
          {renderStatistics()}
        </Card>
      </Space>

      {/* 标签管理Modal */}
      <ExamTagManagerModal
        visible={tagManagerVisible}
        onClose={() => setTagManagerVisible(false)}
        onTagsUpdated={() => {
          // 重新加载标签数据
          loadExamData();
        }}
      />
    </div>
  );
};

export default ExamDetailPage;