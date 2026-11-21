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

const PATCHWORK_LINES_CONTROLS: ProjectControlDefinition[] = [
  {
    id: 'patterns',
    label: 'Patterns',
    type: 'group',
    collapsible: true,
    defaultOpen: true,
    controls: [
      { key: 'divisions', label: 'Cells (short side)', type: 'slider', default: 15, min: 3, max: 40, step: 1 },
      { key: 'spacingMm', label: 'Line spacing (mm)', type: 'slider', default: 1.2, min: 0.3, max: 5, step: 0.1 },
      { key: 'gapMm', label: 'Cell gap (mm)', type: 'slider', default: 1, min: 0, max: 6, step: 0.1 },
      { key: 'shufflePatterns', label: 'Shuffle patterns', type: 'toggle', default: false },
      { key: 'connectLines', label: 'Connect lines (zigzag)', type: 'toggle', default: false },
      { key: 'penMm', label: 'Pen width (mm)', type: 'slider', default: 0.3, min: 0.05, max: 1.5, step: 0.05 },
      { key: 'showTrim', label: 'Show trim', type: 'toggle', default: false },
    ]
  },
  {
    id: 'noise',
    label: 'Noise Sample',
    type: 'group',
    collapsible: true,
    defaultOpen: true,
    controls: [
      { key: 'sampleMultiplier', label: 'Sample multiplier', type: 'slider', default: 2, min: 0, max: 10, step: 1, randomize: true },
      { key: 'scale', label: 'Scale (1/mm)', type: 'slider', default: 0.005, min: 0.0005, max: 0.02, step: 0.0005, randomize: true },
      { key: 'offset', label: 'Offset', type: 'slider', default: 1000, min: 1000, max: 10000, step: 1000, randomize: true },
      { key: 'stretchX', label: 'Stretch X', type: 'slider', default: 1, min: 0.1, max: 10, step: 0.1, randomize: true },
      { key: 'stretchY', label: 'Stretch Y', type: 'slider', default: 1, min: 0.1, max: 10, step: 0.1, randomize: true },
      { key: 'amplitude', label: 'Amplitude', type: 'slider', default: 1, min: 0.1, max: 5, step: 0.1, randomize: true },
      { key: 'octaves', label: 'Octaves', type: 'slider', default: 3, min: 1, max: 10, step: 1, randomize: true },
      { key: 'lacunarity', label: 'Lacunarity', type: 'slider', default: 1.1, min: 0.1, max: 10, step: 0.1, randomize: true },
      { key: 'persistence', label: 'Persistence', type: 'slider', default: 0.9, min: 0.1, max: 10, step: 0.1, randomize: true },
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
  {
    id: 'patchwork-lines-svg',
    label: 'Patchwork Lines (SVG)',
    technique: 'svg',
    container: {
      print: { width: 210, height: 297, unit: 'mm', dpi: 25.4, bleed: 0, target: 'svg' },
      padding: '3vmin',
    },
    module: './sketches/patchwork-lines-svg.js',
    controls: PATCHWORK_LINES_CONTROLS,
    actions: SVG_ACTIONS,
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
