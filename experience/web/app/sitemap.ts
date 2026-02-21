import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://love.jrgochan.io',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    // Add additional public routes here as the application expands
  ]
}
