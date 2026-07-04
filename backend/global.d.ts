import { Context, Handler, MiddlewareHandler, Hono } from 'hono'

declare global {
  type AppContext = Context<{ Bindings: Env }>
  type AppHandler = Handler<{ Bindings: Env }>
  type AppMiddleware = MiddlewareHandler<{ Bindings: Env }>
  type AppInstance = Hono<{ Bindings: Env }>
}
