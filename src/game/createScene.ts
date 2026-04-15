import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera'
import '@babylonjs/core/Cameras/Inputs/arcRotateCameraMouseWheelInput'
import '@babylonjs/core/Cameras/Inputs/arcRotateCameraPointersInput'
import { Engine } from '@babylonjs/core/Engines/engine'
import { PointerEventTypes } from '@babylonjs/core/Events/pointerEvents'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import { Effect } from '@babylonjs/core/Materials/effect'
import { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector'
import { LinesMesh } from '@babylonjs/core/Meshes/linesMesh'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Scene } from '@babylonjs/core/scene'
import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture'
import { Control } from '@babylonjs/gui/2D/controls/control'
import { Image } from '@babylonjs/gui/2D/controls/image'
import { InputText } from '@babylonjs/gui/2D/controls/inputText'
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle'
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock'
import {
  createHotbarIconSlot,
  setHotbarIconSlotState,
} from './ui/createHotbarIconSlot'
import { createIconWithTooltip } from './ui/createIconWithTooltip'
import { createTooltipManager, type TooltipManager } from './ui/createTooltipManager'

const PLANET_RADIUS = 8
const MAX_HARVESTER_LEVEL = 3
const POINTER_LOCK_RADIUS_PX = 34
const PLANET_POINTER_LOCK_RADIUS_PX = 64
const STAR_VISUAL_DIAMETER = 12.4
const STAR_CORONA_SCALE = 1.28
const ORBIT_BASE_RADIUS = 17
const ORBIT_STEP_RADIUS = 7.6
const ORBIT_LINE_COLOR = 0.82
const ORBIT_LINE_ALPHA = 0.12
const PLANET_VISUAL_SCALE = 1.12
const PLAYABLE_PLANET_VISUAL_SCALE = 1.55
const PLAYABLE_PLANET_MIN_RADIUS = 2.45
const RESOURCE_KINDS: ResourceKind[] = ['water', 'ironNickel', 'copper', 'silicate', 'titanium', 'rareEarth']
const PLANET_SHADER_NAME = 'stellarSeaPlanet'
const STAR_SHADER_NAME = 'stellarSeaStar'
const STAR_CORONA_SHADER_NAME = 'stellarSeaStarCorona'
const PLANET_CAMERA_ALPHA = -Math.PI / 2.55
const PLANET_CAMERA_BETA = Math.PI / 2.52
const PLANET_CAMERA_RADIUS_MULTIPLIER = 3.2
const TRAVEL_CAMERA_BETA = 1.12
const TRAVEL_CAMERA_RADIUS = 1.65
const TRAVEL_CAMERA_LOOK_AHEAD = 0.78
const CAMERA_TRANSITION_TO_TRAVEL_SECONDS = 0.9
const CAMERA_TRANSITION_TO_PLANET_SECONDS = 0.95
const TRAVEL_SPEED = 8.5
const TRAVEL_FUEL_PER_DISTANCE = 0.24
const TRAVEL_MIN_ETA_SECONDS = 2.8
const TRAVEL_MIN_FUEL_COST = 1.2
const TRAVEL_ROUTE_MAX_ITERATIONS = 8
const TRAVEL_ROUTE_CLEARANCE = 2.6

type ResourceKind = 'water' | 'ironNickel' | 'copper' | 'silicate' | 'titanium' | 'rareEarth'
type ResourceInventory = Record<ResourceKind, number>
type CarryItemId = ResourceKind | 'harvester'
type CarrySlotItem = {
  amount: number
  itemId: CarryItemId
}

type HudState = {
  activeHarvesters: number
  availableHarvesters: number
  hoveredNode: ResourceNode | null
  resourceRates: ResourceInventory
  resources: ResourceInventory
  toastMessage: string
  toastToken: number
  totalRate: number
}

type HudBackpackResourceCardHandle = {
  kind: ResourceKind
  icon: Image
  panel: Rectangle
  rate: TextBlock
  value: TextBlock
}

type HudBackpackSpecialCardHandle = {
  panel: Rectangle
  rate: TextBlock
  value: TextBlock
}

type HudRecipeCostChipHandle = {
  icon: Image
  panel: Rectangle
  value: TextBlock
}

type HudWorkshopListEntryHandle = {
  button: Rectangle
  icon: Image
  summary: TextBlock
  title: TextBlock
}

type HudWorkshopDetailHandle = {
  button: Rectangle
  buttonLabel: TextBlock
  costChips: HudRecipeCostChipHandle[]
  description: TextBlock
  effect: TextBlock
  emptyState: TextBlock
  panel: Rectangle
  status: TextBlock
  summary: TextBlock
  title: TextBlock
}

type TravelPanelState = {
  destinationName: string
  etaSeconds: number
  fuelCost: number
  visible: boolean
}

type ResourceNode = {
  anchor: TransformNode
  base: Mesh
  baseColor: Color3
  baseRate: number
  crystal: Mesh
  crystalMaterial: StandardMaterial
  deployed: boolean
  harvester: Harvester | null
  hitArea: Mesh
  id: string
  kind: ResourceKind
  label: string
  level: number
  normal: Vector3
  pulse: Mesh
  pulseMaterial: StandardMaterial
  reserve: number
  richness: number
  totalReserve: number
}

type Harvester = {
  anchor: TransformNode
  beam: LinesMesh
  pulse: Mesh
  pulseMaterial: StandardMaterial
  spinner: Mesh
}

type UpgradeCost = Partial<ResourceInventory>
type ResourceNodeDefinition = {
  kind: ResourceKind
  label: string
  latitude: number
  longitude: number
  rate: number
  richness: number
  reserve: number
}
type PlanetSurfaceStyle = {
  atmosphereAlpha: number
  atmosphereColor: Color3
  cloudAlpha: number
  cloudBands: number
  cloudColor: Color3
  emissive: Color3
  hasClouds: boolean
  id: 'oceanic' | 'temperate' | 'arid' | 'cryo' | 'barren'
  oceanLevel: number | null
  palette: {
    bright: string
    coast?: string
    dark: string
    deepOcean?: string
    mid: string
    polar?: string
    shallowOcean?: string
  }
  polarCaps: boolean
  roughness: number
  seed: number
  specular: Color3
}
type StarSystemMoonData = {
  color: Color3
  orbitA: number
  orbitB: number
  orbitPhase: number
  orbitSpeed: number
  orbitTilt: number
  radius: number
}
type StarSystemPlanetData = {
  axialTilt: number
  axialYaw: number
  color: Color3
  hasRing: boolean
  id: string
  moonCount: number
  moons: StarSystemMoonData[]
  name: string
  orbitA: number
  orbitB: number
  orbitPhase: number
  orbitSpeed: number
  orbitTilt: number
  orbitYaw: number
  radius: number
  resourceNodes: ResourceNodeDefinition[]
  style: PlanetSurfaceStyle
}
type StarSystemData = {
  name: string
  planets: StarSystemPlanetData[]
  playablePlanet: StarSystemPlanetData
  starColor: Color3
  starGlow: Color3
}
type StarSystemPlanetRuntime = {
  atmosphere: Mesh
  billboard: {
    mesh: Mesh
    update: (distance: number, isCurrent: boolean, isSelected: boolean) => void
  }
  data: StarSystemPlanetData
  mesh: Mesh
  moonOrbitRoot: TransformNode
  moonMeshes: { data: StarSystemMoonData; mesh: Mesh }[]
  pivot: TransformNode
  radius: number
  ring: Mesh | null
  surfaceMaterial: ShaderMaterial
}
type StarSystemRuntime = {
  planets: StarSystemPlanetRuntime[]
  playablePlanetMesh: Mesh
  playablePlanetRadius: number
  root: TransformNode
  star: Mesh
  update: (time: number) => void
}

type PlanetGameplayState = {
  data: StarSystemPlanetData
  nodes: ResourceNode[]
  runtime: StarSystemPlanetRuntime
}

type ShipTravelState = {
  approachStarted: boolean
  departureComplete: boolean
  destination: PlanetGameplayState
  elapsed: number
  etaSeconds: number
  fuelCost: number
  fuelRemainingToBurn: number
  routeWaypoints: Vector3[]
  routeWaypointIndex: number
  source: PlanetGameplayState
  speed: number
  startAlpha: number
  startBeta: number
  startRadius: number
  startTarget: Vector3
}

type TravelPlan = {
  distance: number
  etaSeconds: number
  fuelCost: number
  routeWaypoints: Vector3[]
}

type TravelObstacle = {
  center: Vector3
  radius: number
}

type CameraPose = {
  alpha: number
  beta: number
  radius: number
  target: Vector3
}

type CameraTransitionState = {
  duration: number
  elapsed: number
  endPose: CameraPose | null
  phase: 'toPlanet' | 'toTravel'
  startPose: CameraPose
}

const RESOURCE_LABEL_POOLS: Record<ResourceKind, string[]> = {
  water: ['极冠冰盖', '地下盐冰层', '裂谷霜盆', '冰封洼地'],
  ironNickel: ['铁镍陨积层', '金属裸岩带', '陨铁脊', '铁镍散布原'],
  copper: ['铜矿露头', '氧化铜丘', '硫化铜脉', '铜绿风化带'],
  silicate: ['硅酸盐山脊', '玄武岩台地', '玻屑高地', '辉石碎坡'],
  titanium: ['钛铁结核带', '钛磁砂海', '钛辉岩脊', '重矿砂坪'],
  rareEarth: ['稀土盐盆', '独居石滩', '氟碳铈矿层', '风化富集带'],
}
const PLANET_SURFACE_STYLES: PlanetSurfaceStyle[] = [
  {
    atmosphereAlpha: 0.08,
    atmosphereColor: new Color3(0.25, 0.72, 0.9),
    cloudAlpha: 0.42,
    cloudBands: 4,
    cloudColor: new Color3(0.9, 0.96, 1),
    emissive: new Color3(0.04, 0.06, 0.08),
    hasClouds: true,
    id: 'oceanic',
    oceanLevel: 0.14,
    palette: {
      bright: '#9fd074',
      coast: '#dfe5b7',
      dark: '#365c3f',
      deepOcean: '#10273a',
      mid: '#5f975a',
      polar: '#eef3ff',
      shallowOcean: '#2d6d86',
    },
    polarCaps: true,
    roughness: 0.84,
    seed: 11,
    specular: new Color3(0.18, 0.22, 0.24),
  },
  {
    atmosphereAlpha: 0.07,
    atmosphereColor: new Color3(0.32, 0.82, 0.86),
    cloudAlpha: 0.3,
    cloudBands: 3,
    cloudColor: new Color3(0.95, 0.98, 1),
    emissive: new Color3(0.05, 0.06, 0.08),
    hasClouds: true,
    id: 'temperate',
    oceanLevel: -0.02,
    palette: {
      bright: '#a8ce6e',
      coast: '#d7d4a6',
      dark: '#284b39',
      deepOcean: '#14324a',
      mid: '#5f8e58',
      polar: '#f3f7ff',
      shallowOcean: '#3c7e98',
    },
    polarCaps: true,
    roughness: 0.86,
    seed: 23,
    specular: new Color3(0.16, 0.2, 0.22),
  },
  {
    atmosphereAlpha: 0.05,
    atmosphereColor: new Color3(0.86, 0.58, 0.24),
    cloudAlpha: 0.16,
    cloudBands: 2,
    cloudColor: new Color3(0.98, 0.92, 0.82),
    emissive: new Color3(0.06, 0.05, 0.04),
    hasClouds: true,
    id: 'arid',
    oceanLevel: null,
    palette: {
      bright: '#d8b36a',
      dark: '#744a2b',
      mid: '#a77549',
      polar: '#eed9b9',
    },
    polarCaps: false,
    roughness: 0.92,
    seed: 37,
    specular: new Color3(0.1, 0.09, 0.08),
  },
  {
    atmosphereAlpha: 0.09,
    atmosphereColor: new Color3(0.48, 0.8, 0.96),
    cloudAlpha: 0.28,
    cloudBands: 5,
    cloudColor: new Color3(0.92, 0.97, 1),
    emissive: new Color3(0.05, 0.07, 0.09),
    hasClouds: true,
    id: 'cryo',
    oceanLevel: null,
    palette: {
      bright: '#edf6ff',
      dark: '#5f7389',
      mid: '#a6bfd3',
      polar: '#ffffff',
    },
    polarCaps: false,
    roughness: 0.82,
    seed: 51,
    specular: new Color3(0.2, 0.24, 0.26),
  },
  {
    atmosphereAlpha: 0.03,
    atmosphereColor: new Color3(0.56, 0.5, 0.42),
    cloudAlpha: 0,
    cloudBands: 0,
    cloudColor: new Color3(1, 1, 1),
    emissive: new Color3(0.04, 0.04, 0.04),
    hasClouds: false,
    id: 'barren',
    oceanLevel: null,
    palette: {
      bright: '#a49c8f',
      dark: '#4f4a43',
      mid: '#777166',
    },
    polarCaps: false,
    roughness: 0.95,
    seed: 67,
    specular: new Color3(0.08, 0.08, 0.08),
  },
]

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function wrap01(value: number): number {
  const wrapped = value % 1
  return wrapped < 0 ? wrapped + 1 : wrapped
}

function rgbToHsl(color: Color3): { h: number; s: number; l: number } {
  const max = Math.max(color.r, color.g, color.b)
  const min = Math.min(color.r, color.g, color.b)
  const lightness = (max + min) * 0.5
  const delta = max - min

  if (delta <= 1e-6) {
    return { h: 0, s: 0, l: lightness }
  }

  const saturation =
    lightness > 0.5
      ? delta / (2 - max - min)
      : delta / (max + min)

  let hue = 0
  if (max === color.r) {
    hue = (color.g - color.b) / delta + (color.g < color.b ? 6 : 0)
  } else if (max === color.g) {
    hue = (color.b - color.r) / delta + 2
  } else {
    hue = (color.r - color.g) / delta + 4
  }

  return {
    h: hue / 6,
    s: saturation,
    l: lightness,
  }
}

function hueToRgb(p: number, q: number, t: number): number {
  let wrapped = t
  if (wrapped < 0) {
    wrapped += 1
  }
  if (wrapped > 1) {
    wrapped -= 1
  }
  if (wrapped < 1 / 6) {
    return p + (q - p) * 6 * wrapped
  }
  if (wrapped < 1 / 2) {
    return q
  }
  if (wrapped < 2 / 3) {
    return p + (q - p) * (2 / 3 - wrapped) * 6
  }
  return p
}

function hslToColor3(h: number, s: number, l: number): Color3 {
  if (s <= 1e-6) {
    return new Color3(l, l, l)
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return new Color3(
    hueToRgb(p, q, h + 1 / 3),
    hueToRgb(p, q, h),
    hueToRgb(p, q, h - 1 / 3),
  )
}

function varyHexColor(
  hex: string,
  hueShift: number,
  saturationScale: number,
  lightnessShift: number,
): string {
  const hsl = rgbToHsl(Color3.FromHexString(hex))
  return hslToColor3(
    wrap01(hsl.h + hueShift),
    clamp01(hsl.s * saturationScale),
    clamp01(hsl.l + lightnessShift),
  ).toHexString()
}

function varyColor3(
  color: Color3,
  hueShift: number,
  saturationScale: number,
  lightnessShift: number,
): Color3 {
  const hsl = rgbToHsl(color)
  return hslToColor3(
    wrap01(hsl.h + hueShift),
    clamp01(hsl.s * saturationScale),
    clamp01(hsl.l + lightnessShift),
  )
}

function generatePlanetSurfaceStyle(seed: number): PlanetSurfaceStyle {
  const base = pickPlanetSurfaceStyleBase(seed)
  const hueShift = seededRange(seed + 1, -0.025, 0.025)
  const saturationScale = seededRange(seed + 2, 0.9, 1.08)
  const lightnessShift = seededRange(seed + 3, -0.045, 0.045)
  const cloudShift = seededRange(seed + 4, -0.02, 0.03)
  const atmosphereShift = seededRange(seed + 5, -0.02, 0.03)
  const roughnessShift = seededRange(seed + 6, -0.06, 0.06)
  const oceanShift = seededRange(seed + 7, -0.05, 0.05)

  return {
    ...base,
    atmosphereAlpha: clamp01(base.atmosphereAlpha + atmosphereShift),
    atmosphereColor: varyColor3(base.atmosphereColor, hueShift * 0.7, saturationScale, lightnessShift * 0.6),
    cloudAlpha: clamp01(base.cloudAlpha + cloudShift),
    cloudBands: Math.max(0, Math.round(base.cloudBands + seededRange(seed + 8, -1.2, 1.2))),
    cloudColor: varyColor3(base.cloudColor, hueShift * 0.22, 0.92 + seededRange(seed + 9, -0.04, 0.06), 0.02),
    emissive: varyColor3(base.emissive, hueShift * 0.4, 0.92, 0),
    hasClouds: base.hasClouds ? seededNoise(seed + 10) > 0.08 : seededNoise(seed + 10) > 0.84,
    oceanLevel:
      base.oceanLevel === null
        ? null
        : Math.max(-0.08, Math.min(0.22, base.oceanLevel + oceanShift)),
    palette: {
      bright: varyHexColor(base.palette.bright, hueShift, saturationScale, lightnessShift + 0.02),
      coast: base.palette.coast
        ? varyHexColor(base.palette.coast, hueShift * 0.6, 0.92 + seededRange(seed + 11, -0.04, 0.04), lightnessShift)
        : undefined,
      dark: varyHexColor(base.palette.dark, hueShift * 0.8, saturationScale * 0.96, lightnessShift - 0.03),
      deepOcean: base.palette.deepOcean
        ? varyHexColor(base.palette.deepOcean, hueShift * 0.7, 0.96 + seededRange(seed + 12, -0.05, 0.04), lightnessShift - 0.02)
        : undefined,
      mid: varyHexColor(base.palette.mid, hueShift, saturationScale, lightnessShift),
      polar: base.palette.polar
        ? varyHexColor(base.palette.polar, hueShift * 0.18, 0.88, lightnessShift + 0.01)
        : undefined,
      shallowOcean: base.palette.shallowOcean
        ? varyHexColor(base.palette.shallowOcean, hueShift * 0.75, 0.94 + seededRange(seed + 13, -0.04, 0.05), lightnessShift + 0.01)
        : undefined,
    },
    roughness: clamp01(base.roughness + roughnessShift),
    seed,
    specular: varyColor3(base.specular, hueShift * 0.2, 0.9, 0),
  }
}

function pickPlanetSurfaceStyleBase(seed: number): PlanetSurfaceStyle {
  const weights: Record<PlanetSurfaceStyle['id'], number> = {
    oceanic: 0.35,
    temperate: 0.55,
    arid: 1.55,
    cryo: 1.15,
    barren: 1.9,
  }

  let totalWeight = 0
  for (const style of PLANET_SURFACE_STYLES) {
    totalWeight += weights[style.id]
  }

  let threshold = seededNoise(seed + 1001) * totalWeight
  for (const style of PLANET_SURFACE_STYLES) {
    threshold -= weights[style.id]
    if (threshold <= 0) {
      return style
    }
  }

  return PLANET_SURFACE_STYLES[PLANET_SURFACE_STYLES.length - 1]
}

Effect.ShadersStore[`${PLANET_SHADER_NAME}VertexShader`] = `
precision highp float;

attribute vec3 position;
attribute vec3 normal;

uniform mat4 world;
uniform mat4 worldViewProjection;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vLocalNormal;

void main() {
  vec4 worldPos = world * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize((world * vec4(normal, 0.0)).xyz);
  vLocalNormal = normalize(normal);
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
`

Effect.ShadersStore[`${PLANET_SHADER_NAME}FragmentShader`] = `
precision highp float;

uniform float iTime;
uniform vec3 cameraPosition;
uniform float uPixelDensity;
uniform float uSpinSpeed;
uniform float uCloudiness;
uniform float uAtmosphere;
uniform float uLandMix;
uniform float uHasOcean;
uniform float uHasClouds;
uniform float uPolarCaps;
uniform vec3 uLandDark;
uniform vec3 uLandMid;
uniform vec3 uLandBright;
uniform vec3 uOceanDeep;
uniform vec3 uOceanShallow;
uniform vec3 uCoastColor;
uniform vec3 uPolarColor;
uniform vec3 uNightTint;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vLocalNormal;

#define PI 3.14159265359

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.23, 0.37));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float n000 = hash(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash(i + vec3(1.0, 1.0, 1.0));

  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}

float fbm(vec3 p) {
  float value = 0.0;
  float amp = 0.6;
  for (int i = 0; i < 3; i++) {
    value += noise(p) * amp;
    p *= 2.0;
    amp *= 0.5;
  }
  return value;
}

float posterize(float value, float steps) {
  return floor(value * steps) / max(steps - 1.0, 1.0);
}

vec3 directionFromSphereUv(vec2 uv) {
  float lon = (uv.x - 0.5) * 2.0 * PI;
  float lat = (uv.y - 0.5) * PI;
  float cosLat = cos(lat);
  return vec3(cosLat * cos(lon), sin(lat), cosLat * sin(lon));
}

void main() {
  vec3 worldNormal = normalize(vWorldNormal);
  vec3 surfaceNormal = normalize(vLocalNormal);
  vec3 viewDir = normalize(cameraPosition - vWorldPos);

  vec2 sphereUv = vec2(
    atan(surfaceNormal.z, surfaceNormal.x) / (2.0 * PI) + 0.5,
    asin(clamp(surfaceNormal.y, -1.0, 1.0)) / PI + 0.5
  );

  vec2 cellCount = vec2(uPixelDensity, floor(uPixelDensity * 0.58));
  vec2 pixelUv = (floor(sphereUv * cellCount) + 0.5) / cellCount;
  vec3 sampleDir = directionFromSphereUv(pixelUv);
  float terrainA = fbm(sampleDir * 4.8 + vec3(0.4));
  float terrainB = noise(sampleDir.zxy * 5.6 + vec3(3.1));
  float terrain = terrainA * 0.72 + terrainB * 0.28;

  float landMask = uHasOcean > 0.5 ? step(uLandMix, terrain) : 1.0;
  float oceanDepth = clamp((uLandMix - terrain) * 3.2 + 0.5, 0.0, 1.0);
  float oceanBands = posterize(oceanDepth + terrainA * 0.18 + sampleDir.y * 0.08 + 0.5, 5.0);
  vec3 ocean = mix(uOceanDeep, uOceanShallow, oceanBands);
  ocean = mix(ocean, uCoastColor, step(uLandMix - 0.02, terrain) * (1.0 - step(uLandMix + 0.05, terrain)));

  float landBands = posterize(terrain * 0.95 + sampleDir.y * 0.12 + 0.5, 5.0);
  vec3 land = mix(uLandDark, uLandMid, landBands);
  land = mix(land, uLandBright, step(0.82, terrain) * 0.45);

  if (uPolarCaps > 0.5) {
    float polar = smoothstep(0.72, 0.96, abs(sampleDir.y));
    land = mix(land, uPolarColor, polar * 0.78);
    ocean = mix(ocean, uPolarColor * 0.85, polar * 0.38);
  }

  vec3 base = mix(ocean, land, landMask);

  if (uHasClouds > 0.5) {
    float cloudNoise = noise(sampleDir * 7.2 + vec3(6.0));
    float cloudBands = sin(sampleDir.y * 20.0) * 0.08;
    float clouds = step(0.68 - uCloudiness * 0.22, cloudNoise + cloudBands);
    base = mix(base, vec3(0.97, 0.98, 1.0), clouds * (0.10 + uCloudiness * 0.28));
  }

  float diffuse = 0.74 + worldNormal.y * 0.08;
  float shade = posterize(clamp(diffuse, 0.0, 1.0), 5.0);
  base *= 0.82 + shade * 0.24;

  float fresnel = pow(1.0 - max(dot(worldNormal, viewDir), 0.0), 3.0);
  base += vec3(0.24, 0.56, 1.0) * fresnel * uAtmosphere * 0.34;

  gl_FragColor = vec4(pow(base, vec3(0.94)), 1.0);
}
`

Effect.ShadersStore[`${STAR_SHADER_NAME}VertexShader`] = `
precision highp float;

attribute vec3 position;
attribute vec3 normal;

uniform mat4 world;
uniform mat4 worldViewProjection;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vLocalNormal;

void main() {
  vec4 worldPos = world * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize((world * vec4(normal, 0.0)).xyz);
  vLocalNormal = normalize(normal);
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
`

Effect.ShadersStore[`${STAR_SHADER_NAME}FragmentShader`] = `
precision highp float;

uniform float iTime;
uniform vec3 cameraPosition;
uniform vec3 uCoreColor;
uniform vec3 uMidColor;
uniform vec3 uEdgeColor;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vLocalNormal;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.13, 0.27, 0.41));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float n000 = hash(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash(i + vec3(1.0, 1.0, 1.0));

  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}

float fbm(vec3 p) {
  float value = 0.0;
  float amp = 0.58;
  for (int i = 0; i < 5; i++) {
    value += noise(p) * amp;
    p *= 1.95;
    amp *= 0.53;
  }
  return value;
}

void main() {
  vec3 normal = normalize(vWorldNormal);
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  vec3 sampleDir = normalize(vLocalNormal);

  float convection = fbm(sampleDir * 8.0 + vec3(iTime * 0.42, -iTime * 0.18, iTime * 0.24));
  float cells = smoothstep(0.38, 0.92, convection);
  float streaks = fbm(sampleDir * 18.0 + vec3(iTime * 1.2, iTime * 0.35, -iTime * 0.22));
  float facula = smoothstep(0.74, 0.96, streaks + cells * 0.18);
  float limb = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.7);

  vec3 color = mix(uCoreColor, uMidColor, cells);
  color = mix(color, uEdgeColor, facula * 0.85);
  color += uEdgeColor * limb * 0.9;
  color += vec3(1.0, 0.62, 0.18) * pow(cells, 2.0) * 0.18;
  color = pow(color, vec3(0.92));

  gl_FragColor = vec4(color, 1.0);
}
`

Effect.ShadersStore[`${STAR_CORONA_SHADER_NAME}VertexShader`] = `
precision highp float;

attribute vec3 position;
attribute vec3 normal;

uniform mat4 world;
uniform mat4 worldViewProjection;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vLocalNormal;

void main() {
  vec4 worldPos = world * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vWorldNormal = normalize((world * vec4(normal, 0.0)).xyz);
  vLocalNormal = normalize(normal);
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
`

Effect.ShadersStore[`${STAR_CORONA_SHADER_NAME}FragmentShader`] = `
precision highp float;

uniform float iTime;
uniform vec3 cameraPosition;
uniform vec3 uCoronaColor;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec3 vLocalNormal;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.19, 0.31, 0.47));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float n000 = hash(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash(i + vec3(1.0, 1.0, 1.0));

  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}

float fbm(vec3 p) {
  float value = 0.0;
  float amp = 0.56;
  for (int i = 0; i < 4; i++) {
    value += noise(p) * amp;
    p *= 2.1;
    amp *= 0.52;
  }
  return value;
}

void main() {
  vec3 normal = normalize(vWorldNormal);
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  vec3 sampleDir = normalize(vLocalNormal);
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.1);
  float turbulence = fbm(sampleDir * 9.0 + vec3(iTime * 0.24, -iTime * 0.18, iTime * 0.16));
  float flare = smoothstep(0.38, 0.95, turbulence);
  float alpha = fresnel * (0.22 + flare * 0.42);
  vec3 color = uCoronaColor * (0.42 + flare * 0.82);
  gl_FragColor = vec4(color, alpha);
}
`

export function createScene(
  engine: Engine,
  canvas: HTMLCanvasElement,
): Scene {
  const scene = new Scene(engine)
  scene.clearColor = new Color4(0, 0, 0, 1)
  scene.ambientColor = new Color3(0.58, 0.6, 0.66)

  const systemSeed = Math.floor(Math.random() * 100000)
  const starSystem = generateStarSystemData(systemSeed)
  createStarfieldDome(scene)
  const hud = createHud(
    scene,
    (result) => {
      if (result.itemId === 'harvester') {
        state.availableHarvesters = Math.max(0, state.availableHarvesters - result.removedFromBackpack)
      } else {
        state.resources[result.itemId] = Math.max(0, state.resources[result.itemId] - result.removedFromBackpack)
      }

      if (result.returnedToBackpack !== null) {
        if (result.returnedToBackpack.itemId === 'harvester') {
          state.availableHarvesters += result.returnedToBackpack.amount
        } else {
          state.resources[result.returnedToBackpack.itemId] += result.returnedToBackpack.amount
        }
      }

      emitHud()
    },
    () => {
      fabricateHarvester()
    },
  )
  const travelPanel = createTravelPanel(
    scene,
    () => {
      confirmTravel()
    },
    () => {
      cancelTravelSelection()
    },
  )

  const starSystemBackdrop = createStarSystemBackdrop(scene, starSystem)
  const planetStates = new Map<string, PlanetGameplayState>(
    starSystemBackdrop.planets.map((runtime) => {
      const nodes = runtime.data.resourceNodes.map((definition, index) =>
        createResourceNode(
          scene,
          runtime.mesh,
          definition,
          `${runtime.data.id}-resource-node-${index}`,
          runtime.radius,
        ),
      )

      return [
        runtime.data.id,
        {
          data: runtime.data,
          nodes,
          runtime,
        },
      ]
    }),
  )
  let currentPlanetState = planetStates.get(starSystem.playablePlanet.id) ?? [...planetStates.values()][0]
  let selectedPlanetState: PlanetGameplayState | null = null
  for (const planet of starSystemBackdrop.planets) {
    planet.billboard.mesh.setEnabled(false)
  }

  const camera = new ArcRotateCamera(
    'camera',
    PLANET_CAMERA_ALPHA,
    PLANET_CAMERA_BETA,
    getPlanetCameraRadius(currentPlanetState),
    currentPlanetState.runtime.mesh.getAbsolutePosition(),
    scene,
  )
  camera.lowerRadiusLimit = Math.max(4.8, currentPlanetState.runtime.radius * 1.45)
  camera.upperRadiusLimit = Math.max(96, currentPlanetState.runtime.radius * 18)
  camera.lowerBetaLimit = 0.38
  camera.upperBetaLimit = Math.PI / 1.9
  camera.wheelDeltaPercentage = 0.01
  camera.panningSensibility = 0
  camera.minZ = 0.05
  camera.attachControl(canvas, true)

  const globalLight = new HemisphericLight('global-light', new Vector3(0, 1, 0), scene)
  globalLight.diffuse = new Color3(0.96, 0.97, 1)
  globalLight.specular = new Color3(0.12, 0.12, 0.14)
  globalLight.groundColor = new Color3(0.34, 0.36, 0.4)
  globalLight.intensity = 0.92

  const ship = createPlayerShip(scene)
  const shipAnchor = getShipParkingPosition(currentPlanetState.runtime, starSystemBackdrop.star)
  ship.position.copyFrom(shipAnchor)

  const state = {
    activeHarvesters: 0,
    availableHarvesters: 1,
    hoveredNode: null as ResourceNode | null,
    resourceRates: createEmptyInventory(),
    resources: {
      ...createEmptyInventory(),
      water: 24,
    },
    toastMessage: '',
    toastToken: 0,
    totalRate: 0,
  }
  let hoveredNode: ResourceNode | null = null
  let depletionMessageCooldown = 0
  let travelState: ShipTravelState | null = null
  let cameraTransitionState: CameraTransitionState | null = null
  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault()
  })

  function getCurrentNodes(): ResourceNode[] {
    return currentPlanetState.nodes
  }

  function setPlanetNodeVisibility(planetState: PlanetGameplayState, isVisible: boolean): void {
    for (const node of planetState.nodes) {
      node.anchor.setEnabled(isVisible)
    }
  }

  function refreshPlanetNodeVisibility(): void {
    for (const planetState of planetStates.values()) {
      setPlanetNodeVisibility(planetState, planetState.data.id === currentPlanetState.data.id)
    }
  }

  function updateTravelPanel(): void {
    if (selectedPlanetState === null || travelState !== null) {
      travelPanel.update({
        destinationName: '',
        etaSeconds: 0,
        fuelCost: 0,
        visible: false,
      })
      return
    }

    const travelPlan = getTravelPlan(
      currentPlanetState.runtime,
      selectedPlanetState.runtime,
      starSystemBackdrop.planets,
      starSystemBackdrop.star,
    )
    travelPanel.update({
      destinationName: selectedPlanetState.data.name,
      etaSeconds: travelPlan.etaSeconds,
      fuelCost: travelPlan.fuelCost,
      visible: true,
    })
  }

  function emitHud(): void {
    hud.update({ ...state })
  }

  function emitToast(message: string): void {
    state.toastMessage = message
    state.toastToken += 1
    emitHud()
  }

  function getUsableResourceInventory(): ResourceInventory {
    const carryInventory = hud.getCarryResourceInventory()
    return {
      copper: state.resources.copper + carryInventory.copper,
      ironNickel: state.resources.ironNickel + carryInventory.ironNickel,
      rareEarth: state.resources.rareEarth + carryInventory.rareEarth,
      silicate: state.resources.silicate + carryInventory.silicate,
      titanium: state.resources.titanium + carryInventory.titanium,
      water: state.resources.water + carryInventory.water,
    }
  }

  function hasUsableInventory(cost: UpgradeCost): boolean {
    return hasInventory(getUsableResourceInventory(), cost)
  }

  function spendUsableInventory(cost: UpgradeCost): void {
    const remainingCost = hud.consumeResourcesFromCarry(cost)
    spendInventory(state.resources, remainingCost)
  }

  function recalculateNetworkState(): void {
    const nodes = getCurrentNodes()
    state.activeHarvesters = 0
    state.totalRate = 0
    state.resourceRates = createEmptyInventory()

    for (const node of nodes) {
      if (node.harvester === null || node.reserve <= 0) {
        continue
      }

      const rate = getNodeRate(node)
      state.activeHarvesters += 1
      state.totalRate += rate
      state.resourceRates[node.kind] += rate
    }
  }

  function updateCameraLimits(planetState: PlanetGameplayState): void {
    camera.lowerRadiusLimit = Math.max(4.8, planetState.runtime.radius * 1.45)
    camera.upperRadiusLimit = Math.max(96, planetState.runtime.radius * 18)
  }

  function setTravelCameraLimits(): void {
    camera.lowerRadiusLimit = 1.1
    camera.upperRadiusLimit = 32
  }

  function isTravelDialogOpen(): boolean {
    return selectedPlanetState !== null && travelState === null
  }

  function setCurrentPlanetState(planetState: PlanetGameplayState): void {
    currentPlanetState = planetState
    updateHover(null)
    updateCameraLimits(planetState)
    refreshPlanetNodeVisibility()
    recalculateNetworkState()
    updateTravelPanel()
  }

  function updateHover(node: ResourceNode | null): void {
    if (hoveredNode?.id === node?.id) {
      return
    }

    if (hoveredNode !== null) {
      setNodeHighlight(hoveredNode, false)
    }

    hoveredNode = node
    state.hoveredNode = node

    if (node === null) {
      emitHud()
      canvas.style.cursor = 'grab'
      return
    }

    setNodeHighlight(node, true)
    emitHud()

    if (node.reserve <= 0) {
      canvas.style.cursor = 'not-allowed'
      return
    }

    canvas.style.cursor = node.deployed ? 'pointer' : 'pointer'
  }

  function deployHarvester(node: ResourceNode): void {
    if (node.reserve <= 0) {
      emitToast(`${node.label} 已枯竭`)
      return
    }

    if (node.deployed) {
      tryUpgradeHarvester(node)
      return
    }

    if (hud.getSelectedCarryItemId() !== 'harvester') {
      emitToast('先把采集器放到外部携带栏并选中')
      return
    }

    if (hud.consumeSelectedCarryItem(1) <= 0) {
      emitToast('没有可部署采集器，先在工坊制造')
      return
    }

    node.harvester = createHarvester(scene, node)
    node.deployed = true
    node.level = 1
    recalculateNetworkState()
    setNodeHighlight(node, hoveredNode?.id === node.id)
    emitToast(`已连接 ${node.label}`)
  }

  function tryUpgradeHarvester(node: ResourceNode): void {
    if (node.harvester === null) {
      emitToast(`${node.label} 尚未连接`)
      return
    }

    if (node.reserve <= 0) {
      emitToast(`${node.label} 已枯竭`)
      return
    }

    if (node.level >= MAX_HARVESTER_LEVEL) {
      emitToast(`${node.label} 已满级`)
      return
    }

    const upgradeCost = getUpgradeCost(node.level + 1)
    if (!hasUsableInventory(upgradeCost)) {
      emitToast(`缺少 ${formatUpgradeCost(upgradeCost)}`)
      return
    }

    spendUsableInventory(upgradeCost)
    node.level += 1
    recalculateNetworkState()
    setNodeHighlight(node, hoveredNode?.id === node.id)
    emitToast(`${node.label} 升至 ${node.level} 级`)
  }

  function fabricateHarvester(): void {
    const fabricationCost = getHarvesterFabricationCost()
    if (!hasUsableInventory(fabricationCost)) {
      emitToast(`制造缺少 ${formatUpgradeCost(fabricationCost)}`)
      return
    }

    spendUsableInventory(fabricationCost)
    state.availableHarvesters += 1
    emitToast(`工坊完成 1 台采集器`)
  }

  function recycleHarvester(node: ResourceNode): void {
    if (node.harvester === null) {
      emitToast(`${node.label} 没有可回收采集器`)
      return
    }

    node.harvester.beam.dispose()
    node.harvester.anchor.dispose()
    node.harvester = null
    node.deployed = false
    node.level = 0
    state.availableHarvesters += 1
    recalculateNetworkState()
    setNodeHighlight(node, hoveredNode?.id === node.id)
    emitToast(`已回收 ${node.label} 采集器`)
  }

  function recyclePlanetHarvesters(planetState: PlanetGameplayState): number {
    let recycledCount = 0

    for (const node of planetState.nodes) {
      if (node.harvester === null) {
        continue
      }

      node.harvester.beam.dispose()
      node.harvester.anchor.dispose()
      node.harvester = null
      node.deployed = false
      node.level = 0
      state.availableHarvesters += 1
      recycledCount += 1

      if (hoveredNode?.id === node.id) {
        setNodeHighlight(node, true)
      }
    }

    if (recycledCount > 0) {
      recalculateNetworkState()
    }

    return recycledCount
  }

  function selectPlanet(planetState: PlanetGameplayState | null): void {
    if (travelState !== null) {
      return
    }

    selectedPlanetState = planetState
    if (planetState !== null) {
      updateHover(null)
      canvas.style.cursor = 'default'
    }
    updateTravelPanel()
    if (planetState !== null) {
      emitToast(`航线锁定 ${planetState.data.name}`)
    }
  }

  function cancelTravelSelection(): void {
    if (selectedPlanetState === null || travelState !== null) {
      return
    }

    const destinationName = selectedPlanetState.data.name
    selectedPlanetState = null
    canvas.style.cursor = 'grab'
    updateTravelPanel()
    emitToast(`已取消前往 ${destinationName}`)
  }

  function confirmTravel(): void {
    if (selectedPlanetState === null || travelState !== null) {
      return
    }

    const travelPlan = getTravelPlan(
      currentPlanetState.runtime,
      selectedPlanetState.runtime,
      starSystemBackdrop.planets,
      starSystemBackdrop.star,
    )
    if (getUsableResourceInventory().water + 1e-6 < travelPlan.fuelCost) {
      emitToast(`水不足，需要 ${travelPlan.fuelCost.toFixed(1)}`)
      return
    }

    const recycledCount = recyclePlanetHarvesters(currentPlanetState)
    updateHover(null)
    travelState = {
      approachStarted: false,
      departureComplete: false,
      destination: selectedPlanetState,
      elapsed: 0,
      etaSeconds: travelPlan.etaSeconds,
      fuelCost: travelPlan.fuelCost,
      fuelRemainingToBurn: travelPlan.fuelCost,
      routeWaypoints: travelPlan.routeWaypoints,
      routeWaypointIndex: 0,
      source: currentPlanetState,
      speed: travelPlan.distance / travelPlan.etaSeconds,
      startAlpha: camera.alpha,
      startBeta: camera.beta,
      startRadius: camera.radius,
      startTarget: camera.getTarget().clone(),
    }
    selectedPlanetState = null
    updateTravelPanel()
    setTravelCameraLimits()
    camera.detachControl()
    cameraTransitionState = {
      duration: CAMERA_TRANSITION_TO_TRAVEL_SECONDS,
      elapsed: 0,
      endPose: null,
      phase: 'toTravel',
      startPose: captureCameraPose(camera),
    }
    canvas.style.cursor = 'default'
    emitToast(
      recycledCount > 0
        ? `已回收 ${recycledCount} 台采集器，启程前往 ${travelState.destination.data.name}`
        : `启程前往 ${travelState.destination.data.name}`,
    )
  }

  scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
      if (travelState !== null || isTravelDialogOpen()) {
        updateHover(null)
        return
      }

      const pointer = getCanvasPointerPosition(canvas, pointerInfo.event)
      updateHover(resolveNodeFromPointer(scene, camera, canvas, getCurrentNodes(), pointer.x, pointer.y))
      return
    }

    if (pointerInfo.type === PointerEventTypes.POINTERDOWN && pointerInfo.event.button === 2) {
      if (travelState !== null || isTravelDialogOpen()) {
        return
      }

      const pointer = getCanvasPointerPosition(canvas, pointerInfo.event)
      const node = resolveNodeFromPointer(scene, camera, canvas, getCurrentNodes(), pointer.x, pointer.y)
      if (node !== null && node.deployed) {
        recycleHarvester(node)
      }
      return
    }

    if (pointerInfo.type !== PointerEventTypes.POINTERTAP || pointerInfo.event.button !== 0) {
      return
    }

    const pointer = getCanvasPointerPosition(canvas, pointerInfo.event)
    if (travelState !== null || isTravelDialogOpen()) {
      return
    }

    const node = resolveNodeFromPointer(scene, camera, canvas, getCurrentNodes(), pointer.x, pointer.y)

    if (node !== null) {
      deployHarvester(node)
      return
    }

    const planetRuntime = resolvePlanetFromPointer(
      scene,
      camera,
      canvas,
      pointer.x,
      pointer.y,
      starSystemBackdrop.planets,
      currentPlanetState.data.id,
    )
    if (planetRuntime !== null && planetRuntime.data.id !== currentPlanetState.data.id) {
      selectPlanet(planetStates.get(planetRuntime.data.id) ?? null)
      return
    }

    selectPlanet(null)
    emitToast('未选中资源点')
  })

  refreshPlanetNodeVisibility()
  recalculateNetworkState()
  updateTravelPanel()
  emitHud()

  scene.onBeforeRenderObservable.add(() => {
    const dt = engine.getDeltaTime() * 0.001
    const time = performance.now() * 0.001

    starSystemBackdrop.update(time)
    depletionMessageCooldown = Math.max(0, depletionMessageCooldown - dt)

    for (const planetState of planetStates.values()) {
      for (const node of planetState.nodes) {
        node.crystal.rotation.y += dt * 0.35

        const pulseScale = node.deployed
          ? 1.2 + Math.sin(time * 2.8 + node.level) * 0.05
          : 1.0 + Math.sin(time * 2.6 + node.richness) * 0.06
        node.pulse.scaling.setAll(pulseScale)
        node.pulseMaterial.alpha = node.deployed
          ? 0.34 + Math.sin(time * 2.2 + node.level) * 0.06
          : 0.22 + Math.sin(time * 1.8 + node.baseRate) * 0.04

        if (node.harvester === null) {
          continue
        }

        node.harvester.spinner.rotation.z += dt * (1.1 + node.level * 0.45)
        node.harvester.pulse.scaling.setAll(1 + Math.sin(time * 4 + node.baseRate) * 0.08)
        node.harvester.pulseMaterial.alpha = 0.22 + Math.sin(time * 3.5 + node.richness) * 0.06
        node.harvester.beam.alpha = 0.5 + Math.sin(time * 5.5 + node.baseRate) * 0.12

        if (node.reserve <= 0) {
          node.reserve = 0
          node.harvester.beam.alpha = 0.12
          node.harvester.pulseMaterial.alpha = 0.08
          continue
        }

        if (travelState !== null) {
          continue
        }

        const extracted = Math.min(node.reserve, getNodeRate(node) * dt)
        node.reserve -= extracted
        state.resources[node.kind] += extracted

        if (node.reserve <= 0) {
          node.reserve = 0
          if (planetState.data.id === currentPlanetState.data.id) {
            setNodeHighlight(node, hoveredNode?.id === node.id)
            if (depletionMessageCooldown <= 0) {
              emitToast(`${node.label} 已采空`)
              depletionMessageCooldown = 1.5
            }
          }
        }
      }
    }

    updateShipAndCamera(
      dt,
      camera,
      ship,
      starSystemBackdrop.star,
      currentPlanetState,
      travelState,
      cameraTransitionState,
      starSystemBackdrop.planets,
      (nextPlanetState) => {
        travelState = null
        setCurrentPlanetState(nextPlanetState)
        cameraTransitionState = {
          duration: CAMERA_TRANSITION_TO_PLANET_SECONDS,
          elapsed: 0,
          endPose: getPlanetCameraPose(nextPlanetState),
          phase: 'toPlanet',
          startPose: captureCameraPose(camera),
        }
        emitToast(`已抵达 ${nextPlanetState.data.name}`)
      },
      (burnedWater) => {
        spendUsableInventory({ water: burnedWater })
      },
    )

    if (cameraTransitionState !== null && cameraTransitionState.elapsed >= cameraTransitionState.duration) {
      if (cameraTransitionState.phase === 'toPlanet') {
        camera.attachControl(canvas, true)
      }
      cameraTransitionState = null
    }

    recalculateNetworkState()
    updateTravelPanel()
    emitHud()
  })

  return scene
}

export function createStarSystemOverviewScene(
  scene: Scene,
  _engine: Engine,
  canvas: HTMLCanvasElement,
): Scene {
  scene.clearColor = new Color4(0, 0, 0, 1)
  scene.ambientColor = new Color3(0.58, 0.6, 0.66)
  const systemSeed = Math.floor(Math.random() * 100000)
  const starSystem = generateStarSystemData(systemSeed)
  createStarfieldDome(scene)

  const camera = new ArcRotateCamera(
    'system-camera',
    -Math.PI / 2.8,
    Math.PI / 2.7,
    54,
    Vector3.Zero(),
    scene,
  )
  camera.lowerRadiusLimit = 24
  camera.upperRadiusLimit = 96
  camera.lowerBetaLimit = 0.28
  camera.upperBetaLimit = Math.PI / 1.85
  camera.wheelDeltaPercentage = 0.01
  camera.panningSensibility = 0
  camera.attachControl(canvas, true)

  const globalLight = new HemisphericLight('system-global-light', new Vector3(0, 1, 0), scene)
  globalLight.diffuse = new Color3(0.96, 0.97, 1)
  globalLight.specular = new Color3(0.12, 0.12, 0.14)
  globalLight.groundColor = new Color3(0.34, 0.36, 0.4)
  globalLight.intensity = 0.92

  const system = createStarSystemBackdrop(scene, starSystem)

  scene.onBeforeRenderObservable.add(() => {
    const time = performance.now() * 0.001
    system.update(time)
  })

  return scene
}

function createStarfieldDome(scene: Scene): void {
  const starMaterials = [
    createStarfieldDotMaterial(scene, 'starfield-dot-cool', new Color3(0.82, 0.9, 1)),
    createStarfieldDotMaterial(scene, 'starfield-dot-white', new Color3(1, 1, 1)),
    createStarfieldDotMaterial(scene, 'starfield-dot-warm', new Color3(1, 0.94, 0.84)),
  ]

  const layerConfigs = [
    { count: 110, minDistance: 120, maxDistance: 180, minSize: 0.12, maxSize: 0.26 },
    { count: 140, minDistance: 180, maxDistance: 250, minSize: 0.18, maxSize: 0.34 },
    { count: 90, minDistance: 250, maxDistance: 340, minSize: 0.24, maxSize: 0.42 },
  ]

  let starIndex = 0
  for (const layer of layerConfigs) {
    for (let index = 0; index < layer.count; index += 1) {
      const theta = Math.random() * Math.PI * 2
      const z = Math.random() * 2 - 1
      const radial = Math.sqrt(Math.max(0, 1 - z * z))
      const direction = new Vector3(
        Math.cos(theta) * radial,
        z,
        Math.sin(theta) * radial,
      )
      const distance = layer.minDistance + Math.random() * (layer.maxDistance - layer.minDistance)
      const star = MeshBuilder.CreateSphere(
        `starfield-dot-${starIndex}`,
        { diameter: 1, segments: 4 },
        scene,
      )
      star.position = direction.scale(distance)
      star.scaling.setAll(layer.minSize + Math.random() * (layer.maxSize - layer.minSize))
      star.material = starMaterials[Math.floor(Math.random() * starMaterials.length)]
      star.isPickable = false
      star.alwaysSelectAsActiveMesh = true
      starIndex += 1
    }
  }
}

function createTravelPanel(
  scene: Scene,
  onConfirmPressed: () => void,
  onCancelPressed: () => void,
): { update: (state: TravelPanelState) => void } {
  const ui = AdvancedDynamicTexture.CreateFullscreenUI('stellar-sea-travel-ui', true, scene)
  ui.idealWidth = 1600
  ui.idealHeight = 900
  ui.useSmallestIdeal = true
  ui.renderAtIdealSize = true

  const overlay = new Rectangle('travel-dialog-overlay')
  overlay.width = '100%'
  overlay.height = '100%'
  overlay.thickness = 0
  overlay.background = '#02060cb8'
  overlay.isPointerBlocker = true
  overlay.isVisible = false
  overlay.alpha = 0
  ui.addControl(overlay)

  const panel = createFixedPanel('0px', '0px', '420px', '228px')
  panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  panel.isPointerBlocker = true
  panel.isVisible = false
  panel.alpha = 0
  overlay.addControl(panel)

  const title = createText('航线确认', 13, '#7bdbd8', 18, true)
  title.width = '120px'
  title.height = '18px'
  title.top = '18px'
  title.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  title.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  panel.addControl(title)

  const planetIcon = createIcon('/gui/target.svg', '0px', '44px', 22)
  planetIcon.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  planetIcon.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  panel.addControl(planetIcon)

  const destinationName = createText('', 16, '#fff0b8', 24, true)
  destinationName.width = '320px'
  destinationName.height = '24px'
  destinationName.top = '72px'
  destinationName.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  destinationName.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  destinationName.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  panel.addControl(destinationName)

  const hintText = createText('确认后切换到飞船第三人称视角', 12, '#f4f1d7', 18)
  hintText.width = '320px'
  hintText.height = '18px'
  hintText.top = '100px'
  hintText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  hintText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  hintText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  panel.addControl(hintText)

  const fuelCard = createFixedPanel('-92px', '136px', '148px', '46px')
  fuelCard.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  fuelCard.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  fuelCard.background = '#0c1624f0'
  panel.addControl(fuelCard)

  const fuelIcon = createIcon('/gui/resource-water.svg', '-48px', '15px', 16)
  fuelIcon.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  fuelIcon.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  fuelCard.addControl(fuelIcon)

  const fuelLabel = createText('燃料', 11, '#92b8c9', 14, true)
  fuelLabel.width = '54px'
  fuelLabel.height = '14px'
  fuelLabel.left = '-8px'
  fuelLabel.top = '8px'
  fuelLabel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  fuelLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  fuelCard.addControl(fuelLabel)

  const fuelValue = createText('', 13, '#7bdbd8', 18, true)
  fuelValue.width = '70px'
  fuelValue.height = '18px'
  fuelValue.left = '4px'
  fuelValue.top = '21px'
  fuelValue.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  fuelValue.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  fuelCard.addControl(fuelValue)

  const etaCard = createFixedPanel('92px', '136px', '148px', '46px')
  etaCard.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  etaCard.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  etaCard.background = '#0c1624f0'
  panel.addControl(etaCard)

  const etaLabel = createText('航时', 11, '#92b8c9', 14, true)
  etaLabel.width = '54px'
  etaLabel.height = '14px'
  etaLabel.left = '-22px'
  etaLabel.top = '8px'
  etaLabel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  etaLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  etaCard.addControl(etaLabel)

  const etaValue = createText('', 13, '#f4f1d7', 18, true)
  etaValue.width = '76px'
  etaValue.height = '18px'
  etaValue.left = '-10px'
  etaValue.top = '21px'
  etaValue.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  etaValue.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  etaCard.addControl(etaValue)

  const cancelButton = new Rectangle('travel-cancel-button')
  cancelButton.width = '128px'
  cancelButton.height = '38px'
  cancelButton.cornerRadius = 8
  cancelButton.thickness = 1
  cancelButton.color = '#7bdbd855'
  cancelButton.background = '#0e1622f2'
  cancelButton.left = '-76px'
  cancelButton.top = '188px'
  cancelButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  cancelButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  cancelButton.isPointerBlocker = true
  cancelButton.onPointerClickObservable.add(() => {
    onCancelPressed()
  })
  panel.addControl(cancelButton)

  const cancelText = createText('取消', 13, '#d8e2ef', 18, true)
  cancelText.width = '64px'
  cancelText.height = '18px'
  cancelText.top = '10px'
  cancelText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  cancelText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  cancelText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  cancelButton.addControl(cancelText)

  const confirmButton = new Rectangle('travel-confirm-button')
  confirmButton.width = '128px'
  confirmButton.height = '38px'
  confirmButton.cornerRadius = 8
  confirmButton.thickness = 1
  confirmButton.color = '#7bdbd855'
  confirmButton.background = '#102236f2'
  confirmButton.left = '76px'
  confirmButton.top = '188px'
  confirmButton.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  confirmButton.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  confirmButton.isPointerBlocker = true
  confirmButton.onPointerClickObservable.add(() => {
    onConfirmPressed()
  })
  panel.addControl(confirmButton)

  const buttonIcon = createIcon('/gui/target.svg', '-34px', '10px', 18)
  buttonIcon.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  buttonIcon.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  confirmButton.addControl(buttonIcon)

  const buttonText = createText('前往', 13, '#fff0b8', 18, true)
  buttonText.width = '64px'
  buttonText.height = '18px'
  buttonText.left = '12px'
  buttonText.top = '10px'
  buttonText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  buttonText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  confirmButton.addControl(buttonText)

  return {
    update(state: TravelPanelState) {
      overlay.isVisible = state.visible
      overlay.alpha = state.visible ? 1 : 0
      panel.isVisible = state.visible
      panel.alpha = state.visible ? 1 : 0
      destinationName.text = `是否前往 ${state.destinationName} ?`
      fuelValue.text = `${state.fuelCost.toFixed(1)} 水`
      etaValue.text = `${state.etaSeconds.toFixed(1)} 秒`
      cancelButton.isEnabled = state.visible
      cancelButton.alpha = state.visible ? 1 : 0.5
      confirmButton.isEnabled = state.visible
      confirmButton.alpha = state.visible ? 1 : 0.5
    },
  }
}

function createPlayerShip(scene: Scene): TransformNode {
  const root = new TransformNode('player-ship', scene)

  const hull = MeshBuilder.CreateBox(
    'player-ship-hull',
    { width: 0.46, height: 0.18, depth: 1.12 },
    scene,
  )
  hull.parent = root

  const nose = MeshBuilder.CreateCylinder(
    'player-ship-nose',
    { height: 0.48, diameterTop: 0.06, diameterBottom: 0.24, tessellation: 6 },
    scene,
  )
  nose.parent = root
  nose.rotation.x = Math.PI / 2
  nose.position.z = 0.72

  const wingLeft = MeshBuilder.CreateBox(
    'player-ship-wing-left',
    { width: 0.72, height: 0.05, depth: 0.28 },
    scene,
  )
  wingLeft.parent = root
  wingLeft.position.x = -0.42
  wingLeft.position.z = 0.04
  wingLeft.rotation.z = 0.1

  const wingRight = wingLeft.clone('player-ship-wing-right')
  wingRight.parent = root
  wingRight.position.x = 0.42
  wingRight.rotation.z = -0.1

  const engineGlow = MeshBuilder.CreateDisc(
    'player-ship-engine',
    { radius: 0.12, tessellation: 16 },
    scene,
  )
  engineGlow.parent = root
  engineGlow.position.z = -0.62
  engineGlow.rotation.y = Math.PI

  const hullMaterial = new StandardMaterial('player-ship-material', scene)
  hullMaterial.diffuseColor = new Color3(0.88, 0.8, 0.62)
  hullMaterial.emissiveColor = new Color3(0.12, 0.1, 0.08)
  hullMaterial.specularColor = Color3.Black()
  hull.material = hullMaterial
  nose.material = hullMaterial
  wingLeft.material = hullMaterial
  wingRight.material = hullMaterial

  const glowMaterial = new StandardMaterial('player-ship-engine-material', scene)
  glowMaterial.emissiveColor = new Color3(0.26, 0.94, 1)
  glowMaterial.disableLighting = true
  glowMaterial.alpha = 0.82
  glowMaterial.backFaceCulling = false
  engineGlow.material = glowMaterial

  return root
}

function getShipParkingPosition(runtime: StarSystemPlanetRuntime, star: Mesh): Vector3 {
  const planetPosition = runtime.mesh.getAbsolutePosition()
  const outward = planetPosition.subtract(star.getAbsolutePosition()).normalize()
  const side = Vector3.Cross(outward, Vector3.Up()).normalize()
  return planetPosition
    .add(outward.scale(runtime.radius + 1.85))
    .add(side.scale(runtime.radius * 0.24))
    .add(new Vector3(0, runtime.radius * 0.16, 0))
}

function getShipTravelSafePoint(runtime: StarSystemPlanetRuntime, star: Mesh): Vector3 {
  const planetPosition = runtime.mesh.getAbsolutePosition()
  const parkingDirection = getShipParkingPosition(runtime, star).subtract(planetPosition).normalize()
  const safeDistance = runtime.radius + Math.max(TRAVEL_ROUTE_CLEARANCE, runtime.radius * 1.6) + 1.4
  return planetPosition.add(parkingDirection.scale(safeDistance))
}

function getTravelPlan(
  source: StarSystemPlanetRuntime,
  destination: StarSystemPlanetRuntime,
  planets: StarSystemPlanetRuntime[],
  star: Mesh,
): TravelPlan {
  const sourcePoint = getShipParkingPosition(source, star)
  const destinationPoint = getShipParkingPosition(destination, star)
  const routeWaypoints = buildTravelRoute(source, destination, planets, star)
  let distance = 0
  let segmentStart = sourcePoint

  for (const waypoint of routeWaypoints) {
    distance += Vector3.Distance(segmentStart, waypoint)
    segmentStart = waypoint
  }

  distance += Vector3.Distance(segmentStart, destinationPoint)
  const etaSeconds = Math.max(TRAVEL_MIN_ETA_SECONDS, distance / TRAVEL_SPEED)
  const fuelCost = Math.max(TRAVEL_MIN_FUEL_COST, distance * TRAVEL_FUEL_PER_DISTANCE)
  return {
    distance,
    etaSeconds,
    fuelCost,
    routeWaypoints,
  }
}

function getPlanetCameraRadius(planetState: PlanetGameplayState): number {
  return Math.max(9, planetState.runtime.radius * PLANET_CAMERA_RADIUS_MULTIPLIER)
}

function getPlanetCameraPose(planetState: PlanetGameplayState): CameraPose {
  return {
    alpha: PLANET_CAMERA_ALPHA,
    beta: PLANET_CAMERA_BETA,
    radius: getPlanetCameraRadius(planetState),
    target: planetState.runtime.mesh.getAbsolutePosition(),
  }
}

function captureCameraPose(camera: ArcRotateCamera): CameraPose {
  return {
    alpha: camera.alpha,
    beta: camera.beta,
    radius: camera.radius,
    target: camera.getTarget().clone(),
  }
}

function applyCameraPose(camera: ArcRotateCamera, pose: CameraPose): void {
  camera.alpha = pose.alpha
  camera.beta = pose.beta
  camera.radius = pose.radius
  camera.setTarget(pose.target)
}

function interpolateCameraPose(startPose: CameraPose, endPose: CameraPose, t: number): CameraPose {
  return {
    alpha: lerp(startPose.alpha, endPose.alpha, t),
    beta: lerp(startPose.beta, endPose.beta, t),
    radius: lerp(startPose.radius, endPose.radius, t),
    target: Vector3.Lerp(startPose.target, endPose.target, t),
  }
}

function easeInOutCubic(t: number): number {
  if (t <= 0.5) {
    return 4 * t * t * t
  }

  return 1 - ((-2 * t + 2) ** 3) / 2
}

function getTravelCameraAlpha(direction: Vector3): number {
  if (direction.lengthSquared() <= 1e-6) {
    return PLANET_CAMERA_ALPHA
  }

  const normalizedDirection = direction.normalize()
  return Math.atan2(-normalizedDirection.z, -normalizedDirection.x)
}

function getTravelCameraPose(shipPosition: Vector3, direction: Vector3): CameraPose {
  const normalizedDirection = direction.lengthSquared() > 1e-6
    ? direction.normalize()
    : new Vector3(0, 0, 1)

  return {
    alpha: getTravelCameraAlpha(normalizedDirection),
    beta: TRAVEL_CAMERA_BETA,
    radius: TRAVEL_CAMERA_RADIUS,
    target: shipPosition.add(normalizedDirection.scale(TRAVEL_CAMERA_LOOK_AHEAD)),
  }
}

function updateShipAndCamera(
  dt: number,
  camera: ArcRotateCamera,
  ship: TransformNode,
  star: Mesh,
  currentPlanetState: PlanetGameplayState,
  travelState: ShipTravelState | null,
  cameraTransitionState: CameraTransitionState | null,
  planets: StarSystemPlanetRuntime[],
  onArrive: (planetState: PlanetGameplayState) => void,
  burnFuel: (amount: number) => void,
): void {
  const smooth = 1 - Math.exp(-dt * 4.2)

  if (travelState === null) {
    const parkingPosition = getShipParkingPosition(currentPlanetState.runtime, star)
    ship.position = Vector3.Lerp(ship.position, parkingPosition, smooth)
    orientShip(ship, parkingPosition.subtract(currentPlanetState.runtime.mesh.getAbsolutePosition()))

    if (cameraTransitionState?.phase === 'toPlanet' && cameraTransitionState.endPose !== null) {
      cameraTransitionState.elapsed = Math.min(
        cameraTransitionState.duration,
        cameraTransitionState.elapsed + dt,
      )
      const t = easeInOutCubic(cameraTransitionState.elapsed / cameraTransitionState.duration)
      applyCameraPose(
        camera,
        interpolateCameraPose(cameraTransitionState.startPose, cameraTransitionState.endPose, t),
      )
      return
    }

    camera.setTarget(Vector3.Lerp(camera.getTarget(), currentPlanetState.runtime.mesh.getAbsolutePosition(), smooth))
    return
  }

  travelState.elapsed += dt
  const sourceSafePoint = getShipTravelSafePoint(travelState.source.runtime, star)
  const destinationSafePoint = getShipTravelSafePoint(travelState.destination.runtime, star)
  const destinationPoint = getShipParkingPosition(travelState.destination.runtime, star)

  if (!travelState.departureComplete && Vector3.Distance(ship.position, sourceSafePoint) <= 0.45) {
    ship.position.copyFrom(sourceSafePoint)
    travelState.departureComplete = true
  }

  if (
    travelState.departureComplete
    && !travelState.approachStarted
    && Vector3.Distance(ship.position, destinationSafePoint) <= 0.55
  ) {
    ship.position.copyFrom(destinationSafePoint)
    travelState.approachStarted = true
  }

  let activeTarget = destinationPoint
  if (!travelState.departureComplete) {
    activeTarget = sourceSafePoint
  } else if (!travelState.approachStarted) {
    activeTarget = getDynamicTravelTarget(ship.position, destinationSafePoint, planets, star)
  }

  const toTarget = activeTarget.subtract(ship.position)
  const remainingDistance = Vector3.Distance(ship.position, destinationPoint)
  const fallbackDirection = activeTarget.subtract(ship.position)
  const targetDistance = toTarget.length()
  const travelDirection = targetDistance > 1e-4
    ? toTarget.scale(1 / targetDistance)
    : fallbackDirection.lengthSquared() > 1e-6
      ? fallbackDirection.normalize()
      : destinationPoint.subtract(travelState.source.runtime.mesh.getAbsolutePosition()).normalize()

  if (targetDistance > 1e-4) {
    const moveDistance = Math.min(targetDistance, travelState.speed * dt)
    ship.position.addInPlace(toTarget.scale(moveDistance / targetDistance))
    orientShip(ship, toTarget)
    const burnedFuel = Math.min(
      travelState.fuelRemainingToBurn,
      moveDistance * TRAVEL_FUEL_PER_DISTANCE,
    )
    travelState.fuelRemainingToBurn -= burnedFuel
    burnFuel(burnedFuel)
  }

  const travelCameraPose = getTravelCameraPose(ship.position, travelDirection)
  if (cameraTransitionState?.phase === 'toTravel') {
    cameraTransitionState.elapsed = Math.min(
      cameraTransitionState.duration,
      cameraTransitionState.elapsed + dt,
    )
    const t = easeInOutCubic(cameraTransitionState.elapsed / cameraTransitionState.duration)
    applyCameraPose(
      camera,
      interpolateCameraPose(cameraTransitionState.startPose, travelCameraPose, t),
    )
  } else {
    camera.alpha = lerp(camera.alpha, travelCameraPose.alpha, smooth)
    camera.beta = lerp(camera.beta, travelCameraPose.beta, smooth)
    camera.radius = lerp(camera.radius, travelCameraPose.radius, smooth)
    camera.setTarget(Vector3.Lerp(camera.getTarget(), travelCameraPose.target, smooth))
  }

  if (remainingDistance <= Math.max(0.35, travelState.destination.runtime.radius * 0.08)) {
    ship.position.copyFrom(destinationPoint)
    onArrive(travelState.destination)
  }
}

function buildTravelRoute(
  source: StarSystemPlanetRuntime,
  destination: StarSystemPlanetRuntime,
  planets: StarSystemPlanetRuntime[],
  star: Mesh,
): Vector3[] {
  const sourceSafePoint = getShipTravelSafePoint(source, star)
  const destinationSafePoint = getShipTravelSafePoint(destination, star)
  const obstacles = collectTravelObstacles(planets, star)
  const routePoints = buildTravelPathPoints(
    sourceSafePoint,
    destinationSafePoint,
    obstacles,
    star.getAbsolutePosition(),
  )
  return routePoints
}

function getDynamicTravelTarget(
  shipPosition: Vector3,
  destinationPoint: Vector3,
  planets: StarSystemPlanetRuntime[],
  star: Mesh,
): Vector3 {
  const obstacles = collectTravelObstacles(planets, star)
  const routePoints = buildTravelPathPoints(
    shipPosition,
    destinationPoint,
    obstacles,
    star.getAbsolutePosition(),
  )
  return routePoints[1] ?? destinationPoint
}

function buildTravelPathPoints(
  sourcePoint: Vector3,
  destinationPoint: Vector3,
  obstacles: TravelObstacle[],
  starPosition: Vector3,
): Vector3[] {
  const routePoints = [sourcePoint.clone(), destinationPoint.clone()]

  for (let iteration = 0; iteration < TRAVEL_ROUTE_MAX_ITERATIONS; iteration += 1) {
    const blockingObstacle = findBlockingTravelObstacle(routePoints, obstacles)
    if (blockingObstacle === null) {
      break
    }

    const detourPoint = createTravelDetourPoint(
      routePoints[blockingObstacle.segmentIndex],
      routePoints[blockingObstacle.segmentIndex + 1],
      blockingObstacle.closestPoint,
      blockingObstacle.obstacle.center,
      blockingObstacle.obstacle.radius,
      starPosition,
    )
    routePoints.splice(blockingObstacle.segmentIndex + 1, 0, detourPoint)
  }

  return routePoints
}

function collectTravelObstacles(
  planets: StarSystemPlanetRuntime[],
  star: Mesh,
): TravelObstacle[] {
  const obstacles = planets
    .map((planet) => ({
      center: planet.mesh.getAbsolutePosition(),
      radius: planet.radius + Math.max(TRAVEL_ROUTE_CLEARANCE, planet.radius * 1.6),
    }))

  const starScale = Math.max(star.scaling.x, star.scaling.y, star.scaling.z)
  obstacles.push({
    center: star.getAbsolutePosition(),
    radius: 2.6 * starScale + TRAVEL_ROUTE_CLEARANCE * 1.8,
  })

  return obstacles
}

function findBlockingTravelObstacle(
  routePoints: Vector3[],
  obstacles: TravelObstacle[],
): {
  closestPoint: Vector3
  obstacle: TravelObstacle
  segmentIndex: number
} | null {
  let result: {
    closestPoint: Vector3
    obstacle: TravelObstacle
    penetration: number
    segmentIndex: number
  } | null = null

  for (let segmentIndex = 0; segmentIndex < routePoints.length - 1; segmentIndex += 1) {
    const segmentStart = routePoints[segmentIndex]
    const segmentEnd = routePoints[segmentIndex + 1]

    for (const obstacle of obstacles) {
      const closestPoint = getClosestPointOnSegment(segmentStart, segmentEnd, obstacle.center)
      const distance = Vector3.Distance(closestPoint, obstacle.center)
      if (distance >= obstacle.radius) {
        continue
      }

      const penetration = obstacle.radius - distance
      if (result === null || penetration > result.penetration) {
        result = {
          closestPoint,
          obstacle,
          penetration,
          segmentIndex,
        }
      }
    }
  }

  if (result === null) {
    return null
  }

  return {
    closestPoint: result.closestPoint,
    obstacle: result.obstacle,
    segmentIndex: result.segmentIndex,
  }
}

function createTravelDetourPoint(
  segmentStart: Vector3,
  segmentEnd: Vector3,
  closestPoint: Vector3,
  obstacleCenter: Vector3,
  obstacleRadius: number,
  starPosition: Vector3,
): Vector3 {
  const segmentDirection = segmentEnd.subtract(segmentStart).normalize()
  let detourDirection = closestPoint.subtract(obstacleCenter)

  if (detourDirection.lengthSquared() <= 1e-6) {
    detourDirection = Vector3.Cross(segmentDirection, obstacleCenter.subtract(starPosition))
  }

  if (detourDirection.lengthSquared() <= 1e-6) {
    detourDirection = Vector3.Cross(segmentDirection, Vector3.Up())
  }

  if (detourDirection.lengthSquared() <= 1e-6) {
    detourDirection = Vector3.Right()
  }

  const starBias = obstacleCenter.subtract(starPosition)
  if (starBias.lengthSquared() > 1e-6) {
    detourDirection.addInPlace(starBias.normalize().scale(0.42))
  }

  return obstacleCenter.add(detourDirection.normalize().scale(obstacleRadius + 0.8))
}

function getClosestPointOnSegment(
  segmentStart: Vector3,
  segmentEnd: Vector3,
  point: Vector3,
): Vector3 {
  const segment = segmentEnd.subtract(segmentStart)
  const segmentLengthSquared = segment.lengthSquared()
  if (segmentLengthSquared <= 1e-6) {
    return segmentStart.clone()
  }

  const t = Vector3.Dot(point.subtract(segmentStart), segment) / segmentLengthSquared
  const clampedT = Math.max(0, Math.min(1, t))
  return segmentStart.add(segment.scale(clampedT))
}

function orientShip(ship: TransformNode, direction: Vector3): void {
  if (direction.lengthSquared() <= 1e-6) {
    return
  }

  ship.lookAt(ship.position.add(direction.normalize()))
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

function createHud(
  scene: Scene,
  onCarryTransfer: (result: {
    itemId: CarryItemId
    removedFromBackpack: number
    returnedToBackpack: CarrySlotItem | null
  }) => void,
  onFabricateHarvesterPressed: () => void,
): {
  consumeSelectedCarryItem: (amount: number) => number
  consumeResourcesFromCarry: (cost: UpgradeCost) => UpgradeCost
  getCarryResourceInventory: () => ResourceInventory
  getSelectedCarryItemId: () => CarryItemId | null
  update: (state: HudState) => void
} {
  const ui = AdvancedDynamicTexture.CreateFullscreenUI('stellar-sea-ui', true, scene)
  ui.idealWidth = 1600
  ui.idealHeight = 900
  ui.useSmallestIdeal = true
  ui.renderAtIdealSize = true
  const tooltipLayer = new Rectangle('tooltip-layer')
  tooltipLayer.width = '100%'
  tooltipLayer.height = '100%'
  tooltipLayer.thickness = 0
  tooltipLayer.background = ''
  tooltipLayer.isPointerBlocker = false
  tooltipLayer.clipChildren = false
  tooltipLayer.zIndex = 1000
  ui.addControl(tooltipLayer)
  const tooltip = createTooltipManager(scene, tooltipLayer)
  const carrySlots: (CarrySlotItem | null)[] = Array.from({ length: 7 }, () => null)
  let selectedCarrySlotIndex = 0
  let latestState: HudState | null = null
  let redrawHud = () => {}

  function getBackpackItemCount(state: HudState, itemId: CarryItemId): number {
    return itemId === 'harvester' ? state.availableHarvesters : state.resources[itemId]
  }

  function getSelectedCarrySlot(): CarrySlotItem | null {
    return carrySlots[selectedCarrySlotIndex]
  }

  function requestAssignCarryItem(itemId: CarryItemId): void {
    if (latestState === null) {
      return
    }

    const backpackAmount = getBackpackItemCount(latestState, itemId)
    if (backpackAmount <= 0) {
      return
    }

    const selectedSlot = getSelectedCarrySlot()
    let returnedToBackpack: CarrySlotItem | null = null

    if (selectedSlot === null) {
      carrySlots[selectedCarrySlotIndex] = { amount: backpackAmount, itemId }
    } else if (selectedSlot.itemId === itemId) {
      selectedSlot.amount += backpackAmount
    } else {
      returnedToBackpack = { ...selectedSlot }
      carrySlots[selectedCarrySlotIndex] = { amount: backpackAmount, itemId }
    }

    onCarryTransfer({
      itemId,
      removedFromBackpack: backpackAmount,
      returnedToBackpack,
    })
    redrawHud()
  }

  const backpackPanel = createFixedPanel('0px', '-110px', '420px', '520px')
  backpackPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  backpackPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM
  backpackPanel.thickness = 2
  backpackPanel.color = '#000000'
  backpackPanel.background = '#c6c6c6ee'
  backpackPanel.cornerRadius = 2
  backpackPanel.clipChildren = false
  backpackPanel.isPointerBlocker = true
  backpackPanel.isVisible = false
  backpackPanel.zIndex = 1100
  ui.addControl(backpackPanel)

  const backpackTitle = createText('背包', 18, '#2a2a2a', 24, true)
  backpackTitle.width = '100%'
  backpackTitle.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  backpackTitle.top = '10px'
  backpackTitle.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  backpackTitle.outlineWidth = 0
  backpackTitle.fontFamily = "'Courier New','Consolas',monospace"
  backpackPanel.addControl(backpackTitle)

  const backpackGrid = new Rectangle('backpack-grid')
  backpackGrid.width = '372px'
  backpackGrid.height = '420px'
  backpackGrid.thickness = 0
  backpackGrid.background = ''
  backpackGrid.top = '42px'
  backpackGrid.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  backpackGrid.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  backpackGrid.isPointerBlocker = false
  backpackPanel.addControl(backpackGrid)

  for (let index = 0; index < 30; index += 1) {
    createBackpackEmptySlot(backpackGrid, index)
  }

  const backpackCards = RESOURCE_KINDS.map((kind, index) =>
    createBackpackResourceCard(backpackGrid, tooltip, kind, index),
  )
  for (const card of backpackCards) {
    card.panel.isPointerBlocker = true
    card.panel.hoverCursor = 'pointer'
    card.panel.onPointerClickObservable.add(() => {
      requestAssignCarryItem(card.kind)
    })
  }
  const harvesterBackpackCard = createBackpackSpecialCard(
    backpackGrid,
    tooltip,
    6,
    '/gui/harvester.svg',
    '采集器库存',
  )
  harvesterBackpackCard.panel.isPointerBlocker = true
  harvesterBackpackCard.panel.hoverCursor = 'pointer'
  harvesterBackpackCard.panel.onPointerClickObservable.add(() => {
    requestAssignCarryItem('harvester')
  })

  const workshopPanel = createFixedPanel('0px', '-110px', '484px', '336px')
  workshopPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  workshopPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM
  workshopPanel.thickness = 2
  workshopPanel.color = '#000000'
  workshopPanel.background = '#c6c6c6ee'
  workshopPanel.cornerRadius = 2
  workshopPanel.clipChildren = false
  workshopPanel.isPointerBlocker = true
  workshopPanel.isVisible = false
  workshopPanel.zIndex = 1100
  ui.addControl(workshopPanel)

  const workshopTitle = createText('工具台', 18, '#2a2a2a', 24, true)
  workshopTitle.width = '100%'
  workshopTitle.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  workshopTitle.top = '10px'
  workshopTitle.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  workshopTitle.outlineWidth = 0
  workshopTitle.fontFamily = "'Courier New','Consolas',monospace"
  workshopPanel.addControl(workshopTitle)

  const workshopSearch = new InputText('workshop-search')
  workshopSearch.width = '170px'
  workshopSearch.height = '28px'
  workshopSearch.left = '-146px'
  workshopSearch.top = '42px'
  workshopSearch.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  workshopSearch.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  workshopSearch.thickness = 2
  workshopSearch.color = '#1f1f1f'
  workshopSearch.background = '#ededed'
  workshopSearch.focusedBackground = '#ffffff'
  workshopSearch.placeholderText = '搜索物品'
  workshopSearch.placeholderColor = '#707070'
  workshopSearch.fontSize = 12
  workshopSearch.fontFamily = "'Courier New','Consolas',monospace"
  workshopSearch.text = ''
  workshopPanel.addControl(workshopSearch)

  const workshopList = createFixedPanel('-146px', '84px', '170px', '212px')
  workshopList.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  workshopList.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  workshopList.cornerRadius = 2
  workshopList.thickness = 2
  workshopList.color = '#2f2f2f'
  workshopList.background = '#9e9e9eee'
  workshopList.clipChildren = false
  workshopList.isPointerBlocker = true
  workshopPanel.addControl(workshopList)

  const workshopDetail = createWorkshopDetailPanel(workshopPanel)
  workshopDetail.panel.left = '94px'
  workshopDetail.panel.top = '42px'

  const workshopCatalog = [
    {
      actionLabel: '制造',
      description: '部署到资源节点后会持续采集资源。再次点击已部署节点时可继续升级采集效率。',
      effect: '用途: 增加 1 台可部署采集器，离开星球时会自动回收。',
      icon: '/gui/harvester.svg',
      id: 'harvester',
      keywords: ['采集器', '收集', '部署', 'harvester'],
      summary: '自动采集资源',
      title: '采集器',
    },
  ] as const
  let workshopSearchQuery = ''
  let selectedWorkshopItemId: (typeof workshopCatalog)[number]['id'] | null = workshopCatalog[0]?.id ?? null

  const workshopEntries = workshopCatalog.map((item, index) =>
    createWorkshopListEntry(workshopList, tooltip, item.icon, item.title, item.summary, index, () => {
      selectedWorkshopItemId = item.id
    }),
  )
  workshopSearch.onTextChangedObservable.add(() => {
    workshopSearchQuery = workshopSearch.text.trim().toLowerCase()
    const firstVisibleItem = workshopCatalog.find((item) => matchesWorkshopItem(item, workshopSearchQuery))
    if (selectedWorkshopItemId !== null) {
      const selectedStillVisible = workshopCatalog.some(
        (item) => item.id === selectedWorkshopItemId && matchesWorkshopItem(item, workshopSearchQuery),
      )
      if (!selectedStillVisible) {
        selectedWorkshopItemId = firstVisibleItem?.id ?? null
      }
    } else {
      selectedWorkshopItemId = firstVisibleItem?.id ?? null
    }
  })
  workshopDetail.button.onPointerClickObservable.add(() => {
    if (selectedWorkshopItemId === 'harvester') {
      onFabricateHarvesterPressed()
    }
  })

  const hotbar = createFixedPanel('0px', '-14px', '404px', '54px')
  hotbar.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  hotbar.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM
  hotbar.cornerRadius = 2
  hotbar.thickness = 2
  hotbar.color = '#000000'
  hotbar.background = '#8b8b8bee'
  hotbar.isPointerBlocker = true
  hotbar.zIndex = 1200
  ui.addControl(hotbar)

  let activePanel: 'none' | 'backpack' | 'workshop' = 'none'

  const backpackSlot = createHotbarIconSlot({
    index: 0,
    onPress: () => {
      activePanel = activePanel === 'backpack' ? 'none' : 'backpack'
    },
    parent: hotbar,
    source: '/gui/inventory.svg',
    tooltip,
    tooltipText: '背包',
  })
  const workshopSlot = createHotbarIconSlot({
    index: 1,
    onPress: () => {
      activePanel = activePanel === 'workshop' ? 'none' : 'workshop'
    },
    parent: hotbar,
    source: '/gui/workshop.svg',
    tooltip,
    tooltipText: '工具台',
  })
  const carrySlotHandles = Array.from({ length: 7 }, (_, index) =>
    createHotbarIconSlot({
      index: index + 2,
      onPress: () => {
        selectedCarrySlotIndex = index
        if (latestState !== null) {
          redrawHud()
        }
      },
      parent: hotbar,
      source: '/gui/status.svg',
      tooltip,
      tooltipText: '空携带槽',
    }),
  )

  const toastPanel = createFixedPanel('0px', '18px', '280px', '50px')
  toastPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  toastPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  toastPanel.alpha = 0
  ui.addControl(toastPanel)

  const toastIcon = createIcon('/gui/status.svg', '-108px', '0px', 20)
  toastPanel.addControl(toastIcon)
  const toastValue = createText('', 14, '#f4f1d7', 22)
  toastValue.left = '12px'
  toastValue.top = '10px'
  toastValue.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  toastPanel.addControl(toastValue)

  const targetMarker = createFixedPanel('0px', '0px', '212px', '94px')
  targetMarker.thickness = 1
  targetMarker.background = '#070d1acc'
  targetMarker.clipChildren = false
  targetMarker.alpha = 0
  targetMarker.linkOffsetY = -74
  targetMarker.isVisible = false
  ui.addControl(targetMarker)

  const targetMarkerIcon = createIconWithTooltip({
    left: '12px',
    parent: targetMarker,
    size: 24,
    source: '/gui/resource.svg',
    tooltip,
    tooltipText: '',
    tooltipWidth: '96px',
    top: '23px',
  })
  const markerDetail = createText('', 12, '#f4f1d7', 18)
  markerDetail.width = '152px'
  markerDetail.left = '48px'
  markerDetail.top = '18px'
  markerDetail.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  markerDetail.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  targetMarker.addControl(markerDetail)
  const markerOutput = createText('', 12, '#7bdbd8', 18)
  markerOutput.width = '152px'
  markerOutput.left = '48px'
  markerOutput.top = '44px'
  markerOutput.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  markerOutput.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  targetMarker.addControl(markerOutput)

  let toastTimeRemaining = 0
  let lastToastToken = -1

  const hudController = {
    consumeSelectedCarryItem(amount: number): number {
      const slot = getSelectedCarrySlot()
      if (slot === null) {
        return 0
      }

      const consumed = Math.min(slot.amount, amount)
      slot.amount -= consumed
      if (slot.amount <= 1e-6) {
        carrySlots[selectedCarrySlotIndex] = null
      }
      return consumed
    },
    consumeResourcesFromCarry(cost: UpgradeCost): UpgradeCost {
      const remainingCost: UpgradeCost = { ...cost }
      for (const slot of carrySlots) {
        if (slot === null || slot.itemId === 'harvester') {
          continue
        }

        const required = remainingCost[slot.itemId] ?? 0
        if (required <= 0) {
          continue
        }

        const consumed = Math.min(slot.amount, required)
        slot.amount -= consumed
        remainingCost[slot.itemId] = required - consumed
        if (slot.amount <= 1e-6) {
          const slotIndex = carrySlots.indexOf(slot)
          if (slotIndex !== -1) {
            carrySlots[slotIndex] = null
          }
        }
      }
      return remainingCost
    },
    getCarryResourceInventory(): ResourceInventory {
      const inventory = createEmptyInventory()
      for (const slot of carrySlots) {
        if (slot === null || slot.itemId === 'harvester') {
          continue
        }
        inventory[slot.itemId] += slot.amount
      }
      return inventory
    },
    getSelectedCarryItemId: () => getSelectedCarrySlot()?.itemId ?? null,
    update(state: HudState) {
      latestState = state
      let visibleBackpackSlotIndex = 0
      for (const card of backpackCards) {
        const amount = state.resources[card.kind]
        const rate = state.resourceRates[card.kind]
        const visible = amount > 0 || rate > 0
        card.value.text = amount.toFixed(1)
        card.rate.text = rate > 0 ? `+${rate.toFixed(1)}` : ''
        card.panel.alpha = 1
        card.panel.color = getSelectedCarrySlot()?.itemId === card.kind
          ? '#ffffff'
          : carrySlots.some((slot) => slot?.itemId === card.kind)
            ? '#d6c685'
            : '#2f2f2f'
        card.panel.isVisible = visible
        card.panel.isPointerBlocker = visible
        if (visible) {
          const { left, top } = getBackpackSlotPosition(visibleBackpackSlotIndex)
          card.panel.left = left
          card.panel.top = top
          visibleBackpackSlotIndex += 1
        }
      }

      const harvesterVisible = state.availableHarvesters > 0
      harvesterBackpackCard.value.text = state.availableHarvesters.toFixed(0)
      harvesterBackpackCard.rate.text = ''
      harvesterBackpackCard.panel.alpha = 1
      harvesterBackpackCard.panel.color = getSelectedCarrySlot()?.itemId === 'harvester'
        ? '#ffffff'
        : carrySlots.some((slot) => slot?.itemId === 'harvester')
          ? '#d6c685'
          : '#2f2f2f'
      harvesterBackpackCard.panel.isVisible = harvesterVisible
      harvesterBackpackCard.panel.isPointerBlocker = harvesterVisible
      if (harvesterVisible) {
        const { left, top } = getBackpackSlotPosition(visibleBackpackSlotIndex)
        harvesterBackpackCard.panel.left = left
        harvesterBackpackCard.panel.top = top
      }

      for (let index = 0; index < carrySlotHandles.length; index += 1) {
        const handle = carrySlotHandles[index]
        const slot = carrySlots[index]
        if (slot === null) {
          handle.setSource('')
          handle.setTooltipText('空携带槽')
          handle.icon.alpha = 0
          handle.badge.isVisible = false
          setHotbarIconSlotState(handle, selectedCarrySlotIndex === index, true)
          continue
        }

        const icon = slot.itemId === 'harvester' ? '/gui/harvester.svg' : getResourceUi(slot.itemId).icon
        const label = slot.itemId === 'harvester' ? '采集器' : getKindLabel(slot.itemId)
        const count = slot.amount
        handle.setSource(icon)
        handle.setTooltipText(label)
        handle.icon.alpha = count > 0 ? 1 : 0.34
        handle.badge.text = formatCarrySlotCount(count)
        handle.badge.isVisible = true
        setHotbarIconSlotState(handle, selectedCarrySlotIndex === index, true)
      }

      let visibleWorkshopIndex = 0
      for (let index = 0; index < workshopCatalog.length; index += 1) {
        const item = workshopCatalog[index]
        const entry = workshopEntries[index]
        const visible = matchesWorkshopItem(item, workshopSearchQuery)
        entry.button.isVisible = visible
        if (!visible) {
          continue
        }

        entry.button.top = `${10 + visibleWorkshopIndex * 58}px`
        entry.button.background = item.id === selectedWorkshopItemId ? '#cfcfcfee' : '#b5b5b5ee'
        entry.button.color = item.id === selectedWorkshopItemId ? '#000000' : '#454545'
        visibleWorkshopIndex += 1
      }

      const selectedWorkshopItem =
        workshopCatalog.find((item) => item.id === selectedWorkshopItemId && matchesWorkshopItem(item, workshopSearchQuery))
        ?? null
      updateWorkshopDetailPanel(
        workshopDetail,
        selectedWorkshopItem === null
          ? null
          : {
              actionLabel: selectedWorkshopItem.actionLabel,
              affordableLabel: `材料齐全 · 库存 ${state.availableHarvesters} 台`,
              cost: getHarvesterFabricationCost(),
              description: selectedWorkshopItem.description,
              disabled: false,
              effect: selectedWorkshopItem.effect,
              resources: state.resources,
              shortageLabel: '材料不足',
              subtitle: selectedWorkshopItem.summary,
              title: selectedWorkshopItem.title,
            },
      )

      backpackPanel.isVisible = activePanel === 'backpack'
      workshopPanel.isVisible = activePanel === 'workshop'
      setHotbarIconSlotState(backpackSlot, activePanel === 'backpack', true)
      setHotbarIconSlotState(workshopSlot, activePanel === 'workshop', true)
      backpackSlot.badge.isVisible = false
      workshopSlot.badge.isVisible = false

      if (state.hoveredNode === null) {
        targetMarker.isVisible = false
        targetMarker.alpha = 0
      } else {
        targetMarker.isVisible = true
        targetMarker.alpha = 1
        targetMarkerIcon.setSource(getResourceUi(state.hoveredNode.kind).icon)
        targetMarkerIcon.setTooltipText(state.hoveredNode.label)
        markerDetail.text = `${state.hoveredNode.reserve.toFixed(0)} / ${state.hoveredNode.totalReserve.toFixed(0)}`
        markerOutput.text = getNodeMarkerOutput(state.hoveredNode)
        targetMarker.linkWithMesh(state.hoveredNode.hitArea)
      }

      if (state.toastToken !== lastToastToken) {
        lastToastToken = state.toastToken
        toastTimeRemaining = 2.4
        toastValue.text = state.toastMessage
        toastPanel.alpha = 1
      }

      if (toastTimeRemaining > 0) {
        toastTimeRemaining = Math.max(0, toastTimeRemaining - scene.getEngine().getDeltaTime() * 0.001)
        toastPanel.alpha = toastTimeRemaining > 0.35 ? 1 : toastTimeRemaining / 0.35
      } else {
        toastPanel.alpha = 0
      }
    },
  }

  redrawHud = () => {
    if (latestState !== null) {
      hudController.update(latestState)
    }
  }

  return hudController
}

function createBackpackResourceCard(
  parent: Rectangle,
  tooltip: TooltipManager,
  kind: ResourceKind,
  index: number,
): HudBackpackResourceCardHandle {
  const ui = getResourceUi(kind)
  const { left, top } = getBackpackSlotPosition(index)
  const panel = createFixedPanel(left, top, '60px', '60px')
  panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  panel.cornerRadius = 2
  panel.thickness = 2
  panel.background = '#8b8b8bee'
  panel.color = '#2f2f2f'
  panel.clipChildren = true
  panel.isPointerBlocker = false
  parent.addControl(panel)

  const iconHandle = createIconWithTooltip({
    iconHorizontalAlignment: Control.HORIZONTAL_ALIGNMENT_CENTER,
    iconVerticalAlignment: Control.VERTICAL_ALIGNMENT_CENTER,
    left: '0px',
    parent: panel,
    size: 36,
    source: ui.icon,
    tooltip,
    tooltipText: getKindLabel(kind),
    tooltipWidth: '86px',
    top: '0px',
  })

  const valueBadge = createFixedPanel('35px', '43px', '20px', '12px')
  valueBadge.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  valueBadge.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  valueBadge.cornerRadius = 2
  valueBadge.thickness = 1
  valueBadge.color = '#161616'
  valueBadge.background = '#242424ee'
  valueBadge.isPointerBlocker = false
  panel.addControl(valueBadge)

  const value = createText('0', 13, '#ffffff', 16, true)
  value.width = '100%'
  value.height = '100%'
  value.fontSize = 9
  value.top = '-1px'
  value.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  value.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  value.outlineWidth = 2
  value.outlineColor = '#111111'
  value.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  value.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  value.fontFamily = "'Courier New','Consolas',monospace"
  valueBadge.addControl(value)

  const rate = createText('', 9, '#ffffff', 12, true)
  rate.width = '28px'
  rate.height = '10px'
  rate.left = '4px'
  rate.top = '4px'
  rate.fontSize = 7
  rate.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  rate.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  rate.outlineWidth = 1
  rate.outlineColor = '#111111'
  rate.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  rate.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  rate.fontFamily = "'Courier New','Consolas',monospace"
  panel.addControl(rate)

  return {
    icon: iconHandle.icon,
    kind,
    panel,
    rate,
    value,
  }
}

function createBackpackEmptySlot(parent: Rectangle, index: number): void {
  const { left, top } = getBackpackSlotPosition(index)
  const panel = createFixedPanel(left, top, '60px', '60px')
  panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  panel.cornerRadius = 2
  panel.thickness = 2
  panel.background = '#8b8b8bee'
  panel.color = '#2f2f2f'
  panel.clipChildren = true
  panel.isPointerBlocker = false
  parent.addControl(panel)
}

function createBackpackSpecialCard(
  parent: Rectangle,
  tooltip: TooltipManager,
  index: number,
  iconSource: string,
  tooltipText: string,
): HudBackpackSpecialCardHandle {
  const { left, top } = getBackpackSlotPosition(index)
  const panel = createFixedPanel(left, top, '60px', '60px')
  panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  panel.cornerRadius = 2
  panel.thickness = 2
  panel.background = '#8b8b8bee'
  panel.color = '#2f2f2f'
  panel.clipChildren = true
  panel.isPointerBlocker = false
  parent.addControl(panel)

  createIconWithTooltip({
    iconHorizontalAlignment: Control.HORIZONTAL_ALIGNMENT_CENTER,
    iconVerticalAlignment: Control.VERTICAL_ALIGNMENT_CENTER,
    left: '0px',
    parent: panel,
    size: 36,
    source: iconSource,
    tooltip,
    tooltipText,
    tooltipWidth: '96px',
    top: '0px',
  })

  const valueBadge = createFixedPanel('35px', '43px', '20px', '12px')
  valueBadge.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  valueBadge.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  valueBadge.cornerRadius = 2
  valueBadge.thickness = 1
  valueBadge.color = '#161616'
  valueBadge.background = '#242424ee'
  valueBadge.isPointerBlocker = false
  panel.addControl(valueBadge)

  const value = createText('0', 13, '#ffffff', 16, true)
  value.width = '100%'
  value.height = '100%'
  value.fontSize = 9
  value.top = '-1px'
  value.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  value.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  value.outlineWidth = 2
  value.outlineColor = '#111111'
  value.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  value.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  value.fontFamily = "'Courier New','Consolas',monospace"
  valueBadge.addControl(value)

  const rate = createText('', 9, '#ffffff', 12, true)
  rate.width = '28px'
  rate.height = '10px'
  rate.left = '4px'
  rate.top = '4px'
  rate.fontSize = 7
  rate.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  rate.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  rate.outlineWidth = 1
  rate.outlineColor = '#111111'
  rate.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  rate.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  rate.fontFamily = "'Courier New','Consolas',monospace"
  panel.addControl(rate)

  return {
    panel,
    rate,
    value,
  }
}

function createWorkshopListEntry(
  parent: Rectangle,
  tooltip: TooltipManager,
  iconSource: string,
  titleText: string,
  subtitleText: string,
  index: number,
  onClick: () => void,
): HudWorkshopListEntryHandle {
  const button = createFixedPanel('0px', `${10 + index * 58}px`, '150px', '48px')
  button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  button.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  button.cornerRadius = 2
  button.thickness = 2
  button.color = '#454545'
  button.background = '#b5b5b5ee'
  button.isPointerBlocker = true
  parent.addControl(button)
  button.onPointerClickObservable.add(() => {
    onClick()
  })

  const iconSlot = createFixedPanel('10px', '0px', '30px', '30px')
  iconSlot.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  iconSlot.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  iconSlot.cornerRadius = 2
  iconSlot.thickness = 2
  iconSlot.color = '#2f2f2f'
  iconSlot.background = '#d8d8d8ee'
  iconSlot.isPointerBlocker = false
  button.addControl(iconSlot)

  const iconHandle = createIconWithTooltip({
    iconHorizontalAlignment: Control.HORIZONTAL_ALIGNMENT_CENTER,
    iconVerticalAlignment: Control.VERTICAL_ALIGNMENT_CENTER,
    left: '0px',
    parent: iconSlot,
    size: 24,
    source: iconSource,
    tooltip,
    tooltipText: titleText,
    tooltipWidth: '88px',
    top: '0px',
  })

  const title = createText(titleText, 12, '#1f1f1f', 16, true)
  title.width = '92px'
  title.left = '45px'
  title.top = '-7px'
  title.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  title.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  title.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  title.outlineWidth = 0
  title.fontFamily = "'Courier New','Consolas',monospace"
  button.addControl(title)

  const summary = createText(subtitleText, 10, '#2f2f2f', 14)
  summary.width = '92px'
  summary.left = '45px'
  summary.top = '8px'
  summary.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  summary.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  summary.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  summary.outlineWidth = 0
  summary.fontFamily = "'Courier New','Consolas',monospace"
  button.addControl(summary)

  return {
    button,
    icon: iconHandle.icon,
    summary,
    title,
  }
}

function createRecipeCostChip(parent: Rectangle, index: number): HudRecipeCostChipHandle {
  const columnOffset = index % 2 === 0 ? -48 : 48
  const chip = createFixedPanel(`${columnOffset}px`, `${170 + Math.floor(index / 2) * 26}px`, '86px', '22px')
  chip.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  chip.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  chip.cornerRadius = 2
  chip.thickness = 2
  chip.color = '#2f2f2f'
  chip.background = '#c6c6c6ee'
  chip.isPointerBlocker = false
  parent.addControl(chip)

  const icon = new Image(`recipe-chip-icon-${index}`, '/gui/resource-water.svg')
  icon.width = '12px'
  icon.height = '12px'
  icon.left = '11px'
  icon.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  icon.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  icon.isPointerBlocker = false
  chip.addControl(icon)

  const value = createText('0/0', 11, '#d8e5ef', 16, true)
  value.width = '46px'
  value.left = '10px'
  value.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  value.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  value.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  value.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  value.outlineWidth = 0
  value.color = '#1f1f1f'
  value.fontFamily = "'Courier New','Consolas',monospace"
  chip.addControl(value)

  return {
    icon,
    panel: chip,
    value,
  }
}

function createWorkshopDetailPanel(parent: Rectangle): HudWorkshopDetailHandle {
  const panel = createFixedPanel('0px', '0px', '274px', '264px')
  panel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  panel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  panel.cornerRadius = 2
  panel.thickness = 2
  panel.color = '#2f2f2f'
  panel.background = '#b5b5b5ee'
  panel.clipChildren = false
  panel.isPointerBlocker = true
  parent.addControl(panel)

  const title = createText('', 16, '#1f1f1f', 22, true)
  title.width = '236px'
  title.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  title.top = '12px'
  title.outlineWidth = 0
  title.fontFamily = "'Courier New','Consolas',monospace"
  panel.addControl(title)

  const summary = createText('', 11, '#2f2f2f', 16, true)
  summary.width = '236px'
  summary.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  summary.top = '36px'
  summary.outlineWidth = 0
  summary.fontFamily = "'Courier New','Consolas',monospace"
  panel.addControl(summary)

  const descriptionPanel = createFixedPanel('0px', '58px', '236px', '58px')
  descriptionPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  descriptionPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  descriptionPanel.cornerRadius = 2
  descriptionPanel.thickness = 2
  descriptionPanel.color = '#6a6a6a'
  descriptionPanel.background = '#cdcdcdee'
  descriptionPanel.isPointerBlocker = false
  panel.addControl(descriptionPanel)

  const descriptionLabel = createText('说明', 10, '#4a4a4a', 14, true)
  descriptionLabel.width = '214px'
  descriptionLabel.left = '10px'
  descriptionLabel.top = '3px'
  descriptionLabel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  descriptionLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  descriptionLabel.outlineWidth = 0
  descriptionLabel.fontFamily = "'Courier New','Consolas',monospace"
  descriptionPanel.addControl(descriptionLabel)

  const description = createText('', 11, '#2f2f2f', 34)
  description.width = '214px'
  description.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  description.top = '18px'
  description.outlineWidth = 0
  description.textWrapping = true
  description.fontFamily = "'Courier New','Consolas',monospace"
  descriptionPanel.addControl(description)

  const effectPanel = createFixedPanel('0px', '122px', '236px', '34px')
  effectPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  effectPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  effectPanel.cornerRadius = 2
  effectPanel.thickness = 2
  effectPanel.color = '#6a6a6a'
  effectPanel.background = '#cdcdcdee'
  effectPanel.isPointerBlocker = false
  panel.addControl(effectPanel)

  const effectLabel = createText('用途', 10, '#4a4a4a', 14, true)
  effectLabel.width = '214px'
  effectLabel.left = '10px'
  effectLabel.top = '3px'
  effectLabel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  effectLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  effectLabel.outlineWidth = 0
  effectLabel.fontFamily = "'Courier New','Consolas',monospace"
  effectPanel.addControl(effectLabel)

  const effect = createText('', 10, '#1f1f1f', 16)
  effect.width = '214px'
  effect.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  effect.top = '16px'
  effect.outlineWidth = 0
  effect.textWrapping = true
  effect.fontFamily = "'Courier New','Consolas',monospace"
  effectPanel.addControl(effect)

  const materialLabel = createText('材料', 10, '#4a4a4a', 14, true)
  materialLabel.width = '236px'
  materialLabel.left = '19px'
  materialLabel.top = '152px'
  materialLabel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  materialLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  materialLabel.outlineWidth = 0
  materialLabel.fontFamily = "'Courier New','Consolas',monospace"
  panel.addControl(materialLabel)

  const costChips: HudRecipeCostChipHandle[] = []
  for (let index = 0; index < 4; index += 1) {
    costChips.push(createRecipeCostChip(panel, index))
  }

  const status = createText('', 11, '#1f1f1f', 18, true)
  status.width = '236px'
  status.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  status.top = '224px'
  status.outlineWidth = 0
  status.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  status.fontFamily = "'Courier New','Consolas',monospace"
  panel.addControl(status)

  const button = createFixedPanel('0px', '240px', '236px', '18px')
  button.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  button.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  button.cornerRadius = 2
  button.thickness = 2
  button.color = '#2f2f2f'
  button.background = '#d8d8d8ee'
  button.isPointerBlocker = true
  panel.addControl(button)

  const buttonLabel = createText('', 11, '#1f1f1f', 16, true)
  buttonLabel.width = '100%'
  buttonLabel.height = '100%'
  buttonLabel.top = '0px'
  buttonLabel.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  buttonLabel.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER
  buttonLabel.outlineWidth = 0
  buttonLabel.fontFamily = "'Courier New','Consolas',monospace"
  button.addControl(buttonLabel)

  const emptyState = createText('没有匹配的配方', 12, '#2f2f2f', 18, true)
  emptyState.width = '236px'
  emptyState.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  emptyState.top = '120px'
  emptyState.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER
  emptyState.outlineWidth = 0
  emptyState.fontFamily = "'Courier New','Consolas',monospace"
  emptyState.isVisible = false
  panel.addControl(emptyState)

  return {
    button,
    buttonLabel,
    costChips,
    description,
    effect,
    emptyState,
    panel,
    status,
    summary,
    title,
  }
}

function updateWorkshopDetailPanel(
  handle: HudWorkshopDetailHandle,
  config: {
    actionLabel: string
    affordableLabel: string
    cost: UpgradeCost
    description: string
    disabled: boolean
    effect: string
    resources: ResourceInventory
    shortageLabel: string
    subtitle: string
    title: string
  } | null,
): void {
  if (config === null) {
    handle.emptyState.isVisible = true
    handle.title.isVisible = false
    handle.summary.isVisible = false
    handle.description.isVisible = false
    handle.effect.isVisible = false
    handle.status.isVisible = false
    handle.button.isVisible = false
    for (const chip of handle.costChips) {
      chip.panel.isVisible = false
    }
    return
  }

  handle.emptyState.isVisible = false
  handle.title.isVisible = true
  handle.summary.isVisible = true
  handle.description.isVisible = true
  handle.effect.isVisible = true
  handle.status.isVisible = true
  handle.button.isVisible = true
  handle.title.text = config.title
  handle.summary.text = config.subtitle
  handle.description.text = config.description
  handle.effect.text = config.effect
  handle.buttonLabel.text = config.actionLabel

  const costKinds = RESOURCE_KINDS.filter((kind) => (config.cost[kind] ?? 0) > 0)
  const affordable = !config.disabled && hasInventory(config.resources, config.cost)
  handle.status.text = config.disabled
    ? config.affordableLabel
    : affordable
      ? config.affordableLabel
      : config.shortageLabel
  handle.status.color = config.disabled ? '#808080' : affordable ? '#237a2b' : '#8d4c25'
  handle.button.alpha = config.disabled ? 0.42 : affordable ? 1 : 0.78
  handle.button.isPointerBlocker = !config.disabled
  handle.button.background = config.disabled ? '#b0b0b0ee' : affordable ? '#d8d8d8ee' : '#c4b7b7ee'
  handle.button.color = '#2f2f2f'

  for (let index = 0; index < handle.costChips.length; index += 1) {
    const chip = handle.costChips[index]
    const kind = costKinds[index]
    if (kind === undefined) {
      chip.panel.isVisible = false
      continue
    }

    const required = config.cost[kind] ?? 0
    const current = config.resources[kind]
    chip.panel.isVisible = true
    chip.icon.source = getResourceUi(kind).icon
    chip.icon.name = `${kind}-recipe-chip`
    chip.value.text = `${current.toFixed(0)}/${required.toFixed(0)}`
    chip.value.color = current + 1e-6 >= required ? '#1d6723' : '#8d4c25'
    chip.panel.color = '#2f2f2f'
    chip.panel.background = current + 1e-6 >= required ? '#c8e7c8ee' : '#e2c4b3ee'
  }
}

function matchesWorkshopItem(
  item: { keywords: readonly string[]; summary: string; title: string },
  query: string,
): boolean {
  if (!query) {
    return true
  }

  const haystack = [item.title, item.summary, ...item.keywords].join(' ').toLowerCase()
  return haystack.includes(query)
}

function getBackpackSlotPosition(index: number): { left: string; top: string } {
  const column = index % 5
  const row = Math.floor(index / 5)
  return {
    left: `${(column - 2) * 72}px`,
    top: `${6 + row * 72}px`,
  }
}

function createFixedPanel(left: string, top: string, width: string, height: string): Rectangle {
  const panel = new Rectangle()
  panel.width = width
  panel.height = height
  panel.thickness = 1
  panel.cornerRadius = 8
  panel.color = '#7bdbd855'
  panel.background = '#070d1acc'
  panel.left = left
  panel.top = top
  panel.isPointerBlocker = false
  return panel
}

function createIcon(source: string, left: string, top: string, size: number): Image {
  const icon = new Image(source, source)
  icon.width = `${size}px`
  icon.height = `${size}px`
  icon.left = left
  icon.top = top
  icon.isPointerBlocker = false
  return icon
}

function createText(
  text: string,
  fontSize: number,
  color: string,
  height: number,
  bold = false,
): TextBlock {
  const block = new TextBlock()
  block.text = text
  block.color = color
  block.fontSize = fontSize
  block.height = `${height}px`
  block.textWrapping = true
  block.resizeToFit = false
  block.outlineWidth = 1
  block.outlineColor = '#040711ee'
  block.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT
  block.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP
  block.paddingTop = '2px'
  block.paddingBottom = '2px'
  block.fontFamily = "'Microsoft YaHei','PingFang SC','Noto Sans SC',sans-serif"
  if (bold) {
    block.fontWeight = '700'
  }
  return block
}

function getHarvesterFabricationCost(): UpgradeCost {
  return {
    copper: 4,
    ironNickel: 7,
    silicate: 4,
  }
}

function createEmptyInventory(): ResourceInventory {
  return {
    copper: 0,
    ironNickel: 0,
    rareEarth: 0,
    silicate: 0,
    titanium: 0,
    water: 0,
  }
}

function hasInventory(inventory: ResourceInventory, cost: UpgradeCost): boolean {
  for (const kind of RESOURCE_KINDS) {
    const required = cost[kind] ?? 0
    if (inventory[kind] + 1e-6 < required) {
      return false
    }
  }

  return true
}

function spendInventory(inventory: ResourceInventory, cost: UpgradeCost): void {
  for (const kind of RESOURCE_KINDS) {
    const required = cost[kind] ?? 0
    if (required <= 0) {
      continue
    }

    inventory[kind] = Math.max(0, inventory[kind] - required)
  }
}

function formatUpgradeCost(cost: UpgradeCost): string {
  const parts: string[] = []
  for (const kind of RESOURCE_KINDS) {
    const required = cost[kind] ?? 0
    if (required <= 0) {
      continue
    }

    parts.push(`${getKindLabel(kind)} ${required.toFixed(0)}`)
  }

  return parts.join(' / ')
}

function formatCarrySlotCount(value: number): string {
  if (value >= 100) {
    return Math.round(value).toString()
  }

  if (value >= 10 || Math.abs(value - Math.round(value)) <= 1e-6) {
    return value.toFixed(0)
  }

  return value.toFixed(1)
}

function createPlanetMaterial(scene: Scene, style: PlanetSurfaceStyle): ShaderMaterial {
  const material = new ShaderMaterial(
    'planetMaterial',
    scene,
    PLANET_SHADER_NAME,
    {
      attributes: ['position', 'normal'],
      uniforms: [
        'world',
        'worldViewProjection',
        'iTime',
        'cameraPosition',
        'uPixelDensity',
        'uSpinSpeed',
        'uCloudiness',
        'uAtmosphere',
        'uLandMix',
        'uHasOcean',
        'uHasClouds',
        'uPolarCaps',
        'uLandDark',
        'uLandMid',
        'uLandBright',
        'uOceanDeep',
        'uOceanShallow',
        'uCoastColor',
        'uPolarColor',
        'uNightTint',
      ],
    },
  )

  material.backFaceCulling = true
  material.setFloat('uPixelDensity', 192)
  material.setFloat('uSpinSpeed', 1)
  material.setFloat('uCloudiness', style.hasClouds ? Math.max(0.18, style.cloudAlpha) : 0)
  material.setFloat('uAtmosphere', style.atmosphereAlpha * 10)
  material.setFloat('uLandMix', getPlanetLandMix(style))
  material.setFloat('uHasOcean', style.oceanLevel === null ? 0 : 1)
  material.setFloat('uHasClouds', style.hasClouds ? 1 : 0)
  material.setFloat('uPolarCaps', style.polarCaps ? 1 : 0)
  material.setColor3('uLandDark', Color3.FromHexString(style.palette.dark))
  material.setColor3('uLandMid', Color3.FromHexString(style.palette.mid))
  material.setColor3('uLandBright', Color3.FromHexString(style.palette.bright))
  material.setColor3('uOceanDeep', Color3.FromHexString(style.palette.deepOcean ?? style.palette.dark))
  material.setColor3('uOceanShallow', Color3.FromHexString(style.palette.shallowOcean ?? style.palette.mid))
  material.setColor3('uCoastColor', Color3.FromHexString(style.palette.coast ?? style.palette.bright))
  material.setColor3('uPolarColor', Color3.FromHexString(style.palette.polar ?? style.palette.bright))
  material.setColor3('uNightTint', getPlanetNightTint(style))

  material.onBindObservable.add(() => {
    material.setFloat('iTime', performance.now() * 0.001)
    material.setVector3('cameraPosition', scene.activeCamera?.position ?? Vector3.Zero())
  })

  return material
}

function getPlanetLandMix(style: PlanetSurfaceStyle): number {
  if (style.id === 'oceanic') {
    return 0.54
  }

  if (style.id === 'temperate') {
    return 0.48
  }

  if (style.id === 'cryo') {
    return 0.44
  }

  if (style.id === 'arid') {
    return -1
  }

  return -1
}

function getPlanetNightTint(style: PlanetSurfaceStyle): Color3 {
  if (style.id === 'arid') {
    return new Color3(1, 0.56, 0.22)
  }

  if (style.id === 'cryo') {
    return new Color3(0.72, 0.88, 1)
  }

  if (style.id === 'barren') {
    return new Color3(0.84, 0.72, 0.58)
  }

  return new Color3(1, 0.73, 0.36)
}

function createAtmosphereMaterial(scene: Scene, style: PlanetSurfaceStyle): StandardMaterial {
  const material = new StandardMaterial('atmosphereMaterial', scene)
  material.emissiveColor = style.atmosphereColor
  material.alpha = style.atmosphereAlpha
  material.backFaceCulling = false
  material.disableLighting = true
  return material
}

function createStarfieldDotMaterial(scene: Scene, name: string, color: Color3): StandardMaterial {
  const material = new StandardMaterial(name, scene)
  material.disableLighting = true
  material.emissiveColor = color
  material.diffuseColor = Color3.Black()
  material.specularColor = Color3.Black()
  return material
}

function createStarMaterial(scene: Scene, starColor: Color3, starGlow: Color3): ShaderMaterial {
  const material = new ShaderMaterial(
    'system-star-material',
    scene,
    STAR_SHADER_NAME,
    {
      attributes: ['position', 'normal'],
      uniforms: ['world', 'worldViewProjection', 'iTime', 'cameraPosition', 'uCoreColor', 'uMidColor', 'uEdgeColor'],
    },
  )
  material.backFaceCulling = true
  material.setColor3('uCoreColor', starColor.scale(0.72))
  material.setColor3('uMidColor', starGlow.scale(1.08))
  material.setColor3('uEdgeColor', new Color3(1, 0.97, 0.9))
  material.onBindObservable.add(() => {
    material.setFloat('iTime', performance.now() * 0.001)
    material.setVector3('cameraPosition', scene.activeCamera?.position ?? Vector3.Zero())
  })
  return material
}

function createStarCoronaMaterial(scene: Scene, starGlow: Color3): ShaderMaterial {
  const material = new ShaderMaterial(
    'system-star-corona-material',
    scene,
    STAR_CORONA_SHADER_NAME,
    {
      attributes: ['position', 'normal'],
      uniforms: ['world', 'worldViewProjection', 'iTime', 'cameraPosition', 'uCoronaColor'],
    },
  )
  material.backFaceCulling = false
  material.alpha = 1
  material.setColor3('uCoronaColor', starGlow.scale(1.16))
  material.onBindObservable.add(() => {
    material.setFloat('iTime', performance.now() * 0.001)
    material.setVector3('cameraPosition', scene.activeCamera?.position ?? Vector3.Zero())
  })
  return material
}

function createPlanetRingMaterial(
  scene: Scene,
  name: string,
  style: PlanetSurfaceStyle,
): StandardMaterial {
  const alphaTexture = new DynamicTexture(
    `${name}-alpha`,
    { width: 1024, height: 1024 },
    scene,
    false,
  )
  const colorTexture = new DynamicTexture(
    `${name}-color`,
    { width: 1024, height: 1024 },
    scene,
    false,
  )
  const alphaCtx = alphaTexture.getContext() as CanvasRenderingContext2D
  const colorCtx = colorTexture.getContext() as CanvasRenderingContext2D
  const size = alphaTexture.getSize().width
  const center = size * 0.5
  const outerRadius = size * 0.48
  const innerRadius = size * 0.31
  const ringWidth = outerRadius - innerRadius

  const ringDark = varyColor3(Color3.FromHexString(style.palette.dark), 0, 0.08, 0.24)
  const ringMid = varyColor3(Color3.FromHexString(style.palette.mid), 0, 0.12, 0.28)
  const ringLight = varyColor3(Color3.FromHexString(style.palette.bright), 0, 0.08, 0.34)

  const blendColor = (from: Color3, to: Color3, amount: number): Color3 =>
    new Color3(
      from.r + (to.r - from.r) * amount,
      from.g + (to.g - from.g) * amount,
      from.b + (to.b - from.b) * amount,
    )

  const colorToCss = (color: Color3, alpha = 1): string =>
    `rgba(${Math.round(clamp01(color.r) * 255)}, ${Math.round(clamp01(color.g) * 255)}, ${Math.round(clamp01(color.b) * 255)}, ${alpha.toFixed(3)})`

  const fillRingBand = (
    ctx: CanvasRenderingContext2D,
    bandInner: number,
    bandOuter: number,
    fillStyle: string | CanvasGradient,
  ): void => {
    ctx.fillStyle = fillStyle
    ctx.beginPath()
    ctx.arc(center, center, bandOuter, 0, Math.PI * 2)
    ctx.arc(center, center, bandInner, 0, Math.PI * 2, true)
    ctx.closePath()
    ctx.fill()
  }

  alphaCtx.clearRect(0, 0, size, size)
  colorCtx.clearRect(0, 0, size, size)
  alphaCtx.fillStyle = 'rgba(0,0,0,0)'
  alphaCtx.fillRect(0, 0, size, size)
  colorCtx.fillStyle = 'rgba(0,0,0,0)'
  colorCtx.fillRect(0, 0, size, size)

  const colorGradient = colorCtx.createRadialGradient(center, center, innerRadius, center, center, outerRadius)
  colorGradient.addColorStop(0, colorToCss(blendColor(ringDark, ringMid, 0.22), 0))
  colorGradient.addColorStop(0.08, colorToCss(blendColor(ringMid, ringLight, 0.34), 0.88))
  colorGradient.addColorStop(0.52, colorToCss(blendColor(ringMid, ringLight, 0.52), 0.96))
  colorGradient.addColorStop(0.86, colorToCss(blendColor(ringDark, ringMid, 0.58), 0.8))
  colorGradient.addColorStop(1, colorToCss(ringDark, 0))
  fillRingBand(colorCtx, innerRadius, outerRadius, colorGradient)

  const alphaGradient = alphaCtx.createRadialGradient(center, center, innerRadius, center, center, outerRadius)
  alphaGradient.addColorStop(0, 'rgba(255,255,255,0)')
  alphaGradient.addColorStop(0.06, 'rgba(255,255,255,0.22)')
  alphaGradient.addColorStop(0.24, 'rgba(255,255,255,0.76)')
  alphaGradient.addColorStop(0.72, 'rgba(255,255,255,0.62)')
  alphaGradient.addColorStop(0.94, 'rgba(255,255,255,0.18)')
  alphaGradient.addColorStop(1, 'rgba(255,255,255,0)')
  fillRingBand(alphaCtx, innerRadius, outerRadius, alphaGradient)

  let cursor = innerRadius + ringWidth * 0.025
  let bandIndex = 0
  while (cursor < outerRadius - ringWidth * 0.02) {
    const normalizedWidth = seededRange(style.seed + 500 + bandIndex * 17, 0.012, 0.05)
    const normalizedGap = seededRange(style.seed + 700 + bandIndex * 19, 0.0015, 0.010)
    const bandOuter = Math.min(cursor + ringWidth * normalizedWidth, outerRadius)
    const tone = seededNoise(style.seed + 900 + bandIndex * 23)
    const density = seededNoise(style.seed + 1100 + bandIndex * 29)
    const bandColor =
      tone > 0.62
        ? blendColor(ringMid, ringLight, (tone - 0.62) / 0.38)
        : blendColor(ringDark, ringMid, tone / 0.62)

    fillRingBand(colorCtx, cursor, bandOuter, colorToCss(bandColor, 0.24 + density * 0.24))
    fillRingBand(alphaCtx, cursor, bandOuter, `rgba(255,255,255,${(0.05 + density * 0.14).toFixed(3)})`)
    cursor = bandOuter + ringWidth * normalizedGap
    bandIndex += 1
  }

  alphaCtx.globalCompositeOperation = 'destination-out'
  const majorGaps = [
    { center: innerRadius + ringWidth * 0.36, width: ringWidth * 0.03, strength: 0.55 },
    { center: innerRadius + ringWidth * 0.64, width: ringWidth * 0.055, strength: 0.82 },
    { center: innerRadius + ringWidth * 0.82, width: ringWidth * 0.028, strength: 0.48 },
  ]
  for (const gap of majorGaps) {
    fillRingBand(
      alphaCtx,
      gap.center - gap.width * 0.5,
      gap.center + gap.width * 0.5,
      `rgba(0,0,0,${gap.strength.toFixed(3)})`,
    )
  }

  alphaCtx.globalCompositeOperation = 'source-over'
  for (let dustBand = 0; dustBand < 120; dustBand += 1) {
    const normalizedRadius = seededRange(style.seed + 1400 + dustBand * 13, 0.02, 0.98)
    const radius = innerRadius + ringWidth * normalizedRadius
    const lineWidth = 0.8 + seededNoise(style.seed + 1600 + dustBand * 11) * 2.4
    const alpha = 0.012 + seededNoise(style.seed + 1800 + dustBand * 7) * 0.045
    const tint = blendColor(ringDark, ringLight, seededNoise(style.seed + 2000 + dustBand * 5))

    colorCtx.strokeStyle = colorToCss(tint, 0.08 + alpha * 1.6)
    colorCtx.lineWidth = lineWidth
    colorCtx.beginPath()
    colorCtx.arc(center, center, radius, 0, Math.PI * 2)
    colorCtx.stroke()

    alphaCtx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`
    alphaCtx.lineWidth = lineWidth
    alphaCtx.beginPath()
    alphaCtx.arc(center, center, radius, 0, Math.PI * 2)
    alphaCtx.stroke()
  }

  alphaTexture.update(false)
  colorTexture.update(false)
  alphaTexture.hasAlpha = true

  const material = new StandardMaterial(name, scene)
  material.diffuseColor = new Color3(1, 1, 1)
  material.diffuseTexture = colorTexture
  material.emissiveColor = blendColor(ringDark, ringMid, 0.28).scale(0.08)
  material.specularColor = new Color3(0.03, 0.03, 0.03)
  material.opacityTexture = alphaTexture
  material.backFaceCulling = false
  material.transparencyMode = 2
  material.alpha = 0.92
  return material
}

function generateStarSystemData(seed: number): StarSystemData {
  const planetCount = 3 + seededInt(seed + 1, 0, 6)
  const planets: StarSystemPlanetData[] = []
  const systemPlaneTilt = seededRange(seed + 3, -0.08, 0.08)
  const systemPlaneYaw = seededRange(seed + 5, -0.22, 0.22)

  for (let index = 0; index < planetCount; index += 1) {
    const style = generatePlanetSurfaceStyle(seed + index * 17)
    const orbitA = ORBIT_BASE_RADIUS + index * ORBIT_STEP_RADIUS + seededRange(seed + index * 19, -1.1, 1.5)
    const orbitB = orbitA * seededRange(seed + index * 23, 0.9, 0.98)
    const orbitTilt = systemPlaneTilt + seededRange(seed + index * 29, -0.045, 0.045)
    const orbitYaw = systemPlaneYaw + seededRange(seed + index * 31, -0.08, 0.08)
    const radius = seededRange(seed + index * 37, 0.7, 1.7)
    const moonCount = seededInt(seed + index * 41, 0, 4)
    const axialTilt = getPlanetAxialTilt(style, seed + index * 83)
    const axialYaw = seededRange(seed + index * 89, -Math.PI, Math.PI)
    const moons: StarSystemMoonData[] = []

    for (let moonIndex = 0; moonIndex < moonCount; moonIndex += 1) {
      const moonRadius = seededRange(seed + moonIndex * 67 + index * 23, 0.12, 0.28)
      const moonOrbitBase = radius * 2.15 + 0.75
      const moonOrbitSpacing = 0.95 + radius * 0.55
      const moonOrbitA =
        moonOrbitBase
        + moonIndex * moonOrbitSpacing
        + seededRange(seed + moonIndex * 43 + index * 7, 0.15, 0.55)

      moons.push({
        color: Color3.FromHexString(style.palette.mid),
        orbitA: moonOrbitA,
        orbitB: moonOrbitA * seededRange(seed + moonIndex * 47 + index * 11, 0.94, 0.99),
        orbitPhase: seededRange(seed + moonIndex * 53 + index * 13, 0, Math.PI * 2),
        orbitSpeed: seededRange(seed + moonIndex * 59 + index * 17, 0.32, 0.88),
        orbitTilt: seededRange(seed + moonIndex * 61 + index * 19, -0.16, 0.16),
        radius: moonRadius,
      })
    }

    planets.push({
      axialTilt,
      axialYaw,
      color: Color3.FromHexString(style.palette.bright),
      hasRing: seededNoise(seed + index * 71) > 0.72,
      id: `system-planet-${index}`,
      moonCount,
      moons,
      name: getProceduralPlanetName(index, style),
      orbitA,
      orbitB,
      orbitPhase: seededRange(seed + index * 73, 0, Math.PI * 2),
      orbitSpeed: seededRange(seed + index * 79, 0.035, 0.12) / (1 + index * 0.28),
      orbitTilt,
      orbitYaw,
      radius,
      resourceNodes: generatePlanetResourceNodes(style, seed + index * 101),
      style,
    })
  }

  const playablePlanet =
    planets.find((planet) => planet.style.id === 'temperate')
    ?? planets.find((planet) => planet.style.id === 'oceanic')
    ?? planets[0]

  return {
    name: `SYS-${(seed % 9000) + 1000}`,
    planets,
    playablePlanet,
    starColor: Color3.FromHexString('#ffd88a'),
    starGlow: Color3.FromHexString('#ff9b42'),
  }
}

function generatePlanetResourceNodes(style: PlanetSurfaceStyle, seed: number): ResourceNodeDefinition[] {
  const weights = getResourceWeightsForStyle(style)
  const desiredCount = 5 + seededInt(seed + 7, 0, 2)
  const candidates = RESOURCE_KINDS.map((kind, index) => ({
    kind,
    score: weights[kind] + seededNoise(seed + index * 19) * 0.9,
  }))
    .sort((left, right) => right.score - left.score)
    .slice(0, desiredCount)

  return candidates.map((candidate, index) => {
    const labelPool = RESOURCE_LABEL_POOLS[candidate.kind]
    const label = labelPool[seededInt(seed + index * 29, 0, labelPool.length)]
    const latitude = seededRange(seed + index * 31, -1.08, 1.08)
    const longitude =
      -Math.PI + ((index + seededNoise(seed + index * 37)) / desiredCount) * Math.PI * 2
    const richnessBase = 0.78 + weights[candidate.kind] * 0.14
    const richness = richnessBase + seededRange(seed + index * 41, -0.18, 0.26)
    const rate = 0.75 + richness * 0.8 + seededRange(seed + index * 43, -0.12, 0.22)
    const reserve = 72 + richness * 40 + seededRange(seed + index * 47, 0, 34)

    return {
      kind: candidate.kind,
      label,
      latitude,
      longitude,
      rate,
      reserve,
      richness,
    }
  })
}

function createStarSystemBackdrop(scene: Scene, starSystem: StarSystemData): StarSystemRuntime {
  const root = new TransformNode('star-system-root', scene)
  root.position = Vector3.Zero()
  root.rotation.y = 0.22
  root.rotation.x = -0.08

  const star = MeshBuilder.CreateSphere(
    'system-star',
    { diameter: STAR_VISUAL_DIAMETER, segments: 16 },
    scene,
  )
  star.parent = root
  star.isPickable = false
  star.material = createStarMaterial(scene, starSystem.starColor, starSystem.starGlow)

  const corona = MeshBuilder.CreateSphere(
    'system-star-corona',
    { diameter: STAR_VISUAL_DIAMETER * STAR_CORONA_SCALE, segments: 16 },
    scene,
  )
  corona.parent = star
  corona.isPickable = false
  corona.material = createStarCoronaMaterial(scene, starSystem.starGlow)
  let playablePlanetMesh: Mesh | null = null
  let playablePlanetRadius = 0

  const runtimePlanets = starSystem.planets.map((planet) => {
    const visualRadius =
      planet.id === starSystem.playablePlanet.id
        ? Math.max(planet.radius * PLAYABLE_PLANET_VISUAL_SCALE, PLAYABLE_PLANET_MIN_RADIUS)
        : planet.radius * PLANET_VISUAL_SCALE
    const orbitLine = createEllipseOrbitLine(
      scene,
      `orbit-line-${planet.id}`,
      planet.orbitA,
      planet.orbitB,
      planet.orbitTilt,
      planet.orbitYaw,
      new Color3(ORBIT_LINE_COLOR, ORBIT_LINE_COLOR, ORBIT_LINE_COLOR),
    )
    orbitLine.parent = root
    orbitLine.isPickable = false

    const pivot = new TransformNode(`${planet.id}-pivot`, scene)
    pivot.parent = root

    const axisRoot = new TransformNode(`${planet.id}-axis-root`, scene)
    axisRoot.parent = pivot
    axisRoot.rotation.y = planet.axialYaw
    axisRoot.rotation.z = planet.axialTilt

    const mesh = MeshBuilder.CreateSphere(
      `${planet.id}-mesh`,
      { diameter: visualRadius * 2, segments: 16 },
      scene,
    )
    mesh.parent = axisRoot
    mesh.isPickable = true
    mesh.metadata = { planetId: planet.id }
    const surfaceMaterial = createPlanetMaterial(scene, planet.style)
    mesh.material = surfaceMaterial

    const billboard = createPlanetBillboard(scene, planet.id, planet.name, visualRadius)
    billboard.mesh.parent = pivot
    billboard.mesh.position = new Vector3(0, visualRadius + 2.2, 0)

    const selectHitArea = MeshBuilder.CreateSphere(
      `${planet.id}-select-hit-area`,
      {
        diameter: Math.max(visualRadius * 3.4, 3.8),
        segments: 8,
      },
      scene,
    )
    selectHitArea.parent = pivot
    selectHitArea.isPickable = true
    selectHitArea.metadata = { planetId: planet.id }
    const selectHitAreaMaterial = new StandardMaterial(`${planet.id}-select-hit-area-material`, scene)
    selectHitAreaMaterial.alpha = 0.001
    selectHitAreaMaterial.disableLighting = true
    selectHitAreaMaterial.backFaceCulling = false
    selectHitArea.material = selectHitAreaMaterial

    const atmosphere = MeshBuilder.CreateSphere(
      `${planet.id}-atmosphere`,
      { diameter: visualRadius * 2.12, segments: 12 },
      scene,
    )
    atmosphere.parent = mesh
    atmosphere.isPickable = false
    atmosphere.material = createAtmosphereMaterial(scene, {
      ...planet.style,
      atmosphereAlpha: planet.style.atmosphereAlpha * 0.75,
    })

    let ring: Mesh | null = null
    if (planet.hasRing) {
      ring = MeshBuilder.CreateDisc(
        `${planet.id}-ring`,
        {
          radius: visualRadius * 2.14,
          tessellation: 72,
          sideOrientation: Mesh.DOUBLESIDE,
        },
        scene,
      )
      ring.parent = mesh
      ring.rotation.x = Math.PI / 2
      ring.isPickable = false
      ring.material = createPlanetRingMaterial(scene, `${planet.id}-ring-material`, planet.style)
    }

    const moonOrbitRoot = new TransformNode(`${planet.id}-moon-root`, scene)
    moonOrbitRoot.parent = pivot

    if (planet.id === starSystem.playablePlanet.id) {
      playablePlanetMesh = mesh
      playablePlanetRadius = visualRadius
    }

    const moonMeshes = planet.moons.map((moon, moonIndex) => {
      const moonMesh = MeshBuilder.CreateSphere(
        `${planet.id}-moon-${moonIndex}`,
        { diameter: moon.radius * 2, segments: 6 },
        scene,
      )
      moonMesh.parent = moonOrbitRoot
      moonMesh.isPickable = false

      const moonMaterial = new StandardMaterial(`${planet.id}-moon-${moonIndex}-material`, scene)
      moonMaterial.diffuseColor = moon.color
      moonMaterial.emissiveColor = moon.color.scale(0.16)
      moonMaterial.specularColor = Color3.Black()
      moonMesh.material = moonMaterial
      return { data: moon, mesh: moonMesh }
    })

    return {
      atmosphere,
      billboard,
      data: planet,
      mesh,
      moonOrbitRoot,
      moonMeshes,
      pivot,
      radius: visualRadius,
      ring,
      surfaceMaterial,
    }
  })

  return {
    planets: runtimePlanets,
    playablePlanetMesh: playablePlanetMesh ?? runtimePlanets[0].mesh,
    playablePlanetRadius:
      playablePlanetRadius
      || Math.max(runtimePlanets[0].data.radius * PLAYABLE_PLANET_VISUAL_SCALE, PLAYABLE_PLANET_MIN_RADIUS),
    root,
    star,
    update(time: number) {
      star.scaling.setAll(1 + Math.sin(time * 1.4) * 0.04)
      corona.scaling.setAll(1.0 + Math.sin(time * 1.8) * 0.045)

      for (const runtimePlanet of runtimePlanets) {
        const orbitalAngle = time * runtimePlanet.data.orbitSpeed + runtimePlanet.data.orbitPhase
        runtimePlanet.pivot.position = getEllipticalOrbitPosition(
          runtimePlanet.data.orbitA,
          runtimePlanet.data.orbitB,
          orbitalAngle,
          runtimePlanet.data.orbitTilt,
          runtimePlanet.data.orbitYaw,
        )

        runtimePlanet.mesh.rotation.y += 0.002 + runtimePlanet.data.orbitSpeed * 0.02
        runtimePlanet.atmosphere.rotation.y -= 0.002
        runtimePlanet.moonOrbitRoot.rotation.y += 0.0008 + runtimePlanet.data.orbitSpeed * 0.18

        for (const moon of runtimePlanet.moonMeshes) {
          const moonAngle = time * moon.data.orbitSpeed + moon.data.orbitPhase
          moon.mesh.position = getEllipticalOrbitPosition(
            moon.data.orbitA,
            moon.data.orbitB,
            moonAngle,
            moon.data.orbitTilt,
            0,
          )
        }
      }
    },
  }
}

function createEllipseOrbitLine(
  scene: Scene,
  id: string,
  orbitA: number,
  orbitB: number,
  orbitTilt: number,
  orbitYaw: number,
  color: Color3,
): LinesMesh {
  const points: Vector3[] = []
  for (let step = 0; step <= 80; step += 1) {
    const angle = (step / 80) * Math.PI * 2
    points.push(getEllipticalOrbitPosition(orbitA, orbitB, angle, orbitTilt, orbitYaw))
  }

  const line = MeshBuilder.CreateLines(
    id,
    { points, updatable: false },
    scene,
  )
  line.color = color
  line.alpha = ORBIT_LINE_ALPHA
  return line
}

function getEllipticalOrbitPosition(
  orbitA: number,
  orbitB: number,
  angle: number,
  orbitTilt: number,
  orbitYaw: number,
): Vector3 {
  const flatX = Math.cos(angle) * orbitA
  const flatZ = Math.sin(angle) * orbitB
  const tiltedY = flatZ * Math.sin(orbitTilt)
  const tiltedZ = flatZ * Math.cos(orbitTilt)
  const yawCos = Math.cos(orbitYaw)
  const yawSin = Math.sin(orbitYaw)

  return new Vector3(
    flatX * yawCos - tiltedZ * yawSin,
    tiltedY,
    flatX * yawSin + tiltedZ * yawCos,
  )
}

function getPlanetAxialTilt(style: PlanetSurfaceStyle, seed: number): number {
  if (style.id === 'temperate' || style.id === 'oceanic') {
    return seededRange(seed, 0.08, 0.56)
  }

  if (style.id === 'cryo') {
    return seededRange(seed, 0.18, 0.72)
  }

  if (style.id === 'arid') {
    return seededRange(seed, 0.04, 0.48)
  }

  return seededRange(seed, 0.02, 0.92)
}

function getProceduralPlanetName(index: number, style: PlanetSurfaceStyle): string {
  const prefixes = ['Kepler', 'Helios', 'Tianhe', 'Haiyuan', 'Lumen', 'Arca']
  const suffix = style.id === 'barren' ? 'R' : style.id === 'cryo' ? 'C' : style.id === 'arid' ? 'D' : 'P'
  return `${prefixes[index % prefixes.length]}-${index + 2}${suffix}`
}

function getResourceWeightsForStyle(style: PlanetSurfaceStyle): Record<ResourceKind, number> {
  if (style.id === 'oceanic') {
    return { water: 5, ironNickel: 2.4, copper: 2.8, silicate: 3.5, titanium: 2.1, rareEarth: 1.8 }
  }

  if (style.id === 'temperate') {
    return { water: 4.2, ironNickel: 2.6, copper: 3, silicate: 3.2, titanium: 2.2, rareEarth: 2 }
  }

  if (style.id === 'arid') {
    return { water: 0.8, ironNickel: 2.8, copper: 3.6, silicate: 4.1, titanium: 3.2, rareEarth: 2.7 }
  }

  if (style.id === 'cryo') {
    return { water: 5.2, ironNickel: 2.7, copper: 1.9, silicate: 3, titanium: 2.4, rareEarth: 2.3 }
  }

  return { water: 0.2, ironNickel: 3.6, copper: 2.8, silicate: 4.2, titanium: 3.4, rareEarth: 3.1 }
}

function seededNoise(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123
  return value - Math.floor(value)
}

function seededRange(seed: number, min: number, max: number): number {
  return min + (max - min) * seededNoise(seed)
}

function seededInt(seed: number, min: number, maxExclusive: number): number {
  return min + Math.floor(seededNoise(seed) * (maxExclusive - min))
}

function createResourceNode(
  scene: Scene,
  parent: TransformNode,
  definition: ResourceNodeDefinition,
  id: string,
  surfaceRadius: number,
): ResourceNode {
  const normal = sphericalToCartesian(1, definition.latitude, definition.longitude)
  const nodeScale = Math.max(0.34, Math.min(0.88, surfaceRadius / PLANET_RADIUS))
  const anchor = new TransformNode(id, scene)
  anchor.parent = parent
  anchor.position = normal.scale(surfaceRadius + 0.18 * nodeScale)
  anchor.scaling.setAll(nodeScale)
  anchor.lookAt(anchor.position.add(normal))

  const palette = getResourcePalette(definition.kind)

  const base = MeshBuilder.CreateCylinder(
    `${id}-base`,
    {
      diameter: 1.2,
      height: 0.32,
      tessellation: 6,
    },
    scene,
  )
  base.parent = anchor
  base.position.z = 0.08
  base.rotation.x = Math.PI / 2

  const pulse = MeshBuilder.CreateTorus(
    `${id}-pulse`,
    {
      diameter: 1.8,
      thickness: 0.08,
      tessellation: 20,
    },
    scene,
  )
  pulse.parent = anchor
  pulse.rotation.x = Math.PI / 2
  pulse.position.z = 0.02

  const hitArea = MeshBuilder.CreateSphere(
    `${id}-hit-area`,
    {
      diameter: 1.9,
      segments: 6,
    },
    scene,
  )
  hitArea.parent = anchor
  hitArea.position.z = 0.6
  hitArea.isPickable = true

  const crystal = createResourceSignatureMesh(scene, definition.kind, id, definition.richness)
  crystal.parent = anchor

  const baseMaterial = new StandardMaterial(`${id}-base-material`, scene)
  baseMaterial.diffuseColor = new Color3(0.14, 0.17, 0.22)
  baseMaterial.emissiveColor = palette.base.scale(0.2)
  baseMaterial.specularColor = Color3.Black()

  const crystalMaterial = new StandardMaterial(`${id}-crystal-material`, scene)
  crystalMaterial.diffuseColor = palette.core
  crystalMaterial.emissiveColor = palette.glow
  crystalMaterial.specularColor = Color3.Black()

  const pulseMaterial = new StandardMaterial(`${id}-pulse-material`, scene)
  pulseMaterial.emissiveColor = palette.glow
  pulseMaterial.alpha = 0.24
  pulseMaterial.disableLighting = true
  pulseMaterial.backFaceCulling = false

  const hitAreaMaterial = new StandardMaterial(`${id}-hit-area-material`, scene)
  hitAreaMaterial.alpha = 0.001
  hitAreaMaterial.disableLighting = true
  hitAreaMaterial.backFaceCulling = false

  base.material = baseMaterial
  crystal.material = crystalMaterial
  pulse.material = pulseMaterial
  hitArea.material = hitAreaMaterial

  for (const mesh of [base, crystal, pulse, hitArea]) {
    mesh.metadata = { resourceNodeId: id }
  }

  return {
    anchor,
    base,
    baseColor: palette.base,
    baseRate: definition.rate,
    crystal,
    crystalMaterial,
    deployed: false,
    harvester: null,
    hitArea,
    id,
    kind: definition.kind,
    label: definition.label,
    level: 0,
    normal,
    pulse,
    pulseMaterial,
    reserve: definition.reserve,
    richness: definition.richness,
    totalReserve: definition.reserve,
  }
}

function createPlanetBillboard(
  scene: Scene,
  planetId: string,
  planetName: string,
  radius: number,
): {
  mesh: Mesh
  update: (distance: number, isCurrent: boolean, isSelected: boolean) => void
} {
  const mesh = MeshBuilder.CreatePlane(
    `${planetId}-billboard`,
    {
      width: Math.max(3.1, radius * 1.42),
      height: Math.max(1.02, radius * 0.46),
    },
    scene,
  )
  mesh.billboardMode = Mesh.BILLBOARDMODE_ALL
  mesh.scaling.x = -1
  mesh.isPickable = true
  mesh.metadata = { planetId }

  const texture = new DynamicTexture(
    `${planetId}-billboard-texture`,
    { width: 384, height: 112 },
    scene,
    true,
  )
  const textureContext = texture.getContext() as unknown as CanvasRenderingContext2D

  const material = new StandardMaterial(`${planetId}-billboard-material`, scene)
  material.diffuseTexture = texture
  material.opacityTexture = texture
  material.emissiveTexture = texture
  material.specularColor = Color3.Black()
  material.disableLighting = true
  material.backFaceCulling = false
  mesh.material = material

  const render = (distance: number, isCurrent: boolean, isSelected: boolean) => {
    textureContext.clearRect(0, 0, 384, 112)
    textureContext.fillStyle = isCurrent ? 'rgba(12,30,44,0.0)' : isSelected ? 'rgba(18,48,74,0.92)' : 'rgba(8,18,32,0.86)'
    textureContext.strokeStyle = isCurrent ? 'rgba(123,219,216,0.0)' : isSelected ? 'rgba(255,240,184,0.95)' : 'rgba(123,219,216,0.55)'
    textureContext.lineWidth = 2
    textureContext.fillRect(8, 8, 368, 96)
    textureContext.strokeRect(8, 8, 368, 96)

    textureContext.textAlign = 'center'
    textureContext.fillStyle = isCurrent ? 'rgba(255,240,184,0.42)' : '#fff0b8'
    textureContext.font = '700 24px Microsoft YaHei'
    textureContext.fillText(planetName, 192, 46)
    textureContext.fillStyle = isCurrent ? 'rgba(123,219,216,0.32)' : '#7bdbd8'
    textureContext.font = '500 16px Microsoft YaHei'
    const distanceLabel = isCurrent ? '当前驻留' : `距离 ${distance.toFixed(1)}`
    textureContext.fillText(distanceLabel, 192, 78)
    texture.update(false)
  }

  render(0, false, false)

  return {
    mesh,
    update: render,
  }
}

function createResourceSignatureMesh(
  scene: Scene,
  kind: ResourceKind,
  id: string,
  richness: number,
): Mesh {
  if (kind === 'water') {
    const droplet = MeshBuilder.CreateSphere(
      `${id}-crystal`,
      {
        diameter: 0.7 + richness * 0.12,
        segments: 6,
      },
      scene,
    )
    droplet.position.z = 0.82
    droplet.scaling = new Vector3(0.82, 0.82, 1.28)
    return droplet
  }

  if (kind === 'ironNickel') {
    const block = MeshBuilder.CreateBox(
      `${id}-crystal`,
      {
        size: 0.62 + richness * 0.08,
      },
      scene,
    )
    block.position.z = 0.82
    block.rotation = new Vector3(0.42, 0.2, 0.72)
    block.scaling = new Vector3(1.18, 0.92, 0.78)
    return block
  }

  if (kind === 'copper') {
    const prism = MeshBuilder.CreateCylinder(
      `${id}-crystal`,
      {
        height: 1 + richness * 0.18,
        diameterTop: 0.18,
        diameterBottom: 0.54,
        tessellation: 6,
      },
      scene,
    )
    prism.position.z = 0.82
    prism.rotation.x = Math.PI / 2
    return prism
  }

  if (kind === 'silicate') {
    const shard = MeshBuilder.CreateCylinder(
      `${id}-crystal`,
      {
        height: 1.08 + richness * 0.16,
        diameterTop: 0,
        diameterBottom: 0.72,
        tessellation: 4,
      },
      scene,
    )
    shard.position.z = 0.82
    shard.rotation.x = Math.PI / 2
    shard.rotation.z = Math.PI * 0.1
    return shard
  }

  if (kind === 'titanium') {
    const fin = MeshBuilder.CreateCylinder(
      `${id}-crystal`,
      {
        height: 1.02 + richness * 0.14,
        diameterTop: 0.08,
        diameterBottom: 0.48,
        tessellation: 3,
      },
      scene,
    )
    fin.position.z = 0.84
    fin.rotation.x = Math.PI / 2
    fin.rotation.z = Math.PI / 6
    return fin
  }

  const ring = MeshBuilder.CreateTorus(
    `${id}-crystal`,
    {
      diameter: 0.76 + richness * 0.12,
      thickness: 0.18,
      tessellation: 12,
    },
    scene,
  )
  ring.position.z = 0.88
  ring.rotation.y = Math.PI / 4
  ring.scaling = new Vector3(1, 0.72, 1)
  return ring
}

function createHarvester(scene: Scene, node: ResourceNode): Harvester {
  const anchor = new TransformNode(`${node.id}-harvester`, scene)
  anchor.parent = node.anchor
  anchor.position = new Vector3(0, 0, 0.22)

  const mast = MeshBuilder.CreateCylinder(
    `${node.id}-harvester-mast`,
    {
      height: 1.15,
      diameter: 0.24,
      tessellation: 6,
    },
    scene,
  )
  mast.parent = anchor
  mast.rotation.x = Math.PI / 2
  mast.position.z = 0.58

  const head = MeshBuilder.CreateBox(
    `${node.id}-harvester-head`,
    {
      width: 0.9,
      height: 0.28,
      depth: 0.48,
    },
    scene,
  )
  head.parent = anchor
  head.position.z = 1.12

  const spinner = MeshBuilder.CreateTorus(
    `${node.id}-harvester-spinner`,
    {
      diameter: 0.92,
      thickness: 0.09,
      tessellation: 14,
    },
    scene,
  )
  spinner.parent = anchor
  spinner.position.z = 1.12
  spinner.rotation.x = Math.PI / 2

  const pulse = MeshBuilder.CreateDisc(
    `${node.id}-harvester-pulse`,
    {
      radius: 1.15,
      tessellation: 20,
    },
    scene,
  )
  pulse.parent = anchor
  pulse.position.z = 0.1
  pulse.rotation.x = Math.PI / 2

  const hardwareMaterial = new StandardMaterial(`${node.id}-hardware-material`, scene)
  hardwareMaterial.diffuseColor = new Color3(0.95, 0.7, 0.28)
  hardwareMaterial.emissiveColor = new Color3(0.2, 0.12, 0.03)
  hardwareMaterial.specularColor = Color3.Black()

  const pulseMaterial = new StandardMaterial(`${node.id}-harvester-pulse-material`, scene)
  pulseMaterial.emissiveColor = new Color3(0.18, 0.95, 0.88)
  pulseMaterial.alpha = 0.24
  pulseMaterial.disableLighting = true
  pulseMaterial.backFaceCulling = false

  mast.material = hardwareMaterial
  head.material = hardwareMaterial
  spinner.material = hardwareMaterial
  pulse.material = pulseMaterial

  const beamStart = new Vector3(0, 0, 1.28)
  const beamEnd = new Vector3(0, 0, 0.8)
  const signalBeam = createSignalBeam(scene, beamStart, beamEnd)
  signalBeam.parent = node.anchor

  return {
    anchor,
    beam: signalBeam,
    pulse,
    pulseMaterial,
    spinner,
  }
}

function createSignalBeam(scene: Scene, start: Vector3, end: Vector3): LinesMesh {
  const beam = MeshBuilder.CreateLines(
    `signal-beam-${start.x.toFixed(2)}-${end.x.toFixed(2)}`,
    {
      points: [start, end],
      updatable: false,
    },
    scene,
  )
  beam.color = new Color3(0.35, 1, 0.92)
  beam.alpha = 0.45
  return beam
}

function getNodeFromPick(nodes: ResourceNode[], mesh: Mesh | null): ResourceNode | null {
  if (mesh === null) {
    return null
  }

  const nodeId = mesh.metadata?.resourceNodeId
  if (typeof nodeId !== 'string') {
    return null
  }

  return nodes.find((node) => node.id === nodeId) ?? null
}

function setNodeHighlight(node: ResourceNode, highlighted: boolean): void {
  const reserveFactor = node.reserve <= 0 ? 0.12 : 0.38
  const highlightBoost = highlighted ? 0.22 : 0
  const deployedBoost = node.deployed ? 0.18 + node.level * 0.08 : 0

  node.base.scaling.setAll(highlighted ? 1.12 : 1)
  node.pulse.scaling.setAll(highlighted ? 1.12 : 1)
  node.crystal.scaling = highlighted ? new Vector3(1.1, 1.1, 1.1) : Vector3.One()
  node.crystalMaterial.emissiveColor = node.baseColor.scale(reserveFactor + highlightBoost + deployedBoost)
  node.pulseMaterial.alpha = node.reserve <= 0 ? 0.08 : node.deployed ? 0.4 : highlighted ? 0.34 : 0.24
}

function getNodeRate(node: ResourceNode): number {
  const multiplier = 1 + (node.level - 1) * 0.7
  return node.level <= 0 ? 0 : node.baseRate * multiplier
}

function getNodeMarkerOutput(node: ResourceNode): string {
  if (!node.deployed) {
    return `${getKindLabel(node.kind)} ${node.baseRate.toFixed(1)}/s`
  }

  if (node.reserve <= 0) {
    return `待机 · ${node.level} 级`
  }

  return `${node.level} 级 · ${getNodeRate(node).toFixed(1)}/s`
}

function getUpgradeCost(targetLevel: number): UpgradeCost {
  if (targetLevel === 2) {
    return {
      copper: 5,
      ironNickel: 8,
      silicate: 4,
    }
  }

  return {
    copper: 6,
    rareEarth: 5,
    titanium: 9,
  }
}

function getKindLabel(kind: ResourceKind): string {
  if (kind === 'water') {
    return '水'
  }

  if (kind === 'ironNickel') {
    return '铁镍'
  }

  if (kind === 'copper') {
    return '铜'
  }

  if (kind === 'silicate') {
    return '硅酸盐'
  }

  if (kind === 'titanium') {
    return '钛'
  }

  return '稀土'
}

function getResourceUi(kind: ResourceKind): { accent: string; icon: string } {
  if (kind === 'water') {
    return {
      accent: '#73dcff',
      icon: '/gui/resource-water.svg',
    }
  }

  if (kind === 'ironNickel') {
    return {
      accent: '#f6ca5d',
      icon: '/gui/resource-iron-nickel.svg',
    }
  }

  if (kind === 'copper') {
    return {
      accent: '#ff9966',
      icon: '/gui/resource-copper.svg',
    }
  }

  if (kind === 'silicate') {
    return {
      accent: '#b8d0d8',
      icon: '/gui/resource-silicate.svg',
    }
  }

  if (kind === 'titanium') {
    return {
      accent: '#a2b7ff',
      icon: '/gui/resource-titanium.svg',
    }
  }

  return {
    accent: '#d58aff',
    icon: '/gui/resource-rare-earth.svg',
  }
}

function getResourcePalette(kind: ResourceKind): {
  base: Color3
  core: Color3
  glow: Color3
} {
  if (kind === 'water') {
    return {
      base: Color3.FromHexString('#3b6c7d'),
      core: Color3.FromHexString('#8de4ff'),
      glow: Color3.FromHexString('#4acbf4'),
    }
  }

  if (kind === 'ironNickel') {
    return {
      base: Color3.FromHexString('#695a3b'),
      core: Color3.FromHexString('#efad54'),
      glow: Color3.FromHexString('#f6ca5d'),
    }
  }

  if (kind === 'copper') {
    return {
      base: Color3.FromHexString('#73422c'),
      core: Color3.FromHexString('#ff9f63'),
      glow: Color3.FromHexString('#ff7d4d'),
    }
  }

  if (kind === 'silicate') {
    return {
      base: Color3.FromHexString('#586a70'),
      core: Color3.FromHexString('#d6e2e8'),
      glow: Color3.FromHexString('#9cc7d3'),
    }
  }

  if (kind === 'titanium') {
    return {
      base: Color3.FromHexString('#435171'),
      core: Color3.FromHexString('#b9c9ff'),
      glow: Color3.FromHexString('#82a4ff'),
    }
  }

  return {
    base: Color3.FromHexString('#653b7d'),
    core: Color3.FromHexString('#d87dff'),
    glow: Color3.FromHexString('#ad5eff'),
  }
}

function resolveNodeFromPointer(
  scene: Scene,
  camera: ArcRotateCamera,
  canvas: HTMLCanvasElement,
  nodes: ResourceNode[],
  pointerX: number,
  pointerY: number,
): ResourceNode | null {
  const nearbyNode = getClosestNodeToPointer(scene, camera, canvas, nodes, pointerX, pointerY)
  if (nearbyNode !== null) {
    return nearbyNode
  }

  const pickPoint = toRenderPointerPosition(scene, canvas, pointerX, pointerY)
  const pick = scene.pick(pickPoint.x, pickPoint.y, (mesh) =>
    typeof mesh.metadata?.resourceNodeId === 'string',
  )
  return getNodeFromPick(nodes, pick?.pickedMesh as Mesh | null)
}

function resolvePlanetFromPointer(
  scene: Scene,
  camera: ArcRotateCamera,
  canvas: HTMLCanvasElement,
  pointerX: number,
  pointerY: number,
  planets: StarSystemPlanetRuntime[],
  currentPlanetId: string,
): StarSystemPlanetRuntime | null {
  const nearbyPlanet = getClosestPlanetToPointer(
    scene,
    camera,
    canvas,
    planets,
    currentPlanetId,
    pointerX,
    pointerY,
  )
  if (nearbyPlanet !== null) {
    return nearbyPlanet
  }

  const pickPoint = toRenderPointerPosition(scene, canvas, pointerX, pointerY)
  const pick = scene.pick(pickPoint.x, pickPoint.y, (mesh) =>
    typeof mesh.metadata?.planetId === 'string',
  )
  const planetId = pick?.pickedMesh?.metadata?.planetId
  if (typeof planetId !== 'string') {
    return null
  }

  if (planetId === currentPlanetId) {
    return null
  }

  return planets.find((planet) => planet.data.id === planetId) ?? null
}

function getClosestPlanetToPointer(
  scene: Scene,
  camera: ArcRotateCamera,
  canvas: HTMLCanvasElement,
  planets: StarSystemPlanetRuntime[],
  currentPlanetId: string,
  pointerX: number,
  pointerY: number,
): StarSystemPlanetRuntime | null {
  if (pointerX < 0 || pointerY < 0) {
    return null
  }

  const engine = scene.getEngine()
  const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
  const transformMatrix = scene.getTransformMatrix()
  const identityMatrix = Matrix.Identity()
  const baseLockRadiusSquared = PLANET_POINTER_LOCK_RADIUS_PX * PLANET_POINTER_LOCK_RADIUS_PX

  let closestPlanet: StarSystemPlanetRuntime | null = null
  let closestDistanceSquared = Number.POSITIVE_INFINITY

  for (const planet of planets) {
    if (planet.data.id === currentPlanetId) {
      continue
    }

    const planetCenter = planet.mesh.getAbsolutePosition()
    const projectedCenter = Vector3.Project(planetCenter, identityMatrix, transformMatrix, viewport)
    if (projectedCenter.z < 0 || projectedCenter.z > 1) {
      continue
    }

    const projectedRadiusPoint = Vector3.Project(
      planetCenter.add(Vector3.Up().scale(planet.radius)),
      identityMatrix,
      transformMatrix,
      viewport,
    )

    const canvasCenter = toCanvasPointerPosition(scene, canvas, projectedCenter.x, projectedCenter.y)
    const canvasRadiusPoint = toCanvasPointerPosition(
      scene,
      canvas,
      projectedRadiusPoint.x,
      projectedRadiusPoint.y,
    )
    const projectedRadius = Math.max(
      18,
      Vector3.Distance(
        new Vector3(canvasCenter.x, canvasCenter.y, 0),
        new Vector3(canvasRadiusPoint.x, canvasRadiusPoint.y, 0),
      ) * 1.8,
    )
    const lockRadiusSquared = Math.max(baseLockRadiusSquared, projectedRadius * projectedRadius)
    const distanceSquared = (canvasCenter.x - pointerX) ** 2 + (canvasCenter.y - pointerY) ** 2
    if (distanceSquared > lockRadiusSquared || distanceSquared > closestDistanceSquared) {
      continue
    }

    closestDistanceSquared = distanceSquared
    closestPlanet = planet
  }

  return closestPlanet
}

function getClosestNodeToPointer(
  scene: Scene,
  camera: ArcRotateCamera,
  canvas: HTMLCanvasElement,
  nodes: ResourceNode[],
  pointerX: number,
  pointerY: number,
): ResourceNode | null {
  if (pointerX < 0 || pointerY < 0) {
    return null
  }

  const engine = scene.getEngine()
  const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
  const transformMatrix = scene.getTransformMatrix()
  const identityMatrix = Matrix.Identity()
  const lockRadiusSquared = POINTER_LOCK_RADIUS_PX * POINTER_LOCK_RADIUS_PX

  let closestNode: ResourceNode | null = null
  let closestDistanceSquared = lockRadiusSquared

  for (const node of nodes) {
    const projected = Vector3.Project(
      node.hitArea.getAbsolutePosition(),
      identityMatrix,
      transformMatrix,
      viewport,
    )

    if (projected.z < 0 || projected.z > 1) {
      continue
    }

    const projectedPoint = toCanvasPointerPosition(scene, canvas, projected.x, projected.y)
    const distanceSquared = (projectedPoint.x - pointerX) ** 2 + (projectedPoint.y - pointerY) ** 2
    if (distanceSquared > closestDistanceSquared) {
      continue
    }

    closestDistanceSquared = distanceSquared
    closestNode = node
  }

  return closestNode
}

function getCanvasPointerPosition(
  canvas: HTMLCanvasElement,
  event: { clientX: number; clientY: number },
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

function toRenderPointerPosition(
  scene: Scene,
  canvas: HTMLCanvasElement,
  canvasX: number,
  canvasY: number,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  const width = Math.max(rect.width, 1)
  const height = Math.max(rect.height, 1)
  const engine = scene.getEngine()

  return {
    x: (canvasX / width) * engine.getRenderWidth(),
    y: (canvasY / height) * engine.getRenderHeight(),
  }
}

function toCanvasPointerPosition(
  scene: Scene,
  canvas: HTMLCanvasElement,
  renderX: number,
  renderY: number,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect()
  const engine = scene.getEngine()
  const renderWidth = Math.max(engine.getRenderWidth(), 1)
  const renderHeight = Math.max(engine.getRenderHeight(), 1)

  return {
    x: (renderX / renderWidth) * rect.width,
    y: (renderY / renderHeight) * rect.height,
  }
}

function sphericalToCartesian(
  radius: number,
  latitude: number,
  longitude: number,
): Vector3 {
  const x = radius * Math.cos(latitude) * Math.cos(longitude)
  const y = radius * Math.sin(latitude)
  const z = radius * Math.cos(latitude) * Math.sin(longitude)
  return new Vector3(x, y, z)
}
