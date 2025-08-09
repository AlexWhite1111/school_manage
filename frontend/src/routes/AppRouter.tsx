import React from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import AppLayout from '@/components/layout/AppLayout';
import PageLoader from '@/components/ui/PageLoader';

// 页面组件 - 使用实际存在的文件
import LoginPage from '@/features/auth/LoginPage';
import RegisterPage from '@/features/auth/RegisterPage';
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/features/auth/ResetPasswordPage';
import DashboardPage from '@/features/dashboard/DashboardPage';
import CrmPage from '@/features/crm/CrmPage';
import CrmDetailPage from '@/pages/CrmDetailPage';
import ProfilePage from '@/features/auth/ProfilePage';

// 财务模块组件
import FinancePage from '@/features/finance/FinancePage';
import FinanceDetailPage from '@/pages/FinanceDetailPage';

// 学生日志模块组件
import StudentLogMainPage from '@/features/student-log/StudentLogPage';
import StudentListView from '@/features/student-log/components/StudentListView';
import ExamDetailPage from '@/pages/ExamDetailPage';

// 数据分析模块组件
import AnalyticsPage from '@/features/analytics/AnalyticsPage';
import SubjectTrendPage from '@/pages/SubjectTrendPage';
import ExamSubjectDetailPage from '@/pages/ExamSubjectDetailPage';
import StudentTrendPage from '@/pages/StudentTrendPage';

// 成长分析模块组件 - 已合并到AllInOneStudentReport

// 统一成长报告组件 - 已合并到AllInOneStudentReport

// 系统设置页面
import SystemSettingsPage from '@/features/settings/SystemSettingsPage';

// Showcase页面（已移除路由，避免演示页在生产环境暴露）

// ✅ REMOVED: UnifiedGrowthTestPage - test page no longer needed

// All-in-One学生报告组件
import AllInOneStudentReport from '@/components/AllInOneStudentReport';

// 路由包装器组件
const AllInOneStudentReportWrapper: React.FC = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  
  if (!publicId) {
    return <div>参数错误：缺少学生ID</div>;
  }
  
  return (
    <AllInOneStudentReport 
      publicId={publicId}
      onBack={() => navigate(-1)}
    />
  );
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPage?: string; // 可选的页面权限检查
}

interface PublicRouteProps {
  children: React.ReactNode;
}

// 占位符页面组件
const PlaceholderPage: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div style={{ 
    padding: '24px', 
    textAlign: 'center',
    background: 'var(--ant-color-bg-container)',
    borderRadius: '12px',
    minHeight: '400px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  }}>
    <h2 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--ant-color-text)' }}>{title}</h2>
    <p style={{ fontSize: '16px', color: 'var(--ant-color-text-secondary)' }}>{description}</p>
  </div>
);

// 保护路由：需要登录和权限才能访问
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPage }) => {
  // ✅ 所有Hooks必须在组件顶部调用
  const { isAuthenticated, isLoading, isInitialized } = useAuth();
  const { canAccessPage, user } = usePermissions();
  
  // ✅ 条件渲染放在Hooks之后
  if (!isInitialized || isLoading) {
    return <PageLoader fullScreen />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 动态计算无权限时的回退路径
  const getFallbackPath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'TEACHER':
        return '/student-log';
      case 'STUDENT':
        return `/student-log/report/${user.username}`;
      default:
        return '/dashboard';
    }
  };

  // 如果指定了页面权限要求，检查权限
  if (requiredPage && !canAccessPage(requiredPage)) {
    console.log('🚫 权限检查失败，重定向到fallback:', { requiredPage, fallbackPath: getFallbackPath() });
    return <Navigate to={getFallbackPath()} replace />;
  }
  
  return <AppLayout>{children}</AppLayout>;
};

// 公开路由：已登录用户重定向到首页
const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, user, isLoading, isInitialized } = useAuth();
  if (!isInitialized || isLoading) {
    return <PageLoader fullScreen />;
  }

  if (isAuthenticated && user) {
    let redirectPath = '/dashboard';
    switch (user.role) {
      case 'STUDENT':
        redirectPath = `/student-log/report/${user.username}`;
        break;
      case 'TEACHER':
        redirectPath = '/student-log';
        break;
      default:
        redirectPath = '/dashboard';
    }
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* 公开路由 */}
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={
        <PublicRoute>
          <ForgotPasswordPage />
        </PublicRoute>
      } />
      <Route path="/reset-password" element={
        <PublicRoute>
          <ResetPasswordPage />
        </PublicRoute>
      } />
      
      {/* Showcase路由已移除 */}
      
      {/* 统一成长报告测试页面 */}
      {/* ✅ REMOVED: /test/unified-growth route - test page deleted */}
      
      {/* 保护路由 */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={
        <ProtectedRoute requiredPage="/dashboard">
          <DashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/crm" element={
        <ProtectedRoute requiredPage="/crm">
          <CrmPage />
        </ProtectedRoute>
      } />
      <Route path="/crm/new" element={
        <ProtectedRoute requiredPage="/crm">
          <CrmDetailPage />
        </ProtectedRoute>
      } />
      <Route path="/crm/:publicId" element={
        <ProtectedRoute requiredPage="/crm">
          <CrmDetailPage />
        </ProtectedRoute>
      } />
      
      {/* 财务模块路由 */}
      <Route path="/finance" element={
        <ProtectedRoute requiredPage="/finance">
          <FinancePage />
        </ProtectedRoute>
      } />
      <Route path="/finance/students/:publicId" element={
        <ProtectedRoute requiredPage="/finance">
          <FinanceDetailPage />
        </ProtectedRoute>
      } />
      
      {/* 学生日志模块路由 */}
      <Route path="/student-log" element={
        <ProtectedRoute requiredPage="/student-log">
          <StudentLogMainPage />
        </ProtectedRoute>
      } />
      <Route path="/student-log/analytics" element={
        <ProtectedRoute requiredPage="/student-log">
          <StudentListView title="数据追踪 - 学生列表" />
        </ProtectedRoute>
      } />
      <Route path="/student-log/report/:publicId" element={
        <ProtectedRoute>
          <AllInOneStudentReportWrapper />
        </ProtectedRoute>
      } />
      <Route path="/student-log/exam/:examId" element={
        <ProtectedRoute requiredPage="/student-log">
          <ExamDetailPage />
        </ProtectedRoute>
      } />
      {/* 考试科目详情页面 - 移到student-log下 */}
      <Route path="/student-log/exam-subject/:examId/:subject" element={
        <ProtectedRoute>
          <ExamSubjectDetailPage />
        </ProtectedRoute>
      } />
      {/* 学生考试科目趋势页面 - 使用正确的URL结构 */}
      <Route path="/student-log/exam-subject/:examId/:subject/:publicId" element={
        <ProtectedRoute>
          <StudentTrendPage />
        </ProtectedRoute>
      } />
      
      {/* 学生成长报告页面 - 已合并到 /student-log/report/:publicId */}
      
      {/* =================================== */}
      {/* ✅ 统一学生成长报告 - 唯一入口 */}
      {/* 合并了所有原来的三个页面功能 */}
      {/* =================================== */}
      <Route path="/profile" element={
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute requiredPage="/reports">
          <AnalyticsPage />
        </ProtectedRoute>
      } />
      <Route path="/analytics" element={
        <ProtectedRoute requiredPage="/analytics">
          <AnalyticsPage />
        </ProtectedRoute>
      } />
      <Route path="/subject-trend/:classId/:subject" element={
        <ProtectedRoute requiredPage="/analytics">
          <SubjectTrendPage />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute requiredPage="/settings">
          <SystemSettingsPage />
        </ProtectedRoute>
      } />
      
      {/* 404页面 */}
      <Route path="*" element={
        <div style={{ 
          padding: '24px', 
          textAlign: 'center', 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          background: 'var(--ant-color-bg-layout)'
        }}>
          <h1 style={{ color: 'var(--ant-color-text)' }}>404 - 页面未找到</h1>
          <p style={{ color: 'var(--ant-color-text-secondary)' }}>抱歉，您访问的页面不存在。</p>
        </div>
      } />
    </Routes>
  );
};

export default AppRouter; 