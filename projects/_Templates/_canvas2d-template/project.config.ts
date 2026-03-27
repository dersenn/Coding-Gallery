import type { ProjectDefinition, ProjectModule } from "~/types/project"
import * as legacyModuleExports from "./index"

const legacyModule = legacyModuleExports as unknown as Partial<ProjectModule>

const metadata = {
  "id": "canvas2d-template",
  "title": "Canvas2D Template",
  "description": "Template",
  "date": "2026-03",
  "tags": [
    "canvas2d",
    "template"
  ],
  "hidden": true
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
