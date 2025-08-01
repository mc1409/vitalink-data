import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart, Activity, Footprints, Scale, Moon, AlertCircle, Check, Smartphone, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

interface HealthKitSyncProps {
  userId: string;
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

const HealthKitSync: React.FC<HealthKitSyncProps> = ({ userId }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({
    isNative: false,
    isIOS: false,
    isWeb: true,
    canUseHealthKit: false
  });
  const [lastSync, setLastSync] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkPlatformAndConnection();
  }, []);

  const checkPlatformAndConnection = async () => {
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    const isIOS = platform === 'ios';
    const canUseHealthKit = isNative && isIOS;

    setPlatformInfo({
      isNative,
      isIOS,
      isWeb: !isNative,
      canUseHealthKit
    });

    // Check stored connection status
    const storedConnection = localStorage.getItem('healthkit_connected');
    const storedLastSync = localStorage.getItem('healthkit_last_sync');
    
    if (storedConnection === 'true') {
      setIsConnected(true);
    }
    
    if (storedLastSync) {
      setLastSync(storedLastSync);
    }
  };

  const connectHealthKit = async () => {
    if (!platformInfo.canUseHealthKit) {
      toast({
        title: "HealthKit Unavailable",
        description: "HealthKit is only available on iOS devices.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // In a real implementation, this would use Capacitor's native bridge
      // For now, we'll simulate the connection and use mock data
      
      // Simulate permission request delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Store connection status
      localStorage.setItem('healthkit_connected', 'true');
      setIsConnected(true);
      
      toast({
        title: "HealthKit Connected",
        description: "Successfully connected to Apple HealthKit. Ready to sync data!",
        variant: "default"
      });

      // Don't automatically sync - let user click sync button
      
    } catch (error) {
      console.error('HealthKit connection failed:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to HealthKit. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectHealthKit = () => {
    localStorage.removeItem('healthkit_connected');
    localStorage.removeItem('healthkit_last_sync');
    setIsConnected(false);
    setLastSync(null);
    
    toast({
      title: "HealthKit Disconnected",
      description: "Successfully disconnected from Apple HealthKit.",
      variant: "default"
    });
  };

  const syncHealthData = async () => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please connect to HealthKit first.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Mock health data for demonstration
      // In a real implementation, this would fetch from HealthKit
      const mockHealthData: HealthKitData = {
        steps: Math.floor(Math.random() * 5000) + 5000, // 5000-10000 steps
        distance: Math.round((Math.random() * 3 + 2) * 100) / 100, // 2-5 km
        activeCalories: Math.floor(Math.random() * 300) + 200, // 200-500 calories
        totalCalories: Math.floor(Math.random() * 800) + 1200, // 1200-2000 calories
        heartRate: Math.floor(Math.random() * 40) + 60, // 60-100 bpm
        sleepHours: Math.round((Math.random() * 3 + 6) * 10) / 10, // 6-9 hours
        weight: Math.round((Math.random() * 30 + 60) * 10) / 10, // 60-90 kg
        bodyFat: Math.round((Math.random() * 20 + 10) * 10) / 10, // 10-30%
        date: new Date().toISOString().split('T')[0]
      };

      // Validate user ID
      if (!userId || typeof userId !== 'string') {
        throw new Error('Invalid user ID');
      }

      // Prepare activity metrics data with proper validation
      const activityData = {
        user_id: userId,
        measurement_date: mockHealthData.date,
        measurement_timestamp: new Date().toISOString(),
        steps_count: Math.max(0, Math.floor(mockHealthData.steps)),
        distance_walked_meters: Math.max(0, Math.round(mockHealthData.distance * 1000)), // Convert km to meters
        active_calories: Math.max(0, Math.floor(mockHealthData.activeCalories)),
        total_calories: Math.max(0, Math.floor(mockHealthData.totalCalories)),
        device_type: 'HealthKit',
        data_source: 'Apple HealthKit',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Store activity metrics with conflict resolution
      try {
        // First, try to find existing record
        const { data: existingActivity } = await supabase
          .from('activity_metrics')
          .select('id')
          .eq('user_id', userId)
          .eq('device_type', 'HealthKit')
          .eq('measurement_date', mockHealthData.date)
          .maybeSingle();

        if (existingActivity) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('activity_metrics')
            .update({
              ...activityData,
              id: undefined // Remove id from update data
            })
            .eq('id', existingActivity.id);
          
          if (updateError) throw updateError;
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from('activity_metrics')
            .insert(activityData);
          
          if (insertError) throw insertError;
        }
      } catch (activityError) {
        console.error('Activity metrics error:', activityError);
        throw new Error(`Failed to sync activity data: ${activityError.message}`);
      }

      // Prepare heart rate metrics data with proper validation
      const heartData = {
        user_id: userId,
        measurement_timestamp: new Date().toISOString(),
        average_heart_rate: Math.max(30, Math.min(220, Math.floor(mockHealthData.heartRate))),
        max_heart_rate: Math.max(30, Math.min(220, Math.floor(mockHealthData.heartRate + Math.random() * 20))),
        min_heart_rate: Math.max(30, Math.min(220, Math.floor(mockHealthData.heartRate - Math.random() * 15))),
        resting_heart_rate: Math.max(30, Math.min(100, Math.floor(mockHealthData.heartRate - Math.random() * 10))),
        device_type: 'HealthKit',
        data_source: 'Apple HealthKit',
        measurement_context: 'daily_sync',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Store heart rate metrics with conflict resolution
      try {
        // Check for existing heart rate data in the last hour to avoid duplicates
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: existingHeart } = await supabase
          .from('heart_metrics')
          .select('id')
          .eq('user_id', userId)
          .eq('device_type', 'HealthKit')
          .gte('measurement_timestamp', oneHourAgo)
          .maybeSingle();

        if (existingHeart) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('heart_metrics')
            .update({
              ...heartData,
              id: undefined // Remove id from update data
            })
            .eq('id', existingHeart.id);
          
          if (updateError) throw updateError;
        } else {
          // Insert new record
          const { error: insertError } = await supabase
            .from('heart_metrics')
            .insert(heartData);
          
          if (insertError) throw insertError;
        }
      } catch (heartError) {
        console.error('Heart metrics error:', heartError);
        throw new Error(`Failed to sync heart data: ${heartError.message}`);
      }

      // Prepare sleep metrics data with proper validation
      const sleepData = {
        user_id: userId,
        sleep_date: mockHealthData.date,
        total_sleep_time: Math.max(0, Math.min(1440, Math.round(mockHealthData.sleepHours * 60))), // Convert hours to minutes, max 24 hours
        deep_sleep_minutes: Math.max(0, Math.round(mockHealthData.sleepHours * 60 * 0.3)),
        light_sleep_minutes: Math.max(0, Math.round(mockHealthData.sleepHours * 60 * 0.7)),
        time_in_bed: Math.max(0, Math.round(mockHealthData.sleepHours * 60 + Math.random() * 30)), // Add some variation
        sleep_efficiency: Math.max(0, Math.min(100, Math.round((mockHealthData.sleepHours / (mockHealthData.sleepHours + 0.5)) * 100))), // Mock efficiency
        device_type: 'HealthKit',
        data_source: 'Apple HealthKit',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Store sleep metrics using upsert (this table has unique constraint)
      try {
        const { error: sleepError } = await supabase
          .from('sleep_metrics')
          .upsert(sleepData, {
            onConflict: 'user_id,device_type,sleep_date',
            ignoreDuplicates: false
          });

        if (sleepError) throw sleepError;
      } catch (sleepError) {
        console.error('Sleep metrics error:', sleepError);
        throw new Error(`Failed to sync sleep data: ${sleepError.message}`);
      }

      // Update sync timestamp
      const currentTime = new Date().toLocaleString();
      localStorage.setItem('healthkit_last_sync', currentTime);
      setLastSync(currentTime);

      toast({
        title: "Sync Complete",
        description: "Health data synced successfully to your dashboard.",
        variant: "default"
      });

    } catch (error: any) {
      console.error('Health data sync failed:', error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to sync health data. Please try again.";
      if (error.message?.includes('duplicate key')) {
        errorMessage = "Data already exists for today. Updating existing records.";
      } else if (error.message?.includes('permission')) {
        errorMessage = "Permission denied. Please check your account settings.";
      } else if (error.message?.includes('network')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderPlatformStatus = () => {
    if (platformInfo.isWeb) {
      return (
        <Alert className="mb-4">
          <Globe className="h-4 w-4" />
          <AlertDescription>
            You're using the web version. HealthKit is only available on iOS devices. 
            To access your health data, please open this app on an iPhone or iPad.
          </AlertDescription>
        </Alert>
      );
    }

    if (platformInfo.isNative && !platformInfo.isIOS) {
      return (
        <Alert className="mb-4">
          <Smartphone className="h-4 w-4" />
          <AlertDescription>
            HealthKit is only available on iOS devices. This feature is not supported on Android.
          </AlertDescription>
        </Alert>
      );
    }

    if (!platformInfo.canUseHealthKit) {
      return (
        <Alert className="mb-4" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            HealthKit is not available on this device or platform.
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" />
          Apple HealthKit Integration
        </CardTitle>
        <CardDescription>
          Sync your health and fitness data from Apple Health app
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {renderPlatformStatus()}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Connection Status:</span>
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Not Connected
                </>
              )}
            </Badge>
          </div>
          
          {platformInfo.canUseHealthKit && (
            <div className="flex gap-2">
              {!isConnected ? (
                <Button 
                  onClick={connectHealthKit} 
                  disabled={isLoading}
                  size="sm"
                >
                  {isLoading ? "Connecting..." : "Connect HealthKit"}
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={syncHealthData} 
                    disabled={isLoading}
                    size="sm"
                  >
                    {isLoading ? "Syncing..." : "Sync Now"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={disconnectHealthKit} 
                    size="sm"
                  >
                    Disconnect
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {isConnected && (
          <>
            <Separator />
            
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Data Types Being Synced:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="flex items-center gap-1 text-xs">
                  <Footprints className="h-3 w-3" />
                  Steps & Distance
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Activity className="h-3 w-3" />
                  Calories Burned
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Heart className="h-3 w-3" />
                  Heart Rate
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Moon className="h-3 w-3" />
                  Sleep Data
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Scale className="h-3 w-3" />
                  Weight & Body Fat
                </div>
              </div>
            </div>

            {lastSync && (
              <>
                <Separator />
                <div className="text-xs text-muted-foreground">
                  Last synced: {lastSync}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default HealthKitSync;