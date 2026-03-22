import {
  Scene, MeshBuilder, ShaderMaterial, Effect, Mesh,
} from '@babylonjs/core';

const BG_VERTEX = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 worldViewProjection;
  varying vec2 vUV;
  void main() {
    vUV = uv;
    gl_Position = worldViewProjection * vec4(position, 1.0);
  }
`;

/**
 * Soft radial glow over black.
 * Centered slightly above middle (where the avatar's torso is),
 * with a warm-cool gradient that creates depth without distraction.
 */
const BG_FRAGMENT = `
  precision highp float;
  varying vec2 vUV;
  void main() {
    // Center the glow slightly above midpoint (avatar framing)
    vec2 center = vec2(0.5, 0.55);
    float dist = length(vUV - center);

    // Warm inner glow — very subtle, like a softbox behind the avatar
    vec3 innerColor = vec3(0.12, 0.11, 0.13);   // warm dark purple-grey
    vec3 midColor   = vec3(0.06, 0.06, 0.08);    // cool dark blue-grey
    vec3 outerColor = vec3(0.02, 0.02, 0.03);    // near black

    // Two-stage radial falloff for natural depth
    float innerFade = smoothstep(0.0, 0.35, dist);
    float outerFade = smoothstep(0.35, 0.75, dist);

    vec3 color = mix(innerColor, midColor, innerFade);
    color = mix(color, outerColor, outerFade);

    gl_FragColor = vec4(color, 1.0);
  }
`;

/**
 * Dressing room background — soft radial glow over black.
 * Clean, non-distracting, keeps focus entirely on the avatar.
 */
export class Background {
  private mesh: Mesh;
  private material: ShaderMaterial;

  constructor(scene: Scene) {
    Effect.ShadersStore['avatarBgVertexShader'] = BG_VERTEX;
    Effect.ShadersStore['avatarBgFragmentShader'] = BG_FRAGMENT;

    this.material = new ShaderMaterial('bgMaterial', scene, 'avatarBg', {
      attributes: ['position', 'uv'],
      uniforms: ['worldViewProjection'],
    });

    this.material.backFaceCulling = false;
    this.material.disableDepthWrite = true;

    this.mesh = MeshBuilder.CreatePlane('background', { size: 100 }, scene);
    this.mesh.material = this.material;
    this.mesh.position.z = -10;
    this.mesh.rotation.y = Math.PI;
    this.mesh.isPickable = false;
    this.mesh.renderingGroupId = 0;
  }

  dispose(): void {
    this.material.dispose();
    this.mesh.dispose();
  }
}
