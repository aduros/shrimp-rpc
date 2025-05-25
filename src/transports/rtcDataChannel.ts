import type { Client } from '../client'
import type { Handler, Server } from '../server'
import type { Service } from '../service'

import { createSocketClient, createSocketServer } from './common'

/**
 * Creates a JSON-RPC client that communicates over an RTCDataChannel.
 * Enables peer-to-peer communication between browsers using WebRTC data channels.
 *
 * @template T - The service interface that defines available remote methods
 * @param rtcDataChannel - The RTCDataChannel instance to use for communication
 * @returns A client instance that can call remote methods defined in T
 *
 * @example
 * ```typescript
 * const dataChannel = peerConnection.createDataChannel('rpc');
 * const client = createRTCDataChannelClient<MyService>(dataChannel);
 * await client.call('add', { x: 1, y: 2 });
 * ```
 */
export const createRTCDataChannelClient: <T extends Service = never>(
  rtcDataChannel: RTCDataChannel,
) => Client<T> = createSocketClient

/**
 * Creates a JSON-RPC server that communicates over an RTCDataChannel.
 * Listens for RPC calls from peer clients and responds with results.
 *
 * @template T - The service interface that defines the methods this server implements
 * @param rtcDataChannel - The RTCDataChannel instance to listen on
 * @param handler - Either a handler object implementing T's methods, or a function
 *                  that receives the MessageEvent and returns a handler
 * @returns A server instance that can be stopped
 *
 * @example
 * ```typescript
 * peerConnection.ondatachannel = (event) => {
 *   const server = createRTCDataChannelServer(event.channel, {
 *     add({ x, y }) { return x + y }
 *   });
 * };
 * ```
 */
export const createRTCDataChannelServer = createSocketServer as <
  T extends Service = never,
>(
  rtcDataChannel: RTCDataChannel,
  handler: Handler<T> | ((event: MessageEvent<string>) => Handler<T>),
) => Server
