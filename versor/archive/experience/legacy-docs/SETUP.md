# Experience Module - Setup Guide

## Prerequisites

- **Node.js**: v18.x or v20.x (check with `node --version`)
- **npm**: v9.x or later (check with `npm --version`)
- **Expo CLI**: Install globally with `npm install -g expo-cli`
- **macOS**: Xcode 15+ (for iOS development)
- **iOS Simulator** or **physical device** for testing

## Quick Start

### Step 1: Install Dependencies

```bash
cd /Users/jrgochan/code/gitlab.com/l_o_v_e/experience
npm install
```

This will install:
- React 18.2.0 (locked version)
- React Three Fiber v8.17.0
- Three.js 0.160.0
- Expo SDK 52
- And all other dependencies

**⚠️ CRITICAL**: If npm tries to upgrade React to 19.x, abort and run:
```bash
npm install react@18.2.0 react-dom@18.2.0 --save-exact
```

### Step 2: Verify Installation

```bash
npm list react @react-three/fiber three
```

Expected output:
```
├── react@18.2.0
├── @react-three/fiber@8.17.x
└── three@0.160.x
```

### Step 3: Start Development Server

```bash
npm start
```

This will:
1. Start the Expo dev server
2. Display a QR code
3. Open Expo DevTools in your browser

### Step 4: Run on iOS Simulator

Press `i` in the terminal, or run:
```bash
npm run ios
```

**Expected Result**:
- App launches in iOS Simulator
- You see a **rotating cyan cube**
- Status bar shows: ✓ React 18.2.0, ✓ R3F v8.17, ✓ Legacy Bridge
- No errors in console

### Step 5: Verify 60fps

In the Expo DevTools, check the Performance tab. You should see:
- **Frame rate: ~60fps**
- No dropped frames
- No "ExponentGLObjectManager" errors

## Troubleshooting

### Issue: "Can't find variable: THREE"

**Cause**: Three.js not installed
**Solution**:
```bash
npm install three@^0.160.0
```

### Issue: "ExponentGLObjectManager is not defined"

**Cause**: New Architecture is enabled
**Solution**: Verify `app.json` has `newArchEnabled: false` in both iOS and Android sections. Then rebuild:
```bash
rm -rf node_modules .expo ios android
npm install
npm run ios
```

### Issue: React 19 installed instead of 18.2

**Cause**: npm/Expo auto-upgraded React
**Solution**:
```bash
npm install react@18.2.0 react-dom@18.2.0 --save-exact
npm install
```

### Issue: "Module not found: @react-three/fiber"

**Cause**: R3F not installed
**Solution**:
```bash
npm install @react-three/fiber@^8.17.0
```

### Issue: TypeScript errors in App.tsx

**Cause**: Dependencies not installed yet
**Solution**: Run `npm install` and restart VS Code

### Issue: Blank screen / app crashes

**Cause**: Likely New Architecture or version mismatch
**Solution**:
1. Check `app.json` for `newArchEnabled: false`
2. Verify React version with `npm list react`
3. Check console logs for specific error
4. Try: `expo start --clear`

## Project Structure Created

```
experience/
├── App.tsx                  # Main app entry point (rotating cube test)
├── package.json             # Dependencies (React 18.2.0 locked)
├── tsconfig.json            # TypeScript config with path aliases
├── app.json                 # Expo config (New Architecture disabled)
├── babel.config.js          # Babel with module-resolver
├── metro.config.js          # Metro bundler (GLSL support)
├── glsl-transformer.js      # GLSL → string transformer
├── .gitignore               # Git ignore patterns
└── SETUP.md                 # This file
```

## Next Steps

Once the rotating cube test works:

1. **✅ Phase 1 Complete**: R3F validated on mobile
2. **Phase 2**: Implement Soul Sphere component
3. **Phase 3**: Add shaders (vertex + fragment)
4. **Phase 4**: Integrate with Observer API

## Verification Checklist

- [ ] `npm install` completed without errors
- [ ] React version is 18.2.0 (not 19.x)
- [ ] R3F version is 8.x (not 9.x)
- [ ] App runs on iOS Simulator
- [ ] Rotating cube visible
- [ ] Frame rate ~60fps
- [ ] No console errors
- [ ] Status bar shows all green checks

## Configuration Summary

| Setting | Value | Why |
|---------|-------|-----|
| React | 18.2.0 | R3F v8 requires React 18 |
| R3F | 8.17.0 | React 19 not stable, v9 incompatible |
| Three.js | 0.160.0 | Peer dependency of R3F v8 |
| New Architecture | Disabled | expo-gl incompatible with Fabric |
| Bridge Mode | Legacy | Required for expo-gl WebGL context |

## Development Commands

```bash
# Start dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Type check
npm run type-check

# Lint
npm run lint

# Clear cache
expo start --clear
```

## Performance Targets

| Device | Target FPS | Geometry Detail |
|--------|-----------|-----------------|
| iPhone 13+ | 60fps | detail=20 |
| iPhone 11-12 | 60fps | detail=15 |
| iPhone X | 30-60fps | detail=10 |

## Integration with Observer/Versor

The Experience module will connect to:
- **Observer API**: `http://localhost:8000/observer/current/{user_id}`
- **Versor API**: `http://localhost:8001/versor/calculate` (optional, Observer already uses it)

These integrations will be added in **Phase 3**.

---

**Ready to build?** Run `npm install` and let's validate the foundation!
