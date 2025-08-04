import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SleepAnalysisRequest {
  patient_id: string;
  analysis_period?: 'daily' | 'weekly' | 'monthly';
  force_refresh?: boolean;
}

interface AgentTask {
  name: string;
  description: string;
  execute: (data: any) => Promise<any>;
}

class SleepAnalysisAgent {
  private supabase: any;
  private azureEndpoint: string;
  private azureApiKey: string;
  private azureDeployment: string;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    this.azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT') ?? '';
    this.azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY') ?? '';
    this.azureDeployment = Deno.env.get('AZURE_OPENAI_DEPLOYMENT') ?? '';
  }

  // CrewAI-style Agent: Data Analyst
  private dataAnalystAgent: AgentTask = {
    name: "Sleep Data Analyst",
    description: "Aggregates and processes sleep biomarker data from multiple sources",
    execute: async (patientId: string) => {
      console.log(`🔍 Data Analyst Agent processing patient: ${patientId}`);
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Fetch all relevant biomarker data
      const [sleepData, heartData, activityData, labData] = await Promise.all([
        this.supabase
          .from('biomarker_sleep')
          .select('*')
          .eq('patient_id', patientId)
          .gte('sleep_date', thirtyDaysAgo.toISOString().split('T')[0])
          .order('sleep_date', { ascending: false }),
        
        this.supabase
          .from('biomarker_heart')
          .select('*')
          .eq('patient_id', patientId)
          .gte('measurement_time', thirtyDaysAgo.toISOString())
          .order('measurement_time', { ascending: false }),
        
        this.supabase
          .from('biomarker_activity')
          .select('*')
          .eq('patient_id', patientId)
          .gte('measurement_date', thirtyDaysAgo.toISOString().split('T')[0])
          .order('measurement_date', { ascending: false }),
        
        this.supabase
          .from('clinical_diagnostic_lab_tests')
          .select('*')
          .eq('patient_id', patientId)
          .in('test_name', ['Cortisol', 'Melatonin', 'Vitamin D', 'Magnesium', 'Glucose'])
          .gte('collection_date', thirtyDaysAgo.toISOString().split('T')[0])
          .order('collection_date', { ascending: false })
      ]);

      return {
        sleepData: sleepData.data || [],
        heartData: heartData.data || [],
        activityData: activityData.data || [],
        labData: labData.data || [],
        dataQuality: this.assessDataQuality(sleepData.data, heartData.data, activityData.data)
      };
    }
  };

  // CrewAI-style Agent: Pattern Recognition Specialist
  private patternAnalystAgent: AgentTask = {
    name: "Pattern Recognition Specialist",
    description: "Identifies sleep patterns, trends, and correlations in biomarker data",
    execute: async (aggregatedData: any) => {
      console.log(`📊 Pattern Analyst Agent analyzing trends and correlations`);
      
      const { sleepData, heartData, activityData, labData } = aggregatedData;
      
      // Calculate sleep metrics
      const sleepMetrics = this.calculateSleepMetrics(sleepData);
      const correlations = this.findCorrelations(sleepData, heartData, activityData);
      const trends = this.identifyTrends(sleepData);
      const anomalies = this.detectAnomalies(sleepData);
      
      return {
        sleepMetrics,
        correlations,
        trends,
        anomalies,
        riskFactors: this.identifyRiskFactors(sleepData, labData),
        chronotype: this.determineChronotype(sleepData)
      };
    }
  };

  // CrewAI-style Agent: Health Advisory Specialist
  private healthAdvisorAgent: AgentTask = {
    name: "Health Advisory Specialist",
    description: "Generates personalized sleep recommendations using LLM analysis",
    execute: async (analysisData: any) => {
      console.log(`💡 Health Advisor Agent generating recommendations`);
      
      const llmAnalysis = await this.generateLLMInsights(analysisData);
      const recommendations = await this.generateRecommendations(analysisData, llmAnalysis);
      const sleepScore = this.calculateSleepQualityScore(analysisData);
      
      return {
        sleepQualityScore: sleepScore,
        recommendations,
        llmInsights: llmAnalysis,
        optimalSchedule: this.calculateOptimalSchedule(analysisData),
        keyFactors: this.identifyKeyFactors(analysisData)
      };
    }
  };

  // Main agent orchestration (CrewAI-style workflow)
  async executeSleepAnalysis(patientId: string, analysisPeriod: string = 'daily'): Promise<any> {
    const startTime = Date.now();
    console.log(`🚀 Starting CrewAI Sleep Analysis for patient: ${patientId}`);
    
    try {
      // Step 1: Data Collection (Data Analyst Agent)
      const aggregatedData = await this.dataAnalystAgent.execute(patientId);
      
      // Step 2: Pattern Analysis (Pattern Recognition Agent)  
      const patternAnalysis = await this.patternAnalystAgent.execute(aggregatedData);
      
      // Step 3: Health Advisory (Health Advisory Agent)
      const healthInsights = await this.healthAdvisorAgent.execute({
        ...aggregatedData,
        ...patternAnalysis
      });
      
      // Step 4: Store results
      const processingTime = Date.now() - startTime;
      const insight = await this.storeInsights(patientId, {
        ...patternAnalysis,
        ...healthInsights,
        analysisPeriod,
        processingTime,
        dataSources: ['biomarker_sleep', 'biomarker_heart', 'biomarker_activity', 'clinical_diagnostic_lab_tests']
      });
      
      console.log(`✅ Sleep analysis completed in ${processingTime}ms`);
      
      return {
        success: true,
        insight_id: insight.id,
        processing_time_ms: processingTime,
        analysis_summary: {
          sleep_quality_score: healthInsights.sleepQualityScore,
          pattern_trend: patternAnalysis.trends.overall,
          key_recommendations: healthInsights.recommendations.slice(0, 3),
          confidence_level: this.calculateConfidenceLevel(aggregatedData.dataQuality)
        }
      };
      
    } catch (error) {
      console.error('❌ Sleep analysis failed:', error);
      throw error;
    }
  }

  private async generateLLMInsights(analysisData: any): Promise<string> {
    const prompt = `You are a sleep medicine expert analyzing patient biomarker data. 
    
    Sleep Metrics: ${JSON.stringify(analysisData.sleepMetrics, null, 2)}
    Correlations: ${JSON.stringify(analysisData.correlations, null, 2)}
    Trends: ${JSON.stringify(analysisData.trends, null, 2)}
    Risk Factors: ${JSON.stringify(analysisData.riskFactors, null, 2)}
    
    Provide a comprehensive sleep health analysis focusing on:
    1. Overall sleep quality assessment
    2. Key factors affecting sleep
    3. Potential health implications
    4. Personalized insights based on patterns
    
    Keep response under 500 words and be specific about biomarker correlations.`;

    try {
      const response = await fetch(`${this.azureEndpoint}/openai/deployments/${this.azureDeployment}/chat/completions?api-version=2024-02-01`, {
        method: 'POST',
        headers: {
          'api-key': this.azureApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are a sleep medicine expert providing data-driven insights.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 800,
          temperature: 0.3,
        }),
      });

      const data = await response.json();
      return data.choices[0]?.message?.content || 'Analysis unavailable';
    } catch (error) {
      console.error('LLM analysis failed:', error);
      return 'LLM analysis temporarily unavailable';
    }
  }

  private calculateSleepMetrics(sleepData: any[]) {
    if (!sleepData.length) return {};
    
    const recent7Days = sleepData.slice(0, 7);
    const avgSleepDuration = recent7Days.reduce((sum, day) => sum + (day.total_sleep_time || 0), 0) / recent7Days.length;
    const avgSleepEfficiency = recent7Days.reduce((sum, day) => sum + (day.sleep_efficiency || 0), 0) / recent7Days.length;
    const avgDeepSleep = recent7Days.reduce((sum, day) => sum + (day.deep_sleep_minutes || 0), 0) / recent7Days.length;
    const avgRemSleep = recent7Days.reduce((sum, day) => sum + (day.rem_sleep_minutes || 0), 0) / recent7Days.length;
    
    return {
      avgSleepDuration: Math.round(avgSleepDuration),
      avgSleepEfficiency: Math.round(avgSleepEfficiency * 100) / 100,
      avgDeepSleep: Math.round(avgDeepSleep),
      avgRemSleep: Math.round(avgRemSleep),
      sleepDebt: this.calculateSleepDebt(recent7Days),
      consistency: this.calculateSleepConsistency(recent7Days)
    };
  }

  private findCorrelations(sleepData: any[], heartData: any[], activityData: any[]) {
    // Find correlations between sleep quality and other metrics
    return {
      hrvSleepCorrelation: this.calculateCorrelation(sleepData, heartData, 'sleep_efficiency', 'hrv_rmssd'),
      exerciseSleepCorrelation: this.calculateCorrelation(sleepData, activityData, 'sleep_efficiency', 'exercise_minutes'),
      stepsDeepSleepCorrelation: this.calculateCorrelation(sleepData, activityData, 'deep_sleep_minutes', 'steps_count')
    };
  }

  private identifyTrends(sleepData: any[]) {
    if (sleepData.length < 7) return { overall: 'insufficient_data' };
    
    const recent = sleepData.slice(0, 7);
    const previous = sleepData.slice(7, 14);
    
    const recentAvg = recent.reduce((sum, day) => sum + (day.sleep_efficiency || 0), 0) / recent.length;
    const previousAvg = previous.reduce((sum, day) => sum + (day.sleep_efficiency || 0), 0) / previous.length;
    
    const trend = recentAvg > previousAvg * 1.05 ? 'improving' : 
                  recentAvg < previousAvg * 0.95 ? 'declining' : 'stable';
    
    return {
      overall: trend,
      sleepEfficiencyTrend: trend,
      durationTrend: this.calculateTrend(recent, previous, 'total_sleep_time'),
      deepSleepTrend: this.calculateTrend(recent, previous, 'deep_sleep_minutes')
    };
  }

  private detectAnomalies(sleepData: any[]) {
    const anomalies = [];
    
    sleepData.forEach(day => {
      if (day.sleep_efficiency && day.sleep_efficiency < 0.7) {
        anomalies.push({ date: day.sleep_date, type: 'low_efficiency', value: day.sleep_efficiency });
      }
      if (day.total_sleep_time && day.total_sleep_time < 300) { // Less than 5 hours
        anomalies.push({ date: day.sleep_date, type: 'insufficient_sleep', value: day.total_sleep_time });
      }
    });
    
    return anomalies;
  }

  private async generateRecommendations(analysisData: any, llmInsights: string): Promise<any[]> {
    const recommendations = [];
    
    // Data-driven recommendations
    if (analysisData.sleepMetrics.avgSleepEfficiency < 0.8) {
      recommendations.push({
        category: 'sleep_hygiene',
        priority: 'high',
        title: 'Improve Sleep Efficiency',
        description: 'Your sleep efficiency is below optimal. Focus on consistent bedtime routine.',
        action: 'Set a consistent bedtime and wake time, avoid screens 1 hour before bed'
      });
    }
    
    if (analysisData.sleepMetrics.avgDeepSleep < 60) {
      recommendations.push({
        category: 'recovery',
        priority: 'medium',
        title: 'Increase Deep Sleep',
        description: 'Low deep sleep may affect recovery. Consider temperature and stress management.',
        action: 'Keep bedroom cool (65-68°F), practice relaxation before bed'
      });
    }
    
    // Correlation-based recommendations
    if (analysisData.correlations.exerciseSleepCorrelation > 0.3) {
      recommendations.push({
        category: 'exercise',
        priority: 'medium',
        title: 'Optimize Exercise Timing',
        description: 'Exercise shows positive correlation with sleep quality.',
        action: 'Maintain regular exercise, but avoid vigorous activity 3 hours before bed'
      });
    }
    
    return recommendations;
  }

  private calculateSleepQualityScore(analysisData: any): number {
    const { sleepMetrics, trends, anomalies } = analysisData;
    
    let score = 70; // Base score
    
    // Sleep efficiency impact
    if (sleepMetrics.avgSleepEfficiency > 0.85) score += 15;
    else if (sleepMetrics.avgSleepEfficiency > 0.75) score += 10;
    else if (sleepMetrics.avgSleepEfficiency < 0.7) score -= 20;
    
    // Duration impact
    if (sleepMetrics.avgSleepDuration >= 420 && sleepMetrics.avgSleepDuration <= 540) score += 10;
    else if (sleepMetrics.avgSleepDuration < 360) score -= 15;
    
    // Trend impact
    if (trends.overall === 'improving') score += 10;
    else if (trends.overall === 'declining') score -= 10;
    
    // Anomalies impact
    score -= Math.min(anomalies.length * 5, 20);
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private async storeInsights(patientId: string, insightData: any) {
    const nextAnalysisDate = new Date();
    nextAnalysisDate.setDate(nextAnalysisDate.getDate() + 1);
    
    const { data, error } = await this.supabase
      .from('ai_sleep_insights')
      .insert({
        patient_id: patientId,
        analysis_date: new Date().toISOString().split('T')[0],
        analysis_period: insightData.analysisPeriod,
        sleep_quality_score: insightData.sleepQualityScore,
        sleep_debt_hours: insightData.sleepMetrics?.sleepDebt,
        optimal_bedtime: insightData.optimalSchedule?.bedtime,
        optimal_wake_time: insightData.optimalSchedule?.wakeTime,
        predicted_sleep_duration: insightData.sleepMetrics?.avgSleepDuration,
        sleep_pattern_trend: insightData.trends?.overall,
        key_factors: insightData.keyFactors,
        recommendations: insightData.recommendations,
        confidence_level: this.calculateConfidenceLevel(insightData.dataQuality),
        processing_time_ms: insightData.processingTime,
        data_sources_used: insightData.dataSources,
        next_analysis_date: nextAnalysisDate.toISOString().split('T')[0]
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Helper methods
  private assessDataQuality(sleepData: any[], heartData: any[], activityData: any[]) {
    return {
      sleepDataPoints: sleepData.length,
      heartDataPoints: heartData.length,
      activityDataPoints: activityData.length,
      quality: sleepData.length >= 7 ? 'good' : sleepData.length >= 3 ? 'fair' : 'poor'
    };
  }

  private calculateSleepDebt(sleepData: any[]): number {
    const targetSleep = 480; // 8 hours in minutes
    const totalDebt = sleepData.reduce((debt, day) => {
      const shortfall = Math.max(0, targetSleep - (day.total_sleep_time || 0));
      return debt + shortfall;
    }, 0);
    return Math.round(totalDebt / 60 * 100) / 100; // Convert to hours
  }

  private calculateSleepConsistency(sleepData: any[]): number {
    if (sleepData.length < 3) return 0;
    
    const bedtimes = sleepData.map(day => {
      if (!day.bedtime) return null;
      const time = new Date(day.bedtime);
      return time.getHours() * 60 + time.getMinutes();
    }).filter(time => time !== null);
    
    if (bedtimes.length < 3) return 0;
    
    const variance = this.calculateVariance(bedtimes);
    return Math.max(0, 100 - variance / 10); // Lower variance = higher consistency
  }

  private calculateCorrelation(data1: any[], data2: any[], metric1: string, metric2: string): number {
    // Simplified correlation calculation
    const pairs = [];
    
    data1.forEach(item1 => {
      const date1 = item1.sleep_date || item1.measurement_date;
      const match = data2.find(item2 => {
        const date2 = item2.measurement_date || item2.sleep_date;
        return date1 === date2;
      });
      
      if (match && item1[metric1] && match[metric2]) {
        pairs.push([item1[metric1], match[metric2]]);
      }
    });
    
    if (pairs.length < 3) return 0;
    
    // Calculate Pearson correlation coefficient (simplified)
    const n = pairs.length;
    const sum1 = pairs.reduce((sum, pair) => sum + pair[0], 0);
    const sum2 = pairs.reduce((sum, pair) => sum + pair[1], 0);
    
    const mean1 = sum1 / n;
    const mean2 = sum2 / n;
    
    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;
    
    pairs.forEach(pair => {
      const diff1 = pair[0] - mean1;
      const diff2 = pair[1] - mean2;
      numerator += diff1 * diff2;
      denom1 += diff1 * diff1;
      denom2 += diff2 * diff2;
    });
    
    const denominator = Math.sqrt(denom1 * denom2);
    return denominator === 0 ? 0 : Math.round((numerator / denominator) * 100) / 100;
  }

  private calculateTrend(recent: any[], previous: any[], metric: string): string {
    const recentAvg = recent.reduce((sum, item) => sum + (item[metric] || 0), 0) / recent.length;
    const previousAvg = previous.reduce((sum, item) => sum + (item[metric] || 0), 0) / previous.length;
    
    return recentAvg > previousAvg * 1.05 ? 'improving' : 
           recentAvg < previousAvg * 0.95 ? 'declining' : 'stable';
  }

  private identifyRiskFactors(sleepData: any[], labData: any[]): any[] {
    const risks = [];
    
    // Check for chronic sleep deprivation
    const avgSleep = sleepData.reduce((sum, day) => sum + (day.total_sleep_time || 0), 0) / sleepData.length;
    if (avgSleep < 360) { // Less than 6 hours
      risks.push({ factor: 'chronic_sleep_deprivation', severity: 'high', value: avgSleep });
    }
    
    // Check lab values
    labData.forEach(lab => {
      if (lab.test_name === 'Cortisol' && lab.numeric_value > 25) {
        risks.push({ factor: 'elevated_cortisol', severity: 'medium', value: lab.numeric_value });
      }
    });
    
    return risks;
  }

  private determineChronotype(sleepData: any[]): string {
    const bedtimes = sleepData
      .filter(day => day.bedtime)
      .map(day => new Date(day.bedtime).getHours());
    
    if (bedtimes.length < 3) return 'unknown';
    
    const avgBedtime = bedtimes.reduce((sum, hour) => sum + hour, 0) / bedtimes.length;
    
    if (avgBedtime <= 22) return 'morning_type';
    if (avgBedtime >= 24) return 'evening_type';
    return 'intermediate_type';
  }

  private calculateOptimalSchedule(analysisData: any): any {
    const { sleepMetrics, chronotype } = analysisData;
    
    // Base recommendations on chronotype and current patterns
    let optimalBedtime = '22:30:00';
    let optimalWakeTime = '07:00:00';
    
    if (chronotype === 'evening_type') {
      optimalBedtime = '23:30:00';
      optimalWakeTime = '08:00:00';
    } else if (chronotype === 'morning_type') {
      optimalBedtime = '21:30:00';
      optimalWakeTime = '06:00:00';
    }
    
    return { bedtime: optimalBedtime, wakeTime: optimalWakeTime };
  }

  private identifyKeyFactors(analysisData: any): any {
    const factors = {};
    
    // Sleep efficiency factor
    if (analysisData.sleepMetrics.avgSleepEfficiency < 0.8) {
      factors.sleep_efficiency = {
        impact: 'negative',
        severity: 'high',
        current_value: analysisData.sleepMetrics.avgSleepEfficiency
      };
    }
    
    // Exercise correlation factor
    if (Math.abs(analysisData.correlations.exerciseSleepCorrelation) > 0.3) {
      factors.exercise_timing = {
        impact: analysisData.correlations.exerciseSleepCorrelation > 0 ? 'positive' : 'negative',
        severity: 'medium',
        correlation: analysisData.correlations.exerciseSleepCorrelation
      };
    }
    
    return factors;
  }

  private calculateConfidenceLevel(dataQuality: any): number {
    switch (dataQuality.quality) {
      case 'good': return 0.9;
      case 'fair': return 0.7;
      case 'poor': return 0.5;
      default: return 0.3;
    }
  }

  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Initialize the agent
    const agent = new SleepAnalysisAgent();

    // API Routes
    if (pathname === '/sleep-analysis-agent/analyze' && req.method === 'POST') {
      const { patient_id, analysis_period = 'daily', force_refresh = false }: SleepAnalysisRequest = await req.json();
      
      if (!patient_id) {
        return new Response(JSON.stringify({ error: 'patient_id is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const result = await agent.executeSleepAnalysis(patient_id, analysis_period);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get latest insights for a patient
    if (pathname === '/sleep-analysis-agent/insights' && req.method === 'GET') {
      const patientId = url.searchParams.get('patient_id');
      const limit = parseInt(url.searchParams.get('limit') || '10');
      
      if (!patientId) {
        return new Response(JSON.stringify({ error: 'patient_id parameter is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data, error } = await supabase
        .from('ai_sleep_insights')
        .select('*')
        .eq('patient_id', patientId)
        .order('analysis_date', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return new Response(JSON.stringify({ insights: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // API Documentation endpoint
    if (pathname === '/sleep-analysis-agent/docs' && req.method === 'GET') {
      const docs = {
        name: "CrewAI Sleep Analysis Agent API",
        version: "1.0.0",
        description: "AI-powered sleep analysis agent using CrewAI methodology for comprehensive biomarker analysis",
        endpoints: {
          "POST /sleep-analysis-agent/analyze": {
            description: "Execute comprehensive sleep analysis for a patient",
            parameters: {
              patient_id: { type: "string", required: true, description: "UUID of the patient" },
              analysis_period: { type: "string", required: false, default: "daily", enum: ["daily", "weekly", "monthly"] },
              force_refresh: { type: "boolean", required: false, default: false, description: "Force new analysis even if recent exists" }
            },
            response: {
              success: "boolean",
              insight_id: "string (UUID)",
              processing_time_ms: "number",
              analysis_summary: {
                sleep_quality_score: "number (0-100)",
                pattern_trend: "string (improving|declining|stable|inconsistent)",
                key_recommendations: "array of top 3 recommendations",
                confidence_level: "number (0-1)"
              }
            }
          },
          "GET /sleep-analysis-agent/insights": {
            description: "Retrieve stored sleep insights for a patient",
            parameters: {
              patient_id: { type: "string", required: true, description: "UUID of the patient" },
              limit: { type: "number", required: false, default: 10, description: "Number of insights to return" }
            },
            response: {
              insights: "array of ai_sleep_insights records"
            }
          },
          "GET /sleep-analysis-agent/docs": {
            description: "Get API documentation",
            response: "This documentation object"
          }
        },
        agent_architecture: {
          agents: [
            {
              name: "Sleep Data Analyst",
              role: "Data aggregation and quality assessment",
              data_sources: ["biomarker_sleep", "biomarker_heart", "biomarker_activity", "clinical_diagnostic_lab_tests"]
            },
            {
              name: "Pattern Recognition Specialist",
              role: "Trend analysis, correlation detection, anomaly identification",
              methods: ["time series analysis", "correlation matrices", "statistical outlier detection"]
            },
            {
              name: "Health Advisory Specialist", 
              role: "LLM-powered insights and personalized recommendations",
              capabilities: ["Azure OpenAI integration", "evidence-based recommendations", "risk assessment"]
            }
          ],
          workflow: [
            "1. Data Collection: Aggregate 30-day biomarker history",
            "2. Pattern Analysis: Identify trends, correlations, and anomalies",
            "3. LLM Analysis: Generate contextual health insights",
            "4. Recommendation Engine: Create personalized action items",
            "5. Storage: Persist insights with confidence scoring"
          ]
        },
        data_schema: {
          input_tables: {
            biomarker_sleep: ["total_sleep_time", "sleep_efficiency", "rem_sleep_minutes", "deep_sleep_minutes", "hrv_score"],
            biomarker_heart: ["resting_heart_rate", "hrv_rmssd", "hrv_sdnn"],
            biomarker_activity: ["steps_count", "exercise_minutes", "workout_calories"],
            clinical_diagnostic_lab_tests: ["cortisol", "melatonin", "vitamin_d", "magnesium", "glucose"]
          },
          output_table: "ai_sleep_insights",
          key_metrics: ["sleep_quality_score", "sleep_debt_hours", "optimal_bedtime", "pattern_trend", "confidence_level"]
        }
      };

      return new Response(JSON.stringify(docs, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 404 for unknown endpoints
    return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Sleep Analysis Agent Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});