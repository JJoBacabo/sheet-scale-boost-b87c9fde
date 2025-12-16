// Mock data para testar o Ads Manager sem precisar de conexão real com Facebook

interface FacebookCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  created_time: string;
  start_time?: string;
  stop_time?: string;
  image_url?: string;
  thumbnail_url?: string;
  insights?: {
    data: Array<{
      impressions: string;
      clicks: string;
      spend: string;
      cpc?: string;
      cpm?: string;
      ctr?: string;
      reach?: string;
      actions?: Array<{ action_type: string; value: string }>;
      action_values?: Array<{ action_type: string; value: string }>;
    }>;
  };
}

export const mockCampaigns: FacebookCampaign[] = [
  {
    id: 'mock_001',
    name: 'Summer Sale 2024 - Product Launch',
    status: 'ACTIVE',
    objective: 'CONVERSIONS',
    daily_budget: '50.00',
    created_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    start_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    insights: {
      data: [{
        impressions: '125000',
        clicks: '3200',
        spend: '485.50',
        cpc: '0.15',
        cpm: '3.88',
        ctr: '2.56',
        reach: '95000',
        actions: [
          { action_type: 'PURCHASE', value: '125' },
          { action_type: 'ADD_TO_CART', value: '450' },
          { action_type: 'VIEW_CONTENT', value: '1200' }
        ],
        action_values: [
          { action_type: 'PURCHASE', value: '12500.00' }
        ]
      }]
    }
  },
  {
    id: 'mock_002',
    name: 'Black Friday Campaign - Electronics',
    status: 'ACTIVE',
    objective: 'SALES',
    daily_budget: '100.00',
    created_time: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    start_time: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    insights: {
      data: [{
        impressions: '250000',
        clicks: '8500',
        spend: '980.25',
        cpc: '0.12',
        cpm: '3.92',
        ctr: '3.40',
        reach: '180000',
        actions: [
          { action_type: 'PURCHASE', value: '320' },
          { action_type: 'ADD_TO_CART', value: '1200' },
          { action_type: 'INITIATE_CHECKOUT', value: '650' }
        ],
        action_values: [
          { action_type: 'PURCHASE', value: '32000.00' }
        ]
      }]
    }
  },
  {
    id: 'mock_003',
    name: 'Brand Awareness - New Collection',
    status: 'PAUSED',
    objective: 'BRAND_AWARENESS',
    daily_budget: '30.00',
    created_time: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    start_time: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    stop_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    insights: {
      data: [{
        impressions: '180000',
        clicks: '2400',
        spend: '420.00',
        cpc: '0.18',
        cpm: '2.33',
        ctr: '1.33',
        reach: '150000',
        actions: [
          { action_type: 'PAGE_VIEW', value: '1800' },
          { action_type: 'POST_ENGAGEMENT', value: '450' }
        ]
      }]
    }
  },
  {
    id: 'mock_004',
    name: 'Retargeting - Abandoned Cart',
    status: 'ACTIVE',
    objective: 'CONVERSIONS',
    daily_budget: '75.00',
    created_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    start_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    insights: {
      data: [{
        impressions: '95000',
        clicks: '5200',
        spend: '380.50',
        cpc: '0.07',
        cpm: '4.01',
        ctr: '5.47',
        reach: '75000',
        actions: [
          { action_type: 'PURCHASE', value: '85' },
          { action_type: 'ADD_TO_CART', value: '320' },
          { action_type: 'INITIATE_CHECKOUT', value: '180' }
        ],
        action_values: [
          { action_type: 'PURCHASE', value: '8500.00' }
        ]
      }]
    }
  },
  {
    id: 'mock_005',
    name: 'Video Campaign - Product Demo',
    status: 'ACTIVE',
    objective: 'VIDEO_VIEWS',
    daily_budget: '40.00',
    created_time: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    start_time: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    insights: {
      data: [{
        impressions: '200000',
        clicks: '1500',
        spend: '350.00',
        cpc: '0.23',
        cpm: '1.75',
        ctr: '0.75',
        reach: '175000',
        actions: [
          { action_type: 'VIDEO_VIEW', value: '45000' },
          { action_type: 'VIDEO_VIEW_50', value: '12000' },
          { action_type: 'VIDEO_VIEW_100', value: '3500' }
        ]
      }]
    }
  },
  {
    id: 'mock_006',
    name: 'Lead Generation - Newsletter Signup',
    status: 'ACTIVE',
    objective: 'LEAD_GENERATION',
    daily_budget: '60.00',
    created_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    start_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    insights: {
      data: [{
        impressions: '150000',
        clicks: '4200',
        spend: '180.75',
        cpc: '0.04',
        cpm: '1.21',
        ctr: '2.80',
        reach: '120000',
        actions: [
          { action_type: 'LEAD', value: '250' },
          { action_type: 'LINK_CLICK', value: '4200' }
        ]
      }]
    }
  },
  {
    id: 'mock_007',
    name: 'Traffic Campaign - Blog Posts',
    status: 'ACTIVE',
    objective: 'LINK_CLICKS',
    daily_budget: '25.00',
    created_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    start_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    insights: {
      data: [{
        impressions: '80000',
        clicks: '2800',
        spend: '22.40',
        cpc: '0.008',
        cpm: '0.28',
        ctr: '3.50',
        reach: '65000',
        actions: [
          { action_type: 'LINK_CLICK', value: '2800' },
          { action_type: 'PAGE_VIEW', value: '2100' }
        ]
      }]
    }
  },
  {
    id: 'mock_008',
    name: 'App Install - Mobile Game',
    status: 'ACTIVE',
    objective: 'APP_INSTALLS',
    daily_budget: '80.00',
    created_time: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    start_time: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    insights: {
      data: [{
        impressions: '300000',
        clicks: '12000',
        spend: '720.00',
        cpc: '0.06',
        cpm: '2.40',
        ctr: '4.00',
        reach: '250000',
        actions: [
          { action_type: 'MOBILE_APP_INSTALL', value: '450' },
          { action_type: 'APP_INSTALL', value: '450' }
        ]
      }]
    }
  },
  {
    id: 'mock_009',
    name: 'Catalog Sales - Dynamic Ads',
    status: 'ACTIVE',
    objective: 'CATALOG_SALES',
    daily_budget: '120.00',
    created_time: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    start_time: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    insights: {
      data: [{
        impressions: '400000',
        clicks: '15000',
        spend: '1150.00',
        cpc: '0.08',
        cpm: '2.88',
        ctr: '3.75',
        reach: '320000',
        actions: [
          { action_type: 'PURCHASE', value: '580' },
          { action_type: 'ADD_TO_CART', value: '2100' },
          { action_type: 'VIEW_CONTENT', value: '8500' }
        ],
        action_values: [
          { action_type: 'PURCHASE', value: '58000.00' }
        ]
      }]
    }
  },
  {
    id: 'mock_010',
    name: 'Store Visits - Local Business',
    status: 'ACTIVE',
    objective: 'STORE_TRAFFIC',
    daily_budget: '45.00',
    created_time: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    start_time: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    insights: {
      data: [{
        impressions: '110000',
        clicks: '3800',
        spend: '220.50',
        cpc: '0.06',
        cpm: '2.00',
        ctr: '3.45',
        reach: '95000',
        actions: [
          { action_type: 'STORE_VISIT', value: '85' },
          { action_type: 'DIRECTION_REQUEST', value: '120' }
        ]
      }]
    }
  }
];

export const mockAdAccounts = [
  {
    id: 'mock_account_001',
    name: 'Петра София - Mock Account',
    account_id: '1175302427899948',
    account_status: 1
  },
  {
    id: 'mock_account_002',
    name: 'Test Business Account',
    account_id: '123456789012345',
    account_status: 1
  }
];

