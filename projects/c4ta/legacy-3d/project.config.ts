import type {
  ProjectActionDefinition,
  ProjectControlDefinition,
  ProjectDefinition,
  ProjectSketchDefinition
} from '~/types/project'

const WALL_OF_CUBES_CONTROLS: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'grid',
    label: 'Grid',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Grid Size',
        key: 'gridSize',
        default: 11,
        min: 4,
        max: 30,
        step: 1
      }
    ]
  },
  {
    type: 'group',
    id: 'motion',
    label: 'Motion',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Overall Speed',
        key: 'overallSpeed',
        default: 0.6,
        min: 0.1,
        max: 3,
        step: 0.05
      },
      {
        type: 'slider',
        label: 'Light Sweep',
        key: 'lightSweep',
        default: 0.02,
        min: 0.001,
        max: 0.08,
        step: 0.001
      }
    ]
  },
  {
    type: 'group',
    id: 'displacement',
    label: 'Displacement',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Noise Amplitude',
        key: 'noiseAmplitude',
        default: 0.6,
        min: 0.2,
        max: 3,
        step: 0.05
      },
      {
        type: 'slider',
        label: 'Elevation Scale',
        key: 'elevationScale',
        default: 0.2,
        min: 0.02,
        max: 0.8,
        step: 0.01
      }
    ]
  }
]

const SKETCHES: ProjectSketchDefinition[] = [
  {
    id: 'wall-of-cubes',
    label: 'Wall Of Cubes',
    technique: 'p5',
    container: { mode: 'full' },
    module: './sketches/wall-of-cubes.js',
    controls: WALL_OF_CUBES_CONTROLS,
    defaultActive: true,
  },
  {
    id: 'dandelion',
    label: 'Dandelion',
    technique: 'p5',
    container: { mode: 'full' },
    module: './sketches/dandelion.js',
  },
]

const CONTAINER = { mode: 'full' as const }
const TECHNIQUES = ['p5'] as const
const DEFAULT_TECHNIQUE = 'p5' as const

const CONTROLS: ProjectControlDefinition[] = []
const ACTIONS: ProjectActionDefinition[] = []

const metadata = {
  "id": "legacy-3d",
  "title": "Legacy 3D",
  "description": "C4TA WEBGL p5.js migration archive — cube field and dandelion sphere",
  "date": "2022-01",
  "tags": [
    "p5js",
    "legacy-migration",
    "webgl",
    "3d",
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
