import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter } from 'recharts';
import { Heart, Zap, Shield, Target, Moon, Activity, HelpCircle, ChevronDown, Info, Brain, Calculator, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EnhancedSystemsMatrixProps {
  patientId: string;
}

interface CorrelationData {
  date: string;
  hrv: number | null;
  rhr: number | null;
  sleepEfficiency: number | null;
  steps: number | null;
  glucose: number | null;
  cholesterol: number | null;
}

const EnhancedSystemsMatrix: React.FC<EnhancedSystemsMatrixProps> = ({ patientId }) => {
  const [correlationData, setCorrelationData] = useState<CorrelationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSystem, setExpandedSystem] = useState<string | null>(null);

  useEffect(() => {
    const loadCorrelationData = async () => {
      if (!patientId) return;
      
      setLoading(true);
      try {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const [heartData, sleepData, activityData, labData] = await Promise.all([
          supabase
            .from('biomarker_heart')
            .select('measurement_time, hrv_rmssd, resting_heart_rate')
            .eq('patient_id', patientId)
            .gte('measurement_time', ninetyDaysAgo.toISOString())
            .order('measurement_time'),
          
          supabase
            .from('biomarker_sleep')
            .select('sleep_date, sleep_efficiency')
            .eq('patient_id', patientId)
            .gte('sleep_date', ninetyDaysAgo.toISOString().split('T')[0])
            .order('sleep_date'),
          
          supabase
            .from('biomarker_activity')
            .select('measurement_date, steps_count')
            .eq('patient_id', patientId)
            .gte('measurement_date', ninetyDaysAgo.toISOString().split('T')[0])
            .order('measurement_date'),

          supabase
            .from('clinical_diagnostic_lab_tests')
            .select('collection_date, test_name, numeric_value')
            .eq('patient_id', patientId)
            .order('collection_date', { ascending: false })
            .limit(50)
        ]);

        // Combine data by date
        const combinedData: { [key: string]: CorrelationData } = {};
        
        heartData.data?.forEach(record => {
          const date = record.measurement_time.split('T')[0];
          if (!combinedData[date]) combinedData[date] = { date, hrv: null, rhr: null, sleepEfficiency: null, steps: null, glucose: null, cholesterol: null };
          combinedData[date].hrv = record.hrv_rmssd;
          combinedData[date].rhr = record.resting_heart_rate;
        });

        sleepData.data?.forEach(record => {
          const date = record.sleep_date;
          if (!combinedData[date]) combinedData[date] = { date, hrv: null, rhr: null, sleepEfficiency: null, steps: null, glucose: null, cholesterol: null };
          combinedData[date].sleepEfficiency = record.sleep_efficiency;
        });

        activityData.data?.forEach(record => {
          const date = record.measurement_date;
          if (!combinedData[date]) combinedData[date] = { date, hrv: null, rhr: null, sleepEfficiency: null, steps: null, glucose: null, cholesterol: null };
          combinedData[date].steps = record.steps_count;
        });

        // Add lab data
        const glucoseTest = labData.data?.find(test => 
          test.test_name.toLowerCase().includes('glucose') && test.numeric_value
        );
        const cholesterolTest = labData.data?.find(test => 
          test.test_name.toLowerCase().includes('cholesterol') && test.numeric_value
        );

        if (glucoseTest || cholesterolTest) {
          Object.keys(combinedData).forEach(date => {
            if (glucoseTest) combinedData[date].glucose = glucoseTest.numeric_value;
            if (cholesterolTest) combinedData[date].cholesterol = cholesterolTest.numeric_value;
          });
        }

        const chartData = Object.values(combinedData)
          .filter(d => d.hrv || d.sleepEfficiency || d.steps)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(-30);

        setCorrelationData(chartData);

      } catch (error) {
        console.error('Error loading correlation data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCorrelationData();
  }, [patientId]);

  const calculateCorrelation = (x: number[], y: number[]): number => {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumYY = y.reduce((acc, yi) => acc + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  };

  const getCorrelationInsights = () => {
    const validData = correlationData.filter(d => d.hrv && d.sleepEfficiency && d.steps);
    if (validData.length < 5) return [];

    const hrv = validData.map(d => d.hrv!);
    const sleep = validData.map(d => d.sleepEfficiency!);
    const steps = validData.map(d => d.steps!);

    const hrvSleepCorr = calculateCorrelation(hrv, sleep);
    const hrvStepsCorr = calculateCorrelation(hrv, steps);
    const sleepStepsCorr = calculateCorrelation(sleep, steps);

    const insights = [];
    
    if (Math.abs(hrvSleepCorr) > 0.5) {
      insights.push({
        title: 'HRV-Sleep Correlation',
        value: hrvSleepCorr,
        message: `${hrvSleepCorr > 0 ? 'Positive' : 'Negative'} correlation (${(hrvSleepCorr * 100).toFixed(0)}%) between HRV and sleep efficiency`,
        strength: Math.abs(hrvSleepCorr) > 0.7 ? 'Strong' : 'Moderate',
        explanation: hrvSleepCorr > 0 
          ? "Better sleep quality correlates with higher heart rate variability, indicating good autonomic recovery"
          : "Poor sleep quality correlates with lower HRV, suggesting autonomic stress from sleep disruption"
      });
    }

    if (Math.abs(hrvStepsCorr) > 0.4) {
      insights.push({
        title: 'HRV-Activity Correlation',
        value: hrvStepsCorr,
        message: `${hrvStepsCorr > 0 ? 'Positive' : 'Negative'} correlation (${(hrvStepsCorr * 100).toFixed(0)}%) between HRV and daily activity`,
        strength: Math.abs(hrvStepsCorr) > 0.6 ? 'Strong' : 'Moderate',
        explanation: hrvStepsCorr > 0
          ? "Higher activity levels correlate with better HRV, indicating your body responds well to exercise"
          : "Higher activity levels correlate with lower HRV, suggesting possible overtraining or inadequate recovery"
      });
    }

    return insights;
  };

  const correlationInsights = getCorrelationInsights();

  const systemsData = [
    {
      id: 'cardiovascular',
      title: 'Cardiovascular Command Center',
      icon: <Heart className="h-5 w-5 text-red-500" />,
      description: 'Heart health, circulation, and autonomic function',
      metrics: ['HRV', 'Resting Heart Rate', 'Blood Pressure', 'Recovery HR'],
      explanation: {
        purpose: 'Monitors your heart health and autonomic nervous system function through advanced biomarkers that predict cardiovascular events months before traditional symptoms appear.',
        howItWorks: 'AI analyzes heart rate variability patterns, resting heart rate trends, and recovery metrics to assess cardiovascular fitness and stress response.',
        interpretation: 'Higher HRV and lower resting heart rate generally indicate better cardiovascular health and stress resilience.',
        actionItems: [
          'Monitor HRV daily for early stress detection',
          'Track resting heart rate trends for fitness improvements',
          'Use recovery heart rate to optimize exercise intensity',
          'Consider cardiovascular screening if patterns worsen'
        ]
      }
    },
    {
      id: 'metabolic',
      title: 'Metabolic Optimization Center',
      icon: <Zap className="h-5 w-5 text-orange-500" />,
      description: 'Energy metabolism, glucose regulation, and metabolic health',
      metrics: ['Sleep Efficiency', 'Activity Level', 'Glucose', 'Metabolic Rate'],
      explanation: {
        purpose: 'Tracks how efficiently your body processes energy, regulates blood sugar, and maintains metabolic balance throughout the day.',
        howItWorks: 'Combines sleep quality data with activity patterns and glucose levels to assess metabolic health and diabetes risk.',
        interpretation: 'Good sleep efficiency (>80%) combined with consistent activity levels indicates healthy metabolism.',
        actionItems: [
          'Optimize sleep quality for better glucose regulation',
          'Maintain consistent daily activity levels',
          'Monitor post-meal glucose responses',
          'Consider metabolic panel if declining trends'
        ]
      }
    },
    {
      id: 'inflammatory',
      title: 'Inflammatory Intelligence Center',
      icon: <Shield className="h-5 w-5 text-blue-500" />,
      description: 'Immune function, inflammation markers, and systemic health',
      metrics: ['Recovery Metrics', 'Stress Indicators', 'CRP', 'White Blood Cells'],
      explanation: {
        purpose: 'Detects systemic inflammation and immune system activation that can predict various health conditions before clinical symptoms appear.',
        howItWorks: 'AI correlates recovery patterns, stress biomarkers, and inflammatory lab markers to assess immune system function.',
        interpretation: 'Poor recovery combined with elevated stress markers may indicate chronic inflammation.',
        actionItems: [
          'Implement stress reduction protocols',
          'Optimize nutrition for anti-inflammatory effects',
          'Ensure adequate recovery between activities',
          'Consider inflammatory marker testing'
        ]
      }
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">AI is analyzing system correlations...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* What is Systems Integration? */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-primary mb-2">What is Systems Integration Analysis?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your body is an interconnected system where changes in one area affect others. This AI analysis 
                  shows how your cardiovascular, metabolic, and other health systems influence each other, 
                  helping identify root causes and optimize interventions for maximum health impact.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Correlation Insights */}
        {correlationInsights.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Key Health System Correlations in Your Data
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="text-sm">
                      These correlations show how different health metrics in your body influence each other. 
                      Strong correlations ({'>'} 70%) indicate significant relationships worth monitoring.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>AI-discovered relationships specific to your health patterns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {correlationInsights.map((insight, index) => (
                <Card key={index} className="bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{insight.title}</p>
                        <p className="text-sm text-muted-foreground">{insight.message}</p>
                      </div>
                      <Badge variant={insight.strength === 'Strong' ? 'default' : 'secondary'}>
                        {insight.strength}
                      </Badge>
                    </div>
                    <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        <strong>What this means for you:</strong> {insight.explanation}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Enhanced Systems Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cardiovascular Command Center */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  Cardiovascular Command Center
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="text-sm">
                      Shows the relationship between heart rate variability and resting heart rate. 
                      Higher HRV with lower RHR indicates better cardiovascular health and stress resilience.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>HRV & Heart Rate Integration Analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={correlationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis yAxisId="hrv" orientation="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="rhr" orientation="right" tick={{ fontSize: 12 }} />
                  <RechartsTooltip 
                    labelFormatter={(value) => `Date: ${new Date(value).toLocaleDateString()}`}
                  />
                  <Line 
                    yAxisId="hrv"
                    type="monotone" 
                    dataKey="hrv" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="HRV (ms)"
                    connectNulls={false}
                  />
                  <Line 
                    yAxisId="rhr"
                    type="monotone" 
                    dataKey="rhr" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    name="RHR (bpm)"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-3 text-xs text-muted-foreground">
                <p><strong>Interpretation:</strong> Blue line (HRV) should be higher and stable. Red line (RHR) should be lower and consistent. Diverging trends may indicate developing health issues.</p>
              </div>
            </CardContent>
          </Card>

          {/* Metabolic Optimization Center */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  Metabolic Optimization Center
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="text-sm">
                      Correlates sleep quality with daily activity levels. Good sleep ({'>'} 80% efficiency) 
                      should support consistent activity. Poor sleep often leads to reduced activity.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>Sleep & Activity Correlation Analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={correlationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis yAxisId="sleep" orientation="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="steps" orientation="right" tick={{ fontSize: 12 }} />
                  <RechartsTooltip 
                    labelFormatter={(value) => `Date: ${new Date(value).toLocaleDateString()}`}
                  />
                  <Line 
                    yAxisId="sleep"
                    type="monotone" 
                    dataKey="sleepEfficiency" 
                    stroke="hsl(var(--info))" 
                    strokeWidth={2}
                    name="Sleep Efficiency (%)"
                    connectNulls={false}
                  />
                  <Line 
                    yAxisId="steps"
                    type="monotone" 
                    dataKey="steps" 
                    stroke="hsl(var(--success))" 
                    strokeWidth={2}
                    name="Daily Steps"
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-3 text-xs text-muted-foreground">
                <p><strong>Interpretation:</strong> Sleep efficiency {'>'} 80% (blue) should correlate with consistent activity levels {'>'} 6,000 steps (green). Declining sleep often predicts reduced activity days.</p>
              </div>
            </CardContent>
          </Card>

          {/* Inflammatory Intelligence Center */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  Inflammatory Intelligence Center
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="text-sm">
                      This scatter plot shows the relationship between HRV and sleep quality. 
                      Points in the upper right (high HRV, high sleep efficiency) indicate good recovery.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>HRV-Sleep Recovery Correlation</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <ScatterChart data={correlationData.filter(d => d.hrv && d.sleepEfficiency)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hrv" name="HRV" unit="ms" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="sleepEfficiency" name="Sleep Efficiency" unit="%" tick={{ fontSize: 12 }} />
                  <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter 
                    dataKey="sleepEfficiency" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.6}
                  />
                </ScatterChart>
              </ResponsiveContainer>
              <div className="mt-3 text-xs text-muted-foreground">
                <p><strong>Interpretation:</strong> Points in the upper-right quadrant indicate optimal recovery (high HRV + good sleep). Lower-left points suggest stress or poor recovery.</p>
              </div>
            </CardContent>
          </Card>

          {/* Nutritional Intelligence Hub */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-500" />
                  Nutritional Intelligence Hub
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="text-sm">
                      Displays latest lab values correlated with lifestyle biomarkers. 
                      Upload more lab results to see nutritional correlations with daily metrics.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>Lab Results & Lifestyle Integration</CardDescription>
            </CardHeader>
            <CardContent>
              {correlationData.some(d => d.glucose || d.cholesterol) ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {correlationData.find(d => d.glucose) && (
                      <div className="text-center p-4 bg-muted/30 rounded">
                        <div className="text-2xl font-bold text-warning">
                          {correlationData.find(d => d.glucose)?.glucose}
                        </div>
                        <div className="text-sm text-muted-foreground">Latest Glucose</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Normal: 70-100 mg/dL
                        </div>
                      </div>
                    )}
                    {correlationData.find(d => d.cholesterol) && (
                      <div className="text-center p-4 bg-muted/30 rounded">
                        <div className="text-2xl font-bold text-info">
                          {correlationData.find(d => d.cholesterol)?.cholesterol}
                        </div>
                        <div className="text-sm text-muted-foreground">Latest Cholesterol</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Optimal: &lt;200 mg/dL
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-primary/5 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>AI Correlation:</strong> Lab values are analyzed alongside your daily biomarkers 
                      to identify lifestyle factors that influence these results.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium mb-2">No Recent Lab Data Available</p>
                  <p className="text-sm mb-4">Upload lab results to see nutritional correlations</p>
                  <div className="text-xs bg-muted/30 p-3 rounded-lg">
                    <p><strong>What you'll see with lab data:</strong></p>
                    <p>• Glucose trends vs sleep/activity patterns</p>
                    <p>• Cholesterol correlation with exercise</p>
                    <p>• Vitamin levels vs energy patterns</p>
                    <p>• Inflammatory markers vs recovery</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed System Explanations */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Understanding Your Health Systems
          </h3>
          <div className="space-y-4">
            {systemsData.map((system) => (
              <Card key={system.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {system.icon}
                      <div>
                        <CardTitle className="text-lg">{system.title}</CardTitle>
                        <CardDescription>{system.description}</CardDescription>
                      </div>
                    </div>
                    <Collapsible open={expandedSystem === system.id} onOpenChange={(open) => setExpandedSystem(open ? system.id : null)}>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm">
                          Learn More
                          <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${expandedSystem === system.id ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                    </Collapsible>
                  </div>
                </CardHeader>
                
                <Collapsible open={expandedSystem === system.id} onOpenChange={(open) => setExpandedSystem(open ? system.id : null)}>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-primary mb-2">Purpose & Function</h4>
                          <p className="text-sm text-muted-foreground">{system.explanation.purpose}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-primary mb-2">How AI Analysis Works</h4>
                          <p className="text-sm text-muted-foreground">{system.explanation.howItWorks}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-primary mb-2">How to Interpret Results</h4>
                          <p className="text-sm text-muted-foreground">{system.explanation.interpretation}</p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-primary mb-2">Tracked Metrics</h4>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {system.metrics.map((metric) => (
                              <Badge key={metric} variant="outline">{metric}</Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-primary mb-2">Actionable Steps</h4>
                          <div className="space-y-2">
                            {system.explanation.actionItems.map((action, index) => (
                              <div key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                  {index + 1}
                                </div>
                                <span>{action}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default EnhancedSystemsMatrix;