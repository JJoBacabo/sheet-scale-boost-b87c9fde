import { DailyROASData } from "@/pages/CampaignControl";

// Generate dates for the last 30 days
const generateDates = (days: number = 30): string[] => {
  const dates: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
};

// Generate mock daily ROAS data for multiple campaigns
export const generateMockDailyRoas = (userId: string): DailyROASData[] => {
  const dates = generateDates(30);
  const campaigns = [
    {
      id: "mock_campaign_1",
      name: "Mock Campaign A - Sales",
      baseSpend: 50,
      baseCPC: 0.45,
      baseROAS: 2.5,
      productPrice: 29.99,
      cog: 12.00,
    },
    {
      id: "mock_campaign_2",
      name: "Mock Campaign B - Leads",
      baseSpend: 75,
      baseCPC: 0.60,
      baseROAS: 3.2,
      productPrice: 49.99,
      cog: 20.00,
    },
    {
      id: "mock_campaign_3",
      name: "Mock Campaign C - Brand Awareness",
      baseSpend: 30,
      baseCPC: 0.35,
      baseROAS: 1.8,
      productPrice: 19.99,
      cog: 8.00,
    },
    {
      id: "mock_campaign_4",
      name: "Mock Campaign D - Video Views",
      baseSpend: 40,
      baseCPC: 0.50,
      baseROAS: 2.1,
      productPrice: 39.99,
      cog: 15.00,
    },
    {
      id: "mock_campaign_5",
      name: "Mock Campaign E - Conversions",
      baseSpend: 100,
      baseCPC: 0.70,
      baseROAS: 4.0,
      productPrice: 59.99,
      cog: 25.00,
    },
  ];

  const mockData: DailyROASData[] = [];

  campaigns.forEach((campaign, campaignIndex) => {
    dates.forEach((date, dayIndex) => {
      // Add some variation to make data more realistic
      const variation = 0.8 + Math.random() * 0.4; // 80% to 120% of base
      const spend = campaign.baseSpend * variation;
      const cpc = campaign.baseCPC * (0.9 + Math.random() * 0.2);
      const roas = campaign.baseROAS * (0.85 + Math.random() * 0.3);
      
      // Calculate derived metrics
      const revenue = spend * roas;
      const unitsSold = Math.floor(revenue / campaign.productPrice);
      const purchases = Math.floor(unitsSold * (0.7 + Math.random() * 0.2)); // 70-90% conversion
      const atc = Math.floor(purchases * (1.1 + Math.random() * 0.3)); // ATC is higher than purchases
      const marginEuros = revenue - (unitsSold * campaign.cog) - spend;
      const marginPercentage = revenue > 0 ? (marginEuros / revenue) * 100 : 0;

      // Determine decision based on day and performance
      let decision: "KILL" | "MANTER" | "SCALE" | "DESCALE" | undefined;
      let decisionReason: string | undefined;

      if (dayIndex === 0) {
        // Day 1 logic
        if (spend > 50 && purchases === 0) {
          decision = "KILL";
          decisionReason = "Alto gasto sem vendas no primeiro dia";
        } else if (purchases > 0 && cpc < 0.5) {
          decision = "MANTER";
          decisionReason = "Vendas com CPC baixo no primeiro dia";
        } else if (purchases > 0) {
          decision = "MANTER";
          decisionReason = "Vendas no primeiro dia";
        }
      } else if (dayIndex > 0 && dayIndex < 7) {
        // Days 2-7
        if (marginPercentage > 30 && roas > 3) {
          decision = "SCALE";
          decisionReason = "Margem alta e ROAS excelente";
        } else if (marginPercentage < 0) {
          decision = "KILL";
          decisionReason = "Margem negativa";
        } else if (marginPercentage > 15 && roas > 2) {
          decision = "MANTER";
          decisionReason = "Margem e ROAS aceitáveis";
        }
      }

      mockData.push({
        id: `mock_daily_roas_${campaign.id}_${date}`,
        user_id: userId,
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        date: date,
        total_spent: parseFloat(spend.toFixed(2)),
        cpc: parseFloat(cpc.toFixed(2)),
        atc: atc,
        purchases: purchases,
        product_price: campaign.productPrice,
        cog: campaign.cog,
        units_sold: unitsSold,
        roas: parseFloat(roas.toFixed(2)),
        margin_euros: parseFloat(marginEuros.toFixed(2)),
        margin_percentage: parseFloat(marginPercentage.toFixed(2)),
        decision: decision,
        decision_reason: decisionReason,
      });
    });
  });

  return mockData;
};

