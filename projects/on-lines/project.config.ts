import type {
  ProjectActionDefinition,
  ProjectControlDefinition,
  ProjectDefinition,
  ProjectSketchDefinition
} from '~/types/project'

const metadata = {
  "id": "on-lines",
  "title": "On Lines",
  "description": "Pen plotter studies",
  "date": "2026-11",
  "tags": [
    "svg",
    "plotter"
  ],
  "prefersTheme": "light",
  "hidden": false
} satisfies Omit<ProjectDefinition, 'init' | 'controls' | 'actions' | 'container' | 'defaultTechnique' | 'sketches'>

const CONTAINER = { mode: 'full' as const }
const DEFAULT_TECHNIQUE = 'svg' as const
const CONTROLS: ProjectControlDefinition[] = []
const ACTIONS: ProjectActionDefinition[] = []

const SVG_ACTIONS: ProjectActionDefinition[] = [
  { key: 'download-svg', label: 'Download SVG' }
]

const GRID_LATTICE_CONTROLS: ProjectControlDefinition[] = [
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
    id: 'lines',
    label: 'Lines',
    type: 'group',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        key: 'lineMode',
        label: 'Lines',
        type: 'select',
        default: 'mid',
        options: [
          { label: 'Mid (vertical)', value: 'mid' },
          { label: 'Lattice rows', value: 'rows' },
          { label: 'Lattice cols', value: 'cols' },
          { label: 'Lattice grid', value: 'grid' },
        ]
      },
      { key: 'noiseGate', label: 'Noise gate', type: 'slider', default: 0, min: 0, max: 1, step: 0.01 },
      { key: 'penMm', label: 'Pen width (mm)', type: 'slider', default: 0.3, min: 0.05, max: 1.5, step: 0.05 },
      { key: 'showTrim', label: 'Show trim', type: 'toggle', default: false },
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
      { key: 'warpScale', label: 'Warp scale (1/mm)', type: 'slider', default: 0.035, min: 0.002, max: 0.24, step: 0.001 },
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

const SKETCHES: ProjectSketchDefinition[] = [
  {
    id: 'grid-lattice-svg',
    label: 'Grid & Lattice (SVG)',
    technique: 'svg',
    container: {
      // dpi 25.4 + target svg → 1 viewBox unit = 1 mm
      print: { width: 210, height: 297, unit: 'mm', dpi: 25.4, bleed: 0, target: 'svg' },
      padding: '3vmin',
    },
    module: './sketches/grid-lattice-svg.js',
    controls: GRID_LATTICE_CONTROLS,
    actions: SVG_ACTIONS,
    defaultActive: true,
  },
]

const definition: ProjectDefinition = {
  ...metadata,
  defaultTechnique: DEFAULT_TECHNIQUE,
  libraries: [],
  controls: CONTROLS,
  actions: ACTIONS,
  container: CONTAINER,
  sketches: SKETCHES
}

export default definition
