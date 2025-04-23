// UI Components barrel file
// Export card components
export { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from './card';
export { Button } from './button';
export { Badge } from './badge';
export { Avatar, AvatarImage, AvatarFallback } from './avatar';
export { Input } from './input';
export { Textarea } from './textarea';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

// These components don't exist yet, so we're creating simple implementations
export const Box = ({ children, ...props }) => {
  return <div {...props}>{children}</div>;
};

export const Text = ({ children, ...props }) => {
  return <p {...props}>{children}</p>;
};

export const Heading = ({ as = 'h2', children, ...props }) => {
  const Component = as;
  return <Component {...props}>{children}</Component>;
};

export const SimpleGrid = ({ children, columns, spacing, ...props }) => {
  return (
    <div 
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns?.base || 1}, 1fr)`,
        gap: typeof spacing === 'number' ? `${spacing * 0.25}rem` : spacing || '1rem',
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export const Container = ({ children, maxW, ...props }) => {
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
};

export const Spinner = ({ size = 'md', ...props }) => {
  const sizeMap = {
    sm: '1rem',
    md: '2rem',
    lg: '3rem',
    xl: '4rem'
  };
  
  return (
    <div 
      style={{
        border: '4px solid rgba(0, 0, 0, 0.1)',
        borderLeftColor: '#09f',
        borderRadius: '50%',
        width: sizeMap[size] || size,
        height: sizeMap[size] || size,
        animation: 'spin 1s linear infinite',
        ...props.style
      }}
      {...props}
    />
  );
};

export const Alert = ({ status, children, ...props }) => {
  const colors = {
    error: '#f56565',
    success: '#48bb78',
    warning: '#ed8936',
    info: '#4299e1'
  };
  
  return (
    <div 
      style={{
        padding: '0.75rem 1rem',
        borderRadius: '0.375rem',
        backgroundColor: colors[status] ? `${colors[status]}20` : '#4299e120',
        color: colors[status] || '#4299e1',
        display: 'flex',
        alignItems: 'center',
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export const AlertIcon = (props) => {
  return (
    <span 
      style={{
        marginRight: '0.5rem',
        ...props.style
      }}
      {...props}
    >
      ⚠️
    </span>
  );
};

export const Stack = ({ children, spacing, ...props }) => {
  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: typeof spacing === 'number' ? `${spacing * 0.25}rem` : spacing || '0.5rem',
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export const Flex = ({ children, ...props }) => {
  return (
    <div 
      style={{
        display: 'flex',
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export const Divider = (props) => {
  return (
    <hr 
      style={{
        borderTop: '1px solid #e2e8f0',
        margin: '1rem 0',
        ...props.style
      }}
      {...props}
    />
  );
};

export const FormControl = ({ children, ...props }) => {
  return (
    <div 
      style={{
        marginBottom: '1rem',
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export const FormLabel = ({ children, ...props }) => {
  return (
    <label 
      style={{
        fontWeight: '500',
        marginBottom: '0.25rem',
        display: 'block',
        ...props.style
      }}
      {...props}
    >
      {children}
    </label>
  );
};

export const IconButton = ({ icon, ...props }) => {
  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...props.style
      }}
      {...props}
    >
      {icon}
    </button>
  );
};

export const Tag = ({ children, ...props }) => {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.25rem 0.5rem',
        borderRadius: '0.375rem',
        fontSize: '0.875rem',
        fontWeight: '500',
        ...props.style
      }}
      {...props}
    >
      {children}
    </span>
  );
};

export const HStack = ({ children, spacing, ...props }) => {
  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: typeof spacing === 'number' ? `${spacing * 0.25}rem` : spacing || '0.5rem',
        ...props.style
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// Mock useToast hook
export function useToast() {
  return ({ title, description, status, duration, isClosable }) => {
    console.log(`Toast: ${title} - ${description}`);
  };
} 