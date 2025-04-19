import { useState } from 'react';
import { addLead } from '@/lib/lead-utils';

const LeadForm = ({ companyId, userId, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    designation: '',
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
      
      const { success, lead, error: leadError } = await addLead(formData, companyId, userId);
      
      if (leadError) throw new Error(leadError);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        company_name: '',
        designation: '',
      });
      
      // Notify parent component of success
      if (onSuccess) onSuccess(lead);
    } catch (error) {
      console.error('Error adding lead:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-900 rounded-lg shadow-lg border border-gray-800">
      <h3 className="mb-4 text-lg font-medium text-white">Add New Lead</h3>
      
      {error && (
        <div className="p-4 mb-4 text-sm text-red-400 bg-red-900/30 rounded-md border border-red-800">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300">
            Full Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            className="block w-full px-3 py-2 mt-1 text-gray-300 bg-gray-800/50 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
          />
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 text-gray-300 bg-gray-800/50 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            />
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-300">
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 text-gray-300 bg-gray-800/50 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="company_name" className="block text-sm font-medium text-gray-300">
              Company
            </label>
            <input
              id="company_name"
              name="company_name"
              type="text"
              value={formData.company_name}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 text-gray-300 bg-gray-800/50 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            />
          </div>
          
          <div>
            <label htmlFor="designation" className="block text-sm font-medium text-gray-300">
              Job Title
            </label>
            <input
              id="designation"
              name="designation"
              type="text"
              value={formData.designation}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 text-gray-300 bg-gray-800/50 border border-gray-800 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            />
          </div>
        </div>
        
        <div className="pt-2">
          <p className="mb-2 text-xs text-gray-500">
            * Required field
          </p>
          <p className="mb-4 text-xs text-gray-500">
            Note: Either email or phone number must be provided
          </p>
          
          <button
            type="submit"
            disabled={loading || (!formData.email && !formData.phone)}
            className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-purple-600/80 border border-purple-500/30 rounded-md shadow-sm hover:bg-purple-600/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500/50 disabled:bg-gray-800 disabled:border-gray-700 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Adding...' : 'Add Lead'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LeadForm;