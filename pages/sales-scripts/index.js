import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SalesScripts from '@/components/sales/SalesScripts';

const SalesScriptsPage = ({ user, companyId }) => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Sales Scripts</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create and manage your sales scripts for automated outreach.
        </p>
      </div>

      <SalesScripts companyId={companyId} />
    </div>
  );
};

// Apply dashboard layout
SalesScriptsPage.getLayout = (page) => {
  return <DashboardLayout {...page.props}>{page}</DashboardLayout>;
};

export default SalesScriptsPage; 