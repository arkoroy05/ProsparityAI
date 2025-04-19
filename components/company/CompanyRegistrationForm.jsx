import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createCompany } from '@/lib/company-utils';
import { parseProductsFromCSV } from '@/lib/company-utils';

const CompanyRegistrationForm = ({ user }) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contact_email: user?.email || '',
    contact_phone: '',
    website: '',
    industry: '',
    products_services_csv: '',
    additional_details: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Parse products/services from CSV
      const productsServices = parseProductsFromCSV(formData.products_services_csv);
      
      // Prepare company data
      const companyData = {
        name: formData.name,
        description: formData.description,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        website: formData.website,
        industry: formData.industry,
        products_services: productsServices,
        additional_details: formData.additional_details ? JSON.parse(formData.additional_details) : {},
      };
      
      // Create company
      const { company, error: companyError } = await createCompany(companyData, user.id);
      
      if (companyError) throw new Error(companyError);
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error registering company:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl p-8 bg-white rounded-lg shadow-md">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-extrabold text-gray-900">Register Your Company</h2>
        <p className="mt-2 text-sm text-gray-600">
          This information helps our AI better understand your business and communicate with leads
        </p>
      </div>
      
      {error && (
        <div className="p-4 mb-6 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Company Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
              Industry *
            </label>
            <input
              id="industry"
              name="industry"
              type="text"
              required
              value={formData.industry}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">
              Contact Email *
            </label>
            <input
              id="contact_email"
              name="contact_email"
              type="email"
              required
              value={formData.contact_email}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700">
              Contact Phone *
            </label>
            <input
              id="contact_phone"
              name="contact_phone"
              type="tel"
              required
              value={formData.contact_phone}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700">
              Website
            </label>
            <input
              id="website"
              name="website"
              type="url"
              value={formData.website}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Company Description *
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            required
            value={formData.description}
            onChange={handleChange}
            className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Describe what your company does, your target market, and your value proposition..."
          />
        </div>
        
        <div>
          <label htmlFor="products_services_csv" className="block text-sm font-medium text-gray-700">
            Products/Services (CSV format) *
          </label>
          <textarea
            id="products_services_csv"
            name="products_services_csv"
            rows={5}
            required
            value={formData.products_services_csv}
            onChange={handleChange}
            className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Product/Service Name, Description, Price (optional)
Marketing Automation, Automates marketing workflows, 499
AI Content Generator, Creates personalized content, 299"
          />
          <p className="mt-1 text-sm text-gray-500">
            Enter each product or service on a new line in the format: Name, Description, Price (optional)
          </p>
        </div>
        
        <div>
          <label htmlFor="additional_details" className="block text-sm font-medium text-gray-700">
            Additional Details (JSON format)
          </label>
          <textarea
            id="additional_details"
            name="additional_details"
            rows={5}
            value={formData.additional_details}
            onChange={handleChange}
            className="block w-full px-3 py-2 mt-1 font-mono border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder='{"founding_year": 2020, "team_size": 15, "target_audience": "B2B SaaS companies"}'
          />
          <p className="mt-1 text-sm text-gray-500">
            Optional: Add more details about your company in JSON format
          </p>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {loading ? 'Registering...' : 'Register Company'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanyRegistrationForm; 