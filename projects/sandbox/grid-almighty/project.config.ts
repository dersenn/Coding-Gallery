import type {
  ProjectActionDefinition,
  ProjectControlDefinition,
  ProjectDefinition,
  ProjectSketchDefinition,
} from '~/types/project'

const GRID2_CONTROLS: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'grid2-color',
    label: 'Color',
    order: 8,
    defaultOpen: true,
    controls: [
      {
        type: 'color',
        key: 'sketchBackground',
        label: 'Background',
        order: 0,
        default: '#000000',
      },
      {
        type: 'color',
        key: 'sketchForeground',
        label: 'Foreground',
        order: 1,
        default: '#00ff00',
      },
    ],
  },
  {
    type: 'slider',
    key: 'cols',
    label: 'Cols',
    group: 'Grid',
    order: 10,
    default: 1,
    min: 1,
    max: 24,
    step: 1,
  },
  {
    type: 'slider',
    key: 'rows',
    label: 'Rows',
    group: 'Grid',
    order: 11,
    default: 1,
    min: 1,
    max: 24,
    step: 1,
  },
  {
    type: 'toggle',
    key: 'subdivisionEnabled',
    label: 'Subdivision',
    group: 'Subdivide',
    order: 20,
    default: true,
  },
  {
    type: 'select',
    key: 'subdivideMode',
    label: 'Split mode',
    group: 'Subdivide',
    order: 21,
    default: 'divLength',
    options: [
      {
        label: 'divLength (random cols×rows per split)',
        value: 'divLength',
      },
      {
        label: 'divLength tensor (uneven strip sizes)',
        value: 'divLengthTensor',
      },
      {
        label: 'Fixed grid (same cols×rows every split)',
        value: 'fixedGrid',
      },
    ],
  },
  {
    type: 'slider',
    key: 'maxLevel',
    label: 'Max level',
    group: 'Subdivide',
    order: 22,
    default: 2,
    min: 0,
    max: 4,
    step: 1,
  },
  {
    type: 'slider',
    key: 'chance',
    label: 'Chance %',
    group: 'Subdivide',
    order: 23,
    default: 85,
    min: 0,
    max: 100,
    step: 1,
  },
  {
    type: 'slider',
    key: 'subdivisionCols',
    label: 'Child cols (each split)',
    group: 'Subdivide',
    order: 24,
    default: 2,
    min: 1,
    max: 8,
    step: 1,
    visibleWhenSelectKey: 'subdivideMode',
    visibleWhenSelectValue: 'fixedGrid',
  },
  {
    type: 'slider',
    key: 'subdivisionRows',
    label: 'Child rows (each split)',
    group: 'Subdivide',
    order: 25,
    default: 2,
    min: 1,
    max: 8,
    step: 1,
    visibleWhenSelectKey: 'subdivideMode',
    visibleWhenSelectValue: 'fixedGrid',
  },
  {
    type: 'group',
    id: 'grid2-divlength',
    label: 'divLength splits',
    visibleWhenSelectKey: 'subdivideMode',
    visibleWhenSelectValues: ['divLength', 'divLengthTensor'],
    order: 30,
    defaultOpen: true,
    controls: [
      {
        type: 'select',
        key: 'divLengthMode',
        label: 'Spacing mode',
        order: 0,
        default: 'fibonacci',
        options: [
          { label: 'Even (uniform)', value: 'uniform' },
          { label: 'Random gaps', value: 'randomGaps' },
          { label: 'Random sorted', value: 'randomSorted' },
          { label: 'Gap ascending', value: 'gapAscending' },
          { label: 'Gap descending', value: 'gapDescending' },
          { label: 'Curve (easing)', value: 'curve' },
          { label: 'Fibonacci', value: 'fibonacci' },
        ],
      },
      {
        type: 'select',
        key: 'divLengthCurveKind',
        label: 'Curve kind',
        order: 1,
        default: 'pow',
        visibleWhenSelectKey: 'divLengthMode',
        visibleWhenSelectValue: 'curve',
        options: [
          { label: 'Power', value: 'pow' },
          { label: 'Log', value: 'log' },
          { label: 'Exponential', value: 'exp' },
        ],
      },
      {
        type: 'slider',
        key: 'splitMinCols',
        label: 'Split cols min',
        order: 2,
        default: 2,
        min: 1,
        max: 24,
        step: 1,
      },
      {
        type: 'slider',
        key: 'splitMaxCols',
        label: 'Split cols max',
        order: 3,
        default: 4,
        min: 1,
        max: 24,
        step: 1,
      },
      {
        type: 'slider',
        key: 'splitMinRows',
        label: 'Split rows min',
        order: 4,
        default: 2,
        min: 1,
        max: 24,
        step: 1,
      },
      {
        type: 'slider',
        key: 'splitMaxRows',
        label: 'Split rows max',
        order: 5,
        default: 4,
        min: 1,
        max: 24,
        step: 1,
      },
      {
        type: 'slider',
        key: 'minSegmentRatio',
        label: 'Min segment ratio',
        order: 6,
        default: 0.04,
        min: 0,
        max: 0.5,
        step: 0.005,
      },
      {
        type: 'slider',
        key: 'divLengthSegMultiplier',
        label: 'Bucket resolution (uniform mode)',
        order: 7,
        default: 10,
        min: 1,
        max: 32,
        step: 1,
        visibleWhenSelectKey: 'subdivideMode',
        visibleWhenSelectValue: 'divLength',
      },
    ],
  },
  {
    type: 'toggle',
    key: 'showgrid',
    label: 'Cell edges',
    group: 'Debug',
    order: 90,
    default: false,
  },
]


const GRIDWAVE_CONTROLS: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'gridwave-color',
    label: 'Color',
    order: 0,
    defaultOpen: false,
    controls: [
      {
        type: 'color',
        key: 'sketchBackground',
        label: 'Background',
        order: 0,
        default: '#000000',
      },
      {
        type: 'color',
        key: 'sketchForeground',
        label: 'Foreground',
        order: 1,
        default: '#00ff00',
      },
    ],
  },
  {
    type: 'slider',
    key: 'rows',
    label: 'Rows',
    group: 'Grid',
    order: 10,
    default: 12,
    min: 2,
    max: 36,
    step: 1,
  },
  {
    type: 'slider',
    key: 'minSplit',
    label: 'Min split',
    group: 'Wave',
    order: 20,
    default: 1,
    min: 1,
    max: 36,
    step: 1,
  },
  {
    type: 'slider',
    key: 'maxSplit',
    label: 'Max split',
    group: 'Wave',
    order: 21,
    default: 12,
    min: 1,
    max: 36,
    step: 1,
  },
  {
    type: 'slider',
    key: 'waveFreq',
    label: 'Frequency',
    group: 'Wave',
    order: 22,
    default: 1.0,
    min: 0.1,
    max: 10.0,
    step: 0.1,
  },
  {
    type: 'toggle',
    key: 'useNoise',
    label: 'Use noise',
    group: 'Wave',
    order: 23,
    default: false,
  },
  {
    type: 'toggle',
    key: 'showGrid',
    label: 'Cell edges',
    group: 'Debug',
    order: 90,
    default: false,
  },
]

const GRID5_CONTROLS: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'grid5-color',
    label: 'Color',
    order: 0,
    defaultOpen: true,
    controls: [
      {
        type: 'toggle',
        key: 'drawBackground',
        label: 'Draw background',
        order: 0,
        default: false,
      },
      {
        type: 'toggle',
        key: 'shuffleColors',
        label: 'Shuffle colors',
        order: 1,
        default: false,
      },
    ],
  },
  {
    type: 'group',
    id: 'grid5-sample',
    label: 'Noise Sample',
    order: 0,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        key: 'sampleMultiplier',
        label: 'Sample multiplier',
        default: 3,
        min: 0,
        max: 10,
        step: 1,
        randomize: true,
      },
      {
        type: 'slider',
        key: 'scale',
        label: 'Scale',
        default: .001,
        min: 0.0001,
        max: 0.001,
        step: 0.0001,
        randomize: true,
      },
      {
        type: 'slider',
        key: 'offset',
        label: 'Offset',
        default: 1000,
        min: 1000,
        max: 10000,
        step: 1000,
      },
      {
        type: 'slider',
        key: 'stretchX',
        label: 'Stretch X',
        default: 1.0,
        min: 0.1,
        max: 10.0,
        step: 0.1,
        randomize: true,
      },
      {
        type: 'slider',
        key: 'stretchY',
        label: 'Stretch Y',
        default: 1.0,
        min: 0.1,
        max: 10.0,
        step: 0.1,
        randomize: true,
      },
      {
        type: 'slider',
        key: 'amplitude',
        label: 'Amplitude',
        default: 1.0,
        min: 0.1,
        max: 5.0,
        step: 0.1,
        randomize: true,
      },
      {
        type: 'slider',
        key: 'octaves',
        label: 'Octaves',
        default: 3,
        min: 1,
        max: 10,
        step: 1,
        randomize: true,
      },
      {
        type: 'slider',
        key: 'lacunarity',
        label: 'Lacunarity',
        default: 1.1,
        min: 0.1,
        max: 10.0,
        step: 0.1,
        randomize: true,
      },
      {
        type: 'slider',
        key: 'persistence',
        label: 'Persistence',
        default: 0.9,
        min: 0.1,
        max: 10.0,
        step: 0.1,
        randomize: true,
      },
    ],
  },
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
    id: 'grid-1',
    label: 'Grid 1',
    technique: 'canvas2d',
    container: { mode: '1:1', padding: '9vmin' },
    module: './sketches/grid-1.js',
  },
  {
    id: 'grid-2',
    label: 'Grid 2',
    technique: 'canvas2d',
    container: { mode: 'full', padding: '0' },
    module: './sketches/grid-2.js',
    controls: GRID2_CONTROLS,
  },
  {
    id: 'grid-3',
    label: 'Grid 3',
    technique: 'canvas2d',
    container: { mode: 'full', padding: '0' },
    module: './sketches/grid-3.js',
    controls: GRIDWAVE_CONTROLS,
  },
  {
    id: 'grid-4',
    label: 'Grid 4',
    technique: 'canvas2d',
    container: { mode: 'full', padding: '0' },
    module: './sketches/grid-4.js',
    controls: GRIDWAVE_CONTROLS,
  },
  {
    id: 'grid-5',
    label: 'Grid 5',
    technique: 'canvas2d',
    container: { mode: 'full', padding: '0' },
    module: './sketches/grid-5.js',
    controls: GRID5_CONTROLS,
    prefersTheme: 'light',
  }
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
