import { Hono } from 'hono';
import customerRoutes from '@/server/routes/admin/customer';
import storeRoutes from '@/server/routes/admin/stores';

const app = new Hono();
app.route('/stores', storeRoutes);
app.route('/customers', customerRoutes);

app.get('/test', (c) => {
  const _jwtPayload = c.get('jwtPayload');

  return c.text('masuk');
});

export default app;
