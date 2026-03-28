export interface GhostTag {
  slug?: string | null
  name?: string | null
  description?: string | null
  feature_image?: string | null
  accent_color?: string | null
  url?: string | null
  count?: { posts?: number } | null
}

export interface GhostAuthor {
  name?: string | null
  slug?: string | null
  profile_image?: string | null
  cover_image?: string | null
  bio?: string | null
  website?: string | null
  location?: string | null
  facebook?: string | null
  twitter?: string | null
  url?: string | null
  count?: { posts?: number } | null
}

export interface GhostPostSummary {
  id: string
  title: string
  slug: string
  excerpt?: string | null
  custom_excerpt?: string | null
  feature_image?: string | null
  feature_image_alt?: string | null
  feature_image_caption?: string | null
  featured?: boolean | null
  visibility?: string | null
  published_at?: string | null
  reading_time?: number | null
  canonical_url?: string | null
  url?: string | null
  og_image?: string | null
  og_title?: string | null
  og_description?: string | null
  twitter_image?: string | null
  twitter_title?: string | null
  twitter_description?: string | null
  meta_title?: string | null
  meta_description?: string | null
  tags?: GhostTag[] | null
  authors?: GhostAuthor[] | null
  autoTranslated?: boolean
}

export interface GhostPostDetail extends GhostPostSummary {
  html?: string | null
  plaintext?: string | null
  originalSlug?: string
}

export type GhostPage = GhostPostDetail

export interface GhostNavItem {
  label: string
  url: string
}

export interface GhostSettings {
  title?: string | null
  description?: string | null
  logo?: string | null
  icon?: string | null
  accent_color?: string | null
  cover_image?: string | null
  facebook?: string | null
  twitter?: string | null
  lang?: string | null
  timezone?: string | null
  navigation?: GhostNavItem[] | null
  secondary_navigation?: GhostNavItem[] | null
  meta_title?: string | null
  meta_description?: string | null
  og_image?: string | null
  og_title?: string | null
  og_description?: string | null
  twitter_image?: string | null
  twitter_title?: string | null
  twitter_description?: string | null
  members_support_address?: string | null
  url?: string | null
}
