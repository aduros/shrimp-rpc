import { type Client, createClient } from '../client'
import type { Payload } from '../jsonrpc'
import type { Handler, Server } from '../server'
import { handle } from '../server'
import type { Service } from '../service'

/**
 * Creates a JSON-RPC client that communicates over Node.js streams.
 * Enables communication between Node.js processes using readable/writable streams.
 * Messages are sent as newline-delimited JSON.
 *
 * @template T - The service interface that defines available remote methods
 * @param input - The readable stream to receive messages from
 * @param output - The writable stream to send messages to
 * @returns A client instance that can call remote methods defined in T
 *
 * @example
 * ```typescript
 * import { spawn } from 'child_process';
 * const child = spawn('some-program');
 * const client = createNodeStreamClient<MyService>(child.stdout, child.stdin);
 * await client.call('add', { x: 1, y: 2 });
 * ```
 */
export function createNodeStreamClient<T extends Service>(
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
): Client<T> {
  return createClient((receive) => {
    let buffer = ''

    function handleData(chunk: string) {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        receive(JSON.parse(line) as Payload)
      }
    }

    input.on('data', handleData)

    return {
      send(payload) {
        output.write(JSON.stringify(payload) + '\n')
      },
      stop() {
        input.off('data', handleData)
      },
    }
  })
}

/**
 * Creates a JSON-RPC server that communicates over Node.js streams.
 * Listens for RPC calls from readable stream and responds via writable stream.
 * Messages are sent as newline-delimited JSON.
 *
 * @template T - The service interface that defines the methods this server implements
 * @param input - The readable stream to receive messages from
 * @param output - The writable stream to send responses to
 * @param handler - A handler object implementing T's methods
 * @returns A server instance that can be stopped
 *
 * @example
 * ```typescript
 * const server = createNodeStreamServer<MyService>(process.stdin, process.stdout, {
 *   add({ x, y }) { return x + y }
 * });
 * ```
 */
export function createNodeStreamServer<T extends Service>(
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
  handler: Handler<T>,
): Server {
  let buffer = ''

  function handleData(chunk: string) {
    buffer += chunk
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      void handle(line, handler).then((reply) => {
        if (reply) {
          output.write(JSON.stringify(reply) + '\n')
        }
      })
    }
  }

  input.on('data', handleData)

  return {
    stop() {
      input.off('data', handleData)
    },
  }
}
