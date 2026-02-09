# Turbopack GLSL Shader Loading Issue

**Status:** Known Issue
**Impact:** Shaders not loading in Turbopack mode
**Severity:** Medium (has workaround)

---

## Problem

Next.js 16 uses Turbopack by default, which doesn't recognize the GLSL loader configuration for shader files.

**Error:**
```
./web/shaders/fragment.glsl
Unknown module type
This module doesn't have an associated type. Use a known file extension, or register a loader for it.
```

---

## Solutions

### Option 1: Use Webpack Mode (Immediate Workaround)

Run Next.js with webpack instead of Turbopack:

```bash
cd experience/web
npm run dev -- --webpack
```

This bypasses Turbopack and uses the working webpack configuration with raw-loader.

### Option 2: Inline Shaders (Quick Fix)

Convert GLSL imports to inline strings:

```typescript
// Instead of:
import vertexShader from '@/shaders/vertex.glsl';

// Use:
const vertexShader = `
#ifdef GL_ES
precision highp float;
#endif
// ... rest of shader code
`;
```

### Option 3: Configure Turbopack Properly (Best Long-term)

Update `next.config.ts` with proper Turbopack loader syntax (attempted but may need different approach):

```typescript
turbopack: {
  rules: {
    '*.glsl': {
      loaders: ['raw-loader'],
      as: '*.js',
    },
  },
},
```

**Status:** Configured but may need adjustment per Next.js 16 docs.

### Option 4: Use .js Extension (Alternative)

Rename shaders to `.glsl.js` and export as strings:

```javascript
// vertex.glsl.js
export default `
#ifdef GL_ES
precision highp float;
#endif
// ... shader code
`;
```

---

## Recommended Immediate Action

**Use webpack mode** for now:

```bash
# Stop current dev server (Ctrl+C in terminal)
cd experience/web
npm run dev -- --webpack
```

This will work immediately while we research the proper Turbopack configuration.

---

## Long-term Solution

Once Turbopack GLSL loading is working:
1. Test with latest Next.js docs
2. Verify shader loading
3. Benchmark Turbopack vs webpack performance
4. Choose best approach

---

## References

- Next.js Turbopack loaders: https://nextjs.org/docs/app/api-reference/next-config-js/turbo#webpack-loaders
- Turbopack rules: https://turbo.build/pack/docs/features/customizing

---

**Updated:** December 4, 2025
**Status:** Workaround available (--webpack flag)
