import { z } from 'zod';
import { zodValidator } from '@/server/utils/zod-validator-wrapper';

export const idParamSchema = zodValidator(
  'param',
  z.object({
    id: z.coerce.number({ message: 'invalid number' }).int().positive(),
  })
);
