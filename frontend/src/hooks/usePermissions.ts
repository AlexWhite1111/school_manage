import { useAuth } from './useAuth';
import { UserRole } from '@/api/authApi';

/**
 * 权限控制Hook
 * 提供基于角色的权限检查功能
 */
export const usePermissions = () => {
  const { user } = useAuth();

  /**
   * 检查当前用户是否具有指定角色之一
   */
  const hasAnyRole = (allowedRoles: UserRole[]): boolean => {
    if (!user || !user.role) return false;
    return allowedRoles.includes(user.role);
  };

  /**
   * 检查当前用户是否具有指定角色
   */
  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  /**
   * 检查是否为超级管理员
   */
  const isSuperAdmin = (): boolean => {
    return hasRole(UserRole.SUPER_ADMIN);
  };

  /**
   * 检查是否为管理员或以上权限
   */
  const isManagerOrAbove = (): boolean => {
    return hasAnyRole([UserRole.SUPER_ADMIN, UserRole.MANAGER]);
  };

  /**
   * 检查是否为教师或以上权限
   */
  const isTeacherOrAbove = (): boolean => {
    return hasAnyRole([UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.TEACHER]);
  };

  /**
   * 检查是否为学生
   */
  const isStudent = (): boolean => {
    return hasRole(UserRole.STUDENT);
  };

  /**
   * 获取用户角色的中文显示名称
   */
  const getRoleDisplayName = (role?: UserRole): string => {
    if (!role) return '未知';
    
    const roleNames = {
      [UserRole.SUPER_ADMIN]: '超级管理员',
      [UserRole.MANAGER]: '管理员',
      [UserRole.TEACHER]: '教师',
      [UserRole.STUDENT]: '学生'
    };

    return roleNames[role] || '未知';
  };

  /**
   * 获取当前用户角色的显示名称
   */
  const getCurrentRoleDisplayName = (): string => {
    return getRoleDisplayName(user?.role);
  };

  /**
   * 检查是否可以访问指定页面
   */
  const canAccessPage = (page: string): boolean => {
    if (!user || !user.role) return false;

    // 学生角色特殊处理：只能访问自己的成长报告页面
    if (user.role === UserRole.STUDENT) {
      // 检查是否为学生专属报告页面
      if (page.startsWith('/student-log/report/')) {
        const studentId = page.split('/student-log/report/')[1];
        return studentId === user.username; // 使用username（学号）进行匹配
      }
      
      // 学生只能访问仪表盘和个人资料
      return page === '/dashboard' || page === '/profile';
    }

    // 页面权限配置（非学生用户）
    const pagePermissions: Record<string, UserRole[]> = {
      // 所有登录用户都可以访问
      '/dashboard': [UserRole.SUPER_ADMIN, UserRole.MANAGER],
      '/profile': [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.TEACHER],
      
      // 管理员及以上可访问
      '/crm': [UserRole.SUPER_ADMIN, UserRole.MANAGER],
      '/finance': [UserRole.SUPER_ADMIN, UserRole.MANAGER],
      '/reports': [UserRole.SUPER_ADMIN, UserRole.MANAGER],
      
      // 教师及以上可访问
      '/student-log': [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.TEACHER],
      
      // 仅超级管理员可访问
      '/settings': [UserRole.SUPER_ADMIN]
    };

    // 检查动态路径：学生成长报告页面（非学生用户也可以访问）
    if (page.startsWith('/student-log/report/')) {
      return [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.TEACHER].includes(user.role);
    }

    const allowedRoles = pagePermissions[page];
    if (!allowedRoles) return false;

    return allowedRoles.includes(user.role);
  };

  /**
   * 获取基于角色的导航菜单
   */
  const getMenuItems = () => {
    if (!user) return [];

    const allMenuItems = [
      {
        key: 'dashboard',
        label: '核心仪表盘',
        path: '/dashboard',
        roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER]
      },
      {
        key: 'crm',
        label: '客户管理',
        path: '/crm',
        roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER]
      },
      {
        key: 'finance',
        label: '财务中心',
        path: '/finance',
        roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER]
      },
      {
        key: 'student-log',
        label: '学生成长',
        path: '/student-log',
        roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.TEACHER]
      },
      {
        key: 'reports',
        label: '数据报告',
        path: '/reports',
        roles: [UserRole.SUPER_ADMIN, UserRole.MANAGER]
      },
      {
        key: 'settings',
        label: '系统设置',
        path: '/settings',
        roles: [UserRole.SUPER_ADMIN]
      }
    ];

    // 学生用户特殊处理：只显示个人成长页面
    if (user.role === UserRole.STUDENT) {
      return [
        {
          key: 'student-report',
          label: '我的成长报告',
          path: `/student-log/report/${user.username}`, // 使用username作为学号
          roles: [UserRole.STUDENT]
        }
      ];
    }

    // 过滤出当前用户角色可访问的菜单项
    return allMenuItems.filter(item => item.roles.includes(user.role));
  };

  return {
    user,
    hasRole,
    hasAnyRole,
    isSuperAdmin,
    isManagerOrAbove,
    isTeacherOrAbove,
    isStudent,
    getRoleDisplayName,
    getCurrentRoleDisplayName,
    canAccessPage,
    getMenuItems
  };
}; 