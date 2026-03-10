import type { ProjectIndexEntry } from '~/types/project'
import projectsData from '~/data/projects.json'

export const useProjectLoader = () => {
  const projects = useState<ProjectIndexEntry[]>('projects', () => projectsData as ProjectIndexEntry[])
  const currentProject = useState<ProjectIndexEntry | null>('currentProject', () => null)

  const getProjectById = (id: string): ProjectIndexEntry | undefined => {
    return projects.value.find(p => p.id === id)
  }

  const getVisibleProjects = (includeHidden: boolean = false): ProjectIndexEntry[] => {
    if (includeHidden) {
      return projects.value
    }

    return projects.value.filter(p => !p.hidden)
  }

  const setCurrentProject = (project: ProjectIndexEntry | null) => {
    currentProject.value = project
  }

  return {
    projects,
    currentProject,
    getProjectById,
    getVisibleProjects,
    setCurrentProject
  }
}
