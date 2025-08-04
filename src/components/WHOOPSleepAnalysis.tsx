import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Moon, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Activity, 
  Heart, 
  Clock, 
  Target,
  Lightbulb,
  RefreshCw,
  Brain
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePrimaryPatient } from "@/hooks/usePrimaryPatient";

interface SleepInsight {
  id: string;
  analysis_date: string;
  sleep_quality_score: number;
  sleep_pattern_trend: string;
  recommendations: any;
  key_factors: any;
  confidence_level: number;
  sleep_debt_hours: number | null;
  optimal_bedtime: string | null;
  optimal_wake_time: string | null;
  predicted_sleep_duration: number | null;
}

interface AnalysisResult {
  success: boolean;
  insight_id: string;
  processing_time_ms: number;
  analysis_summary: {
    sleep_quality_score: number;
    pattern_trend: string;
    key_recommendations: any[];
    confidence_level: number;
  };
}

export const WHOOPSleepAnalysis: React.FC = () => {
  const [insights, setInsights] = useState<SleepInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [latestInsight, setLatestInsight] = useState<SleepInsight | null>(null);
  const { toast } = useToast();
  const { primaryPatient } = usePrimaryPatient();
  const primaryPatientId = primaryPatient?.id;

  useEffect(() => {
    if (primaryPatientId) {
      fetchInsights();
    }
  }, [primaryPatientId]);

  const fetchInsights = async () => {
    if (!primaryPatientId) return;

    setLoading(true);
    try {
      const { data: insightsData, error } = await supabase
        .from('ai_sleep_insights')
        .select('*')
        .eq('patient_id', primaryPatientId)
        .order('analysis_date', { ascending: false })
        .limit(5);

      if (error) throw error;

      setInsights((insightsData || []) as SleepInsight[]);
      setLatestInsight((insightsData?.[0] || null) as SleepInsight | null);
    } catch (error) {
      console.error('Error fetching insights:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sleep insights",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async (analysisPeriod: 'daily' | 'weekly' | 'monthly' = 'daily') => {
    if (!primaryPatientId) {
      toast({
        title: "Error",
        description: "No patient selected",
        variant: "destructive"
      });
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sleep-analysis-agent', {
        body: {
          patient_id: primaryPatientId,
          analysis_period: analysisPeriod,
          force_refresh: true
        }
      });

      if (error) throw error;

      await fetchInsights();

      toast({
        title: "Analysis Complete",
        description: `Sleep analysis completed successfully`,
      });
    } catch (error) {
      console.error('Error running analysis:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to run sleep analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 85) return 'from-green-500 to-green-600';
    if (score >= 70) return 'from-yellow-500 to-yellow-600';
    if (score >= 50) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-red-600';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable': return <Minus className="h-4 w-4 text-blue-500" />;
      default: return <Target className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--';
    const time = new Date(`2000-01-01T${timeString}`);
    return time.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '--';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="min-h-screen bg-black text-white px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Moon className="h-6 w-6 text-green-500" />
            Sleep Coach
          </h1>
          <p className="text-gray-400 text-sm">AI-powered sleep optimization</p>
        </div>
        <Button
          onClick={() => runAnalysis('daily')}
          disabled={analyzing || !primaryPatientId}
          variant="outline"
          size="sm"
          className="border-gray-700 text-gray-300 hover:bg-gray-800"
        >
          {analyzing ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Brain className="h-4 w-4" />
          )}
          {analyzing ? 'Analyzing...' : 'Analyze'}
        </Button>
      </div>

      {/* Hero Score Section */}
      {latestInsight ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="relative inline-flex items-center justify-center">
                <div className="w-32 h-32 relative">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-700"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 50}`}
                      strokeDashoffset={`${2 * Math.PI * 50 * (1 - latestInsight.sleep_quality_score / 100)}`}
                      className={`${getScoreColor(latestInsight.sleep_quality_score)} transition-all duration-1000`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className={`text-3xl font-bold ${getScoreColor(latestInsight.sleep_quality_score)}`}>
                        {latestInsight.sleep_quality_score}
                      </div>
                      <div className="text-xs text-gray-400">RECOVERY</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-2">
                {getTrendIcon(latestInsight.sleep_pattern_trend)}
                <span className="text-sm font-medium capitalize">
                  {latestInsight.sleep_pattern_trend}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6 text-center">
            <div className="space-y-4">
              <Moon className="h-16 w-16 text-gray-600 mx-auto" />
              <div>
                <h3 className="text-lg font-medium text-gray-300">No Sleep Data</h3>
                <p className="text-sm text-gray-500">Run an analysis to see your sleep insights</p>
              </div>
              <Button
                onClick={() => runAnalysis('daily')}
                disabled={analyzing || !primaryPatientId}
                className="bg-green-600 hover:bg-green-700"
              >
                Generate Sleep Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      {latestInsight && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-gray-400 uppercase tracking-wide">Sleep Debt</span>
              </div>
              <div className="text-xl font-bold">
                {latestInsight.sleep_debt_hours ? `${latestInsight.sleep_debt_hours.toFixed(1)}h` : '--'}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-purple-400" />
                <span className="text-xs text-gray-400 uppercase tracking-wide">Confidence</span>
              </div>
              <div className="text-xl font-bold">
                {Math.round(latestInsight.confidence_level * 100)}%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Moon className="h-4 w-4 text-indigo-400" />
                <span className="text-xs text-gray-400 uppercase tracking-wide">Bedtime</span>
              </div>
              <div className="text-xl font-bold">
                {formatTime(latestInsight.optimal_bedtime)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-green-400" />
                <span className="text-xs text-gray-400 uppercase tracking-wide">Duration</span>
              </div>
              <div className="text-xl font-bold">
                {formatDuration(latestInsight.predicted_sleep_duration)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Recommendations */}
      {latestInsight?.recommendations && Array.isArray(latestInsight.recommendations) && latestInsight.recommendations.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <h3 className="text-lg font-semibold">AI Insights</h3>
            </div>
            <div className="space-y-3">
              {(Array.isArray(latestInsight.recommendations) ? latestInsight.recommendations : []).slice(0, 3).map((rec: any, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
                  <Badge 
                    variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}
                    className="text-xs mt-1"
                  >
                    {rec.priority || 'low'}
                  </Badge>
                  <div className="flex-1">
                    <div className="font-medium text-sm mb-1">{rec.title}</div>
                    <div className="text-xs text-gray-400">{rec.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis History */}
      {insights.length > 1 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Analyses</h3>
            <div className="space-y-3">
              {insights.slice(1, 4).map((insight) => (
                <div key={insight.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`text-lg font-bold ${getScoreColor(insight.sleep_quality_score)}`}>
                      {insight.sleep_quality_score}
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {new Date(insight.analysis_date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="text-xs text-gray-400 capitalize">
                        {insight.sleep_pattern_trend}
                      </div>
                    </div>
                  </div>
                  {getTrendIcon(insight.sleep_pattern_trend)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={() => runAnalysis('weekly')}
          disabled={analyzing || !primaryPatientId}
          variant="outline"
          className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
        >
          Weekly Analysis
        </Button>
        <Button
          onClick={() => runAnalysis('monthly')}
          disabled={analyzing || !primaryPatientId}
          variant="outline"
          className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
        >
          Monthly Analysis
        </Button>
      </div>
    </div>
  );
};