import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import '../styles/globals.css';

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState(null);

  // Check if the component has a custom layout
  const getLayout = Component.getLayout || ((page) => page);

  useEffect(() => {
    // Get current session and set up auth state listener
    const initAuth = async () => {
      try {
        // Check current session
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
        
        // Listen for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            setUser(session?.user || null);
            
            // Handle sign in
            if (event === 'SIGNED_IN' && session) {
              // Check if user has a company
              await checkUserCompany(session.user.id);
            }
            
            // Handle sign out
            if (event === 'SIGNED_OUT') {
              setCompanyId(null);
              // Redirect to home if not already there
              if (router.pathname !== '/') {
                router.push('/');
              }
            }
          }
        );
        
        // If user is logged in, check if they have a company
        if (session?.user) {
          await checkUserCompany(session.user.id);
        }
        
        setLoading(false);
        
        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
      }
    };
    
    initAuth();
  }, [router]);

  // Check if user has a company
  const checkUserCompany = async (userId) => {
    try {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', userId)
        .limit(1);
      
      if (error) throw error;
      
      if (companies && companies.length > 0) {
        // User has a company
        setCompanyId(companies[0].id);
        
        // If at login/register page, redirect to dashboard
        if (['/auth/login', '/auth/register'].includes(router.pathname)) {
          router.push('/dashboard');
        }
      } else {
        // User doesn't have a company
        setCompanyId(null);
        
        // If at protected route, redirect to company registration
        if (router.pathname !== '/auth/register-company' && router.pathname !== '/auth/login' && router.pathname !== '/auth/register' && router.pathname !== '/') {
          router.push('/auth/register-company');
        }
      }
    } catch (error) {
      console.error('Error checking user company:', error);
    }
  };

  // Enhanced pageProps with auth and company data
  const enhancedPageProps = {
    ...pageProps,
    user,
    companyId,
  };

  // Public routes that don't require auth
  const publicRoutes = ['/', '/auth/login', '/auth/register'];
  const isPublicRoute = publicRoutes.includes(router.pathname);

  // Auth routes that require user but not company
  const authRoutes = ['/auth/register-company'];
  const isAuthRoute = authRoutes.includes(router.pathname);

  // Handle protected routes
  if (!loading && !isPublicRoute) {
    // If not logged in and trying to access protected route
    if (!user && !isPublicRoute) {
      router.push('/auth/login');
      return <div className="flex items-center justify-center min-h-screen">Redirecting to login...</div>;
    }
    
    // If logged in but no company and trying to access company-required route
    if (user && !companyId && !isAuthRoute) {
      router.push('/auth/register-company');
      return <div className="flex items-center justify-center min-h-screen">Redirecting to company registration...</div>;
    }
  }

  // Show loading state
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Render the page with its layout
  return getLayout(<Component {...enhancedPageProps} />);
} 