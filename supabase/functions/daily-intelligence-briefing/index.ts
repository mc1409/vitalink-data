import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DailyBriefing {
  date: string;
  priority: string;
  healthFocus: string;
  energyPrediction: number;
  recommendations: {
    priority: string;
    category: string;
    action: string;
    reasoning: string;
    timing?: string;
  }[];
  insights: string[];
  riskAlerts: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get yesterday's data for analysis
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const [heartData, sleepData, activityData] = await Promise.all([
      supabase
        .from('biomarker_heart')
        .select('*')
        .eq('patient_id', patientId)
        .gte('measurement_time', yesterday.toISOString())
        .order('measurement_time', { ascending: false })
        .limit(5),
      
      supabase
        .from('biomarker_sleep')
        .select('*')
        .eq('patient_id', patientId)
        .eq('sleep_date', yesterdayStr),
      
      supabase
        .from('biomarker_activity')
        .select('*')
        .eq('patient_id', patientId)
        .eq('measurement_date', yesterdayStr)
    ]);

    // Get 7-day trend for context
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [trendHeart, trendSleep] = await Promise.all([
      supabase
        .from('biomarker_heart')
        .select('hrv_rmssd, resting_heart_rate, measurement_time')
        .eq('patient_id', patientId)
        .gte('measurement_time', sevenDaysAgo.toISOString())
        .order('measurement_time', { ascending: false }),
      
      supabase
        .from('biomarker_sleep')
        .select('sleep_efficiency, total_sleep_time, sleep_date')
        .eq('patient_id', patientId)
        .gte('sleep_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('sleep_date', { ascending: false })
    ]);

    // Analyze yesterday's data
    const lastSleep = sleepData.data?.[0];
    const lastActivity = activityData.data?.[0];
    const lastHeart = heartData.data?.[0];

    // Calculate trends
    const hrvTrend = trendHeart.data && trendHeart.data.length > 1 ? 
      (trendHeart.data[0]?.hrv_rmssd || 0) - (trendHeart.data[trendHeart.data.length - 1]?.hrv_rmssd || 0) : 0;
    
    const sleepTrend = trendSleep.data && trendSleep.data.length > 1 ?
      (trendSleep.data[0]?.sleep_efficiency || 0) - (trendSleep.data[trendSleep.data.length - 1]?.sleep_efficiency || 0) : 0;

    // Determine today's priority focus
    let healthFocus = "Maintenance";
    let priority = "Recovery";
    let energyPrediction = 7; // Out of 10

    const recommendations = [];
    const insights = [];
    const riskAlerts = [];

    // Analyze sleep quality for today's energy prediction
    if (lastSleep) {
      const sleepEfficiency = lastSleep.sleep_efficiency || 0;
      const sleepHours = lastSleep.total_sleep_time ? lastSleep.total_sleep_time / 60 : 0;
      
      if (sleepEfficiency < 70 || sleepHours < 6) {
        energyPrediction = 4;
        priority = "Recovery";
        healthFocus = "Sleep Recovery";
        
        recommendations.push({
          priority: "High",
          category: "Recovery",
          action: "Limit intense activities today. Focus on gentle movement and early bedtime prep.",
          reasoning: `Poor sleep quality (${Math.round(sleepEfficiency)}% efficiency, ${sleepHours.toFixed(1)} hours)`,
          timing: "All day"
        });
        
        insights.push(`Your sleep efficiency was ${Math.round(sleepEfficiency)}% last night, indicating fragmented sleep. Energy will be limited today.`);
      } else if (sleepEfficiency > 85 && sleepHours > 7) {
        energyPrediction = 9;
        healthFocus = "Performance Optimization";
        
        insights.push(`Excellent sleep quality (${Math.round(sleepEfficiency)}% efficiency) sets you up for a high-energy day.`);
      }
    }

    // Analyze HRV for stress/recovery status
    if (lastHeart?.hrv_rmssd) {
      const hrv = lastHeart.hrv_rmssd;
      
      if (hrv < 20) {
        priority = "Stress Management";
        healthFocus = "Autonomic Recovery";
        energyPrediction = Math.min(energyPrediction, 5);
        
        recommendations.push({
          priority: "Critical",
          category: "Stress",
          action: "Practice 4-7-8 breathing for 10 minutes. Consider cold shower for 2 minutes.",
          reasoning: `HRV critically low at ${hrv}ms indicating high autonomic stress`,
          timing: "Morning"
        });
        
        riskAlerts.push("HRV indicates significant autonomic stress. Monitor for fatigue and consider medical consultation if persistent.");
      } else if (hrvTrend < -5) {
        recommendations.push({
          priority: "Medium",
          category: "Recovery",
          action: "Implement stress reduction protocol. Prioritize meditation and gentle movement.",
          reasoning: `HRV declining trend (-${Math.abs(hrvTrend).toFixed(1)}ms over 7 days)`,
          timing: "Throughout day"
        });
      }
    }

    // Activity recommendations based on yesterday's data
    if (lastActivity) {
      const steps = lastActivity.steps_count || 0;
      
      if (steps < 5000) {
        recommendations.push({
          priority: "Medium",
          category: "Activity",
          action: "Take a 20-minute walk in sunlight. Aim for 8,000+ steps today.",
          reasoning: `Low activity yesterday (${steps.toLocaleString()} steps)`,
          timing: "Morning preferred"
        });
      }
    }

    // Add metabolic recommendations
    if (energyPrediction < 7) {
      recommendations.push({
        priority: "Medium",
        category: "Metabolic",
        action: "Delay breakfast until 10 AM (extend fast). Focus on protein and healthy fats.",
        reasoning: "Poor recovery suggests metabolic stress - intermittent fasting may help",
        timing: "Morning"
      });
    }

    // General wellness recommendations
    recommendations.push({
      priority: "Low",
      category: "Nutrition",
      action: "Ensure 64oz water intake by 3 PM. Add electrolytes if sweating expected.",
      reasoning: "Optimal hydration supports all physiological functions",
      timing: "Throughout day"
    });

    const briefing: DailyBriefing = {
      date: new Date().toISOString().split('T')[0],
      priority,
      healthFocus,
      energyPrediction,
      recommendations: recommendations.slice(0, 4), // Limit to top 4
      insights,
      riskAlerts
    };

    return new Response(JSON.stringify({
      briefing,
      generatedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in daily-intelligence-briefing:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});