import { createHandler } from '@quiltjs/quilt';
import { authHandler } from './auth.mjs';
import { BadRequestError, NotFoundError } from './errors.mjs';

// 1. Validate order params
export const validateOrderParamsHandler = createHandler({
  id: 'validateOrderParams',
  execute: async ({ req }) => {
    const { id } = req.params;
    if (typeof id !== 'string' || id.length === 0) {
      throw new BadRequestError('Invalid order id');
    }
    return { id };
  },
});

// 2. Load order based on auth + params
export const loadOrderHandler = createHandler({
  id: 'loadOrder',
  dependencies: { auth: authHandler, params: validateOrderParamsHandler },
  execute: async (_ctx, deps) => {
    // Fake "database"
    const orders = new Map([
      ['order-1', { id: 'order-1', total: 42, userId: deps.auth.userId }],
      ['order-2', { id: 'order-2', total: 99, userId: deps.auth.userId }],
    ]);

    const order = orders.get(deps.params.id);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    return order;
  },
});

