"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import TaskList from '@/components/tasks/TaskList';
import TaskForm from '@/components/tasks/TaskForm';

export default function TasksPage() {
  const [selectedTab, setSelectedTab] = useState('list');
  const [refreshKey, setRefreshKey] = useState(0);
  const [user, setUser] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [loading, setLoading] = useState(true);

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
        .select('id')
        .eq('owner_id', userId)
        .limit(1);
      
      if (error) throw error;
      
      if (companies && companies.length > 0) {
        setCompanyId(companies[0].id);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error getting company:', error);
      setLoading(false);
    }
  };

  const handleTaskAdded = () => {
    // Trigger a refresh of the task list
    setRefreshKey(prev => prev + 1);
    // Switch back to the list tab
    setSelectedTab('list');
  };

  const tabs = [
    { id: 'list', label: 'Task List' },
    { id: 'add', label: 'Add Task' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (!user || !companyId) {
    return <div className="flex items-center justify-center h-full">Please log in to view this page</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your tasks and follow-ups.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`${
                selectedTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {selectedTab === 'list' && (
        <TaskList 
          key={refreshKey} 
          companyId={companyId} 
          userId={user?.id} 
        />
      )}

      {selectedTab === 'add' && (
        <TaskForm 
          companyId={companyId} 
          userId={user?.id} 
          onSuccess={handleTaskAdded} 
        />
      )}
    </div>
  );
} 