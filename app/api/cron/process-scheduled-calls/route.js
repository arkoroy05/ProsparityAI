import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { executeTask } from '@/lib/task-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    console.log('Processing scheduled calls...');

    // Get current time
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    // Fetch tasks that are scheduled to be executed
    const { data: tasks, error: fetchError } = await supabase
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
      .eq('status', 'pending')
      .eq('task_type', 'call')
      .gte('scheduled_at', fiveMinutesAgo.toISOString())
      .lte('scheduled_at', fiveMinutesFromNow.toISOString());

    if (fetchError) {
      console.error('Error fetching scheduled tasks:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${tasks?.length || 0} tasks to process`);

    // Process each task
    const results = await Promise.all(
      (tasks || []).map(async (task) => {
        try {
          console.log(`Processing task ${task.id} for lead ${task.leads?.name}`);
          
          // Execute the task
          const result = await executeTask(task.id);
          
          // Log the result
          console.log(`Task ${task.id} execution result:`, result);
          
          return {
            taskId: task.id,
            leadName: task.leads?.name,
            success: result.success,
            message: result.message || result.error
          };
        } catch (error) {
          console.error(`Error processing task ${task.id}:`, error);
          return {
            taskId: task.id,
            leadName: task.leads?.name,
            success: false,
            message: error.message
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      processed: results.length,
      results
    });
  } catch (error) {
    console.error('Error in process-scheduled-calls:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 