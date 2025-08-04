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
    
    console.log('🔧 Azure OpenAI Config:', {
      hasEndpoint: !!this.azureEndpoint,
      hasApiKey: !!this.azureApiKey,
      hasDeployment: !!this.azureDeployment,
      endpoint: this.azureEndpoint ? 'configured' : 'missing'
    });
  }

  async executeSleepAnalysis(patientId: string, analysisPeriod: string = 'daily'): Promise<any> {
    const startTime = Date.now();
    console.log(`🚀 Starting Sleep Analysis for patient: ${patientId}`);
    
    try {
      // Step 1: Collect comprehensive biomarker data
      console.log('📊 Step 1: Collecting biomarker data...');
      const biomarkerData = await this.collectBiomarkerData(patientId);
      
      if (biomarkerData.sleepData.length === 0) {
        throw new Error('No sleep data found for this patient');
      }
      
      console.log(`✅ Data collected: ${biomarkerData.sleepData.length} sleep records, ${biomarkerData.heartData.length} heart records`);
      
      // Step 2: Analyze patterns and calculate metrics
      console.log('🔍 Step 2: Analyzing patterns...');
      const analysis = await this.analyzePatterns(biomarkerData);
      
      // Step 3: Generate AI insights (with fallback if Azure not configured)
      console.log('🤖 Step 3: Generating AI insights...');
      const insights = await this.generateInsights(analysis);
      
      // Step 4: Calculate comprehensive scores
      console.log('📈 Step 4: Calculating scores...');
      const scores = this.calculateScores(analysis);
      
      // Step 5: Generate recommendations
      console.log('💡 Step 5: Creating recommendations...');
      const recommendations = this.generateRecommendations(analysis, scores);
      
      // Step 6: Store results
      console.log('💾 Step 6: Storing results...');
      const processingTime = Date.now() - startTime;
      const storedInsight = await this.storeInsights(patientId, {
        analysis,
        insights,
        scores,
        recommendations,
        analysisPeriod,
        processingTime
      });
      
      console.log(`✅ Sleep analysis completed in ${processingTime}ms`);
      
      return {
        success: true,
        insight_id: storedInsight.id,
        processing_time_ms: processingTime,
        analysis_summary: {
          sleep_quality_score: scores.sleepQualityScore,
          pattern_trend: analysis.trends.overall,
          key_recommendations: recommendations.slice(0, 3),
          confidence_level: scores.confidenceLevel,
          data_quality: biomarkerData.dataQuality
        }
      };
      
    } catch (error) {
      console.error('❌ Sleep analysis failed:', error);
      throw new Error(`Sleep analysis failed: ${error.message}`);
    }
  }

  private async collectBiomarkerData(patientId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateString = thirtyDaysAgo.toISOString().split('T')[0];
    
    console.log(`📅 Fetching data from ${dateString} onwards for patient ${patientId}`);
    
    const [sleepResult, heartResult, activityResult] = await Promise.all([
      this.supabase
        .from('biomarker_sleep')
        .select('*')
        .eq('patient_id', patientId)
        .gte('sleep_date', dateString)
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
        .gte('measurement_date', dateString)
        .order('measurement_date', { ascending: false })
    ]);

    if (sleepResult.error) {
      console.error('❌ Sleep data error:', sleepResult.error);
      throw new Error(`Failed to fetch sleep data: ${sleepResult.error.message}`);
    }
    
    if (heartResult.error) {
      console.error('⚠️ Heart data error:', heartResult.error);
    }
    
    if (activityResult.error) {
      console.error('⚠️ Activity data error:', activityResult.error);
    }

    const sleepData = sleepResult.data || [];
    const heartData = heartResult.data || [];
    const activityData = activityResult.data || [];
    
    const dataQuality = this.assessDataQuality(sleepData, heartData, activityData);
    
    console.log('📊 Data collection summary:', {
      sleepRecords: sleepData.length,
      heartRecords: heartData.length,
      activityRecords: activityData.length,
      dataQuality: dataQuality.quality
    });

    return {
      sleepData,
      heartData,
      activityData,
      dataQuality
    };
  }

  private async analyzePatterns(biomarkerData: any) {
    const { sleepData, heartData, activityData } = biomarkerData;
    
    // Calculate sleep metrics
    const sleepMetrics = this.calculateSleepMetrics(sleepData);
    console.log('😴 Sleep metrics:', sleepMetrics);
    
    // Identify trends
    const trends = this.identifyTrends(sleepData);
    console.log('📈 Trends:', trends);
    
    // Find correlations
    const correlations = this.findCorrelations(sleepData, heartData, activityData);
    console.log('🔗 Correlations:', correlations);
    
    // Detect anomalies
    const anomalies = this.detectAnomalies(sleepData);
    console.log('⚠️ Anomalies found:', anomalies.length);
    
    // Determine chronotype
    const chronotype = this.determineChronotype(sleepData);
    console.log('🕒 Chronotype:', chronotype);
    
    return {
      sleepMetrics,
      trends,
      correlations,
      anomalies,
      chronotype,
      dataRange: {
        startDate: sleepData[sleepData.length - 1]?.sleep_date,
        endDate: sleepData[0]?.sleep_date,
        totalDays: sleepData.length
      }
    };
  }

  private async generateInsights(analysis: any): Promise<string> {
    // Check if Azure OpenAI is configured
    if (!this.azureEndpoint || !this.azureApiKey || !this.azureDeployment) {
      console.log('⚠️ Azure OpenAI not configured, using rule-based insights');
      return this.generateRuleBasedInsights(analysis);
    }

    const prompt = `You are a sleep medicine expert analyzing comprehensive biomarker data. 
    
    PATIENT SLEEP ANALYSIS:
    - Sleep Duration: ${analysis.sleepMetrics.avgSleepDuration} minutes average
    - Sleep Efficiency: ${analysis.sleepMetrics.avgSleepEfficiency}%
    - Deep Sleep: ${analysis.sleepMetrics.avgDeepSleep} minutes
    - REM Sleep: ${analysis.sleepMetrics.avgRemSleep} minutes
    - Sleep Debt: ${analysis.sleepMetrics.sleepDebt} hours
    - Consistency: ${analysis.sleepMetrics.consistency}%
    - Overall Trend: ${analysis.trends.overall}
    - Chronotype: ${analysis.chronotype}
    - Anomalies: ${analysis.anomalies.length} detected
    
    CORRELATIONS:
    ${JSON.stringify(analysis.correlations, null, 2)}
    
    Provide a comprehensive sleep health analysis focusing on:
    1. Overall sleep quality assessment
    2. Key factors affecting sleep
    3. Potential health implications
    4. Personalized insights based on patterns
    
    Keep response under 400 words and be specific about actionable insights.`;

    try {
      console.log('🤖 Calling Azure OpenAI...');
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
          max_tokens: 600,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Azure OpenAI API error:', response.status, errorText);
        throw new Error(`Azure OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiInsights = data.choices[0]?.message?.content || 'AI analysis unavailable';
      console.log('✅ AI insights generated successfully');
      return aiInsights;
    } catch (error) {
      console.error('❌ AI insight generation failed:', error);
      return this.generateRuleBasedInsights(analysis);
    }
  }

  private generateRuleBasedInsights(analysis: any): string {
    const { sleepMetrics, trends, anomalies, chronotype } = analysis;
    
    let insights = `Sleep Analysis Summary:\n\n`;
    
    // Sleep Quality Assessment
    if (sleepMetrics.avgSleepEfficiency > 85) {
      insights += `✅ Excellent sleep efficiency at ${sleepMetrics.avgSleepEfficiency}% - you're falling asleep quickly and staying asleep.\n\n`;
    } else if (sleepMetrics.avgSleepEfficiency > 75) {
      insights += `⚠️ Good sleep efficiency at ${sleepMetrics.avgSleepEfficiency}% - room for improvement in sleep quality.\n\n`;
    } else {
      insights += `❌ Poor sleep efficiency at ${sleepMetrics.avgSleepEfficiency}% - significant sleep disruption detected.\n\n`;
    }
    
    // Sleep Duration
    if (sleepMetrics.avgSleepDuration >= 420 && sleepMetrics.avgSleepDuration <= 540) {
      insights += `✅ Optimal sleep duration averaging ${Math.round(sleepMetrics.avgSleepDuration/60*10)/10} hours.\n\n`;
    } else if (sleepMetrics.avgSleepDuration < 420) {
      insights += `❌ Insufficient sleep duration at ${Math.round(sleepMetrics.avgSleepDuration/60*10)/10} hours - aim for 7-9 hours.\n\n`;
    } else {
      insights += `⚠️ Extended sleep duration at ${Math.round(sleepMetrics.avgSleepDuration/60*10)/10} hours - may indicate recovery needs.\n\n`;
    }
    
    // Trends
    if (trends.overall === 'improving') {
      insights += `📈 Positive trend: Your sleep patterns are improving over time.\n\n`;
    } else if (trends.overall === 'declining') {
      insights += `📉 Concerning trend: Sleep quality has declined recently - investigate potential causes.\n\n`;
    } else {
      insights += `📊 Stable patterns: Sleep consistency maintained over the analysis period.\n\n`;
    }
    
    // Sleep Debt
    if (sleepMetrics.sleepDebt > 5) {
      insights += `⚠️ Significant sleep debt of ${sleepMetrics.sleepDebt} hours - prioritize recovery sleep.\n\n`;
    } else if (sleepMetrics.sleepDebt > 2) {
      insights += `⚠️ Moderate sleep debt of ${sleepMetrics.sleepDebt} hours - weekend recovery recommended.\n\n`;
    }
    
    // Chronotype insights
    insights += `🕒 Chronotype: ${chronotype} - align your schedule with your natural sleep preferences.\n\n`;
    
    // Anomalies
    if (anomalies.length > 0) {
      insights += `⚠️ ${anomalies.length} sleep anomalies detected - review recent lifestyle changes.`;
    }
    
    return insights;
  }

  private calculateScores(analysis: any) {
    const { sleepMetrics, trends, anomalies } = analysis;
    
    let sleepQualityScore = 70; // Base score
    
    // Sleep efficiency impact (30 points)
    if (sleepMetrics.avgSleepEfficiency > 90) sleepQualityScore += 20;
    else if (sleepMetrics.avgSleepEfficiency > 85) sleepQualityScore += 15;
    else if (sleepMetrics.avgSleepEfficiency > 80) sleepQualityScore += 10;
    else if (sleepMetrics.avgSleepEfficiency > 75) sleepQualityScore += 5;
    else if (sleepMetrics.avgSleepEfficiency < 70) sleepQualityScore -= 25;
    
    // Duration impact (15 points)
    if (sleepMetrics.avgSleepDuration >= 420 && sleepMetrics.avgSleepDuration <= 540) {
      sleepQualityScore += 10;
    } else if (sleepMetrics.avgSleepDuration < 360) {
      sleepQualityScore -= 20;
    } else if (sleepMetrics.avgSleepDuration > 600) {
      sleepQualityScore -= 10;
    }
    
    // Trend impact (10 points)
    if (trends.overall === 'improving') sleepQualityScore += 10;
    else if (trends.overall === 'declining') sleepQualityScore -= 15;
    
    // Consistency impact (10 points)
    if (sleepMetrics.consistency > 80) sleepQualityScore += 10;
    else if (sleepMetrics.consistency < 60) sleepQualityScore -= 10;
    
    // Anomalies impact
    sleepQualityScore -= Math.min(anomalies.length * 3, 15);
    
    // Sleep debt impact
    if (sleepMetrics.sleepDebt > 5) sleepQualityScore -= 15;
    else if (sleepMetrics.sleepDebt > 2) sleepQualityScore -= 8;
    
    sleepQualityScore = Math.max(0, Math.min(100, Math.round(sleepQualityScore)));
    
    // Calculate confidence level
    const dataPoints = analysis.dataRange.totalDays;
    let confidenceLevel = 0.5;
    if (dataPoints >= 30) confidenceLevel = 0.95;
    else if (dataPoints >= 14) confidenceLevel = 0.85;
    else if (dataPoints >= 7) confidenceLevel = 0.75;
    else if (dataPoints >= 3) confidenceLevel = 0.65;
    
    return {
      sleepQualityScore,
      confidenceLevel: Math.round(confidenceLevel * 100) / 100
    };
  }

  private generateRecommendations(analysis: any, scores: any) {
    const recommendations = [];
    const { sleepMetrics, trends, correlations, chronotype } = analysis;
    
    // Sleep efficiency recommendations
    if (sleepMetrics.avgSleepEfficiency < 80) {
      recommendations.push({
        category: 'sleep_hygiene',
        priority: 'high',
        title: 'Improve Sleep Efficiency',
        description: `Your sleep efficiency is ${sleepMetrics.avgSleepEfficiency}%. Focus on consistent bedtime routines.`,
        action: 'Set consistent bedtime/wake times, avoid screens 1 hour before bed, keep bedroom cool'
      });
    }
    
    // Duration recommendations
    if (sleepMetrics.avgSleepDuration < 420) {
      recommendations.push({
        category: 'duration',
        priority: 'high',
        title: 'Increase Sleep Duration',
        description: `You're averaging ${Math.round(sleepMetrics.avgSleepDuration/60*10)/10} hours. Aim for 7-9 hours.`,
        action: 'Move bedtime earlier by 30 minutes weekly until reaching 7-8 hours total'
      });
    }
    
    // Deep sleep recommendations
    if (sleepMetrics.avgDeepSleep < 60) {
      recommendations.push({
        category: 'recovery',
        priority: 'medium',
        title: 'Enhance Deep Sleep',
        description: 'Low deep sleep may affect recovery and memory consolidation.',
        action: 'Keep bedroom temperature 65-68°F, avoid caffeine after 2 PM, exercise regularly'
      });
    }
    
    // Consistency recommendations
    if (sleepMetrics.consistency < 70) {
      recommendations.push({
        category: 'consistency',
        priority: 'medium',
        title: 'Improve Sleep Consistency',
        description: 'Irregular sleep patterns can disrupt your circadian rhythm.',
        action: 'Maintain same bedtime/wake time within 30 minutes, even on weekends'
      });
    }
    
    // Sleep debt recommendations
    if (sleepMetrics.sleepDebt > 3) {
      recommendations.push({
        category: 'recovery',
        priority: 'high',
        title: 'Address Sleep Debt',
        description: `You have ${sleepMetrics.sleepDebt} hours of accumulated sleep debt.`,
        action: 'Add 30-60 minutes to nightly sleep until debt is recovered'
      });
    }
    
    // Chronotype recommendations
    if (chronotype !== 'unknown') {
      recommendations.push({
        category: 'chronotype',
        priority: 'low',
        title: 'Align with Natural Rhythm',
        description: `Your chronotype is ${chronotype} - optimize schedule accordingly.`,
        action: chronotype === 'morning' ? 
          'Schedule important activities in morning hours' : 
          'Allow for later bedtime if lifestyle permits'
      });
    }
    
    // Trend-based recommendations
    if (trends.overall === 'declining') {
      recommendations.push({
        category: 'intervention',
        priority: 'high',
        title: 'Address Declining Trend',
        description: 'Sleep quality has declined recently.',
        action: 'Review recent lifestyle changes, stress levels, and environmental factors'
      });
    }
    
    return recommendations;
  }

  private async storeInsights(patientId: string, insightData: any) {
    const nextAnalysisDate = new Date();
    nextAnalysisDate.setDate(nextAnalysisDate.getDate() + 1);
    
    const insertData = {
      patient_id: patientId,
      analysis_date: new Date().toISOString().split('T')[0],
      analysis_period: insightData.analysisPeriod,
      sleep_quality_score: insightData.scores.sleepQualityScore,
      sleep_debt_hours: insightData.analysis.sleepMetrics.sleepDebt,
      optimal_bedtime: this.calculateOptimalBedtime(insightData.analysis),
      optimal_wake_time: this.calculateOptimalWakeTime(insightData.analysis),
      predicted_sleep_duration: insightData.analysis.sleepMetrics.avgSleepDuration,
      sleep_pattern_trend: insightData.analysis.trends.overall,
      key_factors: this.identifyKeyFactors(insightData.analysis),
      recommendations: insightData.recommendations,
      confidence_level: insightData.scores.confidenceLevel,
      processing_time_ms: insightData.processingTime,
      data_sources_used: ['biomarker_sleep', 'biomarker_heart', 'biomarker_activity'],
      next_analysis_date: nextAnalysisDate.toISOString().split('T')[0]
    };
    
    console.log('💾 Storing insight data:', insertData);
    
    const { data, error } = await this.supabase
      .from('ai_sleep_insights')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error storing insights:', error);
      throw new Error(`Failed to store insights: ${error.message}`);
    }
    
    console.log('✅ Insights stored successfully with ID:', data.id);
    return data;
  }

  // Helper methods
  private assessDataQuality(sleepData: any[], heartData: any[], activityData: any[]) {
    const quality = sleepData.length >= 14 ? 'excellent' : 
                   sleepData.length >= 7 ? 'good' : 
                   sleepData.length >= 3 ? 'fair' : 'poor';
    
    return {
      sleepDataPoints: sleepData.length,
      heartDataPoints: heartData.length,
      activityDataPoints: activityData.length,
      quality
    };
  }

  private calculateSleepMetrics(sleepData: any[]) {
    if (!sleepData.length) return {};
    
    const recent7Days = sleepData.slice(0, Math.min(7, sleepData.length));
    const recent30Days = sleepData.slice(0, Math.min(30, sleepData.length));
    
    const avgSleepDuration = recent7Days.reduce((sum, day) => sum + (day.total_sleep_time || 0), 0) / recent7Days.length;
    const avgSleepEfficiency = recent7Days.reduce((sum, day) => sum + ((day.sleep_efficiency || 0) * 100), 0) / recent7Days.length;
    const avgDeepSleep = recent7Days.reduce((sum, day) => sum + (day.deep_sleep_minutes || 0), 0) / recent7Days.length;
    const avgRemSleep = recent7Days.reduce((sum, day) => sum + (day.rem_sleep_minutes || 0), 0) / recent7Days.length;
    
    return {
      avgSleepDuration: Math.round(avgSleepDuration),
      avgSleepEfficiency: Math.round(avgSleepEfficiency * 10) / 10,
      avgDeepSleep: Math.round(avgDeepSleep),
      avgRemSleep: Math.round(avgRemSleep),
      sleepDebt: this.calculateSleepDebt(recent7Days),
      consistency: this.calculateSleepConsistency(recent30Days)
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
    if (sleepData.length < 3) return 50;
    
    const bedtimes = sleepData.map(day => {
      if (!day.bedtime) return null;
      const time = new Date(day.bedtime);
      return time.getHours() * 60 + time.getMinutes();
    }).filter(time => time !== null);
    
    if (bedtimes.length < 3) return 50;
    
    const mean = bedtimes.reduce((sum, time) => sum + time, 0) / bedtimes.length;
    const variance = bedtimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / bedtimes.length;
    const stdDev = Math.sqrt(variance);
    
    // Convert to percentage (lower variance = higher consistency)
    return Math.max(0, Math.min(100, Math.round(100 - (stdDev / 60) * 10)));
  }

  private identifyTrends(sleepData: any[]) {
    if (sleepData.length < 7) return { overall: 'insufficient_data' };
    
    const recent = sleepData.slice(0, 7);
    const previous = sleepData.slice(7, 14);
    
    if (previous.length === 0) return { overall: 'stable' };
    
    const recentAvgEfficiency = recent.reduce((sum, day) => sum + ((day.sleep_efficiency || 0) * 100), 0) / recent.length;
    const previousAvgEfficiency = previous.reduce((sum, day) => sum + ((day.sleep_efficiency || 0) * 100), 0) / previous.length;
    
    const efficiencyChange = ((recentAvgEfficiency - previousAvgEfficiency) / previousAvgEfficiency) * 100;
    
    let trend = 'stable';
    if (efficiencyChange > 5) trend = 'improving';
    else if (efficiencyChange < -5) trend = 'declining';
    
    return {
      overall: trend,
      sleepEfficiencyChange: Math.round(efficiencyChange * 10) / 10,
      durationTrend: this.calculateMetricTrend(recent, previous, 'total_sleep_time'),
      deepSleepTrend: this.calculateMetricTrend(recent, previous, 'deep_sleep_minutes')
    };
  }

  private calculateMetricTrend(recent: any[], previous: any[], metric: string): string {
    if (previous.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, item) => sum + (item[metric] || 0), 0) / recent.length;
    const previousAvg = previous.reduce((sum, item) => sum + (item[metric] || 0), 0) / previous.length;
    
    const change = ((recentAvg - previousAvg) / previousAvg) * 100;
    
    if (change > 5) return 'improving';
    else if (change < -5) return 'declining';
    else return 'stable';
  }

  private findCorrelations(sleepData: any[], heartData: any[], activityData: any[]) {
    return {
      sleepDurationVariability: this.calculateVariability(sleepData, 'total_sleep_time'),
      sleepEfficiencyVariability: this.calculateVariability(sleepData, 'sleep_efficiency'),
      exerciseImpact: this.assessExerciseImpact(sleepData, activityData),
      heartRatePattern: this.assessHeartRatePattern(sleepData, heartData)
    };
  }

  private calculateVariability(data: any[], metric: string): string {
    if (data.length < 3) return 'insufficient_data';
    
    const values = data.map(item => item[metric]).filter(val => val != null);
    if (values.length < 3) return 'insufficient_data';
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const cv = Math.sqrt(variance) / mean * 100; // Coefficient of variation
    
    if (cv < 10) return 'low';
    else if (cv < 20) return 'moderate';
    else return 'high';
  }

  private assessExerciseImpact(sleepData: any[], activityData: any[]): string {
    if (sleepData.length < 5 || activityData.length < 5) return 'insufficient_data';
    
    // Simple correlation between exercise and sleep quality
    let correlationSum = 0;
    let correlationCount = 0;
    
    sleepData.forEach(sleep => {
      const matchingActivity = activityData.find(activity => 
        activity.measurement_date === sleep.sleep_date
      );
      
      if (matchingActivity && sleep.sleep_efficiency && matchingActivity.exercise_minutes) {
        const exerciseLevel = matchingActivity.exercise_minutes > 30 ? 1 : 0;
        const sleepQuality = sleep.sleep_efficiency > 0.8 ? 1 : 0;
        correlationSum += exerciseLevel === sleepQuality ? 1 : 0;
        correlationCount++;
      }
    });
    
    if (correlationCount < 3) return 'insufficient_data';
    
    const correlation = correlationSum / correlationCount;
    if (correlation > 0.7) return 'positive';
    else if (correlation < 0.3) return 'negative';
    else return 'neutral';
  }

  private assessHeartRatePattern(sleepData: any[], heartData: any[]): string {
    if (sleepData.length < 3 || heartData.length < 3) return 'insufficient_data';
    
    const avgRestingHR = heartData.reduce((sum, hr) => sum + (hr.resting_heart_rate || 0), 0) / heartData.length;
    
    if (avgRestingHR < 60) return 'excellent';
    else if (avgRestingHR < 70) return 'good';
    else if (avgRestingHR < 80) return 'average';
    else return 'elevated';
  }

  private detectAnomalies(sleepData: any[]) {
    const anomalies = [];
    
    sleepData.forEach(day => {
      if (day.sleep_efficiency && day.sleep_efficiency < 0.6) {
        anomalies.push({ 
          date: day.sleep_date, 
          type: 'very_low_efficiency', 
          value: Math.round(day.sleep_efficiency * 100),
          severity: 'high'
        });
      } else if (day.sleep_efficiency && day.sleep_efficiency < 0.7) {
        anomalies.push({ 
          date: day.sleep_date, 
          type: 'low_efficiency', 
          value: Math.round(day.sleep_efficiency * 100),
          severity: 'medium'
        });
      }
      
      if (day.total_sleep_time && day.total_sleep_time < 240) { // Less than 4 hours
        anomalies.push({ 
          date: day.sleep_date, 
          type: 'severe_sleep_deprivation', 
          value: Math.round(day.total_sleep_time / 60 * 10) / 10,
          severity: 'critical'
        });
      } else if (day.total_sleep_time && day.total_sleep_time < 300) { // Less than 5 hours
        anomalies.push({ 
          date: day.sleep_date, 
          type: 'insufficient_sleep', 
          value: Math.round(day.total_sleep_time / 60 * 10) / 10,
          severity: 'high'
        });
      }
      
      if (day.total_sleep_time && day.total_sleep_time > 720) { // More than 12 hours
        anomalies.push({ 
          date: day.sleep_date, 
          type: 'excessive_sleep', 
          value: Math.round(day.total_sleep_time / 60 * 10) / 10,
          severity: 'medium'
        });
      }
    });
    
    return anomalies;
  }

  private determineChronotype(sleepData: any[]): string {
    const bedtimes = sleepData.map(day => {
      if (!day.bedtime) return null;
      const time = new Date(day.bedtime);
      return time.getHours() + time.getMinutes() / 60;
    }).filter(time => time !== null);
    
    if (bedtimes.length < 5) return 'unknown';
    
    const avgBedtime = bedtimes.reduce((sum, time) => sum + time, 0) / bedtimes.length;
    
    if (avgBedtime < 22) return 'early_bird';
    else if (avgBedtime < 23.5) return 'moderate_early';
    else if (avgBedtime < 1) return 'moderate_late';
    else return 'night_owl';
  }

  private calculateOptimalBedtime(analysis: any): string {
    const { sleepMetrics, chronotype } = analysis;
    
    // Base optimal bedtime on chronotype and current patterns
    let optimalHour = 22.5; // Default 10:30 PM
    
    if (chronotype === 'early_bird') optimalHour = 21.5;
    else if (chronotype === 'moderate_early') optimalHour = 22;
    else if (chronotype === 'moderate_late') optimalHour = 23;
    else if (chronotype === 'night_owl') optimalHour = 23.5;
    
    const hours = Math.floor(optimalHour);
    const minutes = Math.round((optimalHour - hours) * 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  private calculateOptimalWakeTime(analysis: any): string {
    const bedtime = this.calculateOptimalBedtime(analysis);
    const [bedHours, bedMinutes] = bedtime.split(':').map(Number);
    
    // Add 8 hours for optimal sleep
    let wakeHours = bedHours + 8;
    let wakeMinutes = bedMinutes;
    
    if (wakeHours >= 24) wakeHours -= 24;
    
    return `${wakeHours.toString().padStart(2, '0')}:${wakeMinutes.toString().padStart(2, '0')}`;
  }

  private identifyKeyFactors(analysis: any) {
    const factors = [];
    const { sleepMetrics, trends, anomalies, correlations } = analysis;
    
    if (sleepMetrics.avgSleepEfficiency < 80) {
      factors.push({
        factor: 'Sleep Efficiency',
        impact: 'negative',
        value: `${sleepMetrics.avgSleepEfficiency}%`,
        description: 'Below optimal range'
      });
    }
    
    if (sleepMetrics.sleepDebt > 3) {
      factors.push({
        factor: 'Sleep Debt',
        impact: 'negative',
        value: `${sleepMetrics.sleepDebt} hours`,
        description: 'Accumulated sleep deficit'
      });
    }
    
    if (sleepMetrics.consistency < 70) {
      factors.push({
        factor: 'Sleep Consistency',
        impact: 'negative',
        value: `${sleepMetrics.consistency}%`,
        description: 'Irregular sleep schedule'
      });
    }
    
    if (trends.overall === 'improving') {
      factors.push({
        factor: 'Sleep Trend',
        impact: 'positive',
        value: 'Improving',
        description: 'Sleep quality trending upward'
      });
    } else if (trends.overall === 'declining') {
      factors.push({
        factor: 'Sleep Trend',
        impact: 'negative',
        value: 'Declining',
        description: 'Sleep quality trending downward'
      });
    }
    
    if (anomalies.length > 0) {
      factors.push({
        factor: 'Sleep Anomalies',
        impact: 'negative',
        value: `${anomalies.length} detected`,
        description: 'Irregular sleep patterns identified'
      });
    }
    
    return factors;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🌟 Sleep Analysis Agent - Request received:', req.method, req.url);
    
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Initialize the agent
    const agent = new SleepAnalysisAgent();

    // Handle POST requests for analysis (both root and specific endpoint)
    if ((pathname === '/' || pathname === '' || pathname === '/sleep-analysis-agent' || pathname === '/sleep-analysis-agent/analyze') && req.method === 'POST') {
      console.log('📝 Processing analysis request...');
      
      const requestBody = await req.json();
      console.log('📥 Request body:', requestBody);
      
      const { patient_id, analysis_period = 'daily', force_refresh = false }: SleepAnalysisRequest = requestBody;
      
      if (!patient_id) {
        console.error('❌ Missing patient_id in request');
        return new Response(JSON.stringify({ 
          error: 'patient_id is required',
          received: requestBody
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log(`🎯 Starting analysis for patient: ${patient_id}, period: ${analysis_period}`);
      
      const result = await agent.executeSleepAnalysis(patient_id, analysis_period);
      
      console.log('✅ Analysis completed successfully:', result);
      
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
        name: "Enhanced Sleep Analysis Agent API",
        version: "2.0.0",
        description: "Comprehensive AI-powered sleep analysis with robust error handling and detailed insights",
        endpoints: {
          "POST /": {
            description: "Execute comprehensive sleep analysis for a patient",
            parameters: {
              patient_id: { type: "string", required: true },
              analysis_period: { type: "string", default: "daily" },
              force_refresh: { type: "boolean", default: false }
            }
          },
          "GET /insights": {
            description: "Retrieve stored sleep insights",
            parameters: {
              patient_id: { type: "string", required: true },
              limit: { type: "number", default: 10 }
            }
          }
        }
      };

      return new Response(JSON.stringify(docs, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 404 for unknown endpoints
    console.log('❌ Unknown endpoint:', pathname);
    return new Response(JSON.stringify({ 
      error: 'Endpoint not found',
      pathname,
      method: req.method,
      available_endpoints: ['POST /', 'GET /insights', 'GET /docs']
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Sleep Analysis Agent Error:', error);
    console.error('Stack trace:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      message: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});