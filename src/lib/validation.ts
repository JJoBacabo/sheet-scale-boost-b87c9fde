import { z } from 'zod';

// Authentication schemas
export const authSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255, { message: "Email must be less than 255 characters" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }).max(128, { message: "Password must be less than 128 characters" })
});

// Profile schemas
export const profileSchema = z.object({
  full_name: z.string().trim().min(1, { message: "Name cannot be empty" }).max(100, { message: "Name must be less than 100 characters" }),
  company_name: z.string().trim().max(200, { message: "Company name must be less than 200 characters" }).optional().or(z.literal(''))
});

// Integration schemas
export const shopifyIntegrationSchema = z.object({
  store_name: z.string().trim().min(1, { message: "Store name is required" }).max(200, { message: "Store URL is too long" }),
  access_token: z.string().trim().min(1, { message: "Access token is required" }).max(500, { message: "Access token is too long" })
});

// Campaign schemas
export const campaignActionSchema = z.object({
  action: z.enum(['list', 'update', 'pause', 'activate', 'delete'], { message: "Invalid action" }),
  campaignId: z.string().regex(/^\d+$/, { message: "Invalid campaign ID format" }).optional(),
  updates: z.object({
    name: z.string().max(200, { message: "Campaign name must be less than 200 characters" }).optional(),
    status: z.enum(['ACTIVE', 'PAUSED'], { message: "Status must be ACTIVE or PAUSED" }).optional(),
    daily_budget: z.number().positive({ message: "Budget must be positive" }).optional()
  }).optional()
});

export type AuthInput = z.infer<typeof authSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ShopifyIntegrationInput = z.infer<typeof shopifyIntegrationSchema>;
export type CampaignActionInput = z.infer<typeof campaignActionSchema>;
