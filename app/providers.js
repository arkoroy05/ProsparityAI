'use client';

import { AuthProvider } from '@/lib/auth';

export function Providers({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
} 