import type { Client } from '../client'
import type { Payload } from '../jsonrpc'
import type { Handler, Server } from '../server'
import type { Service } from '../service'

import {
  createChannelClient,
  createChannelServer_ReplyToTarget,
} from './common'

/**
 * Creates a JSON-RPC client that communicates with a Web Worker.
 * Enables communication from the main thread to a worker thread.
 *
 * @template T - The service interface that defines available remote methods
 * @param worker - The Worker instance to communicate with
 * @returns A client instance that can call remote methods defined in T
 *
 * @example
 * ```typescript
 * const worker = new Worker('worker.js');
 * const client = createWorkerClient<MyService>(worker);
 * await client.call('add', { x: 1, y: 2 });
 * ```
 */
export const createWorkerClient: <T extends Service = never>(
  worker: Worker,
) => Client<T> = createChannelClient

/**
 * Creates a JSON-RPC server inside a Web Worker.
 * Listens for RPC calls from the main thread and responds with results.
 *
 * @template T - The service interface that defines the methods this server implements
 * @param worker - The Worker instance (typically 'self' when used inside a worker)
 * @param handler - Either a handler object implementing T's methods, or a function
 *                  that receives the MessageEvent and returns a handler
 * @returns A server instance that can be stopped
 *
 * @example
 * ```typescript
 * // Inside worker.js
 * const server = createWorkerServer(self, {
 *   add({ x, y }) { return x + y }
 * });
 * ```
 */
export const createWorkerServer = createChannelServer_ReplyToTarget as <
  T extends Service = never,
>(
  worker: Worker,
  handler: Handler<T> | ((event: MessageEvent<Payload>) => Handler<T>),
) => Server
