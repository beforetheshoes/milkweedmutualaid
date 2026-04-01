import type { Config } from "@netlify/functions"

export default async () => {
  const hookUrl = process.env.NETLIFY_BUILD_HOOK_URL
  if (!hookUrl) {
    console.log("NETLIFY_BUILD_HOOK_URL not set, skipping rebuild")
    return new Response("No build hook configured", { status: 200 })
  }

  await fetch(hookUrl, { method: "POST" })
  console.log("Weekly rebuild triggered")
  return new Response("Rebuild triggered", { status: 200 })
}

export const config: Config = {
  schedule: "@weekly"
}
