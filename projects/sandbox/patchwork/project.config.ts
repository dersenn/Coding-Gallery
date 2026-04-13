import type {
  ProjectActionDefinition,
  ProjectControlDefinition,
  ProjectDefinition,
  ProjectSketchDefinition,
} from '~/types/project'

const PATCHWORK_1_CONTROLS: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'colorGroup',
    label: 'Color',
    order: 0,
    defaultOpen: true,
    controls: [
      {
        type: 'toggle',
        key: 'drawBackground',
        label: 'Draw background',
        order: 0,
        default: true,
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
    id: 'noiseGroup',
    label: 'Noise Sample',
    order: 0,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        key: 'sampleMultiplier',
        label: 'Sample multiplier',
        default: 2,
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
        randomize: true,
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
  "id": "patchwork",
  "title": "Patchwork",
  "description": "Patchwork",
  "date": "2026-04",
  "tags": [
    "canvas2d",
    "grid",
    "noise"
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
    id: 'patchwork-1',
    label: 'Patchwork 1',
    technique: 'canvas2d',
    container: { mode: 'full', padding: '0' },
    module: './sketches/patchwork-1.js',
    controls: PATCHWORK_1_CONTROLS,
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
