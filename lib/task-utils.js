import { supabase } from './supabase';
import { makeCall, sendSMS } from './twilio';

// Function to create a new task
export const createTask = async (taskData, leadId, companyId, userId) => {
  try {
    if (!leadId) {
      throw new Error('Lead ID is required');
    }
    
    if (!companyId) {
      throw new Error('Company ID is required');
    }
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Ensure priority is a number between 1 and 5
    let priority = parseInt(taskData.priority, 10);
    
    // If priority is invalid, set it to default value of 3
    if (isNaN(priority) || priority < 1 || priority > 5) {
      console.warn(`Invalid priority value: ${taskData.priority}. Setting to default value of 3.`);
      priority = 3;
    }

    // Add required fields to task data
    const fullTaskData = {
      ...taskData,
      type: taskData.task_type || taskData.type || 'other',
      task_type: taskData.task_type || taskData.type || 'other',
      lead_id: leadId,
      company_id: companyId,
      assigned_to: userId,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      scheduled_at: taskData.scheduled_at || new Date().toISOString(),
      status: 'pending',
      priority: priority, // Using the validated integer priority
      title: taskData.title || 'New Task',
      metadata: taskData.metadata || {}
    };
    
    console.log('Creating task with data:', {
      ...fullTaskData,
      priority: {
        value: fullTaskData.priority,
        type: typeof fullTaskData.priority
      }
    });
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([fullTaskData])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error creating task:', {
        error: {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        },
        taskData: {
          ...fullTaskData,
          priority: {
            value: fullTaskData.priority,
            type: typeof fullTaskData.priority
          }
        }
      });
      throw error;
    }
    
    if (!data) {
      throw new Error('No data returned from insert operation');
    }

    console.log('Successfully created task:', data);
    
    return { success: true, task: data };
  } catch (error) {
    console.error('Error creating task:', {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      taskData: {
        ...taskData,
        priority: {
          original: taskData.priority,
          type: typeof taskData.priority
        }
      },
      leadId,
      companyId,
      userId
    });
    return { error: error.message || 'Failed to create task' };
  }
};

// Function to get tasks by company ID
export const getTasksByCompany = async (companyId) => {
  try {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

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
          status
        )
      `)
      .eq('company_id', companyId);
    
    if (error) {
      console.error('Supabase error getting tasks:', error.message);
      return { error: error.message };
    }
    
    if (!data) {
      console.log('No tasks found for company:', companyId);
      return { success: true, tasks: [] };
    }
    
    return { success: true, tasks: data };
  } catch (error) {
    console.error('Error getting tasks:', error.message || error);
    return { error: error.message || 'An unexpected error occurred' };
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
    // Log the exact input values
    console.log('Input values:', {
      taskId,
      status,
      statusType: typeof status,
      statusLength: status?.length,
      completedAt
    });

    if (!taskId) {
      console.error('Missing taskId');
      throw new Error('Task ID is required');
    }

    if (!status) {
      console.error('Missing status');
      throw new Error('Status is required');
    }

    // Define valid statuses that match the UI dropdown values
    const validStatuses = ['pending', 'in_progress', 'completed', 'failed', 'canceled'];
    
    // Normalize the status to match database values
    const normalizedStatus = status.toLowerCase().trim();
    
    console.log('Status validation:', {
      originalStatus: status,
      normalizedStatus,
      isValid: validStatuses.includes(normalizedStatus),
      validStatuses
    });

    if (!validStatuses.includes(normalizedStatus)) {
      console.error('Invalid status:', {
        received: status,
        normalized: normalizedStatus,
        validOptions: validStatuses
      });
      throw new Error(`Invalid status: "${status}". Must be one of: ${validStatuses.join(', ')}`);
    }

    const updates = {
      status: normalizedStatus,
      updated_at: new Date().toISOString()
    };

    if (completedAt || normalizedStatus === 'completed') {
      updates.completed_at = completedAt || new Date().toISOString();
    }

    console.log('Preparing to update task with:', { 
      taskId, 
      updates,
      updateString: JSON.stringify(updates)
    });

    const result = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select('*')
      .single();

    console.log('Supabase update result:', {
      data: result.data,
      error: result.error,
      status: result.status,
      statusText: result.statusText,
      errorString: result.error ? JSON.stringify(result.error) : null
    });

    if (result.error) {
      console.error('Raw Supabase error:', {
        error: result.error,
        errorString: JSON.stringify(result.error),
        errorCode: result.error?.code,
        errorMessage: result.error?.message
      });
      throw new Error(`Supabase error: ${JSON.stringify(result.error)}`);
    }

    if (!result.data) {
      console.error('No data returned from update');
      throw new Error('No data returned from update operation');
    }

    console.log('Successfully updated task:', result.data);
    return { success: true, task: result.data };
  } catch (error) {
    // Log the raw error first
    console.error('Raw caught error:', {
      error,
      errorString: JSON.stringify(error),
      errorMessage: error?.message,
      errorStack: error?.stack
    });
    
    // Then log our structured error
    console.error('Error updating task status:', {
      error: {
        message: error?.message || 'Unknown error',
        name: error?.name || 'Error',
        stack: error?.stack || 'No stack trace',
        raw: error
      },
      taskId,
      status,
      timestamp: new Date().toISOString()
    });
    
    return { 
      error: error?.message || 'Failed to update task status',
      details: {
        taskId,
        status,
        timestamp: new Date().toISOString(),
        rawError: error
      }
    };
  }
};

// Function to execute a task based on its type
export const executeTask = async (taskId) => {
  try {
    console.log('Starting task execution:', { taskId });

    // Get the task with lead information
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(`
        *,
        leads (
          id,
          name,
          email,
          phone,
          company_name
        )
      `)
      .eq('id', taskId)
      .single();
    
    if (taskError) {
      console.error('Error fetching task:', taskError);
      throw new Error(`Failed to fetch task: ${taskError.message}`);
    }

    if (!task) {
      throw new Error('Task not found');
    }

    console.log('Task details:', {
      id: task.id,
      type: task.task_type,
      leadName: task.leads?.name,
      hasPhone: !!task.leads?.phone
    });
    
    // Update task status to in_progress
    const { error: updateError } = await supabase
      .from('tasks')
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .eq('id', taskId);

    if (updateError) {
      console.error('Error updating task status:', updateError);
      throw new Error(`Failed to update task status: ${updateError.message}`);
    }
    
    // Execute task based on its type
    const taskType = task.task_type?.toLowerCase() || task.type?.toLowerCase();
    
    if (!taskType) {
      console.error('Task type is missing:', { task });
      throw new Error('Task type is required');
    }
    
    let result = { success: false, message: 'Task type not supported' };
    
    switch (taskType) {
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
        console.warn(`Task type ${taskType} not implemented yet`);
        throw new Error(`Task type ${taskType} not supported`);
    }
    
    // Update task status based on result
    const finalStatus = result.success ? 'completed' : 'failed';
    const { error: finalUpdateError } = await supabase
      .from('tasks')
      .update({ 
        status: finalStatus,
        completed_at: result.success ? new Date().toISOString() : null,
        metadata: {
          ...task.metadata,
          lastExecution: {
            timestamp: new Date().toISOString(),
            status: finalStatus,
            result: result
          }
        }
      })
      .eq('id', taskId);

    if (finalUpdateError) {
      console.error('Error updating final task status:', finalUpdateError);
    }
    
    return result;
  } catch (error) {
    console.error('Error executing task:', {
      taskId,
      error: {
        message: error.message,
        stack: error.stack
      }
    });
    
    // Update task status to failed
    try {
      await supabase
        .from('tasks')
        .update({ 
          status: 'failed',
          metadata: {
            lastError: error.message,
            errorTimestamp: new Date().toISOString()
          }
        })
        .eq('id', taskId);
    } catch (updateError) {
      console.error('Error updating task failure status:', updateError);
    }
    
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred'
    };
  }
};

// Function to execute a call task
const executeCallTask = async (task) => {
  try {
    console.log('Starting call task execution:', {
      taskId: task.id,
      taskType: task.task_type,
      lead: task.leads
    });
    
    // Validate task data
    if (!task || !task.leads) {
      console.error('Invalid task data:', { task });
      throw new Error('Invalid task data: Missing lead information');
    }

    const lead = task.leads;
    
    // Validate phone number
    if (!lead.phone) {
      console.error('Missing phone number for lead:', { leadId: lead.id, leadName: lead.name });
      throw new Error(`No phone number available for lead: ${lead.name}`);
    }

    // Clean and format the phone number (basic E.164 formatting)
    const cleanPhone = lead.phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`;
    
    // Get the application URL from environment or default
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const callbackUrl = `${baseUrl}/api/twilio/voice`;
    
    // Get the Twilio phone number
    const twilioPhoneNumber = process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER;
    
    console.log('Call preparation:', {
      to: formattedPhone,
      from: twilioPhoneNumber,
      callbackUrl,
      taskId: task.id,
      leadName: lead.name,
      envCheck: {
        ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? 'present' : 'missing',
        AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? 'present' : 'missing',
        TWILIO_PHONE: twilioPhoneNumber || 'missing'
      }
    });

    // Validate Twilio configuration
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !twilioPhoneNumber) {
      console.error('Missing Twilio configuration:', {
        hasSid: !!process.env.TWILIO_ACCOUNT_SID,
        hasToken: !!process.env.TWILIO_AUTH_TOKEN,
        hasPhone: !!twilioPhoneNumber,
        twilioPhone: twilioPhoneNumber
      });
      throw new Error('Twilio configuration is incomplete');
    }

    // Make the call
    const result = await makeCall(
      formattedPhone,
      twilioPhoneNumber,
      callbackUrl,
      {
        taskId: task.id,
        leadId: lead.id,
        leadName: lead.name
      }
    );
    
    console.log('Call initiation result:', {
      success: !!result.callSid,
      callSid: result.callSid,
      taskId: task.id,
      leadName: lead.name
    });

    if (result.error) {
      throw new Error(`Twilio error: ${result.error}`);
    }

    // Create call log entry
    try {
      const { error: logError } = await supabase
        .from('call_logs')
        .insert([{
          call_sid: result.callSid,
          task_id: task.id,
          lead_id: lead.id,
          status: 'initiated',
          notes: {
            initialStatus: 'initiated',
            timestamp: new Date().toISOString()
          }
        }]);

      if (logError) {
        console.error('Error creating call log:', logError);
      }
    } catch (logError) {
      console.error('Error creating call log:', logError);
      // Don't throw here - we still want to return success for the call itself
    }
    
    return { 
      success: true, 
      message: `Call initiated to ${lead.name}`,
      callSid: result.callSid
    };
  } catch (error) {
    console.error('Call task execution failed:', {
      error: error.message,
      stack: error.stack,
      task: {
        id: task?.id,
        type: task?.task_type,
        leadId: task?.lead_id
      }
    });
    
    // Update call status in database if needed
    try {
      await supabase
        .from('tasks')
        .update({ 
          status: 'failed',
          metadata: {
            ...task.metadata,
            lastError: error.message,
            errorTimestamp: new Date().toISOString()
          }
        })
        .eq('id', task.id);
    } catch (dbError) {
      console.error('Error updating task status:', dbError);
    }
    
    return { 
      success: false, 
      error: error.message || 'Failed to execute call task',
      details: {
        taskId: task?.id,
        leadId: task?.lead_id,
        timestamp: new Date().toISOString()
      }
    };
  }
};

// Function to execute an email task
const executeEmailTask = async (task) => {
  // Implementation of executeEmailTask
  throw new Error('Email task execution not implemented');
};

// Function to execute a message task
const executeMessageTask = async (task) => {
  // Implementation of executeMessageTask
  throw new Error('Message task execution not implemented');
};

export async function updateTask(supabase, taskId, updates) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error updating task:', error);
    return { success: false, error: error.message };
  }
}