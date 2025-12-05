import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

interface AlertEmailRequest {
  email: string;
  campaignId: string;
  alertType: string;
  operator: string;
  thresholdValue: number;
  currentValue: number;
}

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

    const { email, campaignId, alertType, operator, thresholdValue, currentValue }: AlertEmailRequest = await req.json();

    console.log(`Sending alert email to ${email} for campaign ${campaignId}`);

    const metricLabel = METRIC_LABELS[alertType]?.en || alertType;
    const operatorLabel = operator === ">=" ? "reached or exceeded" : operator === "<=" ? "dropped to or below" : "equals";

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0066FF 0%, #7BBCFE 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Campaign Alert Triggered</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e9ecef; border-top: none;">
          <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
            Your campaign alert has been triggered:
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
            <p style="margin: 0 0 10px 0; color: #666;">
              <strong>Metric:</strong> ${metricLabel}
            </p>
            <p style="margin: 0 0 10px 0; color: #666;">
              <strong>Condition:</strong> ${operatorLabel} ${thresholdValue}
            </p>
            <p style="margin: 0; color: #666;">
              <strong>Current Value:</strong> <span style="color: #f59e0b; font-weight: bold;">${currentValue.toFixed(2)}</span>
            </p>
          </div>
          <p style="font-size: 14px; color: #666;">
            Campaign ID: <code style="background: #e9ecef; padding: 2px 6px; border-radius: 4px;">${campaignId}</code>
          </p>
          <a href="https://app.example.com/meta-dashboard" style="display: inline-block; background: #0066FF; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px;">
            View Campaign
          </a>
        </div>
        <p style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">
          You're receiving this because you set up an alert for this campaign.
        </p>
      </div>
    `;

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "api-key": BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: "Campaign Alerts",
          email: "alerts@app.com",
        },
        to: [{ email }],
        subject: `⚠️ Alert: ${metricLabel} ${operator} ${thresholdValue}`,
        htmlContent: emailContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Brevo API error:", errorText);
      throw new Error(`Failed to send email: ${response.status}`);
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
