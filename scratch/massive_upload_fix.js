const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');

// Update input to multiple
const oldInput = `<input type="file" id="torneo-doc-upload" class="hidden" onchange="window.handleTorneoDocUpload(\${conv.id}, this.files[0])">`;
const newInput = `<input type="file" id="torneo-doc-upload" class="hidden" multiple onchange="window.handleTorneoDocUpload(\${conv.id}, this.files)">`;

// Update handler to process multiple files
const oldHandler = `    window.handleTorneoDocUpload = async (id, file) => {
        if (!file) return;
        const btn = document.querySelector(\`button[onclick*="torneo-doc-upload"]\`);
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="w-4 h-4 animate-spin text-blue-600">...</i>';
        
        try {
            const publicUrl = await db.uploadFile(file, 'tareas', 'torneo_docs');
            if (publicUrl) {
                const { data: conv } = await supabaseClient.from('convocatorias').select('documentos').eq('id', id).single();
                const docs = conv.documentos || [];
                docs.push({ name: file.name, url: publicUrl });
                await db.update('convocatorias', { id, documentos: docs });
                window.viewTorneoRendimiento(id);
                window.customAlert('Éxito', 'Documento subido correctamente', 'success');
            }
        } catch (err) {
            console.error("Upload error:", err);
            window.customAlert('Error', 'No se pudo subir el archivo', 'error');
        } finally {
            btn.innerHTML = originalHtml;
        }
    };`;

const newHandler = `    window.handleTorneoDocUpload = async (id, files) => {
        if (!files || files.length === 0) return;
        const btn = document.querySelector(\`button[onclick*="torneo-doc-upload"]\`);
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="w-4 h-4 animate-spin text-blue-600">...</i>';
        
        try {
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
        } finally {
            btn.innerHTML = originalHtml;
        }
    };`;

let updatedContent = content;
if (content.includes(oldInput)) {
    updatedContent = updatedContent.replace(oldInput, newInput);
}
if (content.includes(oldHandler)) {
    updatedContent = updatedContent.replace(oldHandler, newHandler);
}

fs.writeFileSync('app.js', updatedContent);
console.log('Success');
