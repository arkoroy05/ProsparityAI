import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Get the current authenticated user
export async function getUser() {
  const supabase = createServerActionClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  
  return {
    user: session?.user || null,
    session
  };
}

// Require authentication to access a route
export async function requireAuth() {
  const { user, session } = await getUser();
  
  if (!user) {
    // Redirect to login if not authenticated
    return {
      redirect: true,
      redirectTo: '/auth/login'
    };
  }
  
  // Check if user has a company
  const supabase = createServerActionClient({ cookies });
  const { data: companies } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1);
  
  if (!companies || companies.length === 0) {
    // Redirect to company registration if no company found
    return {
      redirect: true,
      redirectTo: '/auth/register-company'
    };
  }
  
  // User is authenticated and has a company
  return {
    user,
    session,
    companyId: companies[0].id,
    redirect: false
  };
}

// Check if a user is authenticated and get their info
export async function getCurrentUser() {
  const supabase = createServerActionClient({ cookies });
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      return { user: null, isLoggedIn: false };
    }
    
    const { user } = session;
    
    return {
      user,
      isLoggedIn: true
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { user: null, isLoggedIn: false };
  }
} 