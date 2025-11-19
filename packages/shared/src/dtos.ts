import { OpportunityStatus, PeriodRange } from './enums';

/**
 * Opportunity Data Transfer Object
 */
export interface OpportunityDTO {
  id: string;
  title: string;
  description: string;
  status: OpportunityStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Period Data Transfer Object
 */
export interface PeriodDTO {
  id: string;
  range: PeriodRange;
  startDate: Date;
  endDate: Date;
}
