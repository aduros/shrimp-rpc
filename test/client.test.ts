import type { Payload, Service } from '../src'
import { RPCError, type Client } from '../src'
import { createClient } from '../src/client'

type TestService = Service<{
  add(params: { x: number; y: number }): number
  addArray(params: [x: number, y: number]): number
}>

let mockReceive!: (payload: Payload) => void
const mockSend = jest.fn()
const mockStop = jest.fn()

let mockClient: Client<TestService>
beforeEach(() => {
  jest.clearAllMocks()
  let nextId = 1
  crypto.randomUUID = jest.fn(() => `${nextId++}`) as typeof crypto.randomUUID
  mockClient = createClient<TestService>((receive) => {
    mockReceive = receive
    return {
      send: mockSend,
      stop: mockStop,
    }
  })
})

afterEach(() => {
  expect(mockStop).toHaveBeenCalledTimes(0)
  mockClient.stop()
  expect(mockStop).toHaveBeenCalledTimes(1)
})

test('handles notifications', () => {
  void mockClient.notify('add', { x: 1, y: 2 })

  expect(mockSend).toHaveBeenCalledTimes(1)
  expect(mockSend).toHaveBeenCalledWith({
    jsonrpc: '2.0',
    method: 'add',
    params: { x: 1, y: 2 },
  })
})

test('handles calls', async () => {
  const result1 = mockClient.call('add', { x: 1, y: 2 })
  const result2 = mockClient.call('add', { x: 3, y: 4 })

  expect(mockSend).toHaveBeenCalledTimes(2)
  expect(mockSend).toHaveBeenCalledWith({
    jsonrpc: '2.0',
    id: '1',
    method: 'add',
    params: { x: 1, y: 2 },
  })
  expect(mockSend).toHaveBeenCalledWith({
    jsonrpc: '2.0',
    id: '2',
    method: 'add',
    params: { x: 3, y: 4 },
  })

  mockReceive({
    jsonrpc: '2.0',
    id: '2',
    result: 7,
  })
  await expect(result2).resolves.toBe(7)

  mockReceive({
    jsonrpc: '2.0',
    id: '1',
    result: 3,
  })
  await expect(result1).resolves.toBe(3)
})

test('handles calls with errors', async () => {
  const result = mockClient.call('add', { x: 1, y: 2 })

  expect(mockSend).toHaveBeenCalledTimes(1)
  expect(mockSend).toHaveBeenCalledWith({
    jsonrpc: '2.0',
    id: '1',
    method: 'add',
    params: { x: 1, y: 2 },
  })

  mockReceive({
    jsonrpc: '2.0',
    id: '1',
    error: {
      code: 666,
      message: 'test error',
      data: {
        foo: 'bar',
      },
    },
  })

  await expect(result).rejects.toStrictEqual(
    new RPCError('test error', { code: 666, data: { foo: 'bar' } }),
  )
})

it('handles positional params', async () => {
  const result = mockClient.call('addArray', [10, 20])

  expect(mockSend).toHaveBeenCalledTimes(1)
  expect(mockSend).toHaveBeenCalledWith({
    jsonrpc: '2.0',
    id: '1',
    method: 'addArray',
    params: [10, 20],
  })

  mockReceive({
    jsonrpc: '2.0',
    id: '1',
    result: 30,
  })
  await expect(result).resolves.toBe(30)
})

it('handles batching', async () => {
  const batch = mockClient.createBatch()
  await batch.flush()
  expect(mockSend).toHaveBeenCalledTimes(0)

  await batch.notify('add', { x: 1, y: 2 })
  const result1 = batch.call('add', { x: 3, y: 4 })
  const result2 = batch.call('add', { x: 5, y: 6 })

  expect(mockSend).toHaveBeenCalledTimes(0)
  await batch.flush()
  expect(mockSend).toHaveBeenCalledTimes(1)
  expect(mockSend).toHaveBeenCalledWith([
    {
      jsonrpc: '2.0',
      method: 'add',
      params: { x: 1, y: 2 },
    },
    {
      jsonrpc: '2.0',
      id: '1',
      method: 'add',
      params: { x: 3, y: 4 },
    },
    {
      jsonrpc: '2.0',
      id: '2',
      method: 'add',
      params: { x: 5, y: 6 },
    },
  ])

  mockReceive([
    {
      jsonrpc: '2.0',
      id: '2',
      error: {
        code: 666,
        message: 'test error',
        data: {
          foo: 'bar',
        },
      },
    },
    {
      jsonrpc: '2.0',
      id: '1',
      result: 7,
    },
  ])
  await expect(result1).resolves.toBe(7)
  await expect(result2).rejects.toStrictEqual(
    new RPCError('test error', { code: 666, data: { foo: 'bar' } }),
  )
})
