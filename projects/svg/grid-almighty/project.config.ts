import type {
  ProjectActionDefinition,
  ProjectControlDefinition,
  ProjectDefinition,
  ProjectLayerDefinition
} from '~/types/project'

type GridAlmightyLayer = 'noisy-automata' | 'grid-growth-svg' | 'grid-growth-canvas'

const GRID_ALMIGHTY_LAYERS: ProjectLayerDefinition[] = [
  {
    id: 'noisy-automata',
    label: 'Noisy Automata',
    technique: 'svg',
    container: { mode: 'full' },
    module: './layers/noisy-automata.js',
    defaultActive: true
  },
  {
    id: 'grid-growth-svg',
    label: 'Grid Growth (SVG)',
    technique: 'svg',
    container: { mode: 'full' },
    module: './layers/grid2.js'
  },
  {
    id: 'grid-growth-canvas',
    label: 'Grid Growth (Canvas2D)',
    technique: 'canvas2d',
    container: { mode: 'full' },
    module: './layers/grid-canvas.js'
  }
]

const GRID_ALMIGHTY_LAYER_OPTIONS = GRID_ALMIGHTY_LAYERS.map(({ id, label }) => ({
  value: id,
  label: label ?? id
}))

const GRID_ALMIGHTY_DEFAULT_LAYER: GridAlmightyLayer = 'noisy-automata'
const GRID_ALMIGHTY_CONTAINER = { mode: 'full' as const }
const GRID_ALMIGHTY_TECHNIQUES = ['svg', 'canvas2d'] as const
const GRID_ALMIGHTY_DEFAULT_TECHNIQUE = 'svg' as const

const GRID_ALMIGHTY_CONTROLS: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'composition',
    label: 'Composition',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'select',
        label: 'Layer',
        key: 'activeLayer',
        hideLabel: true,
        default: GRID_ALMIGHTY_DEFAULT_LAYER,
        options: GRID_ALMIGHTY_LAYER_OPTIONS
      }
    ]
  },
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
    visibleWhenSelectKey: 'activeLayer',
    visibleWhenSelectValues: ['grid-growth-svg', 'grid-growth-canvas'],
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
        min: 10,
        max: 100,
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
    visibleWhenSelectKey: 'activeLayer',
    visibleWhenSelectValue: 'noisy-automata',
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
    visibleWhenSelectKey: 'activeLayer',
    visibleWhenSelectValue: 'noisy-automata',
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

const GRID_ALMIGHTY_ACTIONS: ProjectActionDefinition[] = [
  {
    key: 'download-svg',
    label: 'Download SVG',
    visibleWhenSelectKey: 'activeLayer',
    visibleWhenSelectValues: ['noisy-automata', 'grid-growth-svg']
  },
  {
    key: 'download-png',
    label: 'Download PNG',
    visibleWhenSelectKey: 'activeLayer',
    visibleWhenSelectValue: 'grid-growth-canvas'
  }
]

const metadata = {
  "id": "grid-almighty",
  "title": "Grid Almighty",
  "description": "Single-layer full-canvas grid skeleton that draws circles per cell",
  "date": "2026-03",
  "tags": [
    "svg",
    "grid"
  ],
  "hidden": false
} satisfies Omit<ProjectDefinition, 'init' | 'controls' | 'actions' | 'container' | 'defaultTechnique' | 'layers' | 'techniques'>

const definition: ProjectDefinition = {
  ...metadata,
  techniques: [...GRID_ALMIGHTY_TECHNIQUES],
  defaultTechnique: GRID_ALMIGHTY_DEFAULT_TECHNIQUE,
  libraries: [],
  controls: GRID_ALMIGHTY_CONTROLS,
  actions: GRID_ALMIGHTY_ACTIONS,
  container: GRID_ALMIGHTY_CONTAINER,
  layers: GRID_ALMIGHTY_LAYERS
}

export default definition
