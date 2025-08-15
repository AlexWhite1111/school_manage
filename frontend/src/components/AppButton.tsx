import React from 'react';
import { Button, theme } from 'antd';
import type { ButtonProps as AntButtonProps } from 'antd';

export type ButtonHierarchy = 'primary' | 'secondary' | 'tertiary' | 'link';
export type ButtonTone = 'brand' | 'neutral' | 'success' | 'warning' | 'danger';
export type ButtonSize = 'lg' | 'md' | 'sm' | 'small' | 'middle' | 'large';

export interface AppButtonProps extends Omit<AntButtonProps, 'type' | 'size' | 'danger' | 'icon'> {
  hierarchy?: ButtonHierarchy;
  tone?: ButtonTone;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
  danger?: boolean;
  // Backward compat: accept legacy HTML native type via either htmlType or type
  type?: any;
}

export default function AppButton(props: AppButtonProps) {
  const { token } = theme.useToken();
  const {
    hierarchy = 'primary',
    tone = 'brand',
    size = 'md',
    icon,
    loading,
    danger,
    style,
    children,
    // pull out legacy props so they are not forwarded blindly
    type: legacyType,
    htmlType,
    ...rest
  } = props;

  // Normalize size supporting both our tokens and AntD sizes
  const antSize: AntButtonProps['size'] =
    size === 'lg' || size === 'large' ? 'large' : size === 'sm' || size === 'small' ? 'small' : 'middle';

  // Compute visual type with legacy fallback when user still passes type="text|link|..."
  const antType: AntButtonProps['type'] = (() => {
    if (legacyType === 'primary' || legacyType === 'default' || legacyType === 'dashed' || legacyType === 'text' || legacyType === 'link') {
      return legacyType as AntButtonProps['type'];
    }
    return hierarchy === 'primary' ? 'primary' : hierarchy === 'secondary' ? 'default' : hierarchy === 'tertiary' ? 'text' : 'link';
  })();

  const isDanger = danger || tone === 'danger';

  // Optional tone styling using tokens, while keeping AntD styles primary
  let styleOverrides: React.CSSProperties | undefined;
  if (!isDanger) {
    if (tone === 'success' && antType === 'primary') {
      styleOverrides = {
        backgroundColor: token.colorSuccess,
        borderColor: token.colorSuccess,
      };
    } else if (tone === 'warning' && antType === 'primary') {
      styleOverrides = {
        backgroundColor: token.colorWarning,
        borderColor: token.colorWarning,
      };
    } else if (tone === 'neutral' && antType === 'primary') {
      styleOverrides = {
        backgroundColor: token.colorTextSecondary,
        borderColor: token.colorTextSecondary,
      };
    }
  }

  return (
    <Button
      type={antType}
      size={antSize}
      icon={icon}
      loading={loading}
      danger={isDanger}
      htmlType={legacyType === 'submit' || legacyType === 'reset' || legacyType === 'button' ? legacyType : htmlType}
      style={{ ...styleOverrides, ...style }}
      {...rest}
    >
      {children}
    </Button>
  );
}

