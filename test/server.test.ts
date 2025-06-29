import type { Handler, Message, Service } from '../src'
import { handle, RPCError } from '../src'

type TestService = Service<{
  add(param: { x: number; y: number }): number
  addAsync(param: { x: number; y: number }): number
  addArray(param: [x: number, y: number]): number

  throwsBasicError(): void
  throwsCustomError(): void

  throwsAsyncError(): void

  // Method with "rpc." prefix (should be reserved)
  'rpc.test'(): void
}>

const mockHandler: Handler<TestService> = {
  add: jest.fn(({ x, y }) => x + y),

  addAsync: jest.fn(({ x, y }) => Promise.resolve(x + y)),

  addArray: jest.fn(([x, y]) => x + y),

  throwsBasicError: jest.fn(() => {
    throw new Error('basic error')
  }),

  throwsCustomError: jest.fn(() => {
    throw new RPCError('custom error', { code: 123, data: { foo: 'bar' } })
  }),

  throwsAsyncError: jest.fn(() => {
    return Promise.reject(new Error('async error'))
  }),

  'rpc.test': jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('id handling', () => {
  it('handles string ids', async () => {
    const reply = await handle(
      {
        jsonrpc: '2.0',
        id: 'test-id',
        method: 'add',
        params: { x: 1, y: 2 },
      },
      mockHandler,
      undefined,
    )

    expect(reply).toStrictEqual({
      jsonrpc: '2.0',
      id: 'test-id',
      result: 3,
    })
  })

  it('handles numeric ids', async () => {
    const reply = await handle(
      {
        jsonrpc: '2.0',
        id: 123,
        method: 'add',
        params: { x: 1, y: 2 },
      },
      mockHandler,
      undefined,
    )

    expect(reply).toStrictEqual({
      jsonrpc: '2.0',
      id: 123,
      result: 3,
    })
  })

  it('handles null ids', async () => {
    const reply = await handle(
      {
        jsonrpc: '2.0',
        id: null,
        method: 'add',
        params: { x: 1, y: 2 },
      },
      mockHandler,
      undefined,
    )

    expect(reply).toBeUndefined()
  })

  it('handles fractional numeric ids', async () => {
    const reply = await handle(
      {
        jsonrpc: '2.0',
        id: 123.456,
        method: 'add',
        params: { x: 1, y: 2 },
      },
      mockHandler,
      undefined,
    )

    expect(reply).toStrictEqual({
      jsonrpc: '2.0',
      id: 123.456,
      result: 3,
    })
  })
})

it.skip('handles missing params', async () => {
  const reply = await handle(
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'add',
    },
    mockHandler,
    undefined,
  )

  expect(mockHandler.add).toHaveBeenCalledWith(undefined)
  expect(reply).toStrictEqual({
    jsonrpc: '2.0',
    id: 1,
    result: NaN,
  })
})

it('handles notifications', async () => {
  const reply = await handle(
    {
      jsonrpc: '2.0',
      method: 'add',
      params: { x: 1, y: 2 },
    },
    mockHandler,
  )

  expect(mockHandler.add).toHaveBeenCalledTimes(1)
  expect(mockHandler.add).toHaveBeenCalledWith({ x: 1, y: 2 })
  expect(reply).toBeUndefined()
})

it('handles calls', async () => {
  const reply = await handle(
    {
      jsonrpc: '2.0',
      id: 0,
      method: 'add',
      params: { x: 1, y: 2 },
    },
    mockHandler,
  )

  expect(mockHandler.add).toHaveBeenCalledTimes(1)
  expect(mockHandler.add).toHaveBeenCalledWith({ x: 1, y: 2 })
  expect(reply).toStrictEqual({
    jsonrpc: '2.0',
    id: 0,
    result: 3,
  })
})

it('handles async calls', async () => {
  const reply = await handle(
    {
      jsonrpc: '2.0',
      id: 0,
      method: 'addAsync',
      params: { x: 1, y: 2 },
    },
    mockHandler,
  )

  expect(mockHandler.addAsync).toHaveBeenCalledTimes(1)
  expect(mockHandler.addAsync).toHaveBeenCalledWith({ x: 1, y: 2 })
  expect(reply).toStrictEqual({
    jsonrpc: '2.0',
    id: 0,
    result: 3,
  })
})

it('supports array params (positional parameters)', async () => {
  await handle(
    {
      jsonrpc: '2.0',
      method: 'addArray',
      params: [10, 20],
    },
    mockHandler,
  )

  expect(mockHandler.addArray).toHaveBeenCalledTimes(1)
  expect(mockHandler.addArray).toHaveBeenCalledWith([10, 20])
})

describe('errors', () => {
  it('handles basic errors', async () => {
    const reply = await handle(
      {
        jsonrpc: '2.0',
        id: 0,
        method: 'throwsBasicError',
      },
      mockHandler,
      undefined,
    )

    expect(reply).toStrictEqual({
      jsonrpc: '2.0',
      id: 0,
      error: {
        code: 0,
        message: 'basic error',
        data: undefined,
      },
    })
  })

  it('handles async errors', async () => {
    const reply = await handle(
      {
        jsonrpc: '2.0',
        id: 0,
        method: 'throwsAsyncError',
      },
      mockHandler,
      undefined,
    )

    expect(reply).toStrictEqual({
      jsonrpc: '2.0',
      id: 0,
      error: {
        code: 0,
        message: 'async error',
        data: undefined,
      },
    })
  })

  it('handles custom errors', async () => {
    const reply = await handle(
      {
        jsonrpc: '2.0',
        id: 0,
        method: 'throwsCustomError',
      },
      mockHandler,
      undefined,
    )

    expect(reply).toStrictEqual({
      jsonrpc: '2.0',
      id: 0,
      error: {
        code: 123,
        message: 'custom error',
        data: {
          foo: 'bar',
        },
      },
    })
  })

  it('handles method not found error', async () => {
    const reply = await handle(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'nonExistentMethod',
      },
      mockHandler,
      undefined,
    )

    expect(reply).toStrictEqual({
      jsonrpc: '2.0',
      id: 1,
      error: {
        code: -32601,
        message: 'Method not found',
        data: {
          method: 'nonExistentMethod',
        },
      },
    })
  })

  it.skip('handles invalid params error', async () => {
    const reply = await handle(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'add',
        params: ['not', 'numbers'],
      },
      mockHandler,
      undefined,
    )

    expect(reply).toStrictEqual({
      jsonrpc: '2.0',
      id: 1,
      error: {
        code: -32602,
        message: 'Invalid params',
        data: undefined,
      },
    })
  })

  it('handles invalid request (missing method)', async () => {
    const reply = await handle(
      {
        jsonrpc: '2.0',
        id: 1,
        params: [1, 2],
      } as Message,
      mockHandler,
      undefined,
    )

    expect(reply).toBeUndefined()
  })

  it('handles parse errors for invalid JSON', async () => {
    const reply = await handle('this is not valid JSON', mockHandler, undefined)

    expect(reply).toStrictEqual({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error',
      },
    })
  })

  it.skip('rejects methods with rpc. prefix', async () => {
    const reply = await handle(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'rpc.test',
      },
      mockHandler,
      undefined,
    )

    expect(reply).toStrictEqual({
      jsonrpc: '2.0',
      id: 1,
      error: {
        code: -32601,
        message: 'Method not found',
        data: undefined,
      },
    })
    expect(mockHandler['rpc.test']).not.toHaveBeenCalled()
  })
})

describe('batching', () => {
  it('handles batch requests', async () => {
    const reply = await handle(
      [
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'add',
          params: { x: 1, y: 2 },
        },
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'add',
          params: { x: 3, y: 4 },
        },
      ],
      mockHandler,
      undefined,
    )

    expect(reply).toStrictEqual([
      {
        jsonrpc: '2.0',
        id: 1,
        result: 3,
      },
      {
        jsonrpc: '2.0',
        id: 2,
        result: 7,
      },
    ])
  })

  it('handles mixed batch with notifications and calls', async () => {
    const reply = await handle(
      [
        {
          jsonrpc: '2.0',
          method: 'add',
          params: { x: 1, y: 2 },
        },
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'add',
          params: { x: 3, y: 4 },
        },
      ],
      mockHandler,
      undefined,
    )

    expect(reply).toStrictEqual([
      {
        jsonrpc: '2.0',
        id: 2,
        result: 7,
      },
    ])
  })

  it('handles batch with errors', async () => {
    const reply = await handle(
      [
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'throwsBasicError',
        },
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'add',
          params: { x: 3, y: 4 },
        },
      ],
      mockHandler,
      undefined,
    )

    expect(reply).toStrictEqual([
      {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: 0,
          message: 'basic error',
          data: undefined,
        },
      },
      {
        jsonrpc: '2.0',
        id: 2,
        result: 7,
      },
    ])
  })

  it('returns undefined for batch with only notifications', async () => {
    const reply = await handle(
      [
        {
          jsonrpc: '2.0',
          method: 'add',
          params: { x: 1, y: 2 },
        },
        {
          jsonrpc: '2.0',
          method: 'add',
          params: { x: 3, y: 4 },
        },
      ],
      mockHandler,
      undefined,
    )

    expect(reply).toBeUndefined()
  })

  it('handles empty batch requests', async () => {
    const reply = await handle([], mockHandler, undefined)

    expect(reply).toStrictEqual({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32600,
        message: 'Invalid Request',
      },
    })
  })

  it('handles invalid batch requests', async () => {
    const reply = await handle(
      [1, 2, 3] as unknown as Message[],
      mockHandler,
      undefined,
    )

    expect(reply).toStrictEqual([
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32600,
          message: 'Invalid Request',
        },
      },
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32600,
          message: 'Invalid Request',
        },
      },
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32600,
          message: 'Invalid Request',
        },
      },
    ])
  })
})
