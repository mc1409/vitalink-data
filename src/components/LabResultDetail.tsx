import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  TrendingUp, 
  Heart, 
  AlertTriangle, 
  Clock, 
  RefreshCw,
  BookOpen,
  Target,
  Lightbulb,
  Calendar,
  Activity,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import LabRangeIndicator from './LabRangeIndicator';
import { format } from 'date-fns';

interface LabResult {
  id: string;
  test_name: string;
  test_category: string;
  result_value: string;
  numeric_value: number | null;
  unit: string | null;
  reference_range_min: number | null;
  reference_range_max: number | null;
  is_out_of_range: boolean | null;
  collection_date: string | null;
  result_date: string | null;
  sample_type: string | null;
  data_source: string;
}

interface LabInterpretation {
  lab_result_id: string;
  test_overview: {
    what_it_measures: string;
    normal_function: string;
    aliases: string[];
  };
  result_interpretation: {
    status: 'normal' | 'abnormal' | 'borderline';
    meaning: string;
    significance: string;
    risk_level: 'low' | 'moderate' | 'high';
  };
  health_implications: {
    immediate_concerns: string;
    long_term_effects: string;
    related_conditions: string[];
  };
  recommendations: {
    lifestyle_changes: string[];
    dietary_suggestions: string[];
    monitoring: string;
    follow_up: string;
  };
  educational_notes: {
    factors_affecting_results: string[];
    when_to_be_concerned: string;
    improvement_timeline: string;
  };
  generated_at: string;
  confidence_score: number;
  version: string;
}

interface LabResultDetailProps {
  labResult: LabResult | null;
  patientId: string;
  isOpen: boolean;
  onClose: () => void;
}

const LabResultDetail: React.FC<LabResultDetailProps> = ({
  labResult,
  patientId,
  isOpen,
  onClose
}) => {
  const [interpretation, setInterpretation] = useState<LabInterpretation | null>(null);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && labResult) {
      fetchInterpretation();
      fetchHistoricalData();
    }
  }, [isOpen, labResult]);

  const fetchInterpretation = async () => {
    if (!labResult) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: funcError } = await supabase.functions.invoke('lab-result-interpreter', {
        body: { labResult, patientId }
      });

      if (funcError) throw funcError;
      
      setInterpretation(data);
    } catch (err: any) {
      console.error('Error fetching lab interpretation:', err);
      setError(err.message || 'Failed to fetch interpretation');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalData = async () => {
    if (!labResult) return;

    try {
      const { data, error: histError } = await supabase
        .from('clinical_diagnostic_lab_tests')
        .select('numeric_value, collection_date, result_date, reference_range_min, reference_range_max')
        .eq('patient_id', patientId)
        .eq('test_name', labResult.test_name)
        .not('numeric_value', 'is', null)
        .order('collection_date', { ascending: true });

      if (histError) throw histError;

      const chartData = data?.map((item, index) => ({
        date: format(new Date(item.collection_date || item.result_date), 'MMM dd, yyyy'),
        value: item.numeric_value,
        min_range: item.reference_range_min,
        max_range: item.reference_range_max,
        index
      })) || [];

      setHistoricalData(chartData);
    } catch (err: any) {
      console.error('Error fetching historical data:', err);
    }
  };

  if (!labResult) return null;

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-destructive';
      case 'moderate': return 'text-warning';
      case 'low': return 'text-success';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'secondary';
      case 'abnormal': return 'destructive';
      case 'borderline': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {labResult.test_name} - Detailed Analysis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lab Result Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Test Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Result Value</label>
                  <p className="text-2xl font-bold">{labResult.result_value} {labResult.unit}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <Badge variant="outline" className="mt-1">{labResult.test_category}</Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Collection Date</label>
                  <p>{labResult.collection_date ? format(new Date(labResult.collection_date), 'MMM dd, yyyy') : 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Sample Type</label>
                  <p>{labResult.sample_type || 'Not specified'}</p>
                </div>
              </div>

              {/* Range Indicator */}
              {labResult.numeric_value && labResult.reference_range_min && labResult.reference_range_max && (
                <LabRangeIndicator
                  value={labResult.numeric_value}
                  minRange={labResult.reference_range_min}
                  maxRange={labResult.reference_range_max}
                  unit={labResult.unit || ''}
                  testName={labResult.test_name}
                  className="mt-4"
                />
              )}
            </CardContent>
          </Card>

          {/* AI Interpretation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI-Powered Interpretation
                {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
              </CardTitle>
              {interpretation && (
                <CardDescription>
                  Generated on {format(new Date(interpretation.generated_at), 'MMM dd, yyyy HH:mm')} 
                  • Confidence: {interpretation.confidence_score}%
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {error}
                    <Button onClick={fetchInterpretation} className="ml-2" size="sm">
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : interpretation ? (
                <Tabs defaultValue="interpretation" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="interpretation">Interpretation</TabsTrigger>
                    <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                    <TabsTrigger value="education">Education</TabsTrigger>
                    <TabsTrigger value="trends">Trends</TabsTrigger>
                  </TabsList>

                  <TabsContent value="interpretation" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          What This Test Measures
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="mb-2">{interpretation.test_overview.what_it_measures}</p>
                        <p className="text-sm text-muted-foreground">{interpretation.test_overview.normal_function}</p>
                        {interpretation.test_overview.aliases.length > 0 && (
                          <div className="mt-2">
                            <span className="text-sm font-medium">Also known as: </span>
                            <span className="text-sm">{interpretation.test_overview.aliases.join(', ')}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Your Result Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant={getStatusColor(interpretation.result_interpretation.status)}>
                            {interpretation.result_interpretation.status.toUpperCase()}
                          </Badge>
                          <span className={`text-sm font-medium ${getRiskColor(interpretation.result_interpretation.risk_level)}`}>
                            {interpretation.result_interpretation.risk_level.toUpperCase()} RISK
                          </span>
                        </div>
                        <p className="mb-2">{interpretation.result_interpretation.meaning}</p>
                        <p className="text-sm text-muted-foreground">{interpretation.result_interpretation.significance}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Heart className="h-4 w-4" />
                          Health Implications
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-sm">Immediate Concerns</h4>
                            <p className="text-sm">{interpretation.health_implications.immediate_concerns}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">Long-term Effects</h4>
                            <p className="text-sm">{interpretation.health_implications.long_term_effects}</p>
                          </div>
                          {interpretation.health_implications.related_conditions.length > 0 && (
                            <div>
                              <h4 className="font-medium text-sm">Related Conditions</h4>
                              <ul className="text-sm list-disc list-inside">
                                {interpretation.health_implications.related_conditions.map((condition, index) => (
                                  <li key={index}>{condition}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="recommendations" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Activity className="h-4 w-4" />
                            Lifestyle Changes
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {interpretation.recommendations.lifestyle_changes.map((change, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <span className="text-primary">•</span>
                                {change}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Lightbulb className="h-4 w-4" />
                            Dietary Suggestions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {interpretation.recommendations.dietary_suggestions.map((suggestion, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <span className="text-primary">•</span>
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Monitoring & Follow-up
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <h4 className="font-medium text-sm mb-1">Monitoring Schedule</h4>
                          <p className="text-sm">{interpretation.recommendations.monitoring}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm mb-1">Follow-up Care</h4>
                          <p className="text-sm">{interpretation.recommendations.follow_up}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="education" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Factors Affecting Results</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {interpretation.educational_notes.factors_affecting_results.map((factor, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm">
                              <span className="text-primary">•</span>
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          When to Be Concerned
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{interpretation.educational_notes.when_to_be_concerned}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Improvement Timeline
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{interpretation.educational_notes.improvement_timeline}</p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="trends" className="space-y-4">
                    {historicalData.length > 1 ? (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Historical Trend
                          </CardTitle>
                          <CardDescription>
                            Showing {historicalData.length} results over time
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={historicalData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <ReferenceLine 
                                y={labResult.reference_range_min} 
                                stroke="hsl(var(--destructive))" 
                                strokeDasharray="5 5" 
                                label="Min Normal"
                              />
                              <ReferenceLine 
                                y={labResult.reference_range_max} 
                                stroke="hsl(var(--destructive))" 
                                strokeDasharray="5 5" 
                                label="Max Normal"
                              />
                              <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="hsl(var(--primary))" 
                                strokeWidth={2}
                                dot={{ fill: "hsl(var(--primary))" }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardContent className="text-center py-8">
                          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">
                            Insufficient historical data to show trends. More results needed.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              ) : null}
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This interpretation is for educational purposes only and should not replace professional medical advice. 
              Always consult with your healthcare provider for medical decisions and treatment plans.
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LabResultDetail;