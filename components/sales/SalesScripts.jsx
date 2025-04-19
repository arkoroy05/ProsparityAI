import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const SalesScripts = ({ companyId }) => {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingScript, setEditingScript] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'email',
    tags: ''
  });

  useEffect(() => {
    if (companyId) {
      fetchScripts();
    }
  }, [companyId]);

  const fetchScripts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sales_scripts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setScripts(data || []);
    } catch (error) {
      console.error('Error fetching sales scripts:', error);
      setError('Failed to load sales scripts.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);
      
      if (editingScript) {
        // Update existing script
        const { error } = await supabase
          .from('sales_scripts')
          .update({
            title: formData.title,
            content: formData.content,
            type: formData.type,
            tags: tagsArray,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingScript.id);
        
        if (error) throw error;
      } else {
        // Create new script
        const { error } = await supabase
          .from('sales_scripts')
          .insert({
            title: formData.title,
            content: formData.content,
            type: formData.type,
            tags: tagsArray,
            company_id: companyId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (error) throw error;
      }
      
      // Reset form and fetch updated scripts
      resetForm();
      fetchScripts();
    } catch (error) {
      console.error('Error saving script:', error);
      setError('Failed to save script.');
    }
  };

  const handleEdit = (script) => {
    setEditingScript(script);
    setFormData({
      title: script.title,
      content: script.content,
      type: script.type,
      tags: Array.isArray(script.tags) ? script.tags.join(', ') : script.tags
    });
    setShowForm(true);
  };

  const handleDelete = async (scriptId) => {
    if (!confirm('Are you sure you want to delete this script?')) return;
    
    try {
      const { error } = await supabase
        .from('sales_scripts')
        .delete()
        .eq('id', scriptId);
      
      if (error) throw error;
      
      // Update the scripts list
      setScripts((prevScripts) => prevScripts.filter(script => script.id !== scriptId));
    } catch (error) {
      console.error('Error deleting script:', error);
      setError('Failed to delete script.');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      type: 'email',
      tags: ''
    });
    setEditingScript(null);
    setShowForm(false);
  };

  const getTypeLabel = (type) => {
    const types = {
      email: 'Email',
      call: 'Call Script',
      message: 'Message',
      meeting: 'Meeting Talking Points'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900">Sales Scripts</h3>
        <div className="mt-4 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 border rounded-md animate-pulse">
              <div className="w-1/3 h-5 bg-gray-200 rounded"></div>
              <div className="w-full h-20 mt-3 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Sales Scripts</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
        >
          {showForm ? 'Cancel' : 'Add New Script'}
        </button>
      </div>
      
      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}
      
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-md bg-gray-50">
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="email">Email</option>
              <option value="call">Call Script</option>
              <option value="message">Message</option>
              <option value="meeting">Meeting Talking Points</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g. follow-up, cold outreach, objection handling"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">
              Script Content
            </label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              required
              rows={8}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Write your sales script here. You can use variables like {{lead_name}}, {{company_name}}, etc."
            ></textarea>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              {editingScript ? 'Update Script' : 'Save Script'}
            </button>
          </div>
        </form>
      )}
      
      <div className="space-y-4">
        {scripts.length === 0 ? (
          <p className="text-sm text-gray-500">No sales scripts yet. Create your first one!</p>
        ) : (
          scripts.map((script) => (
            <div key={script.id} className="p-4 border rounded-md">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-medium text-gray-900">{script.title}</h4>
                  <div className="flex items-center mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                      {getTypeLabel(script.type)}
                    </span>
                    {script.tags && Array.isArray(script.tags) && script.tags.map((tag, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(script)}
                    className="inline-flex items-center p-1 border border-transparent rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(script.id)}
                    className="inline-flex items-center p-1 border border-transparent rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="mt-2 border-t pt-2">
                <pre className="whitespace-pre-wrap text-sm text-gray-600 font-sans">
                  {script.content}
                </pre>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SalesScripts; 