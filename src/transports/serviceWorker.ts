import type { Client } from '../client'
import { createClient } from '../client'
import type { Payload } from '../jsonrpc'
import type { Handler, Server } from '../server'
import { handle } from '../server'
import type { Service } from '../service'

/**
 * Creates a JSON-RPC client for communicating with a service worker.
 * Enables communication from a web page to its controlling service worker.
 *
 * @template T - The service interface that defines available remote methods
 * @returns A client instance that can call remote methods defined in T
 *
 * @example
 * ```typescript
 * // From main page to service worker
 * const client = createServiceWorkerClient<MyService>();
 * await client.call('add', { x: 1, y: 2 });
 * ```
 */
export function createServiceWorkerClient<
  T extends Service = never,
>(): Client<T> {
  return createClient((receive) => {
    function listener(event: MessageEvent<Payload>) {
      receive(event.data)
    }
    self.addEventListener('message', listener)
    return {
      send(payload) {
        navigator.serviceWorker.controller!.postMessage(payload)
      },
      stop() {
        self.removeEventListener('message', listener)
      },
    }
  })
}

/**
 * Creates a JSON-RPC server inside a service worker.
 * Listens for RPC calls from web pages and responds with results.
 *
 * @template T - The service interface that defines the methods this server implements
 * @param handler - A handler object implementing T's methods
 * @returns A server instance that can be stopped
 *
 * @example
 * ```typescript
 * // Inside service worker
 * const server = createServiceWorkerServer({
 *   add({ x, y }) { return x + y }
 * });
 * ```
 */
export function createServiceWorkerServer<T extends Service = never>(
  handler: Handler<T>,
): Server {
  function listener(event: MessageEvent<Payload>) {
    void handle(event.data, handler, event).then((reply) => {
      if (reply) {
        navigator.serviceWorker.controller!.postMessage(reply)
      }
    })
  }
  navigator.serviceWorker.addEventListener('message', listener)
  return {
    stop() {
      navigator.serviceWorker.removeEventListener('message', listener)
    },
  }
}
