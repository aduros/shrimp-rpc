import type { Client } from '../client'
import { createClient } from '../client'
import type { Service } from '../service'

/**
 * Creates a JSON-RPC client that communicates over HTTP using fetch.
 * Sends RPC calls as POST requests with JSON payloads to a remote endpoint.
 *
 * @template T - The service interface that defines available remote methods
 * @param url - The URL or URL object of the RPC endpoint
 * @param fetchOpts - Optional fetch configuration (headers, credentials, etc.)
 *                    Content-Type and Accept headers are automatically set to application/json
 * @returns A client instance that can call remote methods defined in T
 *
 * @example
 * ```typescript
 * const client = createFetchClient<MyService>('/myapi');
 * await client.call('add', { x: 1, y: 2 });
 * ```
 */
export function createFetchClient<T extends Service = never>(
  url: string | URL,
  fetchOpts?: RequestInit,
): Client<T> {
  const abortController = new AbortController()

  return createClient((receive) => ({
    async send(payload) {
      const res = await fetch(url, {
        method: 'POST',
        ...fetchOpts,

        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...fetchOpts?.headers,
        },

        body: JSON.stringify(payload),
        signal: abortController.signal,
      })

      if (res.status === 200) {
        void res.json().then(receive)
      }
    },

    stop() {
      abortController.abort()
    },
  }))
}
