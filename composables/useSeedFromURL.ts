import { createSeed } from '~/utils/generative'

export const useSeedFromURL = () => {
  const route = useRoute()
  const router = useRouter()

  const getCurrentSeed = (): string | null => {
    return (route.query.seed as string) || null
  }

  const setSeed = async (newSeed: string) => {
    await router.push({
      query: { ...route.query, seed: newSeed },
    })
  }

  const generateNewSeed = async () => {
    const newSeed = createSeed()

    // Preserve all current query params (including control values) when setting new seed
    await router.push({
      query: { ...route.query, seed: newSeed },
    })

    // Reload to apply new seed
    window.location.reload()
  }

  return {
    getCurrentSeed,
    setSeed,
    generateNewSeed,
  }
}
