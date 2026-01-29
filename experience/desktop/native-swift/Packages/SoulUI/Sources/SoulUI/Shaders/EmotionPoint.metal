#include <metal_stdlib>
#include "SoulShaderTypes.h"
#include "SoulMath.h"

using namespace metal;

// MARK: - Point Cloud Shader

struct PointOut {
    float4 position [[position]];
    float4 color;
    float size [[point_size]];
    int mode [[flat]]; // NEW: Pass mode to fragment
    float4 quaternion [[flat]]; // NEW: Pass quaternion to fragment
};

vertex PointOut vertexPoint(uint instanceID [[instance_id]],
                            constant Uniforms &uniforms [[buffer(1)]],
                            const device PointInstance *points [[buffer(0)]]) {
    PointInstance p = points[instanceID];
    
    PointOut out;
    float4 initialPos = p.position;
    
    // Pass mode to fragment
    int mode = uniforms.mode; // NEW: Declare mode first!
    out.mode = mode;
    
    // Pass quaternion
    out.quaternion = p.quaternion;
    
    // Unique Seed per particle (based on ID)
    float seed = float(instanceID) * 0.132; 
    float time = uniforms.time;
    
    // Unique Breathing / Animation
    float3 offset = float3(0.0);
    
    switch (mode) {
        case 5: // Liquid - Float around
            offset.x = sin(time * 0.5 + seed) * 0.1;
            offset.y = cos(time * 0.3 + seed * 2.0) * 0.1;
            offset.z = sin(time * 0.2 + seed * 3.0) * 0.1;
            break;
            
        case 6: // Glitch - Jitter
            if (sin(time * 20.0 + seed) > 0.95) {
                offset = float3(sin(seed)*0.1, cos(seed)*0.1, 0.0);
            }
            break;
            
        case 2: // Mystical - Organic Noise Drift
            offset.x = snoise(float3(seed, time * 0.2, 0.0)) * 0.15;
            offset.y = snoise(float3(seed, time * 0.15, 10.0)) * 0.15;
            offset.z = snoise(float3(seed, time * 0.1, 20.0)) * 0.15;
            break;
            
        case 1: // Dynamic
        case 4: // Luminous
            float breath = sin(time * 1.0 + seed) * 0.02;
            offset = normalize(initialPos.xyz) * breath;
            break;
    }
    
    // Apply Quaternion Rotation to the Offset
    // This rotates the "character" of the movement to align with the emotion's VAC axis.
    offset = rotate_vector(offset, p.quaternion);
    
    float3 finalPos = initialPos.xyz + offset;
    
    out.position = uniforms.projectionMatrix * uniforms.viewMatrix * float4(finalPos, 1.0);
    out.color = p.color;
    
    // Selected Pulse
    float isSelected = p.props.x;
    float pulse = 0.0;
    if (isSelected > 0.5) {
        pulse = sin(time * 5.0) * 0.3;
    }
    
    // Mode Size Mods
    float modeScale = 1.0;
    if (mode == 5) modeScale = 1.2 + sin(time + seed) * 0.2; // Liquid bubbles
    if (mode == 4) modeScale = 1.5; // Luminous bigger
    if (mode == 2) modeScale = 0.8 + sin(time * 2.0 + seed) * 0.3; // Mystical twinkle size
    
    float baseSize = initialPos.w * modeScale;
    float finalSize = baseSize * (1.0 + pulse);
    
    // Distance Attenuation (Perspective Size)
    float dist = out.position.w; 
    float d = max(dist, 1.0);
    // Increased base size from 5.0 to 15.0 and scalar from 500.0 to 800.0 for "Bigger" request
    out.size = max(15.0, finalSize * (800.0 / d));
    
    return out;
}

fragment float4 fragmentPoint(PointOut in [[stage_in]], float2 pointCoord [[point_coord]]) {
    float2 coord = pointCoord * 2.0 - 1.0; // Map 0..1 to -1..1
    float dist = 0.0;
    
    // Shape Morphing based on Mode
    switch (in.mode) {
        case 6: // Glitch - Square
            dist = max(abs(coord.x), abs(coord.y)); // Infinity Norm
            break;
            
        case 3: // Crystalline - Diamond
            dist = (abs(coord.x) + abs(coord.y)) * 0.8; // 1-Norm
            break;
            
        case 0: // Subtle - Very Soft Circle
            dist = length(coord) * 1.2; 
            break;
            
        default: // Circle (Euclidean)
            dist = length(coord);
            break;
    }
    
    if (dist > 1.0) discard_fragment();
    
    // Alpha falloff
    float alpha = 1.0;
    if (in.mode == 0) {
        // Subtle: Linear falloff
        alpha = 1.0 - smoothstep(0.0, 1.0, dist);
    } else if (in.mode == 4) {
        // Luminous: Hot core
        alpha = 1.0 - smoothstep(0.1, 0.8, dist);
        alpha *= 1.5; // Boost
    } else {
        // Standard: Harder edge
        alpha = 1.0 - smoothstep(0.8, 1.0, dist);
    }
    
    float4 finalColor = in.color;
    
    // Color Tweaks
    if (in.mode == 4) { // Luminous - Boost brightness
        finalColor.rgb *= 2.0;
    }
    
    return float4(finalColor.rgb, finalColor.a * alpha);
}

// MARK: - Path Line (Passthrough)

struct LineOut {
    float4 position [[position]];
    float4 color;
};

vertex LineOut vertexLine(uint vertexID [[vertex_id]],
                          constant Uniforms &uniforms [[buffer(1)]],
                          const device LineVertex *vertices [[buffer(0)]]) {
    LineVertex v = vertices[vertexID];
    LineOut out;
    out.position = uniforms.projectionMatrix * uniforms.viewMatrix * float4(v.position, 1.0);
    out.color = v.color;
    return out;
}

fragment float4 fragmentLine(LineOut in [[stage_in]]) {
    return in.color;
}
