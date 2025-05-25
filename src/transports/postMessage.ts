import type { Client } from '../client'
import { createClient } from '../client'
import type { Payload } from '../jsonrpc'
import type { Handler, Server } from '../server'
import type { Service } from '../service'

import { createChannelServer_ReplyToSource } from './common'

/**
 * Creates a JSON-RPC client that communicates using window.postMessage.
 * Enables communication between different windows, iframes, or web workers
 * in a browser environment.
 *
 * @template T - The service interface that defines available remote methods
 * @param target - The target window to send messages to
 * @returns A client instance that can call remote methods defined in T
 *
 * @example
 * ```typescript
 * // From iframe to parent window
 * const client = createPostMessageClient<MyService>(window.parent);
 * await client.call('add', { x: 1, y: 2 });
 * ```
 */
export function createPostMessageClient<T extends Service = never>(
  target: Window,
): Client<T> {
  return createClient((receive) => {
    function listener(event: MessageEvent<Payload>) {
      receive(event.data)
    }
    self.addEventListener('message', listener)
    return {
      send(payload) {
        target.postMessage(payload, target.origin)
      },
      stop() {
        self.removeEventListener('message', listener)
      },
    }
  })
}

/**
 * Creates a JSON-RPC server that communicates using window.postMessage.
 * Listens for RPC calls from the specified source window and responds with results.
 *
 * @template T - The service interface that defines the methods this server implements
 * @param source - The source window to listen for messages from
 * @param handler - Either a handler object implementing T's methods, or a function
 *                  that receives the MessageEvent and returns a handler
 * @returns A server instance that can be stopped
 *
 * @example
 * ```typescript
 * // In parent window, listening to iframe
 * const server = createPostMessageServer(iframe.contentWindow, {
 *   add({ x, y }) { return x + y }
 * });
 * ```
 */
export const createPostMessageServer = createChannelServer_ReplyToSource as <
  T extends Service = never,
>(
  source: Window,
  handler: Handler<T> | ((event: MessageEvent<Payload>) => Handler<T>),
) => Server
