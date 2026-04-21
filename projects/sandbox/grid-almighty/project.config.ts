import type {
  ProjectActionDefinition,
  ProjectControlDefinition,
  ProjectDefinition,
  ProjectSketchDefinition,
} from '~/types/project'


const GROWTH_CONTROLS: ProjectControlDefinition[] = [
  {
    id: 'grid',
    label: 'Grid',
    type: 'group',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        key: 'grid_short_side_divisions',
        label: 'Short Side Divisions',
        type: 'slider',
        default: 60,
        min: 12,
        max: 90,
        step: 1
      }
    ]
  },
  {
    id: 'growth',
    label: 'Growth',
    type: 'group',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        key: 'growth_seed_count',
        label: 'Seed Count',
        type: 'slider',
        default: 8,
        min: 1,
        max: 64,
        step: 1
      },
      {
        key: 'growth_chance',
        label: 'Growth Chance',
        type: 'slider',
        default: 68,
        min: 1,
        max: 100,
        step: 1
      },
      {
        key: 'growth_neighborhood',
        label: 'Neighborhood',
        type: 'select',
        default: '8',
        options: [
          { label: '8 Neighbors', value: '8' },
          { label: '4 Neighbors', value: '4' }
        ]
      },
      {
        key: 'growth_max_passes',
        label: 'Max Passes',
        type: 'slider',
        default: 420,
        min: 10,
        max: 2000,
        step: 10
      },
      {
        key: 'growth_target_fill',
        label: 'Target Fill',
        type: 'slider',
        default: 100,
        min: 1,
        max: 100,
        step: 1
      }
    ]
  }
]

const NOISY_AUTOMATA_CONTROLS: ProjectControlDefinition[] = [
  {
    id: 'grid',
    label: 'Grid',
    type: 'group',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        key: 'grid_short_side_divisions',
        label: 'Short Side Divisions',
        type: 'slider',
        default: 60,
        min: 12,
        max: 90,
        step: 1
      }
    ]
  },
  {
    id: 'rules',
    label: 'Rules',
    type: 'group',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        key: 'rule_preset',
        label: 'Rule Preset',
        type: 'select',
        default: 'auto',
        options: [
          { label: 'Auto', value: 'auto' },
          { label: 'Balanced', value: 'balanced' },
          { label: 'Chaotic', value: 'chaotic' },
          { label: 'Dense', value: 'dense' },
          { label: 'Sparse', value: 'sparse' }
        ]
      },
      {
        key: 'rule_single_mode',
        label: 'Single Rule',
        type: 'toggle',
        default: false
      },
      {
        key: 'rule_single_color',
        label: 'Single Color',
        type: 'toggle',
        default: false
      }
    ]
  },
  {
    id: 'noise',
    label: 'Noise',
    type: 'group',
    collapsible: true,
    defaultOpen: false,
    controls: [
      {
        key: 'noiseScale',
        label: 'Noise Scale',
        type: 'slider',
        default: 21,
        min: 2,
        max: 80,
        step: 1
      },
      {
        key: 'stretchX',
        label: 'Stretch X',
        type: 'slider',
        default: 1.2,
        min: 0.2,
        max: 3,
        step: 0.15
      },
      {
        key: 'stretchY',
        label: 'Stretch Y',
        type: 'slider',
        default: 0.75,
        min: 0.2,
        max: 3,
        step: 0.15
      },
      {
        key: 'amplitude',
        label: 'Amplitude',
        type: 'slider',
        default: 1.5,
        min: 0.1,
        max: 2.0,
        step: 0.1
      },
      {
        key: 'octaves',
        label: 'Octaves',
        type: 'slider',
        default: 1,
        min: 1,
        max: 4,
        step: 1
      },
      {
        key: 'lacunarity',
        label: 'Lacunarity',
        type: 'slider',
        default: 2.4,
        min: 1.5,
        max: 3.0,
        step: 0.1,
        visibleWhenSelectKey: 'octaves',
        visibleWhenSelectValues: [2, 3, 4]
      },
      {
        key: 'persistence',
        label: 'Persistence',
        type: 'slider',
        default: 0.9,
        min: 0.1,
        max: 1.0,
        step: 0.1,
        visibleWhenSelectKey: 'octaves',
        visibleWhenSelectValues: [2, 3, 4]
      }
    ]
  }
]

const NOISE_CORE_CONTROLS: ProjectControlDefinition[] = [
  {
    id: 'noiseAnim',
    label: 'Noise Animation',
    type: 'group',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        key: 'noise_anim_cols',
        label: 'Columns',
        type: 'slider',
        default: 64,
        min: 8,
        max: 180,
        step: 1
      },
      {
        key: 'noise_anim_rows',
        label: 'Rows',
        type: 'slider',
        default: 64,
        min: 8,
        max: 180,
        step: 1
      },
      {
        key: 'noise_anim_scale',
        label: 'Noise Scale',
        type: 'slider',
        default: 0.065,
        min: 0.005,
        max: 0.2,
        step: 0.001
      },
      {
        key: 'noise_anim_time_scale',
        label: 'Time Scale',
        type: 'slider',
        default: 0.0006,
        min: 0.00001,
        max: 0.003,
        step: 0.00001
      },
      {
        key: 'noise_anim_warp',
        label: 'Warp',
        type: 'slider',
        default: 0.18,
        min: 0,
        max: 0.6,
        step: 0.01
      },
      {
        key: 'noise_anim_contrast',
        label: 'Contrast',
        type: 'slider',
        default: 1,
        min: 0.1,
        max: 3,
        step: 0.05
      }
    ]
  }
]

const GRID_PRINT_2_CONTROLS: ProjectControlDefinition[] = [
  {
    id: 'grid',
    label: 'Grid',
    type: 'group',
    collapsible: true,
    defaultOpen: true,
    controls: [
      { key: 'cols', label: 'Cols', type: 'slider', default: 40, min: 2, max: 240, step: 1 },
      { key: 'rows', label: 'Rows', type: 'slider', default: 60, min: 2, max: 360, step: 1 },
    ]
  },
  {
    id: 'warp',
    label: 'Warp',
    type: 'group',
    collapsible: true,
    defaultOpen: true,
    controls: [
      { key: 'warpAmpMm', label: 'Warp amp (mm)', type: 'slider', default: 9, min: 0, max: 80, step: 1 },
      { key: 'warpScale', label: 'Warp scale', type: 'slider', default: 0.003, min: 0.0002, max: 0.02, step: 0.0001 },
      { key: 'warpScaleX', label: 'Warp scale X', type: 'slider', default: 1, min: 0.2, max: 5, step: 0.05 },
      { key: 'warpScaleY', label: 'Warp scale Y', type: 'slider', default: 1, min: 0.2, max: 5, step: 0.05 },
      { key: 'octaves', label: 'Octaves', type: 'slider', default: 1, min: 1, max: 6, step: 1 },
      { key: 'lacunarity', label: 'Lacunarity', type: 'slider', default: 2.0, min: 1.2, max: 4.0, step: 0.1, visibleWhenSelectKey: 'octaves', visibleWhenSelectValues: [2, 3, 4, 5, 6] },
      { key: 'persistence', label: 'Persistence', type: 'slider', default: 0.5, min: 0.1, max: 0.95, step: 0.05, visibleWhenSelectKey: 'octaves', visibleWhenSelectValues: [2, 3, 4, 5, 6] }
    ]
  },
  {
    id: 'pin',
    label: 'Pinning',
    type: 'group',
    collapsible: true,
    defaultOpen: false,
    controls: [
      { key: 'pinEdges', label: 'Pin edges', type: 'toggle', default: false },
      { key: 'pinFalloff', label: 'Pin falloff', type: 'slider', default: 20, min: 0, max: 80, step: 1 },
    ]
  }
]

const GRID_ACTIONS: ProjectActionDefinition[] = [
  {
    key: 'download-png',
    label: 'Download PNG'
  }
]


const metadata = {
  "id": "grid-almighty",
  "title": "Grid Almighty",
  "description": "Grid Almightyyy",
  "date": "2026-03",
  "tags": [
    "canvas2d",
    "grid"
  ],
  "hidden": false
} satisfies Omit<ProjectDefinition, 'init' | 'controls' | 'actions' | 'container' | 'defaultTechnique' | 'sketches' | 'techniques'>


const CONTAINER = { mode: 'full' as const }
const TECHNIQUES = ['canvas2d'] as const
const DEFAULT_TECHNIQUE = 'canvas2d' as const
const CONTROLS: ProjectControlDefinition[] = []
const ACTIONS: ProjectActionDefinition[] = []


const SKETCHES: ProjectSketchDefinition[] = [
  {
    id: 'grid-fade-1',
    label: 'Grid Fade 1',
    technique: 'canvas2d',
    container: { mode: 'full', padding: '0' },
    module: './sketches/grid-fade-1.js',
    actions: GRID_ACTIONS,
  },
  {
    id: 'grid-fade-2',
    label: 'Grid Fade 2',
    technique: 'canvas2d',
    container: { mode: 'full', padding: '0' },
    module: './sketches/grid-fade-2.js',
    actions: GRID_ACTIONS,
  },
  {
    id: 'grid-print',
    label: 'Grid Print',
    technique: 'canvas2d',
    container: { print: { width: 210, height: 297, unit: 'mm', dpi: 144, bleed: 3 }},
    module: './sketches/grid-print.js',
    actions: GRID_ACTIONS,
  },
  {
    id: 'grid-print-2',
    label: 'Grid Print 2',
    technique: 'canvas2d',
    container: { print: { width: 210, height: 297, unit: 'mm', dpi: 144, bleed: 0 }, padding: '3vmin' },
    module: './sketches/grid-print-2.js',
    actions: GRID_ACTIONS,
    controls: GRID_PRINT_2_CONTROLS,
  },
  {
    id: 'noisy-automata',
    label: 'Noisy Automata',
    technique: 'canvas2d',
    container: { mode: 'full' },
    module: './sketches/noisy-automata.js',
    controls: NOISY_AUTOMATA_CONTROLS,
    actions: GRID_ACTIONS,
  },
  {
    id: 'grid-growth-canvas',
    label: 'Grid Growth',
    technique: 'canvas2d',
    container: { mode: 'full' },
    module: './sketches/grid-growth.js',
    controls: GROWTH_CONTROLS,
    actions: GRID_ACTIONS,
  },
  {
    id: 'noise-core',
    label: 'Noise Core',
    technique: 'canvas2d',
    container: { mode: 'full' },
    module: './sketches/noise-core.js',
    controls: NOISE_CORE_CONTROLS,
  },
]


const definition: ProjectDefinition = {
  ...metadata,
  techniques: [...TECHNIQUES],
  defaultTechnique: DEFAULT_TECHNIQUE,
  libraries: [],
  controls: CONTROLS,
  actions: ACTIONS,
  container: CONTAINER,
  sketches: SKETCHES
}


export default definition
