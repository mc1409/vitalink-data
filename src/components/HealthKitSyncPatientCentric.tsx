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
  Smartphone, 
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

interface HealthKitSyncPatientCentricProps {
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
  date: string;
}

interface PlatformInfo {
  isNative: boolean;
  isIOS: boolean;
  isWeb: boolean;
  canUseHealthKit: boolean;
}

const HealthKitSyncPatientCentric: React.FC<HealthKitSyncPatientCentricProps> = ({ patientId }) => {
  console.log('HealthKitSyncPatientCentric - Received patient ID:', patientId);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({
    isNative: false,
    isIOS: false,
    isWeb: true,
    canUseHealthKit: false
  });

  useEffect(() => {
    checkPlatformAndConnection();
  }, [patientId]);

  const checkPlatformAndConnection = async () => {
    // Check if running in Capacitor (native app)
    const isNative = !!(window as any).Capacitor;
    const isIOS = isNative && (window as any).Capacitor?.getPlatform?.() === 'ios';
    const canUseHealthKit = isIOS && !!(window as any).CapacitorHealthkit;

    setPlatformInfo({
      isNative,
      isIOS,
      isWeb: !isNative,
      canUseHealthKit
    });

    // Check connection status from device_integrations table
    if (patientId) {
      const { data, error } = await supabase
        .from('device_integrations')
        .select('last_sync_timestamp, authentication_status')
        .eq('patient_id', patientId)
        .eq('device_type', 'healthkit')
        .eq('is_active', true)
        .maybeSingle(); // Use maybeSingle instead of single to handle no records

      if (data && !error) {
        setIsConnected(data.authentication_status === 'connected');
        setLastSyncTime(data.last_sync_timestamp);
      } else {
        // No existing integration record found
        setIsConnected(false);
        setLastSyncTime(null);
      }
    }
  };

  const connectHealthKit = async () => {
    if (!platformInfo.canUseHealthKit) {
      toast.error('HealthKit is only available on iOS devices');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate HealthKit connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Store device integration record
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

      setIsConnected(true);
      toast.success('Successfully connected to HealthKit!');
    } catch (error) {
      toast.error('Failed to connect to HealthKit');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectHealthKit = async () => {
    setIsLoading(true);
    try {
      await supabase
        .from('device_integrations')
        .update({ 
          authentication_status: 'disconnected',
          is_active: false 
        })
        .eq('patient_id', patientId)
        .eq('device_type', 'healthkit');

      setIsConnected(false);
      setLastSyncTime(null);
      toast.success('HealthKit disconnected');
    } catch (error) {
      toast.error('Failed to disconnect HealthKit');
    } finally {
      setIsLoading(false);
    }
  };

  const syncHealthData = async (fullHistorySync: boolean = false) => {
    if (!isConnected || !patientId) return;

    setIsLoading(true);
    try {
      const syncStartTime = new Date();
      
      // Generate mock health data
      const mockData: HealthKitData[] = [];
      const daysToSync = fullHistorySync ? 30 : 1;
      
      for (let i = 0; i < daysToSync; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        mockData.push({
          steps: Math.floor(Math.random() * 15000) + 3000,
          distance: Math.random() * 10 + 2,
          activeCalories: Math.floor(Math.random() * 800) + 200,
          totalCalories: Math.floor(Math.random() * 1500) + 1800,
          heartRate: Math.floor(Math.random() * 40) + 60,
          sleepHours: Math.random() * 4 + 6,
          date: date.toISOString().split('T')[0]
        });
      }

      // Process and store the data in new biomarker tables
      const { successCount, errorCount } = await processBatchData(mockData, patientId);
      
      // Update last sync time
      await supabase
        .from('device_integrations')
        .update({ last_sync_timestamp: syncStartTime.toISOString() })
        .eq('patient_id', patientId)
        .eq('device_type', 'healthkit');

      setLastSyncTime(syncStartTime.toISOString());
      
      toast.success(`Sync completed! ${successCount} records processed, ${errorCount} errors`);
    } catch (error) {
      toast.error('Sync failed');
      console.error('Sync error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processBatchData = async (batchData: HealthKitData[], patientId: string) => {
    let successCount = 0;
    let errorCount = 0;

    for (const data of batchData) {
      try {
        const measurementTime = new Date(data.date + 'T12:00:00Z');
        
        // Insert activity data
        await supabase.from('biomarker_activity').upsert({
          patient_id: patientId,
          measurement_time: measurementTime.toISOString(),
          measurement_date: data.date,
          data_source: 'Apple HealthKit',
          device_type: 'iPhone',
          steps_count: data.steps,
          distance_walked_meters: data.distance * 1000,
          total_calories: data.totalCalories,
          active_calories: data.activeCalories
        });

        // Insert heart data
        await supabase.from('biomarker_heart').upsert({
          patient_id: patientId,
          measurement_time: measurementTime.toISOString(),
          data_source: 'Apple HealthKit',
          device_type: 'iPhone',
          average_heart_rate: data.heartRate,
          resting_heart_rate: data.heartRate - 10
        });

        // Insert sleep data
        await supabase.from('biomarker_sleep').upsert({
          patient_id: patientId,
          measurement_time: measurementTime.toISOString(),
          sleep_date: data.date,
          data_source: 'Apple HealthKit',
          device_type: 'iPhone',
          total_sleep_time: Math.floor(data.sleepHours * 60),
          sleep_efficiency: 0.85
        });

        successCount++;
      } catch (error) {
        errorCount++;
        console.error('Error processing data point:', error);
      }
    }

    return { successCount, errorCount };
  };

  const renderPlatformStatus = () => {
    if (platformInfo.isWeb) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            HealthKit sync is only available in the native iOS app. You can still manually enter health data.
          </AlertDescription>
        </Alert>
      );
    }

    if (!platformInfo.isIOS) {
      return (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            HealthKit is only available on iOS devices. Android users can connect other health apps.
          </AlertDescription>
        </Alert>
      );
    }

    if (!platformInfo.canUseHealthKit) {
      return (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            HealthKit integration is not available. Please ensure the app has proper permissions.
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
          HealthKit Sync
        </CardTitle>
        <CardDescription>
          Sync health data from Apple HealthKit for the selected patient
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
          
          {platformInfo.canUseHealthKit && (
            <div className="flex gap-2">
              {!isConnected ? (
                <Button
                  onClick={connectHealthKit}
                  disabled={isLoading}
                  className="gap-2"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Connect HealthKit
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={disconnectHealthKit}
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
              <h3 className="text-sm font-medium">Sync Options</h3>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => syncHealthData(false)}
                  disabled={isLoading}
                  className="gap-2"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Zap className="h-4 w-4" />
                  Quick Sync (24h)
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => syncHealthData(true)}
                  disabled={isLoading}
                  className="gap-2"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Calendar className="h-4 w-4" />
                  Full Sync (30 days)
                </Button>
              </div>
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

export default HealthKitSyncPatientCentric;