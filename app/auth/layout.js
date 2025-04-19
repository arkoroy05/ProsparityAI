"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export default function AuthLayout({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // User is already authenticated, check if they have a company
          const { data: companies, error } = await supabase
            .from('companies')
            .select('id')
            .eq('owner_id', session.user.id)
            .limit(1);
          
          if (error) throw error;
          
          // If user has a company and is on register-company page, redirect to dashboard
          if (companies && companies.length > 0 && window.location.pathname === '/auth/register-company') {
            router.push('/dashboard');
          }
          // If user has no company and is not on register-company page, redirect to register-company
          else if ((!companies || companies.length === 0) && window.location.pathname !== '/auth/register-company') {
            router.push('/auth/register-company');
          }
          // If user is on login or register page and already authenticated, redirect to dashboard
          else if (['/auth/login', '/auth/register'].includes(window.location.pathname)) {
            router.push('/dashboard');
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Auth layout error:', error);
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black">
      <div className="flex flex-1 flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-[#b4f] hover:text-[#b4f]/80 transition-colors">Prosparity.AI</span>
            </Link>
            <div className="mt-6 bg-black/50 backdrop-blur-sm border border-[#b4f]/20 rounded-lg shadow-[0_0_15px_rgba(187,68,255,0.1)] p-8">
              {children}
            </div>
          </div>
        </div>
      </div>
      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-black via-[#300] to-[#606]">
          <div className="absolute inset-0 opacity-70 mix-blend-overlay bg-[radial-gradient(circle_at_center,_#b4f_0%,_transparent_50%)]"></div>
          <div className="absolute inset-0 flex items-center justify-center p-12">
            <div className="max-w-2xl text-center text-[#e2b3ff]">
              <div className="mb-8 flex justify-center">
                <Image
                  src="/globe"
                  alt="AI Sales Assistant" 
                  width={128}
                  height={128}
                  className="opacity-90 drop-shadow-[0_0_15px_rgba(187,68,255,0.5)]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}