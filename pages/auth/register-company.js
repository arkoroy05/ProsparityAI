import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AuthLayout from '@/components/layout/AuthLayout';

export default function RegisterCompany() {
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('1-10');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  const router = useRouter();

  // Check if user is logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      
      if (!data.session) {
        router.replace('/auth/login');
        return;
      }
      
      setUserId(data.session.user.id);
      setInitializing(false);
    };
    
    checkUser();
  }, [router]);

  const companySizes = [
    "1-10",
    "11-50",
    "51-200",
    "201-500",
    "501-1000",
    "1000+"
  ];

  const industries = [
    "Technology",
    "Healthcare",
    "Finance",
    "Education",
    "Retail",
    "Manufacturing",
    "Real Estate",
    "Marketing",
    "Consulting",
    "Other"
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create the company record
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert([
          {
            name: companyName,
            industry,
            size: companySize,
            website: website || null,
            created_by: userId
          }
        ])
        .select()
        .single();

      if (companyError) throw companyError;

      // Create user-company relationship
      const { error: userCompanyError } = await supabase
        .from('user_companies')
        .insert([
          {
            user_id: userId,
            company_id: company.id,
            role: 'admin'
          }
        ]);

      if (userCompanyError) throw userCompanyError;

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      console.error('Company registration error:', err);
      setError(err.message || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900">Set up your company</h1>
        <p className="mt-2 text-sm text-gray-600">
          Tell us about your business to get started
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
            Company name
          </label>
          <div className="mt-1">
            <input
              id="companyName"
              name="companyName"
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
            Industry
          </label>
          <div className="mt-1">
            <select
              id="industry"
              name="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            >
              <option value="" disabled>Select an industry</option>
              {industries.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="companySize" className="block text-sm font-medium text-gray-700">
            Company size
          </label>
          <div className="mt-1">
            <select
              id="companySize"
              name="companySize"
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              {companySizes.map((size) => (
                <option key={size} value={size}>{size} employees</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700">
            Website (optional)
          </label>
          <div className="mt-1">
            <input
              id="website"
              name="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
          >
            {loading ? 'Setting up...' : 'Complete setup'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Apply auth layout
RegisterCompany.getLayout = (page) => {
  return <AuthLayout>{page}</AuthLayout>;
}; 