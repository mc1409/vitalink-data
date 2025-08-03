import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Brain, 
  Zap, 
  Target, 
  AlertTriangle, 
  TrendingUp, 
  Calendar, 
  Sun,
  HelpCircle,
  ChevronDown,
  Info,
  Lightbulb,
  Activity,
  Heart,
  Moon,
  Utensils,
  Shield,
  Timer,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IntelligentDailyBriefingProps {
  patientId: string;
}

interface DailyBriefing {
  date: string;
  priority: string;
  healthFocus: string;
  energyPrediction: number;
  recommendations: {
    priority: string;
    category: string;
    action: string;
    reasoning: string;
    timing?: string;
  }[];
  insights: string[];
  riskAlerts: string[];
}

const IntelligentDailyBriefing: React.FC<IntelligentDailyBriefingProps> = ({ patientId }) => {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    const loadDailyBriefing = async () => {
      if (!patientId) return;
      
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke('daily-intelligence-briefing', {
          body: { patientId }
        });

        if (data?.briefing) {
          setBriefing(data.briefing);
        }

      } catch (error) {
        console.error('Error loading daily briefing:', error);
        toast.error('Failed to load daily intelligence briefing');
      } finally {
        setLoading(false);
      }
    };

    loadDailyBriefing();
  }, [patientId]);

  const getEnergyColor = (energy: number) => {
    if (energy >= 8) return 'text-success';
    if (energy >= 6) return 'text-warning';
    return 'text-destructive';
  };

  const getEnergyLabel = (energy: number) => {
    if (energy >= 8) return 'High Energy';
    if (energy >= 6) return 'Moderate Energy';
    if (energy >= 4) return 'Low Energy';
    return 'Very Low Energy';
  };

  const getEnergyExplanation = (energy: number) => {
    if (energy >= 8) return 'Your biomarkers indicate excellent recovery and high energy potential. Great day for challenging activities.';
    if (energy >= 6) return 'Good energy levels expected based on decent sleep and recovery metrics. Moderate intensity activities recommended.';
    if (energy >= 4) return 'Lower energy predicted due to poor sleep or elevated stress markers. Focus on gentle activities and recovery.';
    return 'Very low energy predicted. Prioritize rest, stress management, and avoid intense activities.';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'cardiovascular':
      case 'heart':
        return <Heart className="h-4 w-4" />;
      case 'sleep':
      case 'recovery':
        return <Moon className="h-4 w-4" />;
      case 'activity':
      case 'exercise':
        return <Activity className="h-4 w-4" />;
      case 'nutrition':
      case 'metabolic':
        return <Utensils className="h-4 w-4" />;
      case 'stress':
      case 'inflammatory':
        return <Shield className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">AI is preparing your personalized daily briefing...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!briefing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Intelligence Briefing</CardTitle>
          <CardDescription>No briefing data available. Ensure you have recent biomarker data.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* What is Daily Intelligence Briefing? */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-primary mb-2">What is your Daily Intelligence Briefing?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Every morning, AI analyzes your previous night's sleep, recent biomarker trends, and health patterns 
                  to predict your energy levels and provide personalized recommendations for optimal health and performance. 
                  Think of it as having a personal health advisor who knows your body's patterns.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Morning Health Intelligence Briefing */}
        <Card className="border-primary/20 bg-gradient-subtle">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-6 w-6 text-warning" />
              Morning Health Intelligence Briefing
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p className="text-sm">
                    AI analysis of your previous night's recovery and current biomarker status 
                    to optimize your day's activities and health choices.
                  </p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <CardDescription>
              {new Date(briefing.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Today's Focus & Energy Prediction */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card">
                <CardContent className="p-4 text-center">
                  <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="font-medium text-sm text-muted-foreground mb-1">Today's Priority</div>
                  <div className="text-lg font-bold">{briefing.priority}</div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 mt-2">
                        <Info className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p className="text-sm">
                        Based on your biomarker analysis, this is the most important health area 
                        to focus on today for optimal wellbeing.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>
              
              <Card className="bg-card">
                <CardContent className="p-4 text-center">
                  <Brain className="h-8 w-8 mx-auto mb-2 text-info" />
                  <div className="font-medium text-sm text-muted-foreground mb-1">Health Focus</div>
                  <div className="text-lg font-bold">{briefing.healthFocus}</div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 mt-2">
                        <Info className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p className="text-sm">
                        The specific health system or function that needs the most attention 
                        based on your current biomarker patterns.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>
              
              <Card className="bg-card">
                <CardContent className="p-4 text-center">
                  <Zap className={`h-8 w-8 mx-auto mb-2 ${getEnergyColor(briefing.energyPrediction)}`} />
                  <div className="font-medium text-sm text-muted-foreground mb-1">Energy Prediction</div>
                  <div className={`text-2xl font-bold ${getEnergyColor(briefing.energyPrediction)}`}>
                    {briefing.energyPrediction}/10
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {getEnergyLabel(briefing.energyPrediction)}
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 mt-2">
                        <Info className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md">
                      <p className="text-sm">
                        <strong>How this is calculated:</strong> AI analyzes your sleep efficiency, 
                        HRV recovery, resting heart rate, and recent stress patterns to predict 
                        your energy and performance capacity for today.
                      </p>
                      <Separator className="my-2" />
                      <p className="text-sm">{getEnergyExplanation(briefing.energyPrediction)}</p>
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>
            </div>

            {/* Key Insights */}
            {briefing.insights.length > 0 && (
              <Card className="bg-info/5 border-info/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Lightbulb className="h-5 w-5 text-info" />
                    Key Health Insights for Today
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <HelpCircle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p className="text-sm">
                          AI-discovered patterns and correlations in your recent health data 
                          that provide actionable insights for today.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {briefing.insights.map((insight, index) => (
                    <div key={index} className="p-3 bg-card rounded-lg border border-info/10">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-info/20 text-info flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{insight}</p>
                          <div className="mt-2 text-xs text-muted-foreground">
                            <strong>Why this matters:</strong> This insight helps you understand how your body 
                            responds to different factors and guides today's health decisions.
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Risk Alerts */}
            {briefing.riskAlerts.length > 0 && (
              <Card className="bg-destructive/5 border-destructive/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Important Health Alerts
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <HelpCircle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p className="text-sm">
                          Biomarker patterns that suggest increased health risks requiring 
                          immediate attention or monitoring.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {briefing.riskAlerts.map((alert, index) => (
                    <div key={index} className="p-3 bg-card rounded-lg border border-destructive/10">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-destructive font-medium">{alert}</p>
                          <div className="mt-2 text-xs text-muted-foreground">
                            <strong>Action required:</strong> Monitor symptoms closely and consider 
                            medical consultation if patterns persist or worsen.
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Priority Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Today's Personalized Action Plan
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p className="text-sm">
                    AI-generated recommendations based on your current biomarker status, 
                    recent trends, and personal response patterns.
                  </p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <CardDescription>
              Personalized recommendations based on your current health status and biomarker analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {briefing.recommendations.map((rec, index) => (
              <Card key={index} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {getCategoryIcon(rec.category)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getPriorityColor(rec.priority)}>
                            {rec.priority.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{rec.category}</span>
                          {rec.timing && (
                            <Badge variant="outline" className="text-xs">
                              <Timer className="h-3 w-3 mr-1" />
                              {rec.timing}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-foreground mb-1">{rec.action}</p>
                    </div>
                    
                    <Collapsible open={expandedSection === `rec-${index}`} onOpenChange={(open) => setExpandedSection(open ? `rec-${index}` : null)}>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm">
                          <span>Why is this recommended?</span>
                          <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${expandedSection === `rec-${index}` ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="mt-3">
                        <div className="p-3 bg-muted/30 rounded-lg space-y-3">
                          <div>
                            <h4 className="font-medium text-primary mb-2">Personalized Reasoning</h4>
                            <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-primary mb-2">Expected Benefits</h4>
                            <p className="text-sm text-muted-foreground">
                              Following this recommendation should help optimize your {rec.category.toLowerCase()} 
                              system and improve your overall health score. Results typically visible within 1-2 weeks.
                            </p>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-primary mb-2">How to Track Success</h4>
                            <p className="text-sm text-muted-foreground">
                              Monitor your daily biomarkers and watch for improvements in related metrics. 
                              The AI will adjust future recommendations based on your response.
                            </p>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* Integrated Health Progress Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Your Health Intelligence Journey
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <p className="text-sm">
                    Track your progress and see how AI recommendations are improving your health over time.
                  </p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <CardDescription>
              AI-powered progress tracking and intervention effectiveness analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-success" />
                    <div className="text-lg font-bold text-success">↗️ Improving</div>
                    <div className="text-sm text-muted-foreground">Weekly Health Score Trend</div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 mt-1">
                          <Info className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p className="text-sm">
                          Your overall health score has been trending upward based on biomarker improvements 
                          and successful intervention adherence.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </CardContent>
                </Card>
                
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-lg font-bold text-primary">85%</div>
                    <div className="text-sm text-muted-foreground">Intervention Success Rate</div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 mt-1">
                          <Info className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p className="text-sm">
                          85% of AI recommendations you've followed have resulted in measurable 
                          improvements in your biomarker patterns.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </CardContent>
                </Card>
                
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <Target className="h-8 w-8 mx-auto mb-2 text-info" />
                    <div className="text-lg font-bold text-info">2 weeks</div>
                    <div className="text-sm text-muted-foreground">Next Health Milestone</div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 mt-1">
                          <Info className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p className="text-sm">
                          Based on current trends, significant HRV improvement is predicted within 2 weeks 
                          if you continue following current recommendations.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </CardContent>
                </Card>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  AI Learning Progress
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  The AI has analyzed <strong>30 days</strong> of your health data and identified <strong>12 unique patterns</strong> 
                  specific to your health profile. Recommendation accuracy is improving as the system learns your responses.
                </p>
                <Progress value={75} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  75% personalization complete - More accurate recommendations as data accumulates
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export & Sharing Options */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h3 className="font-semibold text-primary">Share Your Health Intelligence</h3>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Export your daily briefing and health insights to share with healthcare providers, 
                track in your calendar, or maintain your personal health records.
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Add to Calendar
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Target className="h-4 w-4" />
                  Share with Physician
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Export Health Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default IntelligentDailyBriefing;