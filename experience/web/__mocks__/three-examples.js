/**
 * Mock for three/examples/jsm/* modules.
 *
 * Provides stub exports so Jest can resolve ESM imports from Three.js
 * without needing to transform the entire three package.
 */

class OrbitControls {
  constructor() {
    this.enabled = true;
    this.enableDamping = false;
    this.dampingFactor = 0.05;
    this.enablePan = true;
    this.enableZoom = true;
    this.minDistance = 0;
    this.maxDistance = Infinity;
  }

  update() {}
  dispose() {}
}

module.exports = {
  OrbitControls,
};
