import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HealthData {
  healthScore: number | null;
  riskLevel: 'low' | 'medium' | 'high' | null;
  daysSinceLastLab: number | null;
  heartData: {
    restingHR: number | null;
    hrv: number | null;
    trend: number | null;
  };
  activityData: {
    steps: number | null;
    activeMinutes: number | null;
    calories: number | null;
    trend: number | null;
  };
  sleepData: {
    totalSleep: number | null;
    efficiency: number | null;
    quality: number | null;
    trend: number | null;
  };
}

interface AIInsight {
  level: 'critical' | 'warning' | 'optimal';
  metric: string;
  message: string;
  recommendation: string;
  confidence?: number;
}

export const useHealthData = (patientId: string | null) => {
  const [healthData, setHealthData] = useState<HealthData>({
    healthScore: null,
    riskLevel: null,
    daysSinceLastLab: null,
    heartData: { restingHR: null, hrv: null, trend: null },
    activityData: { steps: null, activeMinutes: null, calories: null, trend: null },
    sleepData: { totalSleep: null, efficiency: null, quality: null, trend: null }
  });
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    const fetchHealthData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch latest biomarker data in parallel
        const [heartResponse, sleepResponse, activityResponse, labResponse] = await Promise.all([
          // Latest heart data
          supabase
            .from('biomarker_heart')
            .select('resting_heart_rate, hrv_rmssd, measurement_time')
            .eq('patient_id', patientId)
            .order('measurement_time', { ascending: false })
            .limit(2),
          
          // Latest sleep data
          supabase
            .from('biomarker_sleep')
            .select('total_sleep_time, sleep_efficiency, sleep_score, measurement_time')
            .eq('patient_id', patientId)
            .order('measurement_time', { ascending: false })
            .limit(2),
          
          // Latest activity data
          supabase
            .from('biomarker_activity')
            .select('steps_count, exercise_minutes, total_calories, measurement_time')
            .eq('patient_id', patientId)
            .order('measurement_time', { ascending: false })
            .limit(2),
          
          // Latest lab results
          supabase
            .from('clinical_diagnostic_lab_tests')
            .select('collection_date')
            .eq('patient_id', patientId)
            .order('collection_date', { ascending: false })
            .limit(1)
        ]);

        // Process heart data
        const heartData = {
          restingHR: heartResponse.data?.[0]?.resting_heart_rate || null,
          hrv: heartResponse.data?.[0]?.hrv_rmssd || null,
          trend: heartResponse.data?.length >= 2 && heartResponse.data[0]?.hrv_rmssd && heartResponse.data[1]?.hrv_rmssd
            ? Math.round(((heartResponse.data[0].hrv_rmssd - heartResponse.data[1].hrv_rmssd) / heartResponse.data[1].hrv_rmssd) * 100)
            : null
        };

        // Process sleep data
        const sleepData = {
          totalSleep: sleepResponse.data?.[0]?.total_sleep_time ? Math.round(sleepResponse.data[0].total_sleep_time / 60 * 10) / 10 : null,
          efficiency: sleepResponse.data?.[0]?.sleep_efficiency || null,
          quality: sleepResponse.data?.[0]?.sleep_score || null,
          trend: sleepResponse.data?.length >= 2 && sleepResponse.data[0]?.sleep_efficiency && sleepResponse.data[1]?.sleep_efficiency
            ? Math.round(((sleepResponse.data[0].sleep_efficiency - sleepResponse.data[1].sleep_efficiency) / sleepResponse.data[1].sleep_efficiency) * 100)
            : null
        };

        // Process activity data
        const activityData = {
          steps: activityResponse.data?.[0]?.steps_count || null,
          activeMinutes: activityResponse.data?.[0]?.exercise_minutes || null,
          calories: activityResponse.data?.[0]?.total_calories || null,
          trend: activityResponse.data?.length >= 2 && activityResponse.data[0]?.steps_count && activityResponse.data[1]?.steps_count
            ? Math.round(((activityResponse.data[0].steps_count - activityResponse.data[1].steps_count) / activityResponse.data[1].steps_count) * 100)
            : null
        };

        // Calculate days since last lab
        const daysSinceLastLab = labResponse.data?.[0]?.collection_date 
          ? Math.floor((new Date().getTime() - new Date(labResponse.data[0].collection_date).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        // Fetch AI-generated health score with caching
        let healthScore = null;
        let riskLevel: 'low' | 'medium' | 'high' | null = null;
        
        try {
          // Check cache first
          const { data: cachedScore } = await supabase
            .from('ai_insights_cache')
            .select('generated_data, generated_at')
            .eq('patient_id', patientId)
            .eq('insight_type', 'health-score')
            .gte('expires_at', new Date().toISOString())
            .order('generated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (cachedScore && typeof cachedScore.generated_data === 'object' && cachedScore.generated_data !== null) {
            healthScore = (cachedScore.generated_data as any).overallScore;
          } else {
            // Generate new score
            const { data: scoreData } = await supabase.functions.invoke('health-score-calculator', {
              body: { patientId }
            });
            
            if (scoreData?.healthScore) {
              healthScore = Math.round(scoreData.healthScore.overallScore);
              
              // Cache the result for 1 hour
              await supabase
                .from('ai_insights_cache')
                .insert({
                  patient_id: patientId,
                  insight_type: 'health-score',
                  generated_data: scoreData.healthScore,
                  expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
                });
            }
          }
          
          // Determine risk level
          if (healthScore >= 80) riskLevel = 'low';
          else if (healthScore >= 60) riskLevel = 'medium';
          else riskLevel = 'high';
        } catch (scoreError) {
          console.warn('Health score calculation failed:', scoreError);
        }

        // Fetch AI insights
        try {
          const { data: insightsData } = await supabase.functions.invoke('critical-biomarker-analysis', {
            body: { patientId }
          });
          
          if (insightsData?.alerts) {
            const insights: AIInsight[] = insightsData.alerts.map((alert: any) => ({
              level: alert.level,
              metric: alert.metric,
              message: alert.message,
              recommendation: alert.recommendedAction,
              confidence: 85 // Default confidence score
            }));
            setAiInsights(insights);
          }
        } catch (insightsError) {
          console.warn('AI insights fetch failed:', insightsError);
        }

        setHealthData({
          healthScore,
          riskLevel,
          daysSinceLastLab,
          heartData,
          activityData,
          sleepData
        });

      } catch (err: any) {
        console.error('Error fetching health data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHealthData();
  }, [patientId]);

  return {
    healthData,
    aiInsights,
    loading,
    error
  };
};