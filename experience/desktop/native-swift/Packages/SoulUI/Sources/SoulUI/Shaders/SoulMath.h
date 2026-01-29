#ifndef SOUL_MATH_H
#define SOUL_MATH_H

#ifdef __METAL_VERSION__
#include <metal_stdlib>
using namespace metal;

// MARK: - Noise Functions
// 3D Simplex noise for organic displacement
// Source: https://github.com/stegu/webgl-noise (MIT)
inline float3 mod289(float3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
inline float4 mod289(float4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
inline float4 permute(float4 x) { return mod289(((x * 34.0) + 1.0) * x); }
inline float4 taylorInvSqrt(float4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

inline float snoise(float3 v) {
  const float2 C = float2(1.0 / 6.0, 1.0 / 3.0);
  const float4 D = float4(0.0, 0.5, 1.0, 2.0);

  // First corner
  float3 i = floor(v + dot(v, C.yyy));
  float3 x0 = v - i + dot(i, C.xxx);

  // Other corners
  float3 g = step(x0.yzx, x0.xyz);
  float3 l = 1.0 - g;
  float3 i1 = min(g.xyz, l.zxy);
  float3 i2 = max(g.xyz, l.zxy);
  float3 x1 = x0 - i1 + C.xxx;
  float3 x2 = x0 - i2 + C.yyy;
  float3 x3 = x0 - D.yyy;

  // Permutations
  i = mod289(i);
  float4 p = permute(permute(permute(i.z + float4(0.0, i1.z, i2.z, 1.0)) + i.y +
                             float4(0.0, i1.y, i2.y, 1.0)) +
                     i.x + float4(0.0, i1.x, i2.x, 1.0));

  // Gradients
  float n_ = 0.142857142857;
  float3 ns = n_ * D.wyz - D.xzx;
  float4 j = p - 49.0 * floor(p * ns.z * ns.z);
  float4 x_ = floor(j * ns.z);
  float4 y_ = floor(j - 7.0 * x_);
  float4 x = x_ * ns.x + ns.yyyy;
  float4 y = y_ * ns.x + ns.yyyy;
  float4 h = 1.0 - abs(x) - abs(y);
  float4 b0 = float4(x.xy, y.xy);
  float4 b1 = float4(x.zw, y.zw);
  float4 s0 = floor(b0) * 2.0 + 1.0;
  float4 s1 = floor(b1) * 2.0 + 1.0;
  float4 sh = -step(h, float4(0.0));
  float4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  float4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  float3 p0 = float3(a0.xy, h.x);
  float3 p1 = float3(a0.zw, h.y);
  float3 p2 = float3(a1.xy, h.z);
  float3 p3 = float3(a1.zw, h.w);
  float4 norm =
      taylorInvSqrt(float4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  float4 m = max(
      0.5 - float4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 *
         dot(m * m, float4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// MARK: - Quaternion Functions

/**
 * Rotates a vector by a unit quaternion.
 * q = (x, y, z, w) where w is scalar.
 * Reference:
 * https://gamedev.stackexchange.com/questions/28395/rotating-vector3-by-a-quaternion
 */
inline float3 rotate_vector(float3 v, float4 q) {
  // Extract vector part of quaternion
  float3 qv = q.xyz; // (x, y, z)
  float qw = q.w;    // w

  // Calculate intermediate values
  float3 t = 2.0 * cross(qv, v);

  // Apply rotation
  return v + qw * t + cross(qv, t);
}
#endif
#endif
