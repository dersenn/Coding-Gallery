import type {
  ProjectActionDefinition,
  ProjectControlDefinition,
  ProjectDefinition,
  ProjectSketchDefinition
} from '~/types/project'

const VERA_CONTROLS: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'composition',
    label: 'Composition',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'checkbox-group',
        label: 'Sketches',
        key: 'enabledLayers',
        default: ['vera1'],
        options: [
          { label: 'Vera 1', value: 'vera1' },
          { label: 'Vera 2', value: 'vera2' }
        ]
      }
    ]
  }
]

const SKETCHES: ProjectSketchDefinition[] = [
  {
    id: 'vera',
    label: 'Vera',
    technique: 'svg',
    container: 'square',
    module: './sketches/vera.js',
    controls: VERA_CONTROLS,
    actions: [{ key: 'download-svg', label: 'Download SVG' }],
    defaultActive: true,
  }
]

const CONTAINER = 'square' as const
const TECHNIQUES = ['svg'] as const
const DEFAULT_TECHNIQUE = 'svg' as const

const CONTROLS: ProjectControlDefinition[] = []
const ACTIONS: ProjectActionDefinition[] = []

const metadata = {
  "id": "vera",
  "title": "Vera",
  "description": "Overlapping tile-line composition with switchable Vera 1 and Vera 2 variants (migrated from C4TA SVG)",
  "date": "2021-11",
  "tags": [
    "svg",
    "legacy-migration",
    "geometry",
    "c4ta"
  ],
  "prefersTheme": "light",
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
