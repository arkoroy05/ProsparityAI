"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import LeadList from '@/components/leads/LeadList';
import LeadForm from '@/components/leads/LeadForm';
import CsvUpload from '@/components/leads/CsvUpload';
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LeadsPage() {
  const [selectedTab, setSelectedTab] = useState("list");
  const [refreshKey, setRefreshKey] = useState(0);
  const [user, setUser] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  const handleLeadAdded = () => {
    setRefreshKey(prev => prev + 1);
    setSelectedTab('list');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user || !companyId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <h2 className="text-xl font-semibold text-white">Please log in to view this page</h2>
      </div>
    );
  }

  return (
    <div className="bg-black text-white min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
          Leads Management
        </h1>
        <p className="mt-2 text-gray-400">
          Efficiently manage and track your potential customers
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="bg-gray-900 border-gray-800">
          <TabsTrigger 
            value="list" 
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            Lead List
          </TabsTrigger>
          <TabsTrigger 
            value="add" 
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            Add Lead
          </TabsTrigger>
          <TabsTrigger 
            value="import" 
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            Import CSV
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <Card className="bg-gray-900 border-gray-800 shadow-lg">
            <LeadList 
              key={refreshKey} 
              companyId={companyId} 
              userId={user?.id} 
            />
          </Card>
        </TabsContent>

        <TabsContent value="add" className="mt-6">
          <Card className="bg-gray-900 border-gray-800 shadow-lg p-6">
            <LeadForm 
              companyId={companyId} 
              userId={user?.id} 
              onSuccess={handleLeadAdded} 
            />
          </Card>
        </TabsContent>

        <TabsContent value="import" className="mt-6">
          <Card className="bg-gray-900 border-gray-800 shadow-lg p-6">
            <CsvUpload 
              companyId={companyId}
              userId={user?.id}
              onSuccess={handleLeadAdded}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}