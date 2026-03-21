import React from 'react';

interface TabItem {
  id: string;
  label: string;
  icon?: string;
}

interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = '',
}) => {
  return (
    <div className={`page-tabs ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`page-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.icon && <span>{tab.icon} </span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
};

interface TabContentProps {
  children: React.ReactNode;
  className?: string;
}

export const TabContent: React.FC<TabContentProps> = ({ children, className = '' }) => {
  return <div className={`page-content ${className}`}>{children}</div>;
};
