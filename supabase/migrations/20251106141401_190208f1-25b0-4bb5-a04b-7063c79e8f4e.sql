-- Enable pg_cron extension for scheduling tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Create cron job for subscription state manager (runs daily at 2 AM UTC)
SELECT cron.schedule(
  'subscription-state-manager-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url:='https://cygvvrtsdatdczswcrqj.supabase.co/functions/v1/subscription-state-manager',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5Z3Z2cnRzZGF0ZGN6c3djcnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5Mjc5NTksImV4cCI6MjA3NjUwMzk1OX0.-CBRNUXfqmacJthrfOG01_FgPFFzYO-zNfG3zh7YSdM"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);

-- Create cron job for retention emails (runs daily at 10 AM UTC)
SELECT cron.schedule(
  'send-retention-emails-daily',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url:='https://cygvvrtsdatdczswcrqj.supabase.co/functions/v1/send-retention-emails',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5Z3Z2cnRzZGF0ZGN6c3djcnFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5Mjc5NTksImV4cCI6MjA3NjUwMzk1OX0.-CBRNUXfqmacJthrfOG01_FgPFFzYO-zNfG3zh7YSdM"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);