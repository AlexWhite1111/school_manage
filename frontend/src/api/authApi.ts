import apiClient from '@/lib/apiClient';

// 登录响应类型
export interface LoginResponse {
  token: string;
}

// 用户角色枚举
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  MANAGER = 'MANAGER', 
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT'
}

// 用户信息类型
export interface User {
  id: number;
  uuid: string;
  username: string;
  displayName?: string; // 显示名称：学生显示真实姓名，其他显示用户名
  email?: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  linkedCustomerId?: number;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 登录请求类型
export interface LoginRequest {
  username: string;
  password: string;
}

// 更新用户信息请求类型
export interface UpdateUserRequest {
  username?: string;
  displayName?: string;
  email?: string;
  phone?: string;
}

// 修改密码请求类型
export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

// 注册用户请求类型
export interface RegisterUserRequest {
  username: string;
  password: string;
  email?: string;
  phone?: string;
  role: UserRole;
  linkedCustomerId?: number;
}

// 忘记密码请求类型
export interface ForgotPasswordRequest {
  identifier: string; // 用户名或邮箱
}

// 重置密码请求类型
export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
}

/**
 * 用户登录
 * @route POST /auth/login
 */
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
  return response.data;
};

/**
 * 用户登出
 * @route POST /auth/logout
 */
export const logout = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
};

/**
 * 获取当前用户信息
 * @route GET /users/me
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<User>('/users/me');
  return response.data;
};

/**
 * 更新当前用户信息
 * @route PUT /users/me
 */
export const updateUserInfo = async (data: UpdateUserRequest): Promise<User> => {
  const response = await apiClient.put<User>('/users/me', data);
  return response.data;
};

/**
 * 修改当前用户密码
 * @route PUT /users/me/password
 */
export const changePassword = async (data: ChangePasswordRequest): Promise<void> => {
  await apiClient.put('/users/me/password', data);
};

/**
 * 注册新用户
 * @route POST /auth/register
 */
export const registerUser = async (data: RegisterUserRequest): Promise<User> => {
  const response = await apiClient.post<{ user: User }>('/auth/register', data);
  return response.data.user;
};

/**
 * 请求密码重置
 * @route POST /auth/forgot-password
 */
export const forgotPassword = async (data: ForgotPasswordRequest): Promise<{ resetToken: string }> => {
  const response = await apiClient.post<{ message: string; resetToken: string }>('/auth/forgot-password', data);
  return { resetToken: response.data.resetToken };
};

/**
 * 重置密码
 * @route POST /auth/reset-password
 */
export const resetPassword = async (data: ResetPasswordRequest): Promise<void> => {
  await apiClient.post('/auth/reset-password', data);
};

/**
 * 获取所有用户列表（仅供超级管理员）
 * @route GET /users
 */
export const getAllUsers = async (): Promise<User[]> => {
  const response = await apiClient.get<User[]>('/users');
  return response.data;
};

/**
 * 根据角色获取用户列表
 * @route GET /users/role/:role
 */
export const getUsersByRole = async (role: UserRole): Promise<User[]> => {
  const response = await apiClient.get<User[]>(`/users/role/${role}`);
  return response.data;
};

/**
 * 重置用户密码为默认密码
 * @route PUT /users/:id/reset-password
 */
export const resetUserPassword = async (userId: number): Promise<void> => {
  await apiClient.put(`/users/${userId}/reset-password`);
};

/**
 * 激活或停用用户账号
 * @route PUT /users/:id/toggle-active
 */
export const toggleUserActive = async (userId: number, isActive: boolean): Promise<User> => {
  const response = await apiClient.put<{ user: User }>(`/users/${userId}/toggle-active`, { isActive });
  return response.data.user;
};

/**
 * 更新用户角色
 * @route PUT /users/:id/role
 */
export const updateUserRole = async (userId: number, role: UserRole): Promise<User> => {
  const response = await apiClient.put<{ user: User }>(`/users/${userId}/role`, { role });
  return response.data.user;
}; 