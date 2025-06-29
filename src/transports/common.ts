import { type Client, createClient } from '../client'
import type { Payload } from '../jsonrpc'
import type { Handler, Server } from '../server'
import { handle } from '../server'
import type { Service } from '../service'

export type ChannelLike = {
  postMessage(payload: Payload): void
  addEventListener(
    event: 'message',
    listener: (event: MessageEvent<Payload>) => void,
  ): void
  removeEventListener(
    event: 'message',
    listener: (event: MessageEvent<Payload>) => void,
  ): void
}

export function createChannelClient(target: ChannelLike): Client<Service> {
  return createClient((receive) => {
    function listener(event: MessageEvent<Payload>) {
      receive(event.data)
    }
    target.addEventListener('message', listener)
    return {
      send(payload) {
        target.postMessage(payload)
      },
      stop() {
        target.removeEventListener('message', listener)
      },
    }
  })
}

export function createChannelServer_ReplyToSource<
  Target extends ChannelLike,
  T extends Service,
>(
  target: Target,
  handler: Handler<T> | ((event: MessageEvent<Payload>) => Handler<T>),
): Server {
  function listener(event: MessageEvent<Payload>) {
    void handle(event.data, handler, event).then((reply) => {
      if (reply) {
        event.source!.postMessage(reply, { targetOrigin: event.origin })
      }
    })
  }
  target.addEventListener('message', listener)
  return {
    stop() {
      target.removeEventListener('message', listener)
    },
  }
}

export function createChannelServer_ReplyToTarget<
  Target extends ChannelLike,
  T extends Service,
>(
  target: Target,
  handler: Handler<T> | ((event: MessageEvent<Payload>) => Handler<T>),
): Server {
  function listener(event: MessageEvent<Payload>) {
    void handle(event.data, handler, event).then((reply) => {
      if (reply) {
        target.postMessage(reply)
      }
    })
  }
  target.addEventListener('message', listener)
  return {
    stop() {
      target.removeEventListener('message', listener)
    },
  }
}

export type SocketLike = {
  send(json: string): void
  addEventListener(
    event: 'message',
    listener: (event: MessageEvent<string>) => void,
  ): void
  removeEventListener(
    event: 'message',
    listener: (event: MessageEvent<string>) => void,
  ): void
}

export function createSocketClient<T extends Service>(
  target: SocketLike,
): Client<T> {
  return createClient((receive) => {
    function listener(event: MessageEvent<string>) {
      receive(JSON.parse(event.data) as Payload)
    }
    target.addEventListener('message', listener)
    return {
      send(payload) {
        target.send(JSON.stringify(payload))
      },
      stop() {
        target.removeEventListener('message', listener)
      },
    }
  })
}

export function createSocketServer<
  Target extends SocketLike,
  T extends Service,
>(
  target: Target,
  handler: Handler<T> | ((event: MessageEvent<string>) => Handler<T>),
): Server {
  function listener(event: MessageEvent<string>) {
    void handle(event.data, handler, event).then((reply) => {
      if (reply) {
        target.send(JSON.stringify(reply))
      }
    })
  }
  target.addEventListener('message', listener)
  return {
    stop() {
      target.removeEventListener('message', listener)
    },
  }
}
