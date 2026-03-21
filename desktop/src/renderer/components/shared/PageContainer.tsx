import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  fullScreen?: boolean;
  className?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  fullScreen = false,
  className = '',
}) => {
  return (
    <div className={`page-container ${fullScreen ? 'page-container--full-screen' : ''} ${className}`}>
      {children}
    </div>
  );
};

interface ContentSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const ContentSection: React.FC<ContentSectionProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`content-section ${className}`}>
      {title && <h2 className="content-section-title">{title}</h2>}
      {children}
    </div>
  );
};
