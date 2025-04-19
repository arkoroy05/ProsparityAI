import React from 'react';

export function Container({ children, maxW, ...props }) {
  return (
    <div 
      style={{
        width: '100%',
        maxWidth: maxW === 'container.xl' ? '1200px' : (maxW || '1200px'),
        marginLeft: 'auto',
        marginRight: 'auto',
        paddingLeft: '1rem',
        paddingRight: '1rem',
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  );
} 