# 🦐 shrimp-rpc

`shrimp-rpc` is a small TypeScript library for implementing JSON-RPC clients and servers.

> Status: Alpha ⚡

## Features

- Tiny (<1 KB gzipped), zero dependencies.
- Fully type-safe with IDE completion.
- Simple and unopinionated API.
- Complete implementation of the [JSON-RPC 2.0 spec](https://www.jsonrpc.org/specification), including batching, notifications, error handling, and named/positional parameters.
- Batteries-included support for many different transports:
    * HTTP
    * WebSockets
    * The myriad different ways to do iframe messaging on the web: postMessage, MessagePort, BroadcastChannel
    * Web Worker and ServiceWorker
    * WebRTC data channels
    * NodeJS streams (like stdio)
    * Chrome Extension messaging
    * ...or easily write your custom transport

## Quickstart

Install:

```
npm install shrimp-rpc
```

Define your service:

```typescript
import { Service } from 'shrimp-rpc'

type MyService = Service<{
  add(params: { x: number, y: number }): number
}>
```

Implement a server. This example uses Express over HTTP, but Express is not required. The important bit is using `handle()` to handle the request and passing through the reply.

```typescript
import { handle } from 'shrimp-rpc'

app.post('/myapi', async (req, res) => {
  // Handle the request
  const reply = await handle<MyService>(req.body, {
    add({x, y}) {
      return x + y
    },
  })

  // Pass through the reply
  if (reply) {
    res.json(reply)
  } else {
    res.status(204).end()
  }
})
```

> [!Tip]
> Service methods can also be `async`

Implement a client:

```typescript
import { createFetchClient } from 'shrimp-rpc'

const client = createFetchClient<MyService>('/myapi')

const result = await client.call('add', { x: 1, y: 2 })
console.log(result) // 3
```

Besides HTTP, shrimp-rpc supports a huge number of non-HTTP transports out of the box. Take a look at the Examples section below and choose your own adventure.

## Advanced

### Notifications

JSON-RPC notifications are "fire-and-forget" requests that don't care about a response. Use `client.notify()` instead of `client.call()`:

```typescript
// This won't return a result or wait for completion
client.notify('logEvent', { event: 'user_login', userId: 123 })
```

### Batching

Batch multiple RPC requests together to reduce network overhead:

```typescript
const batch = client.createBatch()

const result1 = batch.call('add', { x: 1, y: 2 })
const result2 = batch.call('add', { x: 3, y: 4 })

// Send all pending requests at once
batch.flush()

// Wait for results
console.log(await result1) // 3
console.log(await result2) // 7
```

### Error Handling

Errors thrown by the server are propagated through to the client:

```typescript
// Server:
const handler: Handler<MyService> = {
  divide({ x, y }) {
    if (y === 0) {
      throw new Error('Division by zero')
    }
    return x / y
  }
}

// Client:
try {
  const result = await client.call('divide', { x: 10, y: 0 })
} catch (error) {
  if (error instanceof Error) {
    console.log(error.message) // "Division by zero"
  }
}
```

You can also use `RPCError` to include an error code and optional data:

```typescript
import { RPCError } from 'shrimp-rpc'

// Server:
const handler: Handler<MyService> = {
  divide({ x, y }) {
    if (y === 0) {
      throw new RPCError('Division by zero', { code: 666, data: 'extra data' })
    }
    return x / y
  }
}

// Client:
try {
  const result = await client.call('divide', { x: 10, y: 0 })
} catch (error) {
  if (error instanceof RPCError) {
    console.log(error.message) // "Division by zero"
    console.log(error.code)    // 666
    console.log(error.data)    // "extra data"
  }
}
```

### Named vs Positional Parameters

JSON-RPC supports both named (object) and positional (array) parameters:

```typescript
type MyService = Service<{
  // Named parameters (object)
  add(params: { x: number, y: number }): number

  // Positional parameters (array)
  multiply(params: [x: number, y: number]): number
}>

// Server implementation
const handler: Handler<MyService> = {
  add({ x, y }) {
    return x + y
  },

  multiply([x, y]) {
    return x * y
  }
}

// Client usage
await client.call('add', { x: 1, y: 2 })  // Named: { x: 1, y: 2 }
await client.call('multiply', [3, 4])     // Positional: [3, 4]
```


### Request Context

Servers can access request context (like the originating message or connection details) by providing a callback for the handler. This is useful for implementing authentication, logging, or accessing transport-specific information about the originating request.

```typescript
import { createPostMessageServer } from 'shrimp-rpc'

// Handler function that receives context and returns the actual handler
const server = createPostMessageServer<MyService>(window, (event: MessageEvent) => ({
  add({ x, y }) {
    // Access the originating MessageEvent for context
    console.log('Request from origin:', event.origin)
    console.log('Source window:', event.source)

    // The handler can use context information
    if (event.origin !== 'https://trusted-domain.com') {
      throw new Error('Unauthorized origin')
    }

    return x + y
  }
}))
```

## Examples

Here are just a few examples of easily implementing JSON-RPC over different transports.

### WebSocket

```typescript
import { createWebSocketClient, createWebSocketServer } from 'shrimp-rpc'

// Server setup (Node.js with 'ws' library)
import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ port: 8080 })

wss.on('connection', (ws) => {
  const server = createWebSocketServer<MyService>(ws, {
    add({ x, y }) {
      return x + y
    }
  })
})

// Client setup (browser)
const ws = new WebSocket('ws://localhost:8080')
const client = createWebSocketClient<MyService>(ws)

ws.onopen = async () => {
  const result = await client.call('add', { x: 1, y: 2 })
  console.log(result) // 3
}
```

You can attach both a server and a client to the same websocket for bidirectional communication.

### iframes

Call methods in another frame like this:

```typescript
import { createPostMessageClient, createPostMessageServer } from 'shrimp-rpc'

// Parent window
const iframe = document.getElementById('myIframe') as HTMLIFrameElement
const client = createPostMessageClient<MyService>(iframe.contentWindow!)

// Call methods in the iframe
const result = await client.call('add', { x: 1, y: 2 })
console.log(result) // 3

// Iframe code
const server = createPostMessageServer<MyService>(window, {
  add({ x, y }) {
    return x + y
  }
})
```

There are also APIs for BroadcastChannel and MessagePort for cross-frame messaging.

### Web Worker

Call methods in a Worker like this:

```typescript
import { createWorkerClient, createWorkerServer } from 'shrimp-rpc'

// Main thread
const worker = new Worker('./worker.js')
const client = createWorkerClient<MyService>(worker)

// Call method in worker
const result = await client.call('add', { x: 5, y: 3 })
console.log('Result from worker:', result) // 8

// worker.js
import { createWorkerServer } from 'shrimp-rpc'

const server = createPostMessageServer<MyService>(self, {
  add({ x, y }) {
    return x + y
  }
})
```

You can call methods in the parent from the Worker like this:

```typescript
// Main thread
const worker = new Worker('./worker.js')
const server = createWorkerServer<MyService>(worker, {
  add({ x, y }) {
    return x + y
  }
})

// worker.js
const client = createPostMessageClient<MyService>(self)
await client.call('add', { x: 1, y: 2 }) // 3
```

### Service Worker

Background processing with service workers:

```typescript
import { createServiceWorkerClient, createServiceWorkerServer } from 'shrimp-rpc'

// Main thread (web page)
await navigator.serviceWorker.register('/sw.js')
const client = createServiceWorkerClient<MyService>()

// Call service worker method
const result = await client.call('add', { x: 10, y: 5 })
console.log('Result from service worker:', result) // 15

// Service Worker (sw.js)
const server = createServiceWorkerServer<MyService>({
  add({ x, y }) {
    return x + y
  }
})
```

### WebRTC data channel

```typescript
import { createRTCDataChannelClient, createRTCDataChannelServer } from 'shrimp-rpc'

// Peer 1 (offers data channel)
const pc1 = new RTCPeerConnection()
const dataChannel = pc1.createDataChannel('rpc')

const client = createRTCDataChannelClient<MyService>(dataChannel)

dataChannel.onopen = async () => {
  const result = await client.call('add', { x: 7, y: 3 })
  console.log('Result from peer:', result) // 10
}

// Peer 2 (receives data channel)
const pc2 = new RTCPeerConnection()

pc2.ondatachannel = (event) => {
  const channel = event.channel

  const server = createRTCDataChannelServer<MyService>(channel, {
    add({ x, y }) {
      return x + y
    }
  })
}
```

### Standard input/output (NodeJS)

Command-line RPC communication:

```typescript
import { createNodeStreamClient, createNodeStreamServer } from 'shrimp-rpc'

// Server (processes JSON-RPC over stdio)
const server = createNodeStreamServer<MyService>(
  process.stdin,
  process.stdout,
  {
    add({ x, y }) {
      return x + y
    },
  },
)

// Client (spawn a server child process and read from its stdout and write to its stdin)
const client = createNodeStreamClient<MyService>(childProcess.stdout, childProcess.stdin)
const result = await client.call('add', { x: 1, y: 2 })
console.log(result) // 3
```

### Chrome Extensions

Communication between extension components:

```typescript
import {
  createChromeExtensionClient,
  createChromeExtensionServer,
  createChromeExtensionContentScriptClient
} from 'shrimp-rpc'

// Background script
const server = createChromeExtensionServer<MyService>(
  chrome.runtime.onMessage,
  {
    add({ x, y }) {
      return x + y
    }
  }
)

// Popup script
const client = createChromeExtensionClient<MyService>()

const result = await client.call('add', { x: 8, y: 12 })
console.log('Result from background:', result) // 20

// Content script communication
const contentClient = createChromeExtensionContentScriptClient<MyService>(tabId)
const contentResult = await contentClient.call('add', { x: 3, y: 7 })
console.log('Result from content script:', contentResult) // 10
```
