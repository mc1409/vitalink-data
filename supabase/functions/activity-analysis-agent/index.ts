import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patient_id, activity_data } = await req.json();

    if (!patient_id) {
      throw new Error('Patient ID is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🏃 Activity Analysis Agent - Processing for patient: ${patient_id}`);

    // If no activity data provided, fetch from database
    let activityRecords = activity_data;
    if (!activityRecords || activityRecords.length === 0) {
      const { data, error } = await supabase
        .from('biomarker_activity')
        .select('*')
        .eq('patient_id', patient_id)
        .order('measurement_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      activityRecords = data;
    }

    if (!activityRecords || activityRecords.length === 0) {
      return new Response(JSON.stringify({
        insights: [{
          category: 'General',
          title: 'No Activity Data',
          description: 'No activity data found for analysis.',
          recommendation: 'Upload activity data from your fitness tracker or manually log your workouts.',
          severity: 'low'
        }],
        metrics: { processing_time_ms: 0 }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate activity metrics
    const metrics = calculateActivityMetrics(activityRecords);
    
    // Prepare comprehensive prompt for LLM analysis
    const prompt = createActivityAnalysisPrompt(activityRecords, metrics);

    // Call Azure OpenAI for analysis
    const analysis = await callAzureOpenAI(prompt);

    const result = {
      insights: analysis.insights || [],
      metrics: {
        ...metrics,
        processing_time_ms: Date.now() - Date.now(),
        records_analyzed: activityRecords.length
      },
      debug: {
        prompt: prompt,
        response: analysis
      }
    };

    console.log(`✅ Activity analysis completed - ${analysis.insights?.length || 0} insights generated`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Activity Analysis Agent Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      insights: [{
        category: 'Error',
        title: 'Analysis Error',
        description: 'Unable to analyze activity data at this time.',
        recommendation: 'Please try again later or contact support.',
        severity: 'medium'
      }]
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateActivityMetrics(activityRecords: any[]) {
  const validRecords = activityRecords.filter(r => r.steps_count > 0);
  
  if (validRecords.length === 0) {
    return { noData: true };
  }

  // Calculate daily averages and trends
  const totalSteps = validRecords.reduce((sum, r) => sum + (r.steps_count || 0), 0);
  const totalCalories = validRecords.reduce((sum, r) => sum + (r.active_calories || r.total_calories || 0), 0);
  const totalDistance = validRecords.reduce((sum, r) => sum + (r.distance_walked_meters || 0), 0);

  const avgSteps = Math.round(totalSteps / validRecords.length);
  const avgCalories = Math.round(totalCalories / validRecords.length);
  const avgDistanceKm = (totalDistance / validRecords.length / 1000).toFixed(1);

  // Weekly comparison (last 7 vs previous 7)
  const recent7 = validRecords.slice(0, 7);
  const previous7 = validRecords.slice(7, 14);
  
  const recentAvgSteps = recent7.length > 0 ? recent7.reduce((sum, r) => sum + (r.steps_count || 0), 0) / recent7.length : 0;
  const previousAvgSteps = previous7.length > 0 ? previous7.reduce((sum, r) => sum + (r.steps_count || 0), 0) / previous7.length : 0;
  
  const stepsTrend = previousAvgSteps > 0 ? ((recentAvgSteps - previousAvgSteps) / previousAvgSteps * 100) : 0;

  // Activity level classification
  let activityLevel = 'Sedentary';
  if (avgSteps >= 10000) activityLevel = 'Very Active';
  else if (avgSteps >= 7500) activityLevel = 'Active';
  else if (avgSteps >= 5000) activityLevel = 'Lightly Active';

  return {
    avgSteps,
    avgCalories,
    avgDistanceKm,
    stepsTrend,
    activityLevel,
    daysAnalyzed: validRecords.length,
    recentAvgSteps,
    previousAvgSteps,
    consistency: calculateConsistency(validRecords),
    peakActivityDays: findPeakDays(validRecords)
  };
}

function calculateConsistency(records: any[]) {
  if (records.length < 3) return 0;
  
  const steps = records.map(r => r.steps_count || 0);
  const mean = steps.reduce((sum, s) => sum + s, 0) / steps.length;
  const variance = steps.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / steps.length;
  const coefficient = Math.sqrt(variance) / mean;
  
  // Convert to consistency score (lower coefficient = higher consistency)
  return Math.max(0, Math.min(100, 100 - (coefficient * 100)));
}

function findPeakDays(records: any[]) {
  return records
    .map(r => ({
      date: r.measurement_date,
      steps: r.steps_count || 0,
      calories: r.active_calories || r.total_calories || 0
    }))
    .sort((a, b) => b.steps - a.steps)
    .slice(0, 3);
}

function createActivityAnalysisPrompt(activityRecords: any[], metrics: any) {
  const recentData = activityRecords.slice(0, 7).map(r => ({
    date: r.measurement_date,
    steps: r.steps_count || 0,
    active_calories: r.active_calories || 0,
    total_calories: r.total_calories || 0,
    distance_walked: r.distance_walked_meters || 0,
    exercise_minutes: r.exercise_minutes || 0,
    sedentary_minutes: r.sedentary_minutes || 0
  }));

  return `You are an expert Activity Intelligence Agent specializing in movement pattern analysis and activity optimization. Analyze the following activity data and provide actionable insights in the exact JSON format specified.

PATIENT ACTIVITY PROFILE:
- Analysis Period: Last ${metrics.daysAnalyzed} days
- Average Daily Steps: ${metrics.avgSteps}
- Average Active Calories: ${metrics.avgCalories}
- Average Distance: ${metrics.avgDistanceKm} km
- Activity Level Classification: ${metrics.activityLevel}
- Steps Trend (7-day): ${metrics.stepsTrend > 0 ? '+' : ''}${metrics.stepsTrend.toFixed(1)}%
- Movement Consistency Score: ${metrics.consistency.toFixed(1)}/100

RECENT 7-DAY ACTIVITY DATA:
${JSON.stringify(recentData, null, 2)}

ANALYSIS REQUIREMENTS:
1. **WHOOP-Style Activity Scoring**: Evaluate movement patterns, consistency, and progression
2. **Movement Pattern Analysis**: Identify trends, gaps, and optimization opportunities
3. **Calorie Efficiency**: Analyze energy expenditure patterns and metabolic efficiency
4. **Behavioral Insights**: Detect patterns in sedentary time vs active periods
5. **Performance Optimization**: Provide specific recommendations for improvement

Please analyze this data and respond with exactly this JSON structure:

{
  "insights": [
    {
      "category": "Movement Patterns" | "Calorie Efficiency" | "Consistency" | "Performance" | "Health Impact",
      "title": "Specific insight title",
      "description": "2-3 sentence explanation of the finding",
      "recommendation": "Specific, actionable recommendation",
      "severity": "low" | "medium" | "high"
    }
  ]
}

Generate 3-5 insights covering different aspects of activity patterns. Focus on actionable recommendations that can improve movement consistency, calorie burn efficiency, and overall activity levels. Consider both positive patterns to reinforce and areas needing improvement.`;
}

async function callAzureOpenAI(prompt: string) {
  const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT');
  const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY');
  const deploymentName = Deno.env.get('AZURE_OPENAI_DEPLOYMENT');

  if (!azureEndpoint || !azureApiKey || !deploymentName) {
    throw new Error('Azure OpenAI configuration missing');
  }

  const response = await fetch(`${azureEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=2024-02-15-preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': azureApiKey,
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: 'You are an expert Activity Intelligence Agent. Always respond with valid JSON matching the requested format exactly.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.1,
      top_p: 0.95
    }),
  });

  if (!response.ok) {
    throw new Error(`Azure OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response from Azure OpenAI');
  }

  try {
    return JSON.parse(content);
  } catch (parseError) {
    console.error('JSON parsing error:', parseError);
    console.error('Raw content:', content);
    throw new Error('Invalid JSON response from AI');
  }
}