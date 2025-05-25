import type { Client } from '../client'
import type { Handler, Server } from '../server'
import type { Service } from '../service'

import { createSocketClient, createSocketServer } from './common'

/**
 * Creates a JSON-RPC client that communicates over a WebSocket connection.
 * Enables real-time bidirectional communication between client and server.
 *
 * @template T - The service interface that defines available remote methods
 * @param webSocket - The WebSocket instance to use for communication
 * @returns A client instance that can call remote methods defined in T
 *
 * @example
 * ```typescript
 * const ws = new WebSocket('ws://localhost:8080');
 * const client = createWebSocketClient<MyService>(ws);
 * await client.call('add', { x: 1, y: 2 });
 * ```
 */
export const createWebSocketClient: <T extends Service = never>(
  webSocket: WebSocket,
) => Client<T> = createSocketClient

/**
 * Creates a JSON-RPC server that communicates over a WebSocket connection.
 * Listens for RPC calls from clients and responds with results.
 *
 * @template T - The service interface that defines the methods this server implements
 * @param webSocket - The WebSocket instance to listen on
 * @param handler - Either a handler object implementing T's methods, or a function
 *                  that receives the MessageEvent and returns a handler
 * @returns A server instance that can be stopped
 *
 * @example
 * ```typescript
 * // Server-side WebSocket handling
 * wsServer.on('connection', (ws) => {
 *   const server = createWebSocketServer(ws, {
 *     add({ x, y }) { return x + y }
 *   });
 * });
 * ```
 */
export const createWebSocketServer = createSocketServer as <
  T extends Service = never,
>(
  webSocket: WebSocket,
  handler: Handler<T> | ((event: MessageEvent<string>) => Handler<T>),
) => Server
