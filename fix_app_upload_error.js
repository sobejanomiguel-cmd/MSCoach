const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');

const oldHandler = `        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                const publicUrl = await db.uploadFile(file, 'tareas', 'torneo_docs');
                return publicUrl ? { name: file.name, url: publicUrl } : null;
            });
            
            const results = (await Promise.all(uploadPromises)).filter(r => r !== null);
            
            if (results.length > 0) {
                const { data: conv } = await supabaseClient.from('convocatorias').select('documentos').eq('id', id).single();
                const docs = conv.documentos || [];
                const updatedDocs = [...docs, ...results];
                await db.update('convocatorias', { id, documentos: updatedDocs });
                window.viewTorneoRendimiento(id);
                window.customAlert('Éxito', \`\${results.length} archivo(s) subido(s) correctamente\`, 'success');
            }
        } catch (err) {
            console.error("Upload error:", err);
            window.customAlert('Error', 'No se pudieron subir algunos archivos', 'error');
        } finally {`;

const newHandler = `        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                // Probamos con la ruta 'tasks' que es la que sabemos que funciona para otros módulos
                const publicUrl = await db.uploadFile(file, 'tareas', 'tasks');
                return publicUrl ? { name: file.name, url: publicUrl } : null;
            });
            
            const results = (await Promise.all(uploadPromises)).filter(r => r !== null);
            
            if (results.length > 0) {
                const { data: conv } = await supabaseClient.from('convocatorias').select('documentos').eq('id', id).single();
                const docs = conv.documentos || [];
                const updatedDocs = [...docs, ...results];
                await db.update('convocatorias', { id, documentos: updatedDocs });
                window.viewTorneoRendimiento(id);
                window.customAlert('Éxito', \`\${results.length} archivo(s) subido(s) correctamente\`, 'success');
            }
        } catch (err) {
            console.error("Upload error details:", err);
            const errorMsg = err.message || err.error_description || 'Error de permisos o conexión';
            window.customAlert('Error al subir', \`No se pudieron subir los archivos. Detalle: \${errorMsg}\`, 'error');
        } finally {`;

if (content.includes(oldHandler)) {
    fs.writeFileSync('app.js', content.replace(oldHandler, newHandler));
    console.log('Success');
} else {
    console.log('Handler not found');
}
