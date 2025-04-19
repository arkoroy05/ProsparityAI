import { useState } from 'react';
import { getTasksByLead } from '@/lib/task-utils';
import { createTask } from '@/lib/task-utils';
import { updateLeadStatus } from '@/lib/lead-utils';

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
  const [loadingTasks, setLoadingTasks] = useState(true);
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

  useState(() => {
    // Fetch tasks for this lead when component mounts
    fetchTasks();
  }, [lead.id]);

  const fetchTasks = async () => {
    try {
      setLoadingTasks(true);
      const { tasks: leadTasks, error } = await getTasksByLead(lead.id);
      if (!error) {
        setTasks(leadTasks || []);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative w-full max-w-3xl p-6 mx-4 rounded-lg bg-gray-900 shadow-xl border border-gray-800">
        <button
          onClick={onClose}
          className="absolute text-gray-500 top-4 right-4 hover:text-gray-300 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Lead Details</h2>
          
          <div className="flex space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 text-sm font-medium text-purple-300 bg-purple-900/30 rounded-md border border-purple-700/50 hover:bg-purple-900/50 transition-colors"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-sm font-medium text-gray-300 bg-gray-800 rounded-md border border-gray-700 hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1 text-sm font-medium text-white bg-purple-600/80 rounded-md border border-purple-500/30 hover:bg-purple-600/90 transition-colors"
                >
                  Save
                </button>
              </>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-lg font-medium text-white">Basic Information</h3>
            
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 mt-1 text-gray-300 bg-gray-800/50 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 mt-1 text-gray-300 bg-gray-800/50 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 mt-1 text-gray-300 bg-gray-800/50 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  />
                </div>
                
                <div>
                  <label htmlFor="company_name" className="block text-sm font-medium text-gray-300">
                    Company
                  </label>
                  <input
                    type="text"
                    id="company_name"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 mt-1 text-gray-300 bg-gray-800/50 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  />
                </div>
                
                <div>
                  <label htmlFor="designation" className="block text-sm font-medium text-gray-300">
                    Job Title
                  </label>
                  <input
                    type="text"
                    id="designation"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 mt-1 text-gray-300 bg-gray-800/50 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-medium text-gray-400">Full Name</h4>
                  <p className="text-sm text-gray-300">{lead.name}</p>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-gray-400">Email</h4>
                  <p className="text-sm text-gray-300">{lead.email || '-'}</p>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-gray-400">Phone</h4>
                  <p className="text-sm text-gray-300">{lead.phone || '-'}</p>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-gray-400">Company</h4>
                  <p className="text-sm text-gray-300">{lead.company_name || '-'}</p>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-gray-400">Job Title</h4>
                  <p className="text-sm text-gray-300">{lead.designation || '-'}</p>
                </div>
              </div>
            )}
          </div>
          
          <div>
            <h3 className="mb-3 text-lg font-medium text-white">Status & Scoring</h3>
            
            <div className="p-4 mb-4 rounded-md bg-gray-800/50 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-medium text-gray-400">Status</h4>
                  <div className="mt-1">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      lead.status === 'new' ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50' :
                      lead.status === 'qualified' ? 'bg-green-900/50 text-green-300 border border-green-700/50' :
                      lead.status === 'unqualified' ? 'bg-gray-800 text-gray-300 border border-gray-700' :
                      lead.status === 'contacted' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50' :
                      lead.status === 'converted' ? 'bg-purple-900/50 text-purple-300 border border-purple-700/50' :
                      'bg-red-900/50 text-red-300 border border-red-700/50'
                    }`}>
                      {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                    </span>
                  </div>
                </div>
                
                <div>
                  <select
                    value={lead.status}
                    onChange={(e) => onStatusChange(lead.id, e.target.value)}
                    className="px-3 py-1 text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  >
                    <option value="new">New</option>
                    <option value="qualified">Qualified</option>
                    <option value="unqualified">Unqualified</option>
                    <option value="contacted">Contacted</option>
                    <option value="converted">Converted</option>
                    <option value="dead">Dead</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-medium text-gray-400">Lead Score</h4>
                  {lead.score !== null && lead.score !== undefined ? (
                    <div className="mt-1">
                      <span 
                        className={`inline-block px-3 py-1 text-sm font-medium rounded ${
                          lead.score >= 70 ? 'bg-green-900/50 text-green-300 border border-green-700/50' : 
                          lead.score <= 30 ? 'bg-red-900/50 text-red-300 border border-red-700/50' : 
                          'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50'
                        }`}
                      >
                        {lead.score}/100
                      </span>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-gray-500">Not scored yet</p>
                  )}
                </div>
                
                <div>
                  <button
                    onClick={() => onScoreUpdate(lead.id)}
                    className="px-3 py-1 text-sm font-medium text-purple-300 bg-purple-900/30 rounded-md border border-purple-700/50 hover:bg-purple-900/50 transition-colors"
                  >
                    {lead.score !== null && lead.score !== undefined ? 'Rescore' : 'Score Now'}
                  </button>
                </div>
              </div>
              
              {lead.classification && (
                <div className="mt-3">
                  <h4 className="text-xs font-medium text-gray-400">Classification</h4>
                  <p className="mt-1 text-sm font-medium capitalize text-gray-300">
                    {lead.classification}
                  </p>
                </div>
              )}
            </div>
            
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-300">Notes</h4>
              {isEditing ? (
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 mt-1 text-gray-300 bg-gray-800/50 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  placeholder="Add notes about this lead..."
                />
              ) : (
                <p className="text-sm text-gray-400">
                  {lead.notes || 'No notes added yet.'}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="pt-4 mt-6 border-t border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Tasks</h3>
            
            <button
              onClick={() => setShowNewTaskForm(!showNewTaskForm)}
              className="flex items-center px-3 py-1 text-sm font-medium text-white bg-purple-600/80 rounded-md border border-purple-500/30 hover:bg-purple-600/90 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {showNewTaskForm ? 'Cancel' : 'New Task'}
            </button>
          </div>
          
          {showNewTaskForm && (
            <form onSubmit={handleCreateTask} className="p-4 mb-4 rounded-md bg-gray-800/50 border border-gray-700">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-300">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    value={newTaskData.title}
                    onChange={handleTaskInputChange}
                    className="block w-full px-3 py-2 mt-1 text-gray-300 bg-gray-800/50 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                    placeholder="Follow up call"
                  />
                </div>
                
                <div>
                  <label htmlFor="task_type" className="block text-sm font-medium text-gray-300">
                    Task Type *
                  </label>
                  <select
                    id="task_type"
                    name="task_type"
                    required
                    value={newTaskData.task_type}
                    onChange={handleTaskInputChange}
                    className="block w-full px-3 py-2 mt-1 text-gray-300 bg-gray-800/50 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  >
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="message">Message</option>
                    <option value="meeting">Meeting</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="scheduled_at" className="block text-sm font-medium text-gray-300">
                    Schedule For *
                  </label>
                  <input
                    type="datetime-local"
                    id="scheduled_at"
                    name="scheduled_at"
                    required
                    value={newTaskData.scheduled_at}
                    onChange={handleTaskInputChange}
                    className="block w-full px-3 py-2 mt-1 text-gray-300 bg-gray-800/50 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  />
                </div>
                
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-300">
                    Priority
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={newTaskData.priority}
                    onChange={handleTaskInputChange}
                    className="block w-full px-3 py-2 mt-1 text-gray-300 bg-gray-800/50 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  >
                    <option value={1}>Low</option>
                    <option value={2}>Medium-Low</option>
                    <option value={3}>Medium</option>
                    <option value={4}>Medium-High</option>
                    <option value={5}>High</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-300">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={2}
                  value={newTaskData.description}
                  onChange={handleTaskInputChange}
                  className="block w-full px-3 py-2 mt-1 text-gray-300 bg-gray-800/50 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  placeholder="Details about the task..."
                />
              </div>
              
              <div className="mt-4">
                <label htmlFor="ai_instructions" className="block text-sm font-medium text-gray-300">
                  AI Instructions
                </label>
                <textarea
                  id="ai_instructions"
                  name="ai_instructions"
                  rows={2}
                  value={newTaskData.ai_instructions}
                  onChange={handleTaskInputChange}
                  className="block w-full px-3 py-2 mt-1 text-gray-300 bg-gray-800/50 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                  placeholder="Special instructions for the AI agent..."
                />
              </div>
              
              <div className="flex justify-end mt-4">
                <button
                  type="submit"
                  disabled={savingTask}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600/80 rounded-md border border-purple-500/30 shadow-sm hover:bg-purple-600/90 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-colors"
                >
                  {savingTask ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          )}
          
          {loadingTasks ? (
            <div className="p-6 text-center text-gray-500">
              Loading tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No tasks created for this lead yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-400 uppercase">
                      Title
                    </th>
                    <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-400 uppercase">
                      Type
                    </th>
                    <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-400 uppercase">
                      Scheduled
                    </th>
                    <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-400 uppercase">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-400 uppercase">
                      Priority
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-900/50 divide-y divide-gray-800">
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td className="px-3 py-2 text-xs text-gray-300 whitespace-nowrap">
                        {task.title}
                      </td>
                      <td className="px-3 py-2 text-xs capitalize text-gray-300 whitespace-nowrap">
                        {task.task_type}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-300 whitespace-nowrap">
                        {new Date(task.scheduled_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-xs capitalize whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          task.status === 'pending' ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50' :
                          task.status === 'in_progress' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50' :
                          task.status === 'completed' ? 'bg-green-900/50 text-green-300 border border-green-700/50' :
                          task.status === 'failed' ? 'bg-red-900/50 text-red-300 border border-red-700/50' :
                          'bg-gray-800 text-gray-300 border border-gray-700'
                        }`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-300 whitespace-nowrap">
                        {task.priority === 5 ? 'High' :
                          task.priority === 4 ? 'Medium-High' :
                          task.priority === 3 ? 'Medium' :
                          task.priority === 2 ? 'Medium-Low' :
                          'Low'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadDetails;