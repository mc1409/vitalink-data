import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft, RefreshCw, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Lightbulb, Code, Eye,
  Brain, Target, Zap
} from 'lucide-react';
import { HealthAgentConfig } from '@/config/healthAgents';
import { HealthAgentData } from '@/hooks/useHealthAgent';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface HealthAgentDashboardProps {
  agentConfig: HealthAgentConfig;
  data: HealthAgentData | null;
  loading: boolean;
  analyzing: boolean;
  error: string | null;
  debugInfo: { prompt: string; response: string };
  onRefresh: () => void;
  onBack: () => void;
}

const HealthAgentDashboard: React.FC<HealthAgentDashboardProps> = ({
  agentConfig,
  data,
  loading,
  analyzing,
  error,
  debugInfo,
  onRefresh,
  onBack
}) => {
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showResponseDialog, setShowResponseDialog] = useState(false);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'optimal': return '#10B981';
      case 'good': return '#22C55E';
      case 'needs_attention': return '#F59E0B';
      case 'critical': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'info': return <CheckCircle className="h-5 w-5 text-blue-400" />;
      default: return <Lightbulb className="h-5 w-5 text-green-400" />;
    }
  };

  const renderChart = (chartType: string, chartData: any[]) => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="h-32 flex items-center justify-center text-gray-400">
          No data available
        </div>
      );
    }

    switch (chartType) {
      case 'line':
      case 'trend':
      case 'sleep_efficiency':
      case 'hrv_trend':
      case 'steps_trend':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={agentConfig.color} 
                strokeWidth={2}
                dot={{ fill: agentConfig.color, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
      case 'calories_bar':
      case 'activity_distribution':
        return (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Bar dataKey="value" fill={agentConfig.color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      
      default:
        return (
          <div className="h-32 flex items-center justify-center text-gray-400">
            Chart type {chartType} not implemented
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center space-y-4">
          <agentConfig.icon className="h-12 w-12 text-blue-400" />
          <div className="text-white">Loading {agentConfig.name} data...</div>
        </div>
      </div>
    );
  }

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
                onClick={onBack}
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div 
                  className="p-3 rounded-xl shadow-lg"
                  style={{ backgroundColor: `${agentConfig.color}20` }}
                >
                  <agentConfig.icon 
                    className="h-8 w-8" 
                    style={{ color: agentConfig.color }}
                  />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    {agentConfig.name}
                  </h1>
                  <p className="text-blue-200 font-medium">{agentConfig.description}</p>
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
                onClick={onRefresh}
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
                  <h2 className="text-2xl font-bold text-white">{agentConfig.name} Analysis in Progress</h2>
                  <p className="text-blue-200">
                    Processing {agentConfig.timeWindow} days of data from {agentConfig.dataSources.length} sources...
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {agentConfig.dataSources.map(source => (
                      <Badge key={source} variant="outline" className="text-blue-200 border-blue-400/30">
                        {source.replace('biomarker_', '').replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="bg-red-900/20 border-red-500/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-400" />
                <div>
                  <h3 className="text-lg font-semibold text-red-400">Analysis Error</h3>
                  <p className="text-red-200">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Dashboard */}
        {data && (
          <>
            {/* Score Circle */}
            <Card className="bg-black/40 backdrop-blur-sm border-white/20">
              <CardContent className="p-8">
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
                        stroke={getScoreColor(data.score)}
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 80}`}
                        strokeDashoffset={`${2 * Math.PI * 80 * (1 - data.score / 100)}`}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="text-6xl font-bold text-white">
                        {Math.round(data.score)}
                      </div>
                      <div className="text-lg text-blue-200">{agentConfig.name.toUpperCase()} SCORE</div>
                      <Badge 
                        variant="outline" 
                        className="text-white border-white/30 bg-black/20 mt-2"
                        style={{ borderColor: getStatusColor(data.status) }}
                      >
                        {data.status.toUpperCase().replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(data.keyMetrics).map(([key, value]) => (
                <Card key={key} className="bg-black/30 border-white/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-white">
                      {typeof value === 'number' ? Math.round(value * 10) / 10 : value}
                    </div>
                    <div className="text-sm text-blue-200 capitalize">
                      {key.replace('_', ' ')}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tabs for different views */}
            <Tabs defaultValue="insights" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-black/30">
                <TabsTrigger value="insights" className="text-white">Insights</TabsTrigger>
                <TabsTrigger value="charts" className="text-white">Charts</TabsTrigger>
                <TabsTrigger value="recommendations" className="text-white">Actions</TabsTrigger>
                <TabsTrigger value="correlations" className="text-white">Correlations</TabsTrigger>
              </TabsList>

              <TabsContent value="insights" className="space-y-4">
                {data.insights.map((insight, index) => (
                  <Card key={index} className="bg-black/30 border-white/20">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(insight.severity)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-white">{insight.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {insight.category}
                            </Badge>
                          </div>
                          <p className="text-blue-200 text-sm">{insight.description}</p>
                          {insight.recommendation && (
                            <p className="text-green-400 text-sm mt-2">
                              💡 {insight.recommendation}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="charts" className="space-y-4">
                {agentConfig.chartTypes.map(chartType => (
                  <Card key={chartType} className="bg-black/30 border-white/20">
                    <CardHeader>
                      <CardTitle className="text-white capitalize">
                        {chartType.replace('_', ' ')} Chart
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {renderChart(chartType, data.chartData[chartType])}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-4">
                {data.recommendations.map((rec, index) => (
                  <Card key={index} className="bg-black/30 border-white/20">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-3">
                        <Target className="h-5 w-5 text-blue-400 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-white">{rec.action}</h4>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                rec.priority === 'high' ? 'border-red-400 text-red-400' :
                                rec.priority === 'medium' ? 'border-yellow-400 text-yellow-400' :
                                'border-green-400 text-green-400'
                              }`}
                            >
                              {rec.priority} priority
                            </Badge>
                          </div>
                          <p className="text-blue-200 text-sm">{rec.impact}</p>
                          {rec.category && (
                            <Badge variant="outline" className="text-xs mt-2">
                              {rec.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="correlations" className="space-y-4">
                <Card className="bg-black/30 border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Health Correlations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(data.correlations).map(([factor, correlation]) => (
                        <div key={factor} className="flex items-center justify-between">
                          <span className="text-gray-300 capitalize">{factor.replace('_', ' ')}</span>
                          <div className="flex items-center gap-2">
                            {correlation > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-400" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-400" />
                            )}
                            <span 
                              className={`font-semibold ${
                                correlation > 0 ? 'text-green-400' : 'text-red-400'
                              }`}
                            >
                              {correlation > 0 ? '+' : ''}{Math.round(correlation)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Debug Dialogs */}
      <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-black border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">AI Analysis Prompt</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-96">
            <pre className="text-gray-300 text-xs whitespace-pre-wrap">
              {debugInfo.prompt}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-black border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">AI Analysis Response</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-96">
            <pre className="text-gray-300 text-xs whitespace-pre-wrap">
              {debugInfo.response}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HealthAgentDashboard;