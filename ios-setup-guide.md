# iOS Setup Guide for HealthKit Integration

## Required Steps for iOS Simulator Testing

### 1. Create the iOS Project
Run these commands in order:

```bash
# Build the web project
npm run build

# Add iOS platform
npx cap add ios

# Sync the project
npx cap sync ios

# Open in Xcode
npx cap open ios
```

### 2. Configure HealthKit in Xcode

Once Xcode opens:

1. **Select the App target** in the project navigator
2. **Go to Signing & Capabilities tab**
3. **Click "+ Capability"**
4. **Add "HealthKit"**
5. **In the HealthKit section, check "Clinical Health Records"** (optional)

### 3. Add Info.plist Permissions

The following should be automatically added to `ios/App/App/Info.plist`:

```xml
<key>NSHealthShareUsageDescription</key>
<string>This app needs access to health data to track your fitness and wellness metrics.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>This app needs to update health data to provide comprehensive health tracking.</string>
```

### 4. Run in iOS Simulator

```bash
# Run the app in iOS Simulator
npx cap run ios
```

### 5. Testing HealthKit in Simulator

- The iOS Simulator includes a Health app with sample data
- You can add test health data through the Health app
- The app should be able to read this sample data when permissions are granted

## Current Status

- ✅ Capacitor config ready
- ✅ HealthKit plugin installed (@perfood/capacitor-healthkit)
- ❌ iOS project not created yet
- ❌ Info.plist permissions not configured
- ❌ Xcode capabilities not enabled

Run the commands above to complete the setup.