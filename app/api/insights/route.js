export async function GET(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get company ID from user
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!companyUser?.company_id) {
      return Response.json({ error: 'No company found' }, { status: 404 });
    }

    // Get calls for the company
    const { data: calls, error: callError } = await supabase
      .from('call_logs')
      .select(`
        *,
        leads (
          *,
          ai_insights
        )
      `)
      .eq('company_id', companyUser.company_id)
      .order('created_at', { ascending: false });

    if (callError) {
      console.error('Error fetching calls:', callError);
      return Response.json({ error: 'Failed to fetch calls' }, { status: 500 });
    }

    // Get all leads for the company for comprehensive insights
    const { data: leads, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('company_id', companyUser.company_id);

    if (leadError) {
      console.error('Error fetching leads:', leadError);
      return Response.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    // Process and analyze the data
    const metrics = await processInsights(calls, leads);

    return Response.json({ metrics }, { status: 200 });
  } catch (error) {
    console.error('Error in insights API:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processInsights(calls, leads) {
  // Initialize metrics object
  const metrics = {
    totalCalls: calls.length,
    totalLeads: leads.length,
    averageDuration: 0,
    qualificationRate: 0,
    responseRate: 0,
    objections: {},
    discussionTopics: {},
    sentiments: {
      positive: 0,
      neutral: 0,
      negative: 0
    },
    insightPriority: [],
    callTrends: {
      daily: [],
      weekly: []
    },
    topPerformingScripts: [],
    commonPainPoints: []
  };

  // Process call metrics
  if (calls.length > 0) {
    metrics.averageDuration = calls.reduce((acc, call) => acc + (call.duration || 0), 0) / calls.length;

    // Calculate call trends
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    
    // Daily trends
    const dailyCalls = {};
    calls.forEach(call => {
      const date = new Date(call.created_at).toISOString().split('T')[0];
      dailyCalls[date] = (dailyCalls[date] || 0) + 1;
    });

    metrics.callTrends.daily = Object.entries(dailyCalls)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Weekly trends
    const weeklyCalls = {};
    calls.forEach(call => {
      const date = new Date(call.created_at);
      const week = `${date.getFullYear()}-W${Math.ceil((date.getDate() + date.getDay()) / 7)}`;
      weeklyCalls[week] = (weeklyCalls[week] || 0) + 1;
    });

    metrics.callTrends.weekly = Object.entries(weeklyCalls)
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  // Process leads with AI insights
  const leadsWithInsights = leads.filter(lead => lead.ai_insights);
  let totalResponses = 0;

  leadsWithInsights.forEach(lead => {
    const insights = safeParseAIInsights(lead.ai_insights);
    if (!insights) return;

    // Update qualification metrics
    if (insights.interest === 'high' || insights.interest === 'medium') {
      metrics.qualificationRate++;
    }

    // Track responses
    if (insights.conversationHistory?.length > 0) {
      totalResponses++;
    }

    // Process objections
    if (insights.objections) {
      insights.objections.forEach(obj => {
        metrics.objections[obj] = (metrics.objections[obj] || 0) + 1;
      });
    }

    // Process discussion topics
    if (insights.topics) {
      insights.topics.forEach(topic => {
        metrics.discussionTopics[topic] = (metrics.discussionTopics[topic] || 0) + 1;
      });
    }

    // Process sentiment
    if (insights.interest === 'high') metrics.sentiments.positive++;
    else if (insights.interest === 'none') metrics.sentiments.negative++;
    else metrics.sentiments.neutral++;

    // Track pain points
    if (insights.painPoints) {
      insights.painPoints.forEach(point => {
        const existingPoint = metrics.commonPainPoints.find(p => p.point === point);
        if (existingPoint) {
          existingPoint.count++;
        } else {
          metrics.commonPainPoints.push({ point, count: 1 });
        }
      });
    }
  });

  // Calculate percentages
  metrics.qualificationRate = leadsWithInsights.length > 0 
    ? (metrics.qualificationRate / leadsWithInsights.length) * 100 
    : 0;

  metrics.responseRate = leadsWithInsights.length > 0
    ? (totalResponses / leadsWithInsights.length) * 100
    : 0;

  // Sort pain points by frequency
  metrics.commonPainPoints.sort((a, b) => b.count - a.count);

  // Generate prioritized insights
  metrics.insightPriority = generatePrioritizedInsights(metrics);

  return metrics;
}

function safeParseAIInsights(insights) {
  try {
    return typeof insights === 'string' ? JSON.parse(insights) : insights;
  } catch (error) {
    console.error('Error parsing AI insights:', error);
    return null;
  }
}

function generatePrioritizedInsights(metrics) {
  const insights = [];

  // Analyze qualification rate
  if (metrics.qualificationRate > 70) {
    insights.push({
      title: 'High Lead Quality',
      description: 'Your leads are showing strong interest. Consider increasing follow-up frequency.',
      priority: 'high'
    });
  } else if (metrics.qualificationRate < 30) {
    insights.push({
      title: 'Lead Quality Improvement Needed',
      description: 'Consider refining your targeting criteria and messaging approach.',
      priority: 'high'
    });
  }

  // Analyze objections
  const topObjections = Object.entries(metrics.objections)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  if (topObjections.length > 0) {
    insights.push({
      title: 'Common Objections',
      description: `Top objections: ${topObjections.map(([obj]) => obj).join(', ')}. Consider addressing these in initial outreach.`,
      priority: 'medium'
    });
  }

  // Analyze sentiment trends
  const totalSentiments = metrics.sentiments.positive + metrics.sentiments.neutral + metrics.sentiments.negative;
  const positiveRate = totalSentiments > 0 ? (metrics.sentiments.positive / totalSentiments) * 100 : 0;

  if (positiveRate > 60) {
    insights.push({
      title: 'Positive Sentiment Trend',
      description: 'Strong positive sentiment in conversations. Maintain current approach.',
      priority: 'low'
    });
  } else if (positiveRate < 30) {
    insights.push({
      title: 'Sentiment Improvement Needed',
      description: 'Consider reviewing conversation scripts and objection handling approaches.',
      priority: 'high'
    });
  }

  return insights;
}
