const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://hopencygilaeevvvxkvu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvcGVuY3lnaWxhZWV2dnZ4a3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMDI3NDIsImV4cCI6MjA5MTU3ODc0Mn0.ccOeebsqB7bmAskFUBfYg4hruzAmdmod7F8--8GEGAY';

// Mappings
const TEAM_MAPPING = {
    '2013': { id: 5, nombre: 'GENERACIÓN 2013' },
    '2011': { id: 2, nombre: 'GENERACIÓN 2011' },
    '2018': { id: 13, nombre: 'GENERACION 2018' },
    'ICF': { id: 11, nombre: 'CADETE INFANTIL FEMENINO' }
};

const COACH_MAPPING = {
    'VICTOR': '4968d149-489b-44d0-9d78-8f1acee0b2ca',
    'MIGUEL': '8554fac0-262b-4ed7-b721-c7dff9c50580'
};

function formatDate(dateStr) {
    // Expected format DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dateStr;
}

function formatTime(timeStr) {
    if (timeStr && timeStr.split(':').length === 2) {
        return `${timeStr}:00`;
    }
    return timeStr;
}

async function run() {
    try {
        const csvPath = path.join(__dirname, '..', 'sesiones.csv');
        console.log(`Reading CSV from: ${csvPath}`);
        const content = fs.readFileSync(csvPath, 'utf8');
        const lines = content.split('\n').map(line => line.trim()).filter(Boolean);

        // Skip headers line 0
        const rows = lines.slice(1);
        console.log(`Found ${rows.length} session rows to import.`);

        for (const row of rows) {
            // Split by semicolon
            const parts = row.split(';').map(p => p.trim());
            if (parts.length < 9) {
                console.warn(`Skipping incomplete row: ${row}`);
                continue;
            }

            const rawFecha = parts[1];
            const rawHora = parts[2];
            const rawLugar = parts[3];
            const rawEquipo = parts[4];
            const rawCreador = parts[5].toUpperCase();
            const rawAcompanante = parts[6].toUpperCase();
            const rawCiclo = parts[7];
            const rawSesion = parts[8];

            // Construct title: e.g. "S1 2011 ARNEDO"
            const numSesionInt = parseInt(rawSesion, 10) || 1;
            const titulo = `S${numSesionInt} ${rawEquipo} ${rawLugar}`;

            const fecha = formatDate(rawFecha);
            const hora = formatTime(rawHora);

            // Map Team
            const team = TEAM_MAPPING[rawEquipo];
            if (!team) {
                console.error(`Error: Team '${rawEquipo}' not found in mappings!`);
                continue;
            }

            // Map Coaches
            const createdBy = COACH_MAPPING[rawCreador];
            const companionId = COACH_MAPPING[rawAcompanante];
            if (!createdBy) {
                console.error(`Error: Coach '${rawCreador}' not found in mappings!`);
                continue;
            }

            const sharedWith = companionId ? [companionId] : [];

            // Serialize lugar metadata
            const extra = {
                eids: [team.id.toString()],
                sw: sharedWith
            };
            const lugar = `${rawLugar} ||| ${JSON.stringify(extra)}`;

            // Build session object
            const sessionData = {
                titulo,
                fecha,
                hora,
                lugar,
                equipoid: team.id,
                equiponombre: team.nombre,
                objetivos: null,
                taskids: [],
                playerids: [],
                ciclo: parseInt(rawCiclo, 10) || 0,
                numSesion: numSesionInt,
                sharedWith,
                createdBy
            };

            console.log(`Importing: "${titulo}" on ${fecha} ${hora}`);

            // POST to Supabase
            const res = await fetch(`${SUPABASE_URL}/rest/v1/sesiones`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    Prefer: 'return=representation'
                },
                body: JSON.stringify(sessionData)
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Failed to insert session: ${res.statusText} (${res.status}) - ${errText}`);
            }

            const resJson = await res.json();
            console.log(`Successfully imported session ID ${resJson[0]?.id}:`, resJson[0]?.titulo);
        }

        console.log("All sessions imported successfully!");
    } catch (e) {
        console.error("Import error:", e);
    }
}

run();
