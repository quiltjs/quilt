/* eslint-disable @typescript-eslint/no-explicit-any */
import { Handler } from './Handler.js';

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'OPTIONS'
  | 'HEAD';

export interface QuiltRoute {
  readonly method: HttpMethod;
  readonly path: string;
  readonly handler: Handler<any, any, any>;
}

export default interface QuiltRouter {
  readonly prefix: string;
  getRoutes(): QuiltRoute[];
}
