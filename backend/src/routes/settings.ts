import { Router } from 'express';
import { SettingsController } from '../controllers/settingsController.js';
import { validateRequest } from '../utils/response.js';
import { z } from 'zod';

const router = Router();

const createSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().min(1).max(1000),
  description: z.string().max(500).optional(),
  minSpread: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  maxInvestment: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  scanInterval: z.coerce.number().int().min(1).max(86400).optional(),
  isActive: z.boolean().optional()
});

const updateSettingSchema = z.object({
  value: z.string().min(1).max(1000).optional(),
  description: z.string().max(500).optional(),
  minSpread: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  maxInvestment: z.string().regex(/^\d+(\.\d+)?$/).optional(),
  scanInterval: z.coerce.number().int().min(1).max(86400).optional(),
  isActive: z.boolean().optional()
});

export function createSettingsRoutes(controller: SettingsController): Router {
  // GET /api/settings - Get all settings
  router.get('/', controller.getAllSettings);

  // GET /api/settings/trading - Get trading settings
  router.get('/trading', controller.getTradingSettings);

  // GET /api/settings/:key - Get setting by key
  router.get('/:key',
    validateRequest({
      params: z.object({
        key: z.string().min(1).max(100)
      })
    }),
    controller.getSettingByKey
  );

  // POST /api/settings - Create new setting
  router.post('/',
    validateRequest({
      body: createSettingSchema
    }),
    controller.createSetting
  );

  // PUT /api/settings/:key - Update setting
  router.put('/:key',
    validateRequest({
      params: z.object({
        key: z.string().min(1).max(100)
      }),
      body: updateSettingSchema
    }),
    controller.updateSetting
  );

  // DELETE /api/settings/:key - Delete setting
  router.delete('/:key',
    validateRequest({
      params: z.object({
        key: z.string().min(1).max(100)
      })
    }),
    controller.deleteSetting
  );

  // POST /api/settings/initialize - Initialize default settings
  router.post('/initialize', controller.initializeDefaultSettings);

  return router;
}