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
    // Generate a new random seed using the Hash class format
    const alphabet = '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
    const newHash =
      'oo' +
      Array(49)
        .fill(0)
        .map(() => alphabet[(Math.random() * alphabet.length) | 0])
        .join('')

    // Preserve all current query params (including control values) when setting new seed
    await router.push({
      query: { ...route.query, seed: newHash },
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
