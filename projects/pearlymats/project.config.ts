import type {
  ProjectActionDefinition,
  ProjectControlDefinition,
  ProjectDefinition,
  ProjectSketchDefinition
} from '~/types/project'
import {
  buildColorOptionLabels,
  normalizeColorList,
  type PaletteColorInput
} from '~/utils/color'
import { defaultTheme } from '~/utils/theme'

const CUSTOM_PALETTE_STORAGE_KEY = 'pearlymats:customPalette'
const FALLBACK_CUSTOM_PALETTE = ['#fdf2f8', '#ddd6fe', '#bfdbfe']
const STANDARD_PALETTE_KEY = 'standard'
const CUSTOM_PALETTE_KEY = 'custom'
const BEAD_PALETTE: PaletteColorInput[] = [
  { code: 'P96', name: 'Cranapple', hex: '#801922' },
  { code: 'P05', name: 'Red', hex: '#F01820' },
  { code: 'P38', name: 'Magenta', hex: '#F22A7B' },
  { code: 'P83', name: 'Pink', hex: '#E44892' },
  { code: 'P79', name: 'Light Pink', hex: '#F6B3DD' },
  { code: 'P33', name: 'Peach', hex: '#EEBAB2' },
  { code: 'P04', name: 'Orange', hex: '#ED6120' },
  { code: 'P179', name: 'Evergreen', hex: '#114938' },
  { code: 'P10', name: 'Dark Green', hex: '#1C753E' },
  { code: 'P61', name: 'Kiwi Lime', hex: '#6CBE13' },
  { code: 'P53', name: 'Pastel Green', hex: '#76C882' },
  { code: 'P97', name: 'Prickly Pear', hex: '#BDDA01' },
  { code: 'P03', name: 'Yellow', hex: '#ECD800' },
  { code: 'P57', name: 'Cheddar', hex: '#F1AA0C' },
  { code: 'P08', name: 'Dark Blue', hex: '#2B3F87' },
  { code: 'P09', name: 'Light Blue', hex: '#3370C0' },
  { code: 'P58', name: 'Toothpaste', hex: '#93C8D4' },
  { code: 'P62', name: 'Turquoise', hex: '#2B89C6' },
  { code: 'P81', name: 'Light Gray', hex: '#EEE3CF' },
  { code: 'P01', name: 'White', hex: '#F1F1F1' },
  { code: 'P02', name: 'Cream', hex: '#E0DEA9' },
  { code: 'P18', name: 'Black', hex: '#2E2F32' },
  { code: 'P92', name: 'Dark Grey', hex: '#4D5156' },
  { code: 'P17', name: 'Grey', hex: '#8A8D91' },
  { code: 'P21', name: 'Light Brown', hex: '#815D34' },
  { code: 'P12', name: 'Brown', hex: '#513931' },
  { code: 'P54', name: 'Pastel Lavender', hex: '#8A72C1' },
  { code: 'P07', name: 'Purple', hex: '#604089' }
]
const NAMED_PALETTES: Record<string, PaletteColorInput[]> = {
  pearl: ['#fdf2f8', '#ddd6fe', '#bfdbfe', '#a7f3d0', '#f5d0fe', '#fde68a'],
  neon: ['#ff006e', '#8338ec', '#3a86ff', '#00f5d4', '#ffbe0b', '#fb5607'],
  earth: ['#6b4226', '#a98467', '#d5bdaf', '#9c6644', '#7f5539', '#b08968'],
  beads: BEAD_PALETTE
}
const BUILTIN_PALETTE_SWATCHES_BY_PRESET: Record<string, string[]> = {
  [STANDARD_PALETTE_KEY]: normalizeColorList(defaultTheme.palette),
  ...Object.fromEntries(
    Object.entries(NAMED_PALETTES).map(([key, palette]) => [key, normalizeColorList(palette)])
  )
}
const BUILTIN_PALETTE_LABELS_BY_PRESET: Record<string, string[]> = {
  [STANDARD_PALETTE_KEY]: buildColorOptionLabels(defaultTheme.palette),
  ...Object.fromEntries(
    Object.entries(NAMED_PALETTES).map(([key, palette]) => [key, buildColorOptionLabels(palette)])
  )
}
const PALETTE_PRESET_OPTIONS = [
  { label: 'Standard', value: STANDARD_PALETTE_KEY },
  { label: 'Pearl', value: 'pearl' },
  { label: 'Neon', value: 'neon' },
  { label: 'Earth', value: 'earth' },
  { label: 'Beads', value: 'beads' },
  { label: 'Custom', value: CUSTOM_PALETTE_KEY }
]
const PALETTE_VISIBLE_COUNT_BY_PRESET: Record<string, number> = {
  [STANDARD_PALETTE_KEY]: BUILTIN_PALETTE_SWATCHES_BY_PRESET[STANDARD_PALETTE_KEY]!.length,
  pearl: BUILTIN_PALETTE_SWATCHES_BY_PRESET.pearl!.length,
  neon: BUILTIN_PALETTE_SWATCHES_BY_PRESET.neon!.length,
  earth: BUILTIN_PALETTE_SWATCHES_BY_PRESET.earth!.length,
  beads: BUILTIN_PALETTE_SWATCHES_BY_PRESET.beads!.length,
  [CUSTOM_PALETTE_KEY]: 0
}
const DEFAULT_SELECTED_COLOR_COUNT = 3
const getRandomPaletteIndices = (paletteSize: number, count: number): number[] => {
  const max = Math.max(0, Math.floor(paletteSize))
  const target = Math.min(Math.max(0, Math.floor(count)), max)
  const indices = Array.from({ length: max }, (_, index) => index)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j]!, indices[i]!]
  }
  return indices.slice(0, target).sort((a, b) => a - b)
}
const MAX_SELECTABLE_COLORS = Math.max(
  8,
  ...Object.values(PALETTE_VISIBLE_COUNT_BY_PRESET)
)
const DEFAULT_SELECTED_PALETTE_INDICES = getRandomPaletteIndices(
  PALETTE_VISIBLE_COUNT_BY_PRESET.beads ?? 0,
  DEFAULT_SELECTED_COLOR_COUNT
)
const readPersistedCustomPalette = (): string[] => {
  if (!import.meta.client) return [...FALLBACK_CUSTOM_PALETTE]
  try {
    const raw = localStorage.getItem(CUSTOM_PALETTE_STORAGE_KEY)
    if (!raw) return [...FALLBACK_CUSTOM_PALETTE]
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [...FALLBACK_CUSTOM_PALETTE]
    return normalizeColorList(parsed.map((entry) => String(entry)), FALLBACK_CUSTOM_PALETTE)
  } catch {
    return [...FALLBACK_CUSTOM_PALETTE]
  }
}
const DEFAULT_CUSTOM_PALETTE = readPersistedCustomPalette()

const PEARLYMATS_CONTROLS: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'color',
    label: 'Color',
    collapsible: true,
    defaultOpen: true,
    randomize: true,
    controls: [
      {
        type: 'select',
        label: 'Palette',
        key: 'palettePreset',
        default: 'beads',
        options: PALETTE_PRESET_OPTIONS
      },
      {
        type: 'checkbox-group',
        label: 'Palette Colors',
        key: 'selectedPaletteIndices',
        randomize: true,
        default: DEFAULT_SELECTED_PALETTE_INDICES,
        visibleCountFromSelectKey: 'palettePreset',
        visibleCountBySelectValue: PALETTE_VISIBLE_COUNT_BY_PRESET,
        visibleCountFromKey: 'customPalette',
        optionLabelsBySelectValue: BUILTIN_PALETTE_LABELS_BY_PRESET,
        optionLabelsFromKeyBySelectValue: {
          [CUSTOM_PALETTE_KEY]: 'customPalette'
        },
        optionSwatchesBySelectValue: BUILTIN_PALETTE_SWATCHES_BY_PRESET,
        optionSwatchesFromKeyBySelectValue: {
          [CUSTOM_PALETTE_KEY]: 'customPalette'
        },
        options: Array.from({ length: MAX_SELECTABLE_COLORS }, (_, index) => ({
          label: '#000000',
          value: index
        }))
      },
      {
        type: 'color-list',
        label: 'Custom Colors',
        key: 'customPalette',
        default: DEFAULT_CUSTOM_PALETTE,
        minItems: 1,
        maxItems: 8,
        visibleWhenSelectKey: 'palettePreset',
        visibleWhenSelectValue: CUSTOM_PALETTE_KEY
      }
    ]
  },
  {
    type: 'group',
    id: 'noise',
    label: 'Noise',
    collapsible: true,
    defaultOpen: false,
    controls: [
      {
        type: 'slider',
        label: 'Noise Scale',
        key: 'noiseScale',
        default: 9,
        min: 2,
        max: 80,
        step: 1
      },
      {
        type: 'slider',
        label: 'Stretch X',
        key: 'stretchX',
        default: 1.2,
        min: 0.2,
        max: 3,
        step: 0.15
      },
      {
        type: 'slider',
        label: 'Stretch Y',
        key: 'stretchY',
        default: 0.75,
        min: 0.2,
        max: 3,
        step: 0.15
      },
      {
        type: 'slider',
        label: 'Amplitude',
        key: 'amplitude',
        default: 1.5,
        min: 0.1,
        max: 2.0,
        step: 0.1
      },
      {
        type: 'slider',
        label: 'Octaves',
        key: 'octaves',
        default: 2,
        min: 1,
        max: 4,
        step: 1
      },
      {
        type: 'slider',
        label: 'Lacunarity',
        key: 'lacunarity',
        default: 2.4,
        min: 1.5,
        max: 3.0,
        step: 0.1
      },
      {
        type: 'slider',
        label: 'Persistence',
        key: 'persistence',
        default: 0.9,
        min: 0.1,
        max: 1.0,
        step: 0.1
      }
    ]
  },
  {
    type: 'group',
    id: 'grid',
    label: 'Grid',
    collapsible: true,
    defaultOpen: false,
    controls: [
      {
        type: 'slider',
        label: 'Grid Size',
        key: 'gridSize',
        default: 29,
        min: 10,
        max: 100,
        step: 1
      },
      {
        type: 'toggle',
        label: 'Show Grid',
        key: 'showGrid',
        default: false
      },
      {
        type: 'toggle',
        label: 'Circular Cutoff',
        key: 'circularCutoff',
        default: true
      },
      {
        type: 'slider',
        label: 'Inner Limit',
        key: 'innerLimit',
        default: 18,
        min: 1,
        max: 50,
        step: 1
      },
      {
        type: 'slider',
        label: 'Outer Limit',
        key: 'outerLimit',
        default: 21,
        min: 2,
        max: 50,
        step: 1
      }
    ]
  }
]

const SKETCHES: ProjectSketchDefinition[] = [
  {
    id: 'pearlymats',
    label: 'Pearly Mats',
    technique: 'svg',
    container: 'square',
    module: './sketches/pearlymats.js',
    controls: PEARLYMATS_CONTROLS,
    actions: [{ key: 'download-svg', label: 'Download SVG' }],
    defaultActive: true
  }
]

const CONTAINER = 'square' as const
const TECHNIQUES = ['svg'] as const
const DEFAULT_TECHNIQUE = 'svg' as const

const CONTROLS: ProjectControlDefinition[] = []
const ACTIONS: ProjectActionDefinition[] = []

const metadata = {
  "id": "pearlymats",
  "title": "Pearly Mats",
  "description": "Noise-based bead grid with circular cutoff and multi-preset palette system",
  "date": "2026-02",
  "tags": [
    "svg",
    "noise",
    "grid"
  ],
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
