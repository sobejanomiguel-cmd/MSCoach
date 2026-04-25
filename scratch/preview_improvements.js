const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');

const oldPreview = `    window.previewDocument = (url, name = 'Documento') => {
        const previewOverlay = document.getElementById('preview-overlay');
        const previewContent = document.getElementById('preview-content');
        
        const isImage = /\\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);
        const isPdf = /\\.pdf$/i.test(url);

        previewContent.innerHTML = \`
            <div class="p-8 md:p-12">
                <div class="mb-8 flex justify-between items-center">
                    <div>
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">\${name}</h3>
                    </div>
                </div>
                
                <div class="bg-slate-50 rounded-[2.5rem] border-4 border-slate-100 overflow-hidden shadow-inner flex items-center justify-center min-h-[50vh]">
                    \${isImage ? \`
                        <img src="\${url}" class="max-w-full h-auto shadow-2xl rounded-xl">
                    \` : isPdf ? \`
                        <iframe src="\${url}" class="w-full h-[70vh] border-none"></iframe>
                    \` : \`
                        <div class="text-center p-20">
                            <i data-lucide="file-warning" class="w-16 h-16 text-slate-300 mx-auto mb-4"></i>
                            <p class="text-slate-500 font-bold">No se puede previsualizar este tipo de archivo.</p>
                            <a href="\${url}" target="_blank" class="mt-6 inline-block px-8 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs">Descargar Archivo</a>
                        </div>
                    \`}
                </div>
            </div>
        \`;`;

const newPreview = `    window.previewDocument = (url, name = 'Documento') => {
        const previewOverlay = document.getElementById('preview-overlay');
        const previewContainer = document.getElementById('preview-container');
        const previewContent = document.getElementById('preview-content');
        
        const isImage = /\\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);
        const isPdf = /\\.pdf$/i.test(url) || url.startsWith('blob:') || url.startsWith('data:application/pdf');

        // Ajustar ancho del contenedor si es PDF para mejor lectura
        if (isPdf) {
            previewContainer.classList.remove('max-w-4xl');
            previewContainer.classList.add('max-w-6xl');
        } else {
            previewContainer.classList.remove('max-w-6xl');
            previewContainer.classList.add('max-w-4xl');
        }

        previewContent.innerHTML = \`
            <div class="p-4 md:p-8">
                <div class="mb-6 flex justify-between items-center px-4">
                    <div>
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">\${name}</h3>
                    </div>
                </div>
                
                <div class="bg-slate-50 rounded-[2rem] border-2 border-slate-100 overflow-hidden shadow-inner flex items-center justify-center">
                    \${isImage ? \`
                        <div class="p-4">
                            <img src="\${url}" class="max-w-full h-auto shadow-2xl rounded-2xl">
                        </div>
                    \` : isPdf ? \`
                        <div class="w-full h-[80vh]">
                            <object data="\${url}" type="application/pdf" class="w-full h-full">
                                <iframe src="\${url}" class="w-full h-full border-none">
                                    <div class="p-20 text-center">
                                        <p class="text-slate-500 font-bold mb-4">Tu navegador no permite la previsualización directa.</p>
                                        <a href="\${url}" target="_blank" class="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold uppercase text-[10px]">Abrir en pestaña nueva</a>
                                    </div>
                                </iframe>
                            </object>
                        </div>
                    \` : \`
                        <div class="text-center p-20">
                            <i data-lucide="file-warning" class="w-16 h-16 text-slate-300 mx-auto mb-4"></i>
                            <p class="text-slate-500 font-bold">No se puede previsualizar este tipo de archivo.</p>
                            <a href="\${url}" target="_blank" class="mt-6 inline-block px-8 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs">Descargar Archivo</a>
                        </div>
                    \`}
                </div>
            </div>
        \`;`;

if (content.includes(oldPreview)) {
    fs.writeFileSync('app.js', content.replace(oldPreview, newPreview));
    console.log('Success');
} else {
    console.log('Old preview function not found');
}
