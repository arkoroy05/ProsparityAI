import { useState, useEffect } from 'react';
import { getTasksByLead } from '@/lib/task-utils';
import { createTask } from '@/lib/task-utils';
import { updateLeadStatus } from '@/lib/lead-utils';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const statusColors = {
  new: 'bg-blue-100 text-blue-800',
  qualified: 'bg-green-100 text-green-800',
  unqualified: 'bg-gray-100 text-gray-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  converted: 'bg-indigo-100 text-indigo-800',
  dead: 'bg-red-100 text-red-800',
};

const LeadDetails = ({ 
  lead, 
  companyId, 
  userId, 
  onClose, 
  onStatusChange, 
  onScoreUpdate,
  onLeadUpdate 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: lead.name,
    email: lead.email || '',
    phone: lead.phone || '',
    company_name: lead.company_name || '',
    designation: lead.designation || '',
    notes: lead.notes || '',
  });
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    description: '',
    task_type: 'call',
    scheduled_at: new Date().toISOString().slice(0, 16),
    priority: 3,
    ai_instructions: '',
  });
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [savingTask, setSavingTask] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch tasks for this lead when component mounts
    fetchTasks();
  }, [lead.id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('leads')
        .update(formData)
        .eq('id', lead.id);
      
      if (error) throw error;
      
      // Notify parent component
      if (onLeadUpdate) {
        onLeadUpdate({ ...lead, ...formData });
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating lead:', error);
      // Could add toast notification here
    }
  };

  const handleTaskInputChange = (e) => {
    const { name, value } = e.target;
    setNewTaskData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    try {
      setSavingTask(true);
      
      const { task, error } = await createTask(
        newTaskData,
        lead.id,
        companyId,
        userId
      );
      
      if (error) throw error;
      
      // Add new task to list
      setTasks((prev) => [...prev, task]);
      
      // Reset form
      setNewTaskData({
        title: '',
        description: '',
        task_type: 'call',
        scheduled_at: new Date().toISOString().slice(0, 16),
        priority: 3,
        ai_instructions: '',
      });
      
      // Hide form
      setShowNewTaskForm(false);
    } catch (error) {
      console.error('Error creating task:', error);
      // Could add toast notification here
    } finally {
      setSavingTask(false);
    }
  };

  return (
    <Card className="bg-[#1a1c23] border-[#2a2d35]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white">Lead Details</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-muted-foreground hover:text-white"
        >
          Close
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
            <p className="text-white">{lead.name}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Company</h3>
            <p className="text-white">{lead.company_name || 'N/A'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
            <p className="text-white">{lead.email || 'N/A'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Phone</h3>
            <p className="text-white">{lead.phone || 'N/A'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Job Title</h3>
            <p className="text-white">{lead.designation || 'N/A'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
            <p className="text-white capitalize">{lead.status || 'New'}</p>
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-3">Tasks</h3>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-lg bg-[#2a2d35] border border-[#353841]"
                >
                  <p className="text-white">{task.description}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(task.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No tasks found for this lead.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadDetails;