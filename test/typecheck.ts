/* eslint-disable @typescript-eslint/no-unused-vars */

import { expectTypeOf } from 'expect-type'

import {
  createPostMessageClient,
  createPostMessageServer,
  type Service,
} from '../src'

type TestService = Service<{
  add(params: { x: number; y: number }): number

  addArray(params: [x: number, y: number]): number

  noParams(): { name: string }
}>

// @ts-expect-error Not a method
type NotAMethodError = Service<{ notAMethod: number }>

// @ts-expect-error Invalid params
type NotAMethodError2 = Service<{ invalidParams(x: number, y: number): void }>

const client = createPostMessageClient<TestService>(window)
client.stop()

void client.call('add', { x: 1, y: 2 })
void client.notify('add', { x: 1, y: 2 })

// @ts-expect-error Missing params field
void client.call('add', { x: 1 })

// @ts-expect-error Wrong params type
void client.call('add', [1, 2])

// @ts-expect-error Missing params
void client.call('add')

void client.call('noParams')

// @ts-expect-error Too many params
void client.call('noParams', undefined)

// @ts-expect-error Too many params
void client.call('add', { x: 1, y: 2 }, { x: 1, y: 2 })

// @ts-expect-error Not enough params in array
void client.call('addArray', [])

void client.call('addArray', [1, 2])

// @ts-expect-error Too many params
void client.call('addArray', [1, 2, 3])

// @ts-expect-error Too many params
void client.call('add', { x: 1, y: 2 }, { x: 1, y: 2 })

// @ts-expect-error Missing method
void client.call('noSuchMethod', {})

const server = createPostMessageServer<TestService>(window, {
  add({ x, y }) {
    expectTypeOf(x).toEqualTypeOf<number>()
    return x + y
  },

  addArray([x, y]) {
    expectTypeOf(x).toEqualTypeOf<number>()
    return x + y
  },

  noParams(params) {
    expectTypeOf(params).toEqualTypeOf<undefined>()
    return { name: 'test' }
  },

  // @ts-expect-error No such method
  noSuchMethod() {
    // Nothing
  },
})
server.stop()
