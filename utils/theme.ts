export interface ThemeTokens {
  background: string
  foreground: string
  annotation: string
  palette: string[]
}

export interface ThemeOverride {
  background?: string
  foreground?: string
  annotation?: string
  palette?: string[]
}

export const defaultTheme: ThemeTokens = {
  background: '#000000',
  foreground: '#00ff00',
  annotation: '#666666',
  palette: ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f']
}

export const resolveTheme = (override?: ThemeOverride): ThemeTokens => {
  if (!override) return defaultTheme

  return {
    background: override.background ?? defaultTheme.background,
    foreground: override.foreground ?? defaultTheme.foreground,
    annotation: override.annotation ?? defaultTheme.annotation,
    palette: override.palette?.length ? override.palette : defaultTheme.palette
  }
}
