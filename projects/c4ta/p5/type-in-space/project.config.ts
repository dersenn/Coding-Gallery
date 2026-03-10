import type { ProjectDefinition, ProjectModule } from "~/types/project"
import * as legacyModuleExports from "./index"

const legacyModule = legacyModuleExports as unknown as Partial<ProjectModule>

const metadata = {
  "id": "type-in-space",
  "title": "Type In Space",
  "description": "WEBGL glyph point-chunks rendered at depth with orbiting camera (migrated from C4TA p5)",
  "date": "2022-02",
  "tags": [
    "p5js",
    "legacy-migration",
    "webgl",
    "3d",
    "typography",
    "c4ta"
  ],
  "noControls": true,
  "hidden": true
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
