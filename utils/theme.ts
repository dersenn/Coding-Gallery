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
  palette: ['#1d4ed8', '#9333ea', '#dc2626', '#ea580c', '#0f766e', '#4f46e5']
}

export const resolveTheme = (
  override?: ThemeOverride,
  preference: ThemePreference = 'dark'
): ThemeTokens => {
  const baseTheme = preference === 'light' ? lightTheme : defaultTheme
  if (!override) return baseTheme

  return {
    background: override.background ?? baseTheme.background,
    foreground: override.foreground ?? baseTheme.foreground,
    annotation: override.annotation ?? baseTheme.annotation,
    white: override.white ?? baseTheme.white,
    black: override.black ?? baseTheme.black,
    outline: override.outline ?? baseTheme.outline,
    palette: override.palette?.length ? override.palette : baseTheme.palette
  }
}
