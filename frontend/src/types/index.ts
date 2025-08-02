// 统一导出所有类型定义

// API相关类型
export * from './api';

// 组件相关类型 (可以在这里添加组件特有的类型)
export interface BaseComponentProps {
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export interface PageProps extends BaseComponentProps {
  title?: string;
}

// 主题相关类型
export type ThemeMode = 'light' | 'dark';

// 表单相关类型
export interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'date' | 'select' | 'textarea';
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: any }[];
  rules?: any[];
}

// 响应式断点类型
export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

// 通用状态类型
export interface AsyncState<T = any> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// 分页相关类型
export interface PaginationConfig {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: (total: number, range: [number, number]) => string;
}

// 表格列配置类型 (基于Ant Design)
export interface TableColumnConfig<T = any> {
  title: string;
  dataIndex: keyof T;
  key: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  sorter?: boolean | ((a: T, b: T) => number);
  filter?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
}

// 模态框相关类型
export interface ModalConfig {
  title: string;
  width?: number | string;
  maskClosable?: boolean;
  destroyOnClose?: boolean;
  footer?: React.ReactNode | null;
}

// 通知消息类型
export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface NotificationConfig {
  type: NotificationType;
  message: string;
  description?: string;
  duration?: number;
} 