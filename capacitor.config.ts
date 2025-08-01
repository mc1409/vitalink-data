import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lovable.vitalinkdata',
  appName: 'VitalLink Health',
  webDir: 'dist',
  plugins: {
    CapacitorHealthkit: {
      enableBackgroundDelivery: false
    }
  },
  ios: {
    scheme: 'VitalLink Health'
  }
};

export default config;