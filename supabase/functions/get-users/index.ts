import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://cygvvrtsdatdczswcrqj.supabase.co',
  'https://sheet-tools.com',
  'https://www.sheet-tools.com',
];

function getCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) 
    ? origin 
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all users from auth - try to get all at once first
    let allUsers: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        // Try with page parameter first
        const { data, error: listError } = await supabase.auth.admin.listUsers({
          page,
          perPage: 1000
        });
        
        if (listError) {
          // If page/perPage doesn't work, try without parameters
          if (page === 1) {
            const { data: allData, error: allError } = await supabase.auth.admin.listUsers();
            if (allError) {
              return new Response(
                JSON.stringify({ error: 'Failed to list users: ' + allError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
            if (allData?.users) {
              allUsers = allData.users;
            }
            hasMore = false;
            break;
          } else {
            hasMore = false;
            break;
          }
        }

        if (data?.users && data.users.length > 0) {
          allUsers = [...allUsers, ...data.users];
          // Continue if we got a full page
          hasMore = data.users.length === 1000;
          page++;
        } else {
          hasMore = false;
        }
      } catch (err) {
        // If pagination fails, try to get all at once
        if (page === 1) {
          const { data: allData, error: allError } = await supabase.auth.admin.listUsers();
          if (allError) {
            return new Response(
              JSON.stringify({ error: 'Failed to list users: ' + allError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          if (allData?.users) {
            allUsers = allData.users;
          }
        }
        hasMore = false;
        break;
      }
    }

    const users = allUsers;
    console.log(`Fetched ${users.length} users from auth`);

    // Get all profiles with pagination
    let allProfiles: any[] = [];
    let from = 0;
    const pageSize = 1000;
    hasMore = true;

    while (hasMore) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .range(from, from + pageSize - 1);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        break;
      }

      if (profiles && profiles.length > 0) {
        allProfiles = [...allProfiles, ...profiles];
        hasMore = profiles.length === pageSize;
        from += pageSize;
      } else {
        hasMore = false;
      }
    }

    const profiles = allProfiles;
    console.log(`Fetched ${profiles.length} profiles`);

    // Get all subscriptions with pagination
    let allSubscriptions: any[] = [];
    from = 0;
    hasMore = true;

    while (hasMore) {
      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .range(from, from + pageSize - 1);

      if (subsError) {
        console.error('Error fetching subscriptions:', subsError);
        break;
      }

      if (subscriptions && subscriptions.length > 0) {
        allSubscriptions = [...allSubscriptions, ...subscriptions];
        hasMore = subscriptions.length === pageSize;
        from += pageSize;
      } else {
        hasMore = false;
      }
    }

    const subscriptions = allSubscriptions;
    console.log(`Fetched ${subscriptions.length} subscriptions`);

    // Get all ticket counts with pagination
    let allTickets: any[] = [];
    from = 0;
    hasMore = true;

    while (hasMore) {
      const { data: tickets, error: ticketsError } = await supabase
        .from('support_chats')
        .select('user_id')
        .range(from, from + pageSize - 1);

      if (ticketsError) {
        console.error('Error fetching tickets:', ticketsError);
        break;
      }

      if (tickets && tickets.length > 0) {
        allTickets = [...allTickets, ...tickets];
        hasMore = tickets.length === pageSize;
        from += pageSize;
      } else {
        hasMore = false;
      }
    }

    const tickets = allTickets;
    console.log(`Fetched ${tickets.length} tickets`);

    const ticketCounts: Record<string, number> = {};
    (tickets || []).forEach(t => {
      ticketCounts[t.user_id] = (ticketCounts[t.user_id] || 0) + 1;
    });

    // Merge data
    const usersWithData = users.map(authUser => {
      const profile = (profiles || []).find(p => p.user_id === authUser.id);
      const subscription = (subscriptions || []).find(s => s.user_id === authUser.id);
      
      return {
        id: authUser.id,
        email: authUser.email || '',
        full_name: profile?.full_name || null,
        company_name: profile?.company_name || null,
        subscription_plan: profile?.subscription_plan || 'free',
        subscription_status: profile?.subscription_status || 'active',
        created_at: profile?.created_at || authUser.created_at,
        trial_ends_at: profile?.trial_ends_at || null,
        subscription: subscription ? {
          id: subscription.id,
          plan_name: subscription.plan_name || '',
          status: subscription.status || '',
          current_period_end: subscription.current_period_end || ''
        } : undefined,
        ticketCount: ticketCounts[authUser.id] || 0
      };
    });

    console.log(`Returning ${usersWithData.length} users with merged data`);

    return new Response(
      JSON.stringify({ users: usersWithData }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

