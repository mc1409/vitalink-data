import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { usePrimaryPatient } from '@/hooks/usePrimaryPatient';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { 
  Moon, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Clock, 
  Zap, 
  Brain, 
  Heart,
  Activity,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  Calendar,
  Target
} from 'lucide-react';
import { format } from 'date-fns';

interface SleepInsight {
  id: string;
  patient_id: string;
  analysis_date: string;
  analysis_period: string;
  sleep_quality_score: number;
  sleep_debt_hours: number;
  optimal_bedtime: string;
  optimal_wake_time: string;
  predicted_sleep_duration: number;
  sleep_pattern_trend: string;
  key_factors: any[];
  recommendations: any[];
  confidence_level: number;
  processing_time_ms: number;
  data_sources_used: string[];
  next_analysis_date: string;
  created_at: string;
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
    data_quality: any;
  };
}

const WHOOPSleepAnalysis: React.FC = () => {
  const { primaryPatient, loading: patientLoading } = usePrimaryPatient();
  const primaryPatientId = primaryPatient?.id;
  const { toast } = useToast();
  const [insights, setInsights] = useState<SleepInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    if (primaryPatientId) {
      fetchInsights();
    }
  }, [primaryPatientId]);

  const fetchInsights = async () => {
    if (!primaryPatientId) return;
    
    setLoading(true);
    try {
      console.log('🔍 Fetching sleep insights for patient:', primaryPatientId);
      
      const { data, error } = await supabase
        .from('ai_sleep_insights')
        .select('*')
        .eq('patient_id', primaryPatientId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('❌ Error fetching insights:', error);
        throw error;
      }

      console.log('✅ Fetched insights:', data);
      setInsights((data || []) as SleepInsight[]);
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
    setLatestAnalysis(null);
    
    try {
      console.log('🚀 Starting sleep analysis for patient:', primaryPatientId);
      
      const { data, error } = await supabase.functions.invoke('sleep-analysis-agent', {
        body: {
          patient_id: primaryPatientId,
          analysis_period: analysisPeriod,
          force_refresh: true
        }
      });

      console.log('📊 Analysis response:', { data, error });

      if (error) {
        console.error('❌ Analysis error:', error);
        throw error;
      }

      if (!data?.success) {
        console.error('❌ Analysis failed:', data);
        throw new Error(data?.message || 'Analysis failed');
      }

      console.log('✅ Analysis completed successfully:', data);
      setLatestAnalysis(data);
      
      // Refresh insights to show the new analysis
      await fetchInsights();

      toast({
        title: "Analysis Complete",
        description: `Sleep analysis completed in ${Math.round(data.processing_time_ms / 1000)}s`,
      });
    } catch (error) {
      console.error('💥 Error running analysis:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to run sleep analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreGradient = (score: number): string => {
    if (score >= 85) return 'from-green-500 to-green-600';
    if (score >= 70) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatTime = (timeString: string): string => {
    if (!timeString) return 'Not set';
    return timeString;
  };

  const formatDuration = (minutes: number): string => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  if (patientLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const latestInsight = insights[0];

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Moon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Sleep Coach</h1>
            <p className="text-muted-foreground">AI-powered sleep optimization</p>
          </div>
        </div>
        <Button 
          onClick={() => runAnalysis('daily')} 
          disabled={analyzing || !primaryPatientId}
          className="bg-primary hover:bg-primary/90"
        >
          {analyzing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Analyze
            </>
          )}
        </Button>
      </div>

      {/* Latest Analysis Result */}
      {latestAnalysis && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              Analysis Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-green-700">Sleep Score</p>
                <p className="text-2xl font-bold text-green-800">
                  {latestAnalysis.analysis_summary.sleep_quality_score}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Trend</p>
                <div className="flex items-center gap-1">
                  {getTrendIcon(latestAnalysis.analysis_summary.pattern_trend)}
                  <span className="capitalize text-green-800">
                    {latestAnalysis.analysis_summary.pattern_trend}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Confidence</p>
                <p className="text-2xl font-bold text-green-800">
                  {Math.round(latestAnalysis.analysis_summary.confidence_level * 100)}%
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">Data Quality</p>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {latestAnalysis.analysis_summary.data_quality?.quality || 'good'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Sleep Insight */}
      {latestInsight ? (
        <Card className="relative overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-r ${getScoreGradient(latestInsight.sleep_quality_score)} opacity-5`}></div>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Sleep Quality Score
              </CardTitle>
              <div className="flex items-center gap-2">
                {getTrendIcon(latestInsight.sleep_pattern_trend)}
                <Badge variant="outline">
                  {formatDate(latestInsight.analysis_date)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sleep Score Circle */}
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-200"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - latestInsight.sleep_quality_score / 100)}`}
                    className={getScoreColor(latestInsight.sleep_quality_score)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${getScoreColor(latestInsight.sleep_quality_score)}`}>
                      {latestInsight.sleep_quality_score}
                    </div>
                    <div className="text-sm text-muted-foreground">Score</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center">
                  <Heart className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-sm font-medium">Sleep Debt</span>
                </div>
                <div className="text-lg font-semibold">
                  {latestInsight.sleep_debt_hours || 0}h
                </div>
              </div>
              
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center">
                  <Target className="h-4 w-4 text-blue-500 mr-1" />
                  <span className="text-sm font-medium">Confidence</span>
                </div>
                <div className="text-lg font-semibold">
                  {Math.round((latestInsight.confidence_level || 0) * 100)}%
                </div>
              </div>
              
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center">
                  <Clock className="h-4 w-4 text-purple-500 mr-1" />
                  <span className="text-sm font-medium">Optimal Bedtime</span>
                </div>
                <div className="text-lg font-semibold">
                  {formatTime(latestInsight.optimal_bedtime)}
                </div>
              </div>
              
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center">
                  <Activity className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm font-medium">Duration</span>
                </div>
                <div className="text-lg font-semibold">
                  {formatDuration(latestInsight.predicted_sleep_duration)}
                </div>
              </div>
            </div>

            <Separator />

            {/* AI Recommendations */}
            {latestInsight.recommendations && latestInsight.recommendations.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  AI Recommendations
                </h3>
                <div className="space-y-3">
                  {latestInsight.recommendations.slice(0, 3).map((rec, index) => (
                    <div key={index} className="p-3 bg-muted rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{rec.title}</h4>
                        <Badge variant={getPriorityColor(rec.priority)}>
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {rec.description}
                      </p>
                      <p className="text-sm font-medium">
                        Action: {rec.action}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : !loading ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-muted rounded-full">
                <Moon className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No Sleep Data</h3>
                <p className="text-muted-foreground mb-4">
                  Run an analysis to see your sleep insights
                </p>
                <Button 
                  onClick={() => runAnalysis('daily')} 
                  disabled={analyzing || !primaryPatientId}
                  className="bg-primary hover:bg-primary/90"
                >
                  {analyzing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Generate Sleep Analysis'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Analysis History */}
      {insights.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Analyses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.slice(1, 4).map((insight) => (
                <div 
                  key={insight.id} 
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`text-lg font-semibold ${getScoreColor(insight.sleep_quality_score)}`}>
                      {insight.sleep_quality_score}
                    </div>
                    <div>
                      <p className="font-medium">{formatDate(insight.analysis_date)}</p>
                      <p className="text-sm text-muted-foreground">
                        {insight.analysis_period} analysis
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(insight.sleep_pattern_trend)}
                    <span className="text-sm capitalize">
                      {insight.sleep_pattern_trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Period Options */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              onClick={() => runAnalysis('weekly')}
              disabled={analyzing}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Calendar className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Weekly Analysis</div>
                <div className="text-sm text-muted-foreground">7-day patterns</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => runAnalysis('monthly')}
              disabled={analyzing}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Calendar className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Monthly Analysis</div>
                <div className="text-sm text-muted-foreground">30-day trends</div>
              </div>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => runAnalysis('daily')}
              disabled={analyzing}
              className="h-auto p-4 flex flex-col items-center gap-2"
            >
              <Zap className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Quick Analysis</div>
                <div className="text-sm text-muted-foreground">Recent data</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Loading sleep insights...</span>
        </div>
      )}
    </div>
  );
};

export default WHOOPSleepAnalysis;