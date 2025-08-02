import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Heart, Activity, Moon, Brain, TrendingUp, Calendar, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PatientBiomarkerDashboardProps {
  patientId: string;
}

interface BiomarkerData {
  date: string;
  heartRate?: number;
  sleepHours?: number;
  steps?: number;
  calories?: number;
}

interface PatientStats {
  totalBiomarkerRecords: number;
  totalClinicalTests: number;
  lastSyncDate: string | null;
  activeDays: number;
}

const PatientBiomarkerDashboard: React.FC<PatientBiomarkerDashboardProps> = ({ patientId }) => {
  console.log('PatientBiomarkerDashboard - Received patient ID:', patientId);
  const [biomarkerData, setBiomarkerData] = useState<BiomarkerData[]>([]);
  const [patientStats, setPatientStats] = useState<PatientStats>({
    totalBiomarkerRecords: 0,
    totalClinicalTests: 0,
    lastSyncDate: null,
    activeDays: 0
  });
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const loadPatientData = async () => {
    if (!patientId) return;
    
    setLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
      }

      // Fetch heart rate data
      const { data: heartData } = await supabase
        .from('biomarker_heart')
        .select('measurement_time, average_heart_rate')
        .eq('patient_id', patientId)
        .gte('measurement_time', startDate.toISOString())
        .order('measurement_time');

      // Fetch sleep data
      const { data: sleepData } = await supabase
        .from('biomarker_sleep')
        .select('sleep_date, total_sleep_time')
        .eq('patient_id', patientId)
        .gte('sleep_date', startDate.toISOString().split('T')[0])
        .order('sleep_date');

      // Fetch activity data
      const { data: activityData } = await supabase
        .from('biomarker_activity')
        .select('measurement_date, steps_count, total_calories')
        .eq('patient_id', patientId)
        .gte('measurement_date', startDate.toISOString().split('T')[0])
        .order('measurement_date');

      // Get patient statistics
      const [heartCount, sleepCount, activityCount, nutritionCount, clinicalCount] = await Promise.all([
        supabase.from('biomarker_heart').select('id', { count: 'exact', head: true }).eq('patient_id', patientId),
        supabase.from('biomarker_sleep').select('id', { count: 'exact', head: true }).eq('patient_id', patientId),
        supabase.from('biomarker_activity').select('id', { count: 'exact', head: true }).eq('patient_id', patientId),
        supabase.from('biomarker_nutrition').select('id', { count: 'exact', head: true }).eq('patient_id', patientId),
        supabase.from('clinical_diagnostic_lab_tests').select('id', { count: 'exact', head: true }).eq('patient_id', patientId)
      ]);

      // Combine and process data for chart
      const combinedData: { [key: string]: BiomarkerData } = {};
      
      heartData?.forEach(record => {
        const date = record.measurement_time.split('T')[0];
        if (!combinedData[date]) combinedData[date] = { date };
        combinedData[date].heartRate = record.average_heart_rate;
      });

      sleepData?.forEach(record => {
        const date = record.sleep_date;
        if (!combinedData[date]) combinedData[date] = { date };
        combinedData[date].sleepHours = record.total_sleep_time ? Math.round(record.total_sleep_time / 60 * 10) / 10 : undefined;
      });

      activityData?.forEach(record => {
        const date = record.measurement_date;
        if (!combinedData[date]) combinedData[date] = { date };
        combinedData[date].steps = record.steps_count;
        combinedData[date].calories = record.total_calories;
      });

      const chartData = Object.values(combinedData)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-parseInt(timeRange)); // Limit to time range

      setBiomarkerData(chartData);
      setPatientStats({
        totalBiomarkerRecords: (heartCount.count || 0) + (sleepCount.count || 0) + (activityCount.count || 0) + (nutritionCount.count || 0),
        totalClinicalTests: clinicalCount.count || 0,
        lastSyncDate: heartData?.[heartData.length - 1]?.measurement_time || null,
        activeDays: Object.keys(combinedData).length
      });

    } catch (error) {
      console.error('Error loading patient data:', error);
      toast.error('Failed to load patient biomarker data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatientData();
  }, [patientId, timeRange]);

  if (!patientId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Patient Biomarker Dashboard</CardTitle>
          <CardDescription>Please select a patient to view biomarker trends</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with time range selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Patient Biomarker Dashboard</h2>
          <p className="text-muted-foreground">Longitudinal health data visualization</p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </Button>
          ))}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Biomarker Records</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patientStats.totalBiomarkerRecords}</div>
            <p className="text-xs text-muted-foreground">Total measurements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clinical Tests</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patientStats.totalClinicalTests}</div>
            <p className="text-xs text-muted-foreground">Lab results & diagnostics</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Days</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patientStats.activeDays}</div>
            <p className="text-xs text-muted-foreground">Days with data</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patientStats.lastSyncDate ? new Date(patientStats.lastSyncDate).toLocaleDateString() : '--'}
            </div>
            <p className="text-xs text-muted-foreground">Most recent data</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heart Rate Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              Heart Rate Trend
            </CardTitle>
            <CardDescription>Average heart rate over time</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={biomarkerData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={(value) => `Date: ${new Date(value).toLocaleDateString()}`}
                    formatter={(value) => [`${value} bpm`, 'Heart Rate']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="heartRate" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Sleep Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-blue-500" />
              Sleep Duration
            </CardTitle>
            <CardDescription>Hours of sleep per night</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={biomarkerData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={(value) => `Date: ${new Date(value).toLocaleDateString()}`}
                    formatter={(value) => [`${value} hours`, 'Sleep Duration']}
                  />
                  <Bar dataKey="sleepHours" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Activity Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              Daily Steps
            </CardTitle>
            <CardDescription>Step count progression</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={biomarkerData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={(value) => `Date: ${new Date(value).toLocaleDateString()}`}
                    formatter={(value) => [`${value?.toLocaleString()} steps`, 'Steps']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="steps" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Calories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Daily Calories
            </CardTitle>
            <CardDescription>Calorie burn tracking</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="text-muted-foreground">Loading...</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={biomarkerData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={(value) => `Date: ${new Date(value).toLocaleDateString()}`}
                    formatter={(value) => [`${value} calories`, 'Calories Burned']}
                  />
                  <Bar dataKey="calories" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Biomarker Summary</CardTitle>
          <CardDescription>Key insights from patient data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <p>
              📊 <strong>Data Coverage:</strong> {patientStats.activeDays} days of biomarker data across {timeRange}
            </p>
            <p>
              🔬 <strong>Clinical Tests:</strong> {patientStats.totalClinicalTests} laboratory tests and diagnostic results
            </p>
            <p>
              📈 <strong>Tracking:</strong> Heart rate, sleep patterns, physical activity, and nutritional intake
            </p>
            {patientStats.lastSyncDate && (
              <p>
                🔄 <strong>Last Update:</strong> {new Date(patientStats.lastSyncDate).toLocaleString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientBiomarkerDashboard;