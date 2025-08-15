import { Hono } from 'hono';
import customerRoutes from '@/routes/admin/customer';
import storeRoutes from '@/routes/admin/stores';

const app = new Hono()
  .route('/stores', storeRoutes)
  .route('/customers', customerRoutes)
  .get('/test', (c) => {
    const _jwtPayload = c.get('jwtPayload');

    return c.text('masuk');
  });

export default app;
