#include <metal_stdlib>
#include <SwiftUI/SwiftUI.h>
using namespace metal;

[[ stitchable ]] float2 wave(float2 position, float time) {
    return position + float2(sin(time + position.y / 20), sin(time + position.x / 20)) * 5;
}

[[ stitchable ]] float4 soulOrb(float2 position, half4 color, float2 size, float time, float valence, float arousal) {
    float2 uv = position / size;
    uv = uv * 2.0 - 1.0;
    
    // Circle SDF
    float d = length(uv);
    
    // Organic Distortion
    float angle = atan2(uv.y, uv.x);
    float radius = 0.5 + 0.1 * sin(angle * 5.0 + time * 2.0 + arousal * 5.0);
    radius += 0.05 * sin(angle * 10.0 - time * 3.0);
    
    // Core Color
    float3 joyColor = float3(0.9, 0.5, 0.2);
    float3 sadColor = float3(0.1, 0.2, 0.5);
    float3 baseColor = mix(sadColor, joyColor, valence * 0.5 + 0.5);
    
    // Glow
    float glow = 0.01 / abs(d - radius);
    glow = pow(glow, 1.2);
    
    // Alpha
    float alpha = smoothstep(radius + 0.1, radius, d);
    alpha += glow;
    
    return float4(float3(baseColor * alpha), alpha);
}
