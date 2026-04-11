import type {
  ProjectActionDefinition,
  ProjectControlDefinition,
  ProjectDefinition,
  ProjectSketchDefinition
} from '~/types/project'

const TRAILS_CONTROLS: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'trail',
    label: 'Trail',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Memory',
        key: 'memory',
        default: 60,
        min: 5,
        max: 200,
        step: 1
      },
      {
        type: 'slider',
        label: 'Max Size',
        key: 'size',
        default: 30,
        min: 4,
        max: 120,
        step: 1
      }
    ]
  }
]

const GRID_DIVISION_CONTROLS: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'grid',
    label: 'Grid',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Levels',
        key: 'levels',
        default: 2,
        min: 1,
        max: 5,
        step: 1
      },
      {
        type: 'slider',
        label: 'Branch Subdivide Chance',
        key: 'branchStopChance',
        default: 50,
        min: 0,
        max: 100,
        step: 1
      },
      {
        type: 'slider',
        label: 'Frame Rate',
        key: 'fps',
        default: 3,
        min: 1,
        max: 24,
        step: 1
      }
    ]
  }
]

const SKETCHES: ProjectSketchDefinition[] = [
  {
    id: 'trails',
    label: 'Trails',
    technique: 'p5',
    container: { mode: 'full' },
    module: './sketches/trails.js',
    controls: TRAILS_CONTROLS,
    defaultActive: true,
  },
  {
    id: 'clicky-polygon',
    label: 'Clicky Polygon',
    technique: 'p5',
    container: { mode: 'full' },
    module: './sketches/clicky-polygon.js',
  },
  {
    id: 'grid-division-pixels',
    label: 'Grid Division',
    technique: 'p5',
    container: { mode: 'full' },
    module: './sketches/grid-division-pixels.js',
    controls: GRID_DIVISION_CONTROLS,
  },
]

const CONTAINER = { mode: 'full' as const }
const TECHNIQUES = ['p5'] as const
const DEFAULT_TECHNIQUE = 'p5' as const

const CONTROLS: ProjectControlDefinition[] = []
const ACTIONS: ProjectActionDefinition[] = []

const metadata = {
  "id": "legacy-p5",
  "title": "Legacy P5",
  "description": "C4TA p5.js migration archive — trails, polygon, and grid sketches",
  "date": "2021-10",
  "tags": [
    "p5js",
    "legacy-migration",
    "c4ta"
  ],
  "hidden": true
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
