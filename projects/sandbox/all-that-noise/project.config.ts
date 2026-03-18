import type {
  ProjectActionDefinition,
  ProjectControlDefinition,
  ProjectDefinition,
  ProjectLayerDefinition
} from '~/types/project'

const NOISE_CORE_CONTROLS: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'noiseAnim',
    label: 'Noise Animation',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Columns',
        key: 'noise_anim_cols',
        default: 64,
        min: 8,
        max: 180,
        step: 1
      },
      {
        type: 'slider',
        label: 'Rows',
        key: 'noise_anim_rows',
        default: 64,
        min: 8,
        max: 180,
        step: 1
      },
      {
        type: 'slider',
        label: 'Noise Scale',
        key: 'noise_anim_scale',
        default: 0.065,
        min: 0.005,
        max: 0.2,
        step: 0.001
      },
      {
        type: 'slider',
        label: 'Time Scale',
        key: 'noise_anim_time_scale',
        default: 0.0006,
        min: 0.00001,
        max: 0.003,
        step: 0.00001
      },
      {
        type: 'slider',
        label: 'Warp',
        key: 'noise_anim_warp',
        default: 0.18,
        min: 0,
        max: 0.6,
        step: 0.01
      },
      {
        type: 'slider',
        label: 'Contrast',
        key: 'noise_anim_contrast',
        default: 1,
        min: 0.1,
        max: 3,
        step: 0.05
      }
    ]
  }
]

const THIS_IS_WATER_CONTROLS: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'noiseAnim',
    label: 'Noise Animation',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Columns',
        key: 'noise_anim_cols',
        default: 150,
        min: 8,
        max: 180,
        step: 1
      },
      {
        type: 'slider',
        label: 'Rows',
        key: 'noise_anim_rows',
        default: 90,
        min: 8,
        max: 180,
        step: 1
      },
      {
        type: 'slider',
        label: 'Noise Scale',
        key: 'noise_anim_scale',
        default: 0.033,
        min: 0.005,
        max: 0.2,
        step: 0.001
      },
      {
        type: 'slider',
        label: 'Time Scale',
        key: 'noise_anim_time_scale',
        default: 0.00066,
        min: 0.00001,
        max: 0.003,
        step: 0.00001
      },
      {
        type: 'slider',
        label: 'Warp',
        key: 'noise_anim_warp',
        default: 0.3,
        min: 0,
        max: 0.6,
        step: 0.01
      },
      {
        type: 'slider',
        label: 'Contrast',
        key: 'noise_anim_contrast',
        default: 1,
        min: 0.1,
        max: 3,
        step: 0.05
      },
      {
        type: 'toggle',
        label: 'Use Osc',
        key: 'use_osc',
        default: true,
      },
      {
        type: 'toggle',
        label: 'Use Contrast Osc',
        key: 'use_contrast_osc',
        default: true,
      }
    ]
  }
]

const LAYERS: ProjectLayerDefinition[] = [
  {
    id: 'noise-core',
    label: 'Noise Core',
    technique: 'canvas2d',
    container: { mode: 'full' },
    module: './layers/noise-core.js',
    controls: NOISE_CORE_CONTROLS
  },
  {
    id: 'this-is-water',
    label: 'This Is Water',
    technique: 'canvas2d',
    container: { mode: 'full' },
    module: './layers/this-is-water.js',
    controls: THIS_IS_WATER_CONTROLS,
    defaultActive: true
  }
]

const CONTAINER = { mode: 'full' as const }
const TECHNIQUES = ['canvas2d'] as const
const DEFAULT_TECHNIQUE = 'canvas2d' as const

const CONTROLS: ProjectControlDefinition[] = []

const ACTIONS: ProjectActionDefinition[] = []

const metadata = {
  "id": "all-that-noise",
  "title": "All That Noise",
  "description": "All That Noise",
  "date": "2026-03",
  "tags": [
    "canvas2d",
    "noise"
  ],
  "hidden": false
} satisfies Omit<ProjectDefinition, 'init' | 'controls' | 'actions' | 'container' | 'defaultTechnique' | 'layers' | 'techniques'>

const definition: ProjectDefinition = {
  ...metadata,
  techniques: [...TECHNIQUES],
  defaultTechnique: DEFAULT_TECHNIQUE,
  libraries: [],
  controls: CONTROLS,
  actions: ACTIONS,
  container: CONTAINER,
  layers: LAYERS
}

export default definition
