import { RPCError } from './error'
import type { ErrorMessage, Message, Payload } from './jsonrpc'
import { jsonrpc } from './jsonrpc'
import type { Service } from './service'

/**
 * Server-side handler implementation for service methods.
 *
 * @template T - The service interface defining available methods
 */
export type Handler<T extends Service> = {
  [K in keyof T]: (
    params: Parameters<T[K]>[0],
  ) => Awaited<ReturnType<T[K]>> | Promise<Awaited<ReturnType<T[K]>>>
}

/**
 * RPC server interface.
 */
export type Server = {
  /**
   * Stops the server and cleans up resources.
   */
  stop(): void
}

/**
 * Processes incoming RPC requests and returns responses.
 *
 * @template T - The service interface defining available methods
 * @param payloadOrString - RPC payload or JSON string
 * @param handler - Handler object with method implementations
 * @returns Response payload or undefined for notifications
 */
export async function handle<T extends Service = never>(
  payloadOrString: Payload | string,
  handler: Handler<T>,
): Promise<Payload | undefined>

/**
 * Processes incoming RPC requests with context and returns responses.
 *
 * @template T - The service interface defining available methods
 * @template Context - Type of context passed to handler factory
 * @param payloadOrString - RPC payload or JSON string
 * @param handler - Handler object or factory function that receives context
 * @param context - Context object passed to handler factory
 * @returns Response payload or undefined for notifications
 */
export async function handle<T extends Service = never, Context = never>(
  payloadOrString: Payload | string,
  handler: Handler<T> | ((context: Context) => Handler<T>),
  context: Context,
): Promise<Payload | undefined>

export async function handle<T extends Service, Context>(
  payloadOrString: Payload | string,
  handler: Handler<T> | ((context: Context) => Handler<T>),
  context?: Context,
): Promise<Payload | undefined> {
  const invalidRequest: ErrorMessage = {
    jsonrpc,
    id: null,
    error: {
      code: -32600,
      message: 'Invalid Request',
    },
  }

  async function onMessage(message: Message): Promise<Message | undefined> {
    if (message?.jsonrpc !== '2.0') {
      return invalidRequest
    }

    if ('method' in message) {
      const handlerObj =
        typeof handler === 'function' ? handler(context!) : handler
      const fn = handlerObj[message.method]
      if (!fn) {
        return {
          jsonrpc,
          id: message.id ?? null,
          error: {
            code: -32601,
            message: 'Method not found',
          },
        }
      }

      try {
        const result = await fn.call(handlerObj, message.params)
        if (message.id != null) {
          return {
            jsonrpc,
            id: message.id,
            result,
          }
        }
      } catch (error) {
        if (message.id != null) {
          let errorMessage: string
          let errorCode = 0
          let errorData: unknown
          if (error instanceof Error) {
            errorMessage = error.message
            if (error instanceof RPCError) {
              errorCode = error.code
              errorData = error.data
            }
          } else {
            // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
            errorMessage = '' + error
          }
          return {
            jsonrpc,
            id: message.id,
            error: {
              message: errorMessage,
              code: errorCode,
              data: errorData,
            },
          }
        }
      }
    }
  }

  let payload: Payload
  if (typeof payloadOrString === 'string') {
    try {
      payload = JSON.parse(payloadOrString) as Payload
    } catch {
      return {
        jsonrpc,
        id: null,
        error: {
          code: -32700,
          message: 'Parse error',
        },
      }
    }
  } else {
    payload = payloadOrString
  }

  if (Array.isArray(payload)) {
    if (!payload.length) {
      return invalidRequest
    }
    const responseBatch = (await Promise.all(payload.map(onMessage))).filter(
      (responseMessage) => !!responseMessage,
    )
    if (responseBatch.length > 0) {
      return responseBatch
    }
  } else {
    return onMessage(payload)
  }
}
