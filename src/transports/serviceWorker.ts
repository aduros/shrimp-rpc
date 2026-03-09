import type { Client } from '../client'
import { createClient } from '../client'
import type { RequestPayload, ResponsePayload } from '../jsonrpc'
import type { Handler, Server } from '../server'
import { handleAndSendResponse } from '../server'
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
    function listener(event: MessageEvent<ResponsePayload>) {
      receive(event.data)
    }
    self.addEventListener('message', listener)
    return {
      send(request) {
        navigator.serviceWorker.controller!.postMessage(request)
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
  function listener(event: MessageEvent<RequestPayload>) {
    void handleAndSendResponse(event.data, handler, event, (response) => {
      event.source!.postMessage(response)
    })
  }
  self.addEventListener('message', listener)
  return {
    stop() {
      self.removeEventListener('message', listener)
    },
  }
}
