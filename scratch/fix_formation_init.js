const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');
const searchStr = `    window.formationsState = {
        convocatoria: savedPrefs.convocatoria || 'F11_433',
        torneo: savedPrefs.torneo || 'F11_433',
        campograma: savedPrefs.campograma || 'F11_433'
    };`;
const replacementStr = `    // Load formation preferences
    const savedState = JSON.parse(localStorage.getItem('ms_coach_formation_state') || '{}');
    window.formationsState = {
        convocatoria: savedPrefs.convocatoria || 'F11_433',
        torneo: savedPrefs.torneo || 'F11_433',
        campograma: savedPrefs.campograma || 'F11_433',
        teams: savedState.teams || {},
        torneos: savedState.torneos || {},
        convocatorias: savedState.convocatorias || {}
    };`;

if (content.includes(searchStr)) {
    const newContent = content.replace(searchStr, replacementStr);
    fs.writeFileSync('app.js', newContent);
    console.log('Success');
} else {
    console.log('Search string not found');
}
