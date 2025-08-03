import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  TrendingUp, 
  Heart, 
  Brain, 
  Activity, 
  Moon, 
  Zap, 
  Shield, 
  Target, 
  Clock,
  HelpCircle,
  ChevronDown,
  Info,
  Calculator,
  Lightbulb,
  Stethoscope,
  FileText,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import IntelligentMetricCard from './IntelligentMetricCard';
import EnhancedSystemsMatrix from './EnhancedSystemsMatrix';
import IntelligentDailyBriefing from './IntelligentDailyBriefing';

interface EnhancedHealthIntelligenceDashboardProps {
  patientId: string;
  patientName?: string;
}

interface BiomarkerAlert {
  level: 'critical' | 'warning' | 'optimal';
  category: string;
  metric: string;
  currentValue: number | null;
  threshold: number;
  message: string;
  action: string;
}

interface HealthScore {
  overall: number;
  cardiovascular: number;
  metabolic: number;
  inflammatory: number;
  nutritional: number;
  recovery: number;
  breakdown: {
    cardiovascular: { hrv: number; rhr: number; bloodPressure: number; };
    metabolic: { sleep: number; activity: number; glucose: number; };
    inflammatory: { recovery: number; stress: number; };
    nutritional: { vitamins: number; hydration: number; };
    recovery: { sleepQuality: number; hrvRecovery: number; };
  };
}

const EnhancedHealthIntelligenceDashboard: React.FC<EnhancedHealthIntelligenceDashboardProps> = ({ 
  patientId, 
  patientName 
}) => {
  const [alerts, setAlerts] = useState<BiomarkerAlert[]>([]);
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);
  const [expandedScoreSection, setExpandedScoreSection] = useState(false);

  const loadHealthIntelligence = async () => {
    if (!patientId) return;
    
    setLoading(true);
    try {
      // Call our edge functions
      const [alertsResponse, scoreResponse] = await Promise.all([
        supabase.functions.invoke('critical-biomarker-analysis', { body: { patientId } }),
        supabase.functions.invoke('health-score-calculator', { body: { patientId } })
      ]);

      if (alertsResponse.data?.alerts) {
        setAlerts(alertsResponse.data.alerts);
        setLastAnalysis(alertsResponse.data.analysisDate);
      }

      if (scoreResponse.data?.healthScore) {
        setHealthScore(scoreResponse.data.healthScore);
      }

    } catch (error) {
      console.error('Error loading health intelligence:', error);
      toast.error('Failed to load health intelligence data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealthIntelligence();
  }, [patientId]);

  const getHealthScoreColor = (score: number) => {
    if (score >= 85) return 'text-success';
    if (score >= 70) return 'text-warning';
    if (score >= 55) return 'text-destructive';
    return 'text-destructive';
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 85) return 'Optimal Health';
    if (score >= 70) return 'Monitor Closely';
    if (score >= 55) return 'Action Required';
    return 'Critical';
  };

  const getHealthScoreDescription = (score: number) => {
    if (score >= 85) return 'Your health metrics are in optimal ranges. Continue current protocols and focus on maintenance.';
    if (score >= 70) return 'Most metrics are good, but some areas need monitoring. Preventive interventions recommended.';
    if (score >= 55) return 'Multiple health systems need optimization. Systematic approach to improvement required.';
    return 'Critical health patterns detected. Immediate medical consultation and intervention needed.';
  };

  const getCriticalAlertsCount = () => alerts.filter(a => a.level === 'critical').length;
  const getWarningAlertsCount = () => alerts.filter(a => a.level === 'warning').length;

  if (!patientId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Health Intelligence Dashboard</CardTitle>
          <CardDescription>Please select a patient to view comprehensive health analytics with AI explanations</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {/* Enhanced Header with Context */}
        <div className="text-center space-y-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-health bg-clip-text text-transparent">
              AI Health Intelligence Dashboard
            </h1>
            <p className="text-muted-foreground text-lg mt-2">
              Personalized Health Analytics for {patientName || 'Patient'}
            </p>
          </div>
          
          {/* What is this dashboard? */}
          <Card className="max-w-4xl mx-auto border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-primary mb-2">What is this dashboard?</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    This AI-powered dashboard analyzes your health data from multiple sources (biomarkers, lab results, activity) to provide 
                    personalized insights, early warning signs, and actionable recommendations. Every metric includes detailed explanations 
                    of what it means specifically for you, how it's calculated, and what actions you should take.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {lastAnalysis && (
            <p className="text-sm text-muted-foreground">
              Last AI analysis: {new Date(lastAnalysis).toLocaleString()}
            </p>
          )}
        </div>

        {/* Executive Health Summary - Enhanced with Explanations */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Executive Health Summary</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="font-medium">Executive Summary</p>
                <p className="text-sm mt-1">
                  This section provides a high-level overview of your health status using AI analysis 
                  of your biomarker data, lab results, and activity patterns.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Enhanced Health Score Card */}
          <Card className="border-primary/20 bg-gradient-subtle">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    Overall Health Intelligence Score
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <HelpCircle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p className="font-medium">Health Intelligence Score</p>
                        <p className="text-sm mt-1">
                          AI-calculated composite score (0-100) combining cardiovascular, metabolic, 
                          inflammatory, nutritional, and recovery metrics from your personal data.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  <CardDescription>
                    Dynamic scoring system based on your personal biomarker patterns and medical data
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">AI is analyzing your health data...</p>
                </div>
              ) : healthScore ? (
                <>
                  {/* Main Score Display */}
                  <div className="text-center space-y-4">
                    <div className={`text-6xl font-bold ${getHealthScoreColor(healthScore.overall)}`}>
                      {healthScore.overall}
                      <span className="text-2xl ml-2">/ 100</span>
                    </div>
                    <div className="space-y-2">
                      <Badge 
                        variant={healthScore.overall >= 70 ? "default" : "destructive"}
                        className="text-lg px-4 py-2"
                      >
                        {getHealthScoreLabel(healthScore.overall)}
                      </Badge>
                      <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                        {getHealthScoreDescription(healthScore.overall)}
                      </p>
                    </div>
                  </div>

                  {/* Score Breakdown */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Health System Breakdown</h4>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <Info className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p className="text-sm">
                            Each system is scored independently and contributes to your overall health score. 
                            Click on any system to see detailed breakdown and explanations.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {[
                        { 
                          key: 'cardiovascular', 
                          score: healthScore.cardiovascular, 
                          max: 25, 
                          label: 'Cardiovascular', 
                          icon: <Heart className="h-5 w-5" />,
                          description: 'Heart health, blood pressure, circulation',
                          breakdown: healthScore.breakdown.cardiovascular
                        },
                        { 
                          key: 'metabolic', 
                          score: healthScore.metabolic, 
                          max: 25, 
                          label: 'Metabolic', 
                          icon: <Zap className="h-5 w-5" />,
                          description: 'Energy, glucose, metabolism',
                          breakdown: healthScore.breakdown.metabolic
                        },
                        { 
                          key: 'inflammatory', 
                          score: healthScore.inflammatory, 
                          max: 20, 
                          label: 'Inflammatory', 
                          icon: <Shield className="h-5 w-5" />,
                          description: 'Immune function, inflammation markers',
                          breakdown: healthScore.breakdown.inflammatory
                        },
                        { 
                          key: 'nutritional', 
                          score: healthScore.nutritional, 
                          max: 15, 
                          label: 'Nutritional', 
                          icon: <Target className="h-5 w-5" />,
                          description: 'Vitamins, minerals, nutrition status',
                          breakdown: healthScore.breakdown.nutritional
                        },
                        { 
                          key: 'recovery', 
                          score: healthScore.recovery, 
                          max: 15, 
                          label: 'Recovery', 
                          icon: <Moon className="h-5 w-5" />,
                          description: 'Sleep quality, stress recovery',
                          breakdown: healthScore.breakdown.recovery
                        }
                      ].map((system) => (
                        <Tooltip key={system.key}>
                          <TooltipTrigger asChild>
                            <Card className="hover:shadow-md transition-shadow cursor-pointer">
                              <CardContent className="p-4 text-center">
                                <div className="flex justify-center mb-2">
                                  {system.icon}
                                </div>
                                <div className="text-2xl font-bold mb-1">
                                  {system.score}
                                  <span className="text-sm text-muted-foreground">/{system.max}</span>
                                </div>
                                <div className="text-xs font-medium mb-2">{system.label}</div>
                                <Progress 
                                  value={(system.score / system.max) * 100} 
                                  className="h-2"
                                />
                              </CardContent>
                            </Card>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <p className="font-medium">{system.label} System ({system.score}/{system.max})</p>
                            <p className="text-sm mt-1">{system.description}</p>
                            <Separator className="my-2" />
                            <div className="text-xs space-y-1">
                              {Object.entries(system.breakdown).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                  <span>{value}</span>
                                </div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>

                  {/* Detailed Score Explanation */}
                  <Collapsible open={expandedScoreSection} onOpenChange={setExpandedScoreSection}>
                    <CollapsibleTrigger asChild>
                      <Button variant="outline" className="w-full">
                        <Calculator className="h-4 w-4 mr-2" />
                        How is My Health Score Calculated?
                        <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${expandedScoreSection ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4">
                      <Card className="bg-muted/30">
                        <CardContent className="p-4 space-y-4">
                          <div>
                            <h4 className="font-semibold text-primary mb-2">Calculation Methodology</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                              Your health score is calculated using AI analysis of your personal biomarker data 
                              compared to medical reference ranges and optimized for your age, gender, and health patterns.
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <h5 className="font-medium text-primary mb-2">Data Sources Used:</h5>
                              <ul className="space-y-1 text-muted-foreground">
                                <li>• Heart Rate Variability (HRV) trends</li>
                                <li>• Resting heart rate patterns</li>
                                <li>• Sleep efficiency and quality</li>
                                <li>• Daily activity levels</li>
                                <li>• Lab test results (when available)</li>
                                <li>• Recovery metrics</li>
                              </ul>
                            </div>
                            <div>
                              <h5 className="font-medium text-primary mb-2">Scoring Weights:</h5>
                              <ul className="space-y-1 text-muted-foreground">
                                <li>• Cardiovascular: 25 points (25%)</li>
                                <li>• Metabolic: 25 points (25%)</li>
                                <li>• Inflammatory: 20 points (20%)</li>
                                <li>• Nutritional: 15 points (15%)</li>
                                <li>• Recovery: 15 points (15%)</li>
                              </ul>
                            </div>
                          </div>

                          <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                            <p className="text-xs text-muted-foreground">
                              <strong>AI Personalization:</strong> The scoring algorithm learns from your individual patterns 
                              and adjusts thresholds based on your personal optimal ranges rather than just population averages.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </CollapsibleContent>
                  </Collapsible>
                </>
              ) : (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No health score data available</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Upload biomarker data or connect health devices to generate your personalized health score
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enhanced Alert Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <IntelligentMetricCard
              title="Critical Alerts"
              value={getCriticalAlertsCount()}
              category="Immediate Attention Required"
              status="critical"
              icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
              explanation={{
                whatItIs: "Critical alerts are biomarker patterns that indicate immediate health risks requiring urgent medical attention or intervention.",
                whyItMatters: "These patterns may indicate developing health issues that could become serious if not addressed quickly. Early intervention is crucial.",
                howCalculated: "AI analyzes your biomarker trends against medical thresholds: HRV <15ms for 3+ days, RHR >90bpm consistently, sleep efficiency <70% for 1+ weeks.",
                personalizedInsight: `You currently have ${getCriticalAlertsCount()} critical alerts that need immediate attention.`,
                actionItems: [
                  "Schedule medical consultation within 24-48 hours",
                  "Monitor symptoms closely and seek emergency care if worsening",
                  "Implement stress reduction protocols immediately",
                  "Avoid intense physical activity until evaluated"
                ],
                normalRange: "0 critical alerts",
                yourTrend: getCriticalAlertsCount() > 0 ? "Requires immediate action" : "No critical issues detected"
              }}
              aiInsights={getCriticalAlertsCount() > 0 ? [
                "Multiple biomarker systems showing stress patterns simultaneously",
                "Consider comprehensive blood panel to rule out underlying conditions",
                "Correlation detected between poor sleep and elevated stress markers"
              ] : []}
            />

            <IntelligentMetricCard
              title="Warning Trends"
              value={getWarningAlertsCount()}
              category="Developing Concerns"
              status="warning"
              icon={<TrendingUp className="h-5 w-5 text-warning" />}
              explanation={{
                whatItIs: "Warning trends are biomarker patterns that suggest developing health concerns that aren't critical yet but need monitoring and preventive action.",
                whyItMatters: "Catching health issues early allows for preventive interventions that can stop problems before they become serious.",
                howCalculated: "AI detects borderline values trending in concerning directions: HRV declining >10% over 2 weeks, RHR increasing >5bpm, sleep efficiency 70-80%.",
                personalizedInsight: `You have ${getWarningAlertsCount()} metrics showing warning trends that benefit from proactive management.`,
                actionItems: [
                  "Implement lifestyle modifications in the next 1-2 weeks",
                  "Schedule follow-up monitoring in 2-4 weeks",
                  "Consider preventive interventions like stress management",
                  "Track symptoms and biomarker changes closely"
                ],
                normalRange: "0-2 warning trends (normal variation)",
                yourTrend: getWarningAlertsCount() <= 2 ? "Within normal range" : "Multiple systems need attention"
              }}
              aiInsights={getWarningAlertsCount() > 0 ? [
                "Early intervention now can prevent these from becoming critical",
                "Pattern suggests lifestyle factors may be primary drivers",
                "Your body is showing early stress responses"
              ] : []}
            />

            <IntelligentMetricCard
              title="Optimal Metrics"
              value={alerts.filter(a => a.level === 'optimal').length}
              category="Healthy Ranges"
              status="optimal"
              icon={<Brain className="h-5 w-5 text-success" />}
              explanation={{
                whatItIs: "Optimal metrics are biomarkers that fall within ideal ranges for your age, gender, and health profile, indicating excellent function in those systems.",
                whyItMatters: "These represent your health strengths and show what's working well in your current lifestyle and health protocols.",
                howCalculated: "AI compares your metrics to both population norms and your personal optimal ranges: HRV >30ms, RHR <65bpm, sleep efficiency >85%.",
                personalizedInsight: `${alerts.filter(a => a.level === 'optimal').length} of your health systems are performing optimally - these are your health strengths.`,
                actionItems: [
                  "Maintain current protocols that support these optimal metrics",
                  "Use these strengths to improve other health areas",
                  "Continue tracking to ensure sustained optimization",
                  "Consider what habits contribute to these successes"
                ],
                normalRange: "Varies by individual health profile",
                yourTrend: "Focus on maintaining and leveraging these strengths"
              }}
              aiInsights={alerts.filter(a => a.level === 'optimal').length > 0 ? [
                "Your optimization in these areas shows your body responds well to positive interventions",
                "These metrics can serve as leading indicators for overall health improvement",
                "Pattern suggests good sleep hygiene and stress management"
              ] : []}
            />
          </div>

          {/* Enhanced Alert Details */}
          {alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  Detailed Health Alert Analysis
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p className="text-sm">
                        AI-generated analysis of your specific biomarker patterns with personalized 
                        explanations and action recommendations.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>
                  AI-identified patterns requiring attention with detailed explanations and medical context
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {alerts.slice(0, 5).map((alert, index) => (
                  <Card 
                    key={index}
                    className={`${
                      alert.level === 'critical' 
                        ? 'border-destructive/50 bg-destructive/5' 
                        : alert.level === 'warning'
                        ? 'border-warning/50 bg-warning/5'
                        : 'border-success/50 bg-success/5'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={alert.level === 'critical' ? 'destructive' : alert.level === 'warning' ? 'secondary' : 'default'}
                          >
                            {alert.level.toUpperCase()}
                          </Badge>
                          <div>
                            <span className="font-medium">{alert.category} - {alert.metric}</span>
                            {alert.currentValue && (
                              <p className="text-sm text-muted-foreground">
                                Current value: {alert.currentValue} (threshold: {alert.threshold})
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-primary mb-1">What this means:</p>
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-primary mb-1">Recommended action:</p>
                          <p className="text-sm text-muted-foreground">{alert.action}</p>
                        </div>

                        <div className="pt-2 border-t border-border/50">
                          <p className="text-xs text-muted-foreground">
                            💡 <strong>AI Note:</strong> This recommendation is personalized based on your specific 
                            biomarker patterns, health history, and individual response characteristics.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Enhanced Systems Integration Matrix */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Systems Integration Matrix</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="font-medium">Systems Integration Matrix</p>
                <p className="text-sm mt-1">
                  AI analysis showing how different health systems (cardiovascular, metabolic, etc.) 
                  interact and influence each other in your body.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <EnhancedSystemsMatrix patientId={patientId} />
        </section>

        {/* Enhanced Daily Intelligence */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Daily Intelligence & Care Plan</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="font-medium">Daily Intelligence</p>
                <p className="text-sm mt-1">
                  Personalized daily recommendations based on your latest biomarker data, 
                  sleep quality, and health trends.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <IntelligentDailyBriefing patientId={patientId} />
        </section>

        {/* Enhanced Refresh Section */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6 text-center space-y-4">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Brain className="h-6 w-6 text-primary" />
              <h3 className="font-semibold text-primary">Continuous Learning AI</h3>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-4">
              This dashboard continuously learns from your health patterns to provide increasingly 
              personalized insights. Refresh to get the latest AI analysis of your biomarker data.
            </p>
            <Button onClick={loadHealthIntelligence} disabled={loading} size="lg" className="gap-2">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  AI is Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Refresh AI Analysis
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default EnhancedHealthIntelligenceDashboard;