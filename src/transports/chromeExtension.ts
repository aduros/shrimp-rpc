import type { Client } from '../client'
import { createClient } from '../client'
import type { Payload } from '../jsonrpc'
import type { Handler, Server } from '../server'
import { handle } from '../server'
import type { Service } from '../service'

/**
 * Creates a JSON-RPC client for Chrome extension messaging.
 * Enables communication between different parts of a Chrome extension
 * (background scripts, content scripts, popup, etc.).
 *
 * @template T - The service interface that defines available remote methods
 * @param extensionId - Optional extension ID. If not provided, sends to the current extension
 * @returns A client instance that can call remote methods defined in T
 *
 * @example
 * ```typescript
 * // From popup to background script
 * const client = createChromeExtensionClient<MyService>();
 * await client.call('add', { x: 1, y: 2 });
 * ```
 */
export function createChromeExtensionClient<T extends Service = never>(
  extensionId?: string,
): Client<T> {
  return createClient((receive) => ({
    async send(payload) {
      const reply: Payload = await chrome.runtime.sendMessage(
        extensionId,
        payload,
      )
      if (reply) {
        receive(reply)
      }
    },
    stop() {
      // Nothing
    },
  }))
}

/**
 * Creates a JSON-RPC client for communicating with Chrome extension content scripts.
 * Enables communication from background scripts or other extension contexts
 * to content scripts running in specific tabs.
 *
 * @template T - The service interface that defines available remote methods
 * @param tabId - The ID of the tab containing the content script to communicate with
 * @returns A client instance that can call remote methods defined in T
 *
 * @example
 * ```typescript
 * // From background script to content script
 * const client = createChromeExtensionContentScriptClient<MyService>(123);
 * await client.call('add', { x: 1, y: 2 });
 * ```
 */
export function createChromeExtensionContentScriptClient<
  T extends Service = never,
>(tabId: number): Client<T> {
  return createClient((receive) => ({
    async send(payload) {
      const reply: Payload = await chrome.tabs.sendMessage(tabId, payload)
      if (reply) {
        receive(reply)
      }
    },
    stop() {
      // Nothing
    },
  }))
}

/**
 * Creates a JSON-RPC server for Chrome extension messaging.
 * Listens for RPC calls from other extension contexts and responds with results.
 *
 * @template T - The service interface that defines the methods this server implements
 * @param onMessage - The Chrome extension message event to listen on
 *                    (e.g., chrome.runtime.onMessage)
 * @param handler - Either a handler object implementing T's methods, or a function
 *                  that receives the sender info and returns a handler
 * @returns A server instance that can be stopped
 *
 * @example
 * ```typescript
 * // In background script
 * const server = createChromeExtensionServer(chrome.runtime.onMessage, {
 *   add({ x, y }) { return x + y }
 * });
 * ```
 */
export function createChromeExtensionServer<T extends Service = never>(
  onMessage: chrome.runtime.ExtensionMessageEvent,
  handler: Handler<T> | ((sender: chrome.runtime.MessageSender) => Handler<T>),
): Server {
  function listener(
    payload: Payload,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: Payload | undefined) => void,
  ) {
    void handle(payload, handler, sender).then(sendResponse)
    return true
  }
  onMessage.addListener(listener)
  return {
    stop() {
      onMessage.removeListener(listener)
    },
  }
}
