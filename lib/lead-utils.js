import { supabase } from './supabase';

// Validation functions
const validateLeadData = (leadData) => {
  const errors = [];
  
  if (!leadData.name?.trim()) {
    errors.push('Name is required');
  }
  
  if (!leadData.email?.trim() && !leadData.phone?.trim()) {
    errors.push('Either email or phone number is required');
  }
  
  if (leadData.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadData.email)) {
    errors.push('Invalid email format');
  }
  
  return errors;
};

const validateIds = (companyId, userId) => {
  const errors = [];
  
  if (!companyId) {
    errors.push('Company ID is required');
  }
  
  if (!userId) {
    errors.push('User ID is required');
  }
  
  return errors;
};

// Function to add a single lead
export const addLead = async (leadData, companyId, userId) => {
  try {
    // Input validation
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('Adding lead with data:', {
      leadData,
      companyId,
      userId
    });

    // Validate lead data
    const validationErrors = validateLeadData(leadData);
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Add company_id and created_by to lead data
    const fullLeadData = {
      ...leadData,
      company_id: companyId,
      created_by: userId,
      user_id: userId,
      created_at: new Date().toISOString(),
      status: 'new',
      score: 0,
      classification: 'new',
      metadata: {}
    };
    
    console.log('Prepared lead data:', fullLeadData);

    // Insert into Supabase
    const { data, error } = await supabase
      .from('leads')
      .insert([fullLeadData])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error adding lead:', {
        error: {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        },
        leadData: fullLeadData
      });
      throw new Error(error.message || 'Failed to add lead');
    }
    
    if (!data) {
      throw new Error('No data returned from insert operation');
    }

    console.log('Successfully added lead:', data);
    
    return { 
      success: true, 
      lead: data 
    };
  } catch (error) {
    console.error('Error adding lead:', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      leadData,
      companyId,
      userId
    });
    return { 
      success: false,
      error: error.message || 'An unexpected error occurred while adding the lead'
    };
  }
};

// Function to add multiple leads from CSV data
export const addLeadsFromCsv = async (leadsData, companyId, userId) => {
  try {
    if (!Array.isArray(leadsData) || leadsData.length === 0) {
      throw new Error('Invalid or empty leads data array');
    }

    if (!companyId) {
      throw new Error('Company ID is required');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Validate each lead and format data
    const formattedLeads = leadsData.map((lead, index) => {
      const errors = validateLeadData(lead);
      if (errors.length > 0) {
        throw new Error(`Validation failed for lead ${index + 1}: ${errors.join(', ')}`);
      }

      return {
        ...lead,
        company_id: companyId,
        created_by: userId,
        created_at: new Date().toISOString(),
        status: 'new',
        score: 0,
        classification: 'new',
        metadata: {}
      };
    });
    
    const { data, error } = await supabase
      .from('leads')
      .insert(formattedLeads)
      .select();
    
    if (error) {
      console.error('Supabase error adding leads from CSV:', {
        error: {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        },
        leadsCount: formattedLeads.length
      });
      throw new Error(error.message || 'Failed to add leads');
    }
    
    if (!data) {
      throw new Error('No data returned from bulk insert operation');
    }
    
    return { success: true, leads: data, count: data.length };
  } catch (error) {
    console.error('Error adding leads from CSV:', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      leadsCount: leadsData?.length,
      companyId,
      userId
    });
    return { 
      success: false,
      error: error.message || 'An unexpected error occurred while adding leads'
    };
  }
};

// Function to get leads by company ID
export const getLeadsByCompany = async (companyId) => {
  try {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('company_id', companyId);
    
    if (error) {
      console.error('Supabase error getting leads:', error.message);
      return { error: error.message };
    }
    
    if (!data) {
      console.log('No leads found for company:', companyId);
      return { success: true, leads: [] };
    }
    
    return { success: true, leads: data };
  } catch (error) {
    console.error('Error getting leads:', error.message || error);
    return { error: error.message || 'An unexpected error occurred' };
  }
};

// Function to update lead status and score
export const updateLeadStatus = async (leadId, status, score) => {
  try {
    const updates = {};
    if (status) updates.status = status;
    if (score !== undefined) updates.score = score;
    
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId)
      .select('*')
      .single();
    
    if (error) throw error;
    
    return { success: true, lead: data };
  } catch (error) {
    console.error('Error updating lead status:', error);
    return { error: error.message };
  }
};

// Function to classify a lead based on scoring model
export const classifyLead = async (leadId, classificationData) => {
  try {
    const { score, classification, metadata } = classificationData;
    
    const { data, error } = await supabase
      .from('leads')
      .update({
        score,
        classification,
        metadata: metadata || {},
      })
      .eq('id', leadId)
      .select('*')
      .single();
    
    if (error) throw error;
    
    return { success: true, lead: data };
  } catch (error) {
    console.error('Error classifying lead:', error);
    return { error: error.message };
  }
};

// Function to get a lead scoring model
export const getLeadScoringModel = async (companyId) => {
  try {
    // In a real app, this might come from the database
    // For MVP, we'll use a basic model
    return {
      success: true,
      model: {
        weights: {
          companySize: 0.3,
          industry: 0.25,
          jobTitle: 0.2,
          engagementLevel: 0.15,
          budget: 0.1
        },
        thresholds: {
          qualified: 70,
          unqualified: 30
        }
      }
    };
  } catch (error) {
    console.error('Error getting lead scoring model:', error);
    return { error: error.message };
  }
};

// Function to apply the scoring model to a lead
export const scoreLeadWithModel = async (leadId, leadData, scoringModel) => {
  try {
    // This would be replaced with actual AI-based scoring
    // For MVP, we'll use a simple weighted scoring
    let totalScore = 0;
    const { weights, thresholds } = scoringModel;
    
    // Sample scoring logic - this would be more sophisticated in real app
    if (leadData.company_name) totalScore += 20 * weights.companySize;
    if (leadData.designation) totalScore += 15 * weights.jobTitle;
    if (leadData.email && leadData.phone) totalScore += 25 * weights.engagementLevel;
    
    // Random factor for demo purposes
    totalScore += Math.floor(Math.random() * 30);
    
    // Cap the score at 100
    totalScore = Math.min(100, Math.round(totalScore));
    
    // Determine classification
    let classification = 'neutral';
    if (totalScore >= thresholds.qualified) {
      classification = 'qualified';
    } else if (totalScore <= thresholds.unqualified) {
      classification = 'unqualified';
    }
    
    // Update lead with score and classification
    return await classifyLead(leadId, {
      score: totalScore,
      classification,
      metadata: {
        scoringFactors: {
          companySize: leadData.company_name ? 'present' : 'missing',
          jobTitle: leadData.designation ? 'present' : 'missing',
          contactInfo: (leadData.email && leadData.phone) ? 'complete' : 'incomplete'
        }
      }
    });
  } catch (error) {
    console.error('Error scoring lead with model:', error);
    return { error: error.message };
  }
};

export async function updateLead(supabase, leadId, updates) {
  try {
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating lead:', error);
    return { success: false, error: error.message };
  }
} 