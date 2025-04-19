import React, { useState, useEffect } from 'react';
import { getDocuments, addDocument, updateDocument, deleteDocument, searchDocuments } from '@/lib/knowledge-base';

const KnowledgeBase = ({ companyId }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    source: '',
    tags: []
  });
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);

  // Fetch documents
  useEffect(() => {
    if (companyId) {
      fetchDocuments();
    }
  }, [companyId]);

  // Extract categories from documents
  useEffect(() => {
    const uniqueCategories = [...new Set(documents.map(doc => doc.category))];
    setCategories(uniqueCategories);
  }, [documents]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      
      const filters = {};
      if (selectedCategory) {
        filters.category = selectedCategory;
      }
      
      let result;
      if (searchQuery.trim()) {
        result = await searchDocuments(companyId, searchQuery);
      } else {
        result = await getDocuments(companyId, filters);
      }
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch knowledge base');
      }
      
      setDocuments(result.documents);
    } catch (err) {
      console.error('Error fetching knowledge base:', err);
      setError(err.message || 'Failed to fetch knowledge base');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDocuments();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTagsChange = (e) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, tags }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'general',
      source: '',
      tags: []
    });
    setEditingDocument(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      let result;
      
      if (editingDocument) {
        // Update existing document
        result = await updateDocument(editingDocument.id, formData);
      } else {
        // Add new document
        result = await addDocument({
          ...formData,
          companyId
        });
      }
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to save document');
      }
      
      // Refresh document list
      await fetchDocuments();
      
      // Reset form
      resetForm();
      setShowAddForm(false);
    } catch (err) {
      console.error('Error saving document:', err);
      setError(err.message || 'Failed to save document');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (document) => {
    setFormData({
      title: document.title || '',
      content: document.content || '',
      category: document.category || 'general',
      source: document.source || '',
      tags: document.tags || []
    });
    setEditingDocument(document);
    setShowAddForm(true);
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await deleteDocument(documentId);
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete document');
      }
      
      // Refresh document list
      await fetchDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      setError(err.message || 'Failed to delete document');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    // Refresh with new category filter
    fetchDocuments();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Knowledge Base</h2>
        <button 
          onClick={() => {
            resetForm();
            setShowAddForm(!showAddForm);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {showAddForm ? 'Cancel' : 'Add Document'}
        </button>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingDocument ? 'Edit Document' : 'Add New Document'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Examples: product, pricing, competition, faq
              </p>
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                Content
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                required
                rows={6}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="source" className="block text-sm font-medium text-gray-700">
                Source (Optional)
              </label>
              <input
                type="text"
                id="source"
                name="source"
                value={formData.source}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                Tags (Optional)
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags.join(', ')}
                onChange={handleTagsChange}
                placeholder="Enter tags separated by commas"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
              >
                {loading ? 'Saving...' : editingDocument ? 'Update Document' : 'Add Document'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        {/* Search form */}
        <div className="sm:flex-1">
          <form onSubmit={handleSearch} className="flex">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge base..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Search
            </button>
          </form>
        </div>

        {/* Category filter */}
        <div>
          <select
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && documents.length === 0 ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-3 text-gray-600">Loading knowledge base...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8 bg-white shadow rounded-lg">
          <p className="text-gray-600">No documents found in your knowledge base.</p>
          <p className="text-gray-600 mt-2">Click "Add Document" to create your first entry.</p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {documents.map((doc) => (
              <li key={doc.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{doc.title}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mr-2">
                        {doc.category}
                      </span>
                      {doc.source && (
                        <span className="text-gray-500 text-xs">Source: {doc.source}</span>
                      )}
                    </p>
                    <div className="mt-2 text-sm text-gray-700">
                      {doc.content.length > 200 ? `${doc.content.substring(0, 200)}...` : doc.content}
                    </div>
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="mt-2">
                        {doc.tags.map(tag => (
                          <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mr-1 mb-1">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(doc)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase; 