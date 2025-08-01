import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { Calendar, TrendingUp, TrendingDown, AlertTriangle, User, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
}

interface LabTest {
  id: string;
  test_name: string;
  test_category: string;
  collection_date: string;
  result_date: string;
  patient_id: string;
}

interface LabResult {
  id: string;
  result_name: string;
  numeric_value: number | null;
  text_value: string | null;
  units: string | null;
  reference_range_min: number | null;
  reference_range_max: number | null;
  abnormal_flag: string | null;
  lab_test_id: string;
  test_date?: string;
  result_date?: string;
  test_name?: string;
}

interface TimelineDataPoint {
  date: string;
  value: number;
  test_name: string;
  units: string;
  reference_min?: number;
  reference_max?: number;
  abnormal_flag?: string;
}

const LabResultsTimeline = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineDataPoint[]>([]);
  const [selectedParameter, setSelectedParameter] = useState<string>('');
  const [availableParameters, setAvailableParameters] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch patients
  useEffect(() => {
    const fetchPatients = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('patients')
          .select('id, first_name, last_name, date_of_birth')
          .order('last_name');
        
        if (!error && data) {
          setPatients(data);
        }
      } catch (error) {
        console.error('Failed to fetch patients:', error);
      }
    };

    fetchPatients();
  }, [user]);

  // Fetch lab results for selected patient
  useEffect(() => {
    const fetchLabResults = async () => {
      if (!selectedPatient) {
        setLabResults([]);
        setAvailableParameters([]);
        setTimelineData([]);
        return;
      }

      setLoading(true);
      try {
        // First get lab tests for the patient
        const { data: labTests, error: testsError } = await supabase
          .from('lab_tests')
          .select('id, test_name, test_category, collection_date, result_date')
          .eq('patient_id', selectedPatient)
          .order('collection_date', { ascending: false });

        if (testsError) throw testsError;

        let results = [];

        // Try to get lab results linked to lab tests first
        if (labTests && labTests.length > 0) {
          const testIds = labTests.map(test => test.id);
          const { data: linkedResults, error: linkedError } = await supabase
            .from('lab_results')
            .select('*')
            .in('lab_test_id', testIds)
            .not('numeric_value', 'is', null);

          if (!linkedError && linkedResults) {
            results = linkedResults;
          }
        }

        // If no linked results found, get all lab results with numeric values
        // This handles the case where lab_test_id is null but results exist
        if (results.length === 0) {
          const { data: allResults, error: allError } = await supabase
            .from('lab_results')
            .select('*')
            .not('numeric_value', 'is', null)
            .order('created_at', { ascending: false });

          if (!allError && allResults) {
            results = allResults;
          }
        }

        // Combine results with test data
        const enrichedResults = results?.map(result => {
          const test = labTests?.find(t => t.id === result.lab_test_id);
          return {
            ...result,
            test_date: result.test_date || test?.collection_date || test?.result_date || result.created_at?.split('T')[0],
            test_name: test?.test_name || 'Lab Test'
          };
        }) || [];

        setLabResults(enrichedResults);

        // Get unique parameters
        const parameters = [...new Set(enrichedResults.map(r => r.result_name))].sort();
        setAvailableParameters(parameters);

        if (parameters.length > 0 && !selectedParameter) {
          setSelectedParameter(parameters[0]);
        }

      } catch (error) {
        toast.error('Failed to fetch lab results');
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLabResults();
  }, [selectedPatient]);

  // Update timeline data when parameter changes
  useEffect(() => {
    if (!selectedParameter || !labResults.length) {
      setTimelineData([]);
      return;
    }

    const parameterResults = labResults
      .filter(r => r.result_name === selectedParameter && r.numeric_value !== null && r.test_date)
      .map(r => ({
        date: new Date(r.test_date!).toLocaleDateString(),
        value: r.numeric_value!,
        test_name: r.test_name || '',
        units: r.units || '',
        reference_min: r.reference_range_min || undefined,
        reference_max: r.reference_range_max || undefined,
        abnormal_flag: r.abnormal_flag || undefined
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setTimelineData(parameterResults);
  }, [selectedParameter, labResults]);

  const getParameterTrend = () => {
    if (timelineData.length < 2) return null;
    
    const firstValue = timelineData[0].value;
    const lastValue = timelineData[timelineData.length - 1].value;
    const change = ((lastValue - firstValue) / firstValue) * 100;
    
    return {
      direction: change > 0 ? 'up' : 'down',
      percentage: Math.abs(change).toFixed(1)
    };
  };

  const getAbnormalCount = () => {
    return timelineData.filter(d => d.abnormal_flag && d.abnormal_flag !== 'N').length;
  };

  const trend = getParameterTrend();
  const abnormalCount = getAbnormalCount();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="font-semibold">{label}</p>
          <p className="text-sm text-muted-foreground">{data.test_name}</p>
          <p className="text-primary font-medium">
            {data.value} {data.units}
          </p>
          {data.reference_min && data.reference_max && (
            <p className="text-xs text-muted-foreground">
              Reference: {data.reference_min}-{data.reference_max} {data.units}
            </p>
          )}
          {data.abnormal_flag && data.abnormal_flag !== 'N' && (
            <Badge variant="destructive" className="mt-1">
              {data.abnormal_flag}
            </Badge>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-primary p-2 rounded-lg shadow-medical">
          <TestTube className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Lab Results Timeline</h2>
          <p className="text-muted-foreground">Track lab values over time and identify trends</p>
        </div>
      </div>

      {/* Patient Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Patient Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedPatient} onValueChange={setSelectedPatient}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a patient to view lab results" />
            </SelectTrigger>
            <SelectContent>
              {patients.map((patient) => (
                <SelectItem key={patient.id} value={patient.id}>
                  {patient.last_name}, {patient.first_name} (DOB: {new Date(patient.date_of_birth).toLocaleDateString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedPatient && (
        <>
          {/* Parameter Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Lab Parameter Selection</CardTitle>
              <CardDescription>
                Choose a lab parameter to view its timeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select value={selectedParameter} onValueChange={setSelectedParameter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select lab parameter" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableParameters.map((param) => (
                      <SelectItem key={param} value={param}>
                        {param}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedParameter && timelineData.length > 0 && (
                  <div className="flex items-center gap-4">
                    {trend && (
                      <div className="flex items-center gap-2">
                        {trend.direction === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-destructive" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-green-500" />
                        )}
                        <span className="text-sm">
                          {trend.percentage}% change
                        </span>
                      </div>
                    )}
                    
                    {abnormalCount > 0 && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <span className="text-sm text-destructive">
                          {abnormalCount} abnormal values
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Timeline Visualization */}
          {selectedParameter && timelineData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {selectedParameter} Timeline
                </CardTitle>
                <CardDescription>
                  {timelineData.length} data points from {timelineData[0]?.date} to {timelineData[timelineData.length - 1]?.date}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="date" 
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        fontSize={12}
                        label={{ value: timelineData[0]?.units || '', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                      />
                      
                      {/* Reference range lines */}
                      {timelineData[0]?.reference_min && (
                        <Line 
                          type="monotone" 
                          dataKey="reference_min" 
                          stroke="hsl(var(--muted-foreground))" 
                          strokeDasharray="5 5"
                          dot={false}
                          strokeWidth={1}
                        />
                      )}
                      {timelineData[0]?.reference_max && (
                        <Line 
                          type="monotone" 
                          dataKey="reference_max" 
                          stroke="hsl(var(--muted-foreground))" 
                          strokeDasharray="5 5"
                          dot={false}
                          strokeWidth={1}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Summary */}
          {selectedParameter && timelineData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Data Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{timelineData.length}</div>
                    <div className="text-sm text-muted-foreground">Total Tests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {Math.min(...timelineData.map(d => d.value)).toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Minimum Value</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {Math.max(...timelineData.map(d => d.value)).toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Maximum Value</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {(timelineData.reduce((sum, d) => sum + d.value, 0) / timelineData.length).toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Average Value</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedParameter && timelineData.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <TestTube className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No numeric data available for {selectedParameter}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!selectedPatient && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Select a patient to view their lab results timeline
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LabResultsTimeline;