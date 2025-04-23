import React from 'react';
import { Heading, Box, Text, SimpleGrid, Card, CardHeader, CardContent, Spinner, Alert, AlertIcon, Badge } from '@/components/ui';
import { Container } from '@/components/ui/container';
import { getUser, requireAuth } from '@/lib/auth-utils';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { MetricCard } from '@/components/insights/MetricCard';

export const metadata = {
  title: 'Insights | ProsparityAI',
  description: 'View insights and analytics from your AI sales calls'
};

// Helper to calculate average call duration
function calculateAverageDuration(callLogs) {
  if (!callLogs || callLogs.length === 0) return 0;
  
  const callsWithDuration = callLogs.filter(log => log.duration);
  if (callsWithDuration.length === 0) return 0;
  
  const totalDuration = callsWithDuration.reduce((sum, log) => sum + log.duration, 0);
  return totalDuration / callsWithDuration.length;
}

// Helper to safely parse AI insights
function safeParseAIInsights(lead) {
  try {
    if (!lead.ai_insights) return null;
    
    // If ai_insights is a string, try to parse it
    const insights = typeof lead.ai_insights === 'string' 
      ? JSON.parse(lead.ai_insights)
      : lead.ai_insights;
      
    return insights;
  } catch (error) {
    console.error('Error parsing AI insights:', error);
    return null;
  }
}

// Helper to extract metrics from AI insights
function extractMetricsFromInsights(leads) {
  // Initialize counters
  const metrics = {
    qualificationRate: 0,
    responseRate: 0,
    objections: {},
    leadSources: {},
    sentiments: {
      positive: 0,
      neutral: 0,
      negative: 0
    },
    discussionTopics: {},
    insightPriority: []
  };
  
  if (!leads || leads.length === 0) return metrics;
  
  // Process each lead with safe parsing
  leads.forEach(lead => {
    const insights = safeParseAIInsights(lead);
    if (!insights) return; // Skip leads with invalid insights
    
    // Update qualification rate
    if (insights.classification?.interest === 'high' || insights.classification?.interest === 'medium') {
      metrics.qualificationRate++;
    }
    
    // Update response rate
    if (insights.classification?.conversationHistory?.length > 0) {
      metrics.responseRate++;
    }
    
    // Process objections safely
    const objections = insights.classification?.objections || [];
    objections.forEach(objection => {
      if (typeof objection === 'string') {
        metrics.objections[objection] = (metrics.objections[objection] || 0) + 1;
      }
    });
    
    // Process lead source
    const source = lead.source || 'Unknown';
    metrics.leadSources[source] = (metrics.leadSources[source] || 0) + 1;
    
    // Process sentiment
    if (insights.classification?.interest === 'high') {
      metrics.sentiments.positive += 1;
    } else if (insights.classification?.interest === 'none') {
      metrics.sentiments.negative += 1;
    } else {
      metrics.sentiments.neutral += 1;
    }
    
    // Process insights safely
    const insightsList = insights.classification?.insights || [];
    insightsList.forEach(insight => {
      if (typeof insight !== 'string') return;
      
      if (insight.includes('team size')) {
        metrics.discussionTopics['Team Size'] = (metrics.discussionTopics['Team Size'] || 0) + 1;
      }
      if (insight.includes('budget') || insight.includes('price') || insight.includes('cost')) {
        metrics.discussionTopics['Budget/Pricing'] = (metrics.discussionTopics['Budget/Pricing'] || 0) + 1;
      }
      if (insight.includes('feature') || insight.includes('product')) {
        metrics.discussionTopics['Product Features'] = (metrics.discussionTopics['Product Features'] || 0) + 1;
      }
      if (insight.includes('timeline') || insight.includes('implementation')) {
        metrics.discussionTopics['Implementation Timeline'] = (metrics.discussionTopics['Implementation Timeline'] || 0) + 1;
      }
    });
  });

  // Calculate percentages
  const totalLeads = leads.length;
  if (totalLeads > 0) {
    metrics.qualificationRate = (metrics.qualificationRate / totalLeads) * 100;
    metrics.responseRate = (metrics.responseRate / totalLeads) * 100;
    
    Object.keys(metrics.leadSources).forEach(source => {
      metrics.leadSources[source] = (metrics.leadSources[source] / totalLeads) * 100;
    });
  }
  
  // Convert objections to percentages
  const totalObjections = Object.values(metrics.objections).reduce((sum, count) => sum + count, 0);
  if (totalObjections > 0) {
    Object.keys(metrics.objections).forEach(objection => {
      metrics.objections[objection] = (metrics.objections[objection] / totalObjections) * 100;
    });
  }
  
  // Sort and limit to top insights
  metrics.insightPriority = [
    { 
      text: "Focus outreach on high-response channels", 
      importance: "high",
      source: "AI analysis of lead engagement patterns"
    },
    { 
      text: `Address price objections (${Math.round(metrics.objections['Price concern'] || 0)}% of objections)`, 
      importance: metrics.objections['Price concern'] > 30 ? "high" : "medium",
      source: "Analysis of common sales objections"
    },
    { 
      text: "Follow up with leads within 3 days for optimal response", 
      importance: "medium",
      source: "Response time analysis"
    },
    { 
      text: "Prepare detailed implementation timelines for prospects", 
      importance: metrics.discussionTopics['Implementation Timeline'] > 20 ? "high" : "medium",
      source: "Frequent prospect questions"
    }
  ];
  
  return metrics;
}

async function getServerData() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      redirect('/auth/login');
    }

    // Get company data
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (companyError) {
      console.error('Error fetching company:', companyError);
      redirect('/onboarding/company');
    }

    if (!company) {
      redirect('/onboarding/company');
    }

    // Get leads with AI insights
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*, ai_insights')
      .eq('company_id', company.id);

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return { leads: [], callLogs: [] };
    }

    // Get call logs
    const { data: callLogs, error: callLogsError } = await supabase
      .from('call_logs')
      .select('*')
      .eq('company_id', company.id);

    if (callLogsError) {
      console.error('Error fetching call logs:', callLogsError);
      return { leads: leads || [], callLogs: [] };
    }

    return {
      leads: leads || [],
      callLogs: callLogs || []
    };
  } catch (error) {
    console.error('Error in getServerData:', error);
    return { leads: [], callLogs: [] };
  }
}

export default async function InsightsPage() {
  const { leads, callLogs } = await getServerData();
  
  // Calculate metrics
  const avgCallDuration = calculateAverageDuration(callLogs);
  const metrics = extractMetricsFromInsights(leads);

  // Prepare metric cards data
  const metricCards = [
    {
      title: "Total Leads",
      value: leads.length,
      description: "Total number of leads in your pipeline",
      trend: "up",
      trendValue: "+12%"
    },
    {
      title: "Total Calls",
      value: callLogs.length,
      description: "Total number of AI calls made",
      trend: "up",
      trendValue: "+8%"
    },
    {
      title: "Average Call Duration",
      value: `${Math.round(avgCallDuration)}m`,
      description: "Average duration of AI calls",
      trend: "neutral",
      trendValue: "0%"
    },
    {
      title: "Qualification Rate",
      value: `${Math.round(metrics.qualificationRate)}%`,
      description: "Percentage of leads showing high interest",
      trend: metrics.qualificationRate > 50 ? "up" : "down",
      trendValue: `${metrics.qualificationRate > 50 ? "+" : "-"}${Math.abs(Math.round(metrics.qualificationRate - 50))}%`
    },
    {
      title: "Response Rate",
      value: `${Math.round(metrics.responseRate)}%`,
      description: "Percentage of leads who have responded",
      trend: metrics.responseRate > 50 ? "up" : "down",
      trendValue: `${metrics.responseRate > 50 ? "+" : "-"}${Math.abs(Math.round(metrics.responseRate - 50))}%`
    }
  ];

  // Get top objections
  const topObjections = Object.entries(metrics.objections)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <Container maxW="7xl" py={8}>
      <div className="space-y-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metricCards.map((metric, index) => (
            <MetricCard
              key={index}
              title={metric.title}
              value={metric.value}
              description={metric.description}
              trend={metric.trend}
              trendValue={metric.trendValue}
            />
          ))}
        </div>

        {/* Insights and Objections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Key Insights Card */}
          <Card>
            <CardHeader>
              <Text fontSize="lg" fontWeight="semibold">Key Insights</Text>
            </CardHeader>
            <CardContent pt={0}>
              <Box>
                {metrics.insightPriority.map((insight, index) => (
                  <Box 
                    key={index} 
                    mb={2} 
                    display="flex" 
                    alignItems="center"
                  >
                    <Box 
                      w="2" 
                      h="2" 
                      borderRadius="full" 
                      bg={
                        insight.importance === 'high' ? 'blue.500' : 
                        insight.importance === 'medium' ? 'blue.300' : 
                        'blue.200'
                      }
                      mr={2}
                    />
                    <Text fontSize="sm">{insight.text}</Text>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Top Objections Card */}
          <Card>
            <CardHeader>
              <Text fontSize="lg" fontWeight="semibold">Top Objections</Text>
            </CardHeader>
            <CardContent pt={0}>
              <Box>
                {topObjections.map(([objection, percentage], index) => (
                  <Box 
                    key={index} 
                    mb={2} 
                    display="flex" 
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Text fontSize="sm">{objection}</Text>
                    <Badge variant="outline">{Math.round(percentage)}%</Badge>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </div>

        {/* Discussion Topics */}
        <Card>
          <CardHeader>
            <Text fontSize="lg" fontWeight="semibold">Discussion Topics</Text>
          </CardHeader>
          <CardContent pt={0}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(metrics.discussionTopics).map(([topic, count], index) => (
                <Box 
                  key={index}
                  p={4}
                  bg="gray.800"
                  borderRadius="md"
                >
                  <Text fontSize="sm" color="gray.400">{topic}</Text>
                  <Text fontSize="lg" fontWeight="bold">{count} mentions</Text>
                </Box>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
} 