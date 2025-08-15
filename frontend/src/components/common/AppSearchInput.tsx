import React from 'react';
import { Input } from 'antd';
import { SearchOutlined, LoadingOutlined } from '@ant-design/icons';

export interface AppSearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  size?: 'small' | 'middle' | 'large';
  allowClear?: boolean;
  style?: React.CSSProperties;
  loading?: boolean;
}

const AppSearchInput: React.FC<AppSearchInputProps> = ({
  value,
  onChange,
  onSearch,
  placeholder,
  size = 'large',
  allowClear = true,
  style,
  loading,
}) => {
  const handlePressEnter = () => {
    if (onSearch) onSearch(value ?? '');
  };

  const handleIconClick = () => {
    if (onSearch) onSearch(value ?? '');
  };

  return (
    <Input
      className="app-search-input"
      placeholder={placeholder}
      value={value}
      allowClear={allowClear}
      size={size as any}
      onChange={(e) => onChange?.(e.target.value)}
      onPressEnter={handlePressEnter}
      suffix={loading ? (
        <LoadingOutlined />
      ) : (
        <SearchOutlined onClick={handleIconClick} style={{ color: 'var(--ant-color-primary)', cursor: onSearch ? 'pointer' : 'default' }} />
      )}
      style={style}
    />
  );
};

export default AppSearchInput;

