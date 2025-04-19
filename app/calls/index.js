import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

const CallsPage = ({ user, companyId }) => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, scheduled, completed, failed

  useEffect(() => {
    if (companyId) {
      fetchCalls();
    }
  }, [companyId, filter]);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      setError('');
      
      let query = supabase
        .from('scheduled_calls')
        .select(`
          *,
          leads (
            id,
            name,
            email,
            phone,
            company
          ),
          tasks (
            id,
            title
          )
        `)
        .eq('company_id', companyId)
        .order('scheduled_time', { ascending: false });
      
      // Apply filters
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      setCalls(data || []);
    } catch (err) {
      console.error('Error fetching calls:', err);
      setError('Failed to load calls');
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">AI Calls</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage and monitor all your AI-powered sales calls.
        </p>
      </div>

      <div className="mb-6 flex justify-between items-center">
        <div className="flex space-x-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm rounded-md ${filter === 'all' ? 'bg-indigo-100 text-indigo-800 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('scheduled')}
            className={`px-3 py-1 text-sm rounded-md ${filter === 'scheduled' ? 'bg-indigo-100 text-indigo-800 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Scheduled
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 text-sm rounded-md ${filter === 'completed' ? 'bg-indigo-100 text-indigo-800 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilter('failed')}
            className={`px-3 py-1 text-sm rounded-md ${filter === 'failed' ? 'bg-indigo-100 text-indigo-800 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Failed
          </button>
        </div>
        
        <Link 
          href="/leads" 
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Schedule New Call
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading calls...</p>
        </div>
      ) : calls.length === 0 ? (
        <div className="text-center py-8 bg-white shadow rounded-lg">
          <p className="text-gray-600">No calls found.</p>
          <p className="text-gray-600 mt-2">
            Schedule a call with a lead to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white shadow rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lead
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scheduled Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Objective
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Call Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {calls.map((call) => (
                <tr key={call.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {call.leads?.name || 'Unknown Lead'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {call.leads?.company || ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(call.scheduled_time)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(call.status)}`}>
                      {call.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {call.objective || 'No objective'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {call.started_at && call.completed_at ? (
                      `${Math.round((new Date(call.completed_at) - new Date(call.started_at)) / 1000 / 60)} mins`
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/calls/${call.id}`}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Apply dashboard layout
CallsPage.getLayout = (page) => {
  return <DashboardLayout {...page.props}>{page}</DashboardLayout>;
};

export default CallsPage; 