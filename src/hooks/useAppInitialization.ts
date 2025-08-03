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
  
  const { user, loading: authLoading } = useAuth();
  const { isAvailable, autoConnect, autoSync } = useHealthKit();
  const { toast } = useToast();

  useEffect(() => {
    const initializeApp = async () => {
      // Don't initialize if auth is still loading or user is not authenticated
      if (authLoading || !user) {
        return;
      }

      // Only run on iOS native platform
      const isNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      
      if (!isNative || platform !== 'ios') {
        return;
      }

      // Check if we've already asked for permissions this session
      const sessionKey = `healthkit_initialized_${user.id}`;
      const alreadyInitialized = sessionStorage.getItem(sessionKey);
      
      if (alreadyInitialized) {
        setHealthKitInitialized(true);
        return;
      }

      setIsInitializing(true);
      setError(null);

      try {
        if (isAvailable) {
          // Attempt automatic HealthKit connection
          await autoConnect();
          
          // Show a subtle success notification
          toast({
            title: "Health Sync Ready",
            description: "Your health data will sync automatically",
            duration: 3000,
          });

          // Start initial sync in background
          setTimeout(async () => {
            try {
              await autoSync();
            } catch (syncError) {
              console.log('Initial sync failed, will retry later:', syncError);
            }
          }, 1000);

          setHealthKitInitialized(true);
          sessionStorage.setItem(sessionKey, 'true');
        }
      } catch (initError: any) {
        console.log('HealthKit initialization skipped or failed:', initError);
        setError(initError.message || 'Failed to initialize health sync');
        
        // Don't show error toast for permission denials - user chose not to grant access
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
  }, [user, authLoading, isAvailable, autoConnect, autoSync, toast]);

  return {
    isInitializing,
    healthKitInitialized,
    error,
  };
};