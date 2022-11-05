import type {Request, ResponseToolkit, Server, Lifecycle} from '@hapi/hapi';
import type {
  ApolloServer,
  BaseContext, ContextFunction,
  HTTPGraphQLRequest,
} from '@apollo/server';
import type {WithRequired} from '@apollo/utils.withrequired';
import type {Util} from '@hapi/hapi';

export interface HapiContextFunctionArgument {
  request: Request;
  h: ResponseToolkit;
}

interface HapiApolloPluginOptions<TContext extends BaseContext> {
  apolloServer: ApolloServer;
  context?: ContextFunction<[HapiContextFunctionArgument], TContext>;
  path?: string;
}

function hapiMiddleware(
  server: ApolloServer<BaseContext>,
  options?: HapiApolloPluginOptions<BaseContext>,
): Lifecycle.Method;
function hapiMiddleware<TContext extends BaseContext>(
  server: ApolloServer<TContext>,
  options: WithRequired<HapiApolloPluginOptions<TContext>, 'context'>,
): Lifecycle.Method;
function hapiMiddleware<TContext extends BaseContext>(
  server: ApolloServer<TContext>,
  options?: HapiApolloPluginOptions<TContext>,
): Lifecycle.Method {
  server.assertStarted('hapiMiddleware()');

  // This `any` is safe because the overload above shows that context can
  // only be left out if you're using BaseContext as your context, and {} is a
  // valid BaseContext.
  const defaultContext: ContextFunction<[HapiContextFunctionArgument],
    any> = async () => ({});

  const context: ContextFunction<[HapiContextFunctionArgument], TContext> =
    options?.context ?? defaultContext;

  const path = options?.path || '/';

  return async (request: Request, h: ResponseToolkit, err?: Error) => {
    // need to make the graphql path mapping configurable
    if (request.path === path) {
      if (err) {
        console.error('have error', err.message, err.stack);
        return h.response(err.message).code(500).takeover();
      }

      const {body, headers, status} = await server.executeHTTPGraphQLRequest({
        httpGraphQLRequest: toGraphqlRequest(request),
        context: () => context({
          request,
          h
        }),
      });

      if (body.kind === 'complete') {
        let response = h.response(body.string);

        // set the status code / default status code
        response = response.code(status || 200);

        // set headers back from apollo response to hapi response
        for (const [key, value] of headers) {
          // console.log('HEADER', key, value);
          response = response.header(key, value);
        }

        return response.takeover();
      }

      throw new Error('Incremental delivery not implemented');
    }

    return h.continue;
  }
}

function toGraphqlRequest(request: Request): HTTPGraphQLRequest {
  return {
    method: request.method ? request.method.toUpperCase() : 'POST',
    headers: normalizeHeaders(request.headers),
    search: request.url.search,
    body: request.payload,
  }
}

function normalizeHeaders(headers: Util.Dictionary<string>): Map<string, string> {
  const newHeaders = new Map<string, string>();
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      // headers can be an array or a single value. We join multi-valued headers with `, ` just like the Fetch API's
      // `Headers` does. We assume that keys are already lower-cased (as per the Node docs on IncomingMessage.headers)
      // and so we don't bother to lower-case them or combine across multiple keys that would lower-case to the same
      // value.
      newHeaders.set(
        key,
        Array.isArray(value) ? value.join(', ') : (value as string),
      );
    }
  }
  return newHeaders;
}

// this is the actual Hapi plugin, which utilizes the above middleware
const hapiPlugin = {
  pkg: require('../package.json'),
  register: async function (server: Server, opts: HapiApolloPluginOptions<any>) {
    const apolloServer: ApolloServer = opts.apolloServer;

    if (!apolloServer) {
      throw new Error('Apollo server instance not provided in options');
    }

    // configure the route that apollo server will be mapped to
    server.route({
      path: opts.path || '/',
      method: ['GET', 'POST', 'OPTIONS'],
      handler: hapiMiddleware(apolloServer, {
        context: opts.context,
        path: opts.path
      } as HapiApolloPluginOptions<any>)
    });

    // TEST ROUTE FOR DEBUGGING
    // server.ext('onRequest', async (_request: Request, _h: ResponseToolkit, _err?: Error) => {
    //   console.log('method', _request.method, 'path', _request.path, 'err', _err);
    //   return _h.continue;
    // });
  }
}

export default hapiPlugin;
