import { supabase } from './supabase';

export const setupDatabase = async () => {
  try {
    // Create profiles table if not exists
    const { error: profilesError } = await supabase.rpc('create_profiles_table_if_not_exists');
    if (profilesError) throw profilesError;

    // Create companies table if not exists
    const { error: companiesError } = await supabase.rpc('create_companies_table_if_not_exists');
    if (companiesError) throw companiesError;

    // Create leads table if not exists
    const { error: leadsError } = await supabase.rpc('create_leads_table_if_not_exists');
    if (leadsError) throw leadsError;

    // Create tasks table if not exists
    const { error: tasksError } = await supabase.rpc('create_tasks_table_if_not_exists');
    if (tasksError) throw tasksError;

    // Create call_logs table if not exists
    const { error: callLogsError } = await supabase.rpc('create_call_logs_table_if_not_exists');
    if (callLogsError) throw callLogsError;

    console.log('Database schema successfully set up');
    return { success: true };
  } catch (error) {
    console.error('Error setting up database schema:', error);
    return { error: error.message };
  }
};

// Function to create the database schema and stored procedures
export const createDatabaseSchema = async () => {
  try {
    // Create stored procedures for table creation
    await supabase.rpc('create_db_setup_functions');

    // Call the stored procedures to create tables
    return await setupDatabase();
  } catch (error) {
    console.error('Error creating database schema:', error);
    return { error: error.message };
  }
};

// Function to initialize stored procedures
export const initializeStoredProcedures = async () => {
  try {
    const { error } = await supabase.from('stored_procedures').select('*').maybeSingle();
    
    if (error) {
      // Create the stored procedures table and initialize procedures
      await supabase.rpc('initialize_stored_procedures');
      console.log('Stored procedures initialized');
      return { success: true };
    }
    
    console.log('Stored procedures already initialized');
    return { success: true };
  } catch (error) {
    console.error('Error initializing stored procedures:', error);
    return { error: error.message };
  }
}; 