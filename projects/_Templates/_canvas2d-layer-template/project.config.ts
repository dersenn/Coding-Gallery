import type {
  ProjectActionDefinition,
  ProjectControlDefinition,
  ProjectDefinition,
  ProjectLayerDefinition
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

const LAYERS: ProjectLayerDefinition[] = [
  {
    id: 'layer-1',
    label: 'Layer 1',
    technique: 'canvas2d',
    container: { mode: 'full' },
    module: './layers/layer-1.js',
    controls: CONTROLS,
    defaultActive: true
  }
]

const metadata = {
  "id": "canvas2d-layer-template",
  "title": "Canvas2D Layer Template",
  "description": "Canonical layer-based canvas2d template with RAF loop, pause support, and draw(context) pattern",
  "date": "2026-03",
  "tags": ["canvas2d", "template"],
  "hidden": true
} satisfies Omit<ProjectDefinition, "init" | "techniques" | "defaultTechnique" | "libraries" | "controls" | "actions" | "theme" | "container" | "supportedTechniques" | "layers">

const definition: ProjectDefinition = {
  ...metadata,
  techniques: ['canvas2d'],
  defaultTechnique: 'canvas2d',
  libraries: [],
  controls: CONTROLS,
  actions: ACTIONS,
  container: { mode: 'full' },
  layers: LAYERS
}

export default definition
