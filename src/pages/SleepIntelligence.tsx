import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Lightbulb,
  Code,
  Eye
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

interface EnhancedAnalysisData {
  sleep_score: number;
  recovery_status: string;
  sleep_debt: number;
  efficiency: number;
  deep_sleep_percentage: number;
  rem_sleep_percentage: number;
  avg_hrv: number;
  avg_heart_rate: number;
  trends: any;
  correlations: any;
  health_alerts: any[];
  environmental: any;
  daily_protocol: any[];
  predictions: any;
  ai_insights: string;
}

const SleepIntelligence: React.FC = () => {
  const navigate = useNavigate();
  const { primaryPatient, loading: patientLoading } = usePrimaryPatient();
  const { toast } = useToast();
  
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState<SleepInsight[]>([]);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [enhancedData, setEnhancedData] = useState<EnhancedAnalysisData | null>(null);
  
  // Debug popups
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [debugPrompt, setDebugPrompt] = useState('');
  const [debugResponse, setDebugResponse] = useState('');

  useEffect(() => {
    if (primaryPatient?.id) {
      fetchInsights();
    }
  }, [primaryPatient?.id]);

  const runAnalysis = async () => {
    if (!primaryPatient?.id) return;
    
    try {
      setAnalyzing(true);
      
      console.log('🚀 Starting comprehensive sleep analysis...');
      
      // Get comprehensive data for enhanced analysis - last 7 days
      const [sleepData, heartData, activityData, existingInsights] = await Promise.all([
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
          .limit(3)
      ]);

      console.log('📊 Data collected:', {
        sleep: sleepData.data?.length || 0,
        heart: heartData.data?.length || 0,
        activity: activityData.data?.length || 0,
        insights: existingInsights.data?.length || 0
      });

      const requestPayload = {
        patient_id: primaryPatient.id,
        sleep_data: sleepData.data || [],
        heart_data: heartData.data || [],
        activity_data: activityData.data || [],
        recent_insights: existingInsights.data || []
      };

      // Store the prompt for debugging
      setDebugPrompt(JSON.stringify(requestPayload, null, 2));

      // Call the enhanced sleep intelligence agent
      console.log('🤖 Calling sleep-intelligence-enhanced function...');
      const { data: enhancedAnalysis, error } = await supabase.functions.invoke('sleep-intelligence-enhanced', {
        body: requestPayload
      });

      // Store the response for debugging
      setDebugResponse(JSON.stringify(enhancedAnalysis, null, 2));

      if (error) {
        console.error('❌ Function error:', error);
        throw error;
      }

      console.log('✅ Enhanced analysis received:', enhancedAnalysis);

      // Store the enhanced analysis results
      if (enhancedAnalysis?.success) {
        setEnhancedData(enhancedAnalysis);
        
        const insertData = {
          patient_id: primaryPatient.id,
          analysis_date: new Date().toISOString().split('T')[0],
          analysis_period: 'weekly',
          sleep_quality_score: enhancedAnalysis.sleep_score || 75,
          sleep_debt_hours: enhancedAnalysis.sleep_debt || 0,
          optimal_bedtime: '22:30',
          optimal_wake_time: '06:30',
          predicted_sleep_duration: enhancedAnalysis.efficiency ? Math.round(enhancedAnalysis.efficiency * 8 * 60 / 100) : 420, // More realistic calculation
          sleep_pattern_trend: enhancedAnalysis.trends?.overall || 'stable',
          key_factors: enhancedAnalysis.health_alerts || [],
          recommendations: enhancedAnalysis.daily_protocol || [],
          confidence_level: 0.95,
          processing_time_ms: enhancedAnalysis.processing_time_ms || 1000,
          data_sources_used: ['biomarker_sleep', 'biomarker_heart', 'biomarker_activity']
        };

        console.log('💾 Inserting enhanced data:', insertData);

        await supabase
          .from('ai_sleep_insights')
          .insert(insertData);
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
      console.log('📈 Insights fetched:', data?.length || 0);
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
            <div className="flex items-center gap-3">
              {/* Debug buttons */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPromptDialog(true)}
                className="text-white border-white/30 hover:bg-white/10"
              >
                <Code className="h-4 w-4 mr-2" />
                View Prompt
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResponseDialog(true)}
                className="text-white border-white/30 hover:bg-white/10"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Response
              </Button>
              <Button
                onClick={runAnalysis}
                disabled={analyzing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Generate Analysis
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Analysis Status */}
        {analyzing && (
          <Card className="relative overflow-hidden bg-black/40 backdrop-blur-sm border-white/20">
            <CardContent className="p-12">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full border-4 border-blue-500/30 flex items-center justify-center">
                    <RefreshCw className="h-12 w-12 text-blue-400 animate-spin" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-white">Enhanced AI Sleep Analysis in Progress</h2>
                  <p className="text-blue-200">Processing 7 days of sleep, heart, and activity data with advanced AI correlations...</p>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    <Badge variant="outline" className="text-blue-200 border-blue-400/30">Sleep Patterns</Badge>
                    <Badge variant="outline" className="text-blue-200 border-blue-400/30">Heart Rate Variability</Badge>
                    <Badge variant="outline" className="text-blue-200 border-blue-400/30">Activity Correlations</Badge>
                    <Badge variant="outline" className="text-blue-200 border-blue-400/30">Health Predictions</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Analysis Display */}
        {enhancedData && (
          <Card className="bg-black/40 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Brain className="h-6 w-6 text-blue-400" />
                Enhanced AI Analysis Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sleep Score Circle */}
              <div className="flex items-center justify-center">
                <div className="relative w-48 h-48">
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
                      stroke={getScoreColor(enhancedData.sleep_score)}
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 80}`}
                      strokeDashoffset={`${2 * Math.PI * 80 * (1 - enhancedData.sleep_score / 100)}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-6xl font-bold text-white">
                      {enhancedData.sleep_score}
                    </div>
                    <div className="text-lg text-blue-200">SLEEP SCORE</div>
                    <Badge variant="outline" className="text-white border-white/30 bg-black/20 mt-2">
                      {enhancedData.recovery_status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-black/30 border-white/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-white">{enhancedData.sleep_debt.toFixed(1)}h</div>
                    <div className="text-sm text-blue-200">Sleep Debt</div>
                  </CardContent>
                </Card>
                <Card className="bg-black/30 border-white/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-white">{enhancedData.efficiency.toFixed(1)}%</div>
                    <div className="text-sm text-blue-200">Sleep Efficiency</div>
                  </CardContent>
                </Card>
                <Card className="bg-black/30 border-white/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-white">{enhancedData.deep_sleep_percentage.toFixed(1)}%</div>
                    <div className="text-sm text-blue-200">Deep Sleep</div>
                  </CardContent>
                </Card>
                <Card className="bg-black/30 border-white/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-white">{enhancedData.avg_hrv.toFixed(1)}ms</div>
                    <div className="text-sm text-blue-200">Average HRV</div>
                  </CardContent>
                </Card>
              </div>

              {/* Health Alerts */}
              {enhancedData.health_alerts?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">Health Alerts</h3>
                  {enhancedData.health_alerts.map((alert: any, index: number) => (
                    <Card key={index} className="bg-black/30 border-white/20">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={`h-5 w-5 mt-1 ${
                            alert.type === 'critical' ? 'text-red-400' : 
                            alert.type === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                          }`} />
                          <div className="flex-1">
                            <h4 className="font-semibold text-white">{alert.title}</h4>
                            <p className="text-blue-200 text-sm mt-1">{alert.message}</p>
                            {alert.recommendation && (
                              <p className="text-green-400 text-sm mt-2">
                                <strong>Recommendation:</strong> {alert.recommendation}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Daily Protocol */}
              {enhancedData.daily_protocol?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">Daily Protocol</h3>
                  {enhancedData.daily_protocol.map((protocol: any, index: number) => (
                    <Card key={index} className="bg-black/30 border-white/20">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-blue-200 border-blue-400/30">
                                {protocol.time}
                              </Badge>
                              <Badge 
                                variant={protocol.priority === 'high' ? 'destructive' : 
                                        protocol.priority === 'medium' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {protocol.priority} priority
                              </Badge>
                            </div>
                            <h4 className="font-semibold text-white">{protocol.action}</h4>
                            <p className="text-blue-200 text-sm mt-1">{protocol.why}</p>
                            <p className="text-green-400 text-sm mt-1">
                              <strong>Expected Impact:</strong> {protocol.impact}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* AI Insights */}
              {enhancedData.ai_insights && (
                <Card className="bg-black/30 border-white/20">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Brain className="h-5 w-5 text-blue-400" />
                      AI Insights
                    </h3>
                    <p className="text-blue-200">{enhancedData.ai_insights}</p>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}

        {/* Database Insights Display */}
        {latestInsight && (
          <Card className="bg-black/40 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Latest Database Insight</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{latestInsight.sleep_quality_score}</div>
                  <div className="text-sm text-blue-200">DB Sleep Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{latestInsight.sleep_debt_hours}h</div>
                  <div className="text-sm text-blue-200">DB Sleep Debt</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{formatTime(latestInsight.optimal_bedtime)}</div>
                  <div className="text-sm text-blue-200">DB Optimal Bedtime</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{latestInsight.sleep_pattern_trend}</div>
                  <div className="text-sm text-blue-200">DB Trend</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No data state */}
        {!analyzing && !enhancedData && !latestInsight && (
          <Card className="bg-black/40 backdrop-blur-sm border-white/20">
            <CardContent className="p-12 text-center">
              <Moon className="h-16 w-16 text-blue-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">No Sleep Analysis Available</h2>
              <p className="text-blue-200 mb-6">Generate your first comprehensive sleep intelligence report</p>
              <Button onClick={runAnalysis} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Zap className="h-4 w-4 mr-2" />
                Start Analysis
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Debug Dialogs */}
      <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-black/90 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">LLM Prompt Debug</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-96">
            <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">
              {debugPrompt || 'No prompt data available'}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-black/90 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">LLM Response Debug</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-96">
            <pre className="text-blue-400 text-xs font-mono whitespace-pre-wrap">
              {debugResponse || 'No response data available'}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SleepIntelligence;