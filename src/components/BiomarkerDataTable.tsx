import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Activity, Heart, Moon, Apple, Zap, TrendingUp, TrendingDown, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface BiomarkerData {
  id: string;
  category: 'Heart' | 'Sleep' | 'Activity' | 'Nutrition' | 'Advanced';
  metric_name: string;
  value: string | number;
  unit: string;
  measurement_time: string;
  data_source: string;
  device_type?: string;
  status?: 'optimal' | 'good' | 'attention' | 'concern';
  trend?: number;
}

interface BiomarkerDataTableProps {
  patientId: string;
}

const BiomarkerDataTable: React.FC<BiomarkerDataTableProps> = ({ patientId }) => {
  const [biomarkerData, setBiomarkerData] = useState<BiomarkerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'metric' | 'category'>('date');

  useEffect(() => {
    fetchBiomarkerData();
  }, [patientId]);

  const fetchBiomarkerData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch data from all biomarker tables in parallel
      const [heartData, sleepData, activityData, nutritionData, advancedData] = await Promise.all([
        supabase
          .from('biomarker_heart')
          .select('*')
          .eq('patient_id', patientId)
          .order('measurement_time', { ascending: false })
          .limit(100),
        
        supabase
          .from('biomarker_sleep')
          .select('*')
          .eq('patient_id', patientId)
          .order('measurement_time', { ascending: false })
          .limit(100),
        
        supabase
          .from('biomarker_activity')
          .select('*')
          .eq('patient_id', patientId)
          .order('measurement_time', { ascending: false })
          .limit(100),
        
        supabase
          .from('biomarker_nutrition')
          .select('*')
          .eq('patient_id', patientId)
          .order('measurement_time', { ascending: false })
          .limit(100),
        
        supabase
          .from('biomarker_biological_genetic_microbiome')
          .select('*')
          .eq('patient_id', patientId)
          .order('measurement_time', { ascending: false })
          .limit(100)
      ]);

      // Debug logging to see what data we have
      console.log('🔍 BIOMARKER DATA FETCH RESULTS:', {
        heart: heartData.data?.length || 0,
        sleep: sleepData.data?.length || 0,
        activity: activityData.data?.length || 0,
        nutrition: nutritionData.data?.length || 0,
        advanced: advancedData.data?.length || 0,
        heartSample: heartData.data?.[0],
        errors: {
          heart: heartData.error,
          sleep: sleepData.error,
          activity: activityData.error,
          nutrition: nutritionData.error,
          advanced: advancedData.error
        }
      });

      const combinedData: BiomarkerData[] = [];

      // Process Heart Data - Extract ALL available metrics
      heartData.data?.forEach(item => {
        if (item.resting_heart_rate) {
          combinedData.push({
            id: `heart-rhr-${item.id}`,
            category: 'Heart',
            metric_name: 'Resting Heart Rate',
            value: item.resting_heart_rate,
            unit: 'bpm',
            measurement_time: item.measurement_time,
            data_source: item.data_source,
            device_type: item.device_type,
            status: getHeartRateStatus(item.resting_heart_rate)
          });
        }
        if (item.hrv_rmssd) {
          combinedData.push({
            id: `heart-hrv-${item.id}`,
            category: 'Heart',
            metric_name: 'HRV (RMSSD)',
            value: Math.round(item.hrv_rmssd * 10) / 10,
            unit: 'ms',
            measurement_time: item.measurement_time,
            data_source: item.data_source,
            device_type: item.device_type,
            status: getHrvStatus(item.hrv_rmssd)
          });
        }
        if (item.hrv_sdnn) {
          combinedData.push({
            id: `heart-sdnn-${item.id}`,
            category: 'Heart',
            metric_name: 'HRV (SDNN)',
            value: Math.round(item.hrv_sdnn * 10) / 10,
            unit: 'ms',
            measurement_time: item.measurement_time,
            data_source: item.data_source,
            device_type: item.device_type
          });
        }
        if (item.walking_heart_rate) {
          combinedData.push({
            id: `heart-walking-${item.id}`,
            category: 'Heart',
            metric_name: 'Walking Heart Rate',
            value: item.walking_heart_rate,
            unit: 'bpm',
            measurement_time: item.measurement_time,
            data_source: item.data_source,
            device_type: item.device_type
          });
        }
        if (item.max_heart_rate) {
          combinedData.push({
            id: `heart-max-${item.id}`,
            category: 'Heart',
            metric_name: 'Max Heart Rate',
            value: item.max_heart_rate,
            unit: 'bpm',
            measurement_time: item.measurement_time,
            data_source: item.data_source,
            device_type: item.device_type
          });
        }
        if (item.vo2_max) {
          combinedData.push({
            id: `heart-vo2-${item.id}`,
            category: 'Heart',
            metric_name: 'VO2 Max',
            value: Math.round(item.vo2_max * 10) / 10,
            unit: 'ml/kg/min',
            measurement_time: item.measurement_time,
            data_source: item.data_source,
            device_type: item.device_type
          });
        }
        if (item.systolic_bp && item.diastolic_bp) {
          combinedData.push({
            id: `heart-bp-${item.id}`,
            category: 'Heart',
            metric_name: 'Blood Pressure',
            value: `${item.systolic_bp}/${item.diastolic_bp}`,
            unit: 'mmHg',
            measurement_time: item.measurement_time,
            data_source: item.data_source,
            device_type: item.device_type,
            status: getBpStatus(item.systolic_bp, item.diastolic_bp)
          });
        }
      });

      // Process Sleep Data - Extract ALL available metrics
      sleepData.data?.forEach(item => {
        if (item.total_sleep_time) {
          combinedData.push({
            id: `sleep-total-${item.id}`,
            category: 'Sleep',
            metric_name: 'Total Sleep Time',
            value: Math.round(item.total_sleep_time / 60 * 10) / 10,
            unit: 'hours',
            measurement_time: item.measurement_time,
            data_source: item.data_source,
            device_type: item.device_type,
            status: getSleepTimeStatus(item.total_sleep_time / 60)
          });
        }
        if (item.sleep_efficiency) {
          combinedData.push({
            id: `sleep-efficiency-${item.id}`,
            category: 'Sleep',
            metric_name: 'Sleep Efficiency',
            value: Math.round(item.sleep_efficiency * 10) / 10,
            unit: '%',
            measurement_time: item.measurement_time,
            data_source: item.data_source,
            device_type: item.device_type,
            status: getSleepEfficiencyStatus(item.sleep_efficiency)
          });
        }
        if (item.deep_sleep_minutes) {
          combinedData.push({
            id: `sleep-deep-${item.id}`,
            category: 'Sleep',
            metric_name: 'Deep Sleep',
            value: Math.round(item.deep_sleep_minutes),
            unit: 'min',
            measurement_time: item.measurement_time,
            data_source: item.data_source,
            device_type: item.device_type
          });
        }
        if (item.rem_sleep_minutes) {
          combinedData.push({
            id: `sleep-rem-${item.id}`,
            category: 'Sleep',
            metric_name: 'REM Sleep',
            value: Math.round(item.rem_sleep_minutes),
            unit: 'min',
            measurement_time: item.measurement_time,
            data_source: item.data_source,
            device_type: item.device_type
          });
        }
        if (item.light_sleep_minutes) {
          combinedData.push({
            id: `sleep-light-${item.id}`,
            category: 'Sleep',
            metric_name: 'Light Sleep',
            value: Math.round(item.light_sleep_minutes),
            unit: 'min',
            measurement_time: item.measurement_time,
            data_source: item.data_source,
            device_type: item.device_type
          });
        }
        if (item.sleep_score) {
          combinedData.push({
            id: `sleep-score-${item.id}`,
            category: 'Sleep',
            metric_name: 'Sleep Score',
            value: item.sleep_score,
            unit: '/100',
            measurement_time: item.measurement_time,
            data_source: item.data_source,
            device_type: item.device_type
          });
        }
        if (item.avg_heart_rate) {
          combinedData.push({
            id: `sleep-hr-${item.id}`,
            category: 'Sleep',
            metric_name: 'Avg Sleep HR',
            value: item.avg_heart_rate,
            unit: 'bpm',
            measurement_time: item.measurement_time,
            data_source: item.data_source,
            device_type: item.device_type
          });
        }
        if (item.avg_respiratory_rate) {
          combinedData.push({
            id: `sleep-resp-${item.id}`,
            category: 'Sleep',
            metric_name: 'Respiratory Rate',
            value: Math.round(item.avg_respiratory_rate * 10) / 10,
            unit: '/min',
            measurement_time: item.measurement_time,
            data_source: item.data_source,
            device_type: item.device_type
          });
        }
      });

      // Process Activity Data - Extract ALL available metrics
      activityData.data?.forEach(item => {
        if (item.steps_count) {
          combinedData.push({
            id: `activity-steps-${item.id}`,
            category: 'Activity',
            metric_name: 'Steps',
            value: item.steps_count.toLocaleString(),
            unit: 'steps',
            measurement_time: item.measurement_time,
            data_source: item.data_source,
            device_type: item.device_type,
            status: getStepsStatus(item.steps_count)
          });
        }
        if (item.total_calories) {
          combinedData.push({
            id: `activity-calories-${item.id}`,
            category: 'Activity',
            metric_name: 'Total Calories',
            value: item.total_calories,
            unit: 'kcal',
            measurement_time: item.measurement_time,
            data_source: item.data_source,
            device_type: item.device_type
          });
        }
        if (item.active_calories) {
          combinedData.push({
            id: `activity-active-calories-${item.id}`,
            category: 'Activity',
            metric_name: 'Active Calories',
            value: item.active_calories,
            unit: 'kcal',
            measurement_time: item.measurement_time,
            data_source: item.data_source,
            device_type: item.device_type
          });
        }
        if (item.exercise_minutes) {
          combinedData.push({
            id: `activity-exercise-${item.id}`,
            category: 'Activity',
            metric_name: 'Exercise Minutes',
            value: item.exercise_minutes,
            unit: 'min',
            measurement_time: item.measurement_time,
            data_source: item.data_source,
            device_type: item.device_type
          });
        }
        if (item.distance_walked_meters) {
          combinedData.push({
            id: `activity-walk-distance-${item.id}`,
            category: 'Activity',
            metric_name: 'Walking Distance',
            value: Math.round(item.distance_walked_meters / 1000 * 100) / 100,
            unit: 'km',
            measurement_time: item.measurement_time,
            data_source: item.data_source,
            device_type: item.device_type
          });
        }
        if (item.flights_climbed) {
          combinedData.push({
            id: `activity-flights-${item.id}`,
            category: 'Activity',
            metric_name: 'Flights Climbed',
            value: item.flights_climbed,
            unit: 'flights',
            measurement_time: item.measurement_time,
            data_source: item.data_source,
            device_type: item.device_type
          });
        }
      });

      // Process Nutrition Data
      nutritionData.data?.forEach(item => {
        if (item.total_calories) {
          combinedData.push({
            id: `nutrition-calories-${item.id}`,
            category: 'Nutrition',
            metric_name: 'Calories Consumed',
            value: item.total_calories,
            unit: 'kcal',
            measurement_time: item.measurement_time,
            data_source: item.data_source
          });
        }
        if (item.protein_grams) {
          combinedData.push({
            id: `nutrition-protein-${item.id}`,
            category: 'Nutrition',
            metric_name: 'Protein',
            value: Math.round(item.protein_grams * 10) / 10,
            unit: 'g',
            measurement_time: item.measurement_time,
            data_source: item.data_source
          });
        }
        if (item.water_intake_ml) {
          combinedData.push({
            id: `nutrition-water-${item.id}`,
            category: 'Nutrition',
            metric_name: 'Water Intake',
            value: Math.round(item.water_intake_ml / 1000 * 10) / 10,
            unit: 'L',
            measurement_time: item.measurement_time,
            data_source: item.data_source
          });
        }
      });

      // Process Advanced Biomarker Data
      advancedData.data?.forEach(item => {
        if (item.strain_score) {
          combinedData.push({
            id: `advanced-strain-${item.id}`,
            category: 'Advanced',
            metric_name: 'Strain Score',
            value: Math.round(item.strain_score * 10) / 10,
            unit: '/20',
            measurement_time: item.measurement_time,
            data_source: item.data_source
          });
        }
        if (item.recovery_score) {
          combinedData.push({
            id: `advanced-recovery-${item.id}`,
            category: 'Advanced',
            metric_name: 'Recovery Score',
            value: item.recovery_score,
            unit: '%',
            measurement_time: item.measurement_time,
            data_source: item.data_source,
            status: getRecoveryStatus(item.recovery_score)
          });
        }
        if (item.microbial_diversity_shannon) {
          combinedData.push({
            id: `advanced-diversity-${item.id}`,
            category: 'Advanced',
            metric_name: 'Microbial Diversity',
            value: Math.round(item.microbial_diversity_shannon * 100) / 100,
            unit: 'Shannon Index',
            measurement_time: item.measurement_time,
            data_source: item.data_source
          });
        }
      });

      setBiomarkerData(combinedData);
      console.log('📊 COMBINED BIOMARKER DATA:', {
        totalEntries: combinedData.length,
        byCategory: {
          Heart: combinedData.filter(d => d.category === 'Heart').length,
          Sleep: combinedData.filter(d => d.category === 'Sleep').length,
          Activity: combinedData.filter(d => d.category === 'Activity').length,
          Nutrition: combinedData.filter(d => d.category === 'Nutrition').length,
          Advanced: combinedData.filter(d => d.category === 'Advanced').length,
        },
        sampleData: combinedData.slice(0, 3)
      });
    } catch (err: any) {
      console.error('Error fetching biomarker data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Status calculation functions
  const getHeartRateStatus = (hr: number): 'optimal' | 'good' | 'attention' | 'concern' => {
    if (hr >= 60 && hr <= 80) return 'optimal';
    if (hr >= 50 && hr <= 90) return 'good';
    if (hr >= 40 && hr <= 100) return 'attention';
    return 'concern';
  };

  const getHrvStatus = (hrv: number): 'optimal' | 'good' | 'attention' | 'concern' => {
    if (hrv >= 40) return 'optimal';
    if (hrv >= 25) return 'good';
    if (hrv >= 15) return 'attention';
    return 'concern';
  };

  const getBpStatus = (systolic: number, diastolic: number): 'optimal' | 'good' | 'attention' | 'concern' => {
    if (systolic < 120 && diastolic < 80) return 'optimal';
    if (systolic < 130 && diastolic < 85) return 'good';
    if (systolic < 140 && diastolic < 90) return 'attention';
    return 'concern';
  };

  const getSleepTimeStatus = (hours: number): 'optimal' | 'good' | 'attention' | 'concern' => {
    if (hours >= 7 && hours <= 9) return 'optimal';
    if (hours >= 6 && hours <= 10) return 'good';
    if (hours >= 5 && hours <= 11) return 'attention';
    return 'concern';
  };

  const getSleepEfficiencyStatus = (efficiency: number): 'optimal' | 'good' | 'attention' | 'concern' => {
    if (efficiency >= 85) return 'optimal';
    if (efficiency >= 75) return 'good';
    if (efficiency >= 65) return 'attention';
    return 'concern';
  };

  const getStepsStatus = (steps: number): 'optimal' | 'good' | 'attention' | 'concern' => {
    if (steps >= 10000) return 'optimal';
    if (steps >= 7500) return 'good';
    if (steps >= 5000) return 'attention';
    return 'concern';
  };

  const getRecoveryStatus = (recovery: number): 'optimal' | 'good' | 'attention' | 'concern' => {
    if (recovery >= 75) return 'optimal';
    if (recovery >= 60) return 'good';
    if (recovery >= 40) return 'attention';
    return 'concern';
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'optimal':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Optimal</Badge>;
      case 'good':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Good</Badge>;
      case 'attention':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Attention</Badge>;
      case 'concern':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Concern</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Heart': return <Heart className="h-4 w-4 text-red-500" />;
      case 'Sleep': return <Moon className="h-4 w-4 text-blue-500" />;
      case 'Activity': return <Activity className="h-4 w-4 text-green-500" />;
      case 'Nutrition': return <Apple className="h-4 w-4 text-orange-500" />;
      case 'Advanced': return <Zap className="h-4 w-4 text-purple-500" />;
      default: return null;
    }
  };

  const filteredAndSortedData = biomarkerData
    .filter(item => categoryFilter === 'all' || item.category === categoryFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'metric':
          return a.metric_name.localeCompare(b.metric_name);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'date':
        default:
          return new Date(b.measurement_time).getTime() - new Date(a.measurement_time).getTime();
      }
    });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Biomarker Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Biomarker Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600">
            <p>Error loading biomarker data: {error}</p>
            <Button onClick={fetchBiomarkerData} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Biomarker Data ({biomarkerData.length})
        </CardTitle>
        <CardDescription>
          Comprehensive physiological and health metrics from wearable devices and sensors
        </CardDescription>
        
        {/* Filters */}
        <div className="flex gap-4 mt-4">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Heart">❤️ Heart</SelectItem>
              <SelectItem value="Sleep">🌙 Sleep</SelectItem>
              <SelectItem value="Activity">🏃 Activity</SelectItem>
              <SelectItem value="Nutrition">🍎 Nutrition</SelectItem>
              <SelectItem value="Advanced">⚡ Advanced</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value: 'date' | 'metric' | 'category') => setSortBy(value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Sort by Date</SelectItem>
              <SelectItem value="metric">Sort by Metric</SelectItem>
              <SelectItem value="category">Sort by Category</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredAndSortedData.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {categoryFilter === 'all' 
                ? 'No biomarker data found for this patient.' 
                : `No biomarker data found in the ${categoryFilter} category.`
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(item.category)}
                        <Badge variant="outline">{item.category}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.metric_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {item.value} {item.unit}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {format(new Date(item.measurement_time), 'MMM dd, yyyy')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.measurement_time), 'hh:mm a')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <Badge variant="secondary" className="text-xs mb-1">
                          {item.data_source}
                        </Badge>
                        {item.device_type && (
                          <span className="text-xs text-muted-foreground">
                            {item.device_type}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BiomarkerDataTable;