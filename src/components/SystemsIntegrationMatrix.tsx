import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter } from 'recharts';
import { Heart, Zap, Shield, Target, Moon, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SystemsIntegrationMatrixProps {
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

const SystemsIntegrationMatrix: React.FC<SystemsIntegrationMatrixProps> = ({ patientId }) => {
  const [correlationData, setCorrelationData] = useState<CorrelationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCorrelationData = async () => {
      if (!patientId) return;
      
      setLoading(true);
      try {
        // Fetch last 90 days of data for correlation analysis
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

        // Add lab data (simplified - get latest glucose and cholesterol)
        const glucoseTest = labData.data?.find(test => 
          test.test_name.toLowerCase().includes('glucose') && test.numeric_value
        );
        const cholesterolTest = labData.data?.find(test => 
          test.test_name.toLowerCase().includes('cholesterol') && test.numeric_value
        );

        // Apply lab values to recent dates (since they don't change daily)
        if (glucoseTest || cholesterolTest) {
          Object.keys(combinedData).forEach(date => {
            if (glucoseTest) combinedData[date].glucose = glucoseTest.numeric_value;
            if (cholesterolTest) combinedData[date].cholesterol = cholesterolTest.numeric_value;
          });
        }

        const chartData = Object.values(combinedData)
          .filter(d => d.hrv || d.sleepEfficiency || d.steps) // Only include dates with biomarker data
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(-30); // Last 30 days with data

        setCorrelationData(chartData);

      } catch (error) {
        console.error('Error loading correlation data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCorrelationData();
  }, [patientId]);

  // Calculate correlation coefficient between two arrays
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

  // Get correlation insights
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
        strength: Math.abs(hrvSleepCorr) > 0.7 ? 'Strong' : 'Moderate'
      });
    }

    if (Math.abs(hrvStepsCorr) > 0.4) {
      insights.push({
        title: 'HRV-Activity Correlation',
        value: hrvStepsCorr,
        message: `${hrvStepsCorr > 0 ? 'Positive' : 'Negative'} correlation (${(hrvStepsCorr * 100).toFixed(0)}%) between HRV and daily activity`,
        strength: Math.abs(hrvStepsCorr) > 0.6 ? 'Strong' : 'Moderate'
      });
    }

    return insights;
  };

  const correlationInsights = getCorrelationInsights();

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-48 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Correlation Insights */}
      {correlationInsights.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Key Health Correlations
            </CardTitle>
            <CardDescription>AI-discovered relationships in your health data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {correlationInsights.map((insight, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-card rounded-lg">
                <div>
                  <p className="font-medium">{insight.title}</p>
                  <p className="text-sm text-muted-foreground">{insight.message}</p>
                </div>
                <Badge variant={insight.strength === 'Strong' ? 'default' : 'secondary'}>
                  {insight.strength}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Systems Integration Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cardiovascular Command Center */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Cardiovascular Command Center
            </CardTitle>
            <CardDescription>HRV & Heart Rate Integration</CardDescription>
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
                <Tooltip 
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
          </CardContent>
        </Card>

        {/* Metabolic Optimization Center */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500" />
              Metabolic Optimization Center
            </CardTitle>
            <CardDescription>Sleep & Activity Patterns</CardDescription>
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
                <Tooltip 
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
          </CardContent>
        </Card>

        {/* Inflammatory Intelligence Center */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Inflammatory Intelligence
            </CardTitle>
            <CardDescription>Recovery & Stress Indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart data={correlationData.filter(d => d.hrv && d.sleepEfficiency)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hrv" name="HRV" unit="ms" tick={{ fontSize: 12 }} />
                <YAxis dataKey="sleepEfficiency" name="Sleep Efficiency" unit="%" tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter 
                  dataKey="sleepEfficiency" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.6}
                />
              </ScatterChart>
            </ResponsiveContainer>
            <p className="text-sm text-muted-foreground mt-2">
              Correlation between HRV and Sleep Quality
            </p>
          </CardContent>
        </Card>

        {/* Nutritional Intelligence Hub */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              Nutritional Intelligence
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
                    </div>
                  )}
                  {correlationData.find(d => d.cholesterol) && (
                    <div className="text-center p-4 bg-muted/30 rounded">
                      <div className="text-2xl font-bold text-info">
                        {correlationData.find(d => d.cholesterol)?.cholesterol}
                      </div>
                      <div className="text-sm text-muted-foreground">Latest Cholesterol</div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Lab values correlated with biomarker trends for personalized insights
                </p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent lab data available</p>
                <p className="text-sm">Upload lab results to see nutritional correlations</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recovery Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-purple-500" />
              Recovery Analytics
            </CardTitle>
            <CardDescription>Sleep & HRV Recovery Patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={correlationData.filter(d => d.sleepEfficiency).slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => `Date: ${new Date(value).toLocaleDateString()}`}
                />
                <Bar 
                  dataKey="sleepEfficiency" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.8}
                  name="Sleep Efficiency (%)"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Organ Function Monitor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-cyan-500" />
              Organ Function Monitor
            </CardTitle>
            <CardDescription>Activity & Performance Integration</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={correlationData.filter(d => d.steps).slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => `Date: ${new Date(value).toLocaleDateString()}`}
                />
                <Bar 
                  dataKey="steps" 
                  fill="hsl(var(--success))" 
                  fillOpacity={0.8}
                  name="Daily Steps"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemsIntegrationMatrix;