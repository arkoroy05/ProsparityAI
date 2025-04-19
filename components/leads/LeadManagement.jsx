import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ScheduleCall } from '@/components/calls/ScheduleCall';

export function LeadManagement({ company }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    status: 'new'
  });

  useEffect(() => {
    if (company) {
      fetchLeads();
    }
  }, [company]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLead = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert({
          ...newLead,
          company_id: company.id
        })
        .select()
        .single();

      if (error) throw error;

      setLeads([data, ...leads]);
      setNewLead({
        name: '',
        email: '',
        phone: '',
        company_name: '',
        status: 'new'
      });
      toast.success('Lead added successfully');
    } catch (error) {
      console.error('Error adding lead:', error);
      toast.error('Failed to add lead');
    }
  };

  const handleUpdateLeadStatus = async (leadId, newStatus) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) throw error;

      setLeads(leads.map(lead => 
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      ));
      toast.success('Lead status updated');
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast.error('Failed to update lead status');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      new: 'default',
      contacted: 'warning',
      qualified: 'success',
      converted: 'success',
      lost: 'destructive'
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  if (loading) {
    return <div>Loading leads...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Leads</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Add Lead</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={newLead.name}
                  onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                  placeholder="Enter lead name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  type="tel"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Company</label>
                <Input
                  value={newLead.company_name}
                  onChange={(e) => setNewLead({ ...newLead, company_name: e.target.value })}
                  placeholder="Enter company name"
                />
              </div>
              <Button onClick={handleAddLead} className="w-full">
                Add Lead
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Lead List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leads.length === 0 ? (
                <p className="text-muted-foreground">No leads found</p>
              ) : (
                leads.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-sm text-gray-500">{lead.company_name}</p>
                      </div>
                      {getStatusBadge(lead.status)}
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      <p>{lead.email}</p>
                      <p>{lead.phone}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedLead ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="font-medium">Contact Information</h3>
                  <p>Email: {selectedLead.email}</p>
                  <p>Phone: {selectedLead.phone}</p>
                  <p>Company: {selectedLead.company_name}</p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Status</h3>
                  <div className="flex gap-2">
                    {['new', 'contacted', 'qualified', 'converted', 'lost'].map((status) => (
                      <Button
                        key={status}
                        variant={selectedLead.status === status ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleUpdateLeadStatus(selectedLead.id, status)}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Actions</h3>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>Schedule Call</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Schedule Call with {selectedLead.name}</DialogTitle>
                        </DialogHeader>
                        <ScheduleCall lead={selectedLead} company={company} />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                Select a lead to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 