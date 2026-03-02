export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const hiddenProjectsToken = config.hiddenProjectsToken
  const query = getQuery(event)
  const tokenFromQuery = Array.isArray(query.showHidden)
    ? query.showHidden[0]
    : query.showHidden

  const enabled = typeof tokenFromQuery === 'string'
    && hiddenProjectsToken.length > 0
    && tokenFromQuery === hiddenProjectsToken

  return { enabled }
})
