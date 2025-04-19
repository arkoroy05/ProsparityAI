import { supabase } from './supabase';
import { makeCall, sendSMS } from './twilio';

// Function to create a new task
export const createTask = async (taskData, leadId, companyId, userId) => {
  try {
    // Add required fields to task data
    const fullTaskData = {
      ...taskData,
      lead_id: leadId,
      company_id: companyId,
      assigned_to: userId
    };
    
    const { data, error } = await supabase
      .from('tasks')
      .insert(fullTaskData)
      .select('*')
      .single();
    
    if (error) throw error;
    
    return { success: true, task: data };
  } catch (error) {
    console.error('Error creating task:', error);
    return { error: error.message };
  }
};

// Function to get tasks by company ID
export const getTasksByCompany = async (companyId) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        leads:lead_id (
          id,
          name,
          email,
          phone,
          company_name,
          designation,
          status,
          score
        )
      `)
      .eq('company_id', companyId)
      .order('scheduled_at', { ascending: true });
    
    if (error) throw error;
    
    return { success: true, tasks: data };
  } catch (error) {
    console.error('Error getting tasks:', error);
    return { error: error.message };
  }
};

// Function to get tasks by lead ID
export const getTasksByLead = async (leadId) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('lead_id', leadId)
      .order('scheduled_at', { ascending: true });
    
    if (error) throw error;
    
    return { success: true, tasks: data };
  } catch (error) {
    console.error('Error getting tasks for lead:', error);
    return { error: error.message };
  }
};

// Function to update a task's status
export const updateTaskStatus = async (taskId, status, completedAt = null) => {
  try {
    const updates = { status };
    if (completedAt || status === 'completed') {
      updates.completed_at = completedAt || new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select('*')
      .single();
    
    if (error) throw error;
    
    return { success: true, task: data };
  } catch (error) {
    console.error('Error updating task status:', error);
    return { error: error.message };
  }
};

// Function to execute a task based on its type
export const executeTask = async (taskId) => {
  try {
    // Get the task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`
        *,
        leads:lead_id (
          id,
          name,
          email,
          phone,
          company_name
        )
      `)
      .eq('id', taskId)
      .single();
    
    if (taskError) throw taskError;
    
    // Update task status to in_progress
    await updateTaskStatus(taskId, 'in_progress');
    
    let result = { success: false, message: 'Task type not supported' };
    
    // Execute task based on its type
    switch (task.task_type) {
      case 'call':
        result = await executeCallTask(task);
        break;
      case 'email':
        result = await executeEmailTask(task);
        break;
      case 'message':
        result = await executeMessageTask(task);
        break;
      default:
        console.log(`Task type ${task.task_type} not implemented yet`);
    }
    
    // Update task status based on result
    if (result.success) {
      await updateTaskStatus(taskId, 'completed');
    } else {
      await updateTaskStatus(taskId, 'failed');
    }
    
    return result;
  } catch (error) {
    console.error('Error executing task:', error);
    
    // Update task status to failed
    await updateTaskStatus(taskId, 'failed');
    
    return { error: error.message };
  }
};

// Function to execute a call task
const executeCallTask = async (task) => {
  try {
    // Get the lead information
    const lead = task.leads;
    if (!lead || !lead.phone) {
      return { 
        success: false, 
        message: 'Lead phone number not available' 
      };
    }
    
    // In a real app, this would use a TwiML script with AI logic
    const callbackUrl = 'https://your-app.com/api/twilio/voice-handler';
    
    // Make the call
    const callResult = await makeCall(
      lead.phone,
      process.env.TWILIO_PHONE_NUMBER,
      callbackUrl
    );
    
    if (callResult.error) {
      throw new Error(callResult.error);
    }
    
    // Log the call
    const { error: logError } = await supabase
      .from('call_logs')
      .insert({
        call_sid: callResult.callSid,
        task_id: task.id,
        lead_id: lead.id,
        status: 'initiated'
      });
    
    if (logError) throw logError;
    
    return { 
      success: true, 
      message: `Call initiated to ${lead.name}`,
      callSid: callResult.callSid
    };
  } catch (error) {
    console.error('Error executing call task:', error);
    return { error: error.message };
  }
};

// Function to execute an email task
const executeEmailTask = async (task) => {
  try {
    // Get the lead information
    const lead = task.leads;
    if (!lead || !lead.email) {
      return { 
        success: false, 
        message: 'Lead email not available' 
      };
    }
    
    // In a real app, this would send an email with personalized content
    // For MVP, we'll simulate success
    console.log(`Email would be sent to ${lead.email}`);
    
    return { 
      success: true, 
      message: `Email sent to ${lead.name} at ${lead.email}` 
    };
  } catch (error) {
    console.error('Error executing email task:', error);
    return { error: error.message };
  }
};

// Function to execute a message task
const executeMessageTask = async (task) => {
  try {
    // Get the lead information
    const lead = task.leads;
    if (!lead || !lead.phone) {
      return { 
        success: false, 
        message: 'Lead phone number not available' 
      };
    }
    
    // Send message via Twilio
    // This would be more sophisticated in a real app
    const messageBody = `Hello ${lead.name}, this is a follow-up message from our team. We'd love to discuss how we can help ${lead.company_name || 'your company'}.`;
    
    const smsResult = await sendSMS(
      lead.phone,
      process.env.TWILIO_PHONE_NUMBER,
      messageBody
    );
    
    if (smsResult.error) {
      throw new Error(smsResult.error);
    }
    
    return { 
      success: true, 
      message: `Message sent to ${lead.name}`,
      messageSid: smsResult.messageSid
    };
  } catch (error) {
    console.error('Error executing message task:', error);
    return { error: error.message };
  }
}; 