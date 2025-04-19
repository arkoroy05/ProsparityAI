import React from 'react';
import { Heading, Box, Text, SimpleGrid, Card, CardHeader, CardBody, Spinner, Alert, AlertIcon } from '@/components/ui';
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
  
  // Count qualified leads
  const qualifiedLeads = leads.filter(lead => 
    lead.ai_insights?.classification?.interest === 'high' || 
    lead.ai_insights?.classification?.interest === 'medium'
  );
  
  metrics.qualificationRate = leads.length > 0 ? (qualifiedLeads.length / leads.length) * 100 : 0;
  
  // Count leads that have responded
  const respondedLeads = leads.filter(lead => 
    lead.ai_insights?.classification?.conversationHistory && 
    lead.ai_insights?.classification?.conversationHistory.length > 0
  );
  
  metrics.responseRate = leads.length > 0 ? (respondedLeads.length / leads.length) * 100 : 0;
  
  // Process objections
  leads.forEach(lead => {
    const objections = lead.ai_insights?.classification?.objections || [];
    objections.forEach(objection => {
      metrics.objections[objection] = (metrics.objections[objection] || 0) + 1;
    });
    
    // Process lead source
    const source = lead.source || 'Unknown';
    metrics.leadSources[source] = (metrics.leadSources[source] || 0) + 1;
    
    // Process sentiment
    if (lead.ai_insights?.classification?.interest === 'high') {
      metrics.sentiments.positive += 1;
    } else if (lead.ai_insights?.classification?.interest === 'none') {
      metrics.sentiments.negative += 1;
    } else {
      metrics.sentiments.neutral += 1;
    }
    
    // Process insights
    const insights = lead.ai_insights?.classification?.insights || [];
    insights.forEach(insight => {
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
  
  // Convert to percentages
  const totalLeads = leads.length;
  Object.keys(metrics.leadSources).forEach(source => {
    metrics.leadSources[source] = (metrics.leadSources[source] / totalLeads) * 100;
  });
  
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
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/auth/login');
  }

  try {
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (companiesError) throw companiesError;
    
    if (!companies) {
      redirect('/onboarding/company');
    }

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('company_id', companies.id);

    if (leadsError) throw leadsError;

    const { data: callLogs, error: callLogsError } = await supabase
      .from('call_logs')
      .select('*')
      .eq('company_id', companies.id);

    if (callLogsError) throw callLogsError;

    return { companies, leads: leads || [], callLogs: callLogs || [] };
  } catch (error) {
    console.error('Error fetching data:', error);
    return { companies: null, leads: [], callLogs: [] };
  }
}

export default async function InsightsPage() {
  const { companies, leads, callLogs } = await getServerData();

  const avgCallDuration = calculateAverageDuration(callLogs);
  const metrics = extractMetricsFromInsights(leads);
  
  return (
    <Container maxW="7xl" py={8}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Total Leads"
          value={leads?.length || 0}
          description="Total number of leads in your pipeline"
        />
        <MetricCard
          title="Total Calls"
          value={callLogs?.length || 0}
          description="Total number of AI calls made"
        />
        <MetricCard
          title="Average Call Duration"
          value={`${avgCallDuration}m`}
          description="Average duration of AI calls"
        />
        {metrics.map((metric, index) => (
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
    </Container>
  );
}

// Component for displaying insight cards
function InsightCard({ title, insights }) {
  return (
    <Card>
      <CardHeader>
        <Text fontSize="lg" fontWeight="semibold">{title}</Text>
      </CardHeader>
      <CardBody pt={0}>
        <Box>
          {insights.map((insight, index) => (
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
      </CardBody>
    </Card>
  );
} 