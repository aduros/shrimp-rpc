import { type Client, createClient } from '../client'
import type { RequestPayload, ResponsePayload } from '../jsonrpc'
import type { Handler, Server } from '../server'
import { handleAndSendResponse } from '../server'
import type { Service } from '../service'

export type ChannelLike = {
  postMessage(payload: RequestPayload | ResponsePayload): void
  addEventListener(
    event: 'message',
    listener: (event: MessageEvent) => void,
  ): void
  removeEventListener(
    event: 'message',
    listener: (event: MessageEvent) => void,
  ): void
}

export function createChannelClient(target: ChannelLike): Client<Service> {
  return createClient((receive) => {
    function listener(event: MessageEvent<ResponsePayload>) {
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
  handler: Handler<T> | ((event: MessageEvent<RequestPayload>) => Handler<T>),
): Server {
  function listener(event: MessageEvent<RequestPayload>) {
    void handleAndSendResponse(event.data, handler, event, (response) => {
      event.source!.postMessage(response, { targetOrigin: event.origin })
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
  handler: Handler<T> | ((event: MessageEvent<RequestPayload>) => Handler<T>),
): Server {
  function listener(event: MessageEvent<RequestPayload>) {
    void handleAndSendResponse(event.data, handler, event, (response) => {
      target.postMessage(response)
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
      receive(JSON.parse(event.data) as ResponsePayload)
    }
    target.addEventListener('message', listener)
    return {
      send(request) {
        target.send(JSON.stringify(request))
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
    void handleAndSendResponse(event.data, handler, event, (response) => {
      target.send(JSON.stringify(response))
    })
  }
  target.addEventListener('message', listener)
  return {
    stop() {
      target.removeEventListener('message', listener)
    },
  }
}
