const SUPABASE_URL = 'https://hopencygilaeevvvxkvu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvcGVuY3lnaWxhZWV2dnZ4a3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMDI3NDIsImV4cCI6MjA5MTU3ODc0Mn0.ccOeebsqB7bmAskFUBfYg4hruzAmdmod7F8--8GEGAY';

async function main() {
    // login
    const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: 'test@rscentro.com',
            password: 'rscentro_password123'
        })
    });
    const loginData = await loginRes.json();
    if (!loginData.access_token) {
        console.error("Login failed", loginData);
        return;
    }
    
    // update password
    const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${loginData.access_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            password: 'rscentro0099'
        })
    });
    
    const updateData = await updateRes.json();
    console.log("Update response:", updateData.email ? "Success" : updateData);
}
main();
