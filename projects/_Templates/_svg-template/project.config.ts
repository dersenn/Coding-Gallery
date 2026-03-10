import type { ProjectDefinition, ProjectModule } from "~/types/project"
import * as legacyModuleExports from "./index"

const legacyModule = legacyModuleExports as unknown as Partial<ProjectModule>

const metadata = {
  "id": "svg-template",
  "title": "SVG Template",
  "description": "SVG Template",
  "date": "2026-02",
  "tags": [
    "svg",
    "template"
  ],
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
