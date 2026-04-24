import type {
  ProjectActionDefinition,
  ProjectControlDefinition,
  ProjectDefinition,
  ProjectSketchDefinition
} from '~/types/project'

const BEZIER_LAB_CONTROLS: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'curves',
    label: 'Curves',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'checkbox-group',
        label: 'Curves',
        key: 'enabledCurves',
        default: ['straight', 'quadratic', 'cubic'],
        options: [
          { label: 'Straight', value: 'straight' },
          { label: 'Quadratic Bezier', value: 'quadratic' },
          { label: 'Cubic Spline', value: 'cubic' }
        ]
      },
      {
        type: 'slider',
        label: 'Quadratic Tension',
        key: 'quadraticTension',
        default: 0.5,
        min: -1,
        max: 1,
        step: 0.05
      },
      {
        type: 'slider',
        label: 'Quadratic Offset',
        key: 'quadraticOffset',
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.05
      },
      {
        type: 'slider',
        label: 'Cubic Tension',
        key: 'cubicTension',
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.05
      }
    ]
  },
  {
    type: 'group',
    id: 'overlay',
    label: 'Overlay',
    collapsible: true,
    defaultOpen: false,
    controls: [
      {
        type: 'toggle',
        label: 'Sample Points',
        key: 'showSamplePoints',
        default: true
      },
      {
        type: 'toggle',
        label: 'Show Handles',
        key: 'showHandles',
        default: false
      },
      {
        type: 'slider',
        label: 'Handle Opacity',
        key: 'handleOpacity',
        default: 0.5,
        min: 0.1,
        max: 1,
        step: 0.05,
        visibleWhenSelectKey: 'showHandles',
        visibleWhenSelectValue: true
      }
    ]
  }
]

const BALLOONEY_CONTROLS: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'subdivision',
    label: 'Subdivision',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'select',
        label: 'Edge Division Mode',
        key: 'edgeDivisionMode',
        default: 'randomGaps',
        options: [
          { label: 'Uniform', value: 'uniform' },
          { label: 'Random (Gap Weights)', value: 'randomGaps' },
          { label: 'Random (Gap Weights, Descending)', value: 'gapDescending' },
          { label: 'Random (Gap Weights, Ascending)', value: 'gapAscending' },
          { label: 'Random (Sorted Positions)', value: 'randomSorted' },
          { label: 'Curve (Log)', value: 'curveLog' },
          { label: 'Fibonacci', value: 'fibonacci' }
        ]
      },
      {
        type: 'slider',
        label: 'Min Segment Ratio',
        key: 'minSegmentRatio',
        default: 0,
        min: 0,
        max: 0.3,
        step: 0.005
      }
    ]
  }
]

const LATTICE_DRIFT_CONTROLS: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'structure',
    label: 'Structure',
    collapsible: true,
    defaultOpen: true,
    controls: [
      { type: 'slider', label: 'Rows', key: 'rows', default: 10, min: 2, max: 40, step: 1 },
      { type: 'slider', label: 'Cols', key: 'cols', default: 20, min: 2, max: 60, step: 1 },
      { type: 'slider', label: 'Sub-Strands', key: 'subStrands', default: 1, min: 1, max: 8, step: 1 }
    ]
  },
  {
    type: 'group',
    id: 'subdivision',
    label: 'Subdivision',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'select',
        label: 'Division Mode',
        key: 'edgeMode',
        default: 'randomGaps',
        options: [
          { label: 'Uniform', value: 'uniform' },
          { label: 'Random (Gap Weights)', value: 'randomGaps' },
          { label: 'Random (Gap Weights, Descending)', value: 'gapDescending' },
          { label: 'Random (Gap Weights, Ascending)', value: 'gapAscending' },
          { label: 'Random (Sorted Positions)', value: 'randomSorted' },
          { label: 'Curve (Log)', value: 'curveLog' },
          { label: 'Fibonacci', value: 'fibonacci' }
        ]
      },
      {
        type: 'slider',
        label: 'Min Segment Ratio',
        key: 'minSegmentRatio',
        default: 0,
        min: 0,
        max: 0.3,
        step: 0.005
      }
    ]
  },
  {
    type: 'group',
    id: 'sketches',
    label: 'Sketches',
    collapsible: true,
    defaultOpen: true,
    controls: [
      { type: 'toggle', label: 'Show Paths', key: 'showPaths', default: true },
      { type: 'toggle', label: 'Show Points', key: 'showPoints', default: true }
    ]
  },
  {
    type: 'group',
    id: 'style',
    label: 'Style',
    collapsible: true,
    defaultOpen: false,
    controls: [
      { type: 'color', label: 'Path Stroke', key: 'pathStroke', default: '#00ff00' },
      { type: 'slider', label: 'Path Stroke Width', key: 'pathStrokeWidth', default: 1, min: 0.5, max: 4, step: 0.5 },
      { type: 'slider', label: 'Point Radius', key: 'pointRadius', default: 5, min: 1, max: 12, step: 1 },
      {
        type: 'select',
        label: 'Point Colors',
        key: 'pointColorMode',
        default: 'rowRandom',
        options: [
          { label: 'Row Random', value: 'rowRandom' },
          { label: 'Single Color', value: 'singleColor' }
        ]
      },
      {
        type: 'color',
        label: 'Point Color',
        key: 'pointColor',
        default: '#ff0066',
        visibleWhenSelectKey: 'pointColorMode',
        visibleWhenSelectValue: 'singleColor'
      }
    ]
  }
]

const BEZIER_LAB_ACTIONS: ProjectActionDefinition[] = [
  { key: 'download-svg', label: 'Download SVG' }
]

const BALLOONEY_ACTIONS: ProjectActionDefinition[] = [
  { key: 'download-svg', label: 'Download SVG' }
]

const LATTICE_DRIFT_ACTIONS: ProjectActionDefinition[] = [
  { key: 'download-svg', label: 'Download SVG' }
]

const SKETCHES: ProjectSketchDefinition[] = [
  {
    id: 'bezier-lab',
    label: 'Bezier Lab',
    technique: 'svg',
    container: { mode: 'full' },
    module: './sketches/bezier-lab.js',
    controls: BEZIER_LAB_CONTROLS,
    actions: BEZIER_LAB_ACTIONS,
    defaultActive: true,
  },
  {
    id: 'ballooney',
    label: 'Ballooney',
    technique: 'svg',
    container: { mode: 'full' },
    module: './sketches/ballooney.js',
    controls: BALLOONEY_CONTROLS,
    actions: BALLOONEY_ACTIONS,
  },
  {
    id: 'lattice-drift',
    label: 'Lattice Drift',
    technique: 'svg',
    container: { mode: 'full' },
    module: './sketches/lattice-drift.js',
    controls: LATTICE_DRIFT_CONTROLS,
    actions: LATTICE_DRIFT_ACTIONS,
  },
]

const CONTAINER = { mode: 'full' as const }
const TECHNIQUES = ['svg'] as const
const DEFAULT_TECHNIQUE = 'svg' as const

const CONTROLS: ProjectControlDefinition[] = []
const ACTIONS: ProjectActionDefinition[] = []

const metadata = {
  "id": "bezier-lab",
  "title": "Bezier Lab",
  "description": "SVG curve and subdivision studies — bezier paths, organic tiles, warped lattice strands",
  "date": "2023-02",
  "tags": [
    "svg",
    "bezier",
    "spline",
    "subdivision"
  ],
  "hidden": false
} satisfies Omit<ProjectDefinition, 'init' | 'controls' | 'actions' | 'container' | 'defaultTechnique' | 'sketches' | 'techniques'>

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
