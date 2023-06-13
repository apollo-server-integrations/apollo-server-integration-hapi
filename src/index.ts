import type {
  Lifecycle,
  ReqRef,
  Request,
  ResponseToolkit,
  RouteOptions,
  Server,
  Util,
} from '@hapi/hapi';
import type {
  ApolloServer,
  BaseContext,
  ContextFunction,
  HTTPGraphQLRequest,
} from '@apollo/server';
import type { WithRequired } from '@apollo/utils.withrequired';
import { HeaderMap } from '@apollo/server';

export interface HapiContextFunctionArgument {
  request: Request;
  h: ResponseToolkit;
}

export interface HapiApolloPluginOptions<TContext extends BaseContext> {
  apolloServer: ApolloServer<TContext>;
  context?: ContextFunction<[HapiContextFunctionArgument], TContext>;
  path?: string;
  getRoute?: {
    options?:
      | RouteOptions<ReqRef>
      | ((server: Server) => RouteOptions<ReqRef>)
      | undefined;
    rules?: ReqRef['Rules'] | undefined;
    vhost?: string | string[] | undefined;
  };
  postRoute?: {
    options?:
      | RouteOptions<ReqRef>
      | ((server: Server) => RouteOptions<ReqRef>)
      | undefined;
    rules?: ReqRef['Rules'] | undefined;
    vhost?: string | string[] | undefined;
  };
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
  const defaultContext: ContextFunction<
    [HapiContextFunctionArgument],
    any
  > = async () => ({});

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

      const { body, headers, status } = await server.executeHTTPGraphQLRequest({
        httpGraphQLRequest: toGraphqlRequest(request),
        context: () =>
          context({
            request,
            h,
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
  };
}

function toGraphqlRequest(request: Request): HTTPGraphQLRequest {
  return {
    method: request.method ? request.method.toUpperCase() : 'POST',
    headers: normalizeHeaders(request.headers),
    search: request.url.search,
    body: request.payload,
  };
}

function normalizeHeaders(headers: Util.Dictionary<string>): HeaderMap {
  const newHeaders = new HeaderMap();
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
  register: async function (
    server: Server,
    opts: HapiApolloPluginOptions<any>,
  ) {
    const apolloServer: ApolloServer = opts.apolloServer;

    if (!apolloServer) {
      throw new Error('Apollo server instance not provided in options');
    }

    // GET ROUTE
    const defaultGetOptions = {
      cors: true,
    };
    const getOptions = opts.getRoute?.options;

    delete opts.getRoute?.options;

    // configure the route that apollo server will be mapped to
    server.route({
      ...opts.getRoute,
      ...{
        path: opts.path || '/',
        method: 'GET',
        handler: hapiMiddleware(apolloServer, {
          context: opts.context,
          path: opts.path,
        } as HapiApolloPluginOptions<any>),
        options: {
          ...defaultGetOptions,
          ...getOptions,
        },
      },
    });

    // POST ROUTE
    const defaultPostOptions = {
      cors: true,
    };
    const postOptions = opts.postRoute?.options;

    delete opts.postRoute?.options;

    server.route({
      ...opts.postRoute,
      ...{
        path: opts.path || '/',
        method: 'POST',
        handler: hapiMiddleware(apolloServer, {
          context: opts.context,
          path: opts.path,
        } as HapiApolloPluginOptions<any>),
        options: {
          ...defaultPostOptions,
          ...postOptions,
        },
      },
    });
  },
};

export default hapiPlugin;
