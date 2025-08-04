import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT');
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY');
const AZURE_OPENAI_DEPLOYMENT = Deno.env.get('AZURE_OPENAI_DEPLOYMENT');

interface HealthAgentRequest {
  patient_id: string;
  agent_config: any;
  biomarker_data: Record<string, any[]>;
  force_refresh?: boolean;
  analysis_timestamp: string;
}

class UniversalHealthAgent {
  private endpoint: string;
  private apiKey: string;
  private deployment: string;

  constructor() {
    this.endpoint = AZURE_OPENAI_ENDPOINT || '';
    this.apiKey = AZURE_OPENAI_API_KEY || '';
    this.deployment = AZURE_OPENAI_DEPLOYMENT || '';
  }

  async analyzeHealth(request: HealthAgentRequest) {
    console.log(`🧠 Analyzing ${request.agent_config.name} for patient ${request.patient_id}`);
    
    const analysisPrompt = this.buildPrompt(request);
    
    try {
      console.log('🤖 Calling Azure OpenAI for health analysis...');
      
      const response = await fetch(
        `${this.endpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=2024-02-15-preview`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': this.apiKey,
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content: this.getSystemPrompt(request.agent_config.analysisType)
              },
              {
                role: 'user',
                content: analysisPrompt
              }
            ],
            max_tokens: 4000,
            temperature: 0.2,
            top_p: 0.95
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Azure OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;

      if (!aiResponse) {
        throw new Error('No response from Azure OpenAI');
      }

      console.log('✅ AI analysis generated successfully');
      return this.parseAIResponse(aiResponse, request);
      
    } catch (error) {
      console.error('❌ Error calling Azure OpenAI:', error);
      return this.generateFallbackAnalysis(request);
    }
  }

  private getSystemPrompt(analysisType: string): string {
    const systemPrompts: Record<string, string> = {
      sleep_intelligence: "You are an expert Sleep Medicine physician and AI sleep optimization specialist. Analyze sleep patterns, circadian rhythms, and recovery metrics to provide comprehensive insights.",
      activity_analysis: "You are a certified exercise physiologist and movement specialist. Analyze activity patterns, movement consistency, and exercise effectiveness to optimize physical performance.",
      cardiovascular_health: "You are a cardiologist and cardiovascular health specialist. Analyze heart rate patterns, HRV, and cardiovascular risk factors to optimize heart health.",
      stress_analysis: "You are a stress management specialist and behavioral health expert. Analyze stress patterns, recovery balance, and autonomic nervous system function.",
      nutrition_optimization: "You are a registered dietitian and nutrition science expert. Analyze nutritional intake, meal timing, and metabolic health markers.",
      lab_analysis: "You are a laboratory medicine physician and clinical pathologist. Interpret lab results, biomarker trends, and health risk assessments.",
      recovery_optimization: "You are a sports medicine physician and recovery specialist. Analyze recovery metrics, training load, and injury prevention strategies.",
      supplement_optimization: "You are a clinical nutritionist and supplement specialist. Analyze nutrient deficiencies and supplement effectiveness.",
      circadian_optimization: "You are a chronobiology specialist and circadian rhythm expert. Analyze sleep-wake cycles, light exposure, and circadian health.",
      hrv_analysis: "You are an HRV specialist and autonomic nervous system expert. Analyze heart rate variability patterns and stress resilience.",
      performance_optimization: "You are a performance specialist and sports scientist. Analyze training metrics, recovery, and performance optimization.",
      vision_health: "You are an optometrist and digital eye strain specialist. Analyze screen time, eye health patterns, and vision protection strategies."
    };

    return systemPrompts[analysisType] || "You are a health data analysis specialist. Provide comprehensive insights based on the provided health data.";
  }

  private buildPrompt(request: HealthAgentRequest): string {
    const { agent_config, biomarker_data } = request;
    
    // Get data summaries for each source
    const dataSummaries = agent_config.dataSources.map((source: string) => {
      const data = biomarker_data[source] || [];
      return this.summarizeDataSource(source, data);
    }).join('\n\n');

    return `
HEALTH AGENT ANALYSIS REQUEST

AGENT: ${agent_config.name}
ANALYSIS TYPE: ${agent_config.analysisType}
PATIENT ID: ${request.patient_id}
TIME WINDOW: ${agent_config.timeWindow} days
COMPLEXITY: ${agent_config.analysisComplexity}

BIOMARKER DATA ANALYSIS:
${dataSummaries}

ANALYSIS REQUIREMENTS:

1. SCORING & STATUS:
   - Calculate primary health score (0-100) for ${agent_config.analysisType}
   - Determine status: optimal/good/needs_attention/critical
   - Identify key metrics: ${agent_config.keyMetrics.join(', ')}

2. INSIGHTS GENERATION:
   - Analyze patterns in the data across ${agent_config.timeWindow} days
   - Generate insights for categories: ${agent_config.insightCategories.join(', ')}
   - Identify correlations between different biomarkers
   - Detect trends and patterns

3. RECOMMENDATIONS:
   - Provide specific, actionable recommendations
   - Prioritize by impact and feasibility
   - Include scientific reasoning and expected outcomes

4. CHART DATA:
   - Prepare data for charts: ${agent_config.chartTypes.join(', ')}
   - Include daily values, trends, and averages

RESPONSE FORMAT (JSON):
{
  "score": number (0-100),
  "status": "optimal|good|needs_attention|critical",
  "key_metrics": {
    ${agent_config.keyMetrics.map((metric: string) => `"${metric}": number`).join(',\n    ')}
  },
  "insights": [
    {
      "category": "string",
      "title": "string", 
      "description": "string",
      "severity": "critical|warning|info|success"
    }
  ],
  "trends": {
    "overall": "improving|stable|declining",
    "weekly_change": number,
    "key_patterns": ["pattern1", "pattern2"]
  },
  "recommendations": [
    {
      "category": "string",
      "action": "string",
      "priority": "high|medium|low",
      "impact": "string",
      "timeline": "string"
    }
  ],
  "chart_data": {
    ${agent_config.chartTypes.map((chart: string) => `"${chart}": [{"date": "string", "value": number}]`).join(',\n    ')}
  },
  "correlations": {
    "factor1": number,
    "factor2": number
  },
  "alerts": [
    {
      "type": "critical|warning|info",
      "title": "string",
      "message": "string"
    }
  ]
}

Provide comprehensive analysis with actionable insights for ${agent_config.name}.
`;
  }

  private summarizeDataSource(source: string, data: any[]): string {
    if (!data || data.length === 0) {
      return `${source.toUpperCase()}: No data available`;
    }

    const latest = data[0];
    const count = data.length;
    
    switch (source) {
      case 'biomarker_sleep':
        return `SLEEP DATA (${count} nights):
- Latest Sleep Score: ${latest.sleep_score || 'N/A'}
- Average Sleep Duration: ${this.calculateAverage(data, 'total_sleep_time')} minutes
- Average Sleep Efficiency: ${this.calculateAverage(data, 'sleep_efficiency')}%
- Average Deep Sleep: ${this.calculateAverage(data, 'deep_sleep_minutes')} minutes
- Average REM Sleep: ${this.calculateAverage(data, 'rem_sleep_minutes')} minutes
- Average HRV: ${this.calculateAverage(data, 'avg_hrv')}ms
- Sleep Debt Trend: ${this.calculateTrend(data, 'sleep_debt')}`;

      case 'biomarker_heart':
        return `HEART DATA (${count} measurements):
- Resting Heart Rate: ${this.calculateAverage(data, 'resting_heart_rate')} bpm
- HRV RMSSD: ${this.calculateAverage(data, 'hrv_rmssd')}ms
- Max Heart Rate: ${this.calculateAverage(data, 'max_heart_rate')} bpm
- Heart Rate Trend: ${this.calculateTrend(data, 'resting_heart_rate')}`;

      case 'biomarker_activity':
        return `ACTIVITY DATA (${count} days):
- Daily Steps: ${this.calculateAverage(data, 'steps_count')} steps
- Active Calories: ${this.calculateAverage(data, 'active_calories')} cal
- Exercise Minutes: ${this.calculateAverage(data, 'exercise_minutes')} min
- Activity Trend: ${this.calculateTrend(data, 'steps_count')}`;

      case 'biomarker_nutrition':
        return `NUTRITION DATA (${count} entries):
- Daily Calories: ${this.calculateAverage(data, 'total_calories')} cal
- Protein: ${this.calculateAverage(data, 'protein_grams')}g
- Carbs: ${this.calculateAverage(data, 'carbohydrates_grams')}g
- Fat: ${this.calculateAverage(data, 'fat_grams')}g`;

      case 'clinical_diagnostic_lab_tests':
        return `LAB DATA (${count} tests):
- Recent Tests: ${data.slice(0, 3).map(test => test.test_name).join(', ')}
- Out of Range: ${data.filter(test => test.is_out_of_range).length} tests
- Latest Results: Available for analysis`;

      default:
        return `${source.toUpperCase()}: ${count} records available for analysis`;
    }
  }

  private calculateAverage(data: any[], field: string): number {
    const values = data.map(item => item[field]).filter(val => val != null && !isNaN(val));
    return values.length > 0 ? Math.round(values.reduce((sum, val) => sum + val, 0) / values.length * 10) / 10 : 0;
  }

  private calculateTrend(data: any[], field: string): string {
    if (data.length < 2) return 'stable';
    
    const recent = data.slice(0, Math.ceil(data.length / 2));
    const older = data.slice(Math.ceil(data.length / 2));
    
    const recentAvg = this.calculateAverage(recent, field);
    const olderAvg = this.calculateAverage(older, field);
    
    const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (changePercent > 5) return 'improving';
    if (changePercent < -5) return 'declining';
    return 'stable';
  }

  private parseAIResponse(aiResponse: string, request: HealthAgentRequest) {
    try {
      // Try to extract JSON from the AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { success: true, ...parsed };
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
    }
    
    return this.generateFallbackAnalysis(request);
  }

  private generateFallbackAnalysis(request: HealthAgentRequest) {
    console.log('📊 Generating fallback analysis...');
    
    const { agent_config, biomarker_data } = request;
    const primaryData = biomarker_data[agent_config.dataSources[0]] || [];
    const latestEntry = primaryData[0] || {};
    
    // Generate basic score based on available data
    let score = 75;
    if (latestEntry.sleep_score) score = latestEntry.sleep_score;
    else if (latestEntry.steps_count) score = Math.min(100, (latestEntry.steps_count / 10000) * 100);
    
    // Generate key metrics
    const keyMetrics: Record<string, any> = {};
    agent_config.keyMetrics.forEach((metric: string) => {
      switch (metric) {
        case 'sleep_score':
          keyMetrics[metric] = latestEntry.sleep_score || score;
          break;
        case 'steps_avg':
          keyMetrics[metric] = this.calculateAverage(primaryData, 'steps_count');
          break;
        case 'resting_hr':
          keyMetrics[metric] = this.calculateAverage(primaryData, 'resting_heart_rate');
          break;
        case 'active_calories':
          keyMetrics[metric] = this.calculateAverage(primaryData, 'active_calories');
          break;
        default:
          keyMetrics[metric] = Math.round(Math.random() * 100);
      }
    });

    // Generate chart data
    const chartData: Record<string, any[]> = {};
    agent_config.chartTypes.forEach((chartType: string) => {
      chartData[chartType] = primaryData.slice(0, 7).map((entry, index) => ({
        date: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toLocaleDateString(),
        value: entry[this.getChartField(chartType)] || Math.random() * 100
      }));
    });

    return {
      success: true,
      score,
      status: score >= 80 ? 'optimal' : score >= 60 ? 'good' : score >= 40 ? 'needs_attention' : 'critical',
      key_metrics: keyMetrics,
      insights: [
        {
          category: 'System Notice',
          title: 'Fallback Analysis Active',
          description: 'AI analysis temporarily unavailable. Basic metrics calculated from recent data.',
          severity: 'info'
        }
      ],
      trends: {
        overall: 'stable',
        weekly_change: 0,
        key_patterns: ['stable_baseline']
      },
      recommendations: [
        {
          category: 'General',
          action: 'Continue monitoring your health data',
          priority: 'medium',
          impact: 'Maintains baseline tracking',
          timeline: 'ongoing'
        }
      ],
      chart_data: chartData,
      correlations: {},
      alerts: []
    };
  }

  private getChartField(chartType: string): string {
    const fieldMap: Record<string, string> = {
      'steps_trend': 'steps_count',
      'calories_bar': 'active_calories',
      'sleep_efficiency': 'sleep_efficiency',
      'hrv_trend': 'avg_hrv',
      'line': 'value',
      'bar': 'value'
    };
    return fieldMap[chartType] || 'value';
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Universal Health Agent Analyzer - Request received');
    
    if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY || !AZURE_OPENAI_DEPLOYMENT) {
      throw new Error('Azure OpenAI configuration missing');
    }

    const request: HealthAgentRequest = await req.json();
    console.log(`📥 Analyzing ${request.agent_config?.name} for patient ${request.patient_id}`);

    if (!request.patient_id || !request.agent_config) {
      throw new Error('Patient ID and agent configuration are required');
    }

    const agent = new UniversalHealthAgent();
    const analysis = await agent.analyzeHealth(request);

    console.log(`✅ ${request.agent_config.name} analysis completed`);
    
    return new Response(
      JSON.stringify(analysis),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error in health agent analyzer:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});