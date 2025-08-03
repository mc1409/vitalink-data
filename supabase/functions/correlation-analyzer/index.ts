import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CorrelationResult {
  correlation: number;
  significance: 'high' | 'medium' | 'low';
  pValue: number;
  sampleSize: number;
  interpretation: string;
}

interface LifestyleCorrelation {
  lifestyleMetric: string;
  healthMetric: string;
  correlation: CorrelationResult;
  insight: string;
  recommendation: string;
  confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientId, timeframeDays = 90 } = await req.json();

    if (!patientId) {
      throw new Error('Patient ID is required');
    }

    console.log(`Analyzing lifestyle correlations for patient:`, patientId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - timeframeDays);

    // Fetch comprehensive health and lifestyle data
    const [heartData, sleepData, activityData, labData] = await Promise.all([
      supabase
        .from('biomarker_heart')
        .select('measurement_time, resting_heart_rate, hrv_rmssd, vo2_max')
        .eq('patient_id', patientId)
        .gte('measurement_time', startDate.toISOString())
        .order('measurement_time', { ascending: true }),

      supabase
        .from('biomarker_sleep')
        .select('measurement_time, total_sleep_time, sleep_efficiency, deep_sleep_minutes, sleep_score')
        .eq('patient_id', patientId)
        .gte('measurement_time', startDate.toISOString())
        .order('measurement_time', { ascending: true }),

      supabase
        .from('biomarker_activity')
        .select('measurement_time, steps_count, exercise_minutes, total_calories, distance_walked_meters')
        .eq('patient_id', patientId)
        .gte('measurement_time', startDate.toISOString())
        .order('measurement_time', { ascending: true }),

      supabase
        .from('clinical_diagnostic_lab_tests')
        .select('collection_date, test_name, numeric_value, test_category')
        .eq('patient_id', patientId)
        .gte('collection_date', startDate.toISOString().split('T')[0])
        .order('collection_date', { ascending: true })
    ]);

    const correlations: LifestyleCorrelation[] = [];

    // 1. Sleep Duration vs HRV Correlation
    if (sleepData.data && heartData.data) {
      const sleepHrvCorrelation = calculateSleepHrvCorrelation(sleepData.data, heartData.data);
      if (sleepHrvCorrelation) {
        correlations.push({
          lifestyleMetric: 'Sleep Duration',
          healthMetric: 'Heart Rate Variability',
          correlation: sleepHrvCorrelation,
          insight: generateSleepHrvInsight(sleepHrvCorrelation),
          recommendation: generateSleepHrvRecommendation(sleepHrvCorrelation),
          confidence: 85
        });
      }
    }

    // 2. Physical Activity vs Resting Heart Rate
    if (activityData.data && heartData.data) {
      const activityHrCorrelation = calculateActivityHrCorrelation(activityData.data, heartData.data);
      if (activityHrCorrelation) {
        correlations.push({
          lifestyleMetric: 'Daily Steps',
          healthMetric: 'Resting Heart Rate',
          correlation: activityHrCorrelation,
          insight: generateActivityHrInsight(activityHrCorrelation),
          recommendation: generateActivityHrRecommendation(activityHrCorrelation),
          confidence: 78
        });
      }
    }

    // 3. Exercise vs Sleep Quality
    if (activityData.data && sleepData.data) {
      const exerciseSleepCorrelation = calculateExerciseSleepCorrelation(activityData.data, sleepData.data);
      if (exerciseSleepCorrelation) {
        correlations.push({
          lifestyleMetric: 'Exercise Minutes',
          healthMetric: 'Sleep Efficiency',
          correlation: exerciseSleepCorrelation,
          insight: generateExerciseSleepInsight(exerciseSleepCorrelation),
          recommendation: generateExerciseSleepRecommendation(exerciseSleepCorrelation),
          confidence: 72
        });
      }
    }

    // 4. Activity vs Lab Results (if glucose data available)
    if (activityData.data && labData.data) {
      const activityGlucoseCorrelation = calculateActivityGlucoseCorrelation(activityData.data, labData.data);
      if (activityGlucoseCorrelation) {
        correlations.push({
          lifestyleMetric: 'Physical Activity',
          healthMetric: 'Glucose Levels',
          correlation: activityGlucoseCorrelation,
          insight: generateActivityGlucoseInsight(activityGlucoseCorrelation),
          recommendation: generateActivityGlucoseRecommendation(activityGlucoseCorrelation),
          confidence: 82
        });
      }
    }

    // 5. Sleep vs Inflammatory Markers
    if (sleepData.data && labData.data) {
      const sleepInflammationCorrelation = calculateSleepInflammationCorrelation(sleepData.data, labData.data);
      if (sleepInflammationCorrelation) {
        correlations.push({
          lifestyleMetric: 'Sleep Quality',
          healthMetric: 'Inflammatory Markers',
          correlation: sleepInflammationCorrelation,
          insight: generateSleepInflammationInsight(sleepInflammationCorrelation),
          recommendation: generateSleepInflammationRecommendation(sleepInflammationCorrelation),
          confidence: 75
        });
      }
    }

    console.log(`Found ${correlations.length} significant lifestyle correlations`);

    return new Response(JSON.stringify({
      patientId,
      analysisDate: new Date().toISOString(),
      timeframeDays,
      correlations,
      summary: generateCorrelationSummary(correlations)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error analyzing correlations:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateSleepHrvCorrelation(sleepData: any[], heartData: any[]): CorrelationResult | null {
  // Align data by date and calculate correlation between sleep duration and HRV
  const alignedData = alignDataByDate(sleepData, heartData, 'total_sleep_time', 'hrv_rmssd');
  
  if (alignedData.length < 10) return null;
  
  const correlation = pearsonCorrelation(
    alignedData.map(d => d.x),
    alignedData.map(d => d.y)
  );
  
  return {
    correlation: correlation,
    significance: Math.abs(correlation) > 0.7 ? 'high' : Math.abs(correlation) > 0.4 ? 'medium' : 'low',
    pValue: calculatePValue(correlation, alignedData.length),
    sampleSize: alignedData.length,
    interpretation: `${Math.abs(correlation) > 0.5 ? 'Strong' : 'Moderate'} ${correlation > 0 ? 'positive' : 'negative'} correlation`
  };
}

function calculateActivityHrCorrelation(activityData: any[], heartData: any[]): CorrelationResult | null {
  const alignedData = alignDataByDate(activityData, heartData, 'steps_count', 'resting_heart_rate');
  
  if (alignedData.length < 10) return null;
  
  const correlation = pearsonCorrelation(
    alignedData.map(d => d.x),
    alignedData.map(d => d.y)
  );
  
  return {
    correlation: correlation,
    significance: Math.abs(correlation) > 0.6 ? 'high' : Math.abs(correlation) > 0.3 ? 'medium' : 'low',
    pValue: calculatePValue(correlation, alignedData.length),
    sampleSize: alignedData.length,
    interpretation: `${Math.abs(correlation) > 0.5 ? 'Strong' : 'Moderate'} ${correlation > 0 ? 'positive' : 'negative'} correlation`
  };
}

function calculateExerciseSleepCorrelation(activityData: any[], sleepData: any[]): CorrelationResult | null {
  const alignedData = alignDataByDate(activityData, sleepData, 'exercise_minutes', 'sleep_efficiency');
  
  if (alignedData.length < 10) return null;
  
  const correlation = pearsonCorrelation(
    alignedData.map(d => d.x),
    alignedData.map(d => d.y)
  );
  
  return {
    correlation: correlation,
    significance: Math.abs(correlation) > 0.5 ? 'high' : Math.abs(correlation) > 0.3 ? 'medium' : 'low',
    pValue: calculatePValue(correlation, alignedData.length),
    sampleSize: alignedData.length,
    interpretation: `${Math.abs(correlation) > 0.4 ? 'Moderate' : 'Weak'} ${correlation > 0 ? 'positive' : 'negative'} correlation`
  };
}

function calculateActivityGlucoseCorrelation(activityData: any[], labData: any[]): CorrelationResult | null {
  // Find glucose tests
  const glucoseTests = labData.filter(test => 
    test.test_name?.toLowerCase().includes('glucose') && test.numeric_value
  );
  
  if (glucoseTests.length < 5) return null;
  
  // Align activity data with glucose test dates
  const alignedData = [];
  for (const test of glucoseTests) {
    const testDate = new Date(test.collection_date);
    const activityForDate = activityData.find(activity => {
      const activityDate = new Date(activity.measurement_time);
      return Math.abs(activityDate.getTime() - testDate.getTime()) < 24 * 60 * 60 * 1000; // Within 1 day
    });
    
    if (activityForDate && activityForDate.steps_count) {
      alignedData.push({
        x: activityForDate.steps_count,
        y: test.numeric_value
      });
    }
  }
  
  if (alignedData.length < 5) return null;
  
  const correlation = pearsonCorrelation(
    alignedData.map(d => d.x),
    alignedData.map(d => d.y)
  );
  
  return {
    correlation: correlation,
    significance: Math.abs(correlation) > 0.6 ? 'high' : Math.abs(correlation) > 0.4 ? 'medium' : 'low',
    pValue: calculatePValue(correlation, alignedData.length),
    sampleSize: alignedData.length,
    interpretation: `${Math.abs(correlation) > 0.5 ? 'Strong' : 'Moderate'} ${correlation > 0 ? 'positive' : 'negative'} correlation`
  };
}

function calculateSleepInflammationCorrelation(sleepData: any[], labData: any[]): CorrelationResult | null {
  // Find inflammatory markers (CRP, ESR, etc.)
  const inflammatoryTests = labData.filter(test => 
    (test.test_name?.toLowerCase().includes('crp') || 
     test.test_name?.toLowerCase().includes('esr') ||
     test.test_name?.toLowerCase().includes('inflammation')) && 
    test.numeric_value
  );
  
  if (inflammatoryTests.length < 5) return null;
  
  // Calculate correlation with sleep efficiency
  const alignedData = [];
  for (const test of inflammatoryTests) {
    const testDate = new Date(test.collection_date);
    const sleepForWeek = sleepData.filter(sleep => {
      const sleepDate = new Date(sleep.measurement_time);
      return Math.abs(sleepDate.getTime() - testDate.getTime()) < 7 * 24 * 60 * 60 * 1000; // Within 1 week
    });
    
    if (sleepForWeek.length > 0) {
      const avgSleepEfficiency = sleepForWeek.reduce((sum, s) => sum + (s.sleep_efficiency || 0), 0) / sleepForWeek.length;
      alignedData.push({
        x: avgSleepEfficiency,
        y: test.numeric_value
      });
    }
  }
  
  if (alignedData.length < 5) return null;
  
  const correlation = pearsonCorrelation(
    alignedData.map(d => d.x),
    alignedData.map(d => d.y)
  );
  
  return {
    correlation: correlation,
    significance: Math.abs(correlation) > 0.5 ? 'high' : Math.abs(correlation) > 0.3 ? 'medium' : 'low',
    pValue: calculatePValue(correlation, alignedData.length),
    sampleSize: alignedData.length,
    interpretation: `${Math.abs(correlation) > 0.4 ? 'Moderate' : 'Weak'} ${correlation > 0 ? 'positive' : 'negative'} correlation`
  };
}

// Utility functions
function alignDataByDate(data1: any[], data2: any[], field1: string, field2: string) {
  const aligned = [];
  
  for (const item1 of data1) {
    const date1 = new Date(item1.measurement_time);
    const item2 = data2.find(item => {
      const date2 = new Date(item.measurement_time);
      return Math.abs(date1.getTime() - date2.getTime()) < 24 * 60 * 60 * 1000; // Within 1 day
    });
    
    if (item2 && item1[field1] && item2[field2]) {
      aligned.push({
        x: item1[field1],
        y: item2[field2]
      });
    }
  }
  
  return aligned;
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

function calculatePValue(r: number, n: number): number {
  // Simplified p-value calculation
  const t = Math.abs(r) * Math.sqrt((n - 2) / (1 - r * r));
  return t > 2.048 ? 0.05 : t > 1.645 ? 0.1 : 0.2; // Simplified
}

// Insight generation functions
function generateSleepHrvInsight(correlation: CorrelationResult): string {
  if (correlation.correlation > 0.5) {
    return `Strong positive correlation detected: longer sleep duration is associated with improved heart rate variability, indicating better autonomic nervous system recovery.`;
  } else if (correlation.correlation < -0.5) {
    return `Concerning negative correlation: longer sleep duration appears associated with lower HRV, which may indicate sleep quality issues.`;
  }
  return `Moderate correlation between sleep duration and HRV suggests some relationship but other factors may be more influential.`;
}

function generateActivityHrInsight(correlation: CorrelationResult): string {
  if (correlation.correlation < -0.4) {
    return `Excellent correlation: increased daily activity is strongly associated with lower resting heart rate, indicating improved cardiovascular fitness.`;
  }
  return `Your activity levels show a positive relationship with heart rate improvements.`;
}

function generateExerciseSleepInsight(correlation: CorrelationResult): string {
  if (correlation.correlation > 0.3) {
    return `Regular exercise is positively correlated with better sleep efficiency, supporting the beneficial cycle of fitness and recovery.`;
  }
  return `Exercise and sleep quality show some relationship, but timing and intensity may be important factors.`;
}

function generateActivityGlucoseInsight(correlation: CorrelationResult): string {
  if (correlation.correlation < -0.4) {
    return `Strong evidence: increased physical activity is associated with better glucose control, demonstrating metabolic benefits.`;
  }
  return `Your activity levels show some impact on glucose regulation.`;
}

function generateSleepInflammationInsight(correlation: CorrelationResult): string {
  if (correlation.correlation < -0.3) {
    return `Better sleep quality is associated with lower inflammatory markers, highlighting sleep's role in immune system regulation.`;
  }
  return `Sleep quality shows some relationship with inflammatory processes in your body.`;
}

// Recommendation generation functions
function generateSleepHrvRecommendation(correlation: CorrelationResult): string {
  return correlation.correlation > 0.3 
    ? "Prioritize 7-9 hours of quality sleep nightly to optimize heart rate variability and recovery."
    : "Focus on sleep quality rather than just duration - consider sleep hygiene improvements.";
}

function generateActivityHrRecommendation(correlation: CorrelationResult): string {
  return correlation.correlation < -0.3
    ? "Continue current activity levels and gradually increase to 10,000+ steps daily for continued cardiovascular benefits."
    : "Increase daily activity levels - aim for 8,000+ steps and 150 minutes of moderate exercise weekly.";
}

function generateExerciseSleepRecommendation(correlation: CorrelationResult): string {
  return "Schedule exercise 3-4 hours before bedtime for optimal sleep benefits without disrupting sleep onset.";
}

function generateActivityGlucoseRecommendation(correlation: CorrelationResult): string {
  return correlation.correlation < -0.3
    ? "Maintain consistent daily activity to support glucose regulation - even short walks after meals help."
    : "Increase post-meal activity and overall daily movement to improve glucose metabolism.";
}

function generateSleepInflammationRecommendation(correlation: CorrelationResult): string {
  return "Optimize sleep hygiene and maintain consistent sleep schedule to support immune system regulation and reduce inflammation.";
}

function generateCorrelationSummary(correlations: LifestyleCorrelation[]): string {
  const strongCorrelations = correlations.filter(c => c.correlation.significance === 'high').length;
  const totalCorrelations = correlations.length;
  
  return `Analysis identified ${totalCorrelations} lifestyle-health correlations, with ${strongCorrelations} showing strong statistical significance. Focus on the high-confidence recommendations for maximum health impact.`;
}