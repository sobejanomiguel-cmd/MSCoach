const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');

const fn = `
    window.previewConvocatoriaPDF = async (id) => {
        const url = await window.exportConvocatoria(id, 'preview');
        if (url) window.previewDocument(url, 'Convocatoria');
    };`;

let updated = content;
if (!content.includes('window.previewConvocatoriaPDF =')) {
    updated = updated.replace(/(\s*)window\.previewTorneoPDF =/g, fn + '\n$1window.previewTorneoPDF =');
}

fs.writeFileSync('app.js', updated);
console.log('Success');
