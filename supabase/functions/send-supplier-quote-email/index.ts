import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { supplierEmail, supplierName, quoteLink, hasPassword } = await req.json();

    if (!supplierEmail || !supplierName || !quoteLink) {
      throw new Error('Missing required fields');
    }

    console.log(`📧 Sending quote email to: ${supplierEmail}`);

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY || '',
      },
      body: JSON.stringify({
        sender: {
          name: 'Sheet Tools',
          email: 'no-reply@sheettools.app',
        },
        to: [
          {
            email: supplierEmail,
            name: supplierName,
          },
        ],
        subject: 'Price Quote Request - Sheet Tools',
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 40px auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px; margin-bottom: 30px; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { margin: 30px 0; }
    .content h2 { color: #333; font-size: 22px; margin-bottom: 15px; }
    .content p { color: #555; margin-bottom: 15px; }
    .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .button:hover { opacity: 0.9; }
    .info-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px; }
    .warning { color: #e74c3c; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Sheet Tools</h1>
    </div>
    <div class="content">
      <h2>Hello ${supplierName},</h2>
      <p>You have been invited to submit a price quote for a selection of products.</p>
      
      <div class="info-box">
        <p><strong>What you need to do:</strong></p>
        <ul>
          <li>Click the button below to access the quote form</li>
          ${hasPassword ? '<li class="warning">⚠️ You will need a password to access this quote (provided separately)</li>' : ''}
          <li>Review the products and enter your pricing</li>
          <li>Add any relevant notes or comments</li>
          <li>Save your quotes when ready</li>
        </ul>
      </div>

      <div style="text-align: center;">
        <a href="${quoteLink}" class="button">Access Quote Form</a>
      </div>

      <p style="margin-top: 30px; font-size: 14px; color: #666;">
        <strong>Note:</strong> This link is unique and persistent. You can return to update your quotes at any time.
      </p>
    </div>
    <div class="footer">
      <p><strong>Sheet Tools</strong> - Smart Facebook Ads Management</p>
      <p style="font-size: 12px; color: #999;">Date: ${new Date().toLocaleString('en-US')}</p>
    </div>
  </div>
</body>
</html>
        `,
        tags: ['supplier-quote', 'quotation-request'],
      }),
    });

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      console.error('❌ Brevo API error:', errorText);
      throw new Error(`Brevo API error: ${errorText}`);
    }

    const responseData = await brevoResponse.json();
    console.log('✅ Quote email sent successfully:', responseData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Quote email sent successfully!',
        messageId: responseData.messageId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error sending quote email:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
