import type {
  ProjectActionDefinition,
  ProjectControlDefinition,
  ProjectDefinition,
  ProjectSketchDefinition
} from '~/types/project'

const metadata = {
  "id": "svg-misc",
  "title": "SVG Misc",
  "description": "SVG Misc",
  "date": "2026-03",
  "tags": [
    "svg",
    "misc"
  ],
  "hidden": true
} satisfies Omit<ProjectDefinition, 'init' | 'controls' | 'actions' | 'container' | 'defaultTechnique' | 'sketches' | 'techniques'>

const CONTAINER = { mode: 'full' as const }
const TECHNIQUES = ['svg'] as const
const DEFAULT_TECHNIQUE = 'svg' as const
const CONTROLS: ProjectControlDefinition[] = []
const ACTIONS: ProjectActionDefinition[] = []


const SKETCHES: ProjectSketchDefinition[] = [
  {
    id: 'mascara-lines',
    label: 'Mascara Lines',
    technique: 'svg',
    container: { mode: '3:4' },
    module: './sketches/mascara-lines.js',
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
