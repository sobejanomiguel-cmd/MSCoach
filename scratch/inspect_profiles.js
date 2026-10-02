const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://hopencygilaeevvvxkvu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvcGVuY3lnaWxhZWV2dnZ4a3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMDI3NDIsImV4cCI6MjA5MTU3ODc0Mn0.ccOeebsqB7bmAskFUBfYg4hruzAmdmod7F8--8GEGAY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspect() {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) console.error(error);
    else console.log(data);
}
inspect();
