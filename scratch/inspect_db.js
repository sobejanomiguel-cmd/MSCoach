const SUPABASE_URL = 'https://hopencygilaeevvvxkvu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvcGVuY3lnaWxhZWV2dnZ4a3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMDI3NDIsImV4cCI6MjA5MTU3ODc0Mn0.ccOeebsqB7bmAskFUBfYg4hruzAmdmod7F8--8GEGAY';

async function main() {
    try {
        const teamsRes = await fetch(`${SUPABASE_URL}/rest/v1/equipos`, {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        });
        const teams = await teamsRes.json();
        console.log("=== EQUIPOS ===");
        console.log(teams.map(t => ({ id: t.id, nombre: t.nombre, categoria: t.categoria })));

        const profilesRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`
            }
        });
        const profiles = await profilesRes.json();
        console.log("=== PROFILES / TECNICOS ===");
        console.log(profiles.map(p => ({ id: p.id, nombre: p.nombre, email: p.email })));
    } catch (e) {
        console.error("Error fetching db data:", e);
    }
}

main();
