import { useState, useEffect } from 'react';
import { getTasksByLead } from '@/lib/task-utils';
import { createTask } from '@/lib/task-utils';
import { updateLeadStatus } from '@/lib/lead-utils';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

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
    <Card className="bg-gray-900/50 border-gray-800 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-800">
        <CardTitle className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
          Lead Details
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-gray-400 hover:text-white hover:bg-gray-800/50"
        >
          Close
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-6 p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-1">Name</h3>
            <p className="text-white">{lead.name}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-1">Company</h3>
            <p className="text-white">{lead.company_name || 'N/A'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-1">Email</h3>
            <p className="text-white">{lead.email || 'N/A'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-1">Phone</h3>
            <p className="text-white">{lead.phone || 'N/A'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-1">Job Title</h3>
            <p className="text-white">{lead.designation || 'N/A'}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-1">Status</h3>
            <p className="text-white capitalize">{lead.status || 'New'}</p>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-6">
          <h3 className="text-lg font-semibold text-white mb-3">Tasks</h3>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
          ) : tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 hover:shadow-purple-500/5 transition-all"
                >
                  <p className="text-gray-300">{task.title}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {task.description}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {new Date(task.created_at).toLocaleDateString()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      task.status === 'completed' ? 'bg-green-900/50 text-green-300 border border-green-700/50' :
                      task.status === 'pending' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50' :
                      'bg-gray-800 text-gray-300 border border-gray-700'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No tasks found for this lead.</p>
          )}

          <Button
            onClick={() => setShowNewTaskForm(!showNewTaskForm)}
            className="mt-4 bg-purple-600/80 hover:bg-purple-600 text-white border border-purple-500/30 shadow-lg shadow-purple-500/5"
          >
            {showNewTaskForm ? 'Cancel' : 'Add Task'}
          </Button>

          {showNewTaskForm && (
            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={newTaskData.title}
                  onChange={handleTaskInputChange}
                  className="w-full px-3 py-2 text-gray-300 bg-gray-800/50 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={newTaskData.description}
                  onChange={handleTaskInputChange}
                  className="w-full px-3 py-2 text-gray-300 bg-gray-800/50 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Type
                  </label>
                  <select
                    name="task_type"
                    value={newTaskData.task_type}
                    onChange={handleTaskInputChange}
                    className="w-full px-3 py-2 text-gray-300 bg-gray-800/50 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  >
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="follow_up">Follow Up</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={newTaskData.priority}
                    onChange={handleTaskInputChange}
                    className="w-full px-3 py-2 text-gray-300 bg-gray-800/50 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  >
                    <option value="1">Low</option>
                    <option value="2">Medium</option>
                    <option value="3">High</option>
                  </select>
                </div>
              </div>

              <Button 
                type="submit"
                disabled={savingTask}
                className="w-full bg-purple-600/80 hover:bg-purple-600 text-white border border-purple-500/30 shadow-lg shadow-purple-500/5"
              >
                {savingTask ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin mr-2"></div>
                    Creating...
                  </div>
                ) : (
                  'Create Task'
                )}
              </Button>
            </form>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadDetails;