export const jsonrpc = '2.0'

/**
 * Identifier for RPC requests.
 */
export type Id = string | number

/**
 * JSON-RPC request message.
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

export type ResponseMessage = ResultMessage | ErrorMessage

/**
 * Request payload (single message or batch).
 */
export type RequestPayload = RequestMessage | RequestMessage[]

/**
 * Response payload (single message or batch).
 */
export type ResponsePayload = ResponseMessage | ResponseMessage[]
