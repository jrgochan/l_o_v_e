#ifdef GL_ES
precision highp float;
#endif

//
// Soul Sphere Fragment Shader
// Maps Valence to color and Connection to Fresnel glow
//

// Uniforms from Three.js and our custom material
uniform float uValence;      // -1.0 (negative) to +1.0 (positive)
uniform float uConnection;   // -1.0 (disconnected) to +1.0 (connected)
uniform vec3 uColorNeg;      // Crimson for negative valence
uniform vec3 uColorPos;      // Cyan for positive valence
uniform vec3 uCameraPosition;

// Varyings from vertex shader
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

void main() {
  // ===== VALENCE → COLOR =====
  // Map valence [-1, 1] to color gradient [crimson, cyan]
  float mixFactor = (uValence + 1.0) * 0.5; // Remap to [0, 1]

  // Use smoothstep for gradual transitions
  float smoothMix = smoothstep(-1.0, 1.0, uValence);

  // Interpolate between negative and positive colors
  vec3 baseColor = mix(uColorNeg, uColorPos, smoothMix);

  // ===== CONNECTION → FRESNEL GLOW =====
  // Calculate view direction
  vec3 viewDir = normalize(uCameraPosition - vWorldPosition);

  // Fresnel effect: dot product of view and normal
  // 1.0 = looking straight at surface
  // 0.0 = grazing angle (edge)
  float fresnel = dot(viewDir, normalize(vNormal));

  // Invert so edges glow more
  fresnel = 1.0 - abs(fresnel);

  // Apply power curve for sharper edge glow
  fresnel = pow(fresnel, 2.5);

  // Scale fresnel by connection value
  // High connection = glowing edges
  // Low connection = opaque, no glow
  float glowIntensity = fresnel * max(0.0, uConnection + 0.5);

  // Add glow to base color
  vec3 glowColor = vec3(1.0, 1.0, 1.0); // White glow
  vec3 finalColor = baseColor + (glowColor * glowIntensity * 0.6);

  // ===== ALPHA CALCULATION =====
  // High connection = more transparent (ethereal)
  // Low connection = more opaque (solid, heavy)
  float alpha = 1.0;

  if (uConnection > 0.0) {
    // Positive connection: semi-transparent with edge glow
    alpha = 0.85 - (uConnection * 0.3) + (fresnel * 0.4);
  } else {
    // Negative connection: solid and opaque
    alpha = 1.0;
  }

  // Clamp alpha to valid range
  alpha = clamp(alpha, 0.3, 1.0);

  // ===== LIGHTING ENHANCEMENT =====
  // Add subtle ambient term
  vec3 ambient = finalColor * 0.3;

  // Simple diffuse lighting from view direction
  float diffuse = max(dot(normalize(vNormal), viewDir), 0.0);
  vec3 diffuseColor = finalColor * diffuse * 0.7;

  // Combine
  vec3 litColor = ambient + diffuseColor;

  // Output final color
  gl_FragColor = vec4(litColor, alpha);
}
