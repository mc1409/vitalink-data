import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Target,
  Sun,
  Smartphone,
  Thermometer,
  Wind,
  BarChart3,
  Users,
  Shield,
  Lightbulb,
  Timer,
  Droplets
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

interface BiomarkerData {
  sleep_data: any[];
  heart_data: any[];
  activity_data: any[];
}

const SleepIntelligenceAgent: React.FC = () => {
  const { primaryPatient, loading: patientLoading } = usePrimaryPatient();
  const primaryPatientId = primaryPatient?.id;
  const { toast } = useToast();
  const [insights, setInsights] = useState<SleepInsight[]>([]);
  const [biomarkerData, setBiomarkerData] = useState<BiomarkerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (primaryPatientId) {
      fetchInsights();
      fetchBiomarkerData();
    }
  }, [primaryPatientId]);

  // Auto-refresh insights every 10 seconds when analyzing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (analyzing) {
      interval = setInterval(() => {
        fetchInsights();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [analyzing, primaryPatientId]);

  const fetchInsights = async () => {
    if (!primaryPatientId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_sleep_insights')
        .select('*')
        .eq('patient_id', primaryPatientId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
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

  const fetchBiomarkerData = async () => {
    if (!primaryPatientId) return;
    
    try {
      // Fetch recent biomarker data for correlations
      const [sleepData, heartData, activityData] = await Promise.all([
        supabase
          .from('biomarker_sleep')
          .select('*')
          .eq('patient_id', primaryPatientId)
          .order('sleep_date', { ascending: false })
          .limit(7),
        supabase
          .from('biomarker_heart')
          .select('*')
          .eq('patient_id', primaryPatientId)
          .order('measurement_time', { ascending: false })
          .limit(7),
        supabase
          .from('biomarker_activity')
          .select('*')
          .eq('patient_id', primaryPatientId)
          .order('measurement_date', { ascending: false })
          .limit(7)
      ]);

      setBiomarkerData({
        sleep_data: sleepData.data || [],
        heart_data: heartData.data || [],
        activity_data: activityData.data || []
      });
    } catch (error) {
      console.error('Error fetching biomarker data:', error);
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
      if (!data?.success) throw new Error(data?.message || 'Analysis failed');

      await fetchInsights();
      toast({
        title: "Analysis Complete",
        description: `Sleep analysis completed in ${Math.round(data.processing_time_ms / 1000)}s`,
      });
    } catch (error) {
      console.error('Error running analysis:', error);
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
    if (score >= 85) return 'hsl(var(--success))';
    if (score >= 70) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  const getScoreStatus = (score: number): string => {
    if (score >= 85) return 'OPTIMAL';
    if (score >= 70) return 'GOOD';
    if (score >= 50) return 'NEEDS ATTENTION';
    return 'CRITICAL';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
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
      <div className="space-y-6 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Show loading state only when analyzing and no insights exist yet
  if (analyzing && insights.length === 0) {
    return (
      <div className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary to-primary-glow rounded-lg shadow-lg">
              <Moon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                Sleep Intelligence Agent
              </h2>
              <p className="text-sm text-muted-foreground">Analyzing your sleep data...</p>
            </div>
          </div>
          <Button size="sm" disabled className="bg-gradient-to-r from-primary to-primary-glow text-white">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Analyzing...
          </Button>
        </div>
        <Card className="p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="animate-spin">
              <Moon className="h-12 w-12 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">AI Sleep Analysis in Progress</h3>
              <p className="text-muted-foreground">Processing your sleep patterns and generating insights...</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const latestInsight = insights[0];

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary to-primary-glow rounded-lg shadow-lg">
            <Moon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Sleep Intelligence Agent
            </h2>
            <p className="text-sm text-muted-foreground">AI-powered sleep optimization</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => runAnalysis('weekly')} 
            disabled={analyzing || !primaryPatientId}
          >
            <Calendar className="h-3 w-3 mr-1" />
            Weekly
          </Button>
          <Button 
            size="sm"
            onClick={() => runAnalysis('daily')} 
            disabled={analyzing || !primaryPatientId}
            className="bg-gradient-to-r from-primary to-primary-glow text-white"
          >
            {analyzing ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="h-3 w-3 mr-1" />
                Analyze
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Main Sleep Score Dashboard */}
        {latestInsight ? (
          <Card className="relative overflow-hidden shadow-card-custom bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-border/50">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary-glow/5"></div>
            <CardContent className="relative pt-8">
              {/* Sleep Score Circle */}
              <div className="flex flex-col items-center text-center mb-8">
                <div className="relative w-48 h-48 mb-6">
                  <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 180 180">
                    <circle
                      cx="90"
                      cy="90"
                      r="80"
                      stroke="hsl(var(--muted))"
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
                    <div className="text-6xl font-bold" style={{ color: getScoreColor(latestInsight.sleep_quality_score) }}>
                      {latestInsight.sleep_quality_score}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">SLEEP SCORE</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Badge 
                    variant={latestInsight.sleep_quality_score >= 70 ? "default" : "destructive"}
                    className="text-base px-4 py-2 font-semibold"
                  >
                    Status: {getScoreStatus(latestInsight.sleep_quality_score)}
                  </Badge>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {getTrendIcon(latestInsight.sleep_pattern_trend)}
                    <span className="capitalize font-medium">{latestInsight.sleep_pattern_trend} Pattern</span>
                    <span className="text-xs">•</span>
                    <span className="text-sm">Day {insights.length}</span>
                  </div>
                </div>
              </div>

              {/* Today's Focus */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Lightbulb className="h-5 w-5 text-warning" />
                  <span className="font-semibold text-lg">Today's Focus</span>
                </div>
                <div className="text-2xl font-bold text-primary mb-1">
                  {latestInsight.sleep_debt_hours > 2 ? 'SLEEP DEBT RECOVERY' : 'DEEP SLEEP OPTIMIZATION'}
                </div>
                <div className="text-muted-foreground">
                  Current: {latestInsight.sleep_debt_hours || 0}h debt | Target: &lt;1h
                </div>
              </div>
            </CardContent>
          </Card>
        ) : !loading ? (
          <Card className="text-center py-16 bg-gradient-to-br from-card to-muted/20 border-border/50">
            <CardContent>
              <div className="flex flex-col items-center space-y-6">
                <div className="p-6 bg-primary/10 rounded-full">
                  <Moon className="h-12 w-12 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3">Ready for Sleep Intelligence</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Generate your first comprehensive sleep analysis to unlock personalized insights and optimization strategies
                  </p>
                  <Button 
                    onClick={() => runAnalysis('daily')} 
                    disabled={analyzing || !primaryPatientId}
                    size="lg"
                    className="bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90 text-white shadow-lg"
                  >
                    {analyzing ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                        Generating Analysis...
                      </>
                    ) : (
                      <>
                        <Brain className="h-5 w-5 mr-2" />
                        Generate Sleep Analysis
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Intelligence Panels */}
        {latestInsight && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-muted/50 backdrop-blur-sm p-1 rounded-xl">
              <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                <BarChart3 className="h-4 w-4" />
                Sleep Intel
              </TabsTrigger>
              <TabsTrigger value="correlations" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                <Activity className="h-4 w-4" />
                Health Links
              </TabsTrigger>
              <TabsTrigger value="protocol" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                <Target className="h-4 w-4" />
                Daily Protocol
              </TabsTrigger>
              <TabsTrigger value="environment" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                <Thermometer className="h-4 w-4" />
                Environment
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Sleep Pattern Intelligence */}
              <Card className="shadow-card-custom bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    Sleep Pattern Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center space-y-2 p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center">
                        <Heart className="h-5 w-5 text-destructive mr-2" />
                        <span className="text-sm font-medium">Sleep Debt</span>
                      </div>
                      <div className="text-2xl font-bold text-destructive">
                        {latestInsight.sleep_debt_hours || 0}h
                      </div>
                      <div className="text-xs text-muted-foreground">Accumulated</div>
                    </div>
                    
                    <div className="text-center space-y-2 p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center">
                        <Target className="h-5 w-5 text-primary mr-2" />
                        <span className="text-sm font-medium">Confidence</span>
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        {Math.round((latestInsight.confidence_level || 0) * 100)}%
                      </div>
                      <div className="text-xs text-muted-foreground">AI Accuracy</div>
                    </div>
                    
                    <div className="text-center space-y-2 p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center">
                        <Clock className="h-5 w-5 text-warning mr-2" />
                        <span className="text-sm font-medium">Optimal Bedtime</span>
                      </div>
                      <div className="text-2xl font-bold text-warning">
                        {formatTime(latestInsight.optimal_bedtime)}
                      </div>
                      <div className="text-xs text-muted-foreground">Tonight</div>
                    </div>
                    
                    <div className="text-center space-y-2 p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center">
                        <Timer className="h-5 w-5 text-success mr-2" />
                        <span className="text-sm font-medium">Duration</span>
                      </div>
                      <div className="text-2xl font-bold text-success">
                        {formatDuration(latestInsight.predicted_sleep_duration)}
                      </div>
                      <div className="text-xs text-muted-foreground">Predicted</div>
                    </div>
                  </div>

                  {/* AI Insights */}
                  {latestInsight.key_factors && latestInsight.key_factors.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        Critical Sleep Factors
                      </h4>
                      <div className="space-y-3">
                        {latestInsight.key_factors.slice(0, 3).map((factor, index) => (
                          <div key={index} className="p-4 bg-muted/30 rounded-lg border-l-4 border-warning">
                            <div className="flex items-start justify-between mb-2">
                              <h5 className="font-medium">{factor.factor}</h5>
                              <Badge variant={factor.impact === 'negative' ? 'destructive' : 'default'}>
                                {factor.value}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {factor.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="correlations" className="space-y-6">
              {/* Health Correlation Dashboard */}
              <Card className="shadow-card-custom bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Health Impact Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Health Alerts */}
                  <div className="grid gap-4">
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-destructive mt-1" />
                        <div>
                          <h4 className="font-semibold text-destructive mb-1">Sleep Recovery Alert</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Sleep debt of {latestInsight.sleep_debt_hours}h may impact immune function and cognitive performance.
                          </p>
                          <p className="text-xs text-destructive font-medium">
                            Recommendation: Prioritize 8+ hours tonight for recovery
                          </p>
                        </div>
                      </div>
                    </div>

                    {biomarkerData?.heart_data && biomarkerData.heart_data.length > 0 && (
                      <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Heart className="h-5 w-5 text-warning mt-1" />
                          <div>
                            <h4 className="font-semibold text-warning mb-1">Cardiovascular Pattern</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              Heart rate variability correlation with sleep quality detected in recent data.
                            </p>
                            <p className="text-xs text-warning font-medium">
                              Monitor HRV trends for sleep optimization insights
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Biomarker Correlation Matrix */}
                  {biomarkerData && (
                    <div className="space-y-4">
                      <h4 className="font-semibold">Sleep Factor Impact Matrix</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <h5 className="font-medium mb-3">Sleep Efficiency Factors</h5>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Screen Time</span>
                              <span className="text-sm text-destructive font-medium">-23%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Exercise Timing</span>
                              <span className="text-sm text-success font-medium">+12%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Stress Level</span>
                              <span className="text-sm text-destructive font-medium">-31%</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg">
                          <h5 className="font-medium mb-3">Deep Sleep Factors</h5>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Room Temperature</span>
                              <span className="text-sm text-warning font-medium">-8%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Alcohol</span>
                              <span className="text-sm text-destructive font-medium">-34%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm">Magnesium</span>
                              <span className="text-sm text-success font-medium">+28%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="protocol" className="space-y-6">
              {/* Today's Sleep Protocol */}
              <Card className="shadow-card-custom bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Today's Sleep Protocol
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {latestInsight.recommendations && latestInsight.recommendations.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Zap className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">Priority Actions (AI-Recommended)</h4>
                      </div>
                      <div className="space-y-4">
                        {latestInsight.recommendations.map((rec, index) => (
                          <div key={index} className="p-4 bg-gradient-to-r from-muted/30 to-muted/20 rounded-lg border border-border/50">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                                  {index + 1}
                                </div>
                                <div>
                                  <h5 className="font-semibold">{rec.title}</h5>
                                  <p className="text-sm text-muted-foreground">{rec.category}</p>
                                </div>
                              </div>
                              <Badge variant={getPriorityColor(rec.priority)}>
                                {rec.priority}
                              </Badge>
                            </div>
                            <div className="ml-11 space-y-2">
                              <p className="text-sm text-muted-foreground">
                                <strong>Why:</strong> {rec.description}
                              </p>
                              <p className="text-sm font-medium">
                                <strong>Action:</strong> {rec.action}
                              </p>
                              <div className="flex items-center gap-2 mt-3">
                                <Button size="sm" variant="outline">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Mark Complete
                                </Button>
                                <Button size="sm" variant="ghost">
                                  <Clock className="h-4 w-4 mr-1" />
                                  Set Reminder
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="environment" className="space-y-6">
              {/* Environmental Intelligence */}
              <Card className="shadow-card-custom bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Thermometer className="h-5 w-5 text-primary" />
                    Environment Optimization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Bedroom Conditions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold">Current Conditions</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Thermometer className="h-4 w-4 text-warning" />
                            <span className="text-sm">Temperature</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">71°F</div>
                            <div className="text-xs text-warning">Too warm</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Droplets className="h-4 w-4 text-success" />
                            <span className="text-sm">Humidity</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">45%</div>
                            <div className="text-xs text-success">Optimal</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Sun className="h-4 w-4 text-destructive" />
                            <span className="text-sm">Light Exposure</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">High at 10 PM</div>
                            <div className="text-xs text-destructive">Too bright</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Wind className="h-4 w-4 text-warning" />
                            <span className="text-sm">Noise Level</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">Moderate</div>
                            <div className="text-xs text-warning">Consider reduction</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold">Smart Optimizations</h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-4 w-4 text-success" />
                            <span className="font-medium text-success">Auto-Optimization Available</span>
                          </div>
                          <ul className="text-sm space-y-1 text-muted-foreground ml-6">
                            <li>• Lower thermostat to 67°F at 9 PM</li>
                            <li>• Enable blackout mode on devices</li>
                            <li>• Activate white noise system</li>
                          </ul>
                        </div>
                        
                        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Smartphone className="h-4 w-4 text-primary" />
                            <span className="font-medium text-primary">Smart Home Integration</span>
                          </div>
                          <ul className="text-sm space-y-1 text-muted-foreground ml-6">
                            <li>• Philips Hue circadian lighting</li>
                            <li>• Smart thermostat control</li>
                            <li>• Sleep cycle alarm optimization</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button className="flex-1 bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90 text-white">
                          Auto-Optimize Tonight
                        </Button>
                        <Button variant="outline" className="border-primary/30">
                          Setup Guide
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default SleepIntelligenceAgent;