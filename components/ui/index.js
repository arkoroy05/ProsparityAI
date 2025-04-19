// UI Components barrel file
// Export card components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { Input } from './input';
import { Textarea } from './textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

// These components don't exist yet, so we're creating simple implementations
import { Box } from './box';
import { Text } from './text';
import { Heading } from './heading';
import { SimpleGrid } from './simple-grid';
import { Container } from './container';
import { Spinner } from './spinner';
import { Alert, AlertIcon } from './alert';
import { Stack } from './stack';
import { Flex } from './flex';
import { Divider } from './divider';
import { FormControl } from './form-control';
import { FormLabel } from './form-label';
import { IconButton } from './icon-button';
import { Tag } from './tag';
import { HStack } from './h-stack';

// Export components with aliases for compatibility
export {
  // Tabs components
  Tabs,
  TabsContent as TabPanel,
  TabsList as TabList,
  TabsTrigger as Tab,
  // We'll create a wrapper for TabPanels since it's missing
  Tabs as TabPanels,
  
  // Card components
  Card,
  CardContent as CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  
  // Other components
  Alert,
  AlertIcon,
  Box,
  Container,
  Heading,
  SimpleGrid,
  Spinner,
  Text,
  Button,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Input,
  Textarea,
  Stack,
  Flex,
  Divider,
  FormControl,
  FormLabel,
  IconButton,
  Tag,
  HStack
};

// Mock useToast hook
export function useToast() {
  return ({ title, description, status, duration, isClosable }) => {
    console.log(`Toast: ${title} - ${description}`);
  };
} 