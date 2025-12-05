import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

interface CampaignData {
  id: string;
  name: string;
  status: string;
  spent: number;
  results: number;
  cpc: number;
  roas: number;
  impressions?: number;
  clicks?: number;
  budget?: string;
}

interface AlertEmailRequest {
  email: string;
  language: "pt" | "en";
  campaign: CampaignData;
  alertType: string;
  operator: string;
  thresholdValue: number;
  currentValue: number;
}

const TRANSLATIONS = {
  pt: {
    title: "Alerta de Campanha Acionado",
    subtitle: "O seu alerta de campanha foi acionado:",
    metric: "Métrica",
    condition: "Condição",
    currentValue: "Valor Atual",
    campaignDetails: "Detalhes da Campanha",
    campaignName: "Nome da Campanha",
    campaignId: "ID da Campanha",
    status: "Estado",
    spent: "Montante Gasto",
    results: "Resultados",
    cpc: "CPC",
    roas: "ROAS",
    impressions: "Impressões",
    clicks: "Cliques",
    budget: "Orçamento",
    viewCampaign: "Ver Campanha",
    footer: "Está a receber este email porque configurou um alerta para esta campanha.",
    reachedOrExceeded: "atingiu ou ultrapassou",
    droppedToOrBelow: "desceu para ou abaixo de",
    equals: "é igual a",
    active: "Ativa",
    paused: "Pausada",
  },
  en: {
    title: "Campaign Alert Triggered",
    subtitle: "Your campaign alert has been triggered:",
    metric: "Metric",
    condition: "Condition",
    currentValue: "Current Value",
    campaignDetails: "Campaign Details",
    campaignName: "Campaign Name",
    campaignId: "Campaign ID",
    status: "Status",
    spent: "Amount Spent",
    results: "Results",
    cpc: "CPC",
    roas: "ROAS",
    impressions: "Impressions",
    clicks: "Clicks",
    budget: "Budget",
    viewCampaign: "View Campaign",
    footer: "You're receiving this because you set up an alert for this campaign.",
    reachedOrExceeded: "reached or exceeded",
    droppedToOrBelow: "dropped to or below",
    equals: "equals",
    active: "Active",
    paused: "Paused",
  },
};

const METRIC_LABELS: Record<string, { pt: string; en: string }> = {
  results: { pt: "Resultados", en: "Results" },
  spent: { pt: "Montante Gasto", en: "Amount Spent" },
  cpc: { pt: "CPC", en: "CPC" },
  roas: { pt: "ROAS", en: "ROAS" },
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-campaign-alert-email function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY not configured");
    }

    const { email, language = "pt", campaign, alertType, operator, thresholdValue, currentValue }: AlertEmailRequest = await req.json();

    console.log(`Sending alert email to ${email} for campaign ${campaign.name} in ${language}`);

    const t = TRANSLATIONS[language] || TRANSLATIONS.pt;
    const metricLabel = METRIC_LABELS[alertType]?.[language] || alertType;
    const operatorLabel = operator === ">=" ? t.reachedOrExceeded : operator === "<=" ? t.droppedToOrBelow : t.equals;
    const statusLabel = campaign.status === "ACTIVE" ? t.active : t.paused;

    const emailContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
        <div style="background: linear-gradient(135deg, #0066FF 0%, #7BBCFE 50%, #B8A8FE 100%); padding: 30px; border-radius: 16px 16px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ ${t.title}</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #333; margin-bottom: 24px;">
            ${t.subtitle}
          </p>
          
          <!-- Alert Info -->
          <div style="background: #FEF3C7; padding: 20px; border-radius: 12px; border-left: 4px solid #F59E0B; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #92400E; font-weight: 600;">${t.metric}:</td>
                <td style="padding: 8px 0; color: #92400E;">${metricLabel}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #92400E; font-weight: 600;">${t.condition}:</td>
                <td style="padding: 8px 0; color: #92400E;">${operatorLabel} ${thresholdValue}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #92400E; font-weight: 600;">${t.currentValue}:</td>
                <td style="padding: 8px 0; color: #B45309; font-weight: bold; font-size: 18px;">
                  ${alertType === "spent" || alertType === "cpc" ? "€" : ""}${currentValue.toFixed(2)}${alertType === "roas" ? "x" : ""}
                </td>
              </tr>
            </table>
          </div>
          
          <!-- Campaign Details -->
          <h2 style="font-size: 18px; color: #333; margin-bottom: 16px; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px;">
            📊 ${t.campaignDetails}
          </h2>
          
          <div style="background: #F9FAFB; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #E5E7EB;">${t.campaignName}</td>
                <td style="padding: 10px 0; color: #111827; font-weight: 600; border-bottom: 1px solid #E5E7EB;">${campaign.name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #E5E7EB;">${t.status}</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #E5E7EB;">
                  <span style="background: ${campaign.status === "ACTIVE" ? "#D1FAE5" : "#FEF3C7"}; color: ${campaign.status === "ACTIVE" ? "#065F46" : "#92400E"}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                    ${statusLabel}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #E5E7EB;">${t.spent}</td>
                <td style="padding: 10px 0; color: #111827; font-weight: 600; border-bottom: 1px solid #E5E7EB;">€${campaign.spent.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #E5E7EB;">${t.results}</td>
                <td style="padding: 10px 0; color: #111827; font-weight: 600; border-bottom: 1px solid #E5E7EB;">${campaign.results}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #E5E7EB;">${t.cpc}</td>
                <td style="padding: 10px 0; color: #111827; font-weight: 600; border-bottom: 1px solid #E5E7EB;">€${campaign.cpc.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #E5E7EB;">${t.roas}</td>
                <td style="padding: 10px 0; color: #111827; font-weight: 600; border-bottom: 1px solid #E5E7EB;">${campaign.roas > 0 ? campaign.roas.toFixed(2) + "x" : "—"}</td>
              </tr>
              ${campaign.impressions !== undefined ? `
              <tr>
                <td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #E5E7EB;">${t.impressions}</td>
                <td style="padding: 10px 0; color: #111827; font-weight: 600; border-bottom: 1px solid #E5E7EB;">${campaign.impressions.toLocaleString()}</td>
              </tr>
              ` : ""}
              ${campaign.clicks !== undefined ? `
              <tr>
                <td style="padding: 10px 0; color: #6B7280; border-bottom: 1px solid #E5E7EB;">${t.clicks}</td>
                <td style="padding: 10px 0; color: #111827; font-weight: 600; border-bottom: 1px solid #E5E7EB;">${campaign.clicks.toLocaleString()}</td>
              </tr>
              ` : ""}
              ${campaign.budget ? `
              <tr>
                <td style="padding: 10px 0; color: #6B7280;">${t.budget}</td>
                <td style="padding: 10px 0; color: #111827; font-weight: 600;">${campaign.budget}</td>
              </tr>
              ` : ""}
            </table>
          </div>
          
          <p style="font-size: 12px; color: #9CA3AF; margin-top: 8px;">
            ${t.campaignId}: <code style="background: #F3F4F6; padding: 2px 8px; border-radius: 4px; font-family: monospace;">${campaign.id}</code>
          </p>
          
          <div style="text-align: center; margin-top: 24px;">
            <a href="https://cygvvrtsdatdczswcrqj.lovableproject.com/meta-dashboard" style="display: inline-block; background: linear-gradient(135deg, #0066FF 0%, #7BBCFE 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              ${t.viewCampaign}
            </a>
          </div>
        </div>
        
        <p style="text-align: center; font-size: 12px; color: #9CA3AF; margin-top: 24px;">
          ${t.footer}
        </p>
      </body>
      </html>
    `;

    const subjectPrefix = language === "pt" ? "Alerta" : "Alert";

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: language === "pt" ? "Alertas de Campanha" : "Campaign Alerts",
          email: "alerts@dropmetrics.io",
        },
        to: [{ email }],
        subject: `⚠️ ${subjectPrefix}: ${campaign.name} - ${metricLabel} ${operator} ${thresholdValue}`,
        htmlContent: emailContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Brevo API error:", errorText);
      throw new Error(`Failed to send email: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("Email sent successfully:", result);

    return new Response(JSON.stringify({ success: true, messageId: result.messageId }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-campaign-alert-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
