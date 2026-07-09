# Experience Module - Troubleshooting

## Overview

This guide addresses common issues encountered when developing and deploying the Experience module, with solutions and debugging strategies.

## Setup and Configuration Issues

### Issue: ExponentGLObjectManager Not Found

**Symptoms**:

- Error: `Cannot read property 'ExponentGLObjectManager' of undefined`
- Blank canvas
- App crashes on startup

**Cause**: React Native New Architecture is enabled, which conflicts with expo-gl.

**Solution**:

1. **For Expo projects**, edit `app.json`:

```json
{
  "expo": {
    "ios": {
      "newArchEnabled": false
    },
    "android": {
      "newArchEnabled": false
    }
  }
}
```

2. **For bare React Native**, edit `android/gradle.properties`:

```properties
newArchEnabled=false
```

And `ios/Podfile`:

```ruby
ENV['RCT_NEW_ARCH_ENABLED'] = '0'
```

3. **Clean and rebuild**:

```bash
# iOS
cd ios && pod install && cd ..
npx react-native run-ios

# Android
cd android && ./gradlew clean && cd ..
npx react-native run-android
```

### Issue: Module Not Found - @react-three/fiber

**Symptoms**:

- Error: `Unable to resolve module @react-three/fiber`

**Cause**: Incorrect React Three Fiber version or missing installation.

**Solution**:

1. Verify React version:

```bash
npm list react
# Should show 18.2.0
```

2. Install correct R3F version:

```bash
npm install @react-three/fiber@^8.17.0 --save-exact
```

3. Clear Metro cache:

```bash
npm start -- --reset-cache
```

### Issue: GLSL Files Not Loading

**Symptoms**:

- Error: `Unable to resolve module './vertex.glsl'`

**Cause**: Metro bundler not configured to handle `.glsl` files.

**Solution**:

1. Create `glsl-transformer.js` in project root:

```javascript
const upstreamTransformer = require("metro-react-native-babel-transformer");

module.exports.transform = ({ src, filename, options }) => {
  if (filename.endsWith(".glsl")) {
    return {
      ast: null,
      code: `module.exports = ${JSON.stringify(src)};`,
    };
  }
  return upstreamTransformer.transform({ src, filename, options });
};
```

2. Update `metro.config.js`:

```javascript
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push("glsl");
config.resolver.sourceExts.push("glsl");
config.transformer.babelTransformerPath =
  require.resolve("./glsl-transformer.js");

module.exports = config;
```

3. Restart Metro:

```bash
npm start -- --reset-cache
```

## Rendering Issues

### Issue: Black Screen / Nothing Renders

**Debugging Steps**:

1. **Check for shader compilation errors**:

```typescript
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {/* ... */},
});

// Add error listener
material.onBeforeCompile = (shader, renderer) => {
  console.log("Vertex Shader:", shader.vertexShader);
  console.log("Fragment Shader:", shader.fragmentShader);
};
```

2. **Verify geometry is created**:

```typescript
const geometry = new THREE.IcosahedronGeometry(1, 20);
console.log("Vertices:", geometry.attributes.position.count);
// Should be > 0
```

3. **Check camera position**:

```typescript
<Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
  {/* Camera should be far enough to see sphere */}
</Canvas>
```

4. **Add lighting**:

```typescript
<ambientLight intensity={0.5} />
<pointLight position={[10, 10, 10]} />
```

### Issue: Flat Appearance / No Displacement

**Symptoms**:

- Sphere looks perfectly smooth regardless of Arousal value

**Cause**: Uniform not updating or shader not receiving values.

**Solution**:

1. **Verify uniform updates**:

```typescript
useFrame(() => {
  if (materialRef.current) {
    console.log("uArousal:", materialRef.current.uniforms.uArousal.value);
    // Should change when arousal changes
  }
});
```

2. **Check for typos in uniform names**:

```glsl
// Vertex shader
uniform float uArousal;  // Must match JavaScript uniform name exactly
```

3. **Ensure uniforms are defined**:

```typescript
const material = new THREE.ShaderMaterial({
  uniforms: {
    uArousal: { value: 0.0 }, // Must have .value property
  },
});
```

### Issue: Glow Not Visible

**Symptoms**:

- Connection changes don't affect sphere appearance

**Cause**: Camera position not passed to shader or transparency not enabled.

**Solution**:

1. **Enable transparency**:

```typescript
const material = new THREE.ShaderMaterial({
  transparent: true, // Required for glow
  side: THREE.DoubleSide,
});
```

2. **Update camera uniform**:

```typescript
useFrame((state) => {
  if (materialRef.current) {
    materialRef.current.uniforms.uCameraPosition.value.copy(
      state.camera.position,
    );
  }
});
```

3. **Check Fresnel calculation**:

```glsl
// Fragment shader
vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
float fresnelDot = dot(viewDir, vNormal);
// Should be between 0 and 1
```

## Performance Issues

### Issue: Low FPS / Stuttering

**Debugging**:

1. **Monitor frame rate**:

```typescript
useFrame((state, delta) => {
  const fps = 1 / delta;
  if (fps < 50) {
    console.warn("Low FPS:", fps.toFixed(1));
  }
});
```

2. **Profile with Chrome DevTools**:

- Open dev menu → "Debug JS Remotely"
- Open Chrome DevTools → Performance tab
- Record session
- Look for long frames (>16ms)

3. **Check geometry detail**:

```typescript
const detail = 20; // Try reducing to 10 or 15
const geometry = new THREE.IcosahedronGeometry(1, detail);
```

**Solutions**:

1. **Reduce geometry complexity**:

```typescript
// Detect device performance
const isLowEnd =
  Platform.OS === "android" && DeviceInfo.getTotalMemory() < 4000000000;
const detail = isLowEnd ? 10 : 20;
```

2. **Simplify shaders**:

```glsl
// Use cheaper noise function
float simpleNoise(vec3 p) {
  return fract(sin(dot(p, vec3(12.9898, 78.233, 45.543))) * 43758.5453);
}
```

3. **Enable on-demand rendering**:

```typescript
<Canvas frameloop="demand">
```

### Issue: Memory Leak

**Symptoms**:

- App memory usage increases over time
- App crashes after extended use

**Cause**: Three.js objects not disposed properly.

**Solution**:

1. **Dispose in cleanup**:

```typescript
useEffect(() => {
  const geometry = new THREE.IcosahedronGeometry(1, 20);
  const material = new THREE.ShaderMaterial({/* ... */});

  return () => {
    geometry.dispose();
    material.dispose();
  };
}, []);
```

2. **Profile memory**:

```typescript
// Use Chrome DevTools Memory tab
// Take heap snapshots before/after operations
// Look for detached DOM nodes and retained objects
```

## Haptic Issues

### Issue: Haptics Not Working on iOS

**Symptoms**:

- No vibration felt on device
- No errors in console

**Debugging**:

1. **Check device support**:

```typescript
import Haptics from "react-native-haptics";

try {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  console.log("Haptics working");
} catch (error) {
  console.error("Haptics not supported:", error);
}
```

2. **Verify permissions** (not typically needed for haptics, but check):

- Settings → Sounds & Haptics → System Haptics (should be ON)

**Solution**:

1. **Test on physical device** (haptics don't work on simulator)

2. **Check haptic mode setting**:

```typescript
const hapticMode = useExperienceStore((state) => state.preferences.hapticMode);
console.log("Haptic mode:", hapticMode); // Should be 'normal'
```

### Issue: Haptics Not Working on Android

**Cause**: Device may not support haptics or permissions missing.

**Solution**:

1. **Add permission** in `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.VIBRATE" />
```

2. **Use fallback**:

```typescript
import { Vibration, Platform } from "react-native";

if (Platform.OS === "android") {
  Vibration.vibrate(100); // Simple vibration
}
```

## State Management Issues

### Issue: Store Updates Not Triggering Re-renders

**Symptoms**:

- VAC values change but UI doesn't update

**Cause**: Not subscribing to store properly.

**Solution**:

```typescript
// ❌ BAD: Not subscribing
const store = useExperienceStore.getState();

// ✅ GOOD: Subscribing to specific value
const targetVAC = useExperienceStore((state) => state.targetVAC);
```

### Issue: Excessive Re-renders

**Symptoms**:

- Component re-renders 60 times per second
- Performance degradation

**Cause**: Subscribing to frequently-changing values.

**Solution**:

```typescript
// ❌ BAD: Subscribes to entire store
const store = useExperienceStore();

// ✅ GOOD: Use transient updates
useFrame(() => {
  const { targetVAC } = useExperienceStore.getState(); // No subscription
  // Update without triggering re-render
});
```

## API Integration Issues

### Issue: 401 Unauthorized

**Symptoms**:

- API calls fail with 401 status

**Cause**: Token expired or invalid.

**Solution**:

1. **Implement token refresh**:

```typescript
async function getValidToken() {
  let token = await authService.getToken();

  if (authService.isTokenExpired(token)) {
    token = await authService.refreshToken();
  }

  return token;
}
```

2. **Add retry logic**:

```typescript
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const token = await authService.refreshToken();
      error.config.headers.Authorization = `Bearer ${token}`;
      return axios(error.config);
    }
    throw error;
  },
);
```

### Issue: WebSocket Keeps Disconnecting

**Symptoms**:

- Frequent reconnections
- Inconsistent data updates

**Cause**: Network instability or server timeout.

**Solution**:

1. **Add heartbeat**:

```typescript
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "ping" }));
  }
}, 30000); // Every 30 seconds
```

2. **Implement exponential backoff**:

```typescript
private attemptReconnect(token: string) {
  const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
  setTimeout(() => this.connect(token), Math.min(delay, 60000));
}
```

## Platform-Specific Issues

### iOS: Build Fails

**Error**: `'React/RCTBridgeModule.h' file not found`

**Solution**:

```bash
cd ios
pod deintegrate
pod install --repo-update
cd ..
```

### Android: Could Not Find Three.js

**Error**: `Module not found: three`

**Solution**:

```bash
# Clear gradle cache
cd android
./gradlew clean
cd ..

# Clear node modules
rm -rf node_modules
npm install
```

## Debug Tools

### Performance Monitor

```typescript
function DebugOverlay() {
  const [fps, setFps] = useState(60);
  const [memory, setMemory] = useState(0);

  useFrame((state, delta) => {
    setFps(Math.round(1 / delta));
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (performance.memory) {
        setMemory(Math.round(performance.memory.usedJSHeapSize / 1048576));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.debug}>
      <Text>FPS: {fps}</Text>
      <Text>Memory: {memory} MB</Text>
    </View>
  );
}
```

### Shader Debug Mode

```glsl
// Fragment shader debug mode
uniform bool uDebugMode;

void main() {
  if (uDebugMode) {
    // Show normals as colors
    gl_FragColor = vec4(vNormal * 0.5 + 0.5, 1.0);
    return;
  }

  // Normal rendering
  // ...
}
```

## Getting Help

### Before Asking for Help

1. Check console for errors
2. Verify dependencies are correct versions
3. Try on physical device (not just emulator)
4. Test with simplified example
5. Check this troubleshooting guide

### Where to Get Help

- **GitHub Issues**: Report bugs with reproduction steps
- **Stack Overflow**: Tag with `react-three-fiber`, `react-native`
- **Discord**: React Three Fiber community
- **Documentation**: Review all docs in this folder

### Creating a Bug Report

Include:

1. React Native version
2. Expo SDK version (if using Expo)
3. Device/OS version
4. Minimal reproduction code
5. Expected vs actual behavior
6. Error messages and stack traces
7. Screenshots/video if applicable

## Next Steps

- **13-accessibility.md** - Inclusive design features
