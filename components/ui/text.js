import React from 'react';

export function Text({ children, className, ...props }) {
  return (
    <p className={className} {...props}>
      {children}
    </p>
  );
} 