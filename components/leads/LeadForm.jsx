import { useState } from 'react';
import { addLead } from '@/lib/lead-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const LeadForm = ({ companyId, userId, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    designation: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!companyId || !userId) {
      toast.error('Missing required company or user information');
      return;
    }

    if (!formData.name?.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!formData.email?.trim() && !formData.phone?.trim()) {
      toast.error('Either email or phone number is required');
      return;
    }
    
    try {
      setLoading(true);
      
      console.log('Submitting lead with:', {
        formData,
        companyId,
        userId
      });
      
      const { success, lead, error: leadError } = await addLead(formData, companyId, userId);
      
      if (!success || leadError) {
        throw new Error(leadError || 'Failed to add lead');
      }
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        company_name: '',
        designation: '',
      });
      
      toast.success('Lead added successfully');
      
      // Notify parent component of success
      if (onSuccess) onSuccess(lead);
    } catch (error) {
      console.error('Error adding lead:', error);
      toast.error(error.message || 'Failed to add lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gray-900/50 border-gray-800 shadow-lg hover:shadow-purple-500/10 transition-all">
      <CardHeader>
        <CardTitle className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
          Add New Lead
        </CardTitle>
        <CardDescription className="text-gray-400">
          Enter the lead's information below
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">
              Full Name *
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              className="bg-gray-800/50 border-gray-700 text-gray-300 focus:ring-purple-500/50 focus:border-purple-500/50"
              placeholder="John Doe"
            />
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-400 mb-1">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="bg-gray-800/50 border-gray-700 text-gray-300 focus:ring-purple-500/50 focus:border-purple-500/50"
                placeholder="john@example.com"
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-400 mb-1">
                Phone Number
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="bg-gray-800/50 border-gray-700 text-gray-300 focus:ring-purple-500/50 focus:border-purple-500/50"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="company_name" className="block text-sm font-medium text-gray-400 mb-1">
                Company
              </label>
              <Input
                id="company_name"
                name="company_name"
                type="text"
                value={formData.company_name}
                onChange={handleChange}
                className="bg-gray-800/50 border-gray-700 text-gray-300 focus:ring-purple-500/50 focus:border-purple-500/50"
                placeholder="Company Name"
              />
            </div>
            
            <div>
              <label htmlFor="designation" className="block text-sm font-medium text-gray-400 mb-1">
                Job Title
              </label>
              <Input
                id="designation"
                name="designation"
                type="text"
                value={formData.designation}
                onChange={handleChange}
                className="bg-gray-800/50 border-gray-700 text-gray-300 focus:ring-purple-500/50 focus:border-purple-500/50"
                placeholder="Job Title"
              />
            </div>
          </div>
          
          <div className="pt-2">
            <div className="mb-4 space-y-2">
              <p className="text-xs text-gray-400">
                * Required field
              </p>
              <p className="text-xs text-gray-400">
                Note: Either email or phone number must be provided
              </p>
            </div>
            
            <Button 
              type="submit"
              disabled={loading || (!formData.email && !formData.phone)}
              className="w-full bg-purple-600/80 hover:bg-purple-600 text-white border border-purple-500/30 shadow-lg shadow-purple-500/5 disabled:bg-gray-800/50 disabled:border-gray-700 disabled:text-gray-500"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin mr-2"></div>
                  Adding Lead...
                </div>
              ) : (
                'Add Lead'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LeadForm;