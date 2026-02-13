import { createGalleryUtils, type GalleryUtils } from '~/utils/gallery'

// Create a singleton instance since utilities are stateless
// Don't use useState because functions can't be serialized for SSR
let galleryUtilsInstance: GalleryUtils | null = null

export const useGalleryUtils = () => {
  if (!galleryUtilsInstance) {
    galleryUtilsInstance = createGalleryUtils()
  }

  return {
    galleryUtils: galleryUtilsInstance,
  }
}
