import { supabase } from './supabase';
import { aiAgent } from './ai-agent';

class CallScheduler {
  constructor() {
    this.jobs = new Map();
    this.initialize();
  }

  async initialize() {
    // Load existing scheduled calls
    const { data: scheduledCalls } = await supabase
      .from('scheduled_calls')
      .select('*')
      .eq('status', 'scheduled');

    if (scheduledCalls) {
      for (const call of scheduledCalls) {
        this.scheduleCall(call);
      }
    }

    // Set up real-time subscription for new scheduled calls
    const channel = supabase
      .channel('scheduled_calls_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'scheduled_calls',
        },
        (payload) => {
          this.scheduleCall(payload.new);
        }
      )
      .subscribe();
  }

  async scheduleCall(call) {
    const scheduledTime = new Date(call.scheduled_at).getTime();
    const now = Date.now();

    if (scheduledTime <= now) {
      // Call is due now or in the past
      await this.executeCall(call);
    } else {
      // Schedule for future
      const delay = scheduledTime - now;
      const timeoutId = setTimeout(() => this.executeCall(call), delay);
      this.jobs.set(call.id, timeoutId);
    }
  }

  async executeCall(call) {
    try {
      // Update status to in-progress
      await supabase
        .from('scheduled_calls')
        .update({ status: 'in-progress' })
        .eq('id', call.id);

      // Get lead and company info
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', call.lead_id)
        .single();

      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', call.company_id)
        .single();

      if (!lead || !company) {
        throw new Error('Lead or company not found');
      }

      // Execute the call
      const result = await aiAgent.execute(
        `Make a call to ${lead.name}`,
        {
          leadInfo: lead,
          companyInfo: company,
        }
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      // Update status to completed
      await supabase
        .from('scheduled_calls')
        .update({ status: 'completed' })
        .eq('id', call.id);

      // Remove job from tracking
      this.jobs.delete(call.id);
    } catch (error) {
      console.error('Error executing scheduled call:', error);

      // Update status to failed
      await supabase
        .from('scheduled_calls')
        .update({ status: 'failed' })
        .eq('id', call.id);

      // Remove job from tracking
      this.jobs.delete(call.id);
    }
  }

  cancelCall(callId) {
    const timeoutId = this.jobs.get(callId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.jobs.delete(callId);
    }
  }
}

export const callScheduler = new CallScheduler(); 
import { aiAgent } from './ai-agent';

class CallScheduler {
  constructor() {
    this.jobs = new Map();
    this.initialize();
  }

  async initialize() {
    // Load existing scheduled calls
    const { data: scheduledCalls } = await supabase
      .from('scheduled_calls')
      .select('*')
      .eq('status', 'scheduled');

    if (scheduledCalls) {
      for (const call of scheduledCalls) {
        this.scheduleCall(call);
      }
    }

    // Set up real-time subscription for new scheduled calls
    const channel = supabase
      .channel('scheduled_calls_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'scheduled_calls',
        },
        (payload) => {
          this.scheduleCall(payload.new);
        }
      )
      .subscribe();
  }

  async scheduleCall(call) {
    const scheduledTime = new Date(call.scheduled_at).getTime();
    const now = Date.now();

    if (scheduledTime <= now) {
      // Call is due now or in the past
      await this.executeCall(call);
    } else {
      // Schedule for future
      const delay = scheduledTime - now;
      const timeoutId = setTimeout(() => this.executeCall(call), delay);
      this.jobs.set(call.id, timeoutId);
    }
  }

  async executeCall(call) {
    try {
      // Update status to in-progress
      await supabase
        .from('scheduled_calls')
        .update({ status: 'in-progress' })
        .eq('id', call.id);

      // Get lead and company info
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', call.lead_id)
        .single();

      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', call.company_id)
        .single();

      if (!lead || !company) {
        throw new Error('Lead or company not found');
      }

      // Execute the call
      const result = await aiAgent.execute(
        `Make a call to ${lead.name}`,
        {
          leadInfo: lead,
          companyInfo: company,
        }
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      // Update status to completed
      await supabase
        .from('scheduled_calls')
        .update({ status: 'completed' })
        .eq('id', call.id);

      // Remove job from tracking
      this.jobs.delete(call.id);
    } catch (error) {
      console.error('Error executing scheduled call:', error);

      // Update status to failed
      await supabase
        .from('scheduled_calls')
        .update({ status: 'failed' })
        .eq('id', call.id);

      // Remove job from tracking
      this.jobs.delete(call.id);
    }
  }

  cancelCall(callId) {
    const timeoutId = this.jobs.get(callId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.jobs.delete(callId);
    }
  }
}

export const callScheduler = new CallScheduler(); 