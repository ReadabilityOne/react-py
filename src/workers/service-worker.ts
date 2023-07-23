// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

addEventListener('install', () => {
  self.skipWaiting()
})

addEventListener('activate', () => {
  self.clients.claim()
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const resolvers = new Map<string, Promise<any>[]>()

addEventListener('message', (event) => {
  if (event.data.type === 'INPUT') {
    const resolverArray = resolvers.get(event.data.id)
    if (!resolverArray || resolverArray.length === 0) {
      console.error('Error handing input: No resolver')
      return
    }

    const resolver = resolverArray.shift() // Take the first promise in the array
    resolver(new Response(event.data.value, { status: 200 }))
  }
})

addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  if (url.pathname === '/get_input/') {
    const id = url.searchParams.get('id')
    const prompt = url.searchParams.get('prompt')

    event.waitUntil(
      (async () => {
        // Send AWAITING_INPUT message to all window clients
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            if (client.type === 'window') {
              client.postMessage({
                type: 'AWAITING_INPUT',
                id,
                prompt
              })
            }
          })
        })

        // Does not match the window in Safari
        // This is likely due to the request originating from a web worker
        // if (!event.clientId) return
        // const client = await clients.get(event.clientId)
        // if (!client) return
        // client.postMessage({
        //   type: 'AWAITING_INPUT',
        //   id
        // })
      })()
    )

    const promise = new Promise((r) =>
      resolvers.set(id, [...(resolvers.get(id) || []), r])
    )
    event.respondWith(promise)
  }
})