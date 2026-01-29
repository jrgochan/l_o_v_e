#include <metal_stdlib>
#include "SoulShaderTypes.h"
#include "SoulMath.h"

using namespace metal;

// MARK: - Scene Logic

float applyDisplacement(float3 p, int mode, float time, float arousal) {
    float3 q = p;
    float noiseVal = 0.0;
    
    // Base params
    float speed = 0.5 + (arousal * 2.0);
    float freq = 1.6 + (arousal * 1.5);
    
    // Modes
    // 0: Subtle, 1: Dynamic, 2: Mystical, 3: Crystalline, 4: Luminous, 5: Liquid, 6: Glitch
    
    switch (mode) {
        case 0: // Subtle: Low freq, low amp
            noiseVal = snoise((q * 1.0) + (time * 0.2)) * 0.5;
            break;
            
        case 2: // Mystical: Flowing, soft
            noiseVal = snoise((q * 0.8) + (time * 0.3));
            noiseVal += snoise((q * 2.0) - (time * 0.2)) * 0.2;
            break;
            
        case 3: // Crystalline: Stepped noise
        {
            float n = snoise((q * 2.0) + (time * 0.1));
            // Faceting via stepping
            float stepped = floor(n * 4.0) / 4.0;
            noiseVal = stepped;
        }
            break;
            
        case 5: // Liquid: Sine waves + Noise
            noiseVal = sin(q.y * 4.0 + time) * 0.3 + sin(q.x * 4.0 + time * 0.8) * 0.3;
            noiseVal += snoise(q * 3.0 + time) * 0.1;
            break;
            
        case 6: // Glitch: Jitter
        {
            float jitter = sin(time * 50.0) > 0.9 ? 0.2 : 0.0;
            float block = floor(q.y * 5.0);
            float offset = sin(block * 132.4 + time * 10.0) * jitter;
            noiseVal = snoise(float3(q.x + offset, q.y, q.z) * 2.0 + time);
        }
            break;
            
        case 4: // Luminous: Plasma-like high frequency, low amplitude
            noiseVal = snoise((q * freq * 2.0) + (time * speed * 3.0)) * 0.3;
            noiseVal += snoise((q * freq * 4.0) - (time * speed)) * 0.15;
            break;

        case 1: // Dynamic
        default:
            noiseVal = snoise((q * freq) + (time * speed));
            break;
    }
    
    return noiseVal;
}

// Sphere Distance Field (SDF) with Domain Warping
float map(float3 p, float time, float arousal, float audioLevel, int mode) {
    float displacement = applyDisplacement(p, mode, time, arousal);
    
    float baseRadius = 2.2;
    float lifeForce = max(0.3, abs(arousal));
    
    // Audio Reactivity: Pulse size with volume
    float audioPulse = audioLevel * 0.5;
    
    return length(p) - (baseRadius + displacement * 0.15 * lifeForce + audioPulse);
}

float3 getNormal(float3 p, float time, float arousal, float audioLevel, int mode) {
    float2 e = float2(0.001, 0.0);
    return normalize(float3(
        map(p + e.xyy, time, arousal, audioLevel, mode) - map(p - e.xyy, time, arousal, audioLevel, mode),
        map(p + e.yxy, time, arousal, audioLevel, mode) - map(p - e.yxy, time, arousal, audioLevel, mode),
        map(p + e.yyx, time, arousal, audioLevel, mode) - map(p - e.yyx, time, arousal, audioLevel, mode)
    ));
}

struct FragmentOut {
    float4 color [[color(0)]];
    float depth [[depth(any)]];
};

fragment FragmentOut liquidSoul(VertexOut in [[stage_in]],
                                constant Uniforms &uniforms [[buffer(0)]]) {
    FragmentOut out;
    
    float time = uniforms.time;
    int mode = uniforms.mode;
    float valence = uniforms.vibe.x;
    float arousal = uniforms.vibe.y;
    float connection = uniforms.vibe.z;
    float audioLevel = uniforms.audioLevel; // NEW
    
    float2 uv = in.uv * 2.0 - 1.0;
    uv.x *= (uniforms.resolution.x / uniforms.resolution.y);
    
    float3 ro = float3(uniforms.invViewMatrix[3].xyz);
    float4 target = uniforms.invViewMatrix * float4(uv.x, uv.y, -1.0, 1.0);
    float3 rd = normalize(target.xyz / target.w - ro);
    
    float t = 0.0;
    bool hit = false;
    float tMax = 20.0;
    
    // Raymarching
    for (int i = 0; i < 64; i++) {
        float3 p = ro + rd * t;
        float d = map(p, time, arousal, audioLevel, mode);
        
        if (d < 0.001) {
            hit = true;
            break;
        }
        t += d;
        if (t > tMax) break;
    }

    if (hit) {
        float3 p = ro + rd * t;
        float3 n = getNormal(p, time, arousal, audioLevel, mode);
        
        // Basic Lighting
        float3 lightPos = float3(2.0, 2.0, 3.0);
        float3 l = normalize(lightPos - p);
        float3 v = normalize(ro - p); 
        float3 h = normalize(l + v); 
        float diff = max(dot(n, l), 0.0);
        float spec = pow(max(dot(n, h), 0.0), 32.0);
        
        // Base Colors
        float3 colorA = float3(0.05, 0.1, 0.3); // Deep Space Blue
        float3 colorB = float3(0.0, 0.8, 0.9);  // Electric Cyan
        if (valence < -0.1) colorB = float3(0.9, 0.0, 0.5); // Magenta
        float3 baseColor = mix(colorA, colorB, abs(valence) * 0.6 + 0.2);
        
        // Audio Boost for Base Color
        baseColor += float3(0.2, 0.1, 0.5) * audioLevel;
        
        float3 col = baseColor * (diff * 0.5 + 0.5);
        
        // Mode Specific Coloring
        switch (mode) {
            case 3: // Crystalline
                spec = pow(max(dot(n, h), 0.0), 128.0); // Sharp specular
                col += float3(0.8, 0.9, 1.0) * spec * 2.0;
                col += float3(0.1, 0.2, 0.3) * (1.0 - diff);
                
                // Audio sparkle
                col += float3(1.0) * audioLevel * spec;
                break;
                
            case 4: // Luminous
                col += baseColor * 2.0; // Glow
                col += float3(1.0) * spec;
                {
                    float pulse = sin(time * 3.0) * 0.5 + 0.5;
                    col += baseColor * (pulse + audioLevel * 2.0) * 0.5; // Audio Pulse
                }
                break;
                
            case 5: // Liquid
                spec = pow(max(dot(n, h), 0.0), 64.0);
                col += float3(1.0) * spec;
                // Iridescence
                {
                    float3 irid;
                    irid.r = sin(n.x * 10.0 + time);
                    irid.g = sin(n.y * 10.0 + time + 2.0);
                    irid.b = sin(n.z * 10.0 + time + 4.0);
                    col += irid * (0.3 + audioLevel * 0.5) * spec; // Audio Irid
                }
                break;
                
            case 6: // Glitch
                // Matrix Green tint
                col = mix(col, float3(0.0, 1.0, 0.0), 0.2);
                // Scanlines
                if (sin(in.uv.y * 100.0 + time * 5.0) > 0.9) {
                     col *= 0.5;
                }
                break;
                
            default:
                col += float3(1.0) * spec;
                break;
        }
        
        // Chromatic Fresnel (Shared)
        float3 chromeFresnel = float3(
            pow(1.0 - max(dot(n, v), 0.0), 3.0),
            pow(1.0 - max(dot(n, v), 0.0), 3.1),
            pow(1.0 - max(dot(n, v), 0.0), 3.2)
        );
        col += baseColor * chromeFresnel * (1.0 + connection);
        
        // Alpha / Transparency
        float alphaFresnel = pow(1.0 - max(dot(n, v), 0.0), 2.5);
        float alpha = clamp(0.05 + alphaFresnel * 0.95, 0.0, 1.0);
        
        // Crystalline is more transparent per face
        if (mode == 3) alpha = clamp(0.0 + alphaFresnel * 0.9, 0.0, 1.0);
        if (mode == 4) alpha = 0.4 + alphaFresnel * 0.6; // Luminous is denser
        
        out.color = float4(col, alpha);
        
        float4 clipPos = uniforms.projectionMatrix * uniforms.viewMatrix * float4(p, 1.0);
        out.depth = clipPos.z / clipPos.w;
        
        return out;
    }
    
    out.color = float4(0.0);
    out.depth = 1.0; 
    return out; 
}

// MARK: - Passthrough for Quad

vertex VertexOut vertexPassthrough(uint vertexID [[vertex_id]]) {
    const float2 vertices[] = {
        float2(-1, -1),
        float2( 1, -1),
        float2(-1,  1), 
        float2(-1,  1),
        float2( 1, -1),
        float2( 1,  1)
    };
    
    float2 pos = vertices[vertexID];
    
    VertexOut out;
    out.position = float4(pos, 0, 1);
    out.uv = pos * 0.5 + 0.5;
    return out;
}
