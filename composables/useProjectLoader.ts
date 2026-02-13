import type { Project } from '~/types/project'
import projectsData from '~/data/projects.json'

export const useProjectLoader = () => {
  const projects = useState<Project[]>('projects', () => projectsData as Project[])
  const currentProject = useState<Project | null>('currentProject', () => null)

  const getProjectById = (id: string): Project | undefined => {
    return projects.value.find(p => p.id === id)
  }

  const getVisibleProjects = (): Project[] => {
    return projects.value.filter(p => !p.hidden)
  }

  const setCurrentProject = (project: Project | null) => {
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
