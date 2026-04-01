import type {
  ProjectActionDefinition,
  ProjectControlDefinition,
  ProjectDefinition,
  ProjectSketchDefinition
} from '~/types/project'

const ANNI_LAYER_OPTIONS = [
  { label: 'Orange, Black and White (1926/27)', value: 'anni-1' }
] as const

const ANNI_DEFAULT_LAYER = 'anni-1' as const
const ANNI_CONTAINER = { mode: 'square' as const, padding: '3vmin' }
const ANNI_TECHNIQUES = ['svg'] as const
const ANNI_DEFAULT_TECHNIQUE = 'svg' as const

const ANNI_CONTROLS: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'anni-1',
    label: 'Composition Settings',
    collapsible: true,
    defaultOpen: false,
    visibleWhenSelectKey: 'activeSketch',
    visibleWhenSelectValue: 'anni-1',
    controls: [
      {
        type: 'slider',
        label: 'Rows',
        key: 'anni1_rows',
        default: 6,
        min: 1,
        max: 18,
        step: 1
      }
    ]
  }
]

const ANNI_ACTIONS: ProjectActionDefinition[] = [
  { key: 'download-svg', label: 'Download SVG' }
]

const ANNI_SKETCHES: ProjectSketchDefinition[] = [
  {
    id: 'anni-1',
    label: 'Orange, Black and White (1926/27)',
    technique: 'svg',
    container: { mode: '2:3', padding: '3vmin' },
    module: './sketches/anni1.js',
    defaultActive: true
  }
]

const metadata = {
  "id": "anni",
  "title": "Anni",
  "description": "Multi-sketch geometric sketch with toggleable Anni studies",
  "date": "2026-03",
  "tags": [
    "svg",
    "grid"
  ],
  "prefersTheme": "light",
  "hidden": false
} satisfies Omit<ProjectDefinition, 'init' | 'controls' | 'actions' | 'container' | 'defaultTechnique' | 'sketches' | 'techniques'>

const definition: ProjectDefinition = {
  ...metadata,
  techniques: [...ANNI_TECHNIQUES],
  defaultTechnique: ANNI_DEFAULT_TECHNIQUE,
  libraries: [],
  controls: ANNI_CONTROLS,
  actions: ANNI_ACTIONS,
  container: ANNI_CONTAINER,
  sketches: ANNI_SKETCHES
}

export default definition
