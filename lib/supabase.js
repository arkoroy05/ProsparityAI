import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create an authenticated client for server-side operations
export const createServerSupabaseClient = (context) => {
  if (!context) return supabase;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${context.req?.headers?.authorization || ''}`,
        },
      },
    }
  );
};

// Helper function to get data with error handling
export async function fetchData(tableName, query) {
  try {
    let supabaseQuery = supabase.from(tableName).select(query.select || '*');

    // Apply filters if provided
    if (query.filters) {
      query.filters.forEach(filter => {
        if (filter.eq) {
          supabaseQuery = supabaseQuery.eq(filter.column, filter.eq);
        } else if (filter.in) {
          supabaseQuery = supabaseQuery.in(filter.column, filter.in);
        } else if (filter.like) {
          supabaseQuery = supabaseQuery.like(filter.column, filter.like);
        }
      });
    }

    // Apply ordering if provided
    if (query.order) {
      supabaseQuery = supabaseQuery.order(query.order.column, {
        ascending: query.order.ascending,
      });
    }

    // Apply pagination if provided
    if (query.range) {
      if (query.range.limit) {
        supabaseQuery = supabaseQuery.limit(query.range.limit);
      }
      if (query.range.offset) {
        supabaseQuery = supabaseQuery.range(
          query.range.offset,
          query.range.offset + (query.range.limit || 10) - 1
        );
      }
    }

    const { data, error } = await supabaseQuery;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error(`Error fetching data from ${tableName}:`, error);
    return { data: null, error };
  }
}

// Helper function to create data with error handling
export async function createData(tableName, data, returnData = true) {
  try {
    let query = supabase.from(tableName).insert(data);
    
    if (returnData) {
      query = query.select();
    }
    
    const { data: result, error } = await query;

    if (error) throw error;
    return { data: result, error: null };
  } catch (error) {
    console.error(`Error creating data in ${tableName}:`, error);
    return { data: null, error };
  }
}

// Helper function to update data with error handling
export async function updateData(tableName, id, data, returnData = true) {
  try {
    let query = supabase.from(tableName).update(data).eq('id', id);
    
    if (returnData) {
      query = query.select();
    }
    
    const { data: result, error } = await query;

    if (error) throw error;
    return { data: result, error: null };
  } catch (error) {
    console.error(`Error updating data in ${tableName}:`, error);
    return { data: null, error };
  }
}

// Helper function to delete data with error handling
export async function deleteData(tableName, id) {
  try {
    const { error } = await supabase.from(tableName).delete().eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error(`Error deleting data from ${tableName}:`, error);
    return { error };
  }
} 