import { ApolloServer } from '@apollo/server';
import { Server } from '@hapi/hapi';
import fetch from 'node-fetch';
import { expect } from '@jest/globals';
import hapiPlugin, { HapiApolloPluginOptions } from '../index';

it('check basic query', async () => {
  const apolloServer = new ApolloServer({ typeDefs: 'type Query {f: ID}' });
  await apolloServer.start();

  const hapi = new Server({
    debug: {
      log: ['*'],
      request: ['*']
    },
    host: 'localhost',
    port: 5000
  });

  await hapi.register({
    plugin: hapiPlugin,
    options: {
      apolloServer
    }
  });

  await hapi.start();

  try {
    const response = await fetch(hapi.info.uri, {
      method: 'POST',
      body: JSON.stringify({ query: '{f}' }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const statusCode = response.status;
    const data = await response.text();

    // console.log('DEBUG: status code', statusCode, data);
    expect(statusCode).toEqual(200);
    expect(data).toEqual('{"data":{"f":null}}\n');
  } finally {
    await apolloServer.stop();
    await hapi.stop();
  }
});

it('check non-default path', async () => {
  const apolloServer = new ApolloServer({ typeDefs: 'type Query {f: ID}' });
  await apolloServer.start();

  const hapi = new Server({
    debug: {
      log: ['*'],
      request: ['*']
    },
    host: 'localhost',
    port: 5000
  });

  await hapi.register({
    plugin: hapiPlugin,
    options: {
      apolloServer,
      path: '/graphql'
    }
  });

  await hapi.start();

  const url = hapi.info.uri + '/graphql';
  console.log('using non-default url', url);

  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({ query: '{f}' }),
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const statusCode = response.status;
  const data = await response.text();

  // console.log('DEBUG: status code', statusCode, data);
  expect(statusCode).toEqual(200);
  expect(data).toEqual('{"data":{"f":null}}\n');

  await apolloServer.stop();
  await hapi.stop();
});

it('check with route options (payload size)', async () => {
  const apolloServer = new ApolloServer({ typeDefs: 'type Query {f: ID}' });
  await apolloServer.start();

  const hapi = new Server({
    debug: {
      log: ['*'],
      request: ['*']
    },
    host: 'localhost',
    port: 5000
  });

  await hapi.register({
    plugin: hapiPlugin,
    options: {
      apolloServer,
      path: '/graphql',
      postRoute: {
        options: {
          payload: {
            maxBytes: 5
          }
        }
      }
    } as HapiApolloPluginOptions<any>
  });

  await hapi.start();

  try {
    const url = hapi.info.uri + '/graphql';
    // console.log('using url', url, 'with maxBytes 5');

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ query: '{f}' }),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const statusCode = response.status;
    // const data = await response.text();

    // console.log('DEBUG: status code', statusCode, data);
    expect(statusCode).toEqual(413);
  } finally {
    await apolloServer.stop();
    await hapi.stop();
  }
});
