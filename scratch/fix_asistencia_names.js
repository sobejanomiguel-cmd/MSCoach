const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');

// Function to calculate the display name with multiple teams
const calculateReportName = `
                                     const rawName = (r.nombre || \`Informe \${r.fecha}\`).split(' ||| ')[0];
                                     let teamIds = [String(r.equipoid)];
                                     if (r.nombre && r.nombre.includes(' ||| ')) {
                                         try {
                                             const ex = JSON.parse(r.nombre.split(' ||| ')[1]);
                                             if (ex.eids) teamIds = [...new Set([...teamIds, ...ex.eids.map(String)])];
                                         } catch(e) {}
                                     }
                                     
                                     let reportName = rawName;
                                     if (teamIds.length > 1) {
                                         const names = teamIds.map(id => {
                                             const t = teams.find(team => team.id == id);
                                             return t ? t.nombre.split(' ||| ')[0] : null;
                                         }).filter(Boolean);
                                         
                                         if (names.length > 1) {
                                             const namesStr = names.join(' / ');
                                             // Solo añadir si no parecen estar ya en el nombre (evitar duplicados como Asistencia_TeamA_TeamB (TeamA / TeamB))
                                             const alreadyIncluded = names.every(n => rawName.toLowerCase().includes(n.toLowerCase()));
                                             if (!alreadyIncluded) {
                                                 reportName = \`\${rawName} (\${namesStr})\`;
                                             }
                                         }
                                     }
`;

// Replace in Mobile View
const oldMobileName = `                        const reportName = (r.nombre || \`Informe \${r.fecha}\`).split(' ||| ')[0];`;
const newMobileName = calculateReportName;

// Replace in Desktop View
const oldDesktopName = `                                    const reportName = (r.nombre || \`Informe \${r.fecha}\`).split(' ||| ')[0];`;
const newDesktopName = calculateReportName;

let updated = content;
if (content.includes(oldMobileName)) {
    updated = updated.replace(oldMobileName, newMobileName);
}
if (content.includes(oldDesktopName)) {
    updated = updated.replace(oldDesktopName, newDesktopName);
}

// Also update updateAutoName to use / instead of _ for better readability if desired, 
// but the user might prefer / only for the view.
// Let's leave updateAutoName as is for now since it's used for the "filename-like" name.

fs.writeFileSync('app.js', updated);
console.log('Success');
