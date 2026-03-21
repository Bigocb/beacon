import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  rightContent?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightContent,
}) => {
  return (
    <div className="page-header">
      <div className="page-header-content">
        <button className="page-back-button" onClick={onBack}>
          ← Back
        </button>
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {rightContent && <div className="page-header-right">{rightContent}</div>}
      </div>
    </div>
  );
};
