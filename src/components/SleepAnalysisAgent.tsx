import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Brain, TrendingUp, Clock, Target, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePrimaryPatient } from "@/hooks/usePrimaryPatient";

interface SleepInsight {
  id: string;
  analysis_date: string;
  sleep_quality_score: number;
  sleep_pattern_trend: string;
  recommendations: any;
  key_factors: any;
  confidence_level: number;
  processing_time_ms: number;
  agent_version: string;
  analysis_period: string;
  created_at: string;
  updated_at: string;
  data_sources_used: any;
  next_analysis_date: string | null;
  optimal_bedtime: string | null;
  optimal_wake_time: string | null;
  patient_id: string;
  predicted_sleep_duration: number | null;
  sleep_debt_hours: number | null;
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
  };
}

export const SleepAnalysisAgent: React.FC = () => {
  const [insights, setInsights] = useState<SleepInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();
  const { primaryPatient } = usePrimaryPatient();
  const primaryPatientId = primaryPatient?.id;

  useEffect(() => {
    if (primaryPatientId) {
      fetchInsights();
    }
  }, [primaryPatientId]);

  const fetchInsights = async () => {
    if (!primaryPatientId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sleep-analysis-agent', {
        body: null,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (error) throw error;

      // For now, fetch from database directly
      const { data: insightsData, error: dbError } = await supabase
        .from('ai_sleep_insights')
        .select('*')
        .eq('patient_id', primaryPatientId)
        .order('analysis_date', { ascending: false })
        .limit(10);

      if (dbError) throw dbError;

      setInsights(insightsData || []);
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
    try {
      const { data, error } = await supabase.functions.invoke('sleep-analysis-agent', {
        body: {
          patient_id: primaryPatientId,
          analysis_period: analysisPeriod,
          force_refresh: true
        },
        method: 'POST'
      });

      if (error) throw error;

      setLatestAnalysis(data);
      await fetchInsights(); // Refresh insights list

      toast({
        title: "Analysis Complete",
        description: `Sleep analysis completed in ${data.processing_time_ms}ms`,
      });
    } catch (error) {
      console.error('Error running analysis:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to run sleep analysis. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining': return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      case 'stable': return <Target className="h-4 w-4 text-blue-500" />;
      default: return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            CrewAI Sleep Analysis Agent
          </CardTitle>
          <CardDescription>
            AI-powered sleep analysis using multi-agent methodology to analyze your biomarker data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              onClick={() => runAnalysis('daily')}
              disabled={analyzing || !primaryPatientId}
              variant="default"
            >
              {analyzing ? 'Analyzing...' : 'Run Daily Analysis'}
            </Button>
            <Button
              onClick={() => runAnalysis('weekly')}
              disabled={analyzing || !primaryPatientId}
              variant="outline"
            >
              Weekly Analysis
            </Button>
            <Button
              onClick={() => runAnalysis('monthly')}
              disabled={analyzing || !primaryPatientId}
              variant="outline"
            >
              Monthly Analysis
            </Button>
          </div>

          {latestAnalysis && (
            <Card className="mb-4 border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Latest Analysis Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getScoreColor(latestAnalysis.analysis_summary.sleep_quality_score)}`}>
                      {latestAnalysis.analysis_summary.sleep_quality_score}
                    </div>
                    <div className="text-sm text-gray-600">Sleep Score</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {getTrendIcon(latestAnalysis.analysis_summary.pattern_trend)}
                      <span className="text-sm font-medium">{latestAnalysis.analysis_summary.pattern_trend}</span>
                    </div>
                    <div className="text-sm text-gray-600">Trend</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{Math.round(latestAnalysis.analysis_summary.confidence_level * 100)}%</div>
                    <div className="text-sm text-gray-600">Confidence</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">{latestAnalysis.processing_time_ms}ms</div>
                    <div className="text-sm text-gray-600">Processing Time</div>
                  </div>
                </div>
                
                {latestAnalysis.analysis_summary.key_recommendations.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Top Recommendations
                    </h4>
                    <div className="space-y-2">
                      {latestAnalysis.analysis_summary.key_recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <Badge variant="outline" className="text-xs">
                            {rec.priority || 'medium'}
                          </Badge>
                          <span>{rec.title || rec.description || JSON.stringify(rec)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="insights" className="w-full">
        <TabsList>
          <TabsTrigger value="insights">Recent Insights</TabsTrigger>
          <TabsTrigger value="api-docs">API Documentation</TabsTrigger>
        </TabsList>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>Sleep Analysis History</CardTitle>
              <CardDescription>
                {insights.length} insights generated by the AI agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading insights...</div>
              ) : insights.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No insights available. Run an analysis to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {insights.map((insight) => (
                    <Card key={insight.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {formatDate(insight.analysis_date)}
                            </Badge>
                            {getTrendIcon(insight.sleep_pattern_trend)}
                            <span className="text-sm font-medium">{insight.sleep_pattern_trend}</span>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${getScoreColor(insight.sleep_quality_score)}`}>
                              {insight.sleep_quality_score}
                            </div>
                            <div className="text-xs text-gray-500">Sleep Score</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">{insight.processing_time_ms}ms</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">{Math.round(insight.confidence_level * 100)}% confidence</span>
                          </div>
                        </div>

                        {insight.recommendations && insight.recommendations.length > 0 && (
                          <div>
                            <h5 className="font-medium mb-2">Recommendations:</h5>
                            <div className="space-y-1">
                              {insight.recommendations.slice(0, 3).map((rec: any, index: number) => (
                                <div key={index} className="text-sm flex items-start gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {rec.priority || 'medium'}
                                  </Badge>
                                  <span className="text-gray-700">{rec.title || rec.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-docs">
          <Card>
            <CardHeader>
              <CardTitle>CrewAI Sleep Analysis Agent API</CardTitle>
              <CardDescription>
                Comprehensive API documentation for the multi-agent sleep analysis system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Endpoints</h3>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>POST</Badge>
                        <code className="text-sm">/sleep-analysis-agent/analyze</code>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">Execute comprehensive sleep analysis for a patient</p>
                      <div className="text-sm">
                        <strong>Parameters:</strong>
                        <ul className="list-disc list-inside ml-4 mt-1">
                          <li><code>patient_id</code> (string, required): UUID of the patient</li>
                          <li><code>analysis_period</code> (string, optional): daily | weekly | monthly</li>
                          <li><code>force_refresh</code> (boolean, optional): Force new analysis</li>
                        </ul>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">GET</Badge>
                        <code className="text-sm">/sleep-analysis-agent/insights</code>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">Retrieve stored sleep insights for a patient</p>
                      <div className="text-sm">
                        <strong>Parameters:</strong>
                        <ul className="list-disc list-inside ml-4 mt-1">
                          <li><code>patient_id</code> (query, required): UUID of the patient</li>
                          <li><code>limit</code> (query, optional): Number of insights to return (default: 10)</li>
                        </ul>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">GET</Badge>
                        <code className="text-sm">/sleep-analysis-agent/docs</code>
                      </div>
                      <p className="text-sm text-gray-600">Get complete API documentation</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Agent Architecture</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <h4 className="font-medium mb-2">Sleep Data Analyst</h4>
                        <p className="text-sm text-gray-600">Aggregates biomarker data from multiple sources and assesses data quality</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <h4 className="font-medium mb-2">Pattern Recognition Specialist</h4>
                        <p className="text-sm text-gray-600">Identifies trends, correlations, and anomalies in sleep patterns</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <h4 className="font-medium mb-2">Health Advisory Specialist</h4>
                        <p className="text-sm text-gray-600">Generates LLM-powered insights and personalized recommendations</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Data Sources</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Input Tables</h4>
                      <ul className="text-sm space-y-1">
                        <li>• <code>biomarker_sleep</code> - Sleep duration, efficiency, stages</li>
                        <li>• <code>biomarker_heart</code> - HRV, resting heart rate</li>
                        <li>• <code>biomarker_activity</code> - Steps, exercise, calories</li>
                        <li>• <code>clinical_diagnostic_lab_tests</code> - Cortisol, melatonin, etc.</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Output Schema</h4>
                      <ul className="text-sm space-y-1">
                        <li>• <code>sleep_quality_score</code> - 0-100 overall score</li>
                        <li>• <code>sleep_pattern_trend</code> - improving/declining/stable</li>
                        <li>• <code>recommendations</code> - Personalized advice</li>
                        <li>• <code>confidence_level</code> - Analysis confidence (0-1)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};