import { Request, Response } from 'express';
import { z } from 'zod';
import { SettingsService } from '../services/settingsService.js';
import { asyncHandler, createSuccessResponse, createErrorResponse } from '../utils/response.js';

const activeOnlySchema = z.object({
  activeOnly: z.enum(['true', 'false']).transform(val => val === 'true').optional().default('true')
});

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

export class SettingsController {
  private settingsService: SettingsService;

  constructor(settingsService: SettingsService) {
    this.settingsService = settingsService;
  }

  getAllSettings = asyncHandler(async (req: Request, res: Response) => {
    const { activeOnly } = activeOnlySchema.parse(req.query);
    
    const settings = await this.settingsService.getAllSettings(activeOnly);
    
    res.json(createSuccessResponse(settings, 'Settings retrieved successfully'));
  });

  getSettingByKey = asyncHandler(async (req: Request, res: Response) => {
    const keySchema = z.object({
      key: z.string().min(1).max(100)
    });
    
    const { key } = keySchema.parse(req.params);
    
    const setting = await this.settingsService.getSettingByKey(key);
    
    if (!setting) {
      return res.status(404).json(createErrorResponse('Setting not found'));
    }
    
    res.json(createSuccessResponse(setting, 'Setting retrieved successfully'));
  });

  createSetting = asyncHandler(async (req: Request, res: Response) => {
    const data = createSettingSchema.parse(req.body);
    
    const setting = await this.settingsService.createSetting(data);
    
    res.status(201).json(createSuccessResponse(setting, 'Setting created successfully'));
  });

  updateSetting = asyncHandler(async (req: Request, res: Response) => {
    const keySchema = z.object({
      key: z.string().min(1).max(100)
    });
    
    const { key } = keySchema.parse(req.params);
    const data = updateSettingSchema.parse(req.body);
    
    const setting = await this.settingsService.updateSetting(key, data);
    
    res.json(createSuccessResponse(setting, 'Setting updated successfully'));
  });

  deleteSetting = asyncHandler(async (req: Request, res: Response) => {
    const keySchema = z.object({
      key: z.string().min(1).max(100)
    });
    
    const { key } = keySchema.parse(req.params);
    
    await this.settingsService.deleteSetting(key);
    
    res.json(createSuccessResponse(null, 'Setting deleted successfully'));
  });

  getTradingSettings = asyncHandler(async (req: Request, res: Response) => {
    const settings = await this.settingsService.getTradingSettings();
    
    const serializedSettings = {
      minSpread: settings.minSpread.toString(),
      maxInvestment: settings.maxInvestment.toString(),
      scanInterval: settings.scanInterval
    };
    
    res.json(createSuccessResponse(serializedSettings, 'Trading settings retrieved successfully'));
  });

  initializeDefaultSettings = asyncHandler(async (req: Request, res: Response) => {
    await this.settingsService.initializeDefaultSettings();
    
    res.json(createSuccessResponse(null, 'Default settings initialized successfully'));
  });
}