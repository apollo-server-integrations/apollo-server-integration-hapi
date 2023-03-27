import { ApolloServer, ApolloServerOptions, BaseContext } from '@apollo/server';
import {
  CreateServerForIntegrationTestsOptions,
  defineIntegrationTestSuite,
} from '@apollo/server-integration-testsuite';
import { Server } from '@hapi/hapi';
import hapiPlugin from '..';

defineIntegrationTestSuite(
  async function (
    serverOptions: ApolloServerOptions<BaseContext>,
    testOptions?: CreateServerForIntegrationTestsOptions,
  ) {
    // console.log('serverOptions', serverOptions);
    // console.log('testOptions', testOptions);

    const apolloServer = new ApolloServer({
      ...serverOptions,
      plugins: [...(serverOptions.plugins ?? [])],
    });
    await apolloServer.start();

    const hapi = new Server({
      debug: {
        log: ['*'],
        request: ['*'],
      },
      host: 'localhost',
      port: 0,
      routes: {
        cache: false,
        cors: {
          origin: ['*'],
        },
        validate: {
          failAction: async (_request, _h, _err) => {
            // During development, log and respond with the full error.
            console.error('error:', _err ? _err.toString() : null);
            throw _err;
          },
        },
      },
    });

    const context = testOptions?.context;

    // TODO - set graphql path when configuring

    await hapi.register({
      plugin: hapiPlugin,
      options: {
        context,
        apolloServer,
      },
    });

    await hapi.start();

    const url = hapi.info.uri;
    // console.log('returning server url', url);
    return {
      server: apolloServer,
      url,
      async extraCleanup() {
        await hapi.stop({
          timeout: 10000,
        });
      },
    };
  },
  { noIncrementalDelivery: true },
);
