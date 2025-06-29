import { RPCError } from './error'
import type { Message, Payload, RequestMessage } from './jsonrpc'
import { jsonrpc } from './jsonrpc'
import type { Service } from './service'

type StringKeyOf<T> = Extract<keyof T, string>

/**
 * RPC client interface for making calls to a service.
 *
 * @template T - The service interface defining available methods
 */
export type Client<T extends Service> = {
  /**
   * Makes an RPC call and waits for the result.
   *
   * @template K - The method name from the service
   * @param name - The method name to call
   * @param params - Parameters to pass to the method
   * @returns Promise that resolves to the method's return value
   */
  call<K extends StringKeyOf<T>>(
    name: K,
    ...params: Parameters<T[K]>
  ): Promise<ReturnType<T[K]>>

  /**
   * Sends a notification (fire-and-forget call with no response).
   *
   * @template K - The method name from the service
   * @param name - The method name to call
   * @param params - Parameters to pass to the method
   * @returns Promise that resolves when the outgoing notification has been sent.
   */
  notify<K extends StringKeyOf<T>>(
    name: K,
    ...params: Parameters<T[K]>
  ): Promise<void>

  /**
   * Creates a batch for grouping multiple calls together.
   *
   * @returns A new batch instance
   */
  createBatch(): Batch<T>

  /**
   * Stops the client and cleans up resources.
   */
  stop(): void
}

/**
 * Batched RPC operations for efficient bulk requests.
 *
 * @template T - The service interface defining available methods
 */
export type Batch<T extends Service> = Pick<Client<T>, 'call' | 'notify'> & {
  /**
   * Sends all batched calls and notifications at once.
   * Must be called to actually execute the batched operations.
   *
   * @returns Promise that resolves when the outgoing batch has been sent.
   */
  flush(): Promise<void>
}

/**
 * Transport layer abstraction for RPC communication.
 *
 * @param receive - Callback function to handle incoming payloads
 * @returns Object with send function and stop function
 */
export type Transport = (receive: (payload: Payload) => void) => {
  /**
   * Sends a payload on this transport.
   *
   * @returns Promise that resolves when the outgoing payload has been sent.
   */
  send: (payload: Payload) => void | Promise<void>

  /** Cleans up any listeners. */
  stop: () => void
}

/**
 * Creates an RPC client using the specified transport.
 *
 * @template T - The service interface defining available methods
 * @param transport - Transport layer for communication
 * @returns RPC client instance
 */
export function createClient<T extends Service>(
  transport: Transport,
): Client<T> {
  const pending = new Map<
    string | number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { resolve: (result: any) => void; reject: (error: Error) => void }
  >()

  function onMessage(message: Message) {
    if ('result' in message) {
      const id = message.id
      const result = message.result
      const request = pending.get(id)
      if (request) {
        pending.delete(id)
        request.resolve(result)
      }
    } else if ('error' in message) {
      const id = message.id
      if (id != null) {
        const error = message.error
        const request = pending.get(id)
        if (request) {
          pending.delete(id)
          request.reject(new RPCError(error.message, error))
        }
      }
    }
  }

  async function callImpl(
    method: RequestMessage['method'],
    params: RequestMessage['params'],
    send: (message: Message) => void | Promise<void>,
  ) {
    const id = crypto.randomUUID()

    const promise = new Promise<ReturnType<T[typeof method]>>(
      (resolve, reject) => {
        pending.set(id, {
          resolve,
          reject,
        })
      },
    )

    await send({
      jsonrpc,
      method,
      params,
      id,
    })

    return promise
  }

  async function notifyImpl(
    method: RequestMessage['method'],
    params: RequestMessage['params'],
    send: (message: Message) => void | Promise<void>,
  ) {
    await send({
      jsonrpc,
      method,
      params,
    })
  }

  // Called by the transport when a reply is received
  function receive(payload: Payload) {
    if (Array.isArray(payload)) {
      payload.forEach(onMessage)
    } else {
      onMessage(payload)
    }
  }

  const { send, stop } = transport(receive)

  return {
    call(method, params) {
      return callImpl(method, params, send)
    },

    notify(method, params) {
      return notifyImpl(method, params, send)
    },

    createBatch() {
      const batch: Message[] = []
      function addToBatch(message: Message) {
        batch.push(message)
      }

      return {
        call(method, params) {
          return callImpl(method, params, addToBatch)
        },

        notify(method, params) {
          return notifyImpl(method, params, addToBatch)
        },

        async flush() {
          if (batch.length) {
            const snapshot = batch.slice()
            batch.length = 0
            await send(snapshot)
          }
        },
      }
    },

    stop,
  }
}
