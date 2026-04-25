const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');

let updated = content;

// Replace handler logic for upload
const uploadSearch = `.select('documentos')
                    .eq('id', Number(id))
                    .single();`;
const uploadReplace = `.select('lugar')
                    .eq('id', Number(id))
                    .single();`;
updated = updated.replace(uploadSearch, uploadReplace);

const docInitSearch = `const docs = conv.documentos || [];
                const updatedDocs = [...docs, ...results];
                
                await db.update('convocatorias', { id: Number(id), documentos: updatedDocs });`;
const docInitReplace = `const metadata = window.getConvMetadata(conv);
                const docs = metadata.documentos || [];
                const updatedDocs = [...docs, ...results];
                
                await window.saveConvMetadata(id, 'documentos', updatedDocs);`;
updated = updated.replace(docInitSearch, docInitReplace);

// Replace handler logic for delete
const deleteSearch = `const { data: conv, error: fetchError } = await supabaseClient.from('convocatorias').select('documentos').eq('id', Number(id)).single();`;
const deleteReplace = `const { data: conv, error: fetchError } = await supabaseClient.from('convocatorias').select('lugar').eq('id', Number(id)).single();`;
updated = updated.replace(deleteSearch, deleteReplace);

const deleteDocSearch = `const docs = conv.documentos || [];
            docs.splice(docIndex, 1);
            await db.update('convocatorias', { id: Number(id), documentos: docs });`;
const deleteDocReplace = `const metadata = window.getConvMetadata(conv);
            const docs = metadata.documentos || [];
            docs.splice(docIndex, 1);
            
            await window.saveConvMetadata(id, 'documentos', docs);`;
updated = updated.replace(deleteDocSearch, deleteDocReplace);

fs.writeFileSync('app.js', updated);
console.log('Success');
