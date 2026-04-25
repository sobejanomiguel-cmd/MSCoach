const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');

// Helper to handle metadata in lugar field
const metadataHelpers = `
    window.getConvMetadata = (conv) => {
        if (!conv || !conv.lugar || !conv.lugar.includes(' ||| ')) return {};
        try {
            return JSON.parse(conv.lugar.split(' ||| ')[1]) || {};
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
            try { metadata = JSON.parse(conv.lugar.split(' ||| ')[1]); } catch(e) {}
        }
        
        metadata[key] = value;
        const newLugar = \`\${baseLugar} ||| \${JSON.stringify(metadata)}\`;
        
        await db.update('convocatorias', { id: Number(id), lugar: newLugar });
    };
`;

// Replace handleTorneoDocUpload
const oldUpload = /window\.handleTorneoDocUpload = async \(id, files\) => \{[\s\S]*?async \(file\) => \{[\s\S]*?db\.uploadFile\(file, 'tareas', 'tasks'\);[\s\S]*?\}\);[\s\S]*?const \{ data: conv, error: fetchError \} = await supabaseClient[\s\S]*?\.from\('convocatorias'\)[\s\S]*?\.select\('documentos'\)[\s\S]*?\.eq\('id', Number\(id\)\)[\s\S]*?\.single\(\);[\s\S]*?if \(fetchError || !conv\) \{[\s\S]*?window\.customAlert\('Error', 'No se ha podido localizar el torneo en la base de datos para guardar los archivos\.', 'error'\);[\s\S]*?return;[\s\S]*?\}[\s\S]*?const docs = conv\.documentos || \[\];[\s\S]*?const updatedDocs = \[\.\.\.docs, \.\.\.results\];[\s\S]*?await db\.update\('convocatorias', \{ id: Number\(id\), documentos: updatedDocs \}\);[\s\S]*?window\.viewTorneoRendimiento\(id\);[\s\S]*?window\.customAlert\('Éxito', \`\${results\.length} archivo\(s\) subido\(s\) correctamente\`, 'success'\);[\s\S]*?\}[\s\S]*?\};/;

const newUpload = `window.handleTorneoDocUpload = async (id, files) => {
        if (!files || files.length === 0) return;
        const btn = document.querySelector(\`button[onclick*="torneo-doc-upload"]\`);
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="w-4 h-4 animate-spin text-blue-600">...</i>';
        
        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                const publicUrl = await db.uploadFile(file, 'tareas', 'tasks');
                return publicUrl ? { name: file.name, url: publicUrl } : null;
            });
            
            const results = (await Promise.all(uploadPromises)).filter(r => r !== null);
            
            if (results.length > 0) {
                const { data: conv } = await supabaseClient.from('convocatorias').select('lugar').eq('id', Number(id)).single();
                const metadata = window.getConvMetadata(conv);
                const docs = metadata.documentos || [];
                const updatedDocs = [...docs, ...results];
                
                await window.saveConvMetadata(id, 'documentos', updatedDocs);
                
                window.viewTorneoRendimiento(id);
                window.customAlert('Éxito', \`\${results.length} archivo(s) subido(s) correctamente\`, 'success');
            }
        } catch (err) {
            console.error("Upload error details:", err);
            const errorMsg = err.message || err.error_description || 'Error de permisos o conexión';
            window.customAlert('Error al subir', \`No se pudieron subir los archivos. Detalle: \${errorMsg}\`, 'error');
        } finally {
            btn.innerHTML = originalHtml;
        }
    };`;

// Replace deleteTorneoDoc
const oldDelete = /window\.deleteTorneoDoc = async \(id, docIndex\) => \{[\s\S]*?const \{ data: conv, error: fetchError \} = await supabaseClient\.from\('convocatorias'\)\.select\('documentos'\)\.eq\('id', Number\(id\)\)\.single\(\);[\s\S]*?if \(fetchError || !conv\) throw new Error\('No se pudo encontrar el torneo'\);[\s\S]*?const docs = conv\.documentos || \[\];[\s\S]*?docs\.splice\(docIndex, 1\);[\s\S]*?await db\.update\('convocatorias', \{ id: Number\(id\), documentos: docs \}\);[\s\S]*?window\.viewTorneoRendimiento\(id\);[\s\S]*?\};/;

const newDelete = `window.deleteTorneoDoc = async (id, docIndex) => {
        if (!confirm('¿Seguro que quieres eliminar este documento?')) return;
        try {
            const { data: conv } = await supabaseClient.from('convocatorias').select('lugar').eq('id', Number(id)).single();
            const metadata = window.getConvMetadata(conv);
            const docs = metadata.documentos || [];
            docs.splice(docIndex, 1);
            
            await window.saveConvMetadata(id, 'documentos', docs);
            window.viewTorneoRendimiento(id);
        } catch (err) {
            console.error("Delete error:", err);
            window.customAlert('Error', 'No se pudo eliminar el documento: ' + err.message, 'error');
        }
    };`;

// Replace viewTorneoRendimiento UI part
const oldListDocs = /const docs = conv\.documentos || \[\];/; // Wait, this is inside viewTorneoRendimiento
// I need a more robust replacement for the UI

let updated = content;

// Add helpers at top level (e.g. after cleanLugar)
if (content.includes('window.cleanLugar =')) {
    updated = updated.replace('window.cleanLugar = (l) => {', metadataHelpers + '\\n    window.cleanLugar = (l) => {');
}

updated = updated.replace(oldUpload, newUpload);
updated = updated.replace(oldDelete, newDelete);

// Update viewTorneoRendimiento to extract docs from metadata
updated = updated.replace('const rendimiento = conv.rendimiento || {};', 'const rendimiento = conv.rendimiento || {};\\n            const docs = window.getConvMetadata(conv).documentos || [];');
updated = updated.replace('\${(conv.documentos || []).length > 0 ? conv.documentos.map', '\${docs.length > 0 ? docs.map');

fs.writeFileSync('app.js', updated);
console.log('Success');
