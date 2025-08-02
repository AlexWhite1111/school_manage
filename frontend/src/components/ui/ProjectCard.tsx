import React from 'react';
import { Card, CardProps } from 'antd';

export interface ProjectCardProps extends Omit<CardProps, 'children'> {
  children: React.ReactNode;
  loading?: boolean;
  clickable?: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ 
  children, 
  loading = false, 
  clickable = false,
  style,
  className,
  ...cardProps 
}) => {
  const cardStyle: React.CSSProperties = {
    borderRadius: '12px',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
    // 🚀 性能优化：只过渡需要的属性，避免transition: all
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    cursor: clickable ? 'pointer' : 'default',
    // 启用硬件加速
    willChange: clickable ? 'transform, box-shadow' : 'auto',
    ...style,
  };

  const hoverStyle: React.CSSProperties = clickable ? {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  } : {};

  return (
    <Card
      loading={loading}
      variant="outlined"
      style={cardStyle}
      className={className}
      onMouseEnter={(e) => {
        if (clickable) {
          Object.assign(e.currentTarget.style, hoverStyle);
        }
      }}
      onMouseLeave={(e) => {
        if (clickable) {
          Object.assign(e.currentTarget.style, cardStyle);
        }
      }}
      {...cardProps}
    >
      {children}
    </Card>
  );
};

export default ProjectCard; 