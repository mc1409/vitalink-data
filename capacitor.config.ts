import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lovable.vitalinkdata',
  appName: 'VitalLink Health',
  webDir: 'dist',
  plugins: {
    // Using native iOS HealthKit APIs
  },
  ios: {
    scheme: 'VitalLink Health'
  }
};

export default config;