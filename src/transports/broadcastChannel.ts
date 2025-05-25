import type { Client } from '../client'
import type { Payload } from '../jsonrpc'
import type { Handler, Server } from '../server'
import type { Service } from '../service'

import {
  createChannelClient,
  createChannelServer_ReplyToTarget,
} from './common'

/**
 * Creates a JSON-RPC client that communicates over a BroadcastChannel.
 * Enables communication between different browser contexts (tabs, windows, workers)
 * that share the same channel name.
 *
 * @template T - The service interface that defines available remote methods
 * @param broadcastChannel - The BroadcastChannel instance to use for communication
 * @returns A client instance that can call remote methods defined in T
 *
 * @example
 * ```typescript
 * const channel = new BroadcastChannel('my-rpc');
 * const client = createBroadcastChannelClient<MyService>(channel);
 * await client.call('add', { x: 1, y: 2 });
 * ```
 */
export const createBroadcastChannelClient: <T extends Service = never>(
  broadcastChannel: BroadcastChannel,
) => Client<T> = createChannelClient

/**
 * Creates a JSON-RPC server that communicates over a BroadcastChannel.
 * Listens for RPC calls from clients on the same channel and responds with results.
 *
 * @template T - The service interface that defines the methods this server implements
 * @param broadcastChannel - The BroadcastChannel instance to listen on
 * @param handler - Either a handler object implementing T's methods, or a function
 *                  that receives the MessageEvent and returns a handler
 * @returns A server instance that can be stopped
 *
 * @example
 * ```typescript
 * const channel = new BroadcastChannel('my-rpc');
 * const server = createBroadcastChannelServer(channel, {
 *   add({ x, y }) { return x + y }
 * });
 * ```
 */
export const createBroadcastChannelServer =
  createChannelServer_ReplyToTarget as <T extends Service = never>(
    broadcastChannel: BroadcastChannel,
    handler: Handler<T> | ((event: MessageEvent<Payload>) => Handler<T>),
  ) => Server
