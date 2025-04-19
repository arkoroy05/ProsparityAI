"use client"

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Stats from '@/components/dashboard/Stats';
import AiInstructions from '@/components/dashboard/AiInstructions';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    // Get current session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await getCompanyId(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        setLoading(false);
      }
    };

    getSession();
  }, []);

  const getCompanyId = async (userId) => {
    try {
      const { data: companies, error } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', userId)
        .limit(1);
      
      if (error) throw error;
      
      if (companies && companies.length > 0) {
        setCompanyId(companies[0].id);
        setCompany(companies[0]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error getting company:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (!user || !companyId) {
    return <div className="flex items-center justify-center h-full">Please log in to view this page</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome to Prosparity.AI, your AI-powered sales assistant.
        </p>
      </div>

      {/* Stats Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Overview</h2>
        <Stats companyId={companyId} />
      </section>

      {/* AI Instructions Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">AI Agent Instructions</h2>
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600 mb-4">
            Customize how your AI sales agent interacts with leads. These instructions will guide
            how the AI engages with potential customers.
          </p>
          <AiInstructions companyId={companyId} />
        </div>
      </section>

      {/* Quick Links */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
            <h3 className="font-medium text-gray-900 mb-2">Manage Leads</h3>
            <p className="text-gray-500 mb-4">View, add, or import new leads for your business.</p>
            <a href="/dashboard/leads" className="text-indigo-600 hover:text-indigo-500 font-medium">
              Go to Leads →
            </a>
          </div>
          <div className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
            <h3 className="font-medium text-gray-900 mb-2">View Tasks</h3>
            <p className="text-gray-500 mb-4">Check your pending tasks and follow-ups.</p>
            <a href="/dashboard/tasks" className="text-indigo-600 hover:text-indigo-500 font-medium">
              Go to Tasks →
            </a>
          </div>
          <div className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
            <h3 className="font-medium text-gray-900 mb-2">Sales Scripts</h3>
            <p className="text-gray-500 mb-4">Create and customize your sales scripts.</p>
            <a href="/dashboard/sales-scripts" className="text-indigo-600 hover:text-indigo-500 font-medium">
              Manage Scripts →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
} 