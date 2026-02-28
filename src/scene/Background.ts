import {
  Scene, MeshBuilder, ShaderMaterial, Effect, Mesh, Texture, Vector2,
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

/** Gradient-only fallback. */
const BG_FRAGMENT_GRADIENT = `
  precision highp float;
  varying vec2 vUV;
  void main() {
    vec3 bottomColor = vec3(0.10, 0.10, 0.12);
    vec3 topColor = vec3(0.20, 0.20, 0.24);
    vec3 color = mix(bottomColor, topColor, vUV.y);
    gl_FragColor = vec4(color, 1.0);
  }
`;

/** Textured background with tiling and vignette. */
const BG_FRAGMENT_TEXTURED = `
  precision highp float;
  varying vec2 vUV;
  uniform sampler2D bgTexture;
  uniform vec2 uvScale;
  void main() {
    vec2 tiledUV = fract(vUV * uvScale + vec2(0.5, 0.0));
    vec3 tex = texture2D(bgTexture, tiledUV).rgb;

    // Vignette: darken edges for depth
    vec2 center = vUV - 0.5;
    float vignette = 1.0 - dot(center, center) * 1.6;
    vignette = clamp(vignette, 0.0, 1.0);

    // Slight desaturation to keep focus on avatar
    float lum = dot(tex, vec3(0.299, 0.587, 0.114));
    vec3 desaturated = mix(vec3(lum), tex, 0.7);

    gl_FragColor = vec4(desaturated * vignette, 1.0);
  }
`;

/**
 * Background for the dressing room.
 * Supports either a gradient (default) or a textured backdrop.
 */
export class Background {
  private mesh: Mesh;
  private material: ShaderMaterial;
  private bgTexture: Texture | null = null;

  constructor(scene: Scene, texturePath?: string) {

    if (texturePath) {
      Effect.ShadersStore['avatarBgTexVertexShader'] = BG_VERTEX;
      Effect.ShadersStore['avatarBgTexFragmentShader'] = BG_FRAGMENT_TEXTURED;

      this.material = new ShaderMaterial('bgMaterial', scene, 'avatarBgTex', {
        attributes: ['position', 'uv'],
        uniforms: ['worldViewProjection', 'uvScale'],
        samplers: ['bgTexture'],
      });

      this.bgTexture = new Texture(texturePath, scene);
      this.bgTexture.wrapU = Texture.WRAP_ADDRESSMODE;
      this.bgTexture.wrapV = Texture.WRAP_ADDRESSMODE;
      this.material.setTexture('bgTexture', this.bgTexture);
      this.material.setVector2('uvScale', new Vector2(5.0, 10.0)); // 20% H, 10% V
    } else {
      Effect.ShadersStore['avatarBgVertexShader'] = BG_VERTEX;
      Effect.ShadersStore['avatarBgFragmentShader'] = BG_FRAGMENT_GRADIENT;

      this.material = new ShaderMaterial('bgMaterial', scene, 'avatarBg', {
        attributes: ['position', 'uv'],
        uniforms: ['worldViewProjection'],
      });
    }

    this.material.backFaceCulling = false;
    this.material.disableDepthWrite = true;

    this.mesh = MeshBuilder.CreatePlane('background', { size: 100 }, scene);
    this.mesh.material = this.material;
    this.mesh.position.z = -10; // Behind avatar (camera is at +Z)
    this.mesh.rotation.y = Math.PI; // Face toward camera
    this.mesh.isPickable = false;
    this.mesh.renderingGroupId = 0;
  }

  dispose(): void {
    this.bgTexture?.dispose();
    this.material.dispose();
    this.mesh.dispose();
  }
}
