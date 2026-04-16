export interface ThemeTokens {
  background: string
  foreground: string
  annotation: string
  white: string
  black: string
  outline: string
  palette: string[]
}

export interface ThemeOverride {
  background?: string
  foreground?: string
  annotation?: string
  white?: string
  black?: string
  outline?: string
  palette?: string[]
}

export type ThemePreference = 'dark' | 'light'

export const defaultTheme: ThemeTokens = {
  background: '#000000',
  foreground: '#00ff00',
  annotation: '#666666',
  white: '#ffffff',
  black: '#000000',
  outline: '#ffffff',
  palette: ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f']
}

export const lightTheme: ThemeTokens = {
  background: '#f6f6f4',
  foreground: '#111111',
  annotation: '#6b7280',
  white: '#ffffff',
  black: '#000000',
  outline: '#111111',
  palette: ['#ad313a', '#38775b', '#214a93', '#ff580c', '#1d4ed8', '#5e1b93']
}

const tokensFromBase = (base: ThemeTokens): ThemeTokens => ({
  ...base,
  palette: [...base.palette]
})

export const resolveTheme = (
  override?: ThemeOverride,
  preference: ThemePreference = 'dark'
): ThemeTokens => {
  const baseTheme = preference === 'light' ? lightTheme : defaultTheme
  const base = tokensFromBase(baseTheme)
  if (!override) return base

  return {
    background: override.background ?? base.background,
    foreground: override.foreground ?? base.foreground,
    annotation: override.annotation ?? base.annotation,
    white: override.white ?? base.white,
    black: override.black ?? base.black,
    outline: override.outline ?? base.outline,
    palette: override.palette?.length ? [...override.palette] : base.palette
  }
}
