import { useState, useEffect } from 'react';
import { getTasksByCompany, updateTaskStatus, executeTask } from '@/lib/task-utils';
import TaskForm from './TaskForm';

const statusColors = {
  pending: 'bg-blue-900/30 text-blue-400 border border-blue-500/30',
  in_progress: 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30',
  completed: 'bg-green-900/30 text-green-400 border border-green-500/30',
  failed: 'bg-red-900/30 text-red-400 border border-red-500/30',
  canceled: 'bg-gray-800/30 text-gray-400 border border-gray-600/30',
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
      setError(null);
      
      const result = await executeTask(taskId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to execute task');
      }
      
      // Refresh tasks to see updated status
      await fetchTasks();
      
    } catch (error) {
      console.error('Error executing task:', error);
      setError(error.message);
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

  return (
    <div className="overflow-hidden bg-gray-900 rounded-lg border border-gray-800 shadow-xl">
      {error && (
        <div className="p-4 mb-4 text-sm text-red-400 bg-red-900/30 rounded-md border border-red-500/30">
          {error}
        </div>
      )}
      
      <div className="flex flex-wrap items-center justify-between p-4 border-b border-gray-800">
        <div className="flex flex-wrap gap-4 w-full lg:w-auto mb-4 lg:mb-0">
          <div>
            <label htmlFor="status-filter" className="block mb-1 text-xs font-medium text-gray-400">
              Status
            </label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="block w-full py-1 pl-3 pr-10 text-sm bg-gray-800 text-gray-300 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
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
            <label htmlFor="type-filter" className="block mb-1 text-xs font-medium text-gray-400">
              Type
            </label>
            <select
              id="type-filter"
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="block w-full py-1 pl-3 pr-10 text-sm bg-gray-800 text-gray-300 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
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
            <label htmlFor="sort-by" className="block mb-1 text-xs font-medium text-gray-400">
              Sort By
            </label>
            <select
              id="sort-by"
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="block w-full py-1 pl-3 pr-10 text-sm bg-gray-800 text-gray-300 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            >
              <option value="scheduled_at">Schedule Date</option>
              <option value="priority">Priority</option>
              <option value="title">Title</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="sort-dir" className="block mb-1 text-xs font-medium text-gray-400">
              Order
            </label>
            <select
              id="sort-dir"
              value={filters.sortDir}
              onChange={(e) => handleFilterChange('sortDir', e.target.value)}
              className="block w-full py-1 pl-3 pr-10 text-sm bg-gray-800 text-gray-300 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>

        <div className="w-full lg:w-auto">
          <div className="w-full lg:w-64">
            <label htmlFor="search" className="block mb-1 text-xs font-medium text-gray-400">
              Search
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search tasks..."
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              className="block w-full py-1 pl-3 pr-3 text-sm bg-gray-800 text-gray-300 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
            />
          </div>
        </div>

        <div className="w-full lg:w-auto mt-4 lg:mt-0">
          <button
            onClick={() => setShowNewTaskForm(true)}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600/80 rounded-md border border-purple-500/30 hover:bg-purple-600/90 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Task
          </button>
        </div>
      </div>

      {showNewTaskForm && (
        <div className="p-4 border-b border-gray-800">
          <TaskForm
            companyId={companyId}
            userId={userId}
            onSuccess={handleTaskCreated}
            onCancel={() => setShowNewTaskForm(false)}
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="w-8 h-8 border-4 border-purple-500/50 rounded-full border-t-transparent animate-spin"></div>
          <span className="ml-2 text-gray-400">Loading tasks...</span>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-6 text-center text-gray-400">
          {filters.status !== 'all' || filters.type !== 'all' || filters.searchTerm
            ? 'No tasks match your filters.'
            : 'No tasks found. Create a new task to get started.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-gray-900/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-400 uppercase">
                  Task
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-400 uppercase">
                  Lead
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-400 uppercase">
                  Schedule
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-400 uppercase">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-center text-gray-400 uppercase">
                  Priority
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium tracking-wider text-right text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="bg-gray-900/30 hover:bg-gray-800/50 transition-colors duration-150">
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-white">{task.title}</div>
                    <div className="text-xs">
                      <span className="inline-block px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700 capitalize">
                        {task.task_type}
                      </span>
                    </div>
                    {task.description && (
                      <div className="mt-1 text-xs text-gray-400">
                        {task.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium text-white">{task.leads?.name}</div>
                    <div className="text-xs text-gray-400">
                      {task.leads?.company_name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {task.leads?.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">
                    {new Date(task.scheduled_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[task.status]}`}>
                      {task.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center whitespace-nowrap">
                    <span
                      className={`inline-block w-8 py-1 text-xs font-medium rounded ${
                        task.priority >= 4
                          ? 'bg-red-900/30 text-red-400 border border-red-500/30'
                          : task.priority === 3
                          ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30'
                          : 'bg-green-900/30 text-green-400 border border-green-500/30'
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
                        className="px-2 py-1 text-xs bg-gray-800 text-gray-300 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
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
                          className="px-2 py-1 text-xs font-medium text-white bg-purple-600/80 rounded-md border border-purple-500/30 hover:bg-purple-600/90 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-1 focus:ring-offset-gray-900 disabled:bg-purple-600/30 disabled:border-purple-500/20 transition-colors duration-200"
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