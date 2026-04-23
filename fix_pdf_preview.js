const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');

// 1. Update exportConvocatoria signature and logic
const oldExport = `window.exportConvocatoria = async (id, mode = 'download') => {`; // Wait, signature is already there?
// Let's check where it ends

const oldSave = /doc\.save\(`Convocatoria_\$\{conv\.nombre\}_(?:\$\{conv\.fecha\}|_\w+)\.pdf`\);/;
// Looking at line 8308: doc.save(`Convocatoria_${conv.nombre}_${conv.fecha}.pdf`);

const newSave = `        if (mode === 'preview') {
            return doc.output('bloburl');
        } else {
            doc.save(\`Convocatoria_\${conv.nombre}_\${conv.fecha}.pdf\`);
        }`;

let updated = content;
if (content.includes('doc.save(`Convocatoria_${conv.nombre}_${conv.fecha}.pdf`);')) {
    updated = updated.replace('doc.save(`Convocatoria_${conv.nombre}_${conv.fecha}.pdf`);', newSave);
}

fs.writeFileSync('app.js', updated);
console.log('Success');
