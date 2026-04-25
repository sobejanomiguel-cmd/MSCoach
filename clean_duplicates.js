
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hopencygilaeevvvxkvu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvcGVuY3lnaWxhZWV2dnZ4a3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMDI3NDIsImV4cCI6MjA5MTU3ODc0Mn0.ccOeebsqB7bmAskFUBfYg4hruzAmdmod7F8--8GEGAY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanDuplicates() {
    console.log("Fetching players...");
    const { data: players, error } = await supabase.from('jugadores').select('*');
    
    if (error) {
        console.error("Error fetching players:", error);
        return;
    }

    console.log(`Found ${players.length} players. Analyzing duplicates...`);

    const groups = {};
    players.forEach(p => {
        const name = (p.nombre || '').trim().toUpperCase();
        if (!name) return;
        if (!groups[name]) groups[name] = [];
        groups[name].push(p);
    });

    const toDelete = [];
    let keptCount = 0;

    Object.entries(groups).forEach(([name, list]) => {
        if (list.length > 1) {
            // Sort by "completeness" (more fields) or higher ID (assuming newer)
            list.sort((a, b) => {
                const scoreA = Object.values(a).filter(v => v !== null && v !== '').length;
                const scoreB = Object.values(b).filter(v => v !== null && v !== '').length;
                return scoreB - scoreA || b.id - a.id;
            });

            // Keep the first one, delete the rest
            const kept = list[0];
            const duplicates = list.slice(1);
            
            console.log(`Duplicate found: "${name}". Keeping ID ${kept.id} (${Object.values(kept).filter(v => v).length} fields). Deleting ${duplicates.length} records.`);
            duplicates.forEach(d => toDelete.push(d.id));
        } else {
            keptCount++;
        }
    });

    if (toDelete.length > 0) {
        console.log(`Starting deletion of ${toDelete.length} records...`);
        // Supabase delete with array of IDs
        const { error: delError } = await supabase.from('jugadores').delete().in('id', toDelete);
        
        if (delError) {
            console.error("Error deleting duplicates:", delError);
        } else {
            console.log("SUCCESS: Duplicates removed.");
        }
    } else {
        console.log("No duplicates found.");
    }
}

cleanDuplicates();
