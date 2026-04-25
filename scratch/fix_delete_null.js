const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');

const oldDelete = `    window.deleteTorneoDoc = async (id, docIndex) => {
        if (!confirm('¿Seguro que quieres eliminar este documento?')) return;
        try {
            const { data: conv } = await supabaseClient.from('convocatorias').select('documentos').eq('id', id).single();
            const docs = conv.documentos || [];
            docs.splice(docIndex, 1);
            await db.update('convocatorias', { id, documentos: docs });
            window.viewTorneoRendimiento(id);
        } catch (err) {
            console.error("Delete error:", err);
        }
    };`;

const newDelete = `    window.deleteTorneoDoc = async (id, docIndex) => {
        if (!confirm('¿Seguro que quieres eliminar este documento?')) return;
        try {
            const { data: conv, error: fetchError } = await supabaseClient.from('convocatorias').select('documentos').eq('id', Number(id)).single();
            if (fetchError || !conv) throw new Error('No se pudo encontrar el torneo');
            
            const docs = conv.documentos || [];
            docs.splice(docIndex, 1);
            await db.update('convocatorias', { id: Number(id), documentos: docs });
            window.viewTorneoRendimiento(id);
        } catch (err) {
            console.error("Delete error:", err);
            window.customAlert('Error', 'No se pudo eliminar el documento: ' + err.message, 'error');
        }
    };`;

if (content.includes(oldDelete)) {
    fs.writeFileSync('app.js', content.replace(oldDelete, newDelete));
    console.log('Success');
} else {
    console.log('Delete handler not found');
}
