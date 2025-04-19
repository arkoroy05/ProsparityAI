import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { supabase } from '@/lib/supabase';
import { getCompanyById, updateCompany } from '@/lib/company-utils';

const SettingsPage = ({ user, companyId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [company, setCompany] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    industry: '',
  });

  useEffect(() => {
    if (companyId) {
      fetchCompany();
    }
  }, [companyId]);

  const fetchCompany = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { company, error } = await getCompanyById(companyId);
      
      if (error) throw new Error(error);
      
      setCompany(company);
      setFormData({
        name: company.name || '',
        description: company.description || '',
        contact_email: company.contact_email || '',
        contact_phone: company.contact_phone || '',
        website: company.website || '',
        industry: company.industry || '',
      });
    } catch (error) {
      console.error('Error fetching company:', error);
      setError('Failed to load company details.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);
      
      const { company: updatedCompany, error } = await updateCompany(companyId, formData);
      
      if (error) throw new Error(error);
      
      setCompany(updatedCompany);
      setSaveSuccess(true);
      
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error updating company:', error);
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="h-64 bg-gray-200 rounded mb-6"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your company settings and profile.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Company Information</h3>
          <p className="mt-1 text-sm text-gray-500">
            Update your company details and contact information.
          </p>

          {error && (
            <div className="mt-4 p-4 text-sm text-red-700 bg-red-100 rounded-md">
              {error}
            </div>
          )}

          {saveSuccess && (
            <div className="mt-4 p-4 text-sm text-green-700 bg-green-100 rounded-md">
              Your settings have been saved successfully.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
                  Industry
                </label>
                <input
                  type="text"
                  name="industry"
                  id="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">
                  Contact Email
                </label>
                <input
                  type="email"
                  name="contact_email"
                  id="contact_email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700">
                  Contact Phone
                </label>
                <input
                  type="text"
                  name="contact_phone"
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                  Website
                </label>
                <input
                  type="url"
                  name="website"
                  id="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Company Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              ></textarea>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="mt-6 bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Account</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Manage your account settings and preferences.
          </p>
          
          <div className="mt-5">
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-500">
                Account email: {user.email}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Apply dashboard layout
SettingsPage.getLayout = (page) => {
  return <DashboardLayout {...page.props}>{page}</DashboardLayout>;
};

export default SettingsPage; 