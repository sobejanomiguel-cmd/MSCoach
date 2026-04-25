const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');

const searchStr = `                                 <div id="pitch-display-area" class="relative">
                                     \${renderTacticalPitchHtml(convocados, (window.formationsState && window.formationsState.torneos && window.formationsState.torneos[conv.id]) || 'F11_433', 'horizontal')}
                                 </div>
                             </div>
                        </div>`;

const replacementStr = `                                 <div id="pitch-display-area" class="relative">
                                     \${renderTacticalPitchHtml(convocados, (window.formationsState && window.formationsState.torneos && window.formationsState.torneos[conv.id]) || 'F11_433', 'horizontal')}
                                 </div>
                             </div>

                             <!-- Documentos -->
                             <div class="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                                 <div class="flex justify-between items-center">
                                     <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                         <i data-lucide="file-text" class="w-4 h-4 text-blue-600"></i>
                                         Documentación y Horarios
                                     </h4>
                                     <button onclick="document.getElementById('torneo-doc-upload').click()" class="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all shadow-sm">
                                         <i data-lucide="plus" class="w-4 h-4"></i>
                                     </button>
                                     <input type="file" id="torneo-doc-upload" class="hidden" onchange="window.handleTorneoDocUpload(\${conv.id}, this.files[0])">
                                 </div>
                                 <div id="torneo-docs-list" class="space-y-2">
                                     \${(conv.documentos || []).length > 0 ? conv.documentos.map((doc, idx) => \`
                                         <div class="flex items-center justify-between p-3 bg-slate-50 rounded-2xl group hover:bg-blue-50/50 transition-all border border-transparent hover:border-blue-100">
                                             <div class="flex items-center gap-3 overflow-hidden">
                                                 <div class="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm border border-slate-100">
                                                     <i data-lucide="file" class="w-4 h-4"></i>
                                                 </div>
                                                 <span class="text-[10px] font-bold text-slate-600 truncate">\${doc.name}</span>
                                             </div>
                                             <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                 <button onclick="window.previewDocument('\${doc.url}', '\${doc.name}')" class="p-1.5 text-blue-500 hover:bg-white rounded-lg transition-all" title="Previsualizar"><i data-lucide="eye" class="w-3.5 h-3.5"></i></button>
                                                 <button onclick="window.deleteTorneoDoc(\${conv.id}, \${idx})" class="p-1.5 text-red-400 hover:bg-white rounded-lg transition-all" title="Eliminar"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                                             </div>
                                         </div>
                                     \`).join('') : '<p class="text-[10px] text-slate-400 italic text-center py-4">No hay documentos adjuntos.</p>'}
                                 </div>
                             </div>
                        </div>`;

if (content.includes(searchStr)) {
    fs.writeFileSync('app.js', content.replace(searchStr, replacementStr));
    console.log('Success');
} else {
    console.log('Search string not found');
}
