import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Heart, 
  Activity, 
  Moon, 
  Apple, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  Zap,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useHealthKit } from '@/hooks/useHealthKit';

interface HealthKitIntegrationProps {
  patientId: string;
}

interface HealthKitData {
  steps: number;
  distance: number;
  activeCalories: number;
  totalCalories: number;
  heartRate: number;
  sleepHours: number;
  weight?: number;
  bodyFat?: number;
  timestamp: string;
}

const HealthKitIntegration: React.FC<HealthKitIntegrationProps> = ({ patientId }) => {
  const { isAvailable, isConnected, isLoading, connect, disconnect, syncData } = useHealthKit();
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    checkIntegrationStatus();
  }, [patientId, isConnected]);

  const checkIntegrationStatus = async () => {
    if (!patientId) return;

    const { data } = await supabase
      .from('device_integrations')
      .select('last_sync_timestamp')
      .eq('patient_id', patientId)
      .eq('device_type', 'healthkit')
      .eq('is_active', true)
      .maybeSingle();

    if (data) {
      setLastSyncTime(data.last_sync_timestamp);
    }
  };

  const handleConnect = async () => {
    try {
      await connect();
      
      // Create device integration record
      const user = await supabase.auth.getUser();
      await supabase
        .from('device_integrations')
        .upsert({
          user_id: user.data.user?.id || '',
          patient_id: patientId,
          device_type: 'healthkit',
          device_name: 'Apple HealthKit',
          authentication_status: 'connected',
          is_active: true,
          data_permissions_granted: {
            steps: true,
            heartRate: true,
            sleep: true,
            calories: true,
            distance: true
          }
        });

      toast.success('Successfully connected to HealthKit!');
    } catch (error) {
      console.error('HealthKit connection failed:', error);
      toast.error('Failed to connect to HealthKit');
    }
  };

  const handleDisconnect = async () => {
    try {
      disconnect();
      
      // Update device integration record
      await supabase
        .from('device_integrations')
        .update({ 
          authentication_status: 'disconnected',
          is_active: false 
        })
        .eq('patient_id', patientId)
        .eq('device_type', 'healthkit');

      setLastSyncTime(null);
      toast.success('HealthKit disconnected');
    } catch (error) {
      toast.error('Failed to disconnect HealthKit');
    }
  };

  const processBiomarkerData = async (healthData: HealthKitData) => {
    const measurementTime = new Date(healthData.timestamp);
    const measurementDate = measurementTime.toISOString().split('T')[0];

    try {
      const results = [];

      // Insert activity data if available
      if (healthData.steps > 0 || healthData.activeCalories > 0) {
        const { error } = await supabase.from('biomarker_activity').upsert({
          patient_id: patientId,
          measurement_time: measurementTime.toISOString(),
          measurement_date: measurementDate,
          data_source: 'Apple HealthKit',
          device_type: 'iPhone',
          steps_count: healthData.steps,
          distance_walked_meters: Math.round(healthData.distance * 1000),
          total_calories: healthData.totalCalories,
          active_calories: healthData.activeCalories
        });
        
        if (error) {
          console.error('Activity upsert error:', error);
          results.push({ type: 'activity', success: false, error });
        } else {
          results.push({ type: 'activity', success: true });
        }
      }

      // Insert heart data if available
      if (healthData.heartRate > 0) {
        const { error } = await supabase.from('biomarker_heart').upsert({
          patient_id: patientId,
          measurement_time: measurementTime.toISOString(),
          data_source: 'Apple HealthKit',
          device_type: 'iPhone',
          average_heart_rate: healthData.heartRate,
          resting_heart_rate: Math.max(30, healthData.heartRate - 15)
        });
        
        if (error) {
          console.error('Heart upsert error:', error);
          results.push({ type: 'heart', success: false, error });
        } else {
          results.push({ type: 'heart', success: true });
        }
      }

      // Insert sleep data if available
      if (healthData.sleepHours > 0) {
        const { error } = await supabase.from('biomarker_sleep').upsert({
          patient_id: patientId,
          measurement_time: measurementTime.toISOString(),
          sleep_date: measurementDate,
          data_source: 'Apple HealthKit',
          device_type: 'iPhone',
          total_sleep_time: Math.round(healthData.sleepHours * 60),
          sleep_efficiency: 85 // Default efficiency
        });
        
        if (error) {
          console.error('Sleep upsert error:', error);
          results.push({ type: 'sleep', success: false, error });
        } else {
          results.push({ type: 'sleep', success: true });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failures = results.filter(r => !r.success);
      
      return { 
        success: failures.length === 0, 
        recordCount: successCount,
        failures: failures
      };
    } catch (error) {
      console.error('Error processing biomarker data:', error);
      return { success: false, error, failures: [] };
    }
  };

  const handleSync = async (fullHistory: boolean = false) => {
    if (!isConnected || !patientId) return;

    setIsSyncing(true);
    
    try {
      const syncStartTime = new Date();
      console.log('🔄 Starting HealthKit sync...');
      
      // Fetch data from HealthKit with retry logic
      let healthData;
      let attempts = 0;
      const maxRetries = 3;
      
      while (attempts < maxRetries) {
        try {
          healthData = await syncData();
          break;
        } catch (error: any) {
          attempts++;
          console.error(`❌ Sync attempt ${attempts} failed:`, error);
          
          if (error.message?.includes('Load failed') && attempts < maxRetries) {
            console.log(`🔄 Retrying in ${attempts * 1000}ms...`);
            await new Promise(resolve => setTimeout(resolve, attempts * 1000));
            continue;
          }
          throw error;
        }
      }
      
      if (!healthData) {
        throw new Error('Failed to fetch HealthKit data after retries');
      }
      
      console.log('✅ HealthKit data fetched successfully');
      
      // Process and store the data
      const result = await processBiomarkerData(healthData);
      
      if (result.success) {
        // Update last sync time
        await supabase
          .from('device_integrations')
          .update({ last_sync_timestamp: syncStartTime.toISOString() })
          .eq('patient_id', patientId)
          .eq('device_type', 'healthkit');

        setLastSyncTime(syncStartTime.toISOString());
        toast.success(`✅ Sync completed! ${result.recordCount} biomarker records updated`);
      } else {
        const errorSummary = result.failures?.map(f => `${f.type}: ${f.error?.message || 'Unknown error'}`).join(', ');
        console.error('❌ Biomarker processing failed:', errorSummary);
        toast.error(`⚠️ Partial sync failure: ${errorSummary}`);
      }
    } catch (error: any) {
      console.error('❌ Sync error:', error);
      
      if (error.message?.includes('Load failed')) {
        toast.error('🔌 Network error: Unable to connect to HealthKit. Please check your connection and try again.');
      } else {
        toast.error(`❌ Sync failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const renderPlatformStatus = () => {
    if (!isAvailable) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            HealthKit sync is only available in the native iOS app. You can still manually enter health data.
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  };

  if (!patientId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>HealthKit Sync</CardTitle>
          <CardDescription>Please select a patient first</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Apple className="h-5 w-5" />
          HealthKit Integration
        </CardTitle>
        <CardDescription>
          Sync real health data from Apple HealthKit to biomarker tables
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderPlatformStatus()}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Connection Status:</span>
            {isConnected ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <XCircle className="h-3 w-3" />
                Disconnected
              </Badge>
            )}
          </div>
          
          {isAvailable && (
            <div className="flex gap-2">
              {!isConnected ? (
                <Button
                  onClick={handleConnect}
                  disabled={isLoading}
                  className="gap-2"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Connect HealthKit
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={isLoading}
                >
                  Disconnect
                </Button>
              )}
            </div>
          )}
        </div>

        {lastSyncTime && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Last synced: {new Date(lastSyncTime).toLocaleString()}
          </div>
        )}

        {isConnected && (
          <>
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Sync Real HealthKit Data</h3>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => handleSync(false)}
                  disabled={isSyncing || isLoading}
                  className="gap-2"
                >
                  {(isSyncing || isLoading) && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Zap className="h-4 w-4" />
                  Sync Latest Data
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                This will fetch real data from your Apple HealthKit and save it to the biomarker tables.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Activity, label: 'Activity', color: 'text-green-600' },
                { icon: Heart, label: 'Heart Rate', color: 'text-red-600' },
                { icon: Moon, label: 'Sleep', color: 'text-blue-600' },
                { icon: Zap, label: 'Energy', color: 'text-yellow-600' }
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="text-center">
                  <Icon className={`h-8 w-8 mx-auto mb-2 ${color}`} />
                  <p className="text-sm font-medium">{label}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default HealthKitIntegration;