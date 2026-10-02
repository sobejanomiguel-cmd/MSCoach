const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://hopencygilaeevvvxkvu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvcGVuY3lnaWxhZWV2dnZ4a3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMDI3NDIsImV4cCI6MjA5MTU3ODc0Mn0.ccOeebsqB7bmAskFUBfYg4hruzAmdmod7F8--8GEGAY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function formatCapitalize(text) {
    if (!text) return "";
    return text.toString().toLowerCase().replace(/(?:^|\s|-)\S/g, function(a) {
        return a.toUpperCase();
    }).replace(/\b(Cd|Cf|Ua|Ud|Sd|Fc|Ke|Adf|Cdf|Cde)\b/ig, function(match) {
        return match.toUpperCase();
    });
}

function parsePosition(pos) {
    if (!pos) return [];
    if (Array.isArray(pos)) return pos;
    if (typeof pos !== 'string') return [pos];
    let cleanPos = pos.trim();
    if (cleanPos.startsWith('[') && cleanPos.endsWith(']')) {
        try {
            return JSON.parse(cleanPos);
        } catch (e) {
            return [cleanPos.replace(/[[\]"]/g, '')];
        }
    }
    return [cleanPos];
}

const positionMapping = {
    'PO': 'PT',
    'POR': 'PT',
    'LD': 'LTD',
    'LI': 'LTI',
    'CAD': 'LTD',
    'CAI': 'LTI',
    'DFC': 'CT',
    'CD': 'CT',
    'CTD': 'CT',
    'CTI': 'CT',
    'MCD': 'MC',
    'MCZ': 'MC',
    'MVD': 'INT',
    'MVZ': 'INT',
    'MPD': 'MP',
    'MPZ': 'MP',
    'MBD': 'ED',
    'MBZ': 'EI',
    'ACD': 'DC',
    'ACZ': 'DC',
    'AC': 'DC'
};

async function updateJugadores() {
    console.log("Fetching jugadores...");
    const { data: players, error } = await supabase.from('jugadores').select('*');
    if (error) {
        console.error("Error fetching players:", error);
        return;
    }
    
    console.log(`Found ${players.length} players. Updating...`);
    let updated = 0;
    
    for (const player of players) {
        let changed = false;
        const updates = {};
        
        // Capitalize name
        if (player.nombre) {
            const newName = formatCapitalize(player.nombre);
            if (newName !== player.nombre) {
                updates.nombre = newName;
                changed = true;
            }
        }
        
        // Update positions
        if (player.posicion) {
            const currentPosList = parsePosition(player.posicion);
            const newPosList = currentPosList.map(p => positionMapping[p] || p);
            const newPosString = JSON.stringify(newPosList);
            if (newPosString !== player.posicion && newPosString !== JSON.stringify(currentPosList)) {
                updates.posicion = newPosString;
                changed = true;
            } else if (player.posicion !== newPosString) { // It might be formatted differently like non-JSON
                updates.posicion = newPosString;
                changed = true;
            }
        }
        
        if (changed) {
            const { error: updateError } = await supabase.from('jugadores').update(updates).eq('id', player.id);
            if (updateError) {
                console.error(`Error updating player ${player.id}:`, updateError);
            } else {
                updated++;
                process.stdout.write('.');
            }
        }
    }
    
    console.log(`\nUpdated ${updated} players successfully.`);
}

updateJugadores();
