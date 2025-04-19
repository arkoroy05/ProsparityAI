import React from 'react';

export function Container({ children, maxW = '1200px', className, ...props }) {
  const containerStyles = {
    width: '100%',
    maxWidth: maxW === 'container.xl' ? '1200px' : maxW,
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingLeft: '1rem',
    paddingRight: '1rem',
  };
  
  return (
    <div className={className} style={{...containerStyles, ...props.style}} {...props}>
      {children}
    </div>
  );
} 