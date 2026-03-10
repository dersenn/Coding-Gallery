// Repo validation script namespace.
// Keep validation/migration automation under `scripts/` (for example, validate-* / migrate-*).
import { readFile, access } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const PROJECTS_JSON_PATH = path.join(ROOT, 'data', 'projects.json')
const ensureFileExists = async (targetPath, label) => {
  try {
    await access(targetPath, constants.F_OK)
  } catch {
    throw new Error(`${label} does not exist: ${targetPath}`)
  }
}

const parseMetadataJsonFromConfig = (source, configFile) => {
  const metadataMatch = source.match(
    /const\s+metadata\s*=\s*(\{[\s\S]*?\})\s*(?:satisfies[^\n]*)?\n/
  )
  if (!metadataMatch) {
    throw new Error(`Unable to parse metadata object from ${configFile}`)
  }
  try {
    return JSON.parse(metadataMatch[1])
  } catch (error) {
    throw new Error(`Invalid metadata JSON object in ${configFile}: ${String(error)}`)
  }
}

const validateProjectIndexEntry = async (project) => {
  if (typeof project?.id !== 'string' || project.id.length === 0) {
    throw new Error('Every project must include a non-empty id')
  }
  if (typeof project.configFile !== 'string' || !project.configFile.startsWith('/projects/')) {
    throw new Error(`Project "${project.id}" must use a configFile under /projects/...`)
  }
  if (!/\/project\.config\.ts$/.test(project.configFile)) {
    throw new Error(`Project "${project.id}" configFile must target project.config.ts`)
  }
  if (typeof project.entryFile !== 'string' || !project.entryFile.startsWith('/projects/')) {
    throw new Error(`Project "${project.id}" must keep canonical entryFile under /projects/...`)
  }
  if (!/\/index\.(ts|js)$/.test(project.entryFile)) {
    throw new Error(`Project "${project.id}" entryFile must target index.ts or index.js`)
  }

  const configAbs = path.join(ROOT, project.configFile)
  const entryAbs = path.join(ROOT, project.entryFile)
  await ensureFileExists(configAbs, `configFile for project "${project.id}"`)
  await ensureFileExists(entryAbs, `entryFile for project "${project.id}"`)
  const configSource = await readFile(configAbs, 'utf8')
  const configMetadata = parseMetadataJsonFromConfig(configSource, project.configFile)

  if (configMetadata.id !== project.id) {
    throw new Error(
      `Index/config drift for "${project.id}": config metadata id is "${configMetadata.id}"`
    )
  }
  const driftKeys = ['title', 'description', 'date', 'prefersTheme', 'noControls', 'github', 'hidden']
  for (const key of driftKeys) {
    if (project[key] !== configMetadata[key]) {
      throw new Error(
        `Index/config drift for "${project.id}" on key "${key}": index=${String(project[key])} config=${String(configMetadata[key])}`
      )
    }
  }
  if (JSON.stringify(project.tags) !== JSON.stringify(configMetadata.tags)) {
    throw new Error(`Index/config drift for "${project.id}" on key "tags"`)
  }

  const hasInit = /init:\s*legacyModule\.init|init:\s*\w+/.test(configSource)
  const hasLayers = /layers:\s*\w+|layers:\s*\[/.test(configSource)
  if (!hasInit && !hasLayers) {
    throw new Error(
      `Project config "${project.configFile}" must provide init or declarative layers in definition`
    )
  }
}

const run = async () => {
  const source = await readFile(PROJECTS_JSON_PATH, 'utf8')
  const projects = JSON.parse(source)

  if (!Array.isArray(projects)) {
    throw new Error('data/projects.json must be a flat array')
  }

  const seenProjectIds = new Set()
  for (const project of projects) {
    if (seenProjectIds.has(project.id)) {
      throw new Error(`Duplicate project id "${project.id}"`)
    }
    seenProjectIds.add(project.id)
    await validateProjectIndexEntry(project)
  }

  console.log(`Validated ${projects.length} project entries.`)
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
