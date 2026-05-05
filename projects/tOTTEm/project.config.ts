import type {
  ProjectActionDefinition,
  ProjectControlDefinition,
  ProjectDefinition,
  ProjectSketchDefinition,
} from '~/types/project'



const metadata = {
  "id": "tOTTEm",
  "title": "tOTTEm",
  "description": "tOTTEm",
  "date": "2026-05",
  "tags": [
    "canvas2d"
  ],
  "hidden": false
} satisfies Omit<ProjectDefinition, 'init' | 'controls' | 'actions' | 'container' | 'defaultTechnique' | 'sketches'>


const CONTAINER = { mode: 'full' as const }
const DEFAULT_TECHNIQUE = 'canvas2d' as const
const CONTROLS: ProjectControlDefinition[] = []
const ACTIONS: ProjectActionDefinition[] = []


const SKETCHES: ProjectSketchDefinition[] = [
  {
    id: 'tOTTEm-1',
    label: 'tOTTEm-1',
    technique: 'canvas2d',
    // container: { mode: 'full' },
    container: { print: { width: 210, height: 297, unit: 'mm', dpi: 300, bleed: 0 }, padding: '3vmin' },
    module: './sketches/tOTTEm-1.js',
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
