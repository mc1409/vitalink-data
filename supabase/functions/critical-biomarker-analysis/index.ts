import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BiomarkerAlert {
  level: 'critical' | 'warning' | 'optimal';
  category: string;
  metric: string;
  currentValue: number | null;
  threshold: number;
  message: string;
  action: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientId } = await req.json();
    
    if (!patientId) {
      throw new Error('Patient ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch recent biomarker data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [heartData, sleepData, activityData] = await Promise.all([
      supabase
        .from('biomarker_heart')
        .select('*')
        .eq('patient_id', patientId)
        .gte('measurement_time', thirtyDaysAgo.toISOString())
        .order('measurement_time', { ascending: false }),
      
      supabase
        .from('biomarker_sleep')
        .select('*')
        .eq('patient_id', patientId)
        .gte('sleep_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('sleep_date', { ascending: false }),
      
      supabase
        .from('biomarker_activity')
        .select('*')
        .eq('patient_id', patientId)
        .gte('measurement_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('measurement_date', { ascending: false })
    ]);

    const alerts: BiomarkerAlert[] = [];

    // Critical HRV Analysis
    if (heartData.data && heartData.data.length > 0) {
      const recentHRV = heartData.data.slice(0, 7); // Last 7 readings
      const avgHRV = recentHRV
        .filter(d => d.hrv_rmssd)
        .reduce((sum, d) => sum + d.hrv_rmssd, 0) / recentHRV.filter(d => d.hrv_rmssd).length;

      if (avgHRV && avgHRV < 15) {
        alerts.push({
          level: 'critical',
          category: 'Cardiovascular',
          metric: 'HRV (RMSSD)',
          currentValue: Math.round(avgHRV),
          threshold: 15,
          message: `HRV critically low at ${Math.round(avgHRV)}ms. Indicates severe autonomic stress.`,
          action: 'Schedule comprehensive blood panel immediately. Consider cardiac evaluation.'
        });
      } else if (avgHRV && avgHRV < 25) {
        alerts.push({
          level: 'warning',
          category: 'Cardiovascular',
          metric: 'HRV (RMSSD)',
          currentValue: Math.round(avgHRV),
          threshold: 25,
          message: `HRV declining at ${Math.round(avgHRV)}ms. Monitor closely for autonomic dysfunction.`,
          action: 'Implement stress reduction protocol. Consider lifestyle modifications.'
        });
      }

      // Resting Heart Rate Analysis
      const recentRHR = heartData.data.slice(0, 7)
        .filter(d => d.resting_heart_rate)
        .map(d => d.resting_heart_rate);
      
      if (recentRHR.length > 0) {
        const avgRHR = recentRHR.reduce((sum, rhr) => sum + rhr, 0) / recentRHR.length;
        
        if (avgRHR > 90) {
          alerts.push({
            level: 'critical',
            category: 'Cardiovascular',
            metric: 'Resting Heart Rate',
            currentValue: Math.round(avgRHR),
            threshold: 90,
            message: `Resting heart rate elevated at ${Math.round(avgRHR)} bpm. May indicate cardiac stress.`,
            action: 'Blood pressure monitoring. Consider thyroid function tests (TSH, T3, T4).'
          });
        } else if (avgRHR > 75) {
          alerts.push({
            level: 'warning',
            category: 'Cardiovascular',
            metric: 'Resting Heart Rate',
            currentValue: Math.round(avgRHR),
            threshold: 75,
            message: `Resting heart rate trending high at ${Math.round(avgRHR)} bpm.`,
            action: 'Monitor sleep quality and stress levels. Consider cardiovascular evaluation.'
          });
        }
      }
    }

    // Sleep Efficiency Analysis
    if (sleepData.data && sleepData.data.length > 0) {
      const recentSleep = sleepData.data.slice(0, 7);
      const sleepEfficiencies = recentSleep
        .filter(d => d.sleep_efficiency)
        .map(d => d.sleep_efficiency);
      
      if (sleepEfficiencies.length > 0) {
        const avgEfficiency = sleepEfficiencies.reduce((sum, eff) => sum + eff, 0) / sleepEfficiencies.length;
        
        if (avgEfficiency < 70) {
          alerts.push({
            level: 'critical',
            category: 'Sleep',
            metric: 'Sleep Efficiency',
            currentValue: Math.round(avgEfficiency),
            threshold: 70,
            message: `Sleep efficiency critically low at ${Math.round(avgEfficiency)}%. Impacts immune function.`,
            action: 'Consider sleep study. Check glucose tolerance test and inflammatory markers (CRP).'
          });
        } else if (avgEfficiency < 80) {
          alerts.push({
            level: 'warning',
            category: 'Sleep',
            metric: 'Sleep Efficiency',
            currentValue: Math.round(avgEfficiency),
            threshold: 80,
            message: `Sleep efficiency declining at ${Math.round(avgEfficiency)}%.`,
            action: 'Optimize sleep hygiene. Consider magnesium supplementation.'
          });
        }
      }
    }

    // Activity Pattern Analysis
    if (activityData.data && activityData.data.length > 0) {
      const recentActivity = activityData.data.slice(0, 7);
      const stepCounts = recentActivity
        .filter(d => d.steps_count)
        .map(d => d.steps_count);
      
      if (stepCounts.length > 0) {
        const avgSteps = stepCounts.reduce((sum, steps) => sum + steps, 0) / stepCounts.length;
        
        if (avgSteps < 3000) {
          alerts.push({
            level: 'warning',
            category: 'Activity',
            metric: 'Daily Steps',
            currentValue: Math.round(avgSteps),
            threshold: 3000,
            message: `Daily steps critically low at ${Math.round(avgSteps)}. Sedentary lifestyle detected.`,
            action: 'Increase daily movement. Consider liver enzyme testing due to inactivity.'
          });
        } else if (avgSteps < 6000) {
          alerts.push({
            level: 'warning',
            category: 'Activity',
            metric: 'Daily Steps',
            currentValue: Math.round(avgSteps),
            threshold: 6000,
            message: `Daily steps below optimal at ${Math.round(avgSteps)}.`,
            action: 'Gradual increase in daily activity. Aim for 8,000+ steps.'
          });
        }
      }
    }

    // Sort alerts by priority (critical first)
    alerts.sort((a, b) => {
      if (a.level === 'critical' && b.level !== 'critical') return -1;
      if (a.level !== 'critical' && b.level === 'critical') return 1;
      return 0;
    });

    return new Response(JSON.stringify({ 
      alerts,
      analysisDate: new Date().toISOString(),
      dataPoints: {
        heartRecords: heartData.data?.length || 0,
        sleepRecords: sleepData.data?.length || 0,
        activityRecords: activityData.data?.length || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in critical-biomarker-analysis:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});