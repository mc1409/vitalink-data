import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lovable.vitalinkdata',
  appName: 'vitalink-data',
  webDir: 'dist',
  // Comment out the server config for native builds
  // server: {
  //   url: 'https://6b88c186-7e51-4aec-9414-f3976d33b8fd.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  plugins: {
    HealthKit: {
      enableBackgroundDelivery: true
    }
  }
};

export default config;