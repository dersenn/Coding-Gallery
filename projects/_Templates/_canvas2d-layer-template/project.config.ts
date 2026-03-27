import type {
  ProjectActionDefinition,
  ProjectControlDefinition,
  ProjectDefinition,
  ProjectSketchDefinition
} from '~/types/project'

const CONTROLS: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'composition',
    label: 'Composition',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Count',
        key: 'count',
        default: 40,
        min: 5,
        max: 200,
        step: 1
      },
      {
        type: 'slider',
        label: 'Size',
        key: 'size',
        default: 6,
        min: 1,
        max: 40,
        step: 0.5
      }
    ]
  }
]

const ACTIONS: ProjectActionDefinition[] = []

const SKETCHES: ProjectSketchDefinition[] = [
  {
    id: 'sketch-1',
    label: 'Sketch 1',
    technique: 'canvas2d',
    container: { mode: 'full' },
    module: './sketches/sketch-1.js',
    controls: CONTROLS,
    defaultActive: true
  }
]

const metadata = {
  "id": "canvas2d-sketch-template",
  "title": "Canvas2D Sketch Template",
  "description": "Canonical sketch-based canvas2d template with RAF loop, pause support, and draw(context) pattern",
  "date": "2026-03",
  "tags": ["canvas2d", "template"],
  "hidden": true
} satisfies Omit<ProjectDefinition, "init" | "techniques" | "defaultTechnique" | "libraries" | "controls" | "actions" | "theme" | "container" | "supportedTechniques" | "sketches">

const definition: ProjectDefinition = {
  ...metadata,
  techniques: ['canvas2d'],
  defaultTechnique: 'canvas2d',
  libraries: [],
  controls: CONTROLS,
  actions: ACTIONS,
  container: { mode: 'full' },
  sketches: SKETCHES
}

export default definition
