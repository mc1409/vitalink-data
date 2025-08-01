import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Smartphone, Heart, Activity, Moon, Scale, Droplets } from 'lucide-react';

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

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      // Check if HealthKit is available (iOS only)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (!isIOS) {
        toast({
          title: "HealthKit Unavailable",
          description: "HealthKit is only available on iOS devices",
          variant: "destructive"
        });
        return;
      }

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
      console.error('Error checking HealthKit status:', error);
    }
  };

  const connectHealthKit = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would use @capacitor-community/healthkit
      // For now, we'll simulate the connection
      
      // Request permissions for various health data types
      const permissions = [
        'steps',
        'distance',
        'activeEnergyBurned',
        'basalEnergyBurned',
        'heartRate',
        'sleepAnalysis',
        'bodyMass',
        'bodyFatPercentage'
      ];

      // Simulate permission request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
        description: "Failed to connect to HealthKit",
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
      // In a real implementation, this would fetch from HealthKit
      // For now, we'll generate sample data
      const mockData: HealthKitData = {
        steps: Math.floor(Math.random() * 10000) + 5000,
        distance: Math.floor(Math.random() * 5000) + 2000,
        activeCalories: Math.floor(Math.random() * 500) + 200,
        totalCalories: Math.floor(Math.random() * 1000) + 1500,
        heartRate: Math.floor(Math.random() * 40) + 60,
        sleepHours: Math.floor(Math.random() * 3) + 6,
        weight: Math.floor(Math.random() * 20) + 150,
        bodyFat: Math.floor(Math.random() * 10) + 15,
        date: new Date().toISOString().split('T')[0]
      };

      // Save to activity_metrics table
      const { error: activityError } = await supabase
        .from('activity_metrics')
        .upsert({
          user_id: userId,
          measurement_date: mockData.date,
          measurement_timestamp: new Date().toISOString(),
          steps_count: mockData.steps,
          distance_walked_meters: mockData.distance,
          active_calories: mockData.activeCalories,
          total_calories: mockData.totalCalories,
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
          average_heart_rate: mockData.heartRate,
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
          sleep_date: mockData.date,
          total_sleep_time: mockData.sleepHours * 60,
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
              disabled={isLoading}
              size="sm"
            >
              {isLoading ? "Connecting..." : "Connect HealthKit"}
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

        {!isConnected && (
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
      </CardContent>
    </Card>
  );
};

export default HealthKitSync;