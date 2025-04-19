import { useState, useEffect } from 'react';
import { getTasksByCompany, updateTaskStatus, executeTask } from '@/lib/task-utils';
import TaskForm from './TaskForm';

const statusColors = {
  pending: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  canceled: 'bg-gray-100 text-gray-800',
};

const TaskList = ({ companyId, userId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [executingTask, setExecutingTask] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    sortBy: 'scheduled_at',
    sortDir: 'asc',
    searchTerm: '',
  });

  useEffect(() => {
    fetchTasks();
  }, [companyId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { tasks: companyTasks, error: tasksError } = await getTasksByCompany(companyId);
      
      if (tasksError) throw new Error(tasksError);
      
      setTasks(companyTasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setError('Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreated = (newTask) => {
    setTasks((prev) => [...prev, newTask]);
    setShowNewTaskForm(false);
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const { task: updatedTask, error: updateError } = await updateTaskStatus(
        taskId,
        newStatus
      );
      
      if (updateError) throw new Error(updateError);
      
      // Update task in state
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? updatedTask : task))
      );
    } catch (error) {
      console.error('Error updating task status:', error);
      // Could add toast notification here
    }
  };

  const handleExecuteTask = async (taskId) => {
    try {
      setExecutingTask(taskId);
      
      const result = await executeTask(taskId);
      
      if (result.error) throw new Error(result.error);
      
      // Refresh tasks to see updated status
      fetchTasks();
      
      // Could add success notification here
    } catch (error) {
      console.error('Error executing task:', error);
      // Could add error notification here
    } finally {
      setExecutingTask(null);
    }
  };

  const handleFilterChange = (filterName, value) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  // Apply filters and sorting
  const filteredTasks = tasks
    .filter((task) => {
      // Status filter
      if (filters.status !== 'all' && task.status !== filters.status) {
        return false;
      }
      
      // Type filter
      if (filters.type !== 'all' && task.task_type !== filters.type) {
        return false;
      }
      
      // Search filter
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        return (
          task.title?.toLowerCase().includes(searchTerm) ||
          task.description?.toLowerCase().includes(searchTerm) ||
          task.leads?.name?.toLowerCase().includes(searchTerm) ||
          task.leads?.company_name?.toLowerCase().includes(searchTerm)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      const sortField = filters.sortBy;
      const sortDir = filters.sortDir === 'asc' ? 1 : -1;
      
      if (sortField === 'scheduled_at') {
        return sortDir * (new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0));
      } else if (sortField === 'priority') {
        return sortDir * ((b.priority || 0) - (a.priority || 0));
      } else if (sortField === 'title') {
        return sortDir * (a.title || '').localeCompare(b.title || '');
      }
      
      return 0;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
        <span className="ml-2 text-gray-600">Loading tasks...</span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white rounded-lg shadow">
      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100">
          {error}
        </div>
      )}
      
      <div className="flex flex-wrap items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center mb-3 space-x-3 sm:mb-0">
          <div>
            <label htmlFor="status-filter" className="block mb-1 text-xs font-medium text-gray-700">
              Status
            </label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="block w-full py-1 pl-3 pr-10 text-sm border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="type-filter" className="block mb-1 text-xs font-medium text-gray-700">
              Type
            </label>
            <select
              id="type-filter"
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="block w-full py-1 pl-3 pr-10 text-sm border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="message">Message</option>
              <option value="meeting">Meeting</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="sort-by" className="block mb-1 text-xs font-medium text-gray-700">
              Sort By
            </label>
            <select
              id="sort-by"
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="block w-full py-1 pl-3 pr-10 text-sm border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="scheduled_at">Schedule Date</option>
              <option value="priority">Priority</option>
              <option value="title">Title</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="sort-dir" className="block mb-1 text-xs font-medium text-gray-700">
              Order
            </label>
            <select
              id="sort-dir"
              value={filters.sortDir}
              onChange={(e) => handleFilterChange('sortDir', e.target.value)}
              className="block w-full py-1 pl-3 pr-10 text-sm border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="w-64">
            <label htmlFor="search" className="block mb-1 text-xs font-medium text-gray-700">
              Search
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search tasks..."
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              className="block w-full py-1 pl-3 pr-3 text-sm border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div className="mt-5">
            <button
              onClick={() => setShowNewTaskForm(true)}
              className="flex items-center px-4 py-1 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Task
            </button>
          </div>
        </div>
      </div>
      
      {showNewTaskForm && (
        <div className="p-4 border-b border-gray-200">
          <TaskForm
            companyId={companyId}
            userId={userId}
            onSuccess={handleTaskCreated}
            onCancel={() => setShowNewTaskForm(false)}
          />
        </div>
      )}
      
      {filteredTasks.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          {filters.status !== 'all' || filters.type !== 'all' || filters.searchTerm
            ? 'No tasks match your filters.'
            : 'No tasks found. Create a new task to get started.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Task
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Lead
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Schedule
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">
                  Priority
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTasks.map((task) => (
                <tr key={task.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="font-medium">{task.title}</div>
                    <div className="text-xs text-gray-500">
                      <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-800 capitalize">
                        {task.task_type}
                      </span>
                    </div>
                    {task.description && (
                      <div className="mt-1 text-xs text-gray-500">
                        {task.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div className="font-medium">{task.leads?.name}</div>
                    <div className="text-xs text-gray-500">
                      {task.leads?.company_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {task.leads?.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {new Date(task.scheduled_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        statusColors[task.status] || 'bg-gray-100'
                      }`}
                    >
                      {task.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                    <span
                      className={`inline-block w-8 py-1 text-xs font-medium rounded ${
                        task.priority >= 4
                          ? 'bg-red-100 text-red-800'
                          : task.priority === 3
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                    <div className="flex items-center justify-end space-x-2">
                      <select
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        className="px-2 py-1 text-xs border-gray-300 rounded focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                        <option value="canceled">Canceled</option>
                      </select>
                      
                      {(task.status === 'pending' || task.status === 'in_progress') && (
                        <button
                          onClick={() => handleExecuteTask(task.id)}
                          disabled={executingTask === task.id}
                          className="px-2 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 disabled:bg-indigo-300"
                        >
                          {executingTask === task.id ? 'Running...' : 'Execute'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TaskList; 