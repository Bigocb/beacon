import React from 'react';

interface MetadataItemProps {
  label: string;
  value: React.ReactNode;
  isMonospace?: boolean;
  isClickable?: boolean;
  onClick?: () => void;
  title?: string;
}

export const MetadataItem: React.FC<MetadataItemProps> = ({
  label,
  value,
  isMonospace = false,
  isClickable = false,
  onClick,
  title,
}) => {
  return (
    <div
      className={`metadata-item ${isClickable ? 'clickable' : ''}`}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      title={title}
    >
      <span className="metadata-label">{label}</span>
      <span className={`metadata-value ${isMonospace ? 'monospace' : ''}`}>
        {value}
      </span>
    </div>
  );
};

interface MetadataGridProps {
  children: React.ReactNode;
  className?: string;
}

export const MetadataGrid: React.FC<MetadataGridProps> = ({ children, className = '' }) => {
  return <div className={`metadata-grid ${className}`}>{children}</div>;
};

interface MetadataSectionProps {
  children: React.ReactNode;
  className?: string;
}

export const MetadataSection: React.FC<MetadataSectionProps> = ({ children, className = '' }) => {
  return <div className={`metadata-section ${className}`}>{children}</div>;
};
