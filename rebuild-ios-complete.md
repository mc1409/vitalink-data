# Complete iOS Rebuild Instructions

## ⚠️ IMPORTANT: Complete Clean Rebuild Required

Your Cordova framework headers are corrupted. Follow these exact steps:

## Step 1: Complete Cleanup
```bash
# Navigate to project root
cd /Users/2024ai/vitalink-data-clean

# Remove entire iOS platform and caches
rm -rf ios/
rm -rf node_modules/@capacitor/
rm -rf node_modules/.cache/
npm cache clean --force
```

## Step 2: Update All Dependencies
```bash
# Update Capacitor to latest stable
npm install @capacitor/core@^7.4.2 @capacitor/cli@^7.4.2 @capacitor/ios@^7.4.2

# Remove incompatible HealthKit plugin (will use native iOS APIs instead)
npm uninstall @perfood/capacitor-healthkit
```

## Step 3: Rebuild Web Project
```bash
# Clean build the web project
rm -rf dist/
npm run build
```

## Step 4: Add iOS Platform Fresh
```bash
# Add iOS platform completely fresh
npx cap add ios

# Sync all files
npx cap sync ios
```

## Step 5: Configure HealthKit in Xcode
```bash
# Open project in Xcode
npx cap open ios
```

### In Xcode:
1. **Select "App" target** in the project navigator (left panel)
2. **Go to "Signing & Capabilities" tab**
3. **Click the "+ Capability" button**
4. **Search for and add "HealthKit"**
5. **In the HealthKit section, optionally check "Clinical Health Records"**

### Add Info.plist Permissions:
Xcode should auto-add these, but verify they exist in `ios/App/App/Info.plist`:

```xml
<key>NSHealthShareUsageDescription</key>
<string>This app reads health data to provide personalized health insights and tracking.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>This app updates health data to provide comprehensive health tracking.</string>
```

## Step 6: Build and Test
1. **In Xcode, select "iPhone 16 Plus" simulator from the device dropdown**
2. **Press Cmd+R (or click the play button) to build and run**
3. **The app should launch in the simulator**
4. **Test the HealthKit connection by going to Dashboard and clicking "Connect HealthKit"**

## Expected Result
- ✅ No compilation errors
- ✅ App launches successfully in iOS Simulator
- ✅ HealthKit capabilities are configured (you'll see this in the dashboard)
- ✅ Mock health data can be synced and displayed

## Note about HealthKit Implementation
This implementation uses mock data for demonstration. To connect to real HealthKit data, you'll need to:
1. Implement native iOS Swift code in the Capacitor plugin
2. Use HealthKit APIs to request permissions and fetch real data
3. This requires iOS development knowledge and Apple Developer account

## If Issues Persist
If you still get errors after following these steps exactly:

1. **Check Xcode version**: Ensure you have Xcode 16.x with iOS 18.x SDK
2. **Try different simulator**: Switch to iPhone 15 Pro or iPhone 14 Pro
3. **Clean Xcode build folder**: Product → Clean Build Folder in Xcode
4. **Restart Xcode and Terminal**

This complete rebuild should resolve the corrupted Cordova framework issues.