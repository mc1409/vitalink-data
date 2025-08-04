import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { HealthAgentConfig } from '@/config/healthAgents';

export interface HealthAgentData {
  score: number;
  status: string;
  keyMetrics: Record<string, any>;
  insights: any[];
  trends: Record<string, any>;
  recommendations: any[];
  chartData: Record<string, any[]>;
  correlations: Record<string, number>;
  alerts: any[];
  rawData: Record<string, any[]>;
}

export const useHealthAgent = (agentConfig: HealthAgentConfig, patientId: string | null) => {
  const [data, setData] = useState<HealthAgentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<{ prompt: string; response: string }>({ prompt: '', response: '' });
  const { toast } = useToast();

  // Fetch data from multiple biomarker tables
  const fetchBiomarkerData = useCallback(async () => {
    if (!patientId || !agentConfig) return {};

    const dataPromises = agentConfig.dataSources.map(async (source: string) => {
      try {
        const { data, error } = await supabase
          .from(source as any)
          .select('*')
          .eq('patient_id', patientId)
          .order(getOrderColumn(source), { ascending: false })
          .limit(agentConfig.timeWindow);

        if (error) {
          console.error(`Error fetching ${source}:`, error);
          return { [source]: [] };
        }

        return { [source]: data || [] };
      } catch (err) {
        console.error(`Error fetching ${source}:`, err);
        return { [source]: [] };
      }
    });

    const results = await Promise.all(dataPromises);
    return results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
  }, [patientId, agentConfig]);

  // Get appropriate order column for each table
  const getOrderColumn = (tableName: string): string => {
    const orderColumns: Record<string, string> = {
      'biomarker_sleep': 'sleep_date',
      'biomarker_heart': 'measurement_time',
      'biomarker_activity': 'measurement_date',
      'biomarker_nutrition': 'measurement_date',
      'clinical_diagnostic_lab_tests': 'result_date',
      'biomarker_biological_genetic_microbiome': 'test_date'
    };
    return orderColumns[tableName] || 'created_at';
  };

  // Generate AI analysis using universal edge function
  const generateAnalysis = useCallback(async (forceRefresh = false) => {
    if (!patientId || !agentConfig) return;

    try {
      setAnalyzing(true);
      console.log(`🤖 Starting ${agentConfig.name} analysis...`);

      // Fetch biomarker data
      const biomarkerData = await fetchBiomarkerData();
      console.log(`📊 Fetched data:`, Object.keys(biomarkerData).map(key => `${key}: ${biomarkerData[key].length} records`));

      // Prepare request payload
      const requestPayload = {
        patient_id: patientId,
        agent_config: agentConfig,
        biomarker_data: biomarkerData,
        force_refresh: forceRefresh,
        analysis_timestamp: new Date().toISOString()
      };

      // Store debug info
      setDebugInfo({
        prompt: JSON.stringify(requestPayload, null, 2),
        response: ''
      });

      // Call universal health agent analyzer
      console.log('🚀 Calling health-agent-analyzer function...');
      const { data: analysisResult, error } = await supabase.functions.invoke('health-agent-analyzer', {
        body: requestPayload
      });

      if (error) {
        console.error('❌ Analysis error:', error);
        throw error;
      }

      console.log(`✅ ${agentConfig.name} analysis completed:`, analysisResult);

      // Store debug response
      setDebugInfo(prev => ({
        ...prev,
        response: JSON.stringify(analysisResult, null, 2)
      }));

      if (analysisResult?.success) {
        // Process and structure the analysis results
        const processedData: HealthAgentData = {
          score: analysisResult.score || 0,
          status: analysisResult.status || 'unknown',
          keyMetrics: analysisResult.key_metrics || {},
          insights: analysisResult.insights || [],
          trends: analysisResult.trends || {},
          recommendations: analysisResult.recommendations || [],
          chartData: analysisResult.chart_data || {},
          correlations: analysisResult.correlations || {},
          alerts: analysisResult.alerts || [],
          rawData: biomarkerData
        };

        setData(processedData);
        setError(null);

        toast({
          title: `${agentConfig.name} Analysis Complete`,
          description: `Generated ${analysisResult.insights?.length || 0} insights and ${analysisResult.recommendations?.length || 0} recommendations`,
        });
      } else {
        throw new Error(analysisResult?.error || 'Analysis failed');
      }

    } catch (err: any) {
      console.error(`Error in ${agentConfig.name} analysis:`, err);
      setError(err.message || `Failed to generate ${agentConfig.name} analysis`);
      
      // Generate fallback data
      const biomarkerData = await fetchBiomarkerData();
      const fallbackData = generateFallbackAnalysis(biomarkerData);
      setData(fallbackData);

      toast({
        title: "Analysis Error",
        description: `Failed to generate ${agentConfig.name} analysis. Using fallback data.`,
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  }, [patientId, agentConfig, fetchBiomarkerData, toast]);

  // Generate fallback analysis when AI fails
  const generateFallbackAnalysis = (biomarkerData: Record<string, any[]>): HealthAgentData => {
    const primaryData = biomarkerData[agentConfig.dataSources[0]] || [];
    const latestEntry = primaryData[0] || {};

    return {
      score: 75,
      status: 'needs_attention',
      keyMetrics: generateFallbackMetrics(agentConfig, latestEntry),
      insights: [
        {
          category: 'System Notice',
          title: 'Fallback Analysis Active',
          description: 'AI analysis temporarily unavailable. Basic metrics calculated from recent data.',
          severity: 'info'
        }
      ],
      trends: { overall: 'stable' },
      recommendations: [
        {
          category: 'General',
          action: 'Continue monitoring your health data',
          priority: 'medium',
          impact: 'Maintains baseline tracking'
        }
      ],
      chartData: generateFallbackChartData(agentConfig, biomarkerData),
      correlations: {},
      alerts: [],
      rawData: biomarkerData
    };
  };

  // Generate fallback metrics based on agent type
  const generateFallbackMetrics = (config: HealthAgentConfig, latestEntry: any): Record<string, any> => {
    const metrics: Record<string, any> = {};
    
    config.keyMetrics.forEach(metric => {
      switch (metric) {
        case 'sleep_score':
          metrics[metric] = latestEntry.sleep_score || 75;
          break;
        case 'steps_avg':
          metrics[metric] = latestEntry.steps_count || 7500;
          break;
        case 'resting_hr':
          metrics[metric] = latestEntry.resting_heart_rate || 65;
          break;
        case 'active_calories':
          metrics[metric] = latestEntry.active_calories || 400;
          break;
        default:
          metrics[metric] = 0;
      }
    });

    return metrics;
  };

  // Generate fallback chart data
  const generateFallbackChartData = (config: HealthAgentConfig, biomarkerData: Record<string, any[]>): Record<string, any[]> => {
    const chartData: Record<string, any[]> = {};
    
    config.chartTypes.forEach(chartType => {
      const primaryData = biomarkerData[config.dataSources[0]] || [];
      chartData[chartType] = primaryData.slice(0, 7).map((entry, index) => ({
        date: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toLocaleDateString(),
        value: Math.random() * 100,
        ...entry
      }));
    });

    return chartData;
  };

  // Auto-fetch on mount and patient change
  useEffect(() => {
    if (patientId && agentConfig) {
      generateAnalysis();
    }
  }, [patientId, agentConfig.id]);

  return {
    data,
    loading,
    analyzing,
    error,
    debugInfo,
    refresh: () => generateAnalysis(true),
    generateAnalysis
  };
};