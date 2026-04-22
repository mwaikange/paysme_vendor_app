import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://zvoqrqdnuupdefsuiurt.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b3FycWRudXVwZGVmc3VpdXJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNDc0NjEsImV4cCI6MjA4NjYwNzQ2MX0.iYcgNWmjY4zTNAhBf07hZdkj_qyfahT0A9db8O4RBQY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

export const WEBHOOK_URL = 'https://zvoqrqdnuupdefsuiurt.supabase.co/functions/v1/webhooks-payments';