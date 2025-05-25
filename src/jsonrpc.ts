export const jsonrpc = '2.0'

/**
 * Identifier for RPC requests.
 */
export type Id = string | number

/**
 * JSON-RPC request message structure.
 */
export type RequestMessage = {
  jsonrpc: typeof jsonrpc
  id?: Id | null

  method: string
  params?: Record<string, unknown> | unknown[]
}

/**
 * JSON-RPC success response message.
 */
export type ResultMessage = {
  jsonrpc: typeof jsonrpc
  id: Id

  result: unknown
}

/**
 * JSON-RPC error response message.
 */
export type ErrorMessage = {
  jsonrpc: typeof jsonrpc
  id: Id | null

  error: {
    code: number
    message: string
    data?: unknown
  }
}

/**
 * Union of all JSON-RPC message types.
 */
export type Message = RequestMessage | ResultMessage | ErrorMessage

/**
 * RPC payload (single message or batch).
 */
export type Payload = Message | Message[]
