# iOS Build Error Fix Guide

## The Problem
`Sandbox: bash deny(1) file-read-data` - macOS is blocking CocoaPods scripts

## Solution Steps

### 1. Fix File Permissions
```bash
# Navigate to project root
cd /Users/2024ai/vitalink-data-clean

# Fix all file permissions
sudo chmod -R 755 ios/
chmod +x ios/App/Pods/Target\ Support\ Files/Pods-App/Pods-App-frameworks.sh
```

### 2. Complete Clean & Rebuild
```bash
# Clean everything
rm -rf ios/App/Pods
rm -rf ios/App/Podfile.lock
rm -rf ios/DerivedData

# Rebuild web project
npm run build

# Re-sync iOS platform
npx cap sync ios
```

### 3. Alternative: Use Xcode Directly
```bash
# Open project in Xcode (avoids CLI sandbox issues)
npx cap open ios
```

Then in Xcode:
- Select iPhone simulator from the device dropdown
- Press Cmd+R to run (or click the play button)

### 4. If Still Failing: System Settings
Go to System Settings > Privacy & Security > Developer Tools
- Make sure Xcode is allowed
- You may need to restart Terminal after changes

### 5. Last Resort: Disable SIP (Advanced)
Only if all else fails:
1. Restart Mac and hold Cmd+R
2. Open Terminal in Recovery Mode
3. Run: `csrutil disable`
4. Restart normally
5. Build the app
6. Re-enable SIP: `csrutil enable`

## Recommended Approach
Use Step 3 (Xcode directly) - this bypasses most permission issues.