import type {
  ProjectActionDefinition,
  ProjectControlDefinition,
  ProjectDefinition,
  ProjectSketchDefinition,
} from '~/types/project'


const GROWTH_CONTROLS: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'grid',
    label: 'Grid',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Short Side Divisions',
        key: 'grid_short_side_divisions',
        default: 60,
        min: 12,
        max: 90,
        step: 1
      }
    ]
  },
  {
    type: 'group',
    id: 'growth',
    label: 'Growth',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Seed Count',
        key: 'growth_seed_count',
        default: 8,
        min: 1,
        max: 64,
        step: 1
      },
      {
        type: 'slider',
        label: 'Growth Chance',
        key: 'growth_chance',
        default: 68,
        min: 1,
        max: 100,
        step: 1
      },
      {
        type: 'select',
        label: 'Neighborhood',
        key: 'growth_neighborhood',
        default: '8',
        options: [
          { label: '8 Neighbors', value: '8' },
          { label: '4 Neighbors', value: '4' }
        ]
      },
      {
        type: 'slider',
        label: 'Max Passes',
        key: 'growth_max_passes',
        default: 420,
        min: 10,
        max: 2000,
        step: 10
      },
      {
        type: 'slider',
        label: 'Target Fill',
        key: 'growth_target_fill',
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
    type: 'group',
    id: 'grid',
    label: 'Grid',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Short Side Divisions',
        key: 'grid_short_side_divisions',
        default: 60,
        min: 12,
        max: 90,
        step: 1
      }
    ]
  },
  {
    type: 'group',
    id: 'rules',
    label: 'Rules',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'select',
        label: 'Rule Preset',
        key: 'rule_preset',
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
        type: 'toggle',
        label: 'Single Rule',
        key: 'rule_single_mode',
        default: false
      },
      {
        type: 'toggle',
        label: 'Single Color',
        key: 'rule_single_color',
        default: false
      }
    ]
  },
  {
    type: 'group',
    id: 'noise',
    label: 'Noise',
    collapsible: true,
    defaultOpen: false,
    controls: [
      {
        type: 'slider',
        label: 'Noise Scale',
        key: 'noiseScale',
        default: 21,
        min: 2,
        max: 80,
        step: 1
      },
      {
        type: 'slider',
        label: 'Stretch X',
        key: 'stretchX',
        default: 1.2,
        min: 0.2,
        max: 3,
        step: 0.15
      },
      {
        type: 'slider',
        label: 'Stretch Y',
        key: 'stretchY',
        default: 0.75,
        min: 0.2,
        max: 3,
        step: 0.15
      },
      {
        type: 'slider',
        label: 'Amplitude',
        key: 'amplitude',
        default: 1.5,
        min: 0.1,
        max: 2.0,
        step: 0.1
      },
      {
        type: 'slider',
        label: 'Octaves',
        key: 'octaves',
        default: 1,
        min: 1,
        max: 4,
        step: 1
      },
      {
        type: 'slider',
        label: 'Lacunarity',
        key: 'lacunarity',
        default: 2.4,
        min: 1.5,
        max: 3.0,
        step: 0.1,
        visibleWhenSelectKey: 'octaves',
        visibleWhenSelectValues: [2, 3, 4]
      },
      {
        type: 'slider',
        label: 'Persistence',
        key: 'persistence',
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
    container: { print: { width: 210, height: 297, unit: 'mm', dpi: 300, bleed: 3 } },
    module: './sketches/grid-print.js',
    actions: GRID_ACTIONS,
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
