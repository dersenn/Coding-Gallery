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
    id: 'waterField',
    label: 'Field',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Short Side Divisions',
        key: 'water_short_side_divisions',
        default: 90,
        min: 16,
        max: 240,
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
        default: 0.00045,
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
  },
  {
    type: 'group',
    id: 'foamBand',
    label: 'Foam',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Foam Min',
        key: 'foam_min',
        default: 0.6,
        min: 0,
        max: 1,
        step: 0.001
      },
      {
        type: 'slider',
        label: 'Foam Max',
        key: 'foam_max',
        default: 0.63,
        min: 0,
        max: 1,
        step: 0.001
      },
      {
        type: 'slider',
        label: 'Foam Band Pad',
        key: 'foam_band_pad',
        default: 0.07,
        min: 0,
        max: 0.3,
        step: 0.001
      },
      {
        type: 'slider',
        label: 'Foam Rise',
        key: 'foam_rise',
        default: 0.22,
        min: 0.01,
        max: 1,
        step: 0.01
      },
      {
        type: 'slider',
        label: 'Foam Fall',
        key: 'foam_fall',
        default: 0.05,
        min: 0.001,
        max: 1,
        step: 0.001
      },
      {
        type: 'slider',
        label: 'Foam Show Threshold',
        key: 'foam_show',
        default: 0.35,
        min: 0,
        max: 1,
        step: 0.01
      },
      {
        type: 'toggle',
        label: 'Shadow Linked',
        key: 'shadow_linked',
        default: true,
      }
    ]
  },
  {
    type: 'group',
    id: 'shadowOffsets',
    label: 'Shadow Offsets',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Shadow Offset X',
        key: 'shadow_offset_x',
        default: 8,
        min: -30,
        max: 30,
        step: 1
      },
      {
        type: 'slider',
        label: 'Shadow Offset Y',
        key: 'shadow_offset_y',
        default: -8,
        min: -30,
        max: 30,
        step: 1
      }
    ]
  },
  {
    type: 'group',
    id: 'shadowLinked',
    label: 'Shadow (Linked)',
    collapsible: true,
    defaultOpen: false,
    visibleWhenSelectKey: 'shadow_linked',
    visibleWhenSelectValue: true,
    controls: [
      {
        type: 'slider',
        label: 'Linked Shadow Min Offset',
        key: 'shadow_linked_min_offset',
        default: -0.15,
        min: -0.4,
        max: 0.4,
        step: 0.001
      },
      {
        type: 'slider',
        label: 'Linked Shadow Max Offset',
        key: 'shadow_linked_max_offset',
        default: -0.05,
        min: -0.4,
        max: 0.4,
        step: 0.001
      },
      {
        type: 'slider',
        label: 'Linked Shadow Pad Boost',
        key: 'shadow_linked_pad_boost',
        default: 0.03,
        min: 0,
        max: 0.25,
        step: 0.001
      }
    ]
  },
  {
    type: 'group',
    id: 'shadowUnlinkedBand',
    label: 'Shadow (Unlinked Band)',
    collapsible: true,
    defaultOpen: true,
    visibleWhenSelectKey: 'shadow_linked',
    visibleWhenSelectValue: false,
    controls: [
      {
        type: 'slider',
        label: 'Shadow Min',
        key: 'shadow_min',
        default: 0.45,
        min: 0,
        max: 1,
        step: 0.001
      },
      {
        type: 'slider',
        label: 'Shadow Max',
        key: 'shadow_max',
        default: 0.58,
        min: 0,
        max: 1,
        step: 0.001
      },
      {
        type: 'slider',
        label: 'Shadow Band Pad',
        key: 'shadow_band_pad',
        default: 0.08,
        min: 0,
        max: 0.3,
        step: 0.001
      }
    ]
  },
  {
    type: 'group',
    id: 'shadowUnlinkedLife',
    label: 'Shadow (Unlinked Persistence)',
    collapsible: true,
    defaultOpen: false,
    visibleWhenSelectKey: 'shadow_linked',
    visibleWhenSelectValue: false,
    controls: [
      {
        type: 'slider',
        label: 'Shadow Rise',
        key: 'shadow_rise',
        default: 0.16,
        min: 0.01,
        max: 1,
        step: 0.01
      },
      {
        type: 'slider',
        label: 'Shadow Fall',
        key: 'shadow_fall',
        default: 0.04,
        min: 0.001,
        max: 1,
        step: 0.001
      },
      {
        type: 'slider',
        label: 'Shadow Show Threshold',
        key: 'shadow_show',
        default: 0.3,
        min: 0,
        max: 1,
        step: 0.01
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
