const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');

let updated = content
    .split("/\\r?\n/").join("/\\r?\\n/")
    .split("/\n/").join("/\\n/")
    .split("'\\r?\n'").join("'\\r?\\n'")
    .split("\"\\r?\n\"").join("\"\\r?\\n\"");

fs.writeFileSync('app.js', updated);
console.log('Success');
