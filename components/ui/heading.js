import React from 'react';

export function Heading({ as = 'h2', children, className, ...props }) {
  const Component = as;
  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
} 