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
    const { email, name } = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    console.log(`📧 Sending test email to: ${email}`);

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
            email: email,
            name: name || 'Cliente',
          },
        ],
        subject: '✅ Teste de Email - Sheet Tools',
        htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 40px auto; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px; margin-bottom: 30px; }
    .header h1 { color: white; margin: 0; }
    .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Sheet Tools</h1>
    </div>
    <div class="success-icon">✅</div>
    <h2 style="text-align: center;">Email de Teste</h2>
    <p>Olá <strong>${name || 'Cliente'}</strong>!</p>
    <p>Este é um email de teste para confirmar que a integração com Brevo está a funcionar corretamente.</p>
    <p>Se recebeu este email, significa que:</p>
    <ul>
      <li>✅ A API key do Brevo está configurada</li>
      <li>✅ A edge function consegue enviar emails</li>
      <li>✅ O sistema está pronto para enviar emails de retenção</li>
    </ul>
    <div class="footer">
      <p><strong>Sheet Tools</strong> - Gestão Inteligente de Facebook Ads</p>
      <p style="font-size: 12px; color: #999;">Data: ${new Date().toLocaleString('pt-PT')}</p>
    </div>
  </div>
</body>
</html>
        `,
        tags: ['test', 'brevo-integration'],
      }),
    });

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      console.error('❌ Brevo API error:', errorText);
      throw new Error(`Brevo API error: ${errorText}`);
    }

    const responseData = await brevoResponse.json();
    console.log('✅ Email sent successfully via Brevo:', responseData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email de teste enviado com sucesso!',
        messageId: responseData.messageId,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error sending test email:', error);
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
