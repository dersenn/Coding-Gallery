import { createGalleryUtils, type GalleryUtils } from '~/utils/gallery'

export const useGalleryUtils = () => {
  const galleryUtils = useState<GalleryUtils>('galleryUtils', () => createGalleryUtils())

  return {
    galleryUtils: galleryUtils.value,
  }
}
