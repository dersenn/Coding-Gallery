import type {
  CleanupFunction,
  ControlDefinition,
  ControlValues,
  ProjectActionDefinition,
  ProjectContext,
  ProjectControlDefinition,
  ProjectDefinition
} from '~/types/project'
import { createPixelate } from '~/lib/pixelate'
import rutishauser from './images/e-rutishauser-1-2400.webp?url'
import dsf6071 from './images/dsf6071-2400.jpg?url'
import r001226 from './images/r001226-2400.jpg?url'

const IMAGES: Record<string, string> = {
  rutishauser,
  dsf6071,
  r001226
}

const CONTROLS: ProjectControlDefinition[] = [
  {
    type: 'select',
    label: 'Image',
    key: 'image',
    default: 'rutishauser',
    options: [
      { label: 'E. Rutishauser', value: 'rutishauser' },
      { label: '_DSF6071', value: 'dsf6071' },
      { label: '_R001226', value: 'r001226' }
    ]
  },
  {
    type: 'group',
    id: 'pixelation',
    label: 'Pixelation',
    collapsible: true,
    defaultOpen: true,
    controls: [
      { type: 'slider', label: 'Grain', key: 'grain', default: 2, min: 1, max: 64, step: 1 },
      { type: 'slider', label: 'Steps', key: 'steps', default: 12, min: 2, max: 24, step: 1 },
      {
        type: 'select',
        label: 'Easing',
        key: 'easing',
        default: 'log',
        options: [
          { label: 'Linear', value: 'linear' },
          { label: 'Quadratic', value: 'quadratic' },
          { label: 'Log', value: 'log' }
        ]
      },
      { type: 'slider', label: 'Interval (ms)', key: 'interval', default: 72, min: 16, max: 300, step: 1 }
    ]
  },
  {
    type: 'group',
    id: 'effects',
    label: 'Effects',
    collapsible: true,
    defaultOpen: true,
    controls: [
      { type: 'slider', label: 'Contrast', key: 'contrast', default: 1, min: 0, max: 3, step: 0.05 },
      { type: 'slider', label: 'Brightness', key: 'brightness', default: 0, min: -128, max: 128, step: 1 },
      { type: 'slider', label: 'Saturation', key: 'saturation', default: 1, min: 0, max: 3, step: 0.05 },
      {
        type: 'select',
        label: 'Duotone',
        key: 'duotone',
        default: 'off',
        options: [
          { label: 'Off', value: 'off' },
          { label: 'Colors', value: 'colors' },
          { label: 'Dominant', value: 'dominant' }
        ]
      },
      {
        type: 'color',
        label: 'Duotone A',
        key: 'duotoneA',
        default: '#1a1a2e',
        visibleWhenSelectKey: 'duotone',
        visibleWhenSelectValue: 'colors'
      },
      {
        type: 'color',
        label: 'Duotone B',
        key: 'duotoneB',
        default: '#eee4e1',
        visibleWhenSelectKey: 'duotone',
        visibleWhenSelectValue: 'colors'
      },
      { type: 'toggle', label: 'Posterize', key: 'posterize', default: false },
      {
        type: 'slider',
        label: 'Posterize Levels',
        key: 'posterizeLevels',
        default: 4,
        min: 2,
        max: 16,
        step: 1,
        visibleWhenSelectKey: 'posterize',
        visibleWhenSelectValue: true
      },
      { type: 'toggle', label: 'Threshold', key: 'threshold', default: false },
      {
        type: 'slider',
        label: 'Threshold Value',
        key: 'thresholdValue',
        default: 128,
        min: 0,
        max: 255,
        step: 1,
        visibleWhenSelectKey: 'threshold',
        visibleWhenSelectValue: true
      },
      { type: 'toggle', label: 'Invert', key: 'invert', default: false },
      { type: 'slider', label: 'Effects at Clear', key: 'clearEffects', default: 0, min: 0, max: 1, step: 0.05 }
    ]
  }
]

const ACTIONS: ProjectActionDefinition[] = []

const CONTAINER = { mode: 'full' as const }

// Sliders/colours fire continuously while dragging; selects/toggles are discrete
const DEBOUNCE_MS = 150
const DEBOUNCED_TYPES = new Set<ControlDefinition['type']>(['slider', 'color'])
const CONTROL_TYPES = new Map<string, ControlDefinition['type']>(
  CONTROLS
    .flatMap((control) => (control.type === 'group' ? control.controls : [control]))
    .map((control) => [control.key, control.type])
)

type PixelateEffect = NonNullable<NonNullable<Parameters<typeof createPixelate>[1]>['effects']>[number]

// Same order as the playground: contrast, saturation, brightness, duotone, posterize, threshold, invert
const buildEffects = (c: ControlValues): PixelateEffect[] | null => {
  const effects: PixelateEffect[] = []
  if (c.contrast !== 1) effects.push({ type: 'contrast', value: Number(c.contrast) })
  if (c.saturation !== 1) effects.push({ type: 'saturation', value: Number(c.saturation) })
  if (c.brightness !== 0) effects.push({ type: 'brightness', value: Number(c.brightness) })
  if (c.duotone === 'colors') {
    effects.push({ type: 'duotone', colors: [String(c.duotoneA), String(c.duotoneB)] })
  } else if (c.duotone === 'dominant') {
    effects.push({ type: 'duotone', colors: ['dominant', 2] })
  }
  if (c.posterize) effects.push({ type: 'posterize', levels: Number(c.posterizeLevels) })
  if (c.threshold) effects.push({ type: 'threshold', value: Number(c.thresholdValue) })
  if (c.invert) effects.push({ type: 'invert' })
  return effects.length > 0 ? effects : null
}

const toOptions = (c: ControlValues) => ({
  src: IMAGES[String(c.image)] ?? IMAGES.rutishauser,
  grain: Number(c.grain),
  steps: Number(c.steps),
  easing: String(c.easing) as 'linear' | 'quadratic' | 'log',
  interval: Number(c.interval),
  effects: buildEffects(c),
  clearEffects: Number(c.clearEffects)
})

async function initPixelate(container: HTMLElement, context: ProjectContext): Promise<CleanupFunction> {
  const wrapper = document.createElement('div')
  Object.assign(wrapper.style, {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    padding: '6vmin',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  })
  const host = document.createElement('div')
  Object.assign(host.style, {
    width: '100%',
    height: '100%',
    minWidth: '0',
    minHeight: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  })
  wrapper.appendChild(host)
  container.appendChild(wrapper)

  let instance = createPixelate(host, toOptions(context.controls))
  let previous: ControlValues = { ...context.controls }
  let timer: ReturnType<typeof setTimeout> | undefined

  const recreate = (values: ControlValues) => {
    instance.destroy()
    instance = createPixelate(host, toOptions(values))
  }

  context.onControlChange((next) => {
    const changed = Object.keys(next).filter((key) => next[key] !== previous[key])
    previous = { ...next }
    if (changed.length === 0) return

    clearTimeout(timer)
    const snapshot = { ...next }
    const debounce = changed.every((key) => {
      const type = CONTROL_TYPES.get(key)
      return type !== undefined && DEBOUNCED_TYPES.has(type)
    })
    if (debounce) {
      timer = setTimeout(() => recreate(snapshot), DEBOUNCE_MS)
    } else {
      recreate(snapshot)
    }
  })

  return () => {
    clearTimeout(timer)
    instance.destroy()
    wrapper.remove()
  }
}

const metadata = {
  "id": "pixelate",
  "title": "Pixelate",
  "description": "Hover-reversible stepped pixelation with pre-pixelation effects",
  "date": "2026-10",
  "tags": [
    "dom",
    "image",
    "interaction"
  ],
  "prefersTheme": "light",
  "hidden": false
} satisfies Omit<ProjectDefinition, 'init' | 'controls' | 'actions' | 'container' | 'defaultTechnique' | 'sketches'>

const definition: ProjectDefinition = {
  ...metadata,
  libraries: [],
  controls: CONTROLS,
  actions: ACTIONS,
  container: CONTAINER,
  init: initPixelate
}

export default definition
