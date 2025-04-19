import React from 'react';

export function SimpleGrid({ children, columns = 1, spacing = '1rem', className, ...props }) {
  const gridStyles = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: typeof spacing === 'number' ? `${spacing * 0.25}rem` : spacing,
  };
  
  return (
    <div className={className} style={{...gridStyles, ...props.style}} {...props}>
      {children}
    </div>
  );
} 