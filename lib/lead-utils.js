import { supabase } from './supabase';

// Function to add a single lead
export const addLead = async (leadData, companyId, userId) => {
  try {
    // Add company_id and created_by to lead data
    const fullLeadData = {
      ...leadData,
      company_id: companyId,
      created_by: userId
    };
    
    const { data, error } = await supabase
      .from('leads')
      .insert(fullLeadData)
      .select('*')
      .single();
    
    if (error) throw error;
    
    return { success: true, lead: data };
  } catch (error) {
    console.error('Error adding lead:', error);
    return { error: error.message };
  }
};

// Function to add multiple leads from CSV data
export const addLeadsFromCsv = async (leadsData, companyId, userId) => {
  try {
    // Format leads data with company_id and created_by
    const formattedLeads = leadsData.map(lead => ({
      ...lead,
      company_id: companyId,
      created_by: userId
    }));
    
    const { data, error } = await supabase
      .from('leads')
      .insert(formattedLeads)
      .select('*');
    
    if (error) throw error;
    
    return { success: true, leads: data, count: data.length };
  } catch (error) {
    console.error('Error adding leads from CSV:', error);
    return { error: error.message };
  }
};

// Function to get leads by company ID
export const getLeadsByCompany = async (companyId) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    return { success: true, leads: data };
  } catch (error) {
    console.error('Error getting leads:', error);
    return { error: error.message };
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