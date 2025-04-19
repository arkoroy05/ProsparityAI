import { supabase } from './supabase';

// Function to create a new company
export const createCompany = async (companyData, userId) => {
  try {
    // Add owner_id to company data
    const fullCompanyData = {
      ...companyData,
      owner_id: userId
    };
    
    const { data, error } = await supabase
      .from('companies')
      .insert(fullCompanyData)
      .select('*')
      .single();
    
    if (error) throw error;
    
    return { success: true, company: data };
  } catch (error) {
    console.error('Error creating company:', error);
    return { error: error.message };
  }
};

// Function to get a company by ID
export const getCompanyById = async (companyId) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();
    
    if (error) throw error;
    
    return { success: true, company: data };
  } catch (error) {
    console.error('Error getting company:', error);
    return { error: error.message };
  }
};

// Function to get companies by owner ID
export const getCompaniesByOwner = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return { success: true, companies: data };
  } catch (error) {
    console.error('Error getting companies for user:', error);
    return { error: error.message };
  }
};

// Function to update company details
export const updateCompany = async (companyId, updates) => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', companyId)
      .select('*')
      .single();
    
    if (error) throw error;
    
    return { success: true, company: data };
  } catch (error) {
    console.error('Error updating company:', error);
    return { error: error.message };
  }
};

// Function to get leads and tasks metrics for a company
export const getCompanyMetrics = async (companyId) => {
  try {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const metrics = {
      leads: {},
      tasks: {},
      calls: {},
      totalLeads: 0,
      totalTasks: 0,
      totalCalls: 0
    };

    // Get leads count by status
    try {
      const { data: leads, error: leadError } = await supabase
        .from('leads')
        .select('status')
        .eq('company_id', companyId);
      
      if (leadError) {
        console.error('Error fetching leads:', leadError);
      } else {
        metrics.leads = processStatusCounts(leads);
        metrics.totalLeads = Object.values(metrics.leads).reduce((a, b) => a + b, 0);
      }
    } catch (error) {
      console.error('Error processing leads:', error);
    }

    // Get tasks count by status
    try {
      const { data: tasks, error: taskError } = await supabase
        .from('tasks')
        .select('status')
        .eq('company_id', companyId);
      
      if (taskError) {
        console.error('Error fetching tasks:', taskError);
      } else {
        metrics.tasks = processStatusCounts(tasks);
        metrics.totalTasks = Object.values(metrics.tasks).reduce((a, b) => a + b, 0);
      }
    } catch (error) {
      console.error('Error processing tasks:', error);
    }

    // Check if calls table exists before querying
    try {
      const { data: tableExists } = await supabase
        .from('calls')
        .select('id')
        .limit(1);
      
      if (tableExists !== null) {
        const { data: calls, error: callError } = await supabase
          .from('calls')
          .select('status')
          .eq('company_id', companyId);
        
        if (callError) {
          console.error('Error fetching calls:', callError);
        } else {
          metrics.calls = processStatusCounts(calls);
          metrics.totalCalls = Object.values(metrics.calls).reduce((a, b) => a + b, 0);
        }
      }
    } catch (error) {
      // Silently ignore if calls table doesn't exist
      console.log('Calls table not available yet');
    }

    return metrics;
  } catch (error) {
    console.error('Error getting company metrics:', error.message || error);
    throw error;
  }
};

// Helper function to process status counts
const processStatusCounts = (data) => {
  if (!data || !Array.isArray(data)) return {};
  
  const counts = {};
  data.forEach(item => {
    if (item && item.status) {
      counts[item.status] = (counts[item.status] || 0) + 1;
    }
  });
  return counts;
};

// Function to parse products/services from CSV
export const parseProductsFromCSV = (csvText) => {
  try {
    if (!csvText) return [];
    
    return csvText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        const [name, description, price] = line.split(',').map(item => item.trim());
        return { name, description, price: price ? parseFloat(price) : null };
      });
  } catch (error) {
    console.error('Error parsing products CSV:', error);
    return [];
  }
}; 