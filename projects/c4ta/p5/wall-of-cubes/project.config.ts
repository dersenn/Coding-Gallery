import type { ProjectDefinition, ProjectModule } from "~/types/project"
import * as legacyModuleExports from "./index"

const legacyModule = legacyModuleExports as unknown as Partial<ProjectModule>

const metadata = {
  "id": "wall-of-cubes",
  "title": "Wall Of Cubes",
  "description": "WEBGL cube grid with noise-driven elevation and moving red/green point lights (migrated from C4TA p5)",
  "date": "2022-01",
  "tags": [
    "p5js",
    "legacy-migration",
    "webgl",
    "3d",
    "noise",
    "c4ta"
  ],
  "hidden": false
} satisfies Omit<ProjectDefinition, "init" | "controls" | "actions" | "theme" | "container" | "supportedTechniques" | "defaultTechnique" | "sketches">

const definition: ProjectDefinition = {
  ...metadata,
  techniques: legacyModule.supportedTechniques ?? [],
  defaultTechnique: legacyModule.defaultTechnique,
  libraries: [],
  init: legacyModule.init as ProjectDefinition["init"],
  controls: legacyModule.controls,
  actions: legacyModule.actions,
  theme: legacyModule.theme,
  container: legacyModule.container,
  supportedTechniques: legacyModule.supportedTechniques,
  sketches: legacyModule.sketches
}

export default definition
