import { useState, useEffect } from 'react';
import { getLeadsByCompany } from '@/lib/lead-utils';
import { createTask } from '@/lib/task-utils';

const TaskForm = ({ companyId, userId, onSuccess, onCancel, leadId }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'call',
    scheduled_at: new Date(new Date().getTime() + 60 * 60 * 1000).toISOString().slice(0, 16), // Default to 1 hour from now
    priority: 3, // Initialize as number
    lead_id: leadId || '',
    ai_instructions: '',
  });
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fetchingLeads, setFetchingLeads] = useState(false);

  // Fetch leads on component mount
  useEffect(() => {
    if (!leadId) {
      fetchLeads();
    }
  }, [companyId, leadId]);

  const fetchLeads = async () => {
    try {
      setFetchingLeads(true);
      
      const { leads: companyLeads, error: leadsError } = await getLeadsByCompany(companyId);
      
      if (leadsError) throw new Error(leadsError);
      
      setLeads(companyLeads || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      setError('Failed to load leads. Please try again.');
    } finally {
      setFetchingLeads(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle priority as a number
    if (name === 'priority') {
      const numValue = Number(value);
      if (!isNaN(numValue) && numValue >= 1 && numValue <= 5) {
        setFormData((prev) => ({ ...prev, priority: numValue }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Validate form
      if (!formData.title) {
        throw new Error('Task title is required');
      }
      
      if (!formData.lead_id && !leadId) {
        throw new Error('Please select a lead for this task');
      }

      // Ensure priority is a valid number
      if (typeof formData.priority !== 'number' || formData.priority < 1 || formData.priority > 5) {
        throw new Error('Invalid priority value. Must be a number between 1 and 5');
      }

      // Debug log
      console.log('Submitting task with data:', {
        ...formData,
        priority: {
          value: formData.priority,
          type: typeof formData.priority
        }
      });
      
      // Create task
      const { task, error: taskError } = await createTask(
        formData,
        formData.lead_id || leadId,
        companyId,
        userId
      );
      
      if (taskError) throw new Error(taskError);
      
      // Notify parent component
      if (onSuccess) {
        onSuccess(task);
      }
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        type: 'call',
        scheduled_at: new Date(new Date().getTime() + 60 * 60 * 1000).toISOString().slice(0, 16),
        priority: 3,
        lead_id: leadId || '',
        ai_instructions: '',
      });
    } catch (error) {
      console.error('Error creating task:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-900/50 rounded-lg border border-gray-800 shadow-lg">
      <h3 className="mb-4 text-lg font-medium bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">Create New Task</h3>
      
      {error && (
        <div className="p-4 mb-4 text-sm text-red-400 bg-red-900/30 rounded-md border border-red-500/30">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
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
              value={formData.title}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 text-gray-300 bg-gray-800/50 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
              placeholder="Follow up call"
            />
          </div>
          
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-300">
              Task Type *
            </label>
            <select
              id="type"
              name="type"
              required
              value={formData.type}
              onChange={handleChange}
              className="block w-full px-3 py-2 mt-1 text-gray-300 bg-gray-800/50 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            >
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="message">Message</option>
              <option value="meeting">Meeting</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          {!leadId && (
            <div>
              <label htmlFor="lead_id" className="block text-sm font-medium text-gray-300">
                Lead *
              </label>
              <select
                id="lead_id"
                name="lead_id"
                required
                value={formData.lead_id}
                onChange={handleChange}
                disabled={fetchingLeads}
                className="block w-full px-3 py-2 mt-1 text-gray-300 bg-gray-800/50 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 disabled:bg-gray-800/30 disabled:border-gray-700/50"
              >
                <option value="">Select a lead</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name} {lead.company_name ? `(${lead.company_name})` : ''}
                  </option>
                ))}
              </select>
              {fetchingLeads && (
                <p className="mt-1 text-xs text-gray-500">Loading leads...</p>
              )}
            </div>
          )}
          
          <div>
            <label htmlFor="scheduled_at" className="block text-sm font-medium text-gray-300">
              Schedule For *
            </label>
            <input
              type="datetime-local"
              id="scheduled_at"
              name="scheduled_at"
              required
              value={formData.scheduled_at}
              onChange={handleChange}
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
              value={formData.priority}
              onChange={handleChange}
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
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            value={formData.description}
            onChange={handleChange}
            className="block w-full px-3 py-2 mt-1 text-gray-300 bg-gray-800/50 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            placeholder="Details about the task..."
          />
        </div>
        
        <div>
          <label htmlFor="ai_instructions" className="block text-sm font-medium text-gray-300">
            AI Instructions
          </label>
          <textarea
            id="ai_instructions"
            name="ai_instructions"
            rows={3}
            value={formData.ai_instructions}
            onChange={handleChange}
            className="block w-full px-3 py-2 mt-1 text-gray-300 bg-gray-800/50 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            placeholder="Special instructions for the AI agent..."
          />
          <p className="mt-1 text-xs text-gray-500">
            Provide specific instructions for the AI to follow when executing this task, such as talking points, questions to ask, or information to collect.
          </p>
        </div>
        
        <div className="flex justify-end space-x-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800/80 border border-gray-700 rounded-md shadow-sm hover:bg-gray-800/90 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors duration-200"
            >
              Cancel
            </button>
          )}
          
          <button
            type="submit"
            disabled={loading || (fetchingLeads && !leadId)}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600/80 border border-purple-500/30 rounded-md shadow-sm hover:bg-purple-600/90 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:bg-purple-600/30 disabled:border-purple-500/20 transition-colors duration-200"
          >
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TaskForm;