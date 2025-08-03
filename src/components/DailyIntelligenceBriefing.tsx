import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Brain, Zap, Target, AlertTriangle, TrendingUp, Calendar, Sun } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DailyIntelligenceBriefingProps {
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

const DailyIntelligenceBriefing: React.FC<DailyIntelligenceBriefingProps> = ({ patientId }) => {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);

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

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!briefing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Intelligence Briefing</CardTitle>
          <CardDescription>No briefing data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Morning Health Intelligence Briefing */}
      <Card className="border-primary/20 bg-gradient-subtle">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-6 w-6 text-warning" />
            Morning Health Intelligence Briefing
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
            <div className="text-center p-4 bg-card rounded-lg">
              <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
              <div className="font-medium text-sm text-muted-foreground">Today's Priority</div>
              <div className="text-lg font-bold">{briefing.priority}</div>
            </div>
            
            <div className="text-center p-4 bg-card rounded-lg">
              <Brain className="h-8 w-8 mx-auto mb-2 text-info" />
              <div className="font-medium text-sm text-muted-foreground">Health Focus</div>
              <div className="text-lg font-bold">{briefing.healthFocus}</div>
            </div>
            
            <div className="text-center p-4 bg-card rounded-lg">
              <Zap className={`h-8 w-8 mx-auto mb-2 ${getEnergyColor(briefing.energyPrediction)}`} />
              <div className="font-medium text-sm text-muted-foreground">Energy Prediction</div>
              <div className={`text-2xl font-bold ${getEnergyColor(briefing.energyPrediction)}`}>
                {briefing.energyPrediction}/10
              </div>
              <div className="text-sm text-muted-foreground">
                {getEnergyLabel(briefing.energyPrediction)}
              </div>
            </div>
          </div>

          {/* Key Insights */}
          {briefing.insights.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-info" />
                Key Health Insights
              </h4>
              <div className="space-y-2">
                {briefing.insights.map((insight, index) => (
                  <div key={index} className="p-3 bg-info/10 border border-info/20 rounded-lg">
                    <p className="text-sm">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Alerts */}
          {briefing.riskAlerts.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Risk Alerts
              </h4>
              <div className="space-y-2">
                {briefing.riskAlerts.map((alert, index) => (
                  <div key={index} className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">{alert}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Priority Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Today's Priority Actions
          </CardTitle>
          <CardDescription>Personalized recommendations based on your current health status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {briefing.recommendations.map((rec, index) => (
            <div 
              key={index} 
              className="p-4 border rounded-lg space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={getPriorityColor(rec.priority)}>
                    {rec.priority.toUpperCase()}
                  </Badge>
                  <span className="font-medium">{rec.category}</span>
                  {rec.timing && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {rec.timing}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div>
                <p className="font-medium text-foreground mb-1">{rec.action}</p>
                <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Integrated Timeline & Progress Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Health Progress Timeline
          </CardTitle>
          <CardDescription>Track your progress and intervention effectiveness</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="font-medium">Weekly Health Score Trend</p>
                <p className="text-sm text-muted-foreground">
                  Monitor overall health trajectory
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">↗️</div>
                <div className="text-xs text-muted-foreground">Improving</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="font-medium">Intervention Effectiveness</p>
                <p className="text-sm text-muted-foreground">
                  Track what's working for you
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-success">85%</div>
                <div className="text-xs text-muted-foreground">Success Rate</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="font-medium">Next Health Milestone</p>
                <p className="text-sm text-muted-foreground">
                  Predicted health improvement timeline
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-info">2 weeks</div>
                <div className="text-xs text-muted-foreground">HRV improvement expected</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export & Sharing Options */}
      <div className="flex gap-4 justify-center">
        <Button variant="outline" size="sm">
          <Calendar className="h-4 w-4 mr-2" />
          Export to Calendar
        </Button>
        <Button variant="outline" size="sm">
          <Target className="h-4 w-4 mr-2" />
          Share with Physician
        </Button>
        <Button variant="outline" size="sm">
          <TrendingUp className="h-4 w-4 mr-2" />
          View Full Report
        </Button>
      </div>
    </div>
  );
};

export default DailyIntelligenceBriefing;