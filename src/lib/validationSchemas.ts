import { z } from 'zod';

// Helper to get translated validation messages
// This will be used by forms that have access to the t() function
export const createAuthSchema = (t: (key: string) => string) => z.object({
  email: z.string()
    .trim()
    .email({ message: t('validation.invalidEmail') })
    .max(255, { message: t('validation.emailTooLong') }),
  password: z.string()
    .min(8, { message: t('validation.passwordMinLength') })
    .max(128, { message: t('validation.passwordMaxLength') })
});

export const createProfileSchema = (t: (key: string) => string) => z.object({
  full_name: z.string()
    .trim()
    .min(1, { message: t('validation.nameTooShort') })
    .max(100, { message: t('validation.nameTooLong') }),
  company_name: z.string()
    .trim()
    .max(200, { message: t('validation.companyNameTooLong') })
    .optional()
    .or(z.literal(''))
});

export const createShopifyIntegrationSchema = (t: (key: string) => string) => z.object({
  store_name: z.string()
    .trim()
    .min(1, { message: t('validation.storeNameRequired') })
    .max(200, { message: t('validation.storeNameTooLong') }),
  access_token: z.string()
    .trim()
    .min(1, { message: t('validation.accessTokenRequired') })
    .max(500, { message: t('validation.accessTokenTooLong') })
});

export const createCampaignActionSchema = (t: (key: string) => string) => z.object({
  action: z.enum(['list', 'update', 'pause', 'activate', 'delete'], { 
    message: t('validation.invalidAction')
  }),
  campaignId: z.string()
    .regex(/^\d+$/, { message: t('validation.invalidCampaignId') })
    .optional(),
  updates: z.object({
    name: z.string()
      .max(200, { message: t('validation.campaignNameTooLong') })
      .optional(),
    status: z.enum(['ACTIVE', 'PAUSED'], { 
      message: t('validation.statusMustBeValid')
    }).optional(),
    daily_budget: z.number()
      .positive({ message: t('validation.budgetMustBePositive') })
      .optional()
  }).optional()
});

// Type exports
export type AuthInput = z.infer<ReturnType<typeof createAuthSchema>>;
export type ProfileInput = z.infer<ReturnType<typeof createProfileSchema>>;
export type ShopifyIntegrationInput = z.infer<ReturnType<typeof createShopifyIntegrationSchema>>;
export type CampaignActionInput = z.infer<ReturnType<typeof createCampaignActionSchema>>;
