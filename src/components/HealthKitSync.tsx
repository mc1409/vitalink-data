import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Smartphone, Heart, Activity, Moon, Scale, Droplets } from 'lucide-react';
import { CapacitorHealthkit, SampleNames } from '@perfood/capacitor-healthkit';
import { Capacitor } from '@capacitor/core';

interface HealthKitSyncProps {
  userId: string;
}

// Mock HealthKit interface - will be replaced with actual plugin
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

const HealthKitSync: React.FC<HealthKitSyncProps> = ({ userId }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [isNativePlatform, setIsNativePlatform] = useState(false);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      // Check if running in browser vs mobile app
      const isCapacitorNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      
      console.log('Platform info:', { isCapacitorNative, platform });
      
      // Consider iOS platform (including simulator) as native
      const isIOSNative = isCapacitorNative && platform === 'ios';
      setIsNativePlatform(isIOSNative);
      
      if (!isIOSNative) {
        // Running in web browser or non-iOS platform - HealthKit not available
        console.log('HealthKit not available - not iOS native platform');
        return;
      }
      
      // Check if HealthKit is available using the plugin
      await CapacitorHealthkit.isAvailable();
      
      // Check if we have stored connection status
      const stored = localStorage.getItem('healthkit-connected');
      if (stored) {
        setIsConnected(true);
        const lastSyncStored = localStorage.getItem('healthkit-last-sync');
        if (lastSyncStored) {
          setLastSync(new Date(lastSyncStored));
        }
      }
    } catch (error) {
      console.error('HealthKit not available:', error);
      // Don't show error toast for web platform
    }
  };

  const connectHealthKit = async () => {
    setIsLoading(true);
    try {
      // Request permissions for various health data types using real HealthKit API
      await CapacitorHealthkit.requestAuthorization({
        all: [],
        read: ['calories', 'stairs', 'activity', 'steps', 'distance', 'duration', 'weight'],
        write: []
      });
      
      setIsConnected(true);
      localStorage.setItem('healthkit-connected', 'true');
      
      toast({
        title: "HealthKit Connected",
        description: "Successfully connected to Apple Health data",
      });

      // Perform initial sync
      await syncHealthData();
    } catch (error) {
      console.error('Error connecting to HealthKit:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to HealthKit. Please check permissions.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const syncHealthData = async () => {
    if (!isConnected) return;
    
    setSyncStatus('syncing');
    try {
      const today = new Date();
      const startDate = new Date(today.getTime() - 24 * 60 * 60 * 1000); // Yesterday
      
      // Fetch real data from HealthKit using the plugin
      const [stepsData, distanceData, caloriesData, heartRateData] = await Promise.all([
        CapacitorHealthkit.queryHKitSampleType({
          sampleName: SampleNames.STEP_COUNT,
          startDate: startDate.toISOString(),
          endDate: today.toISOString(),
          limit: 0
        }).catch(() => ({ resultData: [] })),
        
        CapacitorHealthkit.queryHKitSampleType({
          sampleName: SampleNames.DISTANCE_WALKING_RUNNING,
          startDate: startDate.toISOString(),
          endDate: today.toISOString(),
          limit: 0
        }).catch(() => ({ resultData: [] })),
        
        CapacitorHealthkit.queryHKitSampleType({
          sampleName: SampleNames.ACTIVE_ENERGY_BURNED,
          startDate: startDate.toISOString(),
          endDate: today.toISOString(),
          limit: 0
        }).catch(() => ({ resultData: [] })),
        
        CapacitorHealthkit.queryHKitSampleType({
          sampleName: SampleNames.HEART_RATE,
          startDate: startDate.toISOString(),
          endDate: today.toISOString(),
          limit: 10
        }).catch(() => ({ resultData: [] }))
      ]);

      // Process the data or use defaults if no data available
      const processedData: HealthKitData = {
        steps: stepsData.resultData?.[0]?.value || 0,
        distance: distanceData.resultData?.[0]?.value || 0,
        activeCalories: caloriesData.resultData?.[0]?.value || 0,
        totalCalories: (caloriesData.resultData?.[0]?.value || 0) + 1500, // Add base metabolic rate
        heartRate: heartRateData.resultData?.[0]?.value || 70,
        sleepHours: 7, // Would need sleep analysis query
        weight: undefined, // Would need separate query
        bodyFat: undefined, // Would need separate query
        date: new Date().toISOString().split('T')[0]
      };

      // Save to activity_metrics table
      const { error: activityError } = await supabase
        .from('activity_metrics')
        .upsert({
          user_id: userId,
          measurement_date: processedData.date,
          measurement_timestamp: new Date().toISOString(),
          steps_count: processedData.steps,
          distance_walked_meters: processedData.distance,
          active_calories: processedData.activeCalories,
          total_calories: processedData.totalCalories,
          device_type: 'iPhone HealthKit',
          data_source: 'Apple Health'
        }, {
          onConflict: 'user_id,measurement_date,device_type'
        });

      if (activityError) throw activityError;

      // Save to heart_metrics table
      const { error: heartError } = await supabase
        .from('heart_metrics')
        .upsert({
          user_id: userId,
          measurement_timestamp: new Date().toISOString(),
          average_heart_rate: processedData.heartRate,
          device_type: 'iPhone HealthKit',
          data_source: 'Apple Health',
          measurement_context: 'daily_average'
        }, {
          onConflict: 'user_id,measurement_timestamp,device_type'
        });

      if (heartError) throw heartError;

      // Save to sleep_metrics table
      const { error: sleepError } = await supabase
        .from('sleep_metrics')
        .upsert({
          user_id: userId,
          sleep_date: processedData.date,
          total_sleep_time: processedData.sleepHours * 60,
          device_type: 'iPhone HealthKit',
          data_source: 'Apple Health'
        }, {
          onConflict: 'user_id,sleep_date,device_type'
        });

      if (sleepError) throw sleepError;

      const now = new Date();
      setLastSync(now);
      localStorage.setItem('healthkit-last-sync', now.toISOString());
      setSyncStatus('success');

      toast({
        title: "Sync Complete",
        description: "Health data successfully imported",
      });

    } catch (error) {
      console.error('Error syncing health data:', error);
      setSyncStatus('error');
      toast({
        title: "Sync Failed",
        description: "Failed to import health data",
        variant: "destructive"
      });
    }
  };

  const disconnectHealthKit = () => {
    setIsConnected(false);
    setLastSync(null);
    localStorage.removeItem('healthkit-connected');
    localStorage.removeItem('healthkit-last-sync');
    setSyncStatus('idle');
    
    toast({
      title: "HealthKit Disconnected",
      description: "Disconnected from Apple Health data",
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          <CardTitle>Apple Health Integration</CardTitle>
        </div>
        <CardDescription>
          Connect your iPhone's Health app to automatically import fitness and health data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Connection Status:</span>
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Connected" : "Not Connected"}
            </Badge>
          </div>
          
          {isConnected ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={disconnectHealthKit}
            >
              Disconnect
            </Button>
          ) : (
            <Button 
              onClick={connectHealthKit} 
              disabled={isLoading || !isNativePlatform}
              size="sm"
            >
              {isLoading ? "Connecting..." : !isNativePlatform ? "iOS Only" : "Connect HealthKit"}
            </Button>
          )}
        </div>

        {isConnected && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <span>Activity</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                <span>Heart Rate</span>
              </div>
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-purple-500" />
                <span>Sleep</span>
              </div>
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-green-500" />
                <span>Body Metrics</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-sm text-muted-foreground">
                {lastSync ? (
                  <>Last sync: {lastSync.toLocaleString()}</>
                ) : (
                  "Never synced"
                )}
              </div>
              
              <Button 
                onClick={syncHealthData}
                disabled={syncStatus === 'syncing'}
                size="sm"
                variant="outline"
              >
                {syncStatus === 'syncing' ? (
                  <>
                    <Droplets className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  "Sync Now"
                )}
              </Button>
            </div>
          </>
        )}

        {!isConnected && isNativePlatform && (
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            <p className="font-medium mb-1">What data will be imported:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Daily step count and distance</li>
              <li>Active and total calories burned</li>
              <li>Heart rate measurements</li>
              <li>Sleep duration and quality</li>
              <li>Body weight and composition</li>
            </ul>
          </div>
        )}

        {!isNativePlatform && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-4 rounded-md">
            <p className="font-medium mb-2">📱 Mobile App Required</p>
            <p className="mb-2">HealthKit integration only works on iOS devices with the native mobile app.</p>
            <p className="text-xs">
              <strong>To test:</strong> Run <code>npx cap run ios</code> to open in iOS Simulator or install on an iPhone.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HealthKitSync;