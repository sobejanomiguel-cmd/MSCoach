const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');

// 1. Ensure helpers are at the top (after cleanLugar)
let updated = content;
if (!content.includes('window.getConvMetadata =')) {
    const helpers = `
    window.getConvMetadata = (conv) => {
        if (!conv || !conv.lugar || !conv.lugar.includes(' ||| ')) return {};
        try {
            const parts = conv.lugar.split(' ||| ');
            if (parts.length < 2) return {};
            return JSON.parse(parts[1]) || {};
        } catch (e) {
            return {};
        }
    };

    window.saveConvMetadata = async (id, key, value) => {
        const { data: conv } = await supabaseClient.from('convocatorias').select('lugar').eq('id', Number(id)).single();
        if (!conv) return;
        
        const baseLugar = conv.lugar ? conv.lugar.split(' ||| ')[0] : '';
        let metadata = {};
        if (conv.lugar && conv.lugar.includes(' ||| ')) {
            try { 
                const parts = conv.lugar.split(' ||| ');
                metadata = JSON.parse(parts[1]); 
            } catch(e) {}
        }
        
        metadata[key] = value;
        const newLugar = \`\${baseLugar} ||| \${JSON.stringify(metadata)}\`;
        
        await db.update('convocatorias', { id: Number(id), lugar: newLugar });
    };`;
    updated = updated.replace('window.cleanLugar = (l) => {', helpers + '\n    window.cleanLugar = (l) => {');
}

// 2. Fix viewTorneoRendimiento
const searchRendimiento = 'const rendimiento = conv.rendimiento || {};';
const replacementRendimiento = 'const rendimiento = conv.rendimiento || {};\n            const docs = window.getConvMetadata(conv).documentos || [];';
// Use split/join to replace only the correct one (the one near viewTorneoRendimiento)
const viewStart = updated.indexOf('window.viewTorneoRendimiento = async (id) =>');
if (viewStart !== -1) {
    const afterView = updated.substring(viewStart);
    const updatedAfterView = afterView.replace(searchRendimiento, replacementRendimiento);
    updated = updated.substring(0, viewStart) + updatedAfterView;
}

// 3. Ensure UI uses "docs" variable
updated = updated.replace(/\$\{\(conv\.documentos \|\| \[\]\)\.length > 0 \? conv\.documentos\.map/g, '${docs.length > 0 ? docs.map');

fs.writeFileSync('app.js', updated);
console.log('Success');
