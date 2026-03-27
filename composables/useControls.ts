import type {
  ControlDefinition,
  ControlGroupDefinition,
  ControlPrimitiveValue,
  ControlValue,
  ControlValues,
  ProjectControlDefinition
} from '~/types/project'

export const syncControlState = <T extends Record<string, ControlValue>>(
  state: T,
  incoming: ControlValues
) => {
  (Object.keys(state) as Array<keyof T>).forEach((key) => {
    const value = incoming[key as string]
    if (value !== undefined) {
      state[key] = value as T[typeof key]
    }
  })
}

const isControlGroup = (
  control: ProjectControlDefinition
): control is ControlGroupDefinition => control.type === 'group'

export const flattenControls = (
  controls?: ProjectControlDefinition[]
): ControlDefinition[] => {
  if (!controls) return []

  const flattened: ControlDefinition[] = []
  controls.forEach((control) => {
    if (isControlGroup(control)) {
      flattened.push(...control.controls)
      return
    }
    flattened.push(control)
  })

  return flattened
}

export const useControls = () => {
  const route = useRoute()
  const router = useRouter()
  const controlValues = useState<ControlValues>('controlValues', () => ({}))
  const scopedControlValues = useState<{
    shared: ControlValues
    sketches: Record<string, ControlValues>
  }>('scopedControlValues', () => ({
    shared: {},
    sketches: {}
  }))
  const scopedControlSchema = useState<{
    sharedControls: ProjectControlDefinition[]
    layerControlsById: Record<string, ProjectControlDefinition[]>
  }>('scopedControlSchema', () => ({
    sharedControls: [],
    layerControlsById: {}
  }))

  const normalizeQueryValues = (value: string | string[] | null | undefined): string[] => {
    if (value === undefined || value === null) return []
    if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string')
    if (value === '') return []
    if (value.includes(',')) {
      return value
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    }
    return [value]
  }

  const coerceScalarWithDefault = (sample: ControlPrimitiveValue, value: string): ControlPrimitiveValue => {
    if (typeof sample === 'number') {
      const parsed = Number.parseFloat(value)
      return Number.isFinite(parsed) ? parsed : sample
    }
    if (typeof sample === 'boolean') {
      return value === 'true'
    }
    return value
  }

  const parseControlValueFromQuery = (control: ControlDefinition, value: string | string[] | null | undefined): ControlValue => {
    if (control.type === 'checkbox-group' || control.type === 'color-list') {
      const values = normalizeQueryValues(value)
      if (!control.default.length) return values

      const sample = control.default[0]
      if (typeof sample === 'number') {
        return values
          .map((entry) => Number.parseFloat(entry))
          .filter((entry) => Number.isFinite(entry))
      }
      return values
    }

    const normalized = normalizeQueryValues(value)
    if (!normalized.length) return control.default
    return coerceScalarWithDefault(control.default as ControlPrimitiveValue, normalized[0]!)
  }

  const serializeControlValueForQuery = (value: ControlValue): string | string[] => {
    if (Array.isArray(value)) return value.map((entry) => String(entry))
    return String(value)
  }

  const buildControlValuesFromQuery = (controls: ControlDefinition[]): ControlValues => {
    const nextValues: ControlValues = {}
    controls.forEach((control) => {
      nextValues[control.key] = control.default
    })

    controls.forEach((control) => {
      const urlValue = route.query[control.key]
      if (urlValue !== undefined && urlValue !== null) {
        nextValues[control.key] = parseControlValueFromQuery(control, urlValue as string | string[] | null)
      }
    })

    return nextValues
  }

  const toLayerQueryKey = (sketchId: string, key: string) => {
    return `sketch.${sketchId}.${key}`
  }

  const resolveScopedActiveLayer = (fallbackLayerId?: string): string | undefined => {
    const sharedLayer = scopedControlValues.value.shared.activeSketch
    const direct = controlValues.value.activeSketch
    const layerIds = Object.keys(scopedControlSchema.value.layerControlsById ?? {})
    const hasLayerScope = layerIds.length > 0
    const isValidLayerId = (value: unknown): value is string => {
      if (typeof value !== 'string' || value.length === 0) return false
      if (!hasLayerScope) return true
      return layerIds.includes(value)
    }
    const resolved = isValidLayerId(sharedLayer)
      ? sharedLayer
      : (isValidLayerId(direct)
        ? direct
        : (isValidLayerId(fallbackLayerId) ? fallbackLayerId : layerIds[0]))
    return resolved
  }

  const buildScopedControlValuesFromQuery = (
    sharedControls: ControlDefinition[],
    layerControlsById: Record<string, ControlDefinition[]>
  ) => {
    const nextSharedValues: ControlValues = {}
    const nextLayerValues: Record<string, ControlValues> = {}

    sharedControls.forEach((control) => {
      nextSharedValues[control.key] = control.default
    })
    Object.entries(layerControlsById).forEach(([sketchId, controls]) => {
      const layerDefaults: ControlValues = {}
      controls.forEach((control) => {
        layerDefaults[control.key] = control.default
      })
      nextLayerValues[sketchId] = layerDefaults
    })

    sharedControls.forEach((control) => {
      const urlValue = route.query[control.key]
      if (urlValue === undefined || urlValue === null) return
      nextSharedValues[control.key] = parseControlValueFromQuery(control, urlValue as string | string[] | null)
    })

    Object.entries(layerControlsById).forEach(([sketchId, controls]) => {
      controls.forEach((control) => {
        const scopedKey = toLayerQueryKey(sketchId, control.key)
        const scopedValue = route.query[scopedKey]
        const legacyValue = route.query[control.key]
        const sourceValue = scopedValue ?? legacyValue
        if (sourceValue === undefined || sourceValue === null) return
        if (!nextLayerValues[sketchId]) {
          nextLayerValues[sketchId] = {}
        }
        nextLayerValues[sketchId]![control.key] = parseControlValueFromQuery(
          control,
          sourceValue as string | string[] | null
        )
      })
    })

    return {
      shared: nextSharedValues,
      sketches: nextLayerValues
    }
  }

  const mergeEffectiveControlValues = (activeSketchId?: string): ControlValues => {
    const mergedShared = { ...scopedControlValues.value.shared }
    const mergedLayer = activeSketchId
      ? (scopedControlValues.value.sketches[activeSketchId] ?? {})
      : {}
    return {
      ...mergedShared,
      ...mergedLayer,
      ...(activeSketchId ? { activeSketch: activeSketchId } : {})
    }
  }

  const applyEffectiveControlValues = (fallbackLayerId?: string) => {
    const activeSketchId = resolveScopedActiveLayer(fallbackLayerId)
    controlValues.value = mergeEffectiveControlValues(activeSketchId)
  }

  const flattenScopedSchema = () => {
    const sharedLeaf = flattenControls(scopedControlSchema.value.sharedControls)
    const layerLeafById: Record<string, ControlDefinition[]> = {}
    Object.entries(scopedControlSchema.value.layerControlsById).forEach(([sketchId, controls]) => {
      layerLeafById[sketchId] = flattenControls(controls)
    })
    return {
      sharedLeaf,
      layerLeafById
    }
  }

  const isSharedControlKey = (key: string) => {
    const { sharedLeaf } = flattenScopedSchema()
    return sharedLeaf.some((control) => control.key === key)
  }

  const resolveControlLayerScope = (key: string, activeSketchId?: string): string | null => {
    const { layerLeafById } = flattenScopedSchema()
    if (activeSketchId) {
      const activeSketchControls = layerLeafById[activeSketchId] ?? []
      if (activeSketchControls.some((control) => control.key === key)) {
        return activeSketchId
      }
    }
    const anyLayerEntry = Object.entries(layerLeafById).find(([, controls]) => {
      return controls.some((control) => control.key === key)
    })
    return anyLayerEntry?.[0] ?? null
  }

  const initializeControls = (controls?: ProjectControlDefinition[]) => {
    const nextControls = controls ?? []
    scopedControlSchema.value = {
      sharedControls: nextControls,
      layerControlsById: {}
    }
    const leafControls = flattenControls(nextControls)
    if (!leafControls.length) {
      scopedControlValues.value = { shared: {}, sketches: {} }
      controlValues.value = {}
      return
    }
    scopedControlValues.value = {
      shared: buildControlValuesFromQuery(leafControls),
      sketches: {}
    }
    applyEffectiveControlValues()
  }

  const initializeScopedControls = (
    scopedControls: {
      sharedControls: ProjectControlDefinition[]
      layerControlsById: Record<string, ProjectControlDefinition[]>
    },
    options?: { activeSketchId?: string }
  ) => {
    scopedControlSchema.value = {
      sharedControls: scopedControls.sharedControls ?? [],
      layerControlsById: scopedControls.layerControlsById ?? {}
    }

    const { sharedLeaf, layerLeafById } = flattenScopedSchema()
    if (!sharedLeaf.length && Object.keys(layerLeafById).length === 0) {
      scopedControlValues.value = { shared: {}, sketches: {} }
      controlValues.value = {}
      return
    }

    scopedControlValues.value = buildScopedControlValuesFromQuery(sharedLeaf, layerLeafById)
    const resolvedActiveLayer = resolveScopedActiveLayer(options?.activeSketchId)
    if (resolvedActiveLayer) {
      scopedControlValues.value.shared.activeSketch = resolvedActiveLayer
    }
    applyEffectiveControlValues(options?.activeSketchId)
  }

  type ControlHistoryMode = 'push' | 'replace'

  const syncQueryWithControl = (key: string, value: ControlValue, history: ControlHistoryMode) => {
    const activeSketchId = resolveScopedActiveLayer()
    const queryKey = isSharedControlKey(key)
      ? key
      : (activeSketchId ? toLayerQueryKey(activeSketchId, key) : key)
    const newQuery = { ...route.query, [queryKey]: serializeControlValueForQuery(value) }
    if (history === 'replace') {
      return router.replace({ query: newQuery })
    }
    return router.push({ query: newQuery })
  }

  const updateControl = (
    key: string,
    value: ControlValue,
    options?: { history?: ControlHistoryMode }
  ) => {
    const activeSketchId = resolveScopedActiveLayer()
    const nextActiveLayerId = key === 'activeSketch' && typeof value === 'string'
      ? value
      : activeSketchId
    if (key === 'activeSketch' || isSharedControlKey(key)) {
      scopedControlValues.value.shared[key] = value
    } else {
      const scopedLayerId = resolveControlLayerScope(key, activeSketchId)
      if (scopedLayerId) {
        if (!scopedControlValues.value.sketches[scopedLayerId]) {
          scopedControlValues.value.sketches[scopedLayerId] = {}
        }
        scopedControlValues.value.sketches[scopedLayerId]![key] = value
      } else {
        scopedControlValues.value.shared[key] = value
      }
    }
    applyEffectiveControlValues(nextActiveLayerId)

    // Persist to URL; default to push so browser back/forward can step controls.
    void syncQueryWithControl(key, value, options?.history ?? 'push')
  }

  const commitControl = (key: string) => {
    const value = controlValues.value[key]
    if (value === undefined) return
    void syncQueryWithControl(key, value, 'push')
  }

  const removeControlKeysFromQuery = async (keys: string[]) => {
    if (!keys.length) return
    const newQuery = { ...route.query }
    keys.forEach((key) => {
      delete newQuery[key]
    })
    await router.push({ query: newQuery })
  }

  const resetSketchControls = async (
    options?: { preserveKeys?: string[]; activeSketchId?: string }
  ) => {
    const hasLayerScopedControls = Object.keys(scopedControlSchema.value.layerControlsById).length > 0
    if (!hasLayerScopedControls) {
      const sharedControls = flattenControls(scopedControlSchema.value.sharedControls)
      if (!sharedControls.length) return
      const preserve = new Set(options?.preserveKeys ?? [])
      const keysToRemove = sharedControls
        .filter((control) => !preserve.has(control.key))
        .map((control) => control.key)
      await removeControlKeysFromQuery(keysToRemove)
      initializeScopedControls(scopedControlSchema.value)
      return
    }

    const activeSketchId = options?.activeSketchId ?? resolveScopedActiveLayer()
    if (!activeSketchId) return
    const layerControls = flattenControls(
      scopedControlSchema.value.layerControlsById[activeSketchId] ?? []
    )
    if (!layerControls.length) return

    const preserve = new Set(options?.preserveKeys ?? [])
    const keysToRemove: string[] = []
    layerControls.forEach((control) => {
      if (preserve.has(control.key)) return
      keysToRemove.push(toLayerQueryKey(activeSketchId, control.key))
      if (!isSharedControlKey(control.key)) {
        keysToRemove.push(control.key)
      }
    })

    await removeControlKeysFromQuery(keysToRemove)
    initializeScopedControls(scopedControlSchema.value, { activeSketchId })
  }

  const resetAllControls = async (options?: { preserveKeys?: string[] }) => {
    const preserve = new Set(options?.preserveKeys ?? [])
    const { sharedLeaf, layerLeafById } = flattenScopedSchema()
    const keysToRemove: string[] = []

    sharedLeaf.forEach((control) => {
      if (preserve.has(control.key)) return
      keysToRemove.push(control.key)
    })
    Object.entries(layerLeafById).forEach(([sketchId, controls]) => {
      controls.forEach((control) => {
        if (preserve.has(control.key)) return
        keysToRemove.push(toLayerQueryKey(sketchId, control.key))
        if (!isSharedControlKey(control.key)) {
          keysToRemove.push(control.key)
        }
      })
    })

    await removeControlKeysFromQuery(keysToRemove)
    initializeScopedControls(scopedControlSchema.value, {
      activeSketchId: resolveScopedActiveLayer()
    })
  }

  const resetControls = async (
    controls?: ProjectControlDefinition[],
    options?: { preserveKeys?: string[] }
  ) => {
    const leafControls = flattenControls(controls)
    if (!leafControls.length) return

    const preserveKeys = new Set(options?.preserveKeys ?? [])
    const hasLayerScopedControls = Object.keys(scopedControlSchema.value.layerControlsById).length > 0
    if (hasLayerScopedControls) {
      await resetSketchControls({
        preserveKeys: [...preserveKeys]
      })
      return
    }

    const keysToRemove: string[] = []
    leafControls.forEach((control) => {
      if (preserveKeys.has(control.key)) return
      keysToRemove.push(control.key)
    })
    await removeControlKeysFromQuery(keysToRemove)
    initializeControls(controls)
    preserveKeys.forEach((key) => {
      const preservedValue = route.query[key]
      if (preservedValue === undefined || preservedValue === null) return
      const targetControl = leafControls.find((control) => control.key === key)
      if (!targetControl) return
      controlValues.value[key] = parseControlValueFromQuery(
        targetControl,
        preservedValue as string | string[] | null
      )
    })
  }

  return {
    controlValues,
    initializeScopedControls,
    initializeControls,
    updateControl,
    commitControl,
    resetControls,
    resetSketchControls,
    resetAllControls
  }
}
