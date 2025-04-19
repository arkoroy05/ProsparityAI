import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [loading, setLoading] = useState(true);

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
  }, []);

  // Check if user has a company
  const checkUserCompany = async (userId) => {
    try {
      if (!userId) {
        console.error('No user ID provided to checkUserCompany');
        setCompanyId(null);
        return;
      }

      console.log('Checking company for user:', userId);
      
      // First check if the companies table exists
      const { data: tableInfo, error: tableError } = await supabase
        .from('companies')
        .select('id')
        .limit(1);
      
      if (tableError) {
        console.error('Error accessing companies table:', {
          message: tableError.message,
          details: tableError.details,
          hint: tableError.hint,
          code: tableError.code
        });
        throw tableError;
      }

      console.log('Companies table exists, checking for user company...');

      const { data: companies, error } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', userId)
        .limit(1);
      
      if (error) {
        console.error('Supabase error in checkUserCompany:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          status: error.status,
          statusText: error.statusText
        });
        throw error;
      }
      
      console.log('Company check result:', { companies });
      
      if (companies && companies.length > 0) {
        // User has a company
        setCompanyId(companies[0].id);
      } else {
        // User doesn't have a company
        setCompanyId(null);
      }
    } catch (error) {
      console.error('Error checking user company:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        status: error.status,
        statusText: error.statusText
      });
      setCompanyId(null);
    }
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error };
    }
  };

  // Sign up with email and password
  const signUp = async (email, password, userData) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  // Create a company
  const createCompany = async (companyData) => {
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create company
      const { data: company, error: companyError } = await supabase.from('companies').insert([
        {
          ...companyData,
          owner_id: user.id,
          additional_details: {
            ai_instructions: '',
          },
        },
      ]).select();

      if (companyError) throw companyError;

      // Create user-company relationship
      const { error: relationshipError } = await supabase.from('user_companies').insert([
        {
          user_id: user.id,
          company_id: company[0].id,
          role: 'owner',
        },
      ]);

      if (relationshipError) throw relationshipError;

      // Update company ID
      setCompanyId(company[0].id);

      return { success: true, data: company[0] };
    } catch (error) {
      return { success: false, error };
    }
  };

  const value = {
    user,
    companyId,
    loading,
    signIn,
    signUp,
    signOut,
    createCompany,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
} 