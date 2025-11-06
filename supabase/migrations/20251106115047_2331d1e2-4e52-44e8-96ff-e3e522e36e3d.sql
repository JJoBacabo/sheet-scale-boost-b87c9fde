-- Schedule cron job to check for expired subscriptions daily at midnight
SELECT cron.schedule(
  'check-expired-subscriptions-daily',
  '0 0 * * *', -- Every day at midnight
  $$
  SELECT
    net.http_post(
        url:='https://cygvvrtsdatdczswcrqj.supabase.co/functions/v1/check-expired-subscriptions',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5Z3Z2cnRzZGF0ZGN6c3djcnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5Mjc5NTksImV4cCI6MjA3NjUwMzk1OX0.-CBRNUXfqmacJthrfOG01_FgPFFzYO-zNfG3zh7YSdM"}'::jsonb,
        body:='{"time": "scheduled"}'::jsonb
    ) as request_id;
  $$
);