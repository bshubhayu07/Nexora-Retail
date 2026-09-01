import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, action }) => {
  return (
    <div className="flex-between" style={{ marginBottom: 'var(--space-md)' }}>
      <div>
        <h2 className="text-h1">{title}</h2>
        {description && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};
