import type {
  ProjectActionDefinition,
  ProjectControlDefinition,
  ProjectDefinition,
  ProjectSketchDefinition
} from '~/types/project'

const SKETCHES: ProjectSketchDefinition[] = [
  {
    id: 'voronoi',
    label: 'Voronoi',
    technique: 'svg',
    container: { mode: 'full' },
    module: './sketches/voronoi.js',
    actions: [{ key: 'download-svg', label: 'Download SVG' }],
    defaultActive: true,
  }
]

const CONTAINER = { mode: 'full' as const }
const TECHNIQUES = ['svg'] as const
const DEFAULT_TECHNIQUE = 'svg' as const

const CONTROLS: ProjectControlDefinition[] = []
const ACTIONS: ProjectActionDefinition[] = []

const metadata = {
  "id": "voronoi",
  "title": "Voronoi",
  "description": "Brute-force Delaunay triangulation study ported to framework SVG",
  "date": "2024-10",
  "tags": [
    "svg",
    "voronoi",
    "delaunay"
  ],
  "noControls": true,
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
