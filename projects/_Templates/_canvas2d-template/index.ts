import type { CleanupFunction, ProjectContext, ProjectControlDefinition, Vec } from '~/types/project'
import { Canvas, resolveContainer, shortcuts } from '~/types/project'
import { syncControlState } from '~/composables/useControls'

export const container = 'full'

export const controls: ProjectControlDefinition[] = [
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
        key: 'mark_count',
        default: 220,
        min: 20,
        max: 800,
        step: 10
      },
      {
        type: 'slider',
        label: 'Size',
        key: 'mark_size',
        default: 8,
        min: 1,
        max: 30,
        step: 1
      },
      {
        type: 'slider',
        label: 'Stroke Weight',
        key: 'stroke_weight',
        default: 1.5,
        min: 0.25,
        max: 6,
        step: 0.25
      },
      {
        type: 'toggle',
        label: 'Use Palette',
        key: 'use_palette',
        default: true
      }
    ]
  }
]

export async function init(
  containerEl: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, theme, onControlChange } = context
  const { v, rnd } = shortcuts(utils)
  const controlState = { ...controls }

  const { el, width, height } = resolveContainer(containerEl, container)
  const cv = new Canvas({
    parent: el,
    id: 'canvas2d-template',
    width,
    height,
    defaults: {
      background: theme.background,
      fill: theme.foreground,
      stroke: theme.foreground,
      text: theme.foreground
    }
  })

  const samplePositions = (count: number): Vec[] => {
    const marks: Vec[] = []
    for (let i = 0; i < count; i += 1) {
      marks.push(v(rnd() * cv.w, rnd() * cv.h))
    }
    return marks
  }

  const draw = () => {
    utils.seed.reset()
    cv.background()

    const count = controlState.mark_count as number
    const radius = controlState.mark_size as number
    const strokeWeight = controlState.stroke_weight as number
    const usePalette = controlState.use_palette as boolean
    const points = samplePositions(count)

    points.forEach((pt, index) => {
      const stroke = usePalette
        ? theme.palette[index % theme.palette.length] ?? theme.foreground
        : theme.foreground
      cv.circle(pt, radius, 'transparent', stroke, strokeWeight)
    })
  }

  const handleResize = () => {
    cv.resize(el.clientWidth, el.clientHeight)
    draw()
  }

  draw()
  window.addEventListener('resize', handleResize)

  onControlChange((nextControls) => {
    syncControlState(controlState, nextControls)
    draw()
  })

  return () => {
    window.removeEventListener('resize', handleResize)
    cv.el.remove()
  }
}
