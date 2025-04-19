import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import TaskList from '@/components/tasks/TaskList';
import TaskForm from '@/components/tasks/TaskForm';

const TasksPage = ({ user, companyId }) => {
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTaskCreated = () => {
    // Trigger a refresh of the task list
    setRefreshKey(prev => prev + 1);
    // Hide the form
    setShowForm(false);
  };

  const handleCancel = () => {
    setShowForm(false);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your tasks and follow-ups with leads.
          </p>
        </div>
        
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {showForm ? 'Cancel' : 'Create Task'}
        </button>
      </div>

      {/* Task form */}
      {showForm ? (
        <div className="mb-6">
          <TaskForm
            companyId={companyId}
            userId={user?.id}
            onSuccess={handleTaskCreated}
            onCancel={handleCancel}
          />
        </div>
      ) : (
        <TaskList 
          key={refreshKey} 
          companyId={companyId} 
          userId={user?.id} 
        />
      )}
    </div>
  );
};

// Apply dashboard layout
TasksPage.getLayout = (page) => {
  return <DashboardLayout {...page.props}>{page}</DashboardLayout>;
};

export default TasksPage; 