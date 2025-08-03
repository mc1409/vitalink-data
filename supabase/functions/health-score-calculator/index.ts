import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthScore {
  overall: number;
  cardiovascular: number;
  metabolic: number;
  inflammatory: number;
  nutritional: number;
  recovery: number;
  breakdown: {
    cardiovascular: { hrv: number; rhr: number; bloodPressure: number; };
    metabolic: { sleep: number; activity: number; glucose: number; };
    inflammatory: { recovery: number; stress: number; };
    nutritional: { vitamins: number; hydration: number; };
    recovery: { sleepQuality: number; hrvRecovery: number; };
  };
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

    // Fetch recent data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [heartData, sleepData, activityData, labData] = await Promise.all([
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
        .order('measurement_date', { ascending: false }),

      supabase
        .from('clinical_diagnostic_lab_tests')
        .select('*')
        .eq('patient_id', patientId)
        .order('collection_date', { ascending: false })
        .limit(20)
    ]);

    // Calculate Cardiovascular Score (25 points)
    let cardiovascularScore = 0;
    let hrvScore = 0, rhrScore = 0, bpScore = 0;

    if (heartData.data && heartData.data.length > 0) {
      const recent = heartData.data.slice(0, 7);
      
      // HRV Score (10 points)
      const hrvValues = recent.filter(d => d.hrv_rmssd).map(d => d.hrv_rmssd);
      if (hrvValues.length > 0) {
        const avgHRV = hrvValues.reduce((sum, val) => sum + val, 0) / hrvValues.length;
        if (avgHRV >= 40) hrvScore = 10;
        else if (avgHRV >= 30) hrvScore = 8;
        else if (avgHRV >= 20) hrvScore = 6;
        else if (avgHRV >= 15) hrvScore = 3;
        else hrvScore = 0;
      }

      // RHR Score (10 points)
      const rhrValues = recent.filter(d => d.resting_heart_rate).map(d => d.resting_heart_rate);
      if (rhrValues.length > 0) {
        const avgRHR = rhrValues.reduce((sum, val) => sum + val, 0) / rhrValues.length;
        if (avgRHR <= 60) rhrScore = 10;
        else if (avgRHR <= 70) rhrScore = 8;
        else if (avgRHR <= 80) rhrScore = 6;
        else if (avgRHR <= 90) rhrScore = 3;
        else rhrScore = 0;
      }

      // Blood Pressure Score (5 points) - from recent lab data
      const bpSystolic = recent.filter(d => d.systolic_bp).map(d => d.systolic_bp);
      if (bpSystolic.length > 0) {
        const avgSystolic = bpSystolic.reduce((sum, val) => sum + val, 0) / bpSystolic.length;
        if (avgSystolic <= 120) bpScore = 5;
        else if (avgSystolic <= 130) bpScore = 4;
        else if (avgSystolic <= 140) bpScore = 2;
        else bpScore = 0;
      }
    }
    cardiovascularScore = hrvScore + rhrScore + bpScore;

    // Calculate Metabolic Score (25 points)
    let metabolicScore = 0;
    let sleepScore = 0, activityScore = 0, glucoseScore = 0;

    if (sleepData.data && sleepData.data.length > 0) {
      const recentSleep = sleepData.data.slice(0, 7);
      const efficiencies = recentSleep.filter(d => d.sleep_efficiency).map(d => d.sleep_efficiency);
      if (efficiencies.length > 0) {
        const avgEfficiency = efficiencies.reduce((sum, val) => sum + val, 0) / efficiencies.length;
        if (avgEfficiency >= 85) sleepScore = 10;
        else if (avgEfficiency >= 80) sleepScore = 8;
        else if (avgEfficiency >= 75) sleepScore = 6;
        else if (avgEfficiency >= 70) sleepScore = 3;
        else sleepScore = 0;
      }
    }

    if (activityData.data && activityData.data.length > 0) {
      const recentActivity = activityData.data.slice(0, 7);
      const stepCounts = recentActivity.filter(d => d.steps_count).map(d => d.steps_count);
      if (stepCounts.length > 0) {
        const avgSteps = stepCounts.reduce((sum, val) => sum + val, 0) / stepCounts.length;
        if (avgSteps >= 10000) activityScore = 10;
        else if (avgSteps >= 8000) activityScore = 8;
        else if (avgSteps >= 6000) activityScore = 6;
        else if (avgSteps >= 3000) activityScore = 3;
        else activityScore = 0;
      }
    }

    // Glucose score from lab data
    if (labData.data && labData.data.length > 0) {
      const glucoseTests = labData.data.filter(d => 
        d.test_name.toLowerCase().includes('glucose') || 
        d.test_name.toLowerCase().includes('hba1c')
      );
      if (glucoseTests.length > 0) {
        const recent = glucoseTests[0];
        if (recent.test_name.toLowerCase().includes('hba1c')) {
          const value = recent.numeric_value;
          if (value && value <= 5.4) glucoseScore = 5;
          else if (value && value <= 5.7) glucoseScore = 4;
          else if (value && value <= 6.0) glucoseScore = 2;
          else glucoseScore = 0;
        }
      }
    }
    metabolicScore = sleepScore + activityScore + glucoseScore;

    // Calculate other scores (simplified for demo)
    const inflammatoryScore = Math.min(20, Math.max(0, 15 - Math.floor(Math.random() * 10)));
    const nutritionalScore = Math.min(15, Math.max(0, 12 - Math.floor(Math.random() * 5)));
    const recoveryScore = Math.min(15, Math.max(0, 12 - Math.floor(Math.random() * 5)));

    const overallScore = cardiovascularScore + metabolicScore + inflammatoryScore + nutritionalScore + recoveryScore;

    const healthScore: HealthScore = {
      overall: overallScore,
      cardiovascular: cardiovascularScore,
      metabolic: metabolicScore,
      inflammatory: inflammatoryScore,
      nutritional: nutritionalScore,
      recovery: recoveryScore,
      breakdown: {
        cardiovascular: { hrv: hrvScore, rhr: rhrScore, bloodPressure: bpScore },
        metabolic: { sleep: sleepScore, activity: activityScore, glucose: glucoseScore },
        inflammatory: { recovery: 8, stress: inflammatoryScore - 8 },
        nutritional: { vitamins: Math.floor(nutritionalScore * 0.7), hydration: Math.ceil(nutritionalScore * 0.3) },
        recovery: { sleepQuality: Math.floor(recoveryScore * 0.6), hrvRecovery: Math.ceil(recoveryScore * 0.4) }
      }
    };

    return new Response(JSON.stringify({
      healthScore,
      calculatedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in health-score-calculator:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});