import React from 'react';

interface LoadingSkeletonProps {
  height?: number | string;
  width?: number | string;
  borderRadius?: number | string;
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  height = 40,
  width = '100%',
  borderRadius = 'var(--radius-md)',
  count = 1,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="skeleton"
          style={{
            height,
            width,
            borderRadius,
          }}
        />
      ))}
    </div>
  );
};
