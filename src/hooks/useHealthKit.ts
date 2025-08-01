import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';
import { CapacitorHealthkit } from '@perfood/capacitor-healthkit';

interface HealthKitHook {
  isAvailable: boolean;
  isConnected: boolean;
  isLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  syncData: () => Promise<any>;
}

export const useHealthKit = (): HealthKitHook => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkAvailability();
    checkConnectionStatus();
  }, []);

  const checkAvailability = () => {
    // Check if HealthKit is available (iOS native only)
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    const available = isNative && platform === 'ios';
    setIsAvailable(available);
  };

  const checkConnectionStatus = () => {
    const stored = localStorage.getItem('healthkit_connected');
    setIsConnected(stored === 'true');
  };

  const connect = async (): Promise<void> => {
    if (!isAvailable) {
      throw new Error('HealthKit is not available on this device');
    }

    setIsLoading(true);
    try {
      // Request permissions for various health data types
      const permissions = {
        all: [
          'stepCount',
          'distanceWalkingRunning', 
          'activeEnergyBurned',
          'basalEnergyBurned',
          'heartRate',
          'restingHeartRate',
          'walkingHeartRateAverage',
          'heartRateVariabilitySDNN',
          'sleepAnalysis',
          'bodyMass',
          'bodyFatPercentage'
        ],
        read: [
          'stepCount',
          'distanceWalkingRunning', 
          'activeEnergyBurned',
          'basalEnergyBurned',
          'heartRate',
          'restingHeartRate',
          'walkingHeartRateAverage',
          'heartRateVariabilitySDNN',
          'sleepAnalysis',
          'bodyMass',
          'bodyFatPercentage'
        ],
        write: []
      };

      await CapacitorHealthkit.requestAuthorization(permissions);
      
      localStorage.setItem('healthkit_connected', 'true');
      setIsConnected(true);
      
      toast({
        title: "HealthKit Connected",
        description: "Successfully connected to Apple HealthKit",
      });
      
    } catch (error) {
      console.error('HealthKit connection failed:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to HealthKit. Please grant permissions.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = (): void => {
    localStorage.removeItem('healthkit_connected');
    localStorage.removeItem('healthkit_last_sync');
    setIsConnected(false);
    
    toast({
      title: "HealthKit Disconnected",
      description: "Successfully disconnected from HealthKit",
    });
  };

  const syncData = async (): Promise<any> => {
    if (!isConnected) {
      throw new Error('Not connected to HealthKit');
    }

    setIsLoading(true);
    try {
      const today = new Date();
      const startDate = new Date(today.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
      
      // Fetch real HealthKit data
      const [
        stepsResult,
        distanceResult,
        activeCaloriesResult,
        basalCaloriesResult,
        heartRateResult,
        sleepResult,
        weightResult,
        bodyFatResult
      ] = await Promise.allSettled([
        CapacitorHealthkit.queryHKitSampleType({
          sampleName: 'stepCount',
          startDate: startDate.toISOString(),
          endDate: today.toISOString(),
          limit: 100
        }),
        CapacitorHealthkit.queryHKitSampleType({
          sampleName: 'distanceWalkingRunning',
          startDate: startDate.toISOString(),
          endDate: today.toISOString(),
          limit: 100
        }),
        CapacitorHealthkit.queryHKitSampleType({
          sampleName: 'activeEnergyBurned',
          startDate: startDate.toISOString(),
          endDate: today.toISOString(),
          limit: 100
        }),
        CapacitorHealthkit.queryHKitSampleType({
          sampleName: 'basalEnergyBurned',
          startDate: startDate.toISOString(),
          endDate: today.toISOString(),
          limit: 100
        }),
        CapacitorHealthkit.queryHKitSampleType({
          sampleName: 'heartRate',
          startDate: startDate.toISOString(),
          endDate: today.toISOString(),
          limit: 100
        }),
        CapacitorHealthkit.queryHKitSampleType({
          sampleName: 'sleepAnalysis',
          startDate: startDate.toISOString(),
          endDate: today.toISOString(),
          limit: 10
        }),
        CapacitorHealthkit.queryHKitSampleType({
          sampleName: 'bodyMass',
          startDate: startDate.toISOString(),
          endDate: today.toISOString(),
          limit: 1
        }),
        CapacitorHealthkit.queryHKitSampleType({
          sampleName: 'bodyFatPercentage',
          startDate: startDate.toISOString(),
          endDate: today.toISOString(),
          limit: 1
        })
      ]);

      // Process the results with proper type safety
      const healthData = {
        steps: stepsResult.status === 'fulfilled' && (stepsResult.value as any)?.resultData?.length > 0 
          ? (stepsResult.value as any).resultData.reduce((sum: number, item: any) => sum + (Number(item.value) || 0), 0) 
          : 0,
        distance: distanceResult.status === 'fulfilled' && (distanceResult.value as any)?.resultData?.length > 0
          ? Math.round((distanceResult.value as any).resultData.reduce((sum: number, item: any) => sum + (Number(item.value) || 0), 0) / 1000 * 100) / 100
          : 0,
        activeCalories: activeCaloriesResult.status === 'fulfilled' && (activeCaloriesResult.value as any)?.resultData?.length > 0
          ? Math.round((activeCaloriesResult.value as any).resultData.reduce((sum: number, item: any) => sum + (Number(item.value) || 0), 0))
          : 0,
        totalCalories: 0, // Will be calculated from active + basal
        heartRate: heartRateResult.status === 'fulfilled' && (heartRateResult.value as any)?.resultData?.length > 0
          ? Math.round((heartRateResult.value as any).resultData.reduce((sum: number, item: any) => sum + (Number(item.value) || 0), 0) / (heartRateResult.value as any).resultData.length)
          : 0,
        sleepHours: sleepResult.status === 'fulfilled' && (sleepResult.value as any)?.resultData?.length > 0
          ? Math.round((sleepResult.value as any).resultData.reduce((sum: number, item: any) => {
              const start = new Date(item.startDate);
              const end = new Date(item.endDate);
              return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            }, 0) * 10) / 10
          : 0,
        weight: weightResult.status === 'fulfilled' && (weightResult.value as any)?.resultData?.length > 0
          ? Math.round(Number((weightResult.value as any).resultData[0].value) * 10) / 10
          : undefined,
        bodyFat: bodyFatResult.status === 'fulfilled' && (bodyFatResult.value as any)?.resultData?.length > 0
          ? Math.round(Number((bodyFatResult.value as any).resultData[0].value) * 100 * 10) / 10
          : undefined,
        timestamp: new Date().toISOString()
      };

      // Calculate total calories
      const basalCalories = basalCaloriesResult.status === 'fulfilled' && (basalCaloriesResult.value as any)?.resultData?.length > 0
        ? Math.round((basalCaloriesResult.value as any).resultData.reduce((sum: number, item: any) => sum + (Number(item.value) || 0), 0))
        : 0;
      
      healthData.totalCalories = healthData.activeCalories + basalCalories;
      
      // Update last sync time
      localStorage.setItem('healthkit_last_sync', new Date().toLocaleString());
      
      toast({
        title: "HealthKit Sync Complete",
        description: `Synced ${Object.keys(healthData).length} data types successfully`,
      });
      
      return healthData;
      
    } catch (error) {
      console.error('HealthKit sync failed:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync health data from HealthKit",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isAvailable,
    isConnected,
    isLoading,
    connect,
    disconnect,
    syncData
  };
};