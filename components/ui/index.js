// UI Components barrel file
// Export card components
export { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from './card';
export { Button } from './button';
export { Badge } from './badge';
export { Avatar, AvatarImage, AvatarFallback } from './avatar';
export { Input } from './input';
export { Textarea } from './textarea';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './table';
export { Skeleton } from './skeleton';
export {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from './toast';
export { useToast, toast } from './use-toast';
export { Alert, AlertTitle, AlertDescription } from './alert';
export { Popover, PopoverTrigger, PopoverContent } from './popover';

// Utility components using Tailwind classes
export const Box = ({ children, className, ...props }) => {
  return <div className={className} {...props}>{children}</div>;
};

export const Text = ({ children, className, ...props }) => {
  return <p className={cn("text-sm text-gray-400", className)} {...props}>{children}</p>;
};

export const Heading = ({ as: Component = 'h2', className, children, ...props }) => {
  return <Component className={cn("font-semibold tracking-tight", className)} {...props}>{children}</Component>;
};

export const SimpleGrid = ({ children, columns = 1, className, ...props }) => {
  return (
    <div
      className={cn(
        "grid",
        `grid-cols-${columns}`,
        "gap-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const Container = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        "w-full mx-auto px-4 max-w-7xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const Spinner = ({ className, ...props }) => {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-4 border-gray-800 border-l-purple-500",
        className
      )}
      {...props}
    />
  );
};