const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');
const fixedContent = content.split('\\n').join('\n');
fs.writeFileSync('app.js', fixedContent);
console.log('Success');
