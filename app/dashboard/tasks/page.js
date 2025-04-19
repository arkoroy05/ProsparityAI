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
    return <div className="flex items-center justify-center h-full text-white">Loading...</div>;
  }

  if (!user || !companyId) {
    return <div className="flex items-center justify-center h-full text-white">Please log in to view this page</div>;
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">Tasks</h1>
        <p className="mt-1 text-sm text-gray-400">
          Manage your tasks and follow-ups.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-800">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`${
                selectedTab === tab.id
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="bg-gray-900">
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
    </div>
  );
}