// Application constants
export const APP_CONFIG = {
  SUBSCRIPTION_CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

export const PLAN_CODES = {
  FREE: 'free',
  BASIC: 'basic',
  STANDARD: 'standard',
  EXPERT: 'expert',
  BUSINESS: 'business',
} as const;

export const SUBSCRIPTION_STATES = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
  ARCHIVED: 'archived',
} as const;

// Update limits documentation
export const SUBSCRIPTION_LIMITS = {
  FREE: {
    stores: 0,
    campaigns: 0,
    features: [] as string[],
  },
  TRIAL: {
    stores: 2,
    campaigns: 40,
    features: ['daily_roas', 'profit_sheet', 'campaigns', 'ai_cotacao'] as string[], // Same as Standard
    duration: 10, // days
  },
  BASIC: {
    stores: 1,
    campaigns: 15,
    features: ['daily_roas', 'profit_sheet'] as string[],
  },
  STANDARD: {
    stores: 2,
    campaigns: 40,
    features: ['daily_roas', 'profit_sheet', 'campaigns', 'ai_cotacao'] as string[],
  },
  EXPERT: {
    stores: 4,
    campaigns: 0, // 0 = unlimited (special handling needed)
    features: ['daily_roas', 'profit_sheet', 'campaigns', 'ai_cotacao', 'product_research'] as string[],
  },
  BUSINESS: {
    stores: 0, // 0 = unlimited (special handling needed)
    campaigns: 0, // 0 = unlimited (special handling needed)
    features: ['daily_roas', 'profit_sheet', 'campaigns', 'ai_cotacao', 'product_research', 'dedicated_support', 'custom_features'] as string[],
  },
};
