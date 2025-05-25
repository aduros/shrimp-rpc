/**
 * RPC-specific error class with code and optional data.
 *
 * @template T - Type of additional error data
 */
export class RPCError<T = unknown> extends Error {
  /**
   * Numeric error code for the RPC error.
   */
  code: number

  /**
   * Optional additional data associated with the error.
   */
  data?: T

  constructor(message: string, opts: { code?: number; data?: T }) {
    super(message)
    this.name = 'RPCError'
    this.code = opts.code ?? 0
    this.data = opts.data
  }
}
