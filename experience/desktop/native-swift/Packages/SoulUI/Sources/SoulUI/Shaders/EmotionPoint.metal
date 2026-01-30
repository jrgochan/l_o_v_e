#include <metal_stdlib>
#include "SoulShaderTypes.h"
#include "SoulMath.h"

using namespace metal;

// MARK: - Point Cloud Shader

struct PointOut {
    float4 position [[position]];
    float4 color;
    float size [[point_size]];
    int mode [[flat]];
    float4 props [[flat]]; // .x=Sel, .y=Hov, .z=Val, .w=Aro
    float4 extras [[flat]]; // .w = Connection
};

vertex PointOut vertexPoint(uint instanceID [[instance_id]],
                            constant Uniforms &uniforms [[buffer(1)]],
                            const device PointInstance *points [[buffer(0)]]) {
    PointInstance p = points[instanceID];
    
    PointOut out;
    float4 initialPos = p.position;
    
    int mode = uniforms.mode;
    out.mode = mode;
    out.props = p.props;
    // Pass Time in extras.x for animated fragment effects
    out.extras = float4(uniforms.time, 0.0, 0.0, p.quaternion.w); // .w = Connection
    
    // Unique Seed
    float seed = float(instanceID) * 0.132; 
    float time = uniforms.time;
    
    // Unpack VAC
    float arousal = p.props.w;

    // Movement Logic
    float3 offset = float3(0.0);
    
    // Base Breathing (All Modes)
    // High Arousal = Faster, more erratic breathing
    float breathSpeed = 1.0 + (arousal * 3.0);
    float breathAmp = 0.02 + (arousal * 0.05);
    
    switch (mode) {
        case 5: // Liquid
            offset.x = sin(time * 0.5 + seed) * 0.1;
            offset.y = cos(time * 0.3 + seed * 2.0) * 0.1;
            offset.z = sin(time * 0.2 + seed * 3.0) * 0.1;
            break;
            
        case 6: // Glitch
            if (sin(time * 20.0 + seed) > 0.9 + (1.0-arousal)*0.09) {
                // High arousal = more frequent glitches
                offset = float3(sin(seed)*0.1, cos(seed)*0.1, 0.0);
            }
            break;
            
        case 2: // Mystical
            offset.x = snoise(float3(seed, time * 0.2, 0.0)) * 0.15;
            offset.y = snoise(float3(seed, time * 0.15, 10.0)) * 0.15;
            offset.z = snoise(float3(seed, time * 0.1, 20.0)) * 0.15;
            break;
            
        case 0: // Subtle
        case 1: // Dynamic
        case 4: // Luminous
        case 3: // Crystalline
            float breath = sin(time * breathSpeed + seed) * breathAmp;
            offset = normalize(initialPos.xyz) * breath;
            break;
    }
    
    float3 finalPos = initialPos.xyz + offset;
    
    out.position = uniforms.projectionMatrix * uniforms.viewMatrix * float4(finalPos, 1.0);
    out.color = p.color;
    
    // Size Data
    float isSelected = p.props.x;
    float isHovered = p.props.y;
    
    float baseSize = initialPos.w;
    
    // Zoom/Scale Logic
    float scale = 1.0;
    if (isSelected > 0.5) scale *= 1.5;
    if (isHovered > 0.5) scale *= 1.25;
    
    // Mode Size
    if (mode == 4) scale *= 1.8; // Luminous = huge glow
    if (mode == 5) scale *= 1.3; // Liquid = bubbly
    
    float dist = out.position.w; 
    float d = max(dist, 1.0);
    
    // Perspective Division for Size
    out.size = max(10.0, (baseSize * scale * 1000.0) / d);
    
    return out;
}

fragment float4 fragmentPoint(PointOut in [[stage_in]], float2 pointCoord [[point_coord]]) {
    float2 coord = pointCoord * 2.0 - 1.0; // -1 to 1
    float r = length(coord);
    
    // Data Unpacking
    float time = in.extras.x;
    float arousal = in.props.w; // 0..1
    float connection = in.extras.w; // 0..1
    
    // 1. Shape Generation: The "Soul Ring"
    // Base Ring
    float ringThickness = 0.15;
    float ringRadius = 0.7;
    float ringSDF = abs(r - ringRadius) - ringThickness;
    float ringMask = 1.0 - smoothstep(0.0, 0.05, ringSDF);
    
    // Inner Glow (Core)
    float coreMask = 1.0 - smoothstep(0.0, 0.6, r);
    
    // Combined Mask
    float mask = ringMask + (coreMask * 0.4); // Ring + faint core
    
    // Discard empty space
    if (mask <= 0.01) discard_fragment();
    
    // 2. Color Modulation (Soul Palette)
    // Map Valence/Arousal to vibrant Soul Colors
    // High Arousal (>0.5) -> Gold/Warm
    // Low Arousal (<0.5) -> Teal/Cool
    // High Valence (>0) -> Rose/Pink
    // Low Valence (<0) -> Deep Blue/Purple
    
    float3 colorWarm = float3(1.0, 0.8, 0.4); // Gold
    float3 colorCool = float3(0.1, 0.7, 0.8); // Teal
    float3 colorJoy = float3(1.0, 0.4, 0.7);  // Rose
    float3 colorMelancholy = float3(0.2, 0.2, 0.9); // Deep Blue
    
    float3 baseColor = mix(colorCool, colorWarm, arousal);
    baseColor = mix(baseColor, colorMelancholy, clamp(-in.props.z, 0.0, 1.0)); // Mix in sadness
    baseColor = mix(baseColor, colorJoy, clamp(in.props.z, 0.0, 1.0)); // Mix in joy
    
    // Sparkle effect for "Alive" feel
    float sparkle = sin(coord.x * 10.0 + time * 5.0) * sin(coord.y * 10.0 + time * 3.0);
    if (sparkle > 0.8) baseColor += 0.3;

    // 3. Final Alpha & Glow
    float alpha = in.color.a * mask;
    
    // Boost glow on selection/hover
    if (in.props.x > 0.5) { // Selected
        alpha += 0.3;
        baseColor += 0.2;
    }
    
    return float4(baseColor, alpha);
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
