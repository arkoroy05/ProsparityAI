import React from 'react';

export function Spinner({ size = 'md', className, ...props }) {
  const sizeMap = {
    sm: '1rem',
    md: '2rem',
    lg: '3rem',
    xl: '4rem'
  };
  
  const spinnerStyles = {
    border: '4px solid rgba(0, 0, 0, 0.1)',
    borderLeftColor: '#0090ff',
    borderRadius: '50%',
    width: sizeMap[size] || size,
    height: sizeMap[size] || size,
    animation: 'spin 1s linear infinite',
  };
  
  return (
    <div 
      className={className} 
      style={{...spinnerStyles, ...props.style}} 
      {...props} 
    />
  );
} 