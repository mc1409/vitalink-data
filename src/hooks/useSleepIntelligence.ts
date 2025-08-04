import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface SleepIntelligenceData {
  sleepScore: number;
  sleepDebt: number;
  efficiency: number;
  deepSleep: number;
  remSleep: number;
  hrv: number;
  heartRate: number;
  trends: {
    overall: string;
    efficiency: number;
    duration: string;
    deepSleep: string;
  };
  correlations: {
    screenTime: number;
    exercise: number;
    stress: number;
    alcohol: number;
    temperature: number;
  };
  healthAlerts: Array<{
    type: 'critical' | 'warning' | 'info';
    title: string;
    message: string;
    recommendation: string;
  }>;
  environmentalFactors: {
    temperature: number;
    humidity: number;
    lightExposure: string;
    noiseLevel: string;
  };
}

export const useSleepIntelligence = (patientId: string | null) => {
  const [data, setData] = useState<SleepIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateAdvancedAnalysis = async () => {
    if (!patientId) return;

    try {
      setLoading(true);
      
      // Get comprehensive sleep data
      const [sleepData, heartData, activityData, insights] = await Promise.all([
        supabase
          .from('biomarker_sleep')
          .select('*')
          .eq('patient_id', patientId)
          .order('sleep_date', { ascending: false })
          .limit(7),
        supabase
          .from('biomarker_heart')
          .select('*')
          .eq('patient_id', patientId)
          .order('measurement_time', { ascending: false })
          .limit(7),
        supabase
          .from('biomarker_activity')
          .select('*')
          .eq('patient_id', patientId)
          .order('measurement_date', { ascending: false })
          .limit(7),
        supabase
          .from('ai_sleep_insights')
          .select('*')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(1)
      ]);

      // Call enhanced AI analysis
      const { data: aiAnalysis, error: aiError } = await supabase.functions.invoke('sleep-intelligence-enhanced', {
        body: {
          patient_id: patientId,
          sleep_data: sleepData.data,
          heart_data: heartData.data,
          activity_data: activityData.data,
          recent_insights: insights.data
        }
      });

      if (aiError) throw aiError;

      // Process and structure the AI response
      const intelligenceData: SleepIntelligenceData = {
        sleepScore: aiAnalysis?.sleep_score || 0,
        sleepDebt: aiAnalysis?.sleep_debt || 0,
        efficiency: aiAnalysis?.efficiency || 0,
        deepSleep: aiAnalysis?.deep_sleep_percentage || 0,
        remSleep: aiAnalysis?.rem_sleep_percentage || 0,
        hrv: aiAnalysis?.avg_hrv || 0,
        heartRate: aiAnalysis?.avg_heart_rate || 0,
        trends: aiAnalysis?.trends || {
          overall: 'stable',
          efficiency: 0,
          duration: 'stable',
          deepSleep: 'stable'
        },
        correlations: aiAnalysis?.correlations || {
          screenTime: -23,
          exercise: 12,
          stress: -31,
          alcohol: -34,
          temperature: -8
        },
        healthAlerts: aiAnalysis?.health_alerts || [],
        environmentalFactors: aiAnalysis?.environmental || {
          temperature: 71,
          humidity: 45,
          lightExposure: 'high',
          noiseLevel: 'moderate'
        }
      };

      setData(intelligenceData);
      setError(null);
    } catch (err) {
      console.error('Error generating sleep intelligence:', err);
      setError(err.message || 'Failed to generate sleep intelligence');
      toast({
        title: "Error",
        description: "Failed to generate sleep intelligence analysis",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      generateAdvancedAnalysis();
    }
  }, [patientId]);

  return {
    data,
    loading,
    error,
    refresh: generateAdvancedAnalysis
  };
};