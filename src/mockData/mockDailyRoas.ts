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
// Specifically designed to show KILL, MANTER, and SCALE decisions
export const generateMockDailyRoas = (userId: string): DailyROASData[] => {
  const dates = generateDates(30);
  const today = new Date().toISOString().split('T')[0];
  const todayIndex = dates.indexOf(today);
  
  // Campaign 1: KILL - High spend, no sales, negative margin
  const killCampaign = {
    id: "mock_kill_campaign",
    name: "🚫 KILL Campaign - High Spend No Sales",
    productPrice: 29.99,
    cog: 12.00,
  };

  // Campaign 2: MANTER - Medium performance, positive but low margin
  const manterCampaign = {
    id: "mock_manter_campaign",
    name: "✅ MANTER Campaign - Stable Performance",
    productPrice: 49.99,
    cog: 20.00,
  };

  // Campaign 3: SCALE - High margin, excellent ROAS
  const scaleCampaign = {
    id: "mock_scale_campaign",
    name: "📈 SCALE Campaign - High Margin",
    productPrice: 59.99,
    cog: 18.00, // Lower COG for better margin
  };

  const mockData: DailyROASData[] = [];

  // Generate data for KILL campaign
  dates.forEach((date, dayIndex) => {
    const dayNumber = dates.length - dayIndex; // Day 1 is the oldest, day 30 is today
    
    // KILL Campaign: High spend, no sales, negative margin
    const killSpend = dayNumber === 1 ? 8.0 : 15.0; // Day 1: 8 (above 7), Days 2+: 15
    const killCPC = dayNumber === 1 ? 0.35 : 0.40; // Above threshold (0.30 for low market)
    const killPurchases = 0; // No sales
    const killATC = 0;
    const killRevenue = 0; // No sales = no revenue
    const killUnitsSold = 0;
    const killROAS = 0;
    const killMarginEuros = killRevenue - (killUnitsSold * killCampaign.cog) - killSpend;
    const killMarginPercentage = killRevenue > 0 ? (killMarginEuros / killRevenue) * 100 : -100;

    mockData.push({
      id: `mock_daily_roas_kill_${date}`,
      user_id: userId,
      campaign_id: killCampaign.id,
      campaign_name: killCampaign.name,
      date: date,
      total_spent: killSpend,
      cpc: killCPC,
      atc: killATC,
      purchases: killPurchases,
      product_price: killCampaign.productPrice,
      cog: killCampaign.cog,
      units_sold: killUnitsSold,
      roas: killROAS,
      margin_euros: parseFloat(killMarginEuros.toFixed(2)),
      margin_percentage: parseFloat(killMarginPercentage.toFixed(2)),
      decision: "KILL",
      decision_reason: dayNumber === 1 
        ? "Alto gasto sem vendas no primeiro dia" 
        : "Margem negativa",
    });
  });

  // Generate data for MANTER campaign
  dates.forEach((date, dayIndex) => {
    const dayNumber = dates.length - dayIndex;
    
    // MANTER Campaign: Medium performance, positive but low margin (0-15%)
    const manterSpend = 10.0;
    const manterCPC = 0.25; // Below threshold (0.30 for low market)
    const targetMargin = dayNumber === 1 ? 8.0 : 10.0; // Day 1: 8%, Days 2+: 10%
    
    // Calculate to achieve target margin: margin = (revenue - COG - spend) / revenue
    // revenue = (COG + spend) / (1 - margin/100)
    // For simplicity, set units sold first, then calculate
    const manterUnitsSold = 1; // At least 1 unit
    const manterRevenue = manterUnitsSold * manterCampaign.productPrice;
    const manterCOG = manterUnitsSold * manterCampaign.cog;
    const manterMarginEuros = manterRevenue - manterCOG - manterSpend;
    const manterMarginPercentage = manterRevenue > 0 ? (manterMarginEuros / manterRevenue) * 100 : 0;
    
    // Adjust spend to match target margin if needed
    const adjustedSpend = manterRevenue > 0 ? manterRevenue - manterCOG - (manterRevenue * targetMargin / 100) : manterSpend;
    const finalSpend = Math.max(manterSpend, adjustedSpend);
    const finalMarginEuros = manterRevenue - manterCOG - finalSpend;
    const finalMarginPercentage = manterRevenue > 0 ? (finalMarginEuros / manterRevenue) * 100 : 0;
    const finalROAS = finalSpend > 0 ? manterRevenue / finalSpend : 0;
    
    const manterPurchases = Math.floor(manterUnitsSold * 0.85);
    const manterATC = Math.floor(manterPurchases * 1.2);

    mockData.push({
      id: `mock_daily_roas_manter_${date}`,
      user_id: userId,
      campaign_id: manterCampaign.id,
      campaign_name: manterCampaign.name,
      date: date,
      total_spent: parseFloat(finalSpend.toFixed(2)),
      cpc: manterCPC,
      atc: manterATC,
      purchases: manterPurchases,
      product_price: manterCampaign.productPrice,
      cog: manterCampaign.cog,
      units_sold: manterUnitsSold,
      roas: parseFloat(finalROAS.toFixed(2)),
      margin_euros: parseFloat(finalMarginEuros.toFixed(2)),
      margin_percentage: parseFloat(Math.max(0, Math.min(15, finalMarginPercentage)).toFixed(2)),
      decision: "MANTER",
      decision_reason: dayNumber === 1 
        ? "Vendas com CPC baixo no primeiro dia" 
        : "Margem e ROAS aceitáveis",
    });
  });

  // Generate data for SCALE campaign
  dates.forEach((date, dayIndex) => {
    const dayNumber = dates.length - dayIndex;
    
    // SCALE Campaign: High margin (>15%), excellent ROAS
    const scaleSpend = 12.0;
    const scaleCPC = 0.20; // Low CPC
    // Ensure margin is >15% for SCALE (days 2+)
    const targetMargin = dayNumber === 1 ? 12.0 : 22.0; // Day 1: 12%, Days 2+: 22%
    
    // Calculate to achieve target margin
    // For target margin, we need: revenue = (COG + spend) / (1 - margin/100)
    // Let's set units sold to get good revenue
    const scaleUnitsSold = dayNumber === 1 ? 1 : 2; // More units for better margin
    const scaleRevenue = scaleUnitsSold * scaleCampaign.productPrice;
    const scaleCOG = scaleUnitsSold * scaleCampaign.cog;
    const scaleMarginEuros = scaleRevenue - scaleCOG - scaleSpend;
    const scaleMarginPercentage = scaleRevenue > 0 ? (scaleMarginEuros / scaleRevenue) * 100 : 0;
    
    // Adjust to ensure we hit target margin
    const requiredRevenue = (scaleCOG + scaleSpend) / (1 - targetMargin / 100);
    const adjustedUnitsSold = Math.max(scaleUnitsSold, Math.ceil(requiredRevenue / scaleCampaign.productPrice));
    const finalRevenue = adjustedUnitsSold * scaleCampaign.productPrice;
    const finalCOG = adjustedUnitsSold * scaleCampaign.cog;
    const finalMarginEuros = finalRevenue - finalCOG - scaleSpend;
    const finalMarginPercentage = finalRevenue > 0 ? (finalMarginEuros / finalRevenue) * 100 : 0;
    const finalROAS = finalRevenue / scaleSpend;
    
    const scalePurchases = Math.floor(adjustedUnitsSold * 0.90);
    const scaleATC = Math.floor(scalePurchases * 1.15);

    mockData.push({
      id: `mock_daily_roas_scale_${date}`,
      user_id: userId,
      campaign_id: scaleCampaign.id,
      campaign_name: scaleCampaign.name,
      date: date,
      total_spent: scaleSpend,
      cpc: scaleCPC,
      atc: scaleATC,
      purchases: scalePurchases,
      product_price: scaleCampaign.productPrice,
      cog: scaleCampaign.cog,
      units_sold: adjustedUnitsSold,
      roas: parseFloat(finalROAS.toFixed(2)),
      margin_euros: parseFloat(finalMarginEuros.toFixed(2)),
      margin_percentage: parseFloat(Math.max(targetMargin, finalMarginPercentage).toFixed(2)),
      decision: dayNumber === 1 ? "MANTER" : "SCALE", // Day 1 always MANTER, then SCALE
      decision_reason: dayNumber === 1 
        ? "Vendas no primeiro dia" 
        : "Margem alta e ROAS excelente",
    });
  });

  return mockData;
};

