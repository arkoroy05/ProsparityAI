import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export function useUser() {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserCompany(session.user.id);
      } else {
        setLoading(false);
        router.push('/auth/login');
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserCompany(session.user.id);
      } else {
        setCompany(null);
        setLoading(false);
        router.push('/auth/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const fetchUserCompany = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_companies')
        .select('companies (*)')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setCompany(data?.companies ?? null);
    } catch (error) {
      console.error('Error fetching user company:', error);
      setCompany(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return {
    user,
    company,
    loading,
    signOut,
  };
} 