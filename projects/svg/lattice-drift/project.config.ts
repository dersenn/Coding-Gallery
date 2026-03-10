import type { ProjectDefinition, ProjectModule } from "~/types/project"
import * as legacyModuleExports from "./index"

const legacyModule = legacyModuleExports as unknown as Partial<ProjectModule>

const metadata = {
  "id": "lattice-drift",
  "title": "Lattice Drift",
  "description": "Warped lattice strand study migrated from mesh-01 with utility-driven subdivision controls",
  "date": "2024-07",
  "tags": [
    "svg",
    "legacy-migration",
    "grid",
    "subdivision",
    "spline"
  ],
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
