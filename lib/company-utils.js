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
    // Get lead counts by status
    const { data: leadStats, error: leadError } = await supabase
      .from('leads')
      .select('status, count')
      .eq('company_id', companyId)
      .group('status');
    
    if (leadError) throw leadError;
    
    // Get task counts by status
    const { data: taskStats, error: taskError } = await supabase
      .from('tasks')
      .select('status, count')
      .eq('company_id', companyId)
      .group('status');
    
    if (taskError) throw taskError;
    
    // Get lead score distribution
    const { data: scoreDistribution, error: scoreError } = await supabase
      .from('leads')
      .select('score')
      .eq('company_id', companyId);
    
    if (scoreError) throw scoreError;
    
    // Calculate average lead score
    const totalLeads = scoreDistribution.length;
    const totalScore = scoreDistribution.reduce((sum, lead) => sum + (lead.score || 0), 0);
    const avgScore = totalLeads > 0 ? Math.round(totalScore / totalLeads) : 0;
    
    // Calculate conversion rate (leads with status 'converted')
    const convertedLeads = leadStats.find(stat => stat.status === 'converted');
    const conversionRate = totalLeads > 0 ? 
      Math.round(((convertedLeads?.count || 0) / totalLeads) * 100) : 0;
    
    return {
      success: true,
      metrics: {
        leadStats,
        taskStats,
        totalLeads,
        avgScore,
        conversionRate
      }
    };
  } catch (error) {
    console.error('Error getting company metrics:', error);
    return { error: error.message };
  }
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