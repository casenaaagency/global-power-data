import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three'

export interface FieldTier {
  count: number
  dpr: number
  sizeCap: number
  glints: boolean
  driftScale: number
}

/**
 * The Drifting Field — a vast, near-black field of fine points that reads as
 * texture, never as "particles". One draw call, all motion in-shader. Depth
 * gives free perspective parallax as the camera dollies on scroll. A handful of
 * the nearest points catch cyan-soft ONLY in the wake of the current's head —
 * glints are caused, not ambient.
 */
const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uVel;
  uniform float uSize;
  uniform float uDriftScale;
  attribute float aSeed;
  attribute float aDepth;     // 0 = nearest, 1 = farthest
  varying float vDepth;
  varying float vViewZ;
  varying vec2 vScreen;

  void main() {
    vec3 p = position;

    // Pure-sine idle drift, amplitude scaled by depth; stiller as the user
    // scrolls faster (the world holding its breath).
    float amp = uDriftScale * mix(0.06, 0.012, aDepth) * (1.0 - 0.45 * uVel);
    p.x += sin(uTime * 0.10 + aSeed * 6.2831) * amp;
    p.y += sin(uTime * 0.075 + aSeed * 12.9) * amp * 0.8;
    p.z += sin(uTime * 0.06 + aSeed * 3.1) * amp * 0.5;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec4 clip = projectionMatrix * mv;
    gl_Position = clip;

    vViewZ = -mv.z;
    vDepth = aDepth;
    vScreen = (clip.xy / clip.w) * 0.5 + 0.5;

    gl_PointSize = clamp(uSize * (90.0 / vViewZ), 0.6, uSize);
  }
`

const FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uBase;
  uniform vec3 uGlint;
  uniform vec3 uFog;
  uniform float uFogNear;
  uniform float uFogFar;
  uniform vec2 uHead;
  uniform float uHeadStrength;
  uniform float uGlintOn;
  varying float vDepth;
  varying float vViewZ;
  varying vec2 vScreen;

  // cheap hash for ordered-dither — kills banding in the near-black gradient
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    // soft round sprite
    float sprite = smoothstep(0.5, 0.08, d);

    // far wall: dissolve into black, no visible boundary
    float fog = 1.0 - smoothstep(uFogNear, uFogFar, vViewZ);

    // base alpha leashed; nearer points a touch brighter
    float alpha = sprite * fog * mix(0.32, 0.10, vDepth);

    vec3 col = uBase;

    // glints: only the nearest band, only in the wake of the current head
    if (uGlintOn > 0.5 && vDepth < 0.13) {
      float prox = 1.0 - smoothstep(0.0, 0.16, distance(vScreen, uHead));
      float glint = prox * uHeadStrength * (1.0 - vDepth / 0.13);
      col = mix(col, uGlint, clamp(glint, 0.0, 0.6));
      alpha += glint * 0.25 * sprite;
    }

    // dither
    col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;

    gl_FragColor = vec4(mix(uFog, col, fog), alpha);
  }
`

export class Field {
  private renderer: WebGLRenderer
  private scene = new Scene()
  private camera: PerspectiveCamera
  private points: Points
  private material: ShaderMaterial
  private baseCamZ = 60
  private dpr: number
  private headStrengthTarget = 0
  private vel = 0

  constructor(canvas: HTMLCanvasElement, tier: FieldTier) {
    this.dpr = tier.dpr
    this.renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(this.dpr)

    this.camera = new PerspectiveCamera(55, 1, 0.1, 200)
    this.camera.position.z = this.baseCamZ

    const geo = new BufferGeometry()
    const n = tier.count
    const pos = new Float32Array(n * 3)
    const seed = new Float32Array(n)
    const depth = new Float32Array(n)
    const spreadX = 110
    const spreadY = 70

    for (let i = 0; i < n; i++) {
      // bias toward far (depth^1.7) so points cluster deep and emerge forward
      const t = Math.pow(Math.random(), 1.7)
      const z = -t * 150 // 0 (near) .. -150 (far)
      pos[i * 3 + 0] = (Math.random() - 0.5) * spreadX * (0.6 + t)
      pos[i * 3 + 1] = (Math.random() - 0.5) * spreadY * (0.6 + t)
      pos[i * 3 + 2] = z
      seed[i] = Math.random()
      depth[i] = t
    }
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
    geo.setAttribute('aSeed', new Float32BufferAttribute(seed, 1))
    geo.setAttribute('aDepth', new Float32BufferAttribute(depth, 1))

    this.material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uVel: { value: 0 },
        uSize: { value: tier.sizeCap * this.dpr },
        uDriftScale: { value: tier.driftScale },
        uBase: { value: new Color('#1f3a4f') },
        uGlint: { value: new Color('#5fb8cc') },
        uFog: { value: new Color('#08090b') },
        uFogNear: { value: 60 },
        uFogFar: { value: 205 },
        uHead: { value: [0.5, 0.5] },
        uHeadStrength: { value: 0 },
        uGlintOn: { value: tier.glints ? 1 : 0 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })

    this.points = new Points(geo, this.material)
    this.scene.add(this.points)
  }

  setSize(w: number, h: number): void {
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  /** scroll 0..1 across the hero dollies the camera forward (parallax). */
  setScroll(p: number): void {
    this.camera.position.z = this.baseCamZ - p * 26
  }

  setVelocity(v: number): void {
    this.vel = Math.min(1, Math.abs(v))
  }

  /** Current head in screen space (0..1) + how strongly it lights the wake. */
  setHead(x: number, y: number, strength: number): void {
    const u = this.material.uniforms
    ;(u.uHead.value as number[])[0] = x
    ;(u.uHead.value as number[])[1] = 1 - y // GL screen origin is bottom-left
    this.headStrengthTarget = strength
  }

  render(timeSec: number): void {
    const u = this.material.uniforms
    u.uTime.value = timeSec
    u.uVel.value += (this.vel - u.uVel.value) * 0.08
    u.uHeadStrength.value +=
      (this.headStrengthTarget - u.uHeadStrength.value) * 0.12
    this.vel *= 0.9
    this.renderer.render(this.scene, this.camera)
  }

  /** Reduced-motion: render exactly one art-directed frame, never loop. */
  renderStill(): void {
    this.material.uniforms.uTime.value = 2.0
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    this.points.geometry.dispose()
    this.material.dispose()
    this.renderer.dispose()
  }
}
