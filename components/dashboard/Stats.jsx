import { useState, useEffect } from 'react';
import { getCompanyMetrics } from '@/lib/company-utils';

const StatCard = ({ title, value, description, icon, colorClass = 'bg-indigo-500' }) => (
  <div className="p-5 bg-white rounded-lg shadow">
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
      </div>
      <div className={`p-3 rounded-md ${colorClass}`}>
        {icon}
      </div>
    </div>
  </div>
);

const Stats = ({ companyId }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (companyId) {
      fetchMetrics();
    }
  }, [companyId]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      
      const { metrics: companyMetrics, error: metricsError } = await getCompanyMetrics(companyId);
      
      if (metricsError) throw new Error(metricsError);
      
      setMetrics(companyMetrics);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      setError('Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 p-5 bg-gray-100 rounded-lg animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-700 bg-red-100 rounded-md">
        {error}
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const { leadStats, taskStats, totalLeads, avgScore, conversionRate } = metrics;

  // Count tasks by status
  const pendingTasks = taskStats.find((stat) => stat.status === 'pending')?.count || 0;
  const completedTasks = taskStats.find((stat) => stat.status === 'completed')?.count || 0;
  const totalTasks = taskStats.reduce((sum, stat) => sum + (stat.count || 0), 0);

  // Upcoming tasks (pending tasks scheduled for today or tomorrow)
  const upcomingTasks = pendingTasks; // For MVP we'll just use pending tasks

  // Calculate qualified leads
  const qualifiedLeads = leadStats.find((stat) => stat.status === 'qualified')?.count || 0;
  const qualifiedLeadPercentage = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Leads"
        value={totalLeads}
        description={`${qualifiedLeadPercentage}% qualified`}
        icon={
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        }
        colorClass="bg-blue-500"
      />
      
      <StatCard
        title="Average Lead Score"
        value={avgScore}
        description={`Out of 100`}
        icon={
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        }
        colorClass="bg-yellow-500"
      />
      
      <StatCard
        title="Conversion Rate"
        value={`${conversionRate}%`}
        description={`From leads to customers`}
        icon={
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
        }
        colorClass="bg-green-500"
      />
      
      <StatCard
        title="Tasks"
        value={upcomingTasks}
        description={`${completedTasks} completed of ${totalTasks} total`}
        icon={
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
        }
        colorClass="bg-purple-500"
      />
    </div>
  );
};

export default Stats; 