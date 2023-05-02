<a href='https://www.apollographql.com/'><img src='https://avatars.githubusercontent.com/u/17189275?s=200' style="border-radius: 6px; margin-right: 6px" height='100' alt='Apollo Server'></a>
<a href='https://hapi.dev/'><img src='https://raw.githubusercontent.com/hapijs/assets/master/images/hapi.png' style="border-radius: 6px" height='100' alt='Hapi'></a>

[![NPM version](https://badge.fury.io/js/@as-integrations%2Fhapi.svg)](https://www.npmjs.com/package/@as-integrations/hapi)
[![NPM downloads](https://img.shields.io/npm/dm/@as-integrations/hapi.svg?style=flat)](https://www.npmjs.com/package/@as-integrations/hapi)

# Apollo Server Integration for Hapi

## **Introduction**

**An Apollo Server integration for use with Hapi.**

This is a simple package that easily allows you to connect your own Hapi server implementation to an Apollo Server instance.

## **Requirements**

- **[Node.js v16](https://nodejs.org/)** or later
- **[Hapi v20.x](https://www.hapi.dev/)** or later
- **[GraphQL.js v16](https://graphql.org/graphql-js/)** or later
- **[Apollo Server v4](https://www.apollographql.com/docs/apollo-server/)** or later

## **Installation**

```bash
npm install @as-integrations/hapi @apollo/server graphql @hapi/hapi
```

## **Usage**

Setup [Hapi](https://www.hapi.dev/) & [Apollo Server](https://www.apollographql.com/docs/apollo-server/) like you usually would and then connect the two by using the `hapiApollo` plugin:

```typescript
import { Server } from '@hapi/hapi';
import { ApolloServer, BaseContext } from "@apollo/server";
import hapiApollo from "@as-integrations/hapi";
// ...

// create the apollo server instance and start it
const apollo = new ApolloServer<BaseContext>({
  typeDefs,
  resolvers,
});

await apolloServer.start();

// create the hapi server
const hapi = new Server({
  host: 'localhost',
  port: 5000
});

// ...

// register the plugin with the hapi server and provide the apollo instance in plugin config
await hapi.register({
  plugin: hapiApollo,
  options: {
    apolloServer,
    path: '/graphql'
  }
});

await hapi.start();
```

Note: **You must call and await `apollo.start()` before using the integration.**

## **ES5 Usage**

If you are using ES5 or are otherwise using require() to use this module, you may need reference the default export like so:

```
const hapiApollo = require("@as-integrations/hapi").default;
```

## **Context**

Apollo Server v4 has moved context setup outside of the `ApolloServer` constructor.

Define you're own context function and pass it in to the `context` option for the plugin.

For example:

```typescript
await hapi.register({
  plugin: hapiPlugin,
  options: {
    context: async ({ request }) => ({
      token: request.headers.token
    }),
    apolloServer
  }
});
```

## **Route Configuration**

Additional configuration for Hapi routes that are created by this module can be passed via 
getRoute (get / options routes) or postRoute (post route). Both support options, rules, and vhost
configuration.

For example, to add a max upload size to the post route:

```typescript
await hapi.register({
  plugin: hapiPlugin,
  options: {
    context: async ({ request }) => ({
      token: request.headers.token
    }),
    apolloServer,
    postRoute: {
      options: {
        payload: {
          maxBytes: 1024
        }
      }
    }
  }
});
```

## **Contributors**

- David Castro ([arimus](https://github.com/arimus))
- GeekOffice ([GeekOffice](https://github.com/geekoffice))

