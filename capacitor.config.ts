import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.6b88c1867e514aec9414f3976d33b8fd',
  appName: 'vitalink-data',
  webDir: 'dist',
  server: {
    url: 'https://6b88c186-7e51-4aec-9414-f3976d33b8fd.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    HealthKit: {
      enableBackgroundDelivery: true
    }
  }
};

export default config;