# Complete iOS Rebuild Guide

## The Problem
Corrupted Cordova framework headers and CocoaPods installation causing compilation errors.

## Complete Clean Rebuild Steps

### 1. Remove Existing iOS Platform
```bash
# Navigate to project root
cd /Users/2024ai/vitalink-data-clean

# Remove entire iOS platform
rm -rf ios/
rm -rf node_modules/@capacitor/
npm cache clean --force
```

### 2. Update Dependencies
```bash
# Update Capacitor to latest
npm install @capacitor/core@latest @capacitor/cli@latest @capacitor/ios@latest

# Reinstall HealthKit plugin
npm uninstall @perfood/capacitor-healthkit
npm install @perfood/capacitor-healthkit@latest
```

### 3. Rebuild iOS Platform
```bash
# Build web project first
npm run build

# Add iOS platform fresh
npx cap add ios

# Sync project
npx cap sync ios
```

### 4. Configure HealthKit in Xcode
```bash
# Open in Xcode
npx cap open ios
```

In Xcode:
1. Select "App" target in project navigator
2. Go to "Signing & Capabilities" tab
3. Click "+ Capability" and add "HealthKit"
4. Check "Clinical Health Records" if needed
5. Build and run with Cmd+R

### 5. Test HealthKit Permissions
The app will now request HealthKit permissions on first launch.