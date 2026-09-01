import React from 'react';
import { CopilotChat } from '../components/copilot/CopilotChat';

export const CopilotPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <CopilotChat />
    </div>
  );
};
