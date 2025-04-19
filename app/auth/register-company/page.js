"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RegisterCompanyPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Not authenticated, redirect to login
          router.push('/auth/login');
          return;
        }

        setUserId(session.user.id);

        // Check if user already has a company
        const { data: companies, error } = await supabase
          .from('companies')
          .select('id')
          .eq('owner_id', session.user.id)
          .limit(1);
        
        if (error) throw error;
        
        if (companies && companies.length > 0) {
          // User already has a company, redirect to dashboard
          router.push('/dashboard');
          return;
        }

        setInitializing(false);
      } catch (error) {
        console.error('Auth check error:', error);
        setError(error.message || 'Authentication error');
        setInitializing(false);
      }
    };

    checkAuth();
  }, [router]);

  const companySizes = [
    { id: 'solo', label: 'Solo Entrepreneur' },
    { id: 'small', label: 'Small (2-10 employees)' },
    { id: 'medium', label: 'Medium (11-50 employees)' },
    { id: 'large', label: 'Large (51-200 employees)' },
    { id: 'enterprise', label: 'Enterprise (201+ employees)' },
  ];

  const industries = [
    { id: 'technology', label: 'Technology' },
    { id: 'healthcare', label: 'Healthcare' },
    { id: 'education', label: 'Education' },
    { id: 'finance', label: 'Finance' },
    { id: 'retail', label: 'Retail' },
    { id: 'manufacturing', label: 'Manufacturing' },
    { id: 'services', label: 'Professional Services' },
    { id: 'real_estate', label: 'Real Estate' },
    { id: 'other', label: 'Other' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!companyName.trim()) {
      setError('Company name is required');
      setLoading(false);
      return;
    }

    try {
      // Create company
      const { data: company, error: companyError } = await supabase.from('companies').insert([
        {
          name: companyName,
          industry,
          size: companySize,
          website: website || null,
          owner_id: userId,
          additional_details: {
            ai_instructions: '',
          },
        },
      ]).select();

      if (companyError) throw companyError;

      // Create user-company relationship
      const { error: relationshipError } = await supabase.from('user_companies').insert([
        {
          user_id: userId,
          company_id: company[0].id,
          role: 'owner',
        },
      ]);

      if (relationshipError) throw relationshipError;

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Company registration error:', error);
      setError(error.message || 'An error occurred during company registration.');
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="w-full max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 border-t-4 border-indigo-500 border-solid rounded-full animate-spin"></div>
        </div>
        <p className="text-center mt-4 text-gray-600">Initializing...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Register Your Company</h2>
      <p className="text-gray-600 mb-8">
        Set up your company profile to get started with Prosparity.AI
      </p>

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
            Company Name *
          </label>
          <input
            id="companyName"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter your company name"
            required
          />
        </div>

        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
            Industry
          </label>
          <select
            id="industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select an industry</option>
            {industries.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="companySize" className="block text-sm font-medium text-gray-700 mb-1">
            Company Size
          </label>
          <select
            id="companySize"
            value={companySize}
            onChange={(e) => setCompanySize(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Select company size</option>
            {companySizes.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
            Website (optional)
          </label>
          <input
            id="website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="https://yourcompany.com"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Registering...' : 'Register Company'}
          </button>
        </div>
      </form>
    </div>
  );
} 