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
    <Card className="bg-[#1a1c23] border-[#2a2d35]">
      <CardHeader>
        <CardTitle className="text-white">Add New Lead</CardTitle>
        <CardDescription>Enter the lead's information below</CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-1">
              Full Name *
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              className="bg-[#2a2d35] border-[#353841] text-white"
              placeholder="John Doe"
            />
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="bg-[#2a2d35] border-[#353841] text-white"
                placeholder="john@example.com"
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-muted-foreground mb-1">
                Phone Number
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="bg-[#2a2d35] border-[#353841] text-white"
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="company_name" className="block text-sm font-medium text-muted-foreground mb-1">
                Company
              </label>
              <Input
                id="company_name"
                name="company_name"
                type="text"
                value={formData.company_name}
                onChange={handleChange}
                className="bg-[#2a2d35] border-[#353841] text-white"
                placeholder="Company Name"
              />
            </div>
            
            <div>
              <label htmlFor="designation" className="block text-sm font-medium text-muted-foreground mb-1">
                Job Title
              </label>
              <Input
                id="designation"
                name="designation"
                type="text"
                value={formData.designation}
                onChange={handleChange}
                className="bg-[#2a2d35] border-[#353841] text-white"
                placeholder="Job Title"
              />
            </div>
          </div>
          
          <div className="pt-2">
            <p className="mb-2 text-xs text-muted-foreground">
              * Required field
            </p>
            <p className="mb-4 text-xs text-muted-foreground">
              Note: Either email or phone number must be provided
            </p>
            
            <Button
              type="submit"
              disabled={loading || (!formData.email && !formData.phone)}
              className="w-full bg-purple-600/80 hover:bg-purple-600 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Lead...
                </>
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