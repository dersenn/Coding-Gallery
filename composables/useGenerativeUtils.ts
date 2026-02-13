import { createGenerativeUtils, type GenerativeUtils } from '~/utils/generative'

// Create a singleton instance since utilities are stateless
// Don't use useState because functions can't be serialized for SSR
let generativeUtilsInstance: GenerativeUtils | null = null

export const useGenerativeUtils = () => {
  const route = useRoute()
  
  if (!generativeUtilsInstance) {
    // Initialize with URL seed if present
    const urlSeed = route.query.seed as string | undefined
    generativeUtilsInstance = createGenerativeUtils(urlSeed)
  }

  return {
    utils: generativeUtilsInstance,
  }
}
