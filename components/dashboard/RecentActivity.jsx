import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const ActivityItem = ({ activity }) => {
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'task_completed':
        return (
          <div className="flex items-center justify-center w-8 h-8 text-white bg-green-500 rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'lead_added':
        return (
          <div className="flex items-center justify-center w-8 h-8 text-white bg-blue-500 rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
        );
      case 'lead_converted':
        return (
          <div className="flex items-center justify-center w-8 h-8 text-white bg-indigo-500 rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
        );
      case 'task_created':
        return (
          <div className="flex items-center justify-center w-8 h-8 text-white bg-purple-500 rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center w-8 h-8 text-white bg-gray-500 rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="flex space-x-3">
      {getActivityIcon()}
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{activity.description}</p>
        <p className="text-xs text-gray-500">
          {new Date(activity.created_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
};

const RecentActivity = ({ companyId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (companyId) {
      fetchRecentActivity();
    }
  }, [companyId]);

  const fetchRecentActivity = async () => {
    try {
      setLoading(true);
      
      // For MVP, we'll simulate activity data
      // In a real implementation, this would fetch from an activities table
      
      // Get some recent leads
      const { data: recentLeads, error: leadsError } = await supabase
        .from('leads')
        .select('id, name, created_at, status')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (leadsError) throw leadsError;
      
      // Get some recent tasks
      const { data: recentTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, created_at, status, completed_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (tasksError) throw tasksError;
      
      // Transform leads and tasks into activity items
      const leadActivities = recentLeads.map(lead => ({
        id: `lead-${lead.id}`,
        type: lead.status === 'converted' ? 'lead_converted' : 'lead_added',
        description: lead.status === 'converted'
          ? `Lead "${lead.name}" was converted to a customer`
          : `New lead "${lead.name}" was added`,
        created_at: lead.created_at,
        entity_type: 'lead',
        entity_id: lead.id,
      }));
      
      const taskActivities = recentTasks.map(task => ({
        id: `task-${task.id}`,
        type: task.status === 'completed' ? 'task_completed' : 'task_created',
        description: task.status === 'completed'
          ? `Task "${task.title}" was completed`
          : `New task "${task.title}" was created`,
        created_at: task.status === 'completed' ? task.completed_at : task.created_at,
        entity_type: 'task',
        entity_id: task.id,
      }));
      
      // Combine and sort activities
      const allActivities = [...leadActivities, ...taskActivities]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10); // Only show the 10 most recent activities
      
      setActivities(allActivities);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setError('Failed to load recent activity.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        <div className="mt-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="flex-1">
                <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="w-1/2 h-3 mt-1 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
      
      {error && (
        <div className="p-4 mt-4 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}
      
      <div className="mt-4 space-y-3">
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500">No recent activity to display.</p>
        ) : (
          activities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))
        )}
      </div>
    </div>
  );
};

export default RecentActivity; 