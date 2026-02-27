import { Scene, MeshBuilder, ShaderMaterial, Effect, Mesh } from '@babylonjs/core';

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

const BG_FRAGMENT = `
  precision highp float;
  varying vec2 vUV;
  void main() {
    vec3 bottomColor = vec3(0.10, 0.10, 0.12);
    vec3 topColor = vec3(0.20, 0.20, 0.24);
    vec3 color = mix(bottomColor, topColor, vUV.y);
    gl_FragColor = vec4(color, 1.0);
  }
`;

/**
 * Neutral gradient background for the dressing room.
 * Full-screen plane rendered behind everything.
 * Same custom ShaderMaterial pattern as Glitch's GridFloor.
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
    this.mesh.position.z = 10;
    this.mesh.isPickable = false;
    this.mesh.renderingGroupId = 0;
  }

  dispose(): void {
    this.material.dispose();
    this.mesh.dispose();
  }
}
