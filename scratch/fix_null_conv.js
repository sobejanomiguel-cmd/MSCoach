const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');

const oldCode = `            if (results.length > 0) {
                const { data: conv } = await supabaseClient.from('convocatorias').select('documentos').eq('id', id).single();
                const docs = conv.documentos || [];
                const updatedDocs = [...docs, ...results];
                await db.update('convocatorias', { id, documentos: updatedDocs });
                window.viewTorneoRendimiento(id);
                window.customAlert('Éxito', \`\${results.length} archivo(s) subido(s) correctamente\`, 'success');
            }`;

const newCode = `            if (results.length > 0) {
                // Buscamos la convocatoria asegurando el tipo de ID
                const { data: conv, error: fetchError } = await supabaseClient
                    .from('convocatorias')
                    .select('documentos')
                    .eq('id', Number(id))
                    .single();

                if (fetchError || !conv) {
                    console.error("Error buscando convocatoria:", fetchError);
                    window.customAlert('Error', 'No se ha podido localizar el torneo en la base de datos para guardar los archivos.', 'error');
                    return;
                }

                const docs = conv.documentos || [];
                const updatedDocs = [...docs, ...results];
                
                await db.update('convocatorias', { id: Number(id), documentos: updatedDocs });
                window.viewTorneoRendimiento(id);
                window.customAlert('Éxito', \`\${results.length} archivo(s) subido(s) correctamente\`, 'success');
            }`;

if (content.includes(oldCode)) {
    fs.writeFileSync('app.js', content.replace(oldCode, newCode));
    console.log('Success');
} else {
    console.log('Code block not found');
}
