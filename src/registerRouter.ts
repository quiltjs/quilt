import { Quilt } from './Quilt.js';
import QuiltRouter from './QuiltRouter.js';

export const registerRouters = (
  quilt: Quilt,
  ...routers: QuiltRouter[]
): void => {
  for (const router of routers) {
    for (const route of router.getRoutes()) {
      const path = route.path === '/' ? '' : route.path;
      switch (route.method) {
        case 'GET':
          quilt.get(router.prefix + path, route.handler);
          break;
        case 'POST':
          quilt.post(router.prefix + path, route.handler);
          break;
        case 'PUT':
          quilt.put(router.prefix + path, route.handler);
          break;
        case 'PATCH':
          quilt.patch(router.prefix + path, route.handler);
          break;
        case 'DELETE':
          quilt.delete(router.prefix + path, route.handler);
          break;
        default:
          throw new Error(`Unsupported method: ${route.method}`);
      }
    }
  }
};
