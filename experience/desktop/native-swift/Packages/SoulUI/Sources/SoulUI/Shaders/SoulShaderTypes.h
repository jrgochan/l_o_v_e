#ifndef SOUL_SHADER_TYPES_H
#define SOUL_SHADER_TYPES_H

#ifdef __METAL_VERSION__
#include <metal_stdlib>
using namespace metal;

struct Uniforms {
  float time;
  int mode; // 0:Subtle, 1:Dynamic, 2:Mystical, 3:Crystalline, 4:Luminous,
            // 5:Liquid, 6:Glitch
  float2 resolution;
  float3 vibe;
  float audioLevel; // NEW: Real-time audio intensity
  float3 _padding2;

  float4x4 viewMatrix;
  float4x4 projectionMatrix;
  float4x4 invViewMatrix;
};

struct PointInstance {
  float4 position;
  float4 color;
  float4 props;
  float4 quaternion;
};

struct LineVertex {
  float3 position;
  float4 color;
};

struct VertexOut {
  float4 position [[position]];
  float2 uv;
};
#endif
#endif
