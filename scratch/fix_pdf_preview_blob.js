const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');

const oldOutput = `                if (mode === 'preview') {
            return doc.output('bloburl');
        } else {
            doc.save(\`Convocatoria_\${conv.nombre}_\${conv.fecha}.pdf\`);
        }`;

const newOutput = `        if (mode === 'preview') {
            const blob = doc.output('blob');
            return URL.createObjectURL(blob);
        } else {
            doc.save(\`Convocatoria_\${conv.nombre}_\${conv.fecha}.pdf\`);
        }`;

let updated = content;
if (content.includes(oldOutput)) {
    updated = updated.replace(oldOutput, newOutput);
    console.log('Success');
} else {
    console.log('Old output block not found');
    // Try a simpler search
    if (content.includes("return doc.output('bloburl');")) {
        updated = updated.replace("return doc.output('bloburl');", "const blob = doc.output('blob'); return URL.createObjectURL(blob);");
        console.log('Success (partial)');
    }
}

fs.writeFileSync('app.js', updated);
