import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
const APP_URL = Deno.env.get('APP_URL') || 'https://sheettools.app';
const DISCOUNT_PERCENT = parseInt(Deno.env.get('RETENTION_DISCOUNT_PERCENT') || '20');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HTML Email Templates
const getEmailTemplate = (
  daysSinceExpiry: number,
  userName: string,
  planName: string,
  checkoutUrl: string,
  discountPercent: number
) => {
  const templates = {
    0: {
      subject: `⚠️ A sua assinatura ${planName} expirou`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .discount-badge { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0; }
    .discount-badge h2 { margin: 0 0 10px 0; font-size: 32px; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; transition: transform 0.2s; }
    .cta-button:hover { transform: translateY(-2px); }
    .features { margin: 30px 0; }
    .feature-item { padding: 12px 0; border-bottom: 1px solid #eee; }
    .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Assinatura Expirada</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${userName}</strong>,</p>
      
      <p>A sua assinatura <strong>${planName}</strong> expirou. Neste momento, a sua conta está em <strong>modo de leitura</strong> por mais 7 dias.</p>
      
      <div class="alert-box">
        <strong>📅 Período de Graça:</strong> Tem até <strong>${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-PT')}</strong> para reativar com acesso total aos seus dados.
      </div>

      <div class="discount-badge">
        <h2>🎉 ${discountPercent}% de Desconto!</h2>
        <p style="margin: 0;">Oferta especial de reativação válida por 7 dias</p>
      </div>

      <div class="features">
        <h3>O que perde sem a assinatura ativa:</h3>
        <div class="feature-item">❌ Criação e edição de campanhas</div>
        <div class="feature-item">❌ Sincronização automática com Facebook Ads</div>
        <div class="feature-item">❌ Análises avançadas e relatórios</div>
        <div class="feature-item">❌ Integrações com Shopify</div>
      </div>

      <div style="text-align: center; margin: 40px 0;">
        <a href="${checkoutUrl}" class="cta-button">
          Reativar Agora com ${discountPercent}% OFF
        </a>
      </div>

      <p style="color: #666; font-size: 14px;">
        <strong>Lembrete:</strong> Após 7 dias, a sua conta será suspensa e não poderá aceder aos seus dados até reativar.
      </p>
    </div>
    <div class="footer">
      <p>Sheet Tools - Gestão Inteligente de Facebook Ads</p>
      <p style="font-size: 12px; color: #999;">Esta é uma mensagem automática do sistema de assinaturas.</p>
    </div>
  </div>
</body>
</html>
      `,
    },
    5: {
      subject: `⏰ Última chance: ${discountPercent}% desconto termina em breve`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .urgent-box { background: #ffebee; border: 2px solid #d32f2f; padding: 25px; margin: 20px 0; border-radius: 8px; text-align: center; }
    .countdown { background: #d32f2f; color: white; padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0; }
    .countdown h2 { margin: 0 0 10px 0; font-size: 48px; font-weight: bold; }
    .cta-button { display: inline-block; background: #d32f2f; color: white; padding: 18px 50px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; margin: 20px 0; transition: all 0.3s; box-shadow: 0 4px 15px rgba(211, 47, 47, 0.4); }
    .cta-button:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(211, 47, 47, 0.5); }
    .content { padding: 40px 30px; }
    .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Últimos 2 Dias!</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${userName}</strong>,</p>
      
      <div class="urgent-box">
        <h2 style="color: #d32f2f; margin: 0 0 10px 0;">🚨 AÇÃO URGENTE NECESSÁRIA</h2>
        <p style="margin: 0; font-size: 16px;">Faltam apenas <strong>48 horas</strong> antes da sua conta ser suspensa!</p>
      </div>

      <p>A sua conta Sheet Tools está prestes a ser suspensa. Após a suspensão, <strong>não poderá aceder aos seus dados</strong> até reativar a assinatura.</p>

      <div class="countdown">
        <p style="margin: 0; font-size: 18px; opacity: 0.9;">Tempo Restante</p>
        <h2>48h</h2>
        <p style="margin: 0; font-size: 16px;">Até Suspensão Total</p>
      </div>

      <div style="background: #e8f5e9; padding: 25px; border-radius: 8px; border-left: 4px solid #4caf50; margin: 30px 0;">
        <h3 style="margin: 0 0 15px 0; color: #2e7d32;">💎 Oferta Exclusiva de Reativação</h3>
        <p style="margin: 0; font-size: 18px;"><strong>${discountPercent}% de desconto</strong> válido apenas nas próximas 48 horas</p>
        <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">Poupe até €${(99 * discountPercent / 100).toFixed(0)} na sua assinatura anual</p>
      </div>

      <div style="text-align: center; margin: 40px 0;">
        <a href="${checkoutUrl}" class="cta-button">
          🔥 Reativar Agora com ${discountPercent}% OFF
        </a>
        <p style="font-size: 12px; color: #999; margin-top: 10px;">Oferta expira em 48 horas</p>
      </div>

      <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <p style="margin: 0; font-size: 14px;"><strong>⚠️ O que acontece se não reativar:</strong></p>
        <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px;">
          <li>Perda total de acesso aos dados e campanhas</li>
          <li>Impossibilidade de gerir anúncios do Facebook</li>
          <li>Interrupção de todas as sincronizações automáticas</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p>Sheet Tools - Gestão Inteligente de Facebook Ads</p>
      <p style="font-size: 12px; color: #999;">Não perca esta oportunidade de reativar com desconto!</p>
    </div>
  </div>
</body>
</html>
      `,
    },
    10: {
      subject: `🚨 Ação imediata: Conta será arquivada em 4 dias`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .header { background: #b71c1c; padding: 40px 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .critical-alert { background: #ffebee; border: 3px solid #b71c1c; padding: 30px; margin: 20px 0; border-radius: 8px; }
    .critical-alert h2 { color: #b71c1c; margin: 0 0 15px 0; font-size: 24px; }
    .timeline { background: #f5f5f5; padding: 25px; border-radius: 8px; margin: 30px 0; }
    .timeline-item { padding: 15px; margin: 10px 0; background: white; border-radius: 6px; border-left: 4px solid #b71c1c; }
    .cta-button { display: inline-block; background: #b71c1c; color: white; padding: 20px 60px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; margin: 30px 0; transition: all 0.3s; box-shadow: 0 6px 20px rgba(183, 28, 28, 0.4); }
    .cta-button:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(183, 28, 28, 0.5); }
    .content { padding: 40px 30px; }
    .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 AVISO FINAL</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${userName}</strong>,</p>
      
      <div class="critical-alert">
        <h2>⚠️ AÇÃO IMEDIATA NECESSÁRIA</h2>
        <p style="margin: 0; font-size: 18px;">A sua conta está suspensa há 10 dias e será <strong>ARQUIVADA PERMANENTEMENTE</strong> em apenas <strong style="color: #b71c1c; font-size: 22px;">4 dias</strong>.</p>
      </div>

      <p style="font-size: 16px;">Esta é a sua <strong>última oportunidade</strong> de recuperar o acesso completo aos seus dados antes do arquivamento permanente.</p>

      <div class="timeline">
        <h3 style="margin: 0 0 20px 0;">📅 Cronologia dos Acontecimentos:</h3>
        <div class="timeline-item">
          <strong>Dia 0:</strong> Assinatura expirou ✓
        </div>
        <div class="timeline-item">
          <strong>Dia 7:</strong> Conta suspensa ✓
        </div>
        <div class="timeline-item" style="border-left-color: #ff9800; background: #fff3e0;">
          <strong>DIA 10 (HOJE):</strong> Último aviso - 4 dias até arquivamento ⚠️
        </div>
        <div class="timeline-item" style="border-left-color: #f44336;">
          <strong>Dia 14:</strong> Dados anonimizados permanentemente (RGPD) 🗄️
        </div>
      </div>

      <div style="background: #ffebee; padding: 30px; border-radius: 8px; margin: 30px 0; border: 2px solid #b71c1c;">
        <h3 style="margin: 0 0 15px 0; color: #b71c1c;">🗄️ O que é o Arquivamento?</h3>
        <p style="margin: 0 0 15px 0;">De acordo com o RGPD, após 14 dias de inatividade:</p>
        <ul style="margin: 0; padding-left: 20px;">
          <li><strong>Seus dados pessoais serão anonimizados</strong></li>
          <li><strong>Todas as campanhas e configurações serão removidas</strong></li>
          <li><strong>Não será possível recuperar os dados</strong></li>
          <li><strong>Terá de começar do zero numa nova conta</strong></li>
        </ul>
      </div>

      <div style="text-align: center; margin: 40px 0;">
        <a href="${checkoutUrl}" class="cta-button">
          🆘 Recuperar Conta Agora
        </a>
        <p style="font-size: 14px; color: #666; margin-top: 15px;">Esta é a sua última oportunidade antes do arquivamento permanente</p>
      </div>

      <div style="background: #e3f2fd; padding: 25px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #2196f3;">
        <h4 style="margin: 0 0 10px 0; color: #1565c0;">💡 Alternativa: Pausar o Plano</h4>
        <p style="margin: 0; font-size: 14px;">Se não pode reativar agora mas não quer perder os dados, considere <strong>pausar o plano</strong> em vez de deixar arquivar. <a href="${APP_URL}/settings" style="color: #2196f3;">Contacte-nos</a> para saber mais.</p>
      </div>

      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">📊 O que vai perder:</p>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
          <li>Histórico completo de campanhas</li>
          <li>Dados de performance e ROAS</li>
          <li>Integrações com Facebook e Shopify</li>
          <li>Todas as configurações personalizadas</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p><strong>Sheet Tools</strong> - Gestão Inteligente de Facebook Ads</p>
      <p style="font-size: 12px; color: #999; margin: 10px 0;">Precisa de ajuda? Responda a este email.</p>
      <p style="font-size: 11px; color: #bbb;">Av. da Liberdade, Lisboa • suporte@sheettools.app</p>
    </div>
  </div>
</body>
</html>
      `,
    },
  };

  return templates[daysSinceExpiry as keyof typeof templates] || templates[0];
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('📧 Starting Brevo retention email sender...');

    const now = new Date();
    const results = { sent: 0, skipped: 0, errors: [] as string[] };

    // Get all expired/suspended subscriptions
    const { data: subscriptions, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select(`
        *,
        profiles!inner(full_name, user_id)
      `)
      .in('state', ['expired', 'suspended']);

    if (fetchError) {
      console.error('❌ Error fetching subscriptions:', fetchError);
      throw fetchError;
    }

    for (const sub of subscriptions || []) {
      // Calculate days since expiry
      const expiryDate = new Date(sub.current_period_end);
      const daysSinceExpiry = Math.floor((now.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24));

      // Send emails on D+0, D+5, D+10
      if (![0, 5, 10].includes(daysSinceExpiry)) {
        results.skipped++;
        continue;
      }

      // Get user email from auth
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(sub.user_id);
      
      if (!authUser?.user?.email) {
        console.warn(`⚠️  No email for user ${sub.user_id}`);
        results.skipped++;
        continue;
      }

      const checkoutUrl = `${APP_URL}/billing?plan=${sub.plan_code}&discount=${DISCOUNT_PERCENT}`;
      const userName = (sub.profiles as any)?.full_name || 'Cliente';
      const template = getEmailTemplate(
        daysSinceExpiry,
        userName,
        sub.plan_name,
        checkoutUrl,
        DISCOUNT_PERCENT
      );

      try {
        // Send email via Brevo API
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
                email: authUser.user.email,
                name: userName,
              },
            ],
            subject: template.subject,
            htmlContent: template.html,
            tags: [`retention-d${daysSinceExpiry}`, 'subscription-recovery'],
          }),
        });

        if (!brevoResponse.ok) {
          const errorText = await brevoResponse.text();
          console.error(`❌ Brevo API error for ${authUser.user.email}:`, errorText);
          results.errors.push(`${authUser.user.email}: ${errorText}`);
          continue;
        }

        results.sent++;
        console.log(`✅ Sent D+${daysSinceExpiry} email to ${authUser.user.email} via Brevo`);

        // Log the email send
        await supabaseAdmin.from('audit_logs').insert({
          user_id: sub.user_id,
          subscription_id: sub.id,
          event_type: 'retention_email_sent',
          event_data: {
            days_since_expiry: daysSinceExpiry,
            discount_offered: DISCOUNT_PERCENT,
            email: authUser.user.email,
            provider: 'brevo',
            template: template.subject,
          },
        });
      } catch (error) {
        console.error(`❌ Failed to send email to ${authUser.user.email}:`, error);
        results.errors.push(`${authUser.user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('✅ Brevo retention email sender completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: now.toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Fatal error in retention email sender:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
