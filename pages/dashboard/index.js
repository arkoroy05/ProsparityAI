import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Stats from '@/components/dashboard/Stats';
import RecentActivity from '@/components/dashboard/RecentActivity';
import AiInstructions from '@/components/dashboard/AiInstructions';
import { getCompanyById } from '@/lib/company-utils';

const Dashboard = ({ user, companyId }) => {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      fetchCompany();
    }
  }, [companyId]);

  const fetchCompany = async () => {
    try {
      setLoading(true);
      const { company, error } = await getCompanyById(companyId);
      
      if (error) throw new Error(error);
      
      setCompany(company);
    } catch (error) {
      console.error('Error fetching company:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="h-64 bg-gray-200 rounded mb-6"></div>
        <div className="h-96 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back to your Prosparity.AI dashboard. Here's an overview of your sales performance.
        </p>
      </div>

      {/* Stats section */}
      <div className="mb-8">
        <Stats companyId={companyId} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent activity */}
        <div>
          <RecentActivity companyId={companyId} />
        </div>

        {/* AI instructions */}
        <div>
          <AiInstructions 
            companyId={companyId} 
            initialInstructions={company?.additional_details?.ai_instructions || ''}
          />
        </div>
      </div>
    </div>
  );
};

// Apply dashboard layout
Dashboard.getLayout = (page) => {
  return <DashboardLayout {...page.props}>{page}</DashboardLayout>;
};

export default Dashboard; 