declare module '@tryghost/content-api' {
  export interface GhostBrowseOptions {
    filter?: string
    limit?: number | 'all'
    fields?: string
    include?: string
    formats?: string
    page?: number
    order?: string
  }

  export interface GhostApi<T = unknown> {
    browse<R = T>(options?: GhostBrowseOptions): Promise<R[]>
    read<R = T>(data: { id?: string; slug?: string }, options?: GhostBrowseOptions): Promise<R>
  }

  export interface GhostSettingsApi {
    browse(): Promise<Record<string, unknown>>
  }

  export default class GhostContentAPI {
    constructor(config: { url: string; key: string; version: string })
    posts: GhostApi
    pages: GhostApi
    tags: GhostApi
    authors: GhostApi
    settings: GhostSettingsApi
  }
}
