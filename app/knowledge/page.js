"use client";
import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KnowledgeBase from '@/components/knowledge/KnowledgeBase';

const KnowledgeBasePage = ({ user, companyId }) => {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Knowledge Base</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your company knowledge base to provide better context for AI interactions with your leads.
        </p>
      </div>

      <KnowledgeBase companyId={companyId} />
    </div>
  );
};

// Apply dashboard layout
KnowledgeBasePage.getLayout = (page) => {
  return <DashboardLayout {...page.props}>{page}</DashboardLayout>;
};

export default KnowledgeBasePage; 