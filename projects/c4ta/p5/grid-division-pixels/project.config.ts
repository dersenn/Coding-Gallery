import type { ProjectDefinition, ProjectModule } from "~/types/project"
import * as legacyModuleExports from "./index"

const legacyModule = legacyModuleExports as unknown as Partial<ProjectModule>

const metadata = {
  "id": "grid-division-pixels",
  "title": "Grid Division Pixels",
  "description": "Recursive grid pixel divisions with moving container, mapped to theme palette",
  "date": "2021-10",
  "tags": [
    "p5js",
    "legacy-migration",
    "grid",
    "recursion",
    "c4ta"
  ],
  "noControls": true,
  "hidden": false
} satisfies Omit<ProjectDefinition, "init" | "controls" | "actions" | "theme" | "container" | "supportedTechniques" | "defaultTechnique" | "layers">

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
  layers: legacyModule.layers
}

export default definition
