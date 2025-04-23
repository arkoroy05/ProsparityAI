import { supabase } from './supabase';

/**
 * Add a document to the company's knowledge base
 * @param {Object} document - Document to add
 * @returns {Promise<Object>} - Result of adding the document
 */
export async function addDocument(document) {
  try {
    const { companyId, title, content, category, source, tags = [] } = document;

    if (!companyId || !title || !content) {
      throw new Error('Missing required fields: companyId, title, content');
    }

    const { data, error } = await supabase
      .from('knowledge_base')
      .insert([
        {
          company_id: companyId,
          title,
          content,
          category: category || 'general',
          source: source || null,
          tags
        }
      ])
      .select();

    if (error) throw error;

    return {
      success: true,
      message: 'Document added to knowledge base',
      document: data[0]
    };
  } catch (error) {
    console.error('Error adding document to knowledge base:', error);
    return {
      success: false,
      message: error.message || 'Failed to add document to knowledge base'
    };
  }
}

/**
 * Update a document in the knowledge base
 * @param {string} documentId - ID of the document to update
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} - Result of updating the document
 */
export async function updateDocument(documentId, updates) {
  try {
    const { title, content, category, source, tags } = updates;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;
    if (source !== undefined) updateData.source = source;
    if (tags !== undefined) updateData.tags = tags;

    const { data, error } = await supabase
      .from('knowledge_base')
      .update(updateData)
      .eq('id', documentId)
      .select();

    if (error) throw error;

    return {
      success: true,
      message: 'Document updated successfully',
      document: data[0]
    };
  } catch (error) {
    console.error('Error updating knowledge base document:', error);
    return {
      success: false,
      message: error.message || 'Failed to update document'
    };
  }
}

/**
 * Delete a document from the knowledge base
 * @param {string} documentId - ID of the document to delete
 * @returns {Promise<Object>} - Result of deleting the document
 */
export async function deleteDocument(documentId) {
  try {
    const { error } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('id', documentId);

    if (error) throw error;

    return {
      success: true,
      message: 'Document deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting knowledge base document:', error);
    return {
      success: false,
      message: error.message || 'Failed to delete document'
    };
  }
}

/**
 * Get all documents in a company's knowledge base
 * @param {string} companyId - ID of the company
 * @param {Object} filters - Optional filters (category, tags)
 * @returns {Promise<Object>} - Result with documents
 */
export async function getDocuments(companyId, filters = {}) {
  try {
    let query = supabase
      .from('knowledge_base')
      .select('*')
      .eq('company_id', companyId);

    // Apply filters if provided
    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    const { data, error } = await query;

    if (error) throw error;

    return {
      success: true,
      documents: data || []
    };
  } catch (error) {
    console.error('Error fetching knowledge base documents:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch documents',
      documents: []
    };
  }
}

/**
 * Search for documents in the knowledge base
 * @param {string} companyId - ID of the company
 * @param {string} query - Search query
 * @returns {Promise<Object>} - Result with matching documents
 */
export async function searchDocuments(companyId, query) {
  try {
    if (!query || query.trim() === '') {
      return getDocuments(companyId);
    }

    // Search in title and content
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('company_id', companyId)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`);

    if (error) throw error;

    return {
      success: true,
      documents: data || []
    };
  } catch (error) {
    console.error('Error searching knowledge base:', error);
    return {
      success: false,
      message: error.message || 'Failed to search documents',
      documents: []
    };
  }
}

/**
 * Import documents in bulk to the knowledge base
 * @param {string} companyId - ID of the company
 * @param {Array} documents - Array of document objects to import
 * @returns {Promise<Object>} - Result of the import
 */
export async function importDocuments(companyId, documents) {
  try {
    if (!Array.isArray(documents) || documents.length === 0) {
      throw new Error('No valid documents to import');
    }

    // Prepare documents for insertion
    const formattedDocs = documents.map(doc => ({
      company_id: companyId,
      title: doc.title || 'Untitled Document',
      content: doc.content || '',
      category: doc.category || 'general',
      source: doc.source || null,
      tags: doc.tags || []
    }));

    const { data, error } = await supabase
      .from('knowledge_base')
      .insert(formattedDocs)
      .select();

    if (error) throw error;

    return {
      success: true,
      message: `Successfully imported ${data.length} documents`,
      documents: data
    };
  } catch (error) {
    console.error('Error importing documents to knowledge base:', error);
    return {
      success: false,
      message: error.message || 'Failed to import documents'
    };
  }
}

/**
 * Get document categories for a company
 * @param {string} companyId - ID of the company
 * @returns {Promise<Object>} - Result with categories
 */
export async function getCategories(companyId) {
  try {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('category')
      .eq('company_id', companyId)
      .order('category');

    if (error) throw error;

    // Extract unique categories
    const categories = [...new Set(data.map(doc => doc.category))];

    return {
      success: true,
      categories
    };
  } catch (error) {
    console.error('Error fetching knowledge base categories:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch categories',
      categories: []
    };
  }
}

const knowledgeBase = {
  addDocument,
  updateDocument,
  deleteDocument,
  getDocuments,
  searchDocuments,
  importDocuments,
  getCategories
};

export default knowledgeBase; 