import React, { useState, useEffect } from 'react';
import { ArrowLeft, Info, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Line, LineChart, ReferenceLine } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { usePrimaryPatient } from '@/hooks/usePrimaryPatient';

interface ActivityData {
  date: string;
  steps: number;
  calories: number;
  distance: number;
}

interface ActivityInsight {
  category: string;
  title: string;
  description: string;
  recommendation: string;
  severity: 'low' | 'medium' | 'high';
}

const ActivityAnalysis = () => {
  const navigate = useNavigate();
  const { primaryPatient } = usePrimaryPatient();
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [insights, setInsights] = useState<ActivityInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);

  // Calculate key metrics
  const averageSteps = activityData.length > 0 
    ? Math.round(activityData.reduce((sum, day) => sum + day.steps, 0) / activityData.length)
    : 0;
  
  const previousWeekSteps = activityData.slice(0, 3).reduce((sum, day) => sum + day.steps, 0) / 3;
  const currentWeekSteps = activityData.slice(-3).reduce((sum, day) => sum + day.steps, 0) / 3;
  const stepsTrend = currentWeekSteps > previousWeekSteps ? 'up' : 'down';
  const stepsChange = previousWeekSteps > 0 
    ? Math.abs(((currentWeekSteps - previousWeekSteps) / previousWeekSteps) * 100)
    : 0;

  const averageCalories = activityData.length > 0
    ? Math.round(activityData.reduce((sum, day) => sum + day.calories, 0) / activityData.length)
    : 0;

  const averageDistance = activityData.length > 0
    ? (activityData.reduce((sum, day) => sum + day.distance, 0) / activityData.length / 1000).toFixed(1)
    : '0.0';

  useEffect(() => {
    if (primaryPatient?.id) {
      fetchActivityData();
    }
  }, [primaryPatient]);

  const fetchActivityData = async () => {
    if (!primaryPatient?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch last 7 days of activity data
      const { data, error: fetchError } = await supabase
        .from('biomarker_activity')
        .select('*')
        .eq('patient_id', primaryPatient.id)
        .order('measurement_date', { ascending: false })
        .limit(30);

      if (fetchError) throw fetchError;

      // Process data for charts
      const processedData = data?.map(item => ({
        date: new Date(item.measurement_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        steps: item.steps_count || 0,
        calories: item.active_calories || item.total_calories || 0,
        distance: item.distance_walked_meters || 0
      })).reverse().slice(-7) || [];

      setActivityData(processedData);

      // Call AI analysis
      await analyzeActivity(data);

    } catch (err: any) {
      console.error('Error fetching activity data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeActivity = async (rawData: any[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('activity-analysis-agent', {
        body: { 
          patient_id: primaryPatient?.id,
          activity_data: rawData 
        }
      });

      if (error) throw error;

      setInsights(data.insights || []);
      setDebugData({
        prompt: data.debug?.prompt,
        response: data.debug?.response,
        metrics: data.metrics
      });

    } catch (err: any) {
      console.error('Error analyzing activity:', err);
      setInsights([{
        category: 'General',
        title: 'Analysis Pending',
        description: 'Activity analysis is currently being processed.',
        recommendation: 'Please check back in a few minutes.',
        severity: 'low'
      }]);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-900/20 text-red-400 border-red-800';
      case 'medium': return 'bg-yellow-900/20 text-yellow-400 border-yellow-800';
      case 'low': return 'bg-green-900/20 text-green-400 border-green-800';
      default: return 'bg-gray-900/20 text-gray-400 border-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Analyzing your activity patterns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Activity Analysis</h1>
            <p className="text-sm text-gray-400">AI-powered movement insights</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowDebug(true)}>
          <Info className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <div className="p-4">
          <Card className="bg-red-900/20 border-red-800">
            <CardContent className="p-4">
              <p className="text-red-400">{error}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="p-4 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-white">{averageSteps.toLocaleString()}</div>
              <div className="text-xs text-gray-400 mb-2">Daily Average Steps</div>
              <div className="flex items-center justify-center gap-1">
                {stepsTrend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-400" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-400" />
                )}
                <span className={`text-xs ${stepsTrend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                  {stepsChange.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-white">{averageCalories}</div>
              <div className="text-xs text-gray-400">Avg Active Calories</div>
            </CardContent>
          </Card>

          <Card className="bg-[#1a1a1a] border-gray-800">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-white">{averageDistance}</div>
              <div className="text-xs text-gray-400">Avg Distance (km)</div>
            </CardContent>
          </Card>
        </div>

        {/* Steps Chart */}
        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Steps Trend</h3>
              <Badge variant="outline" className="bg-blue-900/20 text-blue-400 border-blue-800">
                7 Days
              </Badge>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData}>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <YAxis hide />
                  <ReferenceLine y={averageSteps} stroke="#3B82F6" strokeDasharray="2 2" />
                  <Bar 
                    dataKey="steps" 
                    fill="#3B82F6"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center mt-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="w-3 h-[2px] bg-blue-500"></div>
                <span>Average: {averageSteps.toLocaleString()} steps</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            AI Insights
          </h3>
          {insights.length > 0 ? (
            insights.map((insight, index) => (
              <Card key={index} className="bg-[#1a1a1a] border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-white">{insight.title}</h4>
                    <Badge variant="outline" className={getSeverityColor(insight.severity)}>
                      {insight.severity}
                    </Badge>
                  </div>
                  <p className="text-gray-300 text-sm mb-3">{insight.description}</p>
                  <div className="bg-[#0f0f0f] border border-gray-700 rounded-lg p-3">
                    <p className="text-blue-400 text-xs font-medium mb-1">💡 Recommendation</p>
                    <p className="text-gray-300 text-sm">{insight.recommendation}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-[#1a1a1a] border-gray-800">
              <CardContent className="p-6 text-center">
                <Zap className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No activity insights available yet.</p>
                <p className="text-gray-500 text-sm">Upload more activity data for personalized recommendations.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Debug Modal */}
      <Dialog open={showDebug} onOpenChange={setShowDebug}>
        <DialogContent className="bg-[#1a1a1a] border-gray-800 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Activity Analysis Debug</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {debugData?.prompt && (
              <div>
                <h4 className="font-semibold text-blue-400 mb-2">LLM Prompt</h4>
                <pre className="bg-[#0f0f0f] border border-gray-700 rounded p-3 text-xs text-gray-300 overflow-x-auto">
                  {debugData.prompt}
                </pre>
              </div>
            )}
            {debugData?.response && (
              <div>
                <h4 className="font-semibold text-green-400 mb-2">LLM Response</h4>
                <pre className="bg-[#0f0f0f] border border-gray-700 rounded p-3 text-xs text-gray-300 overflow-x-auto">
                  {JSON.stringify(debugData.response, null, 2)}
                </pre>
              </div>
            )}
            {debugData?.metrics && (
              <div>
                <h4 className="font-semibold text-yellow-400 mb-2">Processing Metrics</h4>
                <pre className="bg-[#0f0f0f] border border-gray-700 rounded p-3 text-xs text-gray-300 overflow-x-auto">
                  {JSON.stringify(debugData.metrics, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActivityAnalysis;