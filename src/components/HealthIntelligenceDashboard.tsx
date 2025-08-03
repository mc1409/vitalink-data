import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, Heart, Brain, Activity, Moon, Zap, Shield, Target, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SystemsIntegrationMatrix from './SystemsIntegrationMatrix';
import DailyIntelligenceBriefing from './DailyIntelligenceBriefing';

interface HealthIntelligenceDashboardProps {
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
}

const HealthIntelligenceDashboard: React.FC<HealthIntelligenceDashboardProps> = ({ 
  patientId, 
  patientName 
}) => {
  const [alerts, setAlerts] = useState<BiomarkerAlert[]>([]);
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);

  const loadHealthIntelligence = async () => {
    if (!patientId) return;
    
    setLoading(true);
    try {
      // Call critical biomarker analysis function
      const { data: alertsData } = await supabase.functions.invoke('critical-biomarker-analysis', {
        body: { patientId }
      });

      // Call health score calculator function
      const { data: scoreData } = await supabase.functions.invoke('health-score-calculator', {
        body: { patientId }
      });

      if (alertsData?.alerts) {
        setAlerts(alertsData.alerts);
        setLastAnalysis(alertsData.analysisDate);
      }

      if (scoreData?.healthScore) {
        setHealthScore(scoreData.healthScore);
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

  const getCriticalAlertsCount = () => alerts.filter(a => a.level === 'critical').length;
  const getWarningAlertsCount = () => alerts.filter(a => a.level === 'warning').length;

  if (!patientId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Health Intelligence Dashboard</CardTitle>
          <CardDescription>Please select a patient to view comprehensive health analytics</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-health bg-clip-text text-transparent">
          Health Intelligence Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">
          AI-Powered Health Analytics for {patientName || 'Patient'}
        </p>
        {lastAnalysis && (
          <p className="text-sm text-muted-foreground">
            Last analysis: {new Date(lastAnalysis).toLocaleString()}
          </p>
        )}
      </div>

      {/* Executive Health Summary - Top 25% */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Executive Health Summary</h2>
        </div>

        {/* Health Score Card */}
        <Card className="border-primary/20 bg-gradient-subtle">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">
              Overall Health Score
            </CardTitle>
            <CardDescription>Dynamic 0-100 scoring system</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {loading ? (
              <div className="text-muted-foreground">Calculating...</div>
            ) : healthScore ? (
              <>
                <div className={`text-6xl font-bold ${getHealthScoreColor(healthScore.overall)}`}>
                  {healthScore.overall}
                </div>
                <Badge 
                  variant={healthScore.overall >= 70 ? "default" : "destructive"}
                  className="text-lg px-4 py-2"
                >
                  {getHealthScoreLabel(healthScore.overall)}
                </Badge>
                
                {/* Component Scores */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                  <div className="text-center">
                    <Heart className="h-6 w-6 mx-auto mb-2 text-red-500" />
                    <div className="text-2xl font-bold">{healthScore.cardiovascular}</div>
                    <div className="text-sm text-muted-foreground">Cardiovascular</div>
                  </div>
                  <div className="text-center">
                    <Zap className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                    <div className="text-2xl font-bold">{healthScore.metabolic}</div>
                    <div className="text-sm text-muted-foreground">Metabolic</div>
                  </div>
                  <div className="text-center">
                    <Shield className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                    <div className="text-2xl font-bold">{healthScore.inflammatory}</div>
                    <div className="text-sm text-muted-foreground">Inflammatory</div>
                  </div>
                  <div className="text-center">
                    <Target className="h-6 w-6 mx-auto mb-2 text-green-500" />
                    <div className="text-2xl font-bold">{healthScore.nutritional}</div>
                    <div className="text-sm text-muted-foreground">Nutritional</div>
                  </div>
                  <div className="text-center">
                    <Moon className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                    <div className="text-2xl font-bold">{healthScore.recovery}</div>
                    <div className="text-sm text-muted-foreground">Recovery</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">No health score data available</div>
            )}
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Critical Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">
                {getCriticalAlertsCount()}
              </div>
              <p className="text-sm text-muted-foreground">Require immediate attention</p>
            </CardContent>
          </Card>

          <Card className="border-warning/50 bg-warning/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-warning">
                <TrendingUp className="h-5 w-5" />
                Warning Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">
                {getWarningAlertsCount()}
              </div>
              <p className="text-sm text-muted-foreground">Trending concerns</p>
            </CardContent>
          </Card>

          <Card className="border-success/50 bg-success/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-success">
                <Brain className="h-5 w-5" />
                Optimal Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                {alerts.filter(a => a.level === 'optimal').length}
              </div>
              <p className="text-sm text-muted-foreground">Healthy ranges</p>
            </CardContent>
          </Card>
        </div>

        {/* Alert Details */}
        {alerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Priority Health Alerts</CardTitle>
              <CardDescription>AI-identified patterns requiring attention</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {alerts.slice(0, 5).map((alert, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border ${
                    alert.level === 'critical' 
                      ? 'border-destructive/50 bg-destructive/5' 
                      : alert.level === 'warning'
                      ? 'border-warning/50 bg-warning/5'
                      : 'border-success/50 bg-success/5'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <Badge 
                        variant={alert.level === 'critical' ? 'destructive' : alert.level === 'warning' ? 'secondary' : 'default'}
                      >
                        {alert.level.toUpperCase()}
                      </Badge>
                      <span className="ml-2 font-medium">{alert.category} - {alert.metric}</span>
                    </div>
                    {alert.currentValue && (
                      <span className="text-sm text-muted-foreground">
                        Current: {alert.currentValue}
                      </span>
                    )}
                  </div>
                  <p className="text-sm mb-2">{alert.message}</p>
                  <p className="text-sm text-muted-foreground font-medium">
                    Action: {alert.action}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      {/* Systems Integration Matrix - Middle 50% */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Systems Integration Matrix</h2>
        </div>
        <SystemsIntegrationMatrix patientId={patientId} />
      </section>

      {/* Daily Intelligence & Care Plan - Bottom 25% */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Daily Intelligence & Care Plan</h2>
        </div>
        <DailyIntelligenceBriefing patientId={patientId} />
      </section>

      {/* Refresh Button */}
      <div className="text-center">
        <Button onClick={loadHealthIntelligence} disabled={loading} size="lg">
          {loading ? 'Analyzing...' : 'Refresh Intelligence Analysis'}
        </Button>
      </div>
    </div>
  );
};

export default HealthIntelligenceDashboard;