import type { Client } from '../client'
import type { Payload } from '../jsonrpc'
import type { Handler, Server } from '../server'
import type { Service } from '../service'

import {
  createChannelClient,
  createChannelServer_ReplyToSource,
} from './common'

/**
 * Creates a JSON-RPC client that communicates over a MessagePort.
 * Enables communication between different execution contexts that share
 * a MessageChannel (e.g., main thread and worker, iframe and parent).
 *
 * @template T - The service interface that defines available remote methods
 * @param messagePort - The MessagePort instance to use for communication
 * @returns A client instance that can call remote methods defined in T
 *
 * @example
 * ```typescript
 * const channel = new MessageChannel();
 * const client = createMessagePortClient<MyService>(channel.port1);
 * await client.call('add', { x: 1, y: 2 });
 * ```
 */
export const createMessagePortClient: <T extends Service = never>(
  messagePort: MessagePort,
) => Client<T> = createChannelClient

/**
 * Creates a JSON-RPC server that communicates over a MessagePort.
 * Listens for RPC calls from clients on the connected port and responds with results.
 *
 * @template T - The service interface that defines the methods this server implements
 * @param messagePort - The MessagePort instance to listen on
 * @param handler - Either a handler object implementing T's methods, or a function
 *                  that receives the MessageEvent and returns a handler
 * @returns A server instance that can be stopped
 *
 * @example
 * ```typescript
 * const channel = new MessageChannel();
 * const server = createMessagePortServer(channel.port2, {
 *   add({ x, y }) { return x + y }
 * });
 * ```
 */
export const createMessagePortServer = createChannelServer_ReplyToSource as <
  T extends Service = never,
>(
  messagePort: MessagePort,
  handler: Handler<T> | ((event: MessageEvent<Payload>) => Handler<T>),
) => Server
