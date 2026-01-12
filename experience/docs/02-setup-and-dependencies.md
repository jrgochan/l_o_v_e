# Experience Module - Setup and Dependencies

## Critical Dependency Version Matrix

The Experience module requires **strict version alignment** to avoid compatibility issues. This is not negotiable—version mismatches will cause runtime failures.

### Core Dependencies

| Package                | Version    | Justification                                     |
| ---------------------- | ---------- | ------------------------------------------------- |
| `react`                | `18.2.0`   | React 19 not yet supported by stable R3F v8       |
| `react-native`         | `0.76.x`   | Latest stable, but MUST run in legacy bridge mode |
| `expo`                 | `~52.0.0`  | Provides expo-gl context bindings                 |
| `expo-gl`              | `~15.0.0`  | OpenGL/WebGL context for mobile                   |
| `@react-three/fiber`   | `^8.17.0`  | R3F v8 stable for React 18 (NOT v9!)              |
| `three`                | `^0.160.0` | Peer dependency of R3F v8                         |
| `three-stdlib`         | `^2.32.0`  | Shader utilities and noise functions              |
| `@react-three/drei`    | `^9.109.0` | Helper components (optional but useful)           |
| `zustand`              | `^4.5.0`   | State management with transient updates           |
| `react-native-haptics` | `^1.7.0`   | 2.13x faster than expo-haptics                    |

### Additional Utilities

| Package                                     | Version | Purpose                                       |
| ------------------------------------------- | ------- | --------------------------------------------- |
| `expo-av`                                   | Latest  | Audio playback (if needed for audio feedback) |
| `@react-native-async-storage/async-storage` | Latest  | Persist user settings                         |
| `react-native-reanimated`                   | `^3.x`  | Optional: UI animations outside 3D context    |

## Installation Steps

### Step 1: Initialize Expo Project

```bash
# Create new Expo project with TypeScript template
npx create-expo-app@latest experience --template expo-template-blank-typescript

cd experience
```

### Step 2: Install React 18.2.0 (Pin Version)

```bash
# CRITICAL: Pin React to 18.2.0
npm install react@18.2.0 react-dom@18.2.0

# Or with yarn
yarn add react@18.2.0 react-dom@18.2.0
```

**⚠️ Warning**: If you see React 19.x in your `package.json`, R3F will fail. Downgrade immediately.

### Step 3: Install React Three Fiber Ecosystem

```bash
# Install R3F v8 and Three.js
npm install @react-three/fiber@^8.17.0 three@^0.160.0

# Install utilities
npm install three-stdlib@^2.32.0

# Optional: Drei helpers
npm install @react-three/drei@^9.109.0
```

### Step 4: Install Expo GL

```bash
# OpenGL context provider
npx expo install expo-gl
```

### Step 5: Install State and Haptics

```bash
# State management
npm install zustand@^4.5.0

# Haptic feedback
npm install react-native-haptics
```

### Step 6: Install TypeScript Types

```bash
npm install --save-dev @types/three @types/react@18.2.0
```

### Step 7: Verify Installation

```bash
npm list react @react-three/fiber three
```

Expected output:

```
├── react@18.2.0
├── @react-three/fiber@8.17.x
└── three@0.160.x
```

## React Native New Architecture Opt-Out

### Why Opt-Out?

The React Native New Architecture (Fabric renderer + TurboModules) is **incompatible** with `expo-gl`. Attempting to use R3F with the New Architecture enabled will result in:

- `ExponentGLObjectManager` errors
- Blank canvas
- Immediate application crashes
- Race conditions in frame loops

### Configuration: iOS

Edit your app configuration to disable the New Architecture.

**For Expo (app.json or app.config.js)**:

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

**For bare React Native (if ejected)**:

Edit `ios/Podfile`:

```ruby
# Find this line (usually near the top)
ENV['RCT_NEW_ARCH_ENABLED'] = '1'  # or true

# Change it to:
ENV['RCT_NEW_ARCH_ENABLED'] = '0'
```

Then reinstall pods:

```bash
cd ios
pod install --repo-update
cd ..
```

### Configuration: Android

**For Expo (app.json or app.config.js)**: Same as iOS above.

**For bare React Native (if ejected)**:

Edit `android/gradle.properties`:

```properties
# Find this line
newArchEnabled=true

# Change it to:
newArchEnabled=false
```

### Verification

After configuration, rebuild your app:

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

Check console logs. You should **NOT** see:

- "Fabric is enabled"
- "TurboModules enabled"

You **SHOULD** see:

- "Running application with Bridge"

## Project Structure Setup

Create the following directory structure:

```
experience/
├── src/
│   ├── features/
│   │   └── experience/
│   │       ├── components/
│   │       │   ├── SoulSphere/
│   │       │   │   ├── index.tsx
│   │       │   │   └── SoulMaterial.tsx
│   │       │   └── HapticManager.tsx
│   │       ├── shaders/
│   │       │   ├── vertex.glsl
│   │       │   └── fragment.glsl
│   │       ├── hooks/
│   │       │   ├── useEmotionalPhysics.ts
│   │       │   └── useTextureLoader.ts
│   │       └── store/
│   │           └── useExperienceStore.ts
│   ├── types/
│   │   └── experience.d.ts
│   └── utils/
│       └── quaternion.ts
├── assets/
│   └── textures/
├── docs/
└── App.tsx
```

Create this structure:

```bash
mkdir -p src/features/experience/{components/SoulSphere,shaders,hooks,store}
mkdir -p src/types
mkdir -p src/utils
mkdir -p assets/textures
```

## TypeScript Configuration

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "esnext",
    "lib": ["esnext"],
    "jsx": "react-native",
    "strict": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@features/*": ["src/features/*"],
      "@types/*": ["src/types/*"],
      "@utils/*": ["src/utils/*"]
    }
  },
  "extends": "expo/tsconfig.base",
  "include": ["src/**/*", "App.tsx"]
}
```

Update `babel.config.js` to support path aliases:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./src"],
          extensions: [".ios.js", ".android.js", ".js", ".ts", ".tsx", ".json"],
          alias: {
            "@": "./src",
            "@features": "./src/features",
            "@types": "./src/types",
            "@utils": "./src/utils",
          },
        },
      ],
    ],
  };
};
```

Install the babel plugin:

```bash
npm install --save-dev babel-plugin-module-resolver
```

## GLSL Shader Loading

React Native doesn't natively support importing `.glsl` files. We need to configure Metro bundler.

Create `metro.config.js`:

```javascript
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add GLSL file extension
config.resolver.assetExts.push("glsl");
config.resolver.sourceExts.push("glsl");

// Configure transformer for GLSL files
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("./glsl-transformer.js"),
};

module.exports = config;
```

Create `glsl-transformer.js` in project root:

```javascript
const upstreamTransformer = require("metro-react-native-babel-transformer");

module.exports.transform = ({ src, filename, options }) => {
  if (filename.endsWith(".glsl")) {
    // Transform GLSL file to a string export
    return {
      ast: null,
      code: `module.exports = ${JSON.stringify(src)};`,
    };
  } else {
    return upstreamTransformer.transform({ src, filename, options });
  }
};
```

Now you can import shaders:

```typescript
import vertexShader from "./shaders/vertex.glsl";
import fragmentShader from "./shaders/fragment.glsl";
```

## Environment Variables

Create `.env` file:

```bash
# Versor API endpoint
VERSOR_API_URL=http://localhost:8000

# Development flags
DEBUG_VAC_VALUES=true
ENABLE_HAPTICS=true

# Performance settings
TARGET_FPS=60
LOW_POLY_MODE=false
```

Install dotenv support:

```bash
npx expo install react-native-dotenv
```

Add to `babel.config.js`:

```javascript
plugins: [
  // ... existing plugins
  [
    'module:react-native-dotenv',
    {
      moduleName: '@env',
      path: '.env',
    },
  ],
],
```

## Development Tools

### Install Expo DevTools

```bash
npx expo install expo-dev-client
```

### Install React Native Debugger (Optional)

```bash
brew install --cask react-native-debugger  # macOS
```

### Install Flipper (Optional)

For advanced debugging: https://fbflipper.com/

## iOS-Specific Setup

### CocoaPods

Ensure CocoaPods is installed:

```bash
sudo gem install cocoapods
```

Install dependencies:

```bash
cd ios
pod install --repo-update
cd ..
```

### Xcode Configuration

1. Open `ios/experience.xcworkspace` in Xcode
2. Select your development team in Signing & Capabilities
3. Verify deployment target is iOS 13.0+

## Android-Specific Setup

### JDK Version

Ensure you have JDK 17 installed:

```bash
java -version
```

### Gradle Configuration

Edit `android/gradle.properties` if needed:

```properties
# Increase memory for large projects
org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8

# Disable New Architecture
newArchEnabled=false
```

## Verification Test

Create a simple test to verify the setup:

**src/test-setup.tsx**:

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { useFrame } from '@react-three/fiber';

function RotatingBox() {
  const meshRef = React.useRef<any>();

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="cyan" />
    </mesh>
  );
}

export default function TestSetup() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>R3F Setup Test</Text>
      <Canvas style={styles.canvas}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <RotatingBox />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 24,
  },
  canvas: {
    flex: 1,
  },
});
```

Update **App.tsx**:

```typescript
import TestSetup from './src/test-setup';

export default function App() {
  return <TestSetup />;
}
```

Run the app:

```bash
npx expo start
```

Press `i` for iOS or `a` for Android.

**Expected Result**: You should see a rotating cyan cube. If you see this, your setup is correct!

## Common Issues and Solutions

### Issue: "Can't find variable: THREE"

**Solution**: Install three.js:

```bash
npm install three@^0.160.0
```

### Issue: "ExponentGLObjectManager is not defined"

**Solution**: New Architecture is enabled. Disable it (see above).

### Issue: "Module not found: @react-three/fiber"

**Solution**: Install R3F v8:

```bash
npm install @react-three/fiber@^8.17.0
```

### Issue: React 19 installed

**Solution**: Downgrade to React 18.2.0:

```bash
npm install react@18.2.0 react-dom@18.2.0 --save-exact
```

### Issue: Shader not loading

**Solution**: Verify `metro.config.js` and `glsl-transformer.js` are configured correctly.

## Next Steps

Now that your environment is configured:

1. Read **03-vac-model-reference.md** to understand the emotional model
2. Implement **04-soul-sphere-specification.md** to build the visualization
3. Add shaders from **05-shader-implementation.md**
