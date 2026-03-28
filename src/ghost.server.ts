import GhostContentAPI from '@tryghost/content-api'

let ghostServerInstance: GhostContentAPI | null = null

const isServerRuntime = typeof window === 'undefined'

function createGhostServer() {
  const url = process.env.GHOST_URL
  const key = process.env.GHOST_CONTENT_KEY

  if (!url || !key) {
    throw new Error('Missing Ghost environment variables: GHOST_URL and GHOST_CONTENT_KEY')
  }

  return new GhostContentAPI({
    url,
    key,
    version: 'v5.0'
  })
}

export function getGhostServer() {
  if (!isServerRuntime) {
    throw new Error('Ghost content API is only available during server-side rendering')
  }

  if (!ghostServerInstance) {
    ghostServerInstance = createGhostServer()
  }

  return ghostServerInstance
}
