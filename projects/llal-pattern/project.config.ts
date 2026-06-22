import type {
  ProjectActionDefinition,
  ProjectControlDefinition,
  ProjectDefinition,
  ProjectSketchDefinition
} from '~/types/project'
import { initFromProjectDefinition } from '~/runtime/projectBootstrap'

const LLAL_CONTROLS: ProjectControlDefinition[] = [
  {
    type: 'select',
    label: 'Layout',
    key: 'layoutMode',
    default: 'columns',
    options: [
      { label: 'Row based', value: 'rows' },
      { label: 'Column based', value: 'columns' }
    ]
  },
  {
    type: 'group',
    id: 'output',
    label: 'Output',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Width (mm)',
        key: 'outputWidth',
        default: 88*2,
        min: 10,
        max: 1000,
        step: 1
      },
      {
        type: 'slider',
        label: 'Height (mm)',
        key: 'outputHeight',
        default: 96*2,
        min: 10,
        max: 1000,
        step: 1
      }
    ]
  },
  {
    type: 'group',
    id: 'pattern',
    label: 'Pattern',
    collapsible: true,
    defaultOpen: true,
    randomize: true,
    controls: [
      {
        type: 'slider',
        label: 'Rows',
        key: 'rows',
        default: 12,
        min: 3,
        max: 30,
        step: 1,
        visibleWhenSelectKey: 'layoutMode',
        visibleWhenSelectValue: 'rows'
      },
      {
        type: 'slider',
        label: 'Bottom row size (% of top)',
        key: 'rowFontTaper',
        default: 100,
        min: 10,
        max: 100,
        step: 1,
        visibleWhenSelectKey: 'layoutMode',
        visibleWhenSelectValue: 'rows'
      },
      {
        type: 'slider',
        label: 'Columns',
        key: 'columns',
        default: 7,
        min: 2,
        max: 40,
        step: 1
      },
      {
        type: 'toggle',
        label: 'Alternate rows',
        key: 'alternateRows',
        default: false,
        visibleWhenSelectKey: 'layoutMode',
        visibleWhenSelectValue: 'columns'
      },
      {
        type: 'toggle',
        label: 'Square distribution',
        key: 'squareDistribution',
        default: false
      },
      {
        type: 'toggle',
        label: 'Blanks',
        key: 'useBlanks',
        default: true
      },
      {
        type: 'slider',
        label: 'Blank Probability',
        key: 'blanksProb',
        default: 50,
        min: 0,
        max: 100,
        step: 1,
        visibleWhenSelectKey: 'useBlanks',
        visibleWhenSelectValue: true
      },
      {
        type: 'toggle',
        label: 'Blanks increase per row',
        key: 'blanksIncreasePerRow',
        default: false,
        visibleWhenSelectKey: 'useBlanks',
        visibleWhenSelectValue: true
      },
      {
        type: 'slider',
        label: 'Bottom blank probability (%)',
        key: 'blanksBottomProb',
        default: 100,
        min: 0,
        max: 100,
        step: 1,
        visibleWhenSelectKey: 'blanksIncreasePerRow',
        visibleWhenSelectValue: true
      },
      {
        type: 'toggle',
        label: 'Turbulence Filter',
        key: 'useFilter',
        default: false
      }
    ]
  }
]

const SKETCHES: ProjectSketchDefinition[] = [
  {
    id: 'llal-pattern',
    label: 'LLAL Pattern',
    technique: 'svg',
    container: {
      print: { width: 420, height: 297, unit: 'mm', dpi: 300, bleed: 0, target: 'svg' },
      padding: '3vmin'
    },
    module: './sketches/llal-pattern.js',
    controls: LLAL_CONTROLS,
    actions: [
      { key: 'download-svg', label: 'Download SVG' },
      { key: 'download-svg-outlined', label: 'Download SVG (Outlined)' }
    ],
    defaultActive: true
  }
]

const metadata = {
  "id": "llal-pattern",
  "title": "LLAL Pattern",
  "description": "Variable-width LLAL letter columns with optional turbulence displacement",
  "date": "2026-06",
  "tags": [
    "svg",
    "typography",
    "variable-font"
  ],
  "prefersTheme": "light",
  "hidden": true
} satisfies Omit<ProjectDefinition, 'init' | 'controls' | 'actions' | 'container' | 'defaultTechnique' | 'sketches' | 'theme'>

const baseDefinition = {
  ...metadata,
  defaultTechnique: 'svg' as const,
  libraries: [],
  controls: [] as ProjectControlDefinition[],
  actions: [] as ProjectActionDefinition[],
  container: { mode: 'full' as const },
  sketches: SKETCHES,
  theme: {
    background: '#ffffff',
    foreground: '#000000'
  }
} satisfies Omit<ProjectDefinition, 'init'>

const definition: ProjectDefinition = {
  ...baseDefinition,
  async init(container, context) {
    const sketchModule = await import('./sketches/llal-pattern.js')
    const cleanup = await initFromProjectDefinition({
      definition: baseDefinition,
      container,
      context,
      loadSketchModule: async (sketch) => {
        if (sketch.id === 'llal-pattern') return sketchModule
        throw new Error(`Unknown sketch: ${sketch.id}`)
      }
    })
    context.registerAction('download-svg-outlined', () => {
      void sketchModule.exportOutlined(context.utils.seed.current)
    })
    return cleanup
  }
}

export default definition
