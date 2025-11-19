import { Decimal } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { 
  SerializedSettings, 
  ServiceDependencies 
} from '../types/index.js';
import { serializeDecimal, deserializeDecimal } from '../utils/decimal.js';

export interface SettingInput {
  key: string;
  value: string;
  description?: string;
  minSpread?: Decimal | string;
  maxInvestment?: Decimal | string;
  scanInterval?: number;
  isActive?: boolean;
}

export class SettingsService {
  private prisma: PrismaClient;
  private logger: any;
  private metrics: any;

  constructor(deps: ServiceDependencies) {
    this.prisma = deps.prisma;
    this.logger = deps.logger;
    this.metrics = deps.metrics;
  }

  async getAllSettings(activeOnly: boolean = true): Promise<SerializedSettings[]> {
    const startTime = Date.now();
    
    try {
      const where = activeOnly ? { isActive: true } : {};
      
      const settings = await this.prisma.settings.findMany({
        where,
        orderBy: { key: 'asc' }
      });

      if (this.metrics && this.metrics.record) {
        this.metrics.record('findMany', 'settings', (Date.now() - startTime) / 1000);
      }

      return settings.map(setting => this.serializeSetting(setting));
    } catch (error) {
      this.logger.error('Failed to get all settings', { error, activeOnly });
      throw error;
    }
  }

  async getSettingByKey(key: string): Promise<SerializedSettings | null> {
    const startTime = Date.now();
    
    try {
      const setting = await this.prisma.settings.findUnique({
        where: { key }
      });

      if (this.metrics && this.metrics.record) {
        this.metrics.record('findUnique', 'settings', (Date.now() - startTime) / 1000);
      }

      if (!setting) {
        return null;
      }

      return this.serializeSetting(setting);
    } catch (error) {
      this.logger.error('Failed to get setting by key', { error, key });
      throw error;
    }
  }

  async createSetting(data: SettingInput): Promise<SerializedSettings> {
    const startTime = Date.now();
    
    try {
      // Check if setting already exists
      const existing = await this.prisma.settings.findUnique({
        where: { key: data.key }
      });

      if (existing) {
        throw new Error(`Setting with key '${data.key}' already exists`);
      }

      const setting = await this.prisma.settings.create({
        data: {
          key: data.key,
          value: data.value,
          description: data.description,
          minSpread: data.minSpread ? deserializeDecimal(data.minSpread) : undefined,
          maxInvestment: data.maxInvestment ? deserializeDecimal(data.maxInvestment) : undefined,
          scanInterval: data.scanInterval,
          isActive: data.isActive ?? true
        }
      });

      if (this.metrics && this.metrics.record) {
        this.metrics.record('create', 'settings', (Date.now() - startTime) / 1000);
      }

      this.logger.info('Setting created', { 
        key: data.key,
        value: data.value
      });

      return this.serializeSetting(setting);
    } catch (error) {
      this.logger.error('Failed to create setting', { error, data });
      throw error;
    }
  }

  async updateSetting(
    key: string, 
    data: Partial<SettingInput>
  ): Promise<SerializedSettings> {
    const startTime = Date.now();
    
    try {
      const updateData: any = { ...data };
      
      // Convert decimal fields
      if (data.minSpread !== undefined) {
        updateData.minSpread = data.minSpread ? deserializeDecimal(data.minSpread) : null;
      }
      
      if (data.maxInvestment !== undefined) {
        updateData.maxInvestment = data.maxInvestment ? deserializeDecimal(data.maxInvestment) : null;
      }

      const setting = await this.prisma.settings.update({
        where: { key },
        data: updateData
      });

      if (this.metrics && this.metrics.record) {
        this.metrics.record('update', 'settings', (Date.now() - startTime) / 1000);
      }

      this.logger.info('Setting updated', { 
        key,
        changes: Object.keys(data)
      });

      return this.serializeSetting(setting);
    } catch (error) {
      this.logger.error('Failed to update setting', { error, key, data });
      throw error;
    }
  }

  async deleteSetting(key: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.prisma.settings.delete({
        where: { key }
      });

      if (this.metrics && this.metrics.record) {
        this.metrics.record('delete', 'settings', (Date.now() - startTime) / 1000);
      }

      this.logger.info('Setting deleted', { key });
    } catch (error) {
      this.logger.error('Failed to delete setting', { error, key });
      throw error;
    }
  }

  async getTradingSettings(): Promise<{
    minSpread: Decimal;
    maxInvestment: Decimal;
    scanInterval: number;
  }> {
    try {
      const [minSpreadSetting, maxInvestmentSetting, scanIntervalSetting] = await Promise.all([
        this.getSettingByKey('min_spread'),
        this.getSettingByKey('max_investment'),
        this.getSettingByKey('scan_interval')
      ]);

      const minSpread = minSpreadSetting?.minSpread 
        ? deserializeDecimal(minSpreadSetting.minSpread)
        : new Decimal('1.5'); // Default 1.5%
      
      const maxInvestment = maxInvestmentSetting?.maxInvestment
        ? deserializeDecimal(maxInvestmentSetting.maxInvestment)
        : new Decimal('10000'); // Default $10,000
      
      const scanInterval = scanIntervalSetting?.scanInterval || 60; // Default 60 seconds

      return {
        minSpread,
        maxInvestment,
        scanInterval
      };
    } catch (error) {
      this.logger.error('Failed to get trading settings', { error });
      
      // Return defaults on error
      return {
        minSpread: new Decimal('1.5'),
        maxInvestment: new Decimal('10000'),
        scanInterval: 60
      };
    }
  }

  async initializeDefaultSettings(): Promise<void> {
    const defaultSettings: SettingInput[] = [
      {
        key: 'min_spread',
        value: '1.5',
        description: 'Minimum spread percentage to consider an opportunity',
        minSpread: new Decimal('1.5')
      },
      {
        key: 'max_investment',
        value: '10000',
        description: 'Maximum investment per trade in USDT',
        maxInvestment: new Decimal('10000')
      },
      {
        key: 'scan_interval',
        value: '60',
        description: 'Scan interval in seconds',
        scanInterval: 60
      },
      {
        key: 'opportunity_expiry',
        value: '300',
        description: 'Opportunity expiry time in seconds',
        scanInterval: 300
      },
      {
        key: 'max_concurrent_scans',
        value: '5',
        description: 'Maximum concurrent scan operations',
        scanInterval: 5
      }
    ];

    for (const setting of defaultSettings) {
      try {
        await this.createSetting(setting);
      } catch (error) {
        // Ignore if setting already exists
        if (error instanceof Error && !error.message.includes('already exists')) {
          this.logger.warn('Failed to create default setting', { key: setting.key, error });
        }
      }
    }

    this.logger.info('Default settings initialized');
  }

  private serializeSetting(setting: any): SerializedSettings {
    return {
      id: setting.id,
      key: setting.key,
      value: setting.value,
      description: setting.description,
      minSpread: serializeDecimal(setting.minSpread),
      maxInvestment: serializeDecimal(setting.maxInvestment),
      scanInterval: setting.scanInterval,
      isActive: setting.isActive,
      createdAt: setting.createdAt.toISOString(),
      updatedAt: setting.updatedAt.toISOString()
    };
  }
}