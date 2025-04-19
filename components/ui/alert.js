import React from 'react';

export function Alert({ status = 'info', children, className, ...props }) {
  const colors = {
    error: '#f56565',
    success: '#48bb78',
    warning: '#ed8936',
    info: '#4299e1'
  };
  
  const alertStyles = {
    padding: '0.75rem 1rem',
    borderRadius: '0.375rem',
    backgroundColor: colors[status] ? `${colors[status]}20` : '#4299e120',
    color: colors[status] || '#4299e1',
    display: 'flex',
    alignItems: 'center',
  };
  
  return (
    <div 
      className={className} 
      style={{...alertStyles, ...props.style}} 
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertIcon({ className, ...props }) {
  const iconStyles = {
    marginRight: '0.5rem',
  };
  
  return (
    <span 
      className={className} 
      style={{...iconStyles, ...props.style}} 
      {...props}
    >
      ⚠️
    </span>
  );
} 