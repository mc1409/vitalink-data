import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useHealthKit } from './useHealthKit';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface AppInitializationState {
  isInitializing: boolean;
  healthKitInitialized: boolean;
  error: string | null;
}

export const useAppInitialization = (): AppInitializationState => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [healthKitInitialized, setHealthKitInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);
  
  const { user, loading: authLoading } = useAuth();
  const { isAvailable, autoConnect, autoSync } = useHealthKit();
  const { toast } = useToast();

  useEffect(() => {
    const initializeApp = async () => {
      // Don't initialize if auth is still loading or user is not authenticated
      if (authLoading || !user || hasAttempted) {
        return;
      }

      // Only run on iOS native platform
      const isNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      
      console.log('🔍 Platform check:', { isNative, platform });
      
      if (!isNative || platform !== 'ios') {
        console.log('⏭️ Skipping HealthKit initialization - not iOS native');
        setHasAttempted(true);
        return;
      }

      // Check if we've already asked for permissions this session
      const sessionKey = `healthkit_initialized_${user.id}`;
      const alreadyInitialized = sessionStorage.getItem(sessionKey);
      
      if (alreadyInitialized) {
        console.log('✅ HealthKit already initialized this session');
        setHealthKitInitialized(true);
        setHasAttempted(true);
        return;
      }

      // Mark that we've attempted initialization to prevent loops
      setHasAttempted(true);
      setIsInitializing(true);
      setError(null);

      try {
        console.log('🔄 Starting HealthKit initialization...');
        
        if (isAvailable) {
          console.log('✅ HealthKit is available, attempting auto-connect...');
          
          // Attempt automatic HealthKit connection
          await autoConnect();
          
          console.log('✅ HealthKit auto-connect successful');
          
          // Show a subtle success notification
          toast({
            title: "Health Sync Ready",
            description: "Your health data will sync automatically",
            duration: 3000,
          });

          // Start initial sync in background after a delay
          setTimeout(async () => {
            try {
              console.log('🔄 Starting initial health data sync...');
              await autoSync();
              console.log('✅ Initial health data sync completed');
            } catch (syncError) {
              console.log('⚠️ Initial sync failed, will retry later:', syncError);
            }
          }, 2000);

          setHealthKitInitialized(true);
          sessionStorage.setItem(sessionKey, 'true');
        } else {
          console.log('❌ HealthKit is not available on this device');
          setError('HealthKit not available');
        }
      } catch (initError: any) {
        console.log('❌ HealthKit initialization failed:', initError);
        setError(initError.message || 'Failed to initialize health sync');
        
        // Only show error toast for unexpected errors, not permission denials
        if (!initError.message?.includes('permission') && !initError.message?.includes('denied')) {
          toast({
            title: "Health Sync Unavailable",
            description: "Health data sync couldn't be set up automatically",
            variant: "destructive",
            duration: 3000,
          });
        }
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, [user, authLoading, isAvailable, autoConnect, autoSync, toast, hasAttempted]);

  return {
    isInitializing,
    healthKitInitialized,
    error,
  };
};