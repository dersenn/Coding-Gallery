import type { Project } from '~/types/project'
import projectsData from '~/data/projects.json'

export const useProjectLoader = () => {
  const projects = useState<Project[]>('projects', () => projectsData as Project[])
  const currentProject = useState<Project | null>('currentProject', () => null)
  const isLoading = useState('isLoading', () => false)
  const loadedLibraries = useState<Set<string>>('loadedLibraries', () => new Set())

  const libraryPaths: Record<string, string> = {
    'p5': '/libs/p5.min.js',
    'simplex-noise': '/libs/simplex-noise.js'
  }

  const loadLibrary = (libraryName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (loadedLibraries.value.has(libraryName)) {
        resolve()
        return
      }

      const path = libraryPaths[libraryName]
      if (!path) {
        console.warn(`Library path not found for: ${libraryName}`)
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = path
      script.async = true
      script.onload = () => {
        loadedLibraries.value.add(libraryName)
        resolve()
      }
      script.onerror = () => {
        console.error(`Failed to load library: ${libraryName}`)
        reject(new Error(`Failed to load ${libraryName}`))
      }
      document.head.appendChild(script)
    })
  }

  const loadProject = async (projectId: string) => {
    isLoading.value = true
    
    const project = projects.value.find(p => p.id === projectId)
    if (!project) {
      console.error(`Project not found: ${projectId}`)
      isLoading.value = false
      return
    }

    try {
      // Load required libraries
      if (project.libraries && project.libraries.length > 0) {
        await Promise.all(project.libraries.map(lib => loadLibrary(lib)))
      }

      currentProject.value = project
    } catch (error) {
      console.error('Error loading project:', error)
    } finally {
      isLoading.value = false
    }
  }

  const getProjectById = (id: string): Project | undefined => {
    return projects.value.find(p => p.id === id)
  }

  return {
    projects,
    currentProject,
    isLoading,
    loadProject,
    getProjectById
  }
}
