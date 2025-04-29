import { supabase } from '@/lib/supabase';
import { isAuthenticated } from '@/lib/auth-utils';

export async function GET(request) {
  try {
    // Check authentication
    const session = await isAuthenticated();
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Fetch company_id from user's company association
    const { data: userData, error: userError } = await supabase
      .from('user_companies')
      .select('company_id')
      .eq('user_id', session.user.id)
      .single();

    if (userError) throw userError;

    // Fetch metrics from your analytics tables
    const { data: callsData, error: callsError } = await supabase
      .from('calls')
      .select('*')
      .eq('company_id', userData.company_id)
      .gte('created_at', from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .lte('created_at', to || new Date().toISOString());

    if (callsError) throw callsError;

    // Calculate metrics
    const metrics = {
      qualificationRate: 75, // Example calculation
      responseRate: 65, // Example calculation
      averageDuration: 420, // 7 minutes in seconds
      sentiments: {
        positive: 60,
        neutral: 30,
        negative: 10
      },
      objections: {
        'Price': 35,
        'Features': 25,
        'Timing': 20,
        'Competition': 15,
        'Other': 5
      },
      discussionTopics: {
        'Product Features': 40,
        'Pricing': 30,
        'Implementation': 20,
        'Support': 10
      },
      insightPriority: [
        {
          title: 'High Interest in New Features',
          description: 'Customers showing increased interest in advanced analytics capabilities.'
        },
        {
          title: 'Price Sensitivity Trend',
          description: 'Growing price sensitivity in mid-market segment.'
        },
        {
          title: 'Implementation Concerns',
          description: 'Common concerns about integration complexity.'
        }
      ]
    };

    return new Response(JSON.stringify({ metrics }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching insights:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
