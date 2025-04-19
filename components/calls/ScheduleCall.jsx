import { useState } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';

const ScheduleCall = ({ lead, companyId, onSuccess, onCancel }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [objective, setObjective] = useState('');
  const [notes, setNotes] = useState('');

  // Generate default date/time values (tomorrow at 10 AM)
  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow;
  };

  // Format to YYYY-MM-DD
  const formatDate = (date) => {
    return format(date, 'yyyy-MM-dd');
  };

  // Format to HH:mm
  const formatTime = (date) => {
    return format(date, 'HH:mm');
  };

  // Set default values
  useState(() => {
    const defaultDate = getTomorrow();
    setScheduleDate(formatDate(defaultDate));
    setScheduleTime(formatTime(defaultDate));
    setObjective(`Follow up with ${lead?.name || 'lead'}`);
  }, [lead]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Combine date and time into ISO string
      const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
      
      // Validate scheduled time is in the future
      if (scheduledDateTime <= new Date()) {
        throw new Error('Scheduled time must be in the future');
      }

      const scheduledTime = scheduledDateTime.toISOString();

      const response = await fetch('/api/calls/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leadId: lead.id,
          companyId,
          scheduledTime,
          objective,
          notes,
          phoneNumber: lead.phone || lead.mobile || lead.telephone
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to schedule call');
      }

      if (onSuccess) {
        onSuccess(data);
      } else {
        // Default success action - redirect to tasks
        router.push('/tasks');
      }
    } catch (err) {
      console.error('Error scheduling call:', err);
      setError(err.message || 'Failed to schedule call');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Schedule AI Call</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="leadName" className="block text-sm font-medium text-gray-700">
            Lead
          </label>
          <input
            type="text"
            id="leadName"
            value={lead?.name || 'Unknown Lead'}
            disabled
            className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm text-gray-700"
          />
        </div>

        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <input
            type="text"
            id="phoneNumber"
            value={lead?.phone || lead?.mobile || lead?.telephone || 'No phone number'}
            disabled
            className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm text-gray-700"
          />
          {!lead?.phone && !lead?.mobile && !lead?.telephone && (
            <p className="mt-1 text-sm text-red-600">
              No phone number available. Please update the lead information first.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="scheduleDate" className="block text-sm font-medium text-gray-700">
              Date
            </label>
            <input
              type="date"
              id="scheduleDate"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="scheduleTime" className="block text-sm font-medium text-gray-700">
              Time
            </label>
            <input
              type="time"
              id="scheduleTime"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="objective" className="block text-sm font-medium text-gray-700">
            Call Objective
          </label>
          <input
            type="text"
            id="objective"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            required
            placeholder="e.g., Follow up on pricing discussion"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes for AI (Optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add any specific instructions or context for the AI to use during the call"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div className="flex justify-end space-x-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
          )}
          
          <button
            type="submit"
            disabled={loading || (!lead?.phone && !lead?.mobile && !lead?.telephone)}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
          >
            {loading ? 'Scheduling...' : 'Schedule Call'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScheduleCall; 