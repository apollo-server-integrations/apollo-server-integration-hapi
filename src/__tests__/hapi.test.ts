import { ApolloServer } from '@apollo/server';
import { Server } from '@hapi/hapi';
import fetch from 'node-fetch';
import {expect} from '@jest/globals';
import hapiPlugin from '../index';

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

  await apolloServer.stop();
  await hapi.stop();
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
