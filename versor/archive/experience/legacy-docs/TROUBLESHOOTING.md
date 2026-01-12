# Experience Module - Troubleshooting Guide

**Last Updated:** December 3, 2025

This guide consolidates all known issues and their solutions for the L.O.V.E. Experience module.

---

## 🚨 Critical Issues

### 1. React Three Fiber Not Rendering

**Issue:** Canvas displays but no 3D geometry renders (black screen)

**Symptoms:**
- ✅ No console errors
- ✅ Components mount successfully
- ✅ Shaders compile
- ❌ Canvas is completely black

**Possible Causes:**

#### A. expo-gl Context Issue
The GLView may not be properly initializing the WebGL context.

**Solution:**
```typescript
// Add explicit GL view initialization
import { GLView } from 'expo-gl';

// Verify expo-gl is properly linked
npm list expo-gl
```

#### B. Camera/Viewport Configuration
Objects may be outside camera frustum.

**Solution:**
```typescript
// In App.tsx, adjust camera settings:
<Canvas
  camera={{ position: [0, 0, 10], fov: 50, near: 0.1, far: 1000 }}
>
```

#### C. React Three Fiber Version Compatibility
R3F v8 with Expo SDK 52 may have compatibility issues.

**Solution:**
```bash
# Check versions
npm list @react-three/fiber three expo-gl

# Expected:
# @react-three/fiber@8.17.0
# three@0.160.0
# expo-gl@15.0.2
```

**Debugging Steps:**

1. **Add visible border to canvas:**
```typescript
<View style={[styles.canvas, { borderWidth: 5, borderColor: 'red' }]}>
```

2. **Try simplest possible scene:**
```typescript
<Canvas style={{ width: '100%', height: 400, backgroundColor: 'blue' }}>
  <mesh>
    <boxGeometry args={[1, 1, 1]} />
    <meshBasicMaterial color="white" />
  </mesh>
</Canvas>
```

3. **Check React Native logs:**
```bash
npx react-native log-ios
# or
npx react-native log-android
```

---

## ⚠️ Common Issues

### 2. "ExponentGLObjectManager" Error

**Issue:** Error about GLObjectManager when starting app

**Cause:** New Architecture is enabled, incompatible with expo-gl

**Solution:**
```json
// In app.json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "ios": {
            "newArchEnabled": false
          },
          "android": {
            "newArchEnabled": false
          }
        }
      ]
    ]
  }
}
```

Then rebuild:
```bash
rm -rf ios/build android/build
npx expo prebuild --clean
npx expo run:ios
```

---

### 3. React 19 Auto-Installed

**Issue:** npm installs React 19.x instead of 18.2.0

**Cause:** React Three Fiber v8 requires React 18.x

**Solution:**
```bash
npm install react@18.2.0 react-dom@18.2.0 --save-exact
rm -rf node_modules package-lock.json
npm install
```

**Lock versions in package.json:**
```json
{
  "dependencies": {
    "react": "18.2.0",
    "react-dom": "18.2.0"
  }
}
```

---

### 4. TypeScript Errors in IDE

**Issue:** Red squiggly lines, "Cannot find module" errors

**Cause:** Dependencies not installed or types missing

**Solution:**
```bash
npm install
npm install --save-dev @types/three @types/react
```

---

### 5. Metro Bundler Can't Find GLSL Files

**Issue:** Error importing .glsl shader files

**Cause:** Metro not configured to handle GLSL files

**Solution:**

Ensure `metro.config.js` includes:
```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('./glsl-transformer.js'),
};

config.resolver = {
  ...config.resolver,
  assetExts: [...config.resolver.assetExts, 'glsl', 'vert', 'frag'],
};

module.exports = config;
```

And `glsl-transformer.js` exists:
```javascript
const fs = require('fs');
const upstreamTransformer = require('metro-react-native-babel-transformer');

module.exports.transform = function({ src, filename, options }) {
  if (filename.endsWith('.glsl') || filename.endsWith('.vert') || filename.endsWith('.frag')) {
    const glslCode = fs.readFileSync(filename, 'utf8');
    const jsCode = `module.exports = ${JSON.stringify(glslCode)};`;
    return upstreamTransformer.transform({ src: jsCode, filename, options });
  }
  return upstreamTransformer.transform({ src, filename, options });
};
```

---

### 6. Expo Go Limitation

**Issue:** App won't run in Expo Go

**Cause:** expo-gl with custom native code requires development build

**Solution:**
Use development build instead:
```bash
npx expo prebuild
npx expo run:ios
# or
npx expo run:android
```

Expo Go **cannot** run apps with:
- Custom native code (expo-gl)
- React Three Fiber
- Custom shaders

---

### 7. iOS Build Fails

**Issue:** Xcode build errors

**Common Causes:**

#### A. Pods Not Installed
```bash
cd ios
pod install
cd ..
```

#### B. Xcode Cache Issues
```bash
cd ios
rm -rf build
xcodebuild clean
cd ..
```

#### C. CocoaPods Version
```bash
sudo gem install cocoapods
pod --version  # Should be 1.15+
```

---

### 8. Android Build Fails

**Issue:** Gradle build errors

**Solutions:**

#### A. Clean Gradle Cache
```bash
cd android
./gradlew clean
cd ..
```

#### B. Check Java Version
```bash
java -version  # Should be JDK 17
```

#### C. Update Gradle
```bash
# In android/gradle/wrapper/gradle-wrapper.properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.8-all.zip
```

---

## 🔧 Performance Issues

### 9. Low Frame Rate

**Issue:** Soul Sphere runs below 60fps

**Solutions:**

#### A. Reduce Geometry Detail
```typescript
<SoulSphere detail={10} />  // Lower from 15 or 20
```

#### B. Disable OrbitControls
Camera controls add overhead.

#### C. Optimize Shaders
Reduce noise octaves in vertex shader.

---

### 10. Memory Leaks

**Issue:** App memory usage increases over time

**Solutions:**

#### A. Clean Up Polling
```typescript
useEffect(() => {
  const polling = startPolling();
  return () => polling.stop();  // Clean up!
}, []);
```

#### B. Dispose Three.js Objects
```typescript
useEffect(() => {
  return () => {
    geometry.dispose();
    material.dispose();
  };
}, []);
```

---

## 🌐 API Integration Issues

### 11. Observer API Connection Failed

**Issue:** Cannot connect to Observer at localhost:8000

**Checks:**

1. **Is Observer running?**
```bash
curl http://localhost:8000/health
```

2. **Correct URL?**
```typescript
// In observerApi.ts
baseUrl: 'http://localhost:8000'  // For simulator
// or
baseUrl: 'http://10.0.2.2:8000'  // For Android emulator
```

3. **CORS enabled?**
Observer must allow requests from mobile app.

---

### 12. Polling Not Working

**Issue:** Experience doesn't auto-update from Observer

**Debug:**

1. **Check logs:**
```typescript
logger.info('OBSERVER_POLL', 'Starting...');
```

2. **Verify polling enabled:**
```typescript
const { isPolling } = useObserverPolling({ enabled: true });
console.log('Polling active:', isPolling);
```

3. **Test endpoint manually:**
```bash
curl http://localhost:8000/observer/current/demo-user
```

---

## 📱 Platform-Specific Issues

### 13. iOS Simulator Black Screen

**Issue:** Works on Android but black on iOS

**Solutions:**

1. **Reset iOS Simulator:**
```bash
xcrun simctl erase all
```

2. **Check iOS logs:**
```bash
xcrun simctl spawn booted log stream --level debug
```

3. **Rebuild from scratch:**
```bash
rm -rf ios/build
npx expo prebuild --clean --platform ios
npx expo run:ios
```

---

### 14. Android Emulator Crashes

**Issue:** App crashes on Android but works on iOS

**Solutions:**

1. **Check OpenGL ES support:**
Ensure emulator uses hardware acceleration.

2. **Increase emulator RAM:**
AVD Manager → Edit → RAM: 4GB+

3. **Use physical device:**
Some emulators have poor GL support.

---

## 🎨 Rendering Artifacts

### 15. Sphere Looks Wrong

**Issue:** Geometry appears distorted or incorrect

**Checks:**

1. **VAC values in range:**
```typescript
// All values should be -1.0 to 1.0
console.log('VAC:', vac);
```

2. **Shader uniforms:**
```typescript
// In SoulSphere component
console.log('Uniforms:', materialRef.current.uniforms);
```

3. **Lighting:**
Too little light = everything dark

---

### 16. Colors Don't Match VAC

**Issue:** Sphere color doesn't reflect valence

**Debug:**

Check fragment shader uniform:
```typescript
uniforms={{
  uValence: { value: currentVAC[0] },  // -1 to 1
  uConnection: { value: currentVAC[2] },  // -1 to 1
}}
```

Verify color interpolation:
```glsl
// In fragment.glsl
vec3 negativeColor = vec3(0.545, 0.0, 0.0);  // Crimson
vec3 positiveColor = vec3(0.0, 1.0, 1.0);     // Cyan
```

---

## 🧪 Testing Issues

### 17. Jest Tests Fail

**Issue:** Cannot run tests with npm test

**Cause:** Jest not configured for React Native + Three.js

**Solution:**

Add `jest.config.js`:
```javascript
module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|three)/)',
  ],
  setupFiles: ['./jest.setup.js'],
};
```

---

## 📚 Additional Resources

- **React Three Fiber Docs:** https://docs.pmnd.rs/react-three-fiber
- **Expo GL Docs:** https://docs.expo.dev/versions/latest/sdk/gl-view/
- **Three.js Docs:** https://threejs.org/docs/
- **Expo SDK 52 Notes:** https://blog.expo.dev/expo-sdk-52

---

## 🆘 Getting Help

If none of these solutions work:

1. **Check package versions:**
```bash
npm list @react-three/fiber three expo-gl expo
```

2. **Review GitHub issues:**
- react-three/react-three-fiber
- expo/expo

3. **Enable verbose logging:**
```bash
EXPO_DEBUG=1 npx expo start
```

4. **Create minimal reproduction:**
Strip app down to simplest R3F scene that fails.

---

**Still stuck?** Check `session-notes/` folder for detailed historical debugging sessions.
