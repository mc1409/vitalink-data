import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, ChevronDown, Brain, Calculator, TrendingUp, Info, Lightbulb, Target } from 'lucide-react';

interface IntelligentMetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  category: string;
  status: 'optimal' | 'warning' | 'critical';
  icon: React.ReactNode;
  explanation: {
    whatItIs: string;
    whyItMatters: string;
    howCalculated: string;
    personalizedInsight: string;
    actionItems: string[];
    normalRange: string;
    yourTrend: string;
  };
  aiInsights?: string[];
}

const IntelligentMetricCard: React.FC<IntelligentMetricCardProps> = ({
  title,
  value,
  unit,
  category,
  status,
  icon,
  explanation,
  aiInsights = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'basics' | 'calculation' | 'insights' | 'actions'>('basics');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'text-success border-success/20 bg-success/5';
      case 'warning': return 'text-warning border-warning/20 bg-warning/5';
      case 'critical': return 'text-destructive border-destructive/20 bg-destructive/5';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'optimal': return <Badge className="bg-success text-success-foreground">Optimal</Badge>;
      case 'warning': return <Badge variant="secondary" className="bg-warning text-warning-foreground">Monitor</Badge>;
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <TooltipProvider>
      <Card className={`transition-all duration-200 hover:shadow-md ${getStatusColor(status)}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                {icon}
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {title}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p className="font-medium">Quick Explanation</p>
                      <p className="text-sm mt-1">{explanation.whatItIs}</p>
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>{category}</CardDescription>
              </div>
            </div>
            {getStatusBadge(status)}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Main Value Display */}
          <div className="text-center py-4">
            <div className={`text-4xl font-bold ${getStatusColor(status)}`}>
              {value}
              {unit && <span className="text-xl ml-1">{unit}</span>}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Normal Range: {explanation.normalRange}
            </p>
          </div>

          {/* Quick Insight */}
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
            <div className="flex items-start gap-2">
              <Brain className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-primary">AI Insight</p>
                <p className="text-sm text-muted-foreground">{explanation.personalizedInsight}</p>
              </div>
            </div>
          </div>

          {/* Expandable Detailed Explanation */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full" size="sm">
                <span>Learn More About This Metric</span>
                <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-4 space-y-4">
              {/* Tab Navigation */}
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                {[
                  { key: 'basics', label: 'Basics', icon: <Info className="h-4 w-4" /> },
                  { key: 'calculation', label: 'How It\'s Calculated', icon: <Calculator className="h-4 w-4" /> },
                  { key: 'insights', label: 'AI Insights', icon: <Brain className="h-4 w-4" /> },
                  { key: 'actions', label: 'What To Do', icon: <Target className="h-4 w-4" /> }
                ].map((tab) => (
                  <Button
                    key={tab.key}
                    variant={activeTab === tab.key ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab(tab.key as any)}
                    className="flex-1"
                  >
                    {tab.icon}
                    <span className="ml-2 hidden sm:inline">{tab.label}</span>
                  </Button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="min-h-[200px] p-4 bg-card rounded-lg border">
                {activeTab === 'basics' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        What is {title}?
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {explanation.whatItIs}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Why Does This Matter?
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {explanation.whyItMatters}
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Your Trend
                      </h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {explanation.yourTrend}
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'calculation' && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      How We Calculate This Score
                    </h4>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground leading-relaxed font-mono">
                        {explanation.howCalculated}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p>💡 <strong>Transparency Note:</strong> All calculations use your personal data from the last 30 days combined with established medical reference ranges. Our AI adjusts these calculations based on your individual patterns and demographics.</p>
                    </div>
                  </div>
                )}

                {activeTab === 'insights' && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      AI-Generated Insights for You
                    </h4>
                    {aiInsights.length > 0 ? (
                      <div className="space-y-3">
                        {aiInsights.map((insight, index) => (
                          <div key={index} className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                            <p className="text-sm text-muted-foreground">{insight}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-sm text-muted-foreground">
                          AI insights are generated based on your data patterns. More insights will appear as we gather more of your health data.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'actions' && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Personalized Action Items
                    </h4>
                    <div className="space-y-3">
                      {explanation.actionItems.map((action, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-accent/5 rounded-lg border border-accent/10">
                          <div className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                            {index + 1}
                          </div>
                          <p className="text-sm text-muted-foreground">{action}</p>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground mt-4">
                      <p>🎯 <strong>Personalization:</strong> These recommendations are tailored specifically to your current health status, trends, and individual response patterns.</p>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default IntelligentMetricCard;