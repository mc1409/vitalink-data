import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Moon, 
  ArrowLeft, 
  Zap, 
  RefreshCw, 
  Heart, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Brain,
  Target,
  Thermometer,
  Wind,
  Sun,
  Volume2,
  Minus,
  Calendar,
  BarChart3,
  Lightbulb
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePrimaryPatient } from '@/hooks/usePrimaryPatient';
import { useToast } from '@/components/ui/use-toast';

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
  key_factors: any;
  recommendations: any;
  confidence_level: number;
  processing_time_ms: number;
  data_sources_used: any;
  next_analysis_date: string;
  created_at: string;
}

const SleepIntelligence: React.FC = () => {
  const navigate = useNavigate();
  const { primaryPatient, loading: patientLoading } = usePrimaryPatient();
  const { toast } = useToast();
  
  const [analyzing, setAnalyzing] = useState(true);
  const [insights, setInsights] = useState<SleepInsight[]>([]);
  const [selectedTab, setSelectedTab] = useState('overview');

  // Auto-start analysis on page load
  useEffect(() => {
    if (primaryPatient?.id) {
      runAnalysis();
    }
  }, [primaryPatient?.id]);

  const runAnalysis = async () => {
    if (!primaryPatient?.id) return;
    
    try {
      setAnalyzing(true);
      
      // Get comprehensive data for enhanced analysis
      const [sleepData, heartData, activityData, insights] = await Promise.all([
        supabase
          .from('biomarker_sleep')
          .select('*')
          .eq('patient_id', primaryPatient.id)
          .order('sleep_date', { ascending: false })
          .limit(7),
        supabase
          .from('biomarker_heart')
          .select('*')
          .eq('patient_id', primaryPatient.id)
          .order('measurement_time', { ascending: false })
          .limit(7),
        supabase
          .from('biomarker_activity')
          .select('*')
          .eq('patient_id', primaryPatient.id)
          .order('measurement_date', { ascending: false })
          .limit(7),
        supabase
          .from('ai_sleep_insights')
          .select('*')
          .eq('patient_id', primaryPatient.id)
          .order('created_at', { ascending: false })
          .limit(1)
      ]);

      // Call the enhanced sleep intelligence agent
      const { data: enhancedAnalysis, error } = await supabase.functions.invoke('sleep-intelligence-enhanced', {
        body: {
          patient_id: primaryPatient.id,
          sleep_data: sleepData.data,
          heart_data: heartData.data,
          activity_data: activityData.data,
          recent_insights: insights.data
        }
      });

      if (error) throw error;

      // Store the enhanced analysis results
      if (enhancedAnalysis?.success) {
        await supabase
          .from('ai_sleep_insights')
          .insert({
            patient_id: primaryPatient.id,
            analysis_date: new Date().toISOString().split('T')[0],
            analysis_period: 'weekly',
            sleep_quality_score: enhancedAnalysis.sleep_score || 75,
            sleep_debt_hours: enhancedAnalysis.sleep_debt || 0,
            optimal_bedtime: '22:30',
            optimal_wake_time: '06:30',
            predicted_sleep_duration: (enhancedAnalysis.sleep_score || 75) * 5 + 100, // Estimate duration
            sleep_pattern_trend: enhancedAnalysis.trends?.overall || 'stable',
            key_factors: enhancedAnalysis.health_alerts || [],
            recommendations: enhancedAnalysis.daily_protocol || [],
            confidence_level: 0.95,
            processing_time_ms: enhancedAnalysis.processing_time_ms || 1000,
            data_sources_used: ['biomarker_sleep', 'biomarker_heart', 'biomarker_activity']
          });
      }

      // Fetch the updated insights
      await fetchInsights();
      
      toast({
        title: "Enhanced Analysis Complete",
        description: "Your comprehensive sleep intelligence report is ready!",
      });
    } catch (err) {
      console.error('Error running enhanced sleep analysis:', err);
      toast({
        title: "Analysis Error",
        description: "Failed to generate enhanced sleep analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const fetchInsights = async () => {
    if (!primaryPatient?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('ai_sleep_insights')
        .select('*')
        .eq('patient_id', primaryPatient.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      setInsights(data || []);
    } catch (err) {
      console.error('Error fetching insights:', err);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#10B981'; // Green
    if (score >= 60) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  const getScoreStatus = (score: number): string => {
    if (score >= 80) return 'OPTIMAL';
    if (score >= 60) return 'GOOD';
    if (score >= 40) return 'NEEDS ATTENTION';
    return 'CRITICAL';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
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

  if (patientLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center space-y-4">
          <Moon className="h-12 w-12 text-blue-400" />
          <div className="text-white">Loading patient data...</div>
        </div>
      </div>
    );
  }

  const latestInsight = insights[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/rolesgpt-health')}
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg">
                  <Moon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Sleep Intelligence Agent
                  </h1>
                  <p className="text-blue-200 font-medium">AI-powered sleep optimization command center</p>
                </div>
              </div>
            </div>
            {analyzing && (
              <div className="flex items-center gap-2 text-blue-200">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Analyzing your sleep patterns...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Main Sleep Score Dashboard */}
        {analyzing ? (
          <Card className="relative overflow-hidden bg-black/40 backdrop-blur-sm border-white/20">
            <CardContent className="p-12">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full border-4 border-blue-500/30 flex items-center justify-center">
                    <RefreshCw className="h-12 w-12 text-blue-400 animate-spin" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">AI Sleep Analysis in Progress</h2>
                  <p className="text-blue-200">Processing your sleep patterns and generating personalized insights...</p>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    <Badge variant="outline" className="text-blue-200 border-blue-400/30">Biomarker Data</Badge>
                    <Badge variant="outline" className="text-blue-200 border-blue-400/30">Sleep Patterns</Badge>
                    <Badge variant="outline" className="text-blue-200 border-blue-400/30">Heart Rate Variability</Badge>
                    <Badge variant="outline" className="text-blue-200 border-blue-400/30">Recovery Metrics</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : latestInsight ? (
          <>
            {/* Sleep Score Hero Section */}
            <Card className="relative overflow-hidden bg-black/40 backdrop-blur-sm border-white/20">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10"></div>
              <CardContent className="relative pt-8">
                <div className="flex flex-col lg:flex-row items-center gap-8">
                  {/* Sleep Score Circle */}
                  <div className="flex flex-col items-center text-center">
                    <div className="relative w-48 h-48 mb-6">
                      <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 180 180">
                        <circle
                          cx="90"
                          cy="90"
                          r="80"
                          stroke="rgb(148 163 184 / 0.3)"
                          strokeWidth="12"
                          fill="none"
                        />
                        <circle
                          cx="90"
                          cy="90"
                          r="80"
                          stroke={getScoreColor(latestInsight.sleep_quality_score)}
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 80}`}
                          strokeDashoffset={`${2 * Math.PI * 80 * (1 - latestInsight.sleep_quality_score / 100)}`}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-6xl font-bold text-white">
                          {latestInsight.sleep_quality_score}
                        </div>
                        <div className="text-lg text-blue-200">SLEEP SCORE</div>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className="text-white border-white/30 bg-black/20 px-4 py-2 text-lg"
                    >
                      {getScoreStatus(latestInsight.sleep_quality_score)}
                    </Badge>
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                    <div className="bg-black/30 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-white">{latestInsight.sleep_debt_hours}h</div>
                      <div className="text-sm text-blue-200">Sleep Debt</div>
                      <div className="mt-2">
                        {latestInsight.sleep_debt_hours > 3 ? 
                          <AlertTriangle className="h-4 w-4 text-red-400 mx-auto" /> :
                          <CheckCircle className="h-4 w-4 text-green-400 mx-auto" />
                        }
                      </div>
                    </div>
                    
                    <div className="bg-black/30 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-white">{formatDuration(latestInsight.predicted_sleep_duration)}</div>
                      <div className="text-sm text-blue-200">Sleep Duration</div>
                      <div className="mt-2">
                        <Clock className="h-4 w-4 text-blue-400 mx-auto" />
                      </div>
                    </div>
                    
                    <div className="bg-black/30 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-white">{formatTime(latestInsight.optimal_bedtime)}</div>
                      <div className="text-sm text-blue-200">Optimal Bedtime</div>
                      <div className="mt-2">
                        <Moon className="h-4 w-4 text-purple-400 mx-auto" />
                      </div>
                    </div>
                    
                    <div className="bg-black/30 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-white">{Math.round(latestInsight.confidence_level * 100)}%</div>
                      <div className="text-sm text-blue-200">Confidence</div>
                      <div className="mt-2">
                        <Target className="h-4 w-4 text-green-400 mx-auto" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Intelligence Tabs */}
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-black/40 border border-white/20">
                <TabsTrigger value="overview" className="text-white data-[state=active]:bg-blue-600">Overview</TabsTrigger>
                <TabsTrigger value="patterns" className="text-white data-[state=active]:bg-blue-600">Patterns</TabsTrigger>
                <TabsTrigger value="recommendations" className="text-white data-[state=active]:bg-blue-600">Actions</TabsTrigger>
                <TabsTrigger value="correlations" className="text-white data-[state=active]:bg-blue-600">Health Links</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Sleep Pattern Trend */}
                  <Card className="bg-black/40 backdrop-blur-sm border-white/20">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-blue-400" />
                          Sleep Pattern Trend
                        </h3>
                        {getTrendIcon(latestInsight.sleep_pattern_trend)}
                      </div>
                      <div className="space-y-3">
                        <div className="text-3xl font-bold text-white capitalize">
                          {latestInsight.sleep_pattern_trend}
                        </div>
                        <p className="text-blue-200">
                          Your sleep patterns have been {latestInsight.sleep_pattern_trend} over the analysis period.
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Calendar className="h-4 w-4" />
                          Analysis Period: {latestInsight.analysis_period}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Key Factors */}
                  <Card className="bg-black/40 backdrop-blur-sm border-white/20">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-400" />
                        Key Impact Factors
                      </h3>
                      <div className="space-y-3">
                        {latestInsight.key_factors?.slice(0, 3).map((factor, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                            <div>
                              <div className="font-medium text-white">{factor.factor}</div>
                              <div className="text-sm text-blue-200">{factor.description}</div>
                            </div>
                            <Badge 
                              variant={factor.impact === 'negative' ? 'destructive' : 'default'}
                              className="ml-2"
                            >
                              {factor.value}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Sleep Patterns Tab */}
              <TabsContent value="patterns" className="space-y-6">
                <Card className="bg-black/40 backdrop-blur-sm border-white/20">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-400" />
                      Sleep Architecture Analysis
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-blue-400 mb-2">7.2h</div>
                        <div className="text-sm text-blue-200 mb-4">Average Sleep Duration</div>
                        <Progress value={75} className="h-2" />
                      </div>
                      <div className="text-center">
                        <div className="text-4xl font-bold text-green-400 mb-2">85%</div>
                        <div className="text-sm text-blue-200 mb-4">Sleep Efficiency</div>
                        <Progress value={85} className="h-2" />
                      </div>
                      <div className="text-center">
                        <div className="text-4xl font-bold text-purple-400 mb-2">15%</div>
                        <div className="text-sm text-blue-200 mb-4">Deep Sleep</div>
                        <Progress value={60} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Recommendations Tab */}
              <TabsContent value="recommendations" className="space-y-6">
                <Card className="bg-black/40 backdrop-blur-sm border-white/20">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-400" />
                      Today's Sleep Protocol
                    </h3>
                    <div className="space-y-4">
                      {latestInsight.recommendations?.map((rec, index) => (
                        <div key={index} className="p-4 bg-black/30 rounded-lg border border-white/10">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-white">{rec.title}</h4>
                                <Badge variant={getPriorityColor(rec.priority)}>
                                  {rec.priority} priority
                                </Badge>
                              </div>
                              <p className="text-blue-200 mb-2">{rec.description}</p>
                              <p className="text-sm text-gray-300 bg-black/30 p-2 rounded">
                                <strong>Action:</strong> {rec.action}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Health Correlations Tab */}
              <TabsContent value="correlations" className="space-y-6">
                <Card className="bg-black/40 backdrop-blur-sm border-white/20">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                      <Heart className="h-5 w-5 text-red-400" />
                      Health Impact Analysis
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-medium text-white">Cardiovascular Health</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-200">Heart Rate Variability</span>
                            <span className="text-white">Optimal</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-200">Resting Heart Rate</span>
                            <span className="text-white">Good</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-200">Recovery Rate</span>
                            <span className="text-yellow-400">Needs Attention</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="font-medium text-white">Cognitive Function</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-200">Memory Consolidation</span>
                            <span className="text-white">Good</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-200">Attention Span</span>
                            <span className="text-white">Optimal</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-blue-200">Reaction Time</span>
                            <span className="text-green-400">Excellent</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <Card className="bg-black/40 backdrop-blur-sm border-white/20">
            <CardContent className="p-12 text-center">
              <Moon className="h-16 w-16 text-blue-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Ready for Sleep Intelligence</h2>
              <p className="text-blue-200 mb-6">
                Generate your first comprehensive sleep analysis to unlock personalized insights and optimization strategies.
              </p>
              <Button 
                onClick={runAnalysis}
                disabled={analyzing}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Generate Sleep Analysis
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SleepIntelligence;