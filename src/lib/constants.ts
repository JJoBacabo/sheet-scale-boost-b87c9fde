// Application constants
export const APP_CONFIG = {
  SUBSCRIPTION_CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

export const PLAN_CODES = {
  FREE: 'free',
  BEGINNER: 'beginner',
  BASIC: 'basic',
  STANDARD: 'standard',
  EXPERT: 'expert',
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
    features: [],
  },
  TRIAL: {
    stores: 2,
    campaigns: 40,
    features: ['daily_roas', 'profit_sheet', 'campaigns', 'ai_cotacao'], // Same as Standard
    duration: 10, // days
  },
  BEGINNER: {
    stores: 1,
    campaigns: 0,
    features: ['daily_roas'],
  },
  BASIC: {
    stores: 1,
    campaigns: 15,
    features: ['daily_roas', 'profit_sheet'],
  },
  STANDARD: {
    stores: 2,
    campaigns: 40,
    features: ['daily_roas', 'profit_sheet', 'campaigns', 'ai_cotacao'],
  },
  EXPERT: {
    stores: 4,
    campaigns: 0, // 0 = unlimited (special handling needed)
    features: ['daily_roas', 'profit_sheet', 'campaigns', 'ai_cotacao', 'product_research'],
  },
} as const;
