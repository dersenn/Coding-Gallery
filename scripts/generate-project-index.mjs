// Scan all project.config.ts files and regenerate data/projects.json from them.
// project.config.ts is the single source of truth for project metadata.
//
// Usage:
//   npm run generate:projects           — write data/projects.json
//   npm run generate:projects -- --dry-run  — preview output without writing

import { readFile, writeFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')
const PROJECTS_JSON_PATH = path.join(ROOT, 'data', 'projects.json')
const PROJECTS_DIR = path.join(ROOT, 'projects')

const dryRun = process.argv.includes('--dry-run')

// Same regex as validate-projects.mjs — requires a `const metadata = { ... }` block.
const parseMetadataFromConfig = (source, configRel) => {
  const match = source.match(
    /const\s+metadata\s*=\s*(\{[\s\S]*?\})\s*(?:satisfies[^\n]*)?\n/
  )
  if (!match) {
    throw new Error(
      `No \`const metadata = { ... }\` block found — add one following the project.config.ts convention`
    )
  }
  try {
    return JSON.parse(match[1])
  } catch (err) {
    throw new Error(`metadata block is not valid JSON: ${String(err)}`)
  }
}

async function findProjectConfigs(dir) {
  const results = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...await findProjectConfigs(full))
    } else if (entry.name === 'project.config.ts') {
      results.push(full)
    }
  }
  return results
}

const toRootRelative = (absPath) =>
  '/' + path.relative(ROOT, absPath).replace(/\\/g, '/')

const run = async () => {
  const configPaths = await findProjectConfigs(PROJECTS_DIR)
  const entries = []
  const skipped = []

  for (const configAbs of configPaths) {
    const projectDir = path.dirname(configAbs)
    const configRel = toRootRelative(configAbs)

    const source = await readFile(configAbs, 'utf8')
    let metadata
    try {
      metadata = parseMetadataFromConfig(source, configRel)
    } catch (err) {
      skipped.push(`${configRel}: ${err.message}`)
      continue
    }

    // Build the index entry.
    // Required fields first, optional fields only when present in metadata,
    // path pointers last.
    const entry = {
      id: metadata.id,
      title: metadata.title,
      description: metadata.description,
      date: metadata.date,
      tags: metadata.tags,
      hidden: metadata.hidden ?? false,
      ...(metadata.noControls !== undefined ? { noControls: metadata.noControls } : {}),
      ...(metadata.prefersTheme !== undefined ? { prefersTheme: metadata.prefersTheme } : {}),
      ...(metadata.github !== undefined ? { github: metadata.github } : {}),
      configFile: configRel
    }
    entries.push(entry)
  }

  // Sort: visible projects first, then hidden.
  // Within each group: date descending, then alphabetical by id for stable output.
  entries.sort((a, b) => {
    if (a.hidden !== b.hidden) return a.hidden ? 1 : -1
    const dateCmp = b.date.localeCompare(a.date)
    if (dateCmp !== 0) return dateCmp
    return a.id.localeCompare(b.id)
  })

  if (skipped.length > 0) {
    console.warn(`Skipped ${skipped.length} config(s) — add a \`const metadata\` block to include them:`)
    skipped.forEach((msg) => console.warn(`  - ${msg}`))
  }

  const output = JSON.stringify(entries, null, 2) + '\n'

  if (dryRun) {
    console.log('[dry-run] Would write data/projects.json:\n')
    console.log(output)
    console.log(`[dry-run] ${entries.length} entries, ${skipped.length} skipped`)
  } else {
    await writeFile(PROJECTS_JSON_PATH, output)
    console.log(`Generated ${entries.length} project entries → data/projects.json`)
    if (skipped.length > 0) {
      console.log(`Run \`npm run validate:projects\` to confirm the result.`)
    }
  }
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
