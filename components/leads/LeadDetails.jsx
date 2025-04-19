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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="relative w-full max-w-3xl p-6 mx-4 bg-white rounded-lg shadow-xl">
        <button
          onClick={onClose}
          className="absolute text-gray-400 top-4 right-4 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Lead Details</h2>
          
          <div className="flex space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Save
                </button>
              </>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2">
          <div>
            <h3 className="mb-3 text-lg font-medium text-gray-900">Basic Information</h3>
            
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                    Company
                  </label>
                  <input
                    type="text"
                    id="company_name"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="designation" className="block text-sm font-medium text-gray-700">
                    Job Title
                  </label>
                  <input
                    type="text"
                    id="designation"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-medium text-gray-500">Full Name</h4>
                  <p className="text-sm text-gray-900">{lead.name}</p>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-gray-500">Email</h4>
                  <p className="text-sm text-gray-900">{lead.email || '-'}</p>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-gray-500">Phone</h4>
                  <p className="text-sm text-gray-900">{lead.phone || '-'}</p>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-gray-500">Company</h4>
                  <p className="text-sm text-gray-900">{lead.company_name || '-'}</p>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-gray-500">Job Title</h4>
                  <p className="text-sm text-gray-900">{lead.designation || '-'}</p>
                </div>
              </div>
            )}
          </div>
          
          <div>
            <h3 className="mb-3 text-lg font-medium text-gray-900">Status & Scoring</h3>
            
            <div className="p-4 mb-4 bg-gray-50 rounded-md">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-medium text-gray-500">Status</h4>
                  <div className="mt-1">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${statusColors[lead.status] || 'bg-gray-100'}`}>
                      {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                    </span>
                  </div>
                </div>
                
                <div>
                  <select
                    value={lead.status}
                    onChange={(e) => onStatusChange(lead.id, e.target.value)}
                    className="block px-3 py-1 text-sm border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                  <h4 className="text-xs font-medium text-gray-500">Lead Score</h4>
                  {lead.score !== null && lead.score !== undefined ? (
                    <div className="mt-1">
                      <span 
                        className={`inline-block px-3 py-1 text-sm font-medium rounded ${
                          lead.score >= 70 ? 'bg-green-100 text-green-800' : 
                          lead.score <= 30 ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'
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
                    className="px-3 py-1 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200"
                  >
                    {lead.score !== null && lead.score !== undefined ? 'Rescore' : 'Score Now'}
                  </button>
                </div>
              </div>
              
              {lead.classification && (
                <div className="mt-3">
                  <h4 className="text-xs font-medium text-gray-500">Classification</h4>
                  <p className="mt-1 text-sm font-medium capitalize text-gray-700">
                    {lead.classification}
                  </p>
                </div>
              )}
            </div>
            
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-700">Notes</h4>
              {isEditing ? (
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Add notes about this lead..."
                />
              ) : (
                <p className="text-sm text-gray-600">
                  {lead.notes || 'No notes added yet.'}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="pt-4 mt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
            
            <button
              onClick={() => setShowNewTaskForm(!showNewTaskForm)}
              className="flex items-center px-3 py-1 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {showNewTaskForm ? 'Cancel' : 'New Task'}
            </button>
          </div>
          
          {showNewTaskForm && (
            <form onSubmit={handleCreateTask} className="p-4 mb-4 bg-gray-50 rounded-md">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    value={newTaskData.title}
                    onChange={handleTaskInputChange}
                    className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Follow up call"
                  />
                </div>
                
                <div>
                  <label htmlFor="task_type" className="block text-sm font-medium text-gray-700">
                    Task Type *
                  </label>
                  <select
                    id="task_type"
                    name="task_type"
                    required
                    value={newTaskData.task_type}
                    onChange={handleTaskInputChange}
                    className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="message">Message</option>
                    <option value="meeting">Meeting</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="scheduled_at" className="block text-sm font-medium text-gray-700">
                    Schedule For *
                  </label>
                  <input
                    type="datetime-local"
                    id="scheduled_at"
                    name="scheduled_at"
                    required
                    value={newTaskData.scheduled_at}
                    onChange={handleTaskInputChange}
                    className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                    Priority
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={newTaskData.priority}
                    onChange={handleTaskInputChange}
                    className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={2}
                  value={newTaskData.description}
                  onChange={handleTaskInputChange}
                  className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Details about the task..."
                />
              </div>
              
              <div className="mt-4">
                <label htmlFor="ai_instructions" className="block text-sm font-medium text-gray-700">
                  AI Instructions
                </label>
                <textarea
                  id="ai_instructions"
                  name="ai_instructions"
                  rows={2}
                  value={newTaskData.ai_instructions}
                  onChange={handleTaskInputChange}
                  className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Special instructions for the AI agent..."
                />
              </div>
              
              <div className="flex justify-end mt-4">
                <button
                  type="submit"
                  disabled={savingTask}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Title
                    </th>
                    <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Type
                    </th>
                    <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Scheduled
                    </th>
                    <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-2 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Priority
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tasks.map((task) => (
                    <tr key={task.id}>
                      <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">
                        {task.title}
                      </td>
                      <td className="px-3 py-2 text-xs capitalize text-gray-900 whitespace-nowrap">
                        {task.task_type}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">
                        {new Date(task.scheduled_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-xs capitalize text-gray-900 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full
                          ${task.status === 'pending' ? 'bg-blue-100 text-blue-800' :
                            task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            task.status === 'completed' ? 'bg-green-100 text-green-800' :
                            task.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'}`}
                        >
                          {task.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap">
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