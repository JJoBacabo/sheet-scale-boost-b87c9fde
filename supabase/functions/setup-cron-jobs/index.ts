import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔧 Setting up cron jobs...');

    // Create cron job for subscription state manager (daily at 2 AM)
    const stateManagerSql = `
      SELECT cron.schedule(
        'subscription-state-manager-daily',
        '0 2 * * *',
        $$
        SELECT net.http_post(
          url:='${supabaseUrl}/functions/v1/subscription-state-manager',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${supabaseKey}"}'::jsonb,
          body:=concat('{"time": "', now(), '"}')::jsonb
        ) as request_id;
        $$
      );
    `;

    // Create cron job for retention emails (daily at 10 AM)
    const retentionEmailsSql = `
      SELECT cron.schedule(
        'send-retention-emails-daily',
        '0 10 * * *',
        $$
        SELECT net.http_post(
          url:='${supabaseUrl}/functions/v1/send-retention-emails',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${supabaseKey}"}'::jsonb,
          body:=concat('{"time": "', now(), '"}')::jsonb
        ) as request_id;
        $$
      );
    `;

    console.log('📅 Creating subscription state manager cron job...');
    const { error: stateError } = await supabase.rpc('exec_sql', { sql: stateManagerSql });
    if (stateError) {
      console.error('Error creating state manager cron:', stateError);
    } else {
      console.log('✅ State manager cron job created');
    }

    console.log('📧 Creating retention emails cron job...');
    const { error: emailError } = await supabase.rpc('exec_sql', { sql: retentionEmailsSql });
    if (emailError) {
      console.error('Error creating retention emails cron:', emailError);
    } else {
      console.log('✅ Retention emails cron job created');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cron jobs configured successfully',
        jobs: [
          { name: 'subscription-state-manager-daily', schedule: '0 2 * * * (Daily at 2 AM)' },
          { name: 'send-retention-emails-daily', schedule: '0 10 * * * (Daily at 10 AM)' },
        ],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in setup-cron-jobs:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
