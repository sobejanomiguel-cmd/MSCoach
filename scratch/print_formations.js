const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');
const match = content.match(/const FORMATIONS = \{([\s\S]*?)\};\n\n    function renderTacticalPitchHtml/);
if (match) {
    console.log("const FORMATIONS = {" + match[1] + "};");
}
