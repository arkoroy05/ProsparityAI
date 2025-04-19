import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LeadList from '@/components/leads/LeadList';
import LeadForm from '@/components/leads/LeadForm';
import CsvUpload from '@/components/leads/CsvUpload';

const LeadsPage = ({ user, companyId }) => {
  const [selectedTab, setSelectedTab] = useState('list');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLeadAdded = () => {
    // Trigger a refresh of the lead list
    setRefreshKey(prev => prev + 1);
    // Switch back to the list tab
    setSelectedTab('list');
  };

  const tabs = [
    { id: 'list', label: 'Lead List' },
    { id: 'add', label: 'Add Lead' },
    { id: 'import', label: 'Import CSV' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your leads and potential customers.
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
        <LeadList 
          key={refreshKey} 
          companyId={companyId} 
          userId={user?.id} 
        />
      )}

      {selectedTab === 'add' && (
        <LeadForm 
          companyId={companyId} 
          userId={user?.id} 
          onSuccess={handleLeadAdded} 
        />
      )}

      {selectedTab === 'import' && (
        <CsvUpload 
          companyId={companyId} 
          userId={user?.id} 
          onSuccess={handleLeadAdded} 
        />
      )}
    </div>
  );
};

// Apply dashboard layout
LeadsPage.getLayout = (page) => {
  return <DashboardLayout {...page.props}>{page}</DashboardLayout>;
};

export default LeadsPage; 