const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');

let updated = content;

// 1. Add previewConvocatoriaPDF helper
if (!content.includes('window.previewConvocatoriaPDF =')) {
    const fn = `
    window.previewConvocatoriaPDF = async (id) => {
        const url = await window.exportConvocatoria(id, 'preview');
        if (url) window.previewDocument(url, 'Convocatoria');
    };`;
    updated = updated.replace('window.previewTorneoPDF =', fn + '\n    window.previewTorneoPDF =');
}

// 2. Add button to Mobile View
const oldMobileActions = `<div class="flex gap-2">
                                <button onclick="event.stopPropagation(); window.deleteConvocatoria(\${c.id})" class="p-2 text-red-300 hover:text-red-500">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>`;
const newMobileActions = `<div class="flex gap-2">
                                <button onclick="event.stopPropagation(); window.previewConvocatoriaPDF(\${c.id})" class="p-2 text-blue-400 hover:text-blue-600" title="Previsualizar PDF">
                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                </button>
                                <button onclick="event.stopPropagation(); window.deleteConvocatoria(\${c.id})" class="p-2 text-red-300 hover:text-red-500">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>`;
updated = updated.replace(oldMobileActions, newMobileActions);

// 3. Add button to Desktop View
const oldDesktopActions = `<div class="flex justify-end gap-2">
                                                <button onclick="event.stopPropagation(); window.deleteConvocatoria(\${c.id})" class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                                </button>
                                                <i data-lucide="chevron-right" class="w-5 h-5 text-slate-200 group-hover:text-blue-400 transition-all"></i>
                                            </div>`;
const newDesktopActions = `<div class="flex justify-end gap-2">
                                                <button onclick="event.stopPropagation(); window.previewConvocatoriaPDF(\${c.id})" class="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all" title="Previsualizar PDF">
                                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                                </button>
                                                <button onclick="event.stopPropagation(); window.deleteConvocatoria(\${c.id})" class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                                </button>
                                                <i data-lucide="chevron-right" class="w-5 h-5 text-slate-200 group-hover:text-blue-400 transition-all"></i>
                                            </div>`;
updated = updated.replace(oldDesktopActions, newDesktopActions);

fs.writeFileSync('app.js', updated);
console.log('Success');
