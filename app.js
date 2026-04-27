// --- GLOBAL UTILITIES ---
window.debounce = (fn, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
};

window.generatePdfBlob = async (fileOrUrl) => {
    return new Promise((resolve) => {
        if (!fileOrUrl) return resolve(null);

        // 1. Si ya es un File, lo procesamos directamente
        if (fileOrUrl instanceof File) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    const maxW = 400;
                    const scale = maxW / img.width;
                    canvas.width = maxW;
                    canvas.height = img.height * scale;
                    ctx.fillStyle = "#FFFFFF";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL("image/jpeg", 0.8));
                };
                img.onerror = () => resolve(null);
                img.src = e.target.result;
            };
            reader.readAsDataURL(fileOrUrl);
            return;
        }

        // 2. Si es una data URI, procesamos directamente
        if (typeof fileOrUrl === 'string' && fileOrUrl.startsWith('data:')) {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                const maxW = 400;
                const scale = maxW / img.width;
                canvas.width = maxW;
                canvas.height = img.height * scale;
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", 0.8));
            };
            img.onerror = () => resolve(null);
            img.src = fileOrUrl;
            return;
        }

        // 3. URLs (Cloud o Locales)
        const isCloud = typeof fileOrUrl === 'string' && (fileOrUrl.startsWith('http') || fileOrUrl.startsWith('https'));

        const tryLoad = (url, next) => {
            const i = new Image();
            // Solo aplicamos Anonymous si es cloud para evitar errores en file://
            if (isCloud) i.crossOrigin = "Anonymous";

            i.onload = () => {
                try {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    const maxW = 400;
                    const scale = maxW / i.width;
                    canvas.width = maxW;
                    canvas.height = i.height * scale;
                    ctx.fillStyle = "#FFFFFF";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(i, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL("image/jpeg", 0.8));
                } catch (e) {
                    console.warn("Canvas error, trying next strategy:", e);
                    next();
                }
            };
            i.onerror = () => {
                console.warn("Strategy failed for:", url);
                next();
            };
            i.src = url;
        };

        // Fallback para archivos locales: intentar fetch como Blob
        const localFetchStrategy = async () => {
            try {
                const response = await fetch(fileOrUrl);
                const blob = await response.blob();
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement("canvas");
                        const ctx = canvas.getContext("2d");
                        const maxW = 400;
                        const scale = maxW / img.width;
                        canvas.width = maxW;
                        canvas.height = img.height * scale;
                        ctx.fillStyle = "#FFFFFF";
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        resolve(canvas.toDataURL("image/jpeg", 0.8));
                    };
                    img.onerror = () => resolve(null);
                    img.src = e.target.result;
                };
                reader.readAsDataURL(blob);
            } catch (err) {
                console.error("Local fetch strategy failed:", err);
                resolve(null);
            }
        };

        // Strategy Chain: Direct -> Proxy 1 -> Proxy 2 -> Local Fetch (if local) -> Give up
        const strategy1 = () => tryLoad(fileOrUrl, strategy2);
        const strategy2 = () => {
            if (!isCloud) return localFetchStrategy(); // Si es local y falló direct, intentar fetch
            const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(fileOrUrl)}&w=400&il&output=jpg`;
            tryLoad(proxyUrl, strategy3);
        };
        const strategy3 = () => {
            const proxyUrl = `https://i0.wp.com/${fileOrUrl.replace(/^https?:\/\//, '')}?w=400`;
            tryLoad(proxyUrl, () => resolve(null));
        };

        strategy1();
    });
};

window.deleteTorneoDoc = async (id, docIndex) => {
    if (!confirm('¿Seguro que quieres eliminar este documento?')) return;
    try {
        const { data: conv } = await supabaseClient.from('convocatorias').select('lugar').eq('id', Number(id)).single();
        const metadata = window.getConvMetadata(conv);
        const docs = metadata.documentos || [];
        docs.splice(docIndex, 1);

        await window.saveConvMetadata(id, 'documentos', docs);
        window.viewTorneoRendimiento(id);
    } catch (err) {
        console.error("Delete error:", err);
        window.customAlert('Error', 'No se pudo eliminar el documento: ' + err.message, 'error');
    }
}; window.handleTorneoDocUpload = async (id, files) => {
    if (!files || files.length === 0) return;
    const btn = document.querySelector(`button[onclick*="torneo-doc-upload"]`);
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="w-4 h-4 animate-spin text-blue-600">...</i>';

    try {
        const uploadPromises = Array.from(files).map(async (file) => {
            const publicUrl = await db.uploadFile(file, 'tareas', 'tasks');
            return publicUrl ? { name: file.name, url: publicUrl } : null;
        });

        const results = (await Promise.all(uploadPromises)).filter(r => r !== null);

        if (results.length > 0) {
            const { data: conv } = await supabaseClient.from('convocatorias').select('lugar').eq('id', Number(id)).single();
            const metadata = window.getConvMetadata(conv);
            const docs = metadata.documentos || [];
            const updatedDocs = [...docs, ...results];

            await window.saveConvMetadata(id, 'documentos', updatedDocs);

            window.viewTorneoRendimiento(id);
            window.customAlert('Éxito', `${results.length} archivo(s) subido(s) correctamente`, 'success');
        }
    } catch (err) {
        console.error("Upload error details:", err);
        const errorMsg = err.message || err.error_description || 'Error de permisos o conexión';
        window.customAlert('Error al subir', `No se pudieron subir los archivos. Detalle: ${errorMsg}`, 'error');
    } finally {
        btn.innerHTML = originalHtml;
    }
}; const PLAYER_POSITIONS = ['PO', 'DBD', 'DBZ', 'DCD', 'DCZ', 'MCD', 'MCZ', 'MVD', 'MVZ', 'MBD', 'MBZ', 'MPD', 'MPZ', 'ACD', 'ACZ'];
const CLUBES_CONVENIDOS = ['CD BAZTAN KE', 'BETI GAZTE KJKE', 'GURE TXOKOA KKE', 'CA RIVER EBRO', 'CALAHORRA FB', 'EF ARNEDO', 'EFB ALFARO', 'UD BALSAS PICARRAL'];

window.currentVisibilityMode = 'personal';
window.getSeason = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-11
    if (month >= 6) return `${year}/${year + 1}`;
    return `${year - 1}/${year}`;
};
window.currentSeason = 'ALL'; // Default to Historial Completo to avoid confusion

window.initSeasons = () => {
    const selector = document.getElementById('season-selector');
    if (!selector) return;
    const currentYear = new Date().getFullYear();
    let html = '<option value="ALL">HISTORIAL COMPLETO</option>';
    for (let y = 2023; y <= currentYear + 1; y++) {
        const season = `${y}/${y + 1}`;
        html += `<option value="${season}" ${season === window.currentSeason ? 'selected' : ''}>TEMP. ${season}</option>`;
    }
    selector.innerHTML = html;
};

window.initSeasons = () => {
    const selector = document.getElementById('season-selector');
    if (!selector) return;

    // Si no hay temporada seleccionada, calculamos la actual
    if (!window.currentSeason || window.currentSeason === 'ALL') {
        window.currentSeason = window.getSeason(new Date());
    }

    const currentYear = new Date().getFullYear();
    let html = '<option value="ALL">HISTORIAL COMPLETO</option>';
    for (let y = 2023; y <= currentYear + 1; y++) {
        const season = `${y}/${y + 1}`;
        html += `<option value="${season}" ${season === window.currentSeason ? 'selected' : ''}>TEMP. ${season}</option>`;
    }
    selector.innerHTML = html;
};

window.renderPerfil = async function (container) {
    try {
        const user = await db.getUser();
        if (!user) {
            container.innerHTML = `<div class="p-20 text-center italic text-slate-400 uppercase tracking-widest text-[10px]">No se ha podido cargar la sesión del usuario</div>`;
            return;
        }

        let profile = null;
        try {
            const { data } = await supabaseClient.from('profiles').select('*').eq('id', user.id).maybeSingle();
            profile = data;
        } catch (e) {
            console.warn("Could not fetch profile, might be missing columns:", e);
        }

        const displayName = profile?.nombre || profile?.full_name || profile?.name || 'Mi Perfil';
        const userPhoto = profile?.avatar_url || profile?.foto || null;

        container.innerHTML = `
            <div class="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div class="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                    <div class="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
                    <div class="px-12 pb-12">
                        <div class="relative -mt-16 mb-8 flex items-end gap-6">
                            <div class="w-32 h-32 bg-white rounded-[2.5rem] p-2 shadow-2xl relative group cursor-pointer overflow-hidden" onclick="document.getElementById('profile-photo-input').click()">
                                <div class="w-full h-full bg-slate-50 rounded-[2rem] flex items-center justify-center overflow-hidden border border-slate-100">
                                    ${userPhoto ? `<img src="${userPhoto}" class="w-full h-full object-cover">` : `<i data-lucide="user" class="w-12 h-12 text-slate-300"></i>`}
                                </div>
                                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                    <i data-lucide="camera" class="w-8 h-8 text-white"></i>
                                </div>
                                <input type="file" id="profile-photo-input" class="hidden" accept="image/*">
                            </div>
                            <div class="pb-2">
                                <h3 class="text-3xl font-black text-slate-800 uppercase tracking-tight">${displayName}</h3>
                                <p class="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">${profile?.role || 'ENTRENADOR'}</p>
                            </div>
                        </div>

                        <form id="profile-form" class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre Completo</label>
                                <input name="nombre" type="text" value="${profile?.nombre || profile?.full_name || profile?.name || ''}" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all">
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email (Lectura)</label>
                                <input type="email" value="${user.email}" disabled class="w-full p-4 bg-slate-100 border border-slate-100 rounded-2xl font-bold text-slate-400 cursor-not-allowed">
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Teléfono</label>
                                <input name="phone" type="tel" value="${profile?.phone || ''}" placeholder="Ej: +34 600 000 000" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all">
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Club / Entidad</label>
                                <input name="club" type="text" value="${profile?.club || 'RS CENTRO'}" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all">
                            </div>
                            
                            <div class="md:col-span-2 pt-8 border-t border-slate-50 flex justify-end">
                                <button type="submit" id="save-profile-btn" class="px-12 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-[10px]">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>

                <div class="bg-amber-50 rounded-[2.5rem] border border-amber-100 p-8 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm">
                            <i data-lucide="shield-check" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <h4 class="text-xs font-black text-amber-800 uppercase tracking-widest">Seguridad de la Cuenta</h4>
                            <p class="text-[10px] font-medium text-amber-600 mt-0.5">Tu cuenta está protegida con autenticación de Supabase.</p>
                        </div>
                    </div>
                    <button onclick="window.customAlert('Proximamente', 'La gestión de contraseñas estará disponible pronto.', 'info')" class="px-6 py-3 bg-white text-amber-600 font-bold rounded-xl text-[10px] uppercase tracking-widest shadow-sm hover:bg-amber-100 transition-all">Cambiar Contraseña</button>
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();

        const photoInput = document.getElementById('profile-photo-input');
        if (photoInput) {
            photoInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (re) => {
                        const imgContainer = document.querySelector('.w-32.h-32 .bg-slate-50');
                        imgContainer.innerHTML = `<img src="${re.target.result}" class="w-full h-full object-cover">`;
                    };
                    reader.readAsDataURL(file);
                }
            };
        }

        const form = document.getElementById('profile-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const formData = Object.fromEntries(new FormData(e.target));
                const btn = document.getElementById('save-profile-btn');
                const originalText = btn.innerText;
                btn.disabled = true;
                btn.innerText = 'GUARDANDO...';

                try {
                    let avatarUrl = profile?.avatar_url || profile?.foto;
                    const photoInput = document.getElementById('profile-photo-input');
                    if (photoInput && photoInput.files && photoInput.files[0]) {
                        avatarUrl = await db.uploadImage(photoInput.files[0]);
                    }

                    const profileUpdate = {
                        id: user.id,
                        email: user.email,
                        nombre: formData.nombre,
                        full_name: formData.nombre,
                        avatar_url: avatarUrl,
                        foto: avatarUrl,
                        phone: formData.phone,
                        club: formData.club
                    };

                    const { error } = await supabaseClient.from('profiles').upsert(profileUpdate);
                    if (error) throw error;

                    window.customAlert('¡Éxito!', 'Perfil actualizado correctamente.', 'success');
                    window.renderPerfil(container);
                } catch (err) {
                    console.error("Error saving profile:", err);
                    window.customAlert('Error', 'No se pudieron guardar los cambios: ' + err.message, 'error');
                } finally {
                    btn.disabled = false;
                    btn.innerText = originalText;
                }
            };
        }
    } catch (err) {
        console.error("Error critico en renderPerfil:", err);
        container.innerHTML = `<div class="p-20 text-center">
            <i data-lucide="alert-circle" class="w-12 h-12 text-rose-500 mx-auto mb-4"></i>
            <p class="text-slate-800 font-black uppercase tracking-tight text-xl">Error al cargar el perfil</p>
            <p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">${err.message}</p>
            <button onclick="window.renderPerfil(document.getElementById('view-container'))" class="mt-8 px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">Reintentar</button>
        </div>`;
        if (window.lucide) lucide.createIcons();
    }
};

window.renderUsuarios = async function (container) {
    try {
        const { data: users, error } = await supabaseClient.from('profiles').select('*');
        if (error) throw error;

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                ${users && users.length > 0 ? users.map(u => {
            const uName = u.nombre || u.full_name || u.name || 'Sin nombre';
            const uPhoto = u.avatar_url || u.foto;
            return `
                        <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
                            <div class="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:bg-blue-50 transition-colors"></div>
                            
                            <div class="relative flex items-start justify-between mb-6">
                                <div class="w-20 h-20 bg-slate-50 rounded-[1.5rem] p-1.5 shadow-inner border border-slate-100">
                                    <div class="w-full h-full rounded-[1.2rem] bg-white flex items-center justify-center overflow-hidden shadow-sm">
                                        ${uPhoto ? `<img src="${uPhoto}" class="w-full h-full object-cover">` : `<span class="text-2xl font-black text-slate-300">${uName.substring(0, 1).toUpperCase()}</span>`}
                                    </div>
                                </div>
                                <div class="flex flex-col gap-2">
                                    <span class="px-3 py-1.5 ${u.role === 'ELITE' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'} rounded-xl text-[9px] font-black uppercase tracking-widest text-center shadow-sm">
                                        ${u.role || 'TECNICO'}
                                    </span>
                                </div>
                            </div>

                            <div class="space-y-4 mb-8">
                                <div>
                                    <h4 class="text-lg font-black text-slate-800 uppercase tracking-tight leading-tight">${uName}</h4>
                                    <p class="text-[10px] font-bold text-slate-400 lowercase">${u.email || ''}</p>
                                </div>
                                <div class="flex flex-col gap-2">
                                    <div class="flex items-center gap-2 text-slate-500">
                                        <i data-lucide="phone" class="w-3.5 h-3.5"></i>
                                        <span class="text-[10px] font-bold">${u.phone || 'No disponible'}</span>
                                    </div>
                                    <div class="flex items-center gap-2 text-slate-500">
                                        <i data-lucide="briefcase" class="w-3.5 h-3.5"></i>
                                        <span class="text-[10px] font-bold uppercase tracking-widest">${u.club || 'RS CENTRO'}</span>
                                    </div>
                                </div>
                            </div>

                            <div class="flex gap-2 pt-6 border-t border-slate-50">
                                <button onclick="window.editUserRole('${u.id}', '${u.role}')" class="flex-1 py-3 bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all flex items-center justify-center gap-2 group/btn">
                                    <i data-lucide="shield" class="w-4 h-4"></i>
                                    <span class="text-[9px] font-black uppercase tracking-widest">Rol</span>
                                </button>
                                <button onclick="window.deleteUser('${u.id}')" class="flex-1 py-3 bg-slate-50 text-slate-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all flex items-center justify-center gap-2 group/btn">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    <span class="text-[9px] font-black uppercase tracking-widest">Baja</span>
                                </button>
                            </div>
                        </div>
                    `;
        }).join('') : `
                    <div class="col-span-full p-20 bg-white rounded-[3rem] border border-dashed border-slate-200 text-center">
                        <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <i data-lucide="users" class="w-10 h-10 text-slate-300"></i>
                        </div>
                        <p class="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No hay miembros del staff registrados</p>
                    </div>
                `}
            </div>
        `;

        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error("Error en renderUsuarios:", err);
        container.innerHTML = `<div class="p-20 text-center italic text-slate-400 uppercase tracking-widest text-[10px]">Error al cargar el staff: ${err.message}</div>`;
    }
};

window.showNewUserModal = () => {
    const modalContainer = document.getElementById('modal-container');
    const modalOverlay = document.getElementById('modal-overlay');

    modalContainer.innerHTML = `
        <div class="p-10">
            <div class="flex justify-between items-center mb-8">
                <div>
                    <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Nuevo Miembro</h3>
                    <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Registrar acceso para técnico</p>
                </div>
                <button onclick="closeModal()" class="p-3 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-all"><i data-lucide="x" class="w-5 h-5"></i></button>
            </div>
            
            <form id="new-user-form" class="space-y-6">
                <div class="space-y-2">
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email del Técnico</label>
                    <input name="email" type="email" required placeholder="email@ejemplo.com" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50">
                    <p class="text-[9px] text-amber-600 font-bold uppercase tracking-tight px-1 italic">Nota: El usuario deberá completar su registro con este email.</p>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre Completo</label>
                        <input name="nombre" type="text" required class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none">
                    </div>
                    <div class="space-y-2">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Rol Inicial</label>
                        <select name="role" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none appearance-none">
                            <option value="TECNICO">TECNICO</option>
                            <option value="ELITE">ADMIN (ELITE)</option>
                            <option value="TECNICO CLUB CONVENIDO">CONVENIDO</option>
                        </select>
                    </div>
                </div>

                <div class="pt-8 border-t border-slate-100 flex justify-end gap-3">
                    <button type="button" onclick="closeModal()" class="px-8 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px]">Cancelar</button>
                    <button type="submit" class="px-12 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all uppercase tracking-widest text-[10px]">Crear Invitación</button>
                </div>
            </form>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
    modalOverlay.classList.add('active');

    document.getElementById('new-user-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));

        try {
            const { error } = await supabaseClient.from('profiles').insert([{
                email: data.email,
                nombre: data.nombre,
                role: data.role,
                id: crypto.randomUUID()
            }]);

            if (error) throw error;
            window.customAlert('¡Éxito!', 'Perfil de staff creado. El técnico puede registrarse con este email.', 'success');
            closeModal();
            window.renderUsuarios(document.getElementById('content-container'));
        } catch (err) {
            window.customAlert('Error', err.message, 'error');
        }
    };
};

window.editUserRole = async (userId, currentRole) => {
    const newRole = prompt('Cambiar rol (ELITE, TECNICO, TECNICO CLUB CONVENIDO):', currentRole);
    if (newRole && newRole !== currentRole) {
        try {
            const { error } = await supabaseClient.from('profiles').update({ role: newRole.toUpperCase() }).eq('id', userId);
            if (error) throw error;
            window.customAlert('¡Actualizado!', 'Rol de usuario actualizado.', 'success');
            window.renderUsuarios(document.getElementById('content-container'));
        } catch (err) {
            window.customAlert('Error', err.message, 'error');
        }
    }
};

window.deleteUser = async (userId) => {
    window.customConfirm('¿Eliminar Acceso?', '¿Estás seguro de que quieres eliminar a este miembro del staff? No podrá acceder a la plataforma.', async () => {
        try {
            const { error } = await supabaseClient.from('profiles').delete().eq('id', userId);
            if (error) throw error;
            window.customAlert('¡Eliminado!', 'Acceso revocado correctamente.', 'success');
            window.renderUsuarios(document.getElementById('content-container'));
        } catch (err) {
            window.customAlert('Error', err.message, 'error');
        }
    });
};

window.setSeason = (season) => {
    window.currentSeason = season;
    const activeLink = document.querySelector('.nav-link.active');
    if (activeLink) window.switchView(activeLink.dataset.view);
};

window.applyGlobalFilters = (items, dateField = 'fecha', options = {}) => {
    if (!items) return [];
    let filtered = [...items];

    // Visibility
    if (window.currentVisibilityMode === 'personal' && window.currentUser && !options.skipVisibility) {
        filtered = filtered.filter(i => {
            // Case 1: Created by current user
            if (!i.createdBy || i.createdBy === window.currentUser.id) return true;
            
            // Case 2: Shared with current user (metadata in 'lugar' field)
            if (i.lugar && i.lugar.includes(' ||| ')) {
                try {
                    const { extra } = window.parseLugarMetadata(i.lugar);
                    if (extra && extra.sw && Array.isArray(extra.sw) && extra.sw.includes(window.currentUser.id)) {
                        return true;
                    }
                } catch (e) {}
            }
            
            // Case 3: Shared with current user (direct property)
            if (i.sharedWith && Array.isArray(i.sharedWith) && i.sharedWith.includes(window.currentUser.id)) {
                return true;
            }

            return false;
        });
    }

    // Season
    if (window.currentSeason !== 'ALL' && dateField) {
        filtered = filtered.filter(i => {
            const dateVal = i[dateField];
            if (!dateVal) return false;
            return window.getSeason(dateVal) === window.currentSeason;
        });
    }

    return filtered;
};

window.ensureClubesInitialized = async () => {
    try {
        // Migración: Unificar variaciones de BALSAS
        const players = await db.getAll('jugadores');
        for (const p of players) {
            if (p.equipoConvenido && p.equipoConvenido.toUpperCase().includes('BALSAS') && p.equipoConvenido !== 'UD BALSAS PICARRAL') {
                await db.update('jugadores', { ...p, equipoConvenido: 'UD BALSAS PICARRAL' });
            }
        }

        const existing = await db.getAll('clubes');
        // Eliminar duplicados de Balsas en la tabla de clubes
        for (const c of existing) {
            if (c.nombre.toUpperCase().includes('BALSAS') && c.nombre !== 'UD BALSAS PICARRAL') {
                await db.delete('clubes', c.id);
            }
        }

        if (existing.filter(c => !c.nombre.toUpperCase().includes('BALSAS') || c.nombre === 'UD BALSAS PICARRAL').length === 0) {
            console.log("Initializing partner clubs...");
            for (const name of CLUBES_CONVENIDOS) {
                await db.add('clubes', { nombre: name, escudo: null });
            }
        }

        // Migración masiva de fotos de jugadores (EN SEGUNDO PLANO Y PROCESADO POR LOTES)
        setTimeout(async () => {
            try {
                const players = await db.getAll('jugadores');
                let updatedCount = 0;
                const batchSize = 20;
                
                for (let i = 0; i < players.length; i += batchSize) {
                    const batch = players.slice(i, i + batchSize);
                    let batchChanged = false;
                    for (const p of batch) {
                        if (!p.foto || p.foto.includes('placeholder')) {
                            p.foto = 'Imagenes/Foto Jugador General.png';
                            await db.update('jugadores', p);
                            updatedCount++;
                            batchChanged = true;
                        }
                    }
                    // Pequeña pausa entre lotes si hubo cambios para liberar el hilo principal
                    if (batchChanged) await new Promise(r => setTimeout(r, 50));
                }
                if (updatedCount > 0) console.log(`Migración de fotos completada: ${updatedCount} jugadores actualizados.`);
            } catch (err) {
                console.warn("Background migration warning:", err);
            }
        }, 2000);

    } catch (err) {
        console.error("Error initializing data:", err);
    }
};

window.toggleVisibility = (mode) => {
    // Security check: only ELITE users can see global
    if (mode === 'global' && db.userRole !== 'ELITE') {
        window.customAlert('Acceso Restringido', 'No tienes permisos para ver el espacio global.', 'error');
        return;
    }

    window.currentVisibilityMode = mode;

    // Update UI buttons
    const personalBtn = document.getElementById('mode-personal');
    const globalBtn = document.getElementById('mode-global');

    if (mode === 'personal') {
        personalBtn.classList.add('bg-white', 'text-blue-600', 'shadow-sm');
        personalBtn.classList.remove('text-slate-400');
        globalBtn.classList.remove('bg-white', 'text-blue-600', 'shadow-sm');
        globalBtn.classList.add('text-slate-400');
    } else {
        globalBtn.classList.add('bg-white', 'text-blue-600', 'shadow-sm');
        globalBtn.classList.remove('text-slate-400');
        personalBtn.classList.remove('bg-white', 'text-blue-600', 'shadow-sm');
        personalBtn.classList.add('text-slate-400');
    }

    // Refresh current view
    const container = document.getElementById('content-container');
    if (window.currentView) {
        window.renderView(window.currentView);
    }
};

window.getSortedTeams = (teams) => {
    if (!teams || !Array.isArray(teams)) return [];
    return [...teams].sort((a, b) => {
        const nameA = (a.nombre || '').toUpperCase();
        const nameB = (b.nombre || '').toUpperCase();

        const isSpecialA = nameA.includes('INFANTIL ALEVÍN FEMENINO');
        const isSpecialB = nameB.includes('INFANTIL ALEVÍN FEMENINO');

        if (isSpecialA && !isSpecialB) return 1;
        if (!isSpecialA && isSpecialB) return -1;

        const getYear = (t) => {
            const name = (t.nombre || '').toUpperCase();
            for (let y = 2010; y <= 2025; y++) {
                if (name.includes(String(y))) return y;
            }
            const fromCat = parseInt(t.categoria);
            if (!isNaN(fromCat) && fromCat >= 2000 && fromCat < 2100) return fromCat;
            return 9999;
        };

        const yearA = getYear(a);
        const yearB = getYear(b);

        if (yearA !== yearB) return yearA - yearB;
        return nameA.localeCompare(nameB);
    });
};

window.formatAttendanceName = (dateStr, teamName, type, eventName) => {
    if (!dateStr) dateStr = new Date().toISOString().split('T')[0];
    let formattedDate = dateStr;
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const [y, m, d] = parts;
            const shortYear = y.substring(2);
            formattedDate = `${d}.${m}.${shortYear}`;
        }
    } catch (e) { }

    const cleanTeam = String(teamName || 'EQUIPO').split(' ||| ')[0].toUpperCase();
    let base = `Asistencia ${formattedDate}_${cleanTeam}_`;

    const cleanType = String(type || '').toLowerCase();
    const cleanEvent = String(eventName || '').split(' ||| ')[0].toUpperCase();

    if (cleanType.includes('torneo') || cleanType.includes('ciclo')) {
        if (cleanEvent && cleanEvent !== 'SIN NOMBRE' && cleanEvent !== 'ENTRENAMIENTO') {
            base += `${cleanEvent}_`;
        }
    }

    return base;
};



window.getConvMetadata = (conv) => {
    return window.parseLugarMetadata(conv?.lugar).extra;
};

window.parseLugarMetadata = (lugarStr) => {
    if (!lugarStr) return { base: '', extra: {} };
    if (!lugarStr.includes(' ||| ')) return { base: lugarStr, extra: {} };
    try {
        const [base, jsonInfo] = lugarStr.split(' ||| ');
        return { base: (base || '').toUpperCase().trim(), extra: JSON.parse(jsonInfo) || {} };
    } catch (e) {
        console.error("Error parsing lugar metadata:", e);
        return { base: (lugarStr.split(' ||| ')[0] || '').toUpperCase().trim(), extra: {} };
    }
};

window.serializeLugarMetadata = (base, extra) => {
    return `${(base || '').toUpperCase().trim()} ||| ${JSON.stringify(extra || {})}`;
};

window.saveConvMetadata = async (id, key, value) => {
    const { data: conv } = await supabaseClient.from('convocatorias').select('lugar').eq('id', Number(id)).single();
    if (!conv) return;

    const { base, extra } = window.parseLugarMetadata(conv.lugar);
    extra[key] = value;
    const newLugar = window.serializeLugarMetadata(base, extra);

    await db.update('convocatorias', { id: Number(id), lugar: newLugar });
};

window.getComunidadByLugar = (lugarStr, nombreStr = '') => {
    if (!lugarStr && !nombreStr) return 'OTRO';

    // Normalizamos el texto (quitamos acentos y pasamos a mayúsculas)
    const normalize = (str) => (str || '').toUpperCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .trim();

    const cleanLugar = window.cleanLugar(lugarStr);
    const combined = normalize(cleanLugar + ' ' + nombreStr);

    const navarraKeywords = ['TUDELA', 'PAMPLONA', 'LODOSA', 'CORELLA', 'MILAGRO', 'NAVARRA', 'OLITE', 'TAFALLA', 'ESTELLA', 'VALTIERRA', 'MURCHANTE', 'CASCANTE', 'CINTRUENIGO', 'FITERO', 'MARCILLA', 'PERALTA', 'CAPARROSO', 'VILLAFRANCA', 'AZAGRA', 'SAN ADRIAN', 'CADREITA', 'RIBAFORADA', 'FUSTINANA', 'CABANILLAS', 'CORTES', 'BUNUEL', 'ABLITAS', 'MONTEAGUDO', 'BARILLAS', 'TULEBRAS', 'MURCHANTE', 'LESCUN', 'IRUNA', 'BAZTAN', 'ALSASUA', 'VIANA', 'ELIZONDO', 'BERA', 'BERA DE BIDASOA', 'DONEZTEBE', 'SANTESTEBAN', 'LEITZA', 'PUENTE LA REINA', 'SANGUESA'];
    const riojaKeywords = ['ARNEDO', 'CALAHORRA', 'LOGRONO', 'ALFARO', 'RIOJA', 'NAJERA', 'HARO', 'SANTO DOMINGO', 'QUEL', 'AUTOL', 'ALDEANUEVA', 'RINCON DE SOTO', 'PRADEJON', 'CERVERA', 'AGUILAR', 'IREGUA', 'ALBERITE', 'LARDERO', 'VILLAMEDIANA', 'FUENMAYOR', 'NAVARRETE', 'ENTRENA'];

    if (navarraKeywords.some(kw => combined.includes(kw))) return 'NAVARRA';
    if (riojaKeywords.some(kw => combined.includes(kw))) return 'LA RIOJA';

    return 'OTRO';
};

window.cleanLugar = (l) => {
    return window.parseLugarMetadata(l).base;
};

window.renderStars = (rating = 3, playerId = null) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        const color = i <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200';
        if (playerId) {
            stars.push(`
                    <button type="button" onclick="event.stopPropagation(); window.updatePlayerLevel('${playerId}', ${i})" class="p-0.5 hover:scale-125 transition-transform">
                        <i data-lucide="star" class="w-3 h-3 ${color}"></i>
                    </button>
                `);
        } else {
            stars.push(`<i data-lucide="star" class="w-3 h-3 ${color}"></i>`);
        }
    }
    return `<div class="flex items-center gap-0.5 justify-center">${stars.join('')}</div>`;
};

window.updatePlayerLevel = async (playerId, newLevel) => {
    await window.updatePlayerField(playerId, 'nivel', newLevel);
};

window.updatePlayerField = async (playerId, field, value) => {
    try {
        const player = await db.get('jugadores', playerId);
        if (!player) return;

        player[field] = value;
        await db.update('jugadores', player);

        // Refresh current view if applicable
        if (window.currentView === 'jugadores') {
            window.renderJugadores(document.getElementById('content-container'));
        } else if (window.currentView === 'campograma') {
            window.renderView('campograma');
        }

        // If the profile modal is open, refresh its content
        const profileHeader = document.querySelector('h3.text-3xl.font-black');
        if (profileHeader && profileHeader.innerText.includes(player.nombre?.toUpperCase() || '')) {
            window.viewPlayerProfile(playerId);
        }
    } catch (err) {
        console.error(`Error updating player ${field}:`, err);
    }
};

window.togglePlayerLateralidad = async (playerId, current) => {
    const cycle = ['', 'Derecho', 'Zurdo', 'Ambidiestro'];
    let nextIdx = cycle.indexOf(current) + 1;
    if (nextIdx >= cycle.length) nextIdx = 0;
    await window.updatePlayerField(playerId, 'lateralidad', cycle[nextIdx]);
};

window.togglePlayerSexo = async (playerId, current) => {
    const next = (current === 'Masculino') ? 'Femenino' : (current === 'Femenino' ? '' : 'Masculino');
    await window.updatePlayerField(playerId, 'sexo', next);
};

window.toggleInlinePosSelector = (playerId, event) => {
    event.stopPropagation();
    const existing = document.getElementById(`pos-selector-${playerId}`);
    if (existing) {
        existing.remove();
        return;
    }

    // Close others
    document.querySelectorAll('.inline-pos-selector').forEach(el => el.remove());

    const rect = event.currentTarget.getBoundingClientRect();
    const div = document.createElement('div');
    div.id = `pos-selector-${playerId}`;
    div.className = 'inline-pos-selector fixed bg-white shadow-2xl rounded-2xl border border-slate-100 p-4 z-[9999] w-64 animate-in zoom-in-95 duration-200';

    // Intelligent Positioning
    const menuHeight = 280;
    let top = rect.bottom + 8;
    let left = rect.left;

    if (top + menuHeight > window.innerHeight) {
        top = rect.top - menuHeight - 8;
        if (top < 10) top = 10; // Don't go above screen
    }

    if (left + 256 > window.innerWidth) {
        left = window.innerWidth - 256 - 16;
    }

    div.style.top = `${top}px`;
    div.style.left = `${left}px`;

    db.get('jugadores', playerId).then(player => {
        const current = window.parsePosition(player.posicion);
        div.innerHTML = `
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Seleccionar Posiciones</p>
                <div class="grid grid-cols-3 gap-1.5">
                    ${PLAYER_POSITIONS.map(pos => `
                        <button onclick="window.toggleInlinePosItem('${playerId}', '${pos}', this)" class="px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight border transition-all ${current.includes(pos) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-100 hover:border-blue-200'}">
                            ${pos}
                        </button>
                    `).join('')}
                </div>
                <div class="mt-4 pt-3 border-t border-slate-50 flex justify-end">
                    <button onclick="this.parentElement.parentElement.remove()" class="px-4 py-2 bg-slate-900 text-white text-[9px] font-black uppercase rounded-xl hover:bg-black transition-all">Hecho</button>
                </div>
            `;
        document.body.appendChild(div);
    });

    // Click outside listener
    const closeOnOutside = (e) => {
        if (!div.contains(e.target) && !event.currentTarget.contains(e.target)) {
            div.remove();
            document.removeEventListener('click', closeOnOutside);
        }
    };
    setTimeout(() => document.addEventListener('click', closeOnOutside), 10);
};

window.toggleInlinePosItem = async (playerId, pos, btn) => {
    const player = await db.get('jugadores', playerId);
    let current = window.parsePosition(player.posicion);

    if (current.includes(pos)) {
        current = current.filter(p => p !== pos);
        btn.className = 'px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight border transition-all bg-white text-slate-400 border-slate-100 hover:border-blue-200';
    } else {
        current.push(pos);
        btn.className = 'px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight border transition-all bg-blue-600 text-white border-blue-600';
    }

    await window.updatePlayerField(playerId, 'posicion', current);
};

window.initStarRating = (containerId, initialValue = 3) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const updateStars = (val) => {
        const stars = container.querySelectorAll('[data-lucide="star"]');
        stars.forEach((star, idx) => {
            if (idx < val) {
                star.classList.add('text-amber-400', 'fill-amber-400');
                star.classList.remove('text-slate-200', 'fill-slate-200');
            } else {
                star.classList.remove('text-amber-400', 'fill-amber-400');
                star.classList.add('text-slate-200', 'fill-slate-200');
            }
        });
        const input = container.querySelector('input[name="nivel"]');
        if (input) input.value = val;
    };

    container.innerHTML = `
            <input type="hidden" name="nivel" value="${initialValue}">
            <div class="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-2xl justify-center">
                ${[1, 2, 3, 4, 5].map(i => `
                    <button type="button" onclick="this.parentElement.parentElement.querySelector('input').value = ${i}; const stars = this.parentElement.querySelectorAll('[data-lucide=\\'star\\']'); stars.forEach((s, idx) => { if (idx < ${i}) { s.classList.add('text-amber-400', 'fill-amber-400'); s.classList.remove('text-slate-200', 'fill-slate-200'); } else { s.classList.remove('text-amber-400', 'fill-amber-400'); s.classList.add('text-slate-200', 'fill-slate-200'); } });" class="p-1 hover:scale-110 transition-transform">
                        <i data-lucide="star" class="w-6 h-6 ${i <= initialValue ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}"></i>
                    </button>
                `).join('')}
            </div>
        `;
    if (window.lucide) lucide.createIcons();
};

window.renderPositionSelector = (selectedPositions = [], id = "pos", onChangeCallback = "") => {
    const label = selectedPositions.length === 0 ? 'SELECCIONAR POSICIONES' :
        selectedPositions.length === 1 ? selectedPositions[0] :
            `${selectedPositions[0]} + ${selectedPositions.length - 1}`;

    return `
        <div class="relative group/ms">
            <button type="button" onclick="document.querySelectorAll('[id$=-menu]').forEach(m => m.id !== '${id}-modal-menu' && m.classList.add('hidden')); document.getElementById('${id}-modal-menu').classList.toggle('hidden')" 
                class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 text-[10px] uppercase tracking-widest flex justify-between items-center hover:bg-white hover:border-blue-200 transition-all shadow-sm">
                <span>${label}</span>
                <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400"></i>
            </button>
            <div id="${id}-modal-menu" class="hidden absolute z-[60] top-full left-0 w-full bg-white border border-slate-100 shadow-2xl rounded-3xl mt-2 p-4 max-h-64 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-200">
                <div class="grid grid-cols-3 gap-1">
                    ${PLAYER_POSITIONS.map(pos => {
        const isSelected = selectedPositions.includes(pos);
        return `
                            <label class="flex items-center gap-2 p-2 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                <input type="checkbox" name="posicion" value="${pos}" ${isSelected ? 'checked' : ''} onchange="const val = [...this.closest('#${id}-modal-menu').querySelectorAll('input:checked')].map(i => i.value).join(', '); this.closest('.group\\/ms').querySelector('button span').innerText = val === '' ? 'SELECCIONAR POSICIONES' : [...this.closest('#${id}-modal-menu').querySelectorAll('input:checked')].length === 1 ? val : val.split(', ')[0] + ' + ' + ([...this.closest('#${id}-modal-menu').querySelectorAll('input:checked')].length - 1); ${onChangeCallback ? `${onChangeCallback}(val)` : ''}" class="w-4 h-4 rounded-md border-2 border-slate-200 text-blue-600 focus:ring-4 focus:ring-blue-100">
                                <span class="text-[10px] font-black ${isSelected ? 'text-blue-600' : 'text-slate-500'} uppercase font-outfit">${pos}</span>
                            </label>
                        `;
    }).join('')}
                </div>
            </div>
        </div>
    `;
};
window.customAlert = (title, message, type = 'info') => {
    const colors = {
        success: 'bg-emerald-500',
        error: 'bg-red-500',
        info: 'bg-blue-600'
    };
    const icons = {
        success: 'check',
        error: 'alert-circle',
        info: 'info'
    };

    const alertModal = document.createElement('div');
    alertModal.className = 'fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300';
    alertModal.innerHTML = `
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
        <div class="bg-white rounded-[2.5rem] p-10 max-w-sm w-full relative shadow-[0_20px_50px_rgba(0,0,0,0.3)] transform animate-in zoom-in duration-300 text-center">
            <div class="w-20 h-20 ${colors[type] || colors.info} text-white rounded-[2rem] flex items-center justify-center mb-8 mx-auto shadow-2xl">
                <i data-lucide="${icons[type] || 'info'}" class="w-10 h-10"></i>
            </div>
            <h4 class="text-2xl font-black text-slate-800 uppercase tracking-tight mb-3">${title}</h4>
            <p class="text-slate-500 text-sm mb-10 leading-relaxed">${message}</p>
            <button id="close-alert" class="w-full py-5 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-slate-800 transition-all active:scale-95">CONTINUAR</button>
        </div>
    `;
    document.body.appendChild(alertModal);
    if (window.lucide) lucide.createIcons();

    alertModal.querySelector('#close-alert').onclick = () => {
        alertModal.classList.add('animate-out', 'fade-out', 'zoom-out');
        setTimeout(() => document.body.removeChild(alertModal), 300);
    };
};

window.customConfirm = (title, message, onConfirm) => {
    const confirmModal = document.createElement('div');
    confirmModal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300';
    confirmModal.innerHTML = `
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
        <div class="bg-white rounded-[2.5rem] p-10 max-w-sm w-full relative shadow-[0_20px_50px_rgba(0,0,0,0.3)] transform animate-in zoom-in duration-300 text-center">
            <div class="w-20 h-20 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center mb-8 mx-auto shadow-2xl">
                <i data-lucide="help-circle" class="w-10 h-10"></i>
            </div>
            <h4 class="text-2xl font-black text-slate-800 uppercase tracking-tight mb-3">${title}</h4>
            <p class="text-slate-500 text-sm mb-10 leading-relaxed">${message}</p>
            <div class="grid grid-cols-2 gap-4">
                <button id="cancel-confirm" class="py-5 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">NO</button>
                <button id="exec-confirm" class="py-5 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">SÍ, ADELANTE</button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmModal);
    if (window.lucide) lucide.createIcons();

    const close = () => {
        confirmModal.classList.add('animate-out', 'fade-out', 'zoom-out');
        setTimeout(() => document.body.removeChild(confirmModal), 300);
    };

    confirmModal.querySelector('#cancel-confirm').onclick = close;
    confirmModal.querySelector('#exec-confirm').onclick = async () => {
        await onConfirm();
        close();
    };
};

window.customModal = (html) => {
    const modal = document.createElement('div');
    modal.id = 'custom-modal-overlay';
    modal.className = 'fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-300';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onclick="window.closeCustomModal()"></div>
        <div class="bg-white rounded-[2.5rem] max-w-lg w-full relative shadow-[0_20px_50px_rgba(0,0,0,0.3)] transform animate-in zoom-in duration-300 overflow-hidden">
            ${html}
        </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
};
window.closeCustomModal = () => {
    const modal = document.getElementById('custom-modal-overlay');
    if (modal) {
        modal.classList.add('animate-out', 'fade-out', 'zoom-out');
        setTimeout(() => modal.remove(), 300);
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize DB
    await db.init();

    // --- TEMPORARY CLEANUP SCRIPT (RUNS ONCE) ---
    if (localStorage.getItem('force_photo_reset') === 'true') {
        try {
            console.log("Starting aggressive photo cleanup...");
            const players = await db.getAll('jugadores');
            for (const p of players) {
                const tx = db.db.transaction('jugadores', 'readwrite');
                const store = tx.objectStore('jugadores');
                p.foto = null;
                p.avatar_url = null;
                store.put(p);
            }
            localStorage.removeItem('force_photo_reset');
            localStorage.setItem('reset_executed', 'true');
            console.log("Local cleanup complete. Reloading...");
            setTimeout(() => location.reload(), 500);
        } catch (e) {
            console.error("Cleanup error:", e);
            localStorage.removeItem('force_photo_reset');
        }
    } else if (!localStorage.getItem('reset_executed')) {
        localStorage.setItem('force_photo_reset', 'true');
        setTimeout(() => location.reload(), 1000);
    }

    // Auth Elements
    const authScreen = document.getElementById('auth-screen');
    const authForm = document.getElementById('auth-form');
    const authTitle = document.getElementById('auth-title');
    const authSubmit = document.getElementById('auth-submit');
    const toggleAuthBtn = document.getElementById('toggle-auth');
    const appEl = document.getElementById('app');
    let isLogin = true;

    // Global Filters & State
    let asistenciaFilters = window.asistenciaFilters = {
        search: '',
        activeTeamId: 'TODOS'
    };

    window.currentSeason = window.getSeason(new Date());

    let campogramaFilters = window.campogramaFilters = {
        sistema: window.formationsState?.campograma || 'F11_433',
        equipos: [],
        posiciones: [],
        niveles: [],
        years: [],
        clubesConvenidos: []
    };

    // Load formation preferences
    const savedPrefs = JSON.parse(localStorage.getItem('ms_coach_formation_prefs') || '{}');
    // Load formation preferences
    const savedState = JSON.parse(localStorage.getItem('ms_coach_formation_state') || '{}');
    window.formationsState = {
        convocatoria: savedPrefs.convocatoria || 'F11_433',
        torneo: savedPrefs.torneo || 'F11_433',
        campograma: savedPrefs.campograma || 'F11_433',
        teams: savedState.teams || {},
        torneos: savedState.torneos || {},
        convocatorias: savedState.convocatorias || {}
    };

    // Initial Auth Check
    const checkAuth = async () => {
        const preloader = document.getElementById('preloader');
        try {
            if (typeof supabaseClient === 'undefined' || !supabaseClient) {
                console.error("Supabase Client not ready");
                return;
            }
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                window.currentUser = user;
                window.initSeasons();
                await db.syncRole();
                await window.ensureClubesInitialized();
                authScreen.classList.add('hidden');
                appEl.classList.remove('hidden');
                applyRoleRestrictions();
                if (typeof window.switchView === 'function') window.switchView('dashboard');
            } else {
                authScreen.classList.remove('hidden');
                appEl.classList.add('hidden');
            }
        } catch (e) {
            console.error("Auth error:", e);
        } finally {
            if (preloader) {
                preloader.style.opacity = '0';
                setTimeout(() => preloader.classList.add('hidden'), 300);
            }
        }
    };


    db.init().then(() => checkAuth()).catch(e => {
        console.error("DB fail:", e);
        checkAuth(); // Try auth anyway
    });


    const applyRoleRestrictions = () => {
        const isAdmin = db.userRole === 'ELITE';
        const isConvenido = db.userRole === 'TECNICO CLUB CONVENIDO';

        // El staff y otras secciones críticas son solo para ELITE
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = isAdmin ? 'block' : 'none';
        });

        // Tecnicos convenidos solo ven Calendario, Perfil y las fichas compartidas
        // Ocultamos el resto si es necesario, o simplemente filtramos los datos.
        // Por ahora, ocultamos secciones administrativas pesadas.
        if (isConvenido) {
            const forbiddenViews = ['usuarios', 'jugadores', 'equipos', 'tareas', 'asistencia'];
            document.querySelectorAll('.nav-link, .nav-link-mobile').forEach(el => {
                if (forbiddenViews.includes(el.dataset.view)) {
                    el.style.display = 'none';
                }
            });
        }

        document.body.classList.toggle('role-readonly', isConvenido);
    };

    if (toggleAuthBtn) {
        toggleAuthBtn.onclick = () => {
            isLogin = !isLogin;
            authTitle.textContent = isLogin ? 'Acceso Entrenador' : 'Registro Nuevo';
            authSubmit.textContent = isLogin ? 'Entrar al Panel' : 'Crear Cuenta';
            toggleAuthBtn.textContent = isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra';
        };
    }

    if (authForm) {
        authForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('auth-email').value;
            const password = document.getElementById('auth-password').value;

            authSubmit.disabled = true;
            authSubmit.textContent = 'Procesando...';

            try {
                if (isLogin) {
                    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
                    if (error) throw error;
                } else {
                    const { data, error } = await supabaseClient.auth.signUp({ email, password });
                    if (error) throw error;
                    window.customAlert('¡Registro enviado!', 'Revisa tu email para confirmar la cuenta (mira en SPAM).', 'success');
                }
                await checkAuth();
            } catch (err) {
                window.customAlert('ERROR DE ACCESO', err.message, 'error');
            } finally {
                authSubmit.disabled = false;
                authSubmit.textContent = isLogin ? 'Entrar al Panel' : 'Crear Cuenta';
            }
        };
    }


    // UI Elements
    const navLinks = document.querySelectorAll('.nav-link');
    const viewTitle = document.getElementById('view-title');
    const viewSubtitle = document.getElementById('view-subtitle');
    const contentContainer = document.getElementById('content-container');
    const addBtn = document.getElementById('add-btn');
    const addBtnMobile = document.getElementById('add-btn-mobile');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContainer = document.getElementById('modal-container');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const logoutBtn = document.getElementById('logout-btn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const { error } = await supabaseClient.auth.signOut();
            if (error) window.customAlert('Error al Salir', error.message, 'error');
            else window.location.reload();
        });
    }
    if (mobileMenuBtn && sidebar) {
        const overlay = document.getElementById('sidebar-overlay');

        const toggleSidebar = (show) => {
            if (show) {
                sidebar.classList.remove('-translate-x-full');
                overlay?.classList.remove('hidden');
            } else {
                sidebar.classList.add('-translate-x-full');
                overlay?.classList.add('hidden');
            }
        };

        mobileMenuBtn.addEventListener('click', () => {
            const isOpen = !sidebar.classList.contains('-translate-x-full');
            toggleSidebar(!isOpen);
        });

        const closeSidebarBtn = document.getElementById('close-sidebar-btn');
        if (closeSidebarBtn) {
            closeSidebarBtn.addEventListener('click', () => toggleSidebar(false));
        }

        if (overlay) {
            overlay.addEventListener('click', () => toggleSidebar(false));
        }

        // Close sidebar and multiselect menus when clicking outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth < 768 && !sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                sidebar.classList.add('-translate-x-full');
            }

            // Close Campograma Multiselect Menus
            const menus = document.querySelectorAll('[id$="-menu"]');
            menus.forEach(menu => {
                if (!menu.classList.contains('hidden')) {
                    const btn = menu.previousElementSibling;
                    if (!menu.contains(e.target) && !btn.contains(e.target)) {
                        menu.classList.add('hidden');
                    }
                }
            });
        });
    }

    // Navigation logic
    const navLinksMobile = document.querySelectorAll('.nav-link-mobile');

    const handleNavClick = (view) => {
        switchView(view);
        if (window.innerWidth < 768) {
            sidebar.classList.add('-translate-x-full');
            document.getElementById('sidebar-overlay')?.classList.add('hidden');
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            handleNavClick(link.getAttribute('data-view'));
        });
    });

    navLinksMobile.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            handleNavClick(link.getAttribute('data-view'));
        });
    });

    if (addBtnMobile) {
        addBtnMobile.addEventListener('click', () => {
            addBtn.click();
        });
    }

    // State
    let currentView = window.currentView = 'dashboard';
    let attendanceData = {};
    const DB_VERSION = 7;

    const TASK_TYPES = [
        "TÉCNICA INDIVIDUAL", "TÉCNICA COLECTIVA", "TECNIFICACIÓN", 
        "CALENTAMIENTO", "ABP", "ACCIONES COMBINADAS", "EVOLUCIONES", 
        "JUEGO DE FÚTBOL", "JUEGO DE POSICIÓN", "JUEGO LÚDICO", 
        "POSESIÓN", "RONDO", "FÚTBOL", "PORTEROS", "MOVIMIENTOS", 
        "PARTIDO", "ESTRATEGIA", "FÍSICO", "PREVENTIVO", "VUELTA A LA CALMA"
    ];

    const TASK_CATEGORIES = [
        "SENIOR", "JUVENIL", "CADETE", "INFANTIL", "ALEVIN", "BENJAMIN"
    ];

    const TASK_OBJECTIVES = [
        "TÉCNICA INDIVIDUAL", "TÉCNICA COLECTIVA", "1x1", "ABP", "AMPLITUD", 
        "ATAQUE RAPIDO", "BASCULACIONES", "BLOCAJES", "BUSCAR SUPERIORIDADES", 
        "CAIDAS", "CAMBIOS DE ORIENTACIÓN", "CENTRO Y REMATE", "COBERTURAS", 
        "COOPERACIÓN", "CONCENTRACIÓN", "CONDUCCIÓN", "CONTROL",
        "CONTROL ORIENTADO", "COORDINACIÓN", "CREAR LÍNEA DE PASE", "DEJAR DE CARA",
        "DEFENSA 1x1", "DEFENSA CENTROS LATERALES", "DEFENSA DE PARED", "DESMARQUES DE APOYO",
        "DESMARQUES DE RUPTURA", "DESPEJES", "DESPLAZAMIENTO", "DESVIOS", "DIVERSIÓN",
        "ENTRENAMIENTO COMPETITIVO", "ESTIRAMIENTOS", "FIJAR RIVAL", "FINALIZAR",
        "GOLPEO DE CABEZA", "INTERCEPTACIÓN", "JUEGO AEREO", "JUEGO DE ESPALDAS",
        "JUEGO DE PIES", "JUGAR CON ALEJADO", "LATERALIDAD", "LECTURA DEFENSIVA",
        "MANTENER", "MECANISMOS DE EJECUCIÓN", "PAREDES", "PASE", "PASE LARGO",
        "POSESIÓN", "PRESIÓN", "PROFUNDIDAD", "PROGRESAR", "PROLONGACIONES",
        "PROPIOCEPCION", "PROTECCIÓN", "REGATE", "REPLIEGUE", "SAQUE CON LA MANO",
        "SAQUE DE BANDA", "SALIDA DE BALÓN", "SUPERAR LINEAS", "TAPAR LÍNEA DE PASE",
        "TOMA DE DECISION", "TRANSICIONES DEFENSIVAS", "VELOCIDAD", "VELOCIDAD DESPLAZAMIENTO",
        "VELOCIDAD REACCIÓN", "VERTICALIDAD", "VISIÓN PERIFÉRICA"
    ];

    const TASK_MATERIALS = [
        "AROS", "BALONES", "CHINOS", "CONOS", "PETOS", "PICAS", "PORTERIA PEQUEÑA",
        "PORTERIA REGLAMENTARIA", "ESCALERA COORDINACION", "VALLAS", "CINTA",
        "BANCO", "FITBALL", "PELOTAS TENIS", "PALA PADEL"
    ];

    const TASK_SPACES = [
        "1/2 CAMPO", "3/4 CAMPO", "CAMPO ENTERO", "DOBLE AREA", "AREA GRANDE",
        "CIRCULO CENTRAL", "PORTERÍA COMPETICIÓN", "10 M", "20", "5X5", "6X6", "7X7",
        "8X8", "10X5", "10X8", "10X10", "10X20", "10X25", "10X40", "12X12", "14X10",
        "15X5", "15X7", "15X10", "15X15", "15X45", "20X5", "20X10", "20X15", "20X20",
        "20X30", "20X40", "25X10", "25X12", "25X15", "25X20", "25X25", "30X10", "30X15",
        "30X20", "30X30", "35X15", "35X20", "35X35", "40X15", "40X20", "40X25", "40X30",
        "40X40", "40X50", "45X25", "50X25", "50X30", "60X40",
        "ESPACIO GRANDE (15X15) / ESPACIO PEQUEÑO (5X5)", "7X7 / 15X15", "25X20 - 20X10",
        "15X15 - 20X20", "25X20 - 10X10", "5X5 - 20X20", "30X30 (10X10)",
        "RONDO GRANDE 10X10 / RONDO PEQUEÑO 7X7", "IR VARIANDO CONFORME SE VAN ELIMINANDO JUGADORES"
    ];



    const viewMeta = {
        'dashboard': { title: 'PANEL DE CONTROL', subtitle: 'Resumen general de tu actividad.', addButtonEnabled: false },
        'calendario': { title: 'Calendario Maestro', subtitle: 'Planificación de sesiones y tareas diarias.', addButtonEnabled: false },
        'campograma': { title: 'Pizarra Táctica', subtitle: 'Análisis de profundidad por sistema y posición.', addButtonEnabled: false },
        'eventos': { title: 'Agenda y Tareas', subtitle: 'Listado de tareas de gestión y recordatorios.', addButtonLabel: 'Nueva Tarea', addButtonEnabled: true },
        'tareas': { title: 'Directorio de Tareas', subtitle: 'Biblioteca de ejercicios de entrenamiento.', addButtonLabel: 'Nueva Tarea', addButtonEnabled: true, secondaryButtonEnabled: true, secondaryButtonLabel: 'Importar CSV' },
        'sesiones': { title: 'Sesiones de Entrenamiento', subtitle: 'Planificación y calendario.', addButtonLabel: 'Nueva Sesión', addButtonEnabled: true },
        'equipos': { title: 'Gestión de Equipos', subtitle: 'Plantillas y datos de jugadores.', addButtonLabel: 'Nuevo Equipo', addButtonEnabled: true, secondaryButtonEnabled: true, secondaryButtonLabel: 'Importar CSV' },
        'clubes': { title: 'Clubes Convenidos', subtitle: 'Gestión y vinculación de equipos por club.', addButtonLabel: 'Nuevo Club', addButtonEnabled: true },
        'jugadores': { title: 'Directorio de Jugadores', subtitle: 'Base de datos global de futbolistas.', addButtonLabel: 'Nuevo Jugador', addButtonEnabled: true, secondaryButtonEnabled: true, secondaryButtonLabel: 'Importar CSV' },
        'asistencia': {
            title: 'Control de Asistencia',
            subtitle: 'Histórico de asistencia por día y equipo.',
            addButtonLabel: 'Asistencia',
            addButtonEnabled: true,
            secondaryButtonEnabled: true,
            secondaryButtonLabel: 'Reparar Asistencias'
        },
        'convocatorias': { title: 'Gestión de Convocatorias', subtitle: 'Listados de jugadores por ciclos y eventos.', addButtonLabel: 'Nueva Convocatoria', addButtonEnabled: true, secondaryButtonEnabled: true, secondaryButtonLabel: 'Importar CSV' },
        'torneos': { title: 'Control de Torneos', subtitle: 'Evaluación y rendimiento de jugadores en competición.', addButtonLabel: 'Nuevo Torneo', addButtonEnabled: true },
        'convocatorias-pdf': { title: 'CONVOCATORIAS PDF', subtitle: 'Generación de convocatorias individuales.', addButtonEnabled: false },
        'usuarios': { title: 'Gestión de Staff', subtitle: 'Añade y gestiona los técnicos de tu plataforma.', addButtonEnabled: true, addButtonLabel: 'Nuevo Miembro' },
        'perfil': { title: 'Mi Perfil', subtitle: 'Configuración personal y seguridad.', addButtonEnabled: false }
    };

    window.switchView = async (viewId) => {
        window.currentView = currentView = viewId;
        navLinks.forEach(l => l.classList.remove('active'));
        navLinksMobile.forEach(l => {
            l.classList.remove('text-blue-600');
            l.classList.add('text-slate-400');
        });

        const activeLink = document.querySelector(`.nav-link[data-view="${viewId}"]`);
        if (activeLink) activeLink.classList.add('active');

        const activeMobileLink = document.querySelector(`.nav-link-mobile[data-view="${viewId}"]`);
        if (activeMobileLink) {
            activeMobileLink.classList.add('text-blue-600');
            activeMobileLink.classList.remove('text-slate-400');
        }

        const meta = viewMeta[viewId];
        viewTitle.textContent = meta.title;
        viewSubtitle.textContent = meta.subtitle;

        // Calendar-specific workspace expansion
        if (viewId === 'calendario') {
            contentContainer.classList.add('p-4', 'pb-4', 'overflow-hidden'); // More vertical room
            contentContainer.classList.remove('md:p-8', 'p-6', 'pb-10', 'p-0', 'overflow-y-auto');
        } else {
            contentContainer.classList.remove('p-4', 'pb-4', 'p-0', 'overflow-hidden');
            contentContainer.classList.add('p-4', 'md:p-8', 'overflow-y-auto');
        }

        // Sync mobile title & subtitle
        const viewTitleMobile = document.getElementById('view-title-mobile');
        const viewSubtitleMobile = document.getElementById('view-subtitle-mobile');
        if (viewTitleMobile) {
            viewTitleMobile.textContent = meta.title.replace('Directorio de ', '').replace('Gestión de ', '').replace('Visión General de ', '');
        }
        if (viewSubtitleMobile) {
            viewSubtitleMobile.textContent = meta.subtitle;
        }

        // Auto-close sidebar on mobile
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (window.innerWidth < 768 && sidebar && !sidebar.classList.contains('-translate-x-full')) {
            sidebar.classList.add('-translate-x-full');
            if (overlay) overlay.classList.add('hidden');
        }

        // Button logic
        const secondaryAddBtn = document.getElementById('secondary-add-btn');
        const tertiaryAddBtn = document.getElementById('tertiary-add-btn');
        const cleanTasksBtn = document.getElementById('clean-tasks-btn');

        const isConvenido = db.userRole === 'TECNICO CLUB CONVENIDO';

        if (meta.addButtonEnabled && !isConvenido) {
            addBtn.classList.remove('hidden');
            const btnText = addBtn.querySelector('.btn-text');
            if (btnText) btnText.textContent = meta.addButtonLabel;
            if (addBtnMobile) addBtnMobile.classList.remove('hidden');

            // Centralized Add Button Logic
            const handleAddClick = () => {
                if (viewId === 'eventos') window.showNewEventoModal();
                else if (viewId === 'tareas') window.showNewTareaModal();
                else if (viewId === 'sesiones') window.showNewSesionModal();
                else if (viewId === 'equipos') window.showNewTeamModal();
                else if (viewId === 'jugadores') window.showNewPlayerModal();
                else if (viewId === 'asistencia') window.showNewAsistenciaModal();
                else if (viewId === 'convocatorias') window.showNewConvocatoriaModal();
                else if (viewId === 'torneos') window.showNewTorneoModal();
                else if (viewId === 'usuarios') window.showNewUserModal();
                else if (viewId === 'clubes') window.showNewClubModal();
            };

            addBtn.onclick = handleAddClick;
            if (addBtnMobile) addBtnMobile.onclick = handleAddClick;
        } else {
            addBtn.classList.add('hidden');
            if (addBtnMobile) addBtnMobile.classList.add('hidden');
        }

        if (meta.secondaryButtonEnabled && !isConvenido) {
            secondaryAddBtn.classList.remove('hidden');
            secondaryAddBtn.querySelector('span').textContent = meta.secondaryButtonLabel;

            // CSV Import Logic for Tareas
            if (viewId === 'tareas') {
                secondaryAddBtn.onclick = () => {
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '.csv';
                    fileInput.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        const reader = new FileReader();
                        reader.onload = async (re) => {
                            const text = re.target.result;
                            const lines = text.split('\n').filter(line => line.trim() !== '');
                            if (lines.length < 1) return;

                            // Detect delimiter: , or ;
                            const firstLine = lines[0];
                            const delimiter = firstLine.includes(';') ? ';' : ',';

                            const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, '').toUpperCase());

                            const startIndex = headers.findIndex(h => h === 'TAREA' || h === 'NOMBRE' || h === 'TASK');
                            if (startIndex === -1) {
                                window.customAlert('CSV Inválido', 'No se ha encontrado la columna "TAREA" o "NOMBRE". Revisa el formato.', 'error');
                                return;
                            }

                            const existingTasks = await db.getAll('tareas');
                            const existingNames = new Set(existingTasks.map(t => t.name.toLowerCase()));

                            let importedCount = 0;
                            let skippedCount = 0;
                            const tasksToImport = [];

                            // Aviso inicial
                            const loadingAlert = document.createElement('div');
                            loadingAlert.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center';
                            loadingAlert.innerHTML = `
                                <div class="bg-white p-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                                    <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p class="font-bold text-slate-800 uppercase tracking-widest text-xs">Sincronizando con Supabase...</p>
                                    <p class="text-slate-500 text-[10px] lowercase italic">Estamos subiendo tus ${lines.length - 1} tareas</p>
                                </div>
                            `;
                            document.body.appendChild(loadingAlert);

                            let updatedCount = 0;
                            for (let i = 1; i < lines.length; i++) {
                                const row = lines[i].split(new RegExp(`\\${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`)).map(c => c.trim().replace(/^"|"$/g, ''));
                                if (row.length < headers.length) continue;

                                const taskData = {};
                                headers.forEach((h, idx) => {
                                    taskData[h] = row[idx];
                                });

                                const name = taskData['TAREA'] || taskData['NOMBRE'] || taskData['TASK'] || taskData['TITLE'];
                                if (!name) continue;

                                const existing = existingTasks.find(t => t.name.toLowerCase() === name.toLowerCase());
                                const videoUrl = taskData['VIDEO DRIVE ID'] || taskData['VIDEO_DRIVE'] || taskData['VIDEO'] || '';

                                if (existing) {
                                    let needsUpdate = false;
                                    const normalizeValue = (v) => v?.toString().trim() || '';

                                    const espacioCsv = (taskData['ESPACIO'] || taskData['SPACE'] || taskData['ESPACIOS'] || taskData['AREA'] || '').trim().toUpperCase();
                                    const materialCsv = (taskData['MATERIAL'] || taskData['MATERIALES'] || taskData['MATERIALS'] || '').trim().toUpperCase();
                                    const objCsv = (taskData['OBJETIVO'] || taskData['OBJECTIVE'] || '').trim().toUpperCase();
                                    const descCsv = (taskData['DESCRIPCIÓN'] || taskData['DESCRIPTION'] || '').trim();
                                    const varCsv = (taskData['VARIANTES'] || taskData['VARIANTS'] || '').trim();

                                    if (videoUrl && existing.video !== videoUrl) { existing.video = videoUrl; needsUpdate = true; }
                                    if (taskData['DESCRIPCIÓN'] && existing.description !== descCsv) { existing.description = descCsv; needsUpdate = true; }
                                    if (taskData['VARIANTES'] && existing.variantes !== varCsv) { existing.variantes = varCsv; needsUpdate = true; }
                                    if (taskData['OBJETIVO'] && existing.objetivo !== objCsv) { existing.objetivo = objCsv; needsUpdate = true; }
                                    if (espacioCsv && existing.espacio !== espacioCsv) { existing.espacio = espacioCsv; needsUpdate = true; }

                                    if (materialCsv) {
                                        const cleanMaterials = materialCsv.split(/[,;]/).map(m => m.trim().toUpperCase()).filter(m => m).join(', ');
                                        if (existing.material !== cleanMaterials) {
                                            existing.material = cleanMaterials;
                                            needsUpdate = true;
                                        }
                                    }

                                    if (needsUpdate) {
                                        await db.update('tareas', existing);
                                        updatedCount++;
                                    } else {
                                        skippedCount++;
                                    }
                                    continue;
                                }

                                tasksToImport.push({
                                    name: name,
                                    type: (taskData['TIPO DE TAREA'] || taskData['TIPO'] || taskData['TYPE'] || 'FÚTBOL').toUpperCase(),
                                    categoria: (taskData['CATEGORIA'] || taskData['ETAPA'] || taskData['STAGE'] || 'SENIOR').toUpperCase(),
                                    description: taskData['DESCRIPCIÓN'] || taskData['DESCRIPTION'] || '',
                                    variantes: taskData['VARIANTES'] || taskData['VARIANTS'] || '',
                                    objetivo: (taskData['OBJETIVO'] || taskData['OBJECTIVE'] || '').toUpperCase(),
                                    espacio: (taskData['ESPACIO'] || taskData['SPACE'] || taskData['ESPACIOS'] || taskData['AREA'] || '').toUpperCase(),
                                    duration: parseInt(taskData['TIEMPO TOTAL'] || taskData['TIME'] || taskData['DURATION']) || 15,
                                    material: (taskData['MATERIAL'] || taskData['MATERIALES'] || taskData['MATERIALS'] || '').split(/[,;]/).map(m => m.trim().toUpperCase()).filter(m => m).join(', '),
                                    video: videoUrl,
                                    series: taskData['SERIES'] || '',
                                    tiempoSeries: taskData['TIEMPO SERIES'] || taskData['TIME SERIES'] || ''
                                });
                            }

                            if (tasksToImport.length > 0) {
                                try {
                                    const { error } = await supabaseClient.from('tareas').insert(tasksToImport);
                                    if (error) throw error;
                                    importedCount = tasksToImport.length;
                                } catch (e) {
                                    loadingAlert.remove();
                                    console.error("Error en Bulk Insert:", e);
                                    window.customAlert('Error Crítico', 'Fallo al subir el bloque: ' + e.message, 'error');
                                    return;
                                }
                            }

                            loadingAlert.remove();
                            window.customAlert('Importación Completada',
                                `Se han importado ${importedCount} tareas nuevas y completado datos en ${updatedCount} existentes. ` +
                                (skippedCount > 0 ? `${skippedCount} tareas sin cambios.` : ''),
                                'success');
                            window.switchView('tareas');
                        };
                        reader.readAsText(file);
                    };
                    fileInput.click();
                };
            } else if (viewId === 'asistencia') {
                secondaryAddBtn.onclick = (e) => window.repairAttendance(e);
            } else if (viewId === 'jugadores') {
                secondaryAddBtn.onclick = () => window.showPlayerImportModal();
            } else if (viewId === 'convocatorias') {
                secondaryAddBtn.onclick = () => {
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '.csv';
                    fileInput.onchange = (e) => window.handleConvocatoriaImport(e.target);
                    fileInput.click();
                };
            }

            else if (viewId === 'equipos') {
                secondaryAddBtn.onclick = () => {
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '.csv';
                    fileInput.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = async (re) => {
                            const text = re.target.result;
                            const lines = text.split('\n').filter(line => line.trim() !== '');
                            if (lines.length < 2) return;
                            const firstLine = lines[0];
                            const delimiter = firstLine.includes(';') ? ';' : ',';
                            const headers = firstLine.split(delimiter).map(h => h.trim().toUpperCase().replace(/^"|"$/g, ''));

                            const existingTeams = window.getSortedTeams(await db.getAll('equipos'));

                            let importedCount = 0;
                            let updatedCount = 0;

                            const loadingAlert = document.createElement('div');
                            loadingAlert.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center';
                            loadingAlert.innerHTML = `
                                <div class="bg-white p-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                                    <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p class="font-bold text-slate-800 uppercase tracking-widest text-xs">Sincronizando Equipos...</p>
                                </div>
                            `;
                            document.body.appendChild(loadingAlert);

                            const regex = new RegExp(`\\${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`);

                            for (let i = 1; i < lines.length; i++) {
                                const row = lines[i].split(regex).map(c => c.trim().replace(/^"|"$/g, ''));
                                if (row.length < headers.length) continue;

                                const data = {};
                                headers.forEach((h, idx) => data[h] = row[idx]);

                                const newTeam = {
                                    nombre: data['NOMBRE'],
                                    categoria: data['CATEGORIA'] || 'Sénior',
                                    escudo: null
                                };
                                if (!newTeam.nombre) continue;

                                const existing = existingTeams.find(e => e.nombre?.toLowerCase() === newTeam.nombre.toLowerCase());
                                if (existing) {
                                    await supabaseClient.from('equipos').update(newTeam).eq('id', existing.id);
                                    updatedCount++;
                                } else {
                                    await supabaseClient.from('equipos').insert(newTeam);
                                    importedCount++;
                                }
                            }
                            loadingAlert.remove();
                            window.customAlert('Importación Exitosa', `Se han creado ${importedCount} equipos y actualizado ${updatedCount}.`, 'success');
                            window.switchView('equipos');
                        };
                        reader.readAsText(file);
                    };
                    fileInput.click();
                };
            }
        } else {
            secondaryAddBtn.classList.add('hidden');
        }

        // Tertiary & Quaternary Button Logic (Task specific)
        if (viewId === 'tareas') {
            if (tertiaryAddBtn) {
                tertiaryAddBtn.classList.remove('hidden');
                tertiaryAddBtn.onclick = () => {
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = 'image/*';
                    fileInput.multiple = true;
                    fileInput.onchange = (e) => window.linkTaskImages(e.target);
                    fileInput.click();
                };
            }
            if (cleanTasksBtn) {
                cleanTasksBtn.classList.remove('hidden');
                cleanTasksBtn.onclick = () => window.clearAllTasks();
            }
        } else {
            if (tertiaryAddBtn) tertiaryAddBtn.classList.add('hidden');
            if (cleanTasksBtn) cleanTasksBtn.classList.add('hidden');
        }

        if (window.lucide) lucide.createIcons();

        currentView = viewId;
        contentContainer.innerHTML = '';
        await window.renderView(viewId);

    }

    window.renderView = async (viewId) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'view animate-in fade-in duration-500';

        switch (viewId) {
            case 'dashboard': await renderDashboard(wrapper); break;
            case 'calendario': await renderCalendario(wrapper); break;
            case 'campograma': await renderCampograma(wrapper); break;
            case 'eventos': await window.renderEventos(wrapper); break;
            case 'tareas': await window.renderTareas(wrapper); break;
            case 'sesiones': await window.renderSesiones(wrapper); break;
            case 'equipos': await window.renderEquipos(wrapper); break;
            case 'jugadores': await window.renderJugadores(wrapper); break;
            case 'asistencia': await window.renderAsistencia(wrapper); break;
            case 'convocatorias': await window.renderConvocatorias(wrapper); break;
            case 'convocatorias-pdf': await window.renderConvocatoriasPDF(wrapper); break;
            case 'torneos': await window.renderTorneos(wrapper); break;
            case 'usuarios': await window.renderUsuarios(wrapper); break;
            case 'clubes': await window.renderClubes(wrapper); break;
            case 'perfil': await window.renderPerfil(wrapper); break;
        }

        contentContainer.innerHTML = '';
        contentContainer.appendChild(wrapper);

        // El chispazo maestro: activar todos los iconos de la nueva vista
        if (window.lucide) {
            // Usar requestAnimationFrame para asegurar que el DOM está listo y no bloquear
            requestAnimationFrame(() => {
                lucide.createIcons();
            });
        }
    }

    // View Renderers
    async function renderDashboard(container) {
        try {
            const [allTasks, allSessions, teams, allConvocatorias, players, attendance, clubes] = await Promise.all([
                db.getAll('tareas'),
                db.getAll('sesiones'),
                db.getAll('equipos'),
                db.getAll('convocatorias'),
                db.getAll('jugadores'),
                db.getAll('asistencia'),
                db.getAll('clubes')
            ]);

            const userRes = await supabaseClient.auth.getUser();
            const currentUser = userRes.data?.user;

            const tasks = allTasks; // Tareas are always global (library)
            const sessions = window.applyGlobalFilters(allSessions);
            const convocatorias = window.applyGlobalFilters(allConvocatorias);
            const torneos = convocatorias.filter(c => (c.tipo || '').toUpperCase().trim() === 'TORNEO');
            const todayStr = new Date().toISOString().split('T')[0];
            const torneosJugados = torneos.filter(t => t.fecha < todayStr).length;
            const torneosPendientes = torneos.filter(t => t.fecha >= todayStr).length;
            const attendanceFiltered = window.applyGlobalFilters(attendance);

            // Pre-process for efficiency
            const teamMap = new Map(teams.map(t => [String(t.id), t]));
            const attendanceByTeam = attendance.reduce((acc, r) => {
                if (r.equipoid) {
                    const id = String(r.equipoid);
                    if (!acc[id]) acc[id] = [];
                    acc[id].push(r);
                }
                return acc;
            }, {});

            // Calculate dynamic attendance for each team
            teams.forEach(t => {
                const teamReports = attendanceByTeam[String(t.id)] || [];
                let totalPresent = 0;
                let totalPossible = 0;
                teamReports.forEach(r => {
                    const pData = Object.values(r.players || r.data || {});
                    totalPresent += pData.filter(s => {
                        const status = typeof s === 'object' ? s.status : s;
                        return status === 'asiste' || status === 'presente';
                    }).length;
                    totalPossible += pData.length;
                });
                t.computedAsistencia = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;
            });

            // Sort teams using global utility
            const teamsToRender = window.getSortedTeams(teams);

            const totalMale = players.filter(p => (p.sexo || '').toLowerCase().startsWith('m')).length;
            const totalFemale = players.filter(p => (p.sexo || '').toLowerCase().startsWith('f')).length;
            const totalOther = players.length - (totalMale + totalFemale);

            // Task counts by type
            const taskTypeCounts = {};
            tasks.forEach(t => {
                const type = String(t.type || 'Fútbol').toUpperCase();
                taskTypeCounts[type] = (taskTypeCounts[type] || 0) + 1;
            });
            const sortedTaskTypes = Object.entries(taskTypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 9);

            // Session counts by team
            const sessionTeamCounts = {};
            sessions.forEach(s => {
                const team = teamMap.get(String(s.equipoid));
                if (team && team.nombre) {
                    const name = String(team.nombre).split(' ||| ')[0].toUpperCase();
                    sessionTeamCounts[name] = (sessionTeamCounts[name] || 0) + 1;
                }
            });

            // Order sessions teams like attendance (using teamsToRender order)
            const sortedSessionTeams = teamsToRender
                .filter(t => {
                    const name = String(t.nombre || '').split(' ||| ')[0].toUpperCase();
                    return sessionTeamCounts[name] > 0;
                })
                .map(t => {
                    const name = String(t.nombre || '').split(' ||| ')[0].toUpperCase();
                    return [name, sessionTeamCounts[name]];
                })
                .slice(0, 6);

            // Team counts by gender
            const teamsFemaleCount = teams.filter(t => {
                const nameStr = String(t.nombre || '').toUpperCase();
                const catStr = String(t.categoria || '').toUpperCase();
                return nameStr.includes('FEM') || catStr.includes('FEM');
            }).length;
            const teamsMaleCount = teams.length - teamsFemaleCount;

            // Torneos counts by team (using String keys for safety)
            const torneoTeamCounts = {};
            torneos.forEach(t => {
                if (t.equipoid) {
                    const key = String(t.equipoid);
                    torneoTeamCounts[key] = (torneoTeamCounts[key] || 0) + 1;
                }
            });

            // Sort chronologically using global utility and map to counts
            const sortedTorneoTeams = window.getSortedTeams(teams)
                .filter(t => torneoTeamCounts[String(t.id)])
                .map(t => [String(t.nombre).split(' ||| ')[0].toUpperCase(), torneoTeamCounts[String(t.id)]]);

            container.innerHTML = `
                <!-- Line 1: Sesiones (Full Width) -->
                <div class="grid grid-cols-1 gap-6 mb-8">
                    <!-- Sesiones Widget -->
                    <div class="stat-card bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl group">
                        <div class="flex items-center justify-between mb-8">
                            <div class="flex items-center gap-5">
                                <div class="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:-rotate-6 transition-transform shadow-sm"><i data-lucide="calendar" class="w-8 h-8"></i></div>
                                <div>
                                    <h3 class="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Sesiones Planificadas</h3>
                                    <p class="text-4xl font-black text-slate-800 font-outfit">${sessions.length} <span class="text-sm font-bold text-slate-300 ml-1">SESIONES</span></p>
                                </div>
                            </div>
                            <button onclick="window.switchView('sesiones')" class="px-8 py-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-indigo-200 hidden md:block">Gestionar Sesiones</button>
                        </div>
                        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 border-t border-slate-50 pt-8">
                            ${(() => {
                    const palette = [
                        { bg: 'bg-indigo-50/50', border: 'border-indigo-100', text: 'text-indigo-600' },
                        { bg: 'bg-blue-50/50', border: 'border-blue-100', text: 'text-blue-600' },
                        { bg: 'bg-violet-50/50', border: 'border-violet-100', text: 'text-violet-600' },
                        { bg: 'bg-cyan-50/50', border: 'border-cyan-100', text: 'text-cyan-600' },
                        { bg: 'bg-emerald-50/50', border: 'border-emerald-100', text: 'text-emerald-600' },
                        { bg: 'bg-orange-50/50', border: 'border-orange-100', text: 'text-orange-600' }
                    ];
                    return sortedSessionTeams.map(([team, count], idx) => {
                        const color = palette[idx % palette.length];
                        return `
                                        <div class="${color.bg} p-6 rounded-[2rem] border ${color.border} flex flex-col items-center justify-center transition-all hover:bg-white hover:shadow-xl group/item hover:-translate-y-1">
                                            <p class="text-[9px] font-black text-slate-700 uppercase tracking-[0.1em] mb-2 text-center truncate w-full transition-colors">${team}</p>
                                            <p class="text-3xl font-black ${color.text} font-outfit transition-colors">${count}</p>
                                        </div>
                                    `;
                    }).join('') || '<p class="text-[10px] text-slate-300 italic col-span-full text-center py-10">Sin datos</p>';
                })()}
                        </div>
                        <button onclick="window.switchView('sesiones')" class="mt-8 w-full py-5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-indigo-200 md:hidden">Gestionar Sesiones</button>
                    </div>
                </div>

                <!-- Line 2: Competición + Estructura + Jugadores -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <!-- Torneos Widget (Competición) -->
                    <div class="stat-card bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl group flex flex-col">
                        <div class="flex items-center gap-5 mb-8">
                            <div class="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm"><i data-lucide="trophy" class="w-7 h-7"></i></div>
                            <div>
                                <h3 class="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Competición</h3>
                                <p class="text-3xl font-black text-slate-800">${torneos.length}</p>
                            </div>
                        </div>
                        <div class="flex gap-4 border-t border-slate-50 pt-8 mb-8">
                            <div class="flex-1 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                                <p class="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 text-center">Jugados</p>
                                <p class="text-2xl font-black text-emerald-600 text-center">${torneosJugados}</p>
                            </div>
                            <div class="flex-1 bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                                <p class="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1 text-center">Pendientes</p>
                                <p class="text-2xl font-black text-amber-600 text-center">${torneosPendientes}</p>
                            </div>
                        </div>
                        <button onclick="window.switchView('torneos')" class="mt-auto w-full py-4 bg-amber-500 text-white hover:bg-amber-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-amber-200">Gestionar Torneos</button>
                    </div>

                    <!-- Equipos Widget (Estructura) -->
                    <div class="stat-card bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl group flex flex-col">
                        <div class="flex items-center gap-5 mb-8">
                            <div class="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200"><i data-lucide="users" class="w-7 h-7"></i></div>
                            <div>
                                <h3 class="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Estructura</h3>
                                <p class="text-3xl font-black text-slate-800">${teams.length}</p>
                            </div>
                        </div>
                        <div class="flex gap-4 border-t border-slate-50 pt-8 mb-8">
                            <div class="flex-1 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                                <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 text-center">Masculinos</p>
                                <p class="text-2xl font-black text-blue-600 text-center">${teamsMaleCount}</p>
                            </div>
                            <div class="flex-1 bg-rose-50/50 p-4 rounded-2xl border border-rose-100">
                                <p class="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1 text-center">Femeninos</p>
                                <p class="text-2xl font-black text-rose-600 text-center">${teamsFemaleCount}</p>
                            </div>
                        </div>
                        <button onclick="window.switchView('equipos')" class="mt-auto w-full py-4 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-200">Gestionar Equipos</button>
                    </div>

                    <!-- Jugadores Widget -->
                    <div class="stat-card bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl group flex flex-col">
                        <div class="flex items-center gap-5 mb-8">
                            <div class="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center"><i data-lucide="user-check" class="w-7 h-7"></i></div>
                            <div>
                                <h3 class="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Jugadores</h3>
                                <p class="text-3xl font-black text-slate-800">${players.length}</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 border-t border-slate-50 pt-8 mb-8">
                            <div class="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-center">
                                <p class="text-[8px] font-black text-blue-600 uppercase mb-1">Masc.</p>
                                <p class="text-xl font-black text-blue-600">${totalMale}</p>
                            </div>
                            <div class="bg-rose-50/50 p-3 rounded-xl border border-rose-100 text-center">
                                <p class="text-[8px] font-black text-rose-600 uppercase mb-1">Fem.</p>
                                <p class="text-xl font-black text-rose-600">${totalFemale}</p>
                            </div>
                            ${totalOther > 0 ? `
                                <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                                    <p class="text-[8px] font-black text-slate-400 uppercase mb-1">S.A.</p>
                                    <p class="text-xl font-black text-slate-500">${totalOther}</p>
                                </div>
                            ` : ''}
                        </div>
                        <button onclick="window.switchView('jugadores')" class="mt-auto w-full py-4 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-200">Gestionar Jugadores</button>
                    </div>
                </div>

                <!-- Line 3: Biblioteca de ejercicios + Desglose por equipos -->
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
                    <!-- Tareas Widget -->
                    <div class="lg:col-span-7 stat-card bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl group flex flex-col">
                        <div class="flex items-center justify-between mb-8">
                            <div class="flex items-center gap-5">
                                <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform shadow-sm"><i data-lucide="clipboard-list" class="w-8 h-8"></i></div>
                                <div>
                                    <h3 class="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Biblioteca de Ejercicios</h3>
                                    <p class="text-4xl font-black text-slate-800 font-outfit">${tasks.length} <span class="text-sm font-bold text-slate-300 ml-1">TOTALES</span></p>
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-slate-50 pt-8 mb-8">
                            ${(() => {
                    const palette = [
                        { bg: 'bg-blue-50/50', border: 'border-blue-100', text: 'text-blue-600' },
                        { bg: 'bg-emerald-50/50', border: 'border-emerald-100', text: 'text-emerald-600' },
                        { bg: 'bg-amber-50/50', border: 'border-amber-100', text: 'text-amber-600' },
                        { bg: 'bg-rose-50/50', border: 'border-rose-100', text: 'text-rose-600' },
                        { bg: 'bg-indigo-50/50', border: 'border-indigo-100', text: 'text-indigo-600' },
                        { bg: 'bg-violet-50/50', border: 'border-violet-100', text: 'text-violet-600' }
                    ];
                    return sortedTaskTypes.map(([type, count], idx) => {
                        const color = palette[idx % palette.length];
                        return `
                                        <div class="${color.bg} p-6 rounded-[2rem] border ${color.border} flex flex-col items-center justify-center transition-all hover:bg-white hover:shadow-xl group/item hover:-translate-y-1">
                                            <p class="text-[9px] font-black text-slate-700 uppercase tracking-[0.1em] mb-2 text-center truncate w-full transition-colors">${type}</p>
                                            <p class="text-3xl font-black ${color.text} font-outfit transition-colors">${count}</p>
                                        </div>
                                    `;
                    }).join('') || '<p class="text-[10px] text-slate-300 italic col-span-full text-center py-10">Sin datos</p>';
                })()}
                        </div>
                        <button onclick="window.switchView('tareas')" class="mt-auto w-full py-5 bg-slate-900 text-white hover:bg-black rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10">Gestionar Biblioteca</button>
                    </div>

                    <!-- Torneos por Equipo Widget (Desglose) -->
                    <div class="lg:col-span-5 stat-card bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl group flex flex-col">
                        <div class="flex items-center gap-5 mb-8">
                            <div class="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform shadow-sm"><i data-lucide="medal" class="w-8 h-8"></i></div>
                            <div>
                                <h3 class="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Participación en Torneos</h3>
                                <p class="text-2xl font-black text-slate-800 uppercase">Desglose por Equipo</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4 border-t border-slate-50 pt-8 mb-8">
                            ${(() => {
                    const palette = [
                        { bg: 'bg-blue-50/50', border: 'border-blue-100', text: 'text-blue-600' },
                        { bg: 'bg-emerald-50/50', border: 'border-emerald-100', text: 'text-emerald-600' },
                        { bg: 'bg-amber-50/50', border: 'border-amber-100', text: 'text-amber-600' },
                        { bg: 'bg-rose-50/50', border: 'border-rose-100', text: 'text-rose-600' },
                        { bg: 'bg-indigo-50/50', border: 'border-indigo-100', text: 'text-indigo-600' },
                        { bg: 'bg-violet-50/50', border: 'border-violet-100', text: 'text-violet-600' },
                        { bg: 'bg-cyan-50/50', border: 'border-cyan-100', text: 'text-cyan-600' },
                        { bg: 'bg-orange-50/50', border: 'border-orange-100', text: 'text-orange-600' }
                    ];
                    return sortedTorneoTeams.map(([team, count], idx) => {
                        const color = palette[idx % palette.length];
                        return `
                                        <div class="${color.bg} p-5 rounded-3xl border ${color.border} flex flex-col items-center justify-center transition-all hover:bg-white hover:shadow-xl group/item hover:-translate-y-1">
                                            <p class="text-[10px] font-black text-slate-700 uppercase tracking-[0.1em] mb-2 text-center truncate w-full group-hover/item:text-slate-900 transition-colors">${team}</p>
                                            <p class="text-3xl font-black ${color.text} transition-colors">${count}</p>
                                        </div>
                                    `;
                    }).join('') || '<p class="text-[10px] text-slate-300 italic text-center col-span-full py-10">Sin torneos registrados</p>';
                })()}
                        </div>
                        <button onclick="window.switchView('torneos')" class="mt-auto w-full py-5 bg-amber-500 text-white hover:bg-amber-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-amber-900/10">Gestionar Torneos</button>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
                    <!-- Attendance Widget -->
                    <div class="lg:col-span-8 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col transition-all hover:shadow-md">
                        <div class="flex items-center justify-between mb-10">
                            <h3 class="text-2xl font-black text-slate-800 flex items-center gap-4 uppercase tracking-tight">
                                <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><i data-lucide="trending-up" class="w-7 h-7"></i></div>
                                Rendimiento Asistencia
                            </h3>
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50 px-4 py-2 rounded-full">Media Global: ${teamsToRender.length > 0 ? Math.round(teamsToRender.reduce((acc, t) => acc + (t.computedAsistencia || 0), 0) / teamsToRender.length) : 0}%</span>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            ${teamsToRender.map(e => `
                                <div class="bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100/50 hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all group/item">
                                    <div class="flex justify-between items-center mb-6">
                                        <span class="text-xs font-black text-slate-600 uppercase tracking-widest truncate mr-4">${e.nombre.split(' ||| ')[0]}</span>
                                        <span class="text-lg font-black text-blue-600 group-hover/item:scale-110 transition-transform">${e.computedAsistencia || 0}%</span>
                                    </div>
                                    <div class="h-3 bg-slate-200/50 rounded-full overflow-hidden p-0.5">
                                        <div class="h-full bg-blue-600 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(37,99,235,0.3)]" style="width: ${e.computedAsistencia || 0}%"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <button onclick="window.switchView('asistencia')" class="mt-auto w-full py-5 bg-slate-900 text-white hover:bg-black rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10">Gestionar Asistencia</button>
                    </div>

                    <!-- Clubs Widget -->
                    <div class="lg:col-span-4 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col transition-all hover:shadow-md">
                        <div class="flex items-center justify-between mb-10">
                            <h3 class="text-2xl font-black text-slate-800 flex items-center gap-4 uppercase tracking-tight">
                                <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm"><i data-lucide="building-2" class="w-7 h-7"></i></div>
                                Clubes
                            </h3>
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50 px-4 py-2 rounded-full">${clubes.length}</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-50 pt-8 mb-8">
                            ${clubes.length === 0 ? `
                                <div class="col-span-full py-20 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                                    <i data-lucide="building-2" class="w-12 h-12 text-slate-200 mx-auto mb-4"></i>
                                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin clubes registrados</p>
                                </div>
                            ` : clubes.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')).map(club => `
                                <div onclick="window.switchView('clubes')" class="group flex flex-col items-center text-center p-6 bg-slate-50/50 rounded-[2.5rem] border border-transparent hover:border-indigo-100 hover:bg-white hover:shadow-xl transition-all cursor-pointer">
                                    <div class="w-20 h-20 bg-white rounded-3xl flex items-center justify-center border border-slate-100 shadow-sm overflow-hidden p-3 mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                        ${club.escudo ? `<img src="${club.escudo}" class="w-full h-full object-contain">` : `<i data-lucide="building-2" class="w-8 h-8 text-indigo-400"></i>`}
                                    </div>
                                    <div class="w-full">
                                        <p class="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate mb-1">${club.nombre}</p>
                                        <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate opacity-60">${club.lugar || 'Ubicación'}</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <button onclick="window.switchView('clubes')" class="mt-auto w-full py-5 bg-slate-900 text-white hover:bg-black rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10">Gestionar Clubes</button>
                    </div>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
        } catch (err) {
            console.error("Dashboard error:", err);
            container.innerHTML = `<div class="p-10 bg-red-50 text-red-600 rounded-3xl font-bold uppercase tracking-widest text-xs border border-red-100">Error al cargar el panel de control: ${err.message}</div>`;
        }
    }

    let currentCalendarDate = new Date();
    let selectedCalendarDate = new Date();

    async function renderCalendario(container) {
        try {
            const allSessions = await db.getAll('sesiones');
            const allEventos = await db.getAll('eventos');
            const allConvocatorias = await db.getAll('convocatorias');

            const sessions = window.applyGlobalFilters(allSessions);
            const eventos = window.applyGlobalFilters(allEventos);
            const convocatorias = window.applyGlobalFilters(allConvocatorias);

            const year = currentCalendarDate.getFullYear();
            const month = currentCalendarDate.getMonth();

            const monthName = new Intl.DateTimeFormat('es', { month: 'long' }).format(currentCalendarDate);
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            let startingDay = firstDay === 0 ? 6 : firstDay - 1;

            const selDateStr = `${selectedCalendarDate.getFullYear()}-${String(selectedCalendarDate.getMonth() + 1).padStart(2, '0')}-${String(selectedCalendarDate.getDate()).padStart(2, '0')}`;
            const selectedDaySessions = sessions.filter(s => s.fecha === selDateStr);
            const selectedDayEvents = eventos.filter(e => e.fecha === selDateStr);
            const selectedDayConvocatorias = convocatorias.filter(c => {
                const isMainDate = c.fecha === selDateStr;
                let isExtraDate = false;
                if (c.lugar && c.lugar.includes(' ||| ')) {
                    try {
                        const { extra } = window.parseLugarMetadata(c.lugar);
                        isExtraDate = (extra.s2?.f === selDateStr) || (extra.s3?.f === selDateStr);
                    } catch (e) { }
                }
                return isMainDate || isExtraDate;
            });

            const combinedItems = [
                ...selectedDaySessions.map(s => ({ ...s, type: 'sesion' })),
                ...selectedDayEvents.map(e => ({ ...e, type: 'evento' })),
                ...selectedDayConvocatorias.map(c => ({ ...c, type: 'convocatoria' }))
            ].sort((a, b) => (a.hora || '00:00').localeCompare(b.hora || '00:00'));

            window.updateSelectedCalendarDay = (dStr) => {
                selectedCalendarDate = new Date(dStr + 'T12:00:00');
                renderCalendario(container);
            };

            const selDateFullStr = selectedCalendarDate.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

            container.innerHTML = `
            <div class="flex flex-col md:flex-row gap-6">
                <!-- Left Column: Calendar Grid (80%) -->
                <div class="flex-[8] min-w-0 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col min-h-[600px]">
                        <div class="p-4 border-b flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-20">
                            <div class="flex items-center gap-3">
                                <div class="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                                    <i data-lucide="calendar" class="w-6 h-6 text-white"></i>
                                </div>
                                <h3 class="text-3xl font-black text-slate-800 uppercase tracking-tight">${monthName} <span class="text-blue-600">${year}</span></h3>
                            </div>
                            <div class="flex gap-3 bg-slate-100/80 p-1.5 rounded-2xl">
                                <button id="prev-month" class="p-3 hover:bg-white rounded-xl transition-all shadow-sm hover:scale-105"><i data-lucide="chevron-left" class="w-6 h-6 text-slate-600"></i></button>
                                <button id="next-month" class="p-3 hover:bg-white rounded-xl transition-all shadow-sm hover:scale-105"><i data-lucide="chevron-right" class="w-6 h-6 text-slate-600"></i></button>
                            </div>
                        </div>
                        <div class="mt-2 grid grid-cols-7 border-b bg-slate-50/50 text-center sticky top-[108px] z-10 backdrop-blur-sm">
                            ${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => `<div class="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">${d}</div>`).join('')}
                        </div>
                        <div class="grid grid-cols-7 flex-1 auto-rows-fr">
                            ${Array(startingDay).fill('').map(() => `<div class="border-r border-b border-slate-50/50 bg-slate-50/10"></div>`).join('')}
                            ${Array(daysInMonth).fill('').map((_, i) => {
                const day = i + 1;
                const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                const daySessions = sessions.filter(s => s.fecha === dStr);
                const dayEvents = eventos.filter(e => e.fecha === dStr);
                const dayConcs = convocatorias.filter(c => {
                    if (c.fecha === dStr) return true;
                    if (c.lugar && c.lugar.includes(' ||| ')) {
                        try {
                            const extra = JSON.parse(c.lugar.split(' ||| ')[1]);
                            return (extra.s2?.f === dStr) || (extra.s3?.f === dStr);
                        } catch (e) { }
                    }
                    return false;
                });

                const combined = [
                    ...daySessions.map(s => ({ ...s, color: 'bg-red-500' })),
                    ...dayEvents.map(e => ({ ...e, color: 'bg-emerald-500' })),
                    ...dayConcs.map(c => ({ ...c, color: (c.tipo || '').toUpperCase() === 'TORNEO' ? 'bg-slate-900' : 'bg-amber-400' }))
                ];

                const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                const todayDate = new Date();
                todayDate.setHours(0, 0, 0, 0);
                const cellDate = new Date(year, month, day);
                const isPast = cellDate < todayDate;

                return `
                                    <div onclick="window.updateSelectedCalendarDay('${dStr}')" class="border-r border-b border-slate-100/30 p-4 min-h-0 cursor-pointer hover:bg-blue-50/50 transition-all flex flex-col items-start gap-2 relative group ${isToday ? 'bg-blue-50/20' : ''} ${dStr === selDateStr ? 'bg-blue-50/50 ring-2 ring-blue-100 ring-inset' : ''} ${isPast ? 'bg-slate-50/30' : ''}">
                                        <div class="flex justify-between items-center w-full">
                                            <span class="text-sm font-black transition-all ${isToday ? 'w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center -ml-1 shadow-lg' : (dStr === selDateStr ? 'text-blue-600' : 'text-slate-300 group-hover:text-blue-600')} ${isPast ? 'text-slate-300' : ''}">${day}</span>
                                        </div>
                                        <div class="w-full flex-1 overflow-hidden flex flex-wrap gap-1 mt-1 ${isPast ? 'opacity-40 grayscale' : ''}">
                                            ${combined.slice(0, 8).map(item => `
                                                <div class="w-2 h-2 rounded-full ${item.completada ? 'bg-slate-300' : item.color} shadow-sm"></div>
                                            `).join('')}
                                            ${combined.length > 8 ? `<div class="text-[7px] font-black text-slate-400 mt-0.5">+${combined.length - 8}</div>` : ''}
                                        </div>
                                    </div>
                                `;
            }).join('')}
                        </div>
                    </div>

                    <!-- Right Column: Day Details (Agenda) -->
                    <div class="flex-[3] w-full md:w-80 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col md:min-h-[700px] min-h-[400px]">
                        <div class="p-6 border-b bg-slate-50/30">
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Agenda del Día</h4>
                            <p class="text-lg font-black text-slate-800 uppercase tracking-tight">${selDateFullStr}</p>
                        </div>
                        <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/10 min-h-[200px]">
                            ${combinedItems.length > 0 ? (() => {
                    const todayDate = new Date();
                    todayDate.setHours(0, 0, 0, 0);
                    const isPastDay = selectedCalendarDate < todayDate;

                    return combinedItems.map(item => {
                        const isSession = item.type === 'sesion';
                        const isConv = item.type === 'convocatoria';
                        let accent = 'blue';
                        let icon = 'calendar';
                        let action = `window.viewEventoFicha('${item.id}')`;
                        if (isSession) { accent = 'red'; icon = 'play'; action = `window.viewSessionFicha('${item.id}')`; }
                        else if (isConv) {
                            accent = item.tipo?.toUpperCase() === 'TORNEO' ? 'slate' : 'blue';
                            icon = item.tipo?.toUpperCase() === 'TORNEO' ? 'trophy' : 'users';
                            action = (item.tipo?.toUpperCase() === 'TORNEO') ? `window.viewTorneoRendimiento('${item.id}')` : `window.viewConvocatoria('${item.id}')`;
                        }

                        const isChecked = item.completada || isPastDay;

                        return `
                                        <div onclick="${action}" class="p-5 rounded-2xl border border-slate-100 bg-white hover:border-${accent}-300 hover:shadow-xl hover:shadow-${accent}-500/10 transition-all cursor-pointer group ${isChecked ? 'opacity-40 grayscale bg-slate-50/50' : ''}">
                                            <div class="flex items-center gap-3 mb-3">
                                                <div class="w-8 h-8 rounded-lg ${isChecked ? 'bg-slate-100' : `bg-${accent}-50`} flex items-center justify-center group-hover:bg-${accent}-600 transition-colors">
                                                    <i data-lucide="${icon}" class="w-4 h-4 ${isChecked ? 'text-slate-400' : `text-${accent}-600`} group-hover:text-white transition-colors"></i>
                                                </div>
                                                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${item.hora || '--:--'}</span>
                                            </div>
                                            <p class="text-xs font-black text-slate-800 uppercase leading-snug ${isChecked ? 'text-slate-400' : ''}">${item.titulo || item.nombre}</p>
                                        </div>
                                    `;
                    }).join('');
                })() : `
                                <div class="py-10 text-center flex flex-col items-center gap-3">
                                    <div class="w-12 h-12 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center">
                                        <i data-lucide="coffee" class="w-6 h-6 text-slate-200"></i>
                                    </div>
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Día de descanso</p>
                                </div>
                            `}
                        </div>
                        <div class="p-6 bg-white border-t">
                            <button onclick="window.switchView('eventos')" class="w-full py-4 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg">Gestionar Mi Agenda</button>
                        </div>
                    </div>
                </div>
            `;

            window.showDayEventsPopup = (dateStr) => {
                const daySessions = sessions.filter(s => s.fecha === dateStr);
                const dayEvents = eventos.filter(e => e.fecha === dateStr);
                const dayConcs = convocatorias.filter(c => {
                    if (c.fecha === dateStr) return true;
                    if (c.lugar && c.lugar.includes(' ||| ')) {
                        try {
                            const extra = JSON.parse(c.lugar.split(' ||| ')[1]);
                            return (extra.s2?.f === dateStr) || (extra.s3?.f === dateStr);
                        } catch (e) { }
                    }
                    return false;
                });

                const combinedItems = [
                    ...daySessions.map(s => ({ ...s, type: 'sesion' })),
                    ...dayEvents.map(e => ({ ...e, type: 'evento' })),
                    ...dayConcs.map(c => ({ ...c, type: 'convocatoria' }))
                ].sort((a, b) => (a.hora || '00:00').localeCompare(b.hora || '00:00'));

                const dateObj = new Date(dateStr + 'T12:00:00');
                const title = dateObj.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

                modalContainer.innerHTML = `
                    <div class="p-10 max-w-xl w-full mx-auto relative overflow-hidden rounded-[3rem]">
                        <!-- Abstract background decoration -->
                        <div class="absolute -top-24 -right-24 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl"></div>
                        <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-100/20 rounded-full blur-3xl"></div>

                        <div class="relative flex flex-col gap-10">
                            <div class="flex items-center gap-6">
                                <div class="w-20 h-20 bg-white shadow-2xl shadow-blue-500/10 rounded-[2rem] flex items-center justify-center border border-slate-50">
                                    <i data-lucide="calendar" class="w-10 h-10 text-blue-600"></i>
                                </div>
                                <div>
                                    <p class="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Agenda del día</p>
                                    <h3 class="text-3xl font-black text-slate-800 uppercase tracking-tight leading-tight">${title}</h3>
                                </div>
                            </div>

                            <div class="space-y-4">
                                ${combinedItems.length > 0 ? combinedItems.map(item => {
                    const isSession = item.type === 'sesion';
                    const isConv = item.type === 'convocatoria';
                    const isTorneo = isConv && (item.tipo || '').toUpperCase() === 'TORNEO';

                    let accentColor = 'blue';
                    let icon = 'alarm-clock';
                    let action = `window.viewEventoFicha('${item.id}')`;
                    let typeLabel = 'Evento';

                    if (isTorneo) { accentColor = 'slate'; icon = 'trophy'; action = `window.viewTorneoRendimiento('${item.id}')`; typeLabel = 'Torneo'; }
                    else if (isSession) { accentColor = 'red'; icon = 'play'; action = `window.viewSessionFicha('${item.id}')`; typeLabel = 'Sesión'; }
                    else if (isConv) { accentColor = 'blue'; icon = 'users'; action = `window.viewConvocatoria('${item.id}')`; typeLabel = 'Convocatoria'; }

                    const isChecked = item.completada;

                    return `
                                        <div onclick="${action}" class="group relative p-6 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-100 transition-all cursor-pointer flex items-center gap-6 ${isChecked ? 'opacity-60 grayscale-[0.5]' : ''}">
                                            <div class="w-14 h-14 rounded-[1.5rem] bg-${accentColor}-50 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner-sm">
                                                <i data-lucide="${icon}" class="w-6 h-6 text-${accentColor}-600"></i>
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <div class="flex items-center gap-2 mb-1">
                                                    <span class="text-[10px] font-black text-${accentColor}-600 uppercase tracking-widest bg-${accentColor}-50 px-2 py-0.5 rounded-full">${typeLabel}</span>
                                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${item.hora || 'Todo el día'}</span>
                                                </div>
                                                <p class="font-black text-slate-800 text-lg leading-tight truncate group-hover:text-blue-600 transition-colors uppercase tracking-tight ${isChecked ? 'line-through' : ''}">${item.titulo || item.nombre}</p>
                                            </div>
                                            <div class="flex items-center self-center" onclick="event.stopPropagation()">
                                                <label class="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" ${isChecked ? 'checked' : ''} 
                                                        onchange="window.toggleTaskStatus(${item.id}, '${isSession ? 'sesiones' : (isConv ? 'convocatorias' : 'eventos')}'); setTimeout(() => window.showDayEventsPopup('${dateStr}'), 300)" 
                                                        class="w-8 h-8 rounded-2xl border-2 border-slate-100 text-blue-600 focus:ring-blue-100 transition-all cursor-pointer">
                                                </label>
                                            </div>
                                        </div>
                                    `;
                }).join('') : `
                                    <div class="py-20 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200/50">
                                        <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                                            <i data-lucide="coffee" class="w-8 h-8 text-slate-200"></i>
                                        </div>
                                        <p class="text-slate-400 font-black uppercase tracking-widest text-xs">Día de descanso</p>
                                        <p class="text-[10px] text-slate-400 mt-1 uppercase font-bold opacity-60">No se han programado eventos aún</p>
                                    </div>
                                `}
                            </div>

                            <button onclick="closeModal()" class="w-full py-6 bg-slate-900 text-white font-black rounded-3xl shadow-2xl hover:bg-black transition-all uppercase tracking-widest text-[11px] shadow-slate-900/30">Volver al Calendario</button>
                        </div>
                    </div>
                `;
                modalOverlay.classList.add('active');
                if (window.lucide) lucide.createIcons();
            };

            container.querySelector('#prev-month').onclick = () => {
                currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
                renderCalendario(container);
            };
            container.querySelector('#next-month').onclick = () => {
                currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
                renderCalendario(container);
            };

            if (window.lucide) lucide.createIcons();

        } catch (err) {
            console.error(err);
            container.innerHTML = `<div class="p-10 bg-red-50 text-red-600 rounded-2xl">Error cargando calendario: ${err.message}</div>`;
        }
    }

    window.toggleTaskStatus = async (id, table = 'eventos') => {
        try {
            const items = await db.getAll(table);
            const item = items.find(e => e.id == id);
            if (item) {
                item.completada = !item.completada;
                await db.update(table, item);
                if (window.refreshNotifications) window.refreshNotifications();
                if (typeof renderCalendario === 'function' && currentView === 'calendario') {
                    const container = document.getElementById('content-container');
                    renderCalendario(container);
                } else {
                    window.switchView(currentView);
                }
            }
        } catch (err) {
            console.error("Error toggling status:", err);
        }
    };

    window.downloadPlayerTemplate = () => {
        // Headers coincidentes exactamente con las columnas de Supabase
        const headers = ["nombre", "equipoid", "anionacimiento", "posicion", "lateralidad", "nivel", "sexo", "notas", "equipoConvenido"];
        const rows = [
            ["JUAN PEREZ", "", "2010", "PO", "Derecho", "3", "Masculino", "Buenos reflejos", "ANTIGUOKO"],
            ["MARIA GARCIA", "", "2008", "DCZ", "Zurdo", "4", "Femenino", "Goleadora", "REAL SOCIEDAD"]
        ];

        const csvContent = [
            headers.join(";"),
            ...rows.map(r => r.join(";"))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "PLANTILLA_JUGADORES.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    window.showPlayerImportModal = () => {
        modalContainer.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Importación Masiva</h3>
                    <button onclick="closeModal()" class="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-all"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>

                <div class="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50 mb-6">
                    <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Instrucciones del Formato</p>
                    <ul class="space-y-2">
                        <li class="flex items-start gap-2 text-xs text-slate-600">
                            <span class="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0"></span>
                            <span>Usa la columna <strong>NOMBRE</strong> como identificador principal.</span>
                        </li>
                        <li class="flex items-start gap-2 text-xs text-slate-600">
                            <span class="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0"></span>
                            <span>Si el <strong>EQUIPO</strong> existe en la app, se vinculará automáticamente.</span>
                        </li>
                        <li class="flex items-start gap-2 text-xs text-slate-600">
                            <span class="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0"></span>
                            <span>Campos extras soportados: <strong>POSICION, DORSAL, NIVEL, SEXO, PIE, NOTAS</strong>.</span>
                        </li>
                    </ul>
                </div>

                <div class="flex flex-col gap-3">
                    <button onclick="window.downloadPlayerTemplate()" class="w-full py-4 bg-white border-2 border-slate-100 text-slate-600 font-bold rounded-2xl flex items-center justify-center gap-3 hover:border-blue-200 hover:text-blue-600 transition-all uppercase tracking-widest text-[10px]">
                        <i data-lucide="download" class="w-4 h-4"></i>
                        Descargar Plantilla CSV
                    </button>
                    
                    <button id="trigger-csv-upload" class="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-3">
                        <i data-lucide="file-up" class="w-5 h-5"></i>
                        Seleccionar Archivo y Subir
                    </button>
                </div>
                
                <p class="mt-6 text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">Soporta delimitadores coma (,) o punto y coma (;)</p>
            </div>
        `;

        lucide.createIcons();
        modalOverlay.classList.add('active');

        document.getElementById('trigger-csv-upload').onclick = () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.csv';
            fileInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = async (re) => {
                    closeModal(); // Close instruction modal

                    const loadingAlert = document.createElement('div');
                    loadingAlert.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center';
                    loadingAlert.innerHTML = `
                        <div class="bg-white p-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                            <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <p class="font-bold text-slate-800 uppercase tracking-widest text-xs">Sincronizando Jugadores...</p>
                        </div>
                    `;
                    document.body.appendChild(loadingAlert);

                    try {
                        const text = re.target.result;
                        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                        if (lines.length < 2) throw new Error("Archivo vacío");

                        const firstLine = lines[0];
                        const delimiter = firstLine.includes(';') ? ';' : ',';
                        const headers = firstLine.split(delimiter).map(h => h.trim().toUpperCase().replace(/^"|"$/g, ''));

                        // Less strict mapping: check if any of the keywords is contained in the header
                        const mapHeader = (keywords) => headers.findIndex(h => keywords.some(k => h.includes(k)));

                        const idxNombre = mapHeader(['NOMBRE', 'JUGADOR', 'PLAYER', 'NAME']);
                        const idxEquipo = mapHeader(['EQUIPOID', 'EQUIPO', 'TEAM']);
                        const idxClub = mapHeader(['EQUIPOCONVENIDO', 'CLUB']);
                        const idxPosicion = mapHeader(['POSICION', 'POSITION', 'POS']);
                        const idxAnio = mapHeader(['AÑO', 'YEAR', 'NACIMIENTO', 'ANIONACIMIENTO']);
                        const idxNivel = mapHeader(['NIVEL', 'LEVEL']);
                        const idxSexo = mapHeader(['SEXO', 'GENERO', 'GENDER']);
                        const idxPie = mapHeader(['PIE', 'FOOT', 'LATERALIDAD']);
                        const idxNotas = mapHeader(['NOTAS', 'NOTES']);

                        if (idxNombre === -1) throw new Error("Columna NOMBRE no encontrada");

                        const teams = window.getSortedTeams(await db.getAll('equipos'));
                        const existingPlayers = await db.getAll('jugadores');
                        const playersToInsert = [];
                        const playersToUpdate = [];
                        const duplicateNames = [];

                        const regex = new RegExp(`\\${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`);

                        for (let i = 1; i < lines.length; i++) {
                            const row = lines[i].split(regex).map(c => c.trim().replace(/^"|"$/g, ''));
                            if (!row[idxNombre]) continue;

                            const rawNombre = row[idxNombre].toUpperCase().trim();

                            // 1. Manejo de Equipo Interno (equipoid)
                            const teamVal = idxEquipo !== -1 ? row[idxEquipo] : '';
                            const team = teams.find(t => t.nombre.split(' ||| ')[0].toLowerCase() === (teamVal || '').toLowerCase());

                            // 2. Manejo de Club Externo (equipoConvenido)
                            let clubVal = idxClub !== -1 ? row[idxClub] : '';
                            // Si no hay club externo explícito pero el "equipo" no es interno, lo tomamos como club
                            if (!clubVal && teamVal && !team) clubVal = teamVal;

                            // Normalize Foot (Pie/Lateralidad)
                            let rawPie = idxPie !== -1 ? row[idxPie].toUpperCase() : '';
                            let lateralidad = 'Derecho';
                            if (rawPie.includes('ZUR') || rawPie.includes('IZQ') || rawPie.includes('LEFT')) lateralidad = 'Zurdo';
                            else if (rawPie.includes('AMB') || rawPie.includes('DOS') || rawPie.includes('BOTH')) lateralidad = 'Ambidiestro';
                            else if (rawPie.includes('DER') || rawPie.includes('RIGHT') || rawPie.includes('DIES')) lateralidad = 'Derecho';

                            const csvPlayer = {
                                nombre: rawNombre,
                                nivel: idxNivel !== -1 ? (parseInt(row[idxNivel]) || 3) : 3,
                                equipoid: team ? team.id : null,
                                equipoConvenido: clubVal || null,
                                posicion: idxPosicion !== -1 ? window.parsePosition(row[idxPosicion]).join(', ') : 'PO',
                                anionacimiento: idxAnio !== -1 ? (parseInt(row[idxAnio].replace(/\D/g, '')) || null) : null,
                                sexo: idxSexo !== -1 ? (row[idxSexo] || 'Masculino') : 'Masculino',
                                lateralidad: lateralidad,
                                notas: idxNotas !== -1 ? row[idxNotas] : ''
                            };

                            const existing = existingPlayers.find(p => p.nombre.toUpperCase() === rawNombre);
                            if (existing) {
                                playersToUpdate.push({ ...existing, ...csvPlayer });
                                duplicateNames.push(rawNombre);
                            } else {
                                playersToInsert.push(csvPlayer);
                            }
                        }

                        let shouldUpdate = false;
                        if (playersToUpdate.length > 0) {
                            loadingAlert.remove(); // Remove loading to show confirm
                            const confirmUpdate = confirm(`Se han encontrado ${playersToUpdate.length} jugadores que ya existen en el sistema:\n\n${duplicateNames.slice(0, 10).join(', ')}${duplicateNames.length > 10 ? '...' : ''}\n\n¿Deseas ACTUALIZAR sus datos con la información del CSV? (Cancelar solo importará los nuevos)`);
                            shouldUpdate = confirmUpdate;
                            document.body.appendChild(loadingAlert); // Restore loading
                        }

                        let updatedCount = 0;
                        if (shouldUpdate && playersToUpdate.length > 0) {
                            for (const p of playersToUpdate) {
                                await db.update('jugadores', p);
                                updatedCount++;
                            }
                        }

                        if (playersToInsert.length > 0) {
                            const { error } = await supabaseClient.from('jugadores').insert(playersToInsert);
                            if (error) throw error;
                        }

                        // Forzar refresco total de la caché local
                        delete db.cache['jugadores'];
                        delete db.lastSync['jugadores'];
                        await db.getAll('jugadores');

                        window.customAlert('Éxito', `Nuevos: ${playersToInsert.length}, Actualizados: ${updatedCount}`, 'success');
                        window.switchView('jugadores');
                    } catch (err) {
                        window.customAlert('Error', err.message, 'error');
                    } finally {
                        loadingAlert.remove();
                    }
                };
                reader.readAsText(file);
            };
            fileInput.click();
        };
    };

    window.renderEventos = async function (container, onlyTable = false) {
        const allEvents = await db.getAll('eventos');
        const tasks = window.applyGlobalFilters(allEvents);

        if (!window.eventFilters) window.eventFilters = { search: '', category: 'TODOS' };

        const categories = ['TODOS', ...new Set(tasks.map(t => t.categoria || 'Otro').filter(Boolean))].sort();

        const filteredTasks = tasks.filter(t => {
            const searchVal = (window.eventFilters.search || '').toLowerCase();
            const matchesSearch = (t.nombre || '').toLowerCase().includes(searchVal) ||
                (t.categoria || '').toLowerCase().includes(searchVal) ||
                (t.lugar || '').toLowerCase().includes(searchVal);

            const matchesCategory = window.eventFilters.category === 'TODOS' || (t.categoria || 'Otro') === window.eventFilters.category;

            return matchesSearch && matchesCategory;
        }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha) || (b.hora || '').localeCompare(a.hora || ''));

        if (!onlyTable) {
            container.innerHTML = `
                <div class="space-y-6 mb-10">
                    <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div class="relative flex-1 w-full">
                            <i data-lucide="search" class="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <input type="text" id="event-search-input" value="${window.eventFilters.search}" placeholder="Buscar en la agenda (nombre, lugar...)" 
                                class="w-full pl-12 pr-12 py-4 bg-white border border-slate-100 rounded-[2rem] text-sm focus:ring-4 ring-blue-50 outline-none transition-all shadow-sm"
                                oninput="window.eventFilters.search = this.value; window.renderEventos(document.getElementById('content-container'), true)">
                            ${window.eventFilters.search ? `
                                <button onclick="window.eventFilters.search = ''; window.renderEventos(document.getElementById('content-container'), true)" 
                                    class="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Borrar búsqueda">
                                    <i data-lucide="x" class="w-4 h-4"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Sub-tabs based on Categories -->
                    <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                        ${categories.map(cat => `
                            <button onclick="window.eventFilters.category = '${cat}'; window.renderEventos(document.getElementById('content-container'))" 
                                class="px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border ${window.eventFilters.category === cat ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}">
                                ${cat}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div id="events-list-container" class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
                    <!-- Tabla de eventos -->
                </div>
            `;
        }

        const eventsContainer = onlyTable ? document.getElementById('events-list-container') : container.querySelector('#events-list-container');
        if (eventsContainer) {
            eventsContainer.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/50">
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Evento / Tarea</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Categoría</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha & Hora</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lugar</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${filteredTasks.map(e => `
                                <tr onclick="window.viewEventoFicha('${e.id}')" class="hover:bg-blue-50/30 transition-colors group cursor-pointer ${e.completada ? 'bg-slate-50/10' : ''}">
                                    <td class="px-8 py-6" onclick="event.stopPropagation()">
                                        <input type="checkbox" ${e.completada ? 'checked' : ''} onclick="window.toggleTaskStatus(${e.id}, 'eventos')" 
                                            class="w-6 h-6 rounded-xl border-2 border-slate-200 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all">
                                    </td>
                                    <td class="px-8 py-6">
                                        <div class="flex flex-col">
                                            <span class="text-sm font-black text-slate-800 ${e.completada ? 'line-through opacity-40' : ''}">${e.nombre}</span>
                                            ${e.notas ? `<span class="text-[10px] text-slate-400 mt-1 line-clamp-1">${e.notas}</span>` : ''}
                                        </div>
                                    </td>
                                    <td class="px-8 py-6 text-center">
                                        <span class="inline-flex px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                            ${e.categoria || 'Otro'}
                                        </span>
                                    </td>
                                    <td class="px-8 py-6">
                                        <div class="flex flex-col">
                                            <span class="text-xs font-bold text-slate-600">${e.fecha}</span>
                                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${e.hora}</span>
                                        </div>
                                    </td>
                                    <td class="px-8 py-6">
                                        <span class="text-xs font-medium text-slate-500 line-clamp-1">${window.cleanLugar(e.lugar) || '---'}</span>
                                    </td>
                                    <td class="px-8 py-6 text-right">
                                        <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onclick="event.stopPropagation(); window.viewEvento(${e.id})" class="p-2 bg-white shadow-sm border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-all">
                                                <i data-lucide="edit-2" class="w-4 h-4"></i>
                                            </button>
                                            <button onclick="event.stopPropagation(); window.deleteEvento(${e.id})" class="p-2 bg-white shadow-sm border border-slate-100 rounded-xl text-red-400 hover:bg-red-50 transition-all">
                                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('') || `
                                <tr>
                                    <td colspan="6" class="px-8 py-20 text-center">
                                        <div class="flex flex-col items-center gap-2">
                                            <i data-lucide="calendar-off" class="w-12 h-12 text-slate-200 mb-2"></i>
                                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin compromisos encontrados</p>
                                        </div>
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            `;
        }

        if (window.lucide) lucide.createIcons();
    }

    window.viewEventoFicha = async (id) => {
        const items = await db.getAll('eventos');
        const evento = items.find(e => e.id == id);
        if (!evento) return;
        const teams = window.getSortedTeams(await db.getAll('equipos'));

        modalOverlay.classList.add('p-0');
        modalOverlay.classList.remove('md:p-8', 'p-4');
        modalContainer.className = "bg-white w-full h-full rounded-none shadow-none overflow-y-auto transform transition-all duration-300 custom-scrollbar";

        modalContainer.innerHTML = `
            <div class="min-h-screen bg-slate-50 animate-in fade-in duration-500">
                <!-- Immersive Header -->
                <div class="bg-white border-b border-slate-100 sticky top-0 z-50">
                    <div class="max-w-7xl mx-auto px-8 py-10 md:py-14">
                        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                            <div class="flex-1">
                                <div class="flex items-center gap-3 mb-6">
                                    <span class="px-3 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20">${evento.categoria || 'Evento de Agenda'}</span>
                                    <span class="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                        <i data-lucide="calendar" class="w-3 h-3"></i>
                                        ${evento.fecha}
                                    </span>
                                    ${evento.completada ? '<span class="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">Completado ✅</span>' : ''}
                                </div>
                                <h1 class="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tight leading-none mb-4">${evento.nombre}</h1>
                                <div class="flex flex-wrap items-center gap-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                    <div class="flex items-center gap-2">
                                        <i data-lucide="clock" class="w-4 h-4 text-blue-500"></i>
                                        ${evento.hora || '--:--'}
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <i data-lucide="map-pin" class="w-4 h-4 text-blue-500"></i>
                                        ${window.cleanLugar(evento.lugar) || 'Ubicación no definida'}
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center gap-3 w-full md:w-auto">
                                <button onclick="window.viewEvento('${id}')" class="flex-1 md:flex-none p-4 bg-white border-2 border-slate-100 text-slate-800 rounded-2xl hover:border-blue-600 hover:text-blue-600 transition-all flex items-center justify-center gap-3 px-8 shadow-sm">
                                    <i data-lucide="edit-3" class="w-5 h-5"></i>
                                    <span class="text-[11px] font-black uppercase tracking-widest">Editar Registro</span>
                                </button>
                                <button onclick="closeModal()" class="p-4 bg-slate-900 text-white rounded-full hover:bg-black transition-all flex items-center justify-center w-14 h-14 shadow-2xl">
                                    <i data-lucide="arrow-left" class="w-6 h-6"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="max-w-7xl mx-auto px-8 py-12">
                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        <!-- Left: Main Content -->
                        <div class="lg:col-span-8 space-y-10">
                            <div class="bg-white rounded-[3rem] border border-slate-100 p-10 shadow-sm relative overflow-hidden">
                                <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                                    <i data-lucide="align-left" class="w-4 h-4"></i>
                                    Descripción y Anotaciones
                                </h3>
                                <div class="text-slate-600 font-medium text-lg leading-relaxed whitespace-pre-wrap">
                                    ${evento.notas || '<span class="italic text-slate-300">No se han añadido notas para este compromiso.</span>'}
                                </div>
                            </div>
                        </div>

                        <!-- Right: Context Info -->
                        <div class="lg:col-span-4 space-y-8">
                            <div class="bg-slate-900 rounded-[3rem] p-10 shadow-2xl text-white relative overflow-hidden">
                                <div class="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl"></div>
                                <h3 class="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-8 relative z-10 flex items-center gap-2">
                                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><circle cx="12" cy="12" r="3"/></svg>
                                    Contexto Logístico
                                </h3>
                                
                                <div class="space-y-6 relative z-10">
                                    <div class="p-6 bg-white/5 rounded-2xl border border-white/10">
                                        <p class="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Entorno</p>
                                        <p class="text-sm font-bold text-white uppercase">${window.cleanLugar(evento.lugar) || 'Sede Central'}</p>
                                    </div>
                                    <div class="p-6 bg-white/5 rounded-2xl border border-white/10">
                                        <p class="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Equipos Vinculados</p>
                                        <div class="space-y-2">
                                            ${(evento.equipoids || []).length > 0 ? evento.equipoids.map(eid => {
            const team = teams.find(t => t.id == eid);
            return `
                                                    <div class="flex items-center gap-2">
                                                        <div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                                        <span class="text-xs font-bold text-white/80 uppercase">${team ? team.nombre : 'Equipo'}</span>
                                                    </div>
                                                `;
        }).join('') : '<p class="text-[10px] text-white/30 italic">No hay equipos vinculados</p>'}
                                        </div>
                                    </div>
                                    <div class="p-6 bg-white/5 rounded-2xl border border-white/10">
                                        <p class="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Estado del proceso</p>
                                        <div class="flex items-center gap-3">
                                            <div class="w-2.5 h-2.5 rounded-full ${evento.completada ? 'bg-emerald-500' : 'bg-blue-500'}"></div>
                                            <p class="text-sm font-bold text-white uppercase">${evento.completada ? 'Tarea Finalizada' : 'Pendiente de Ejecución'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
        modalOverlay.classList.add('active');
    };

    window.viewSessionFicha = async (id) => {
        const session = await db.get('sesiones', id);
        if (!session) return;

        const teams = window.getSortedTeams(await db.getAll('equipos'));
        const tasks = await db.getAll('tareas');
        const team = teams.find(t => t.id == session.equipoid);
        const sessionTasks = (session.taskids || []).map(taskId => tasks.find(t => t.id.toString() === taskId.toString())).filter(t => t);

        const players = await db.getAll('jugadores');
        const sessionPlayers = players.filter(p => (session.playerids || []).includes(p.id.toString()));

        modalOverlay.classList.add('p-0');
        modalOverlay.classList.remove('md:p-8', 'p-4');
        modalContainer.className = "bg-white w-full h-full rounded-none shadow-none overflow-y-auto transform transition-all duration-300 custom-scrollbar";

        modalContainer.innerHTML = `
            <div class="p-8 md:p-12 animate-in fade-in duration-500">
                <div class="flex flex-col md:flex-row justify-between items-start gap-6 mb-12">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-4">
                            <span class="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-[0.2em]">SESIÓN DE TRABAJO</span>
                            ${(() => {
                let teamIds = [session.equipoid];
                const { extra } = window.parseLugarMetadata(session.lugar);
                if (extra.eids) teamIds = [...new Set([...teamIds.map(String), ...extra.eids.map(String)])];
                return teamIds.filter(id => id && teams.find(t => t.id == id)).map(id => `
                                    <span class="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">${teams.find(t => t.id == id).nombre.split(' ||| ')[0]}</span>
                                `).join('');
            })()}
                        </div>
                        <h2 class="text-4xl font-black text-slate-800 uppercase tracking-tight leading-none mb-4">${session.titulo || 'Sesión sin título'}</h2>
                        <div class="flex flex-wrap items-center gap-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            <div class="flex items-center gap-2">
                                <i data-lucide="calendar" class="w-4 h-4 text-blue-500"></i>
                                ${session.fecha}
                            </div>
                            <div class="flex items-center gap-2">
                                <i data-lucide="clock" class="w-4 h-4 text-blue-500"></i>
                                ${session.hora || '--:--'}
                            </div>
                            <div class="flex items-center gap-2 mt-1">
                                <i data-lucide="map-pin" class="w-3.5 h-3.5 text-slate-300"></i>
                                ${window.cleanLugar(session.lugar) || 'No especificado'}
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-3 w-full md:w-auto">
                        <button onclick="window.previewSessionPDF('${id}')" class="flex-1 md:flex-none p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all flex items-center justify-center gap-2 px-6" title="Previsualizar PDF">
                            <i data-lucide="eye" class="w-5 h-5"></i>
                            <span class="text-[10px] font-black uppercase tracking-widest">Previsualizar</span>
                        </button>
                        <button onclick="window.printSession('${id}')" class="flex-1 md:flex-none p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2 px-6">
                            <i data-lucide="printer" class="w-5 h-5"></i>
                            <span class="text-[10px] font-black uppercase tracking-widest">Imprimir</span>
                        </button>
                        <button onclick="window.duplicateSession('${id}')" class="flex-1 md:flex-none p-4 bg-amber-50 text-amber-600 rounded-2xl hover:bg-amber-100 transition-all flex items-center justify-center gap-2 px-6">
                            <i data-lucide="copy" class="w-5 h-5"></i>
                            <span class="text-[10px] font-black uppercase tracking-widest">Duplicar</span>
                        </button>
                        <button onclick="window.viewSession('${id}')" class="flex-1 md:flex-none p-4 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 px-6">
                            <i data-lucide="edit-3" class="w-5 h-5"></i>
                            <span class="text-[10px] font-black uppercase tracking-widest">Editar Sesión</span>
                        </button>
                        <button onclick="closeModal()" class="p-4 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all flex items-center justify-center w-14 h-14">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    <div class="lg:col-span-8 space-y-8">
                        <div>
                            <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <i data-lucide="layers" class="w-4 h-4"></i>
                                Secuencia de Entrenamiento
                            </h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                ${sessionTasks.map((t, idx) => `
                                    <div class="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden group hover:shadow-2xl transition-all h-full flex flex-col cursor-pointer" onclick="window.viewTask(${t.id})">
                                        <div class="relative aspect-video bg-slate-900 overflow-hidden">
                                            ${t.image ? `<img src="${t.image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">` : `<div class="w-full h-full flex items-center justify-center text-slate-700 font-black uppercase text-[10px] tracking-[0.3em]">Sin Imagen</div>`}
                                            <div class="absolute top-4 left-4 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Tarea ${idx + 1}</div>
                                        </div>
                                        <div class="p-8 flex-1">
                                            <p class="text-[10px] font-black text-blue-600 uppercase mb-2 tracking-[0.2em]">${t.type || 'Fútbol'}</p>
                                            <h4 class="text-xl font-black text-slate-800 uppercase tracking-tight mb-3">${t.name}</h4>
                                            <p class="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                                <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                                                ${t.duration || '---'} min
                                            </p>
                                        </div>
                                    </div>
                                `).join('') || `
                                    <div class="col-span-full py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200 text-center">
                                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">No hay tareas programadas</p>
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>

                    <div class="lg:col-span-4 space-y-8">
                        <div class="p-8 bg-slate-900 rounded-[3rem] shadow-2xl relative overflow-hidden group/canvas min-h-[400px]">
                            <h3 class="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-6 flex items-center gap-2 relative z-10">
                                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><circle cx="12" cy="12" r="3"/></svg>
                                Pizarra Táctica
                            </h3>
                            <div class="relative z-10 h-full">
                                ${renderTacticalPitchHtml(sessionPlayers, 'F11_433', 'vertical')}
                            </div>
                        </div>

                        <div class="p-8 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
                            <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center justify-between">
                                <span class="flex items-center gap-2">
                                    <i data-lucide="users" class="w-4 h-4"></i>
                                    Jugadores
                                </span>
                                <span class="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">${sessionPlayers.length}</span>
                            </h3>
                            <div class="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar no-scrollbar">
                                ${sessionPlayers.map(p => `
                                    <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl hover:bg-blue-50 transition-colors">
                                        <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-[10px] text-white">#</div>
                                        <div>
                                            <p class="text-xs font-black text-slate-800 uppercase">${p.nombre}</p>
                                            <p class="text-[9px] font-bold text-slate-400 uppercase">${window.formatPosition(p.posicion)}</p>
                                        </div>
                                    </div>
                                `).join('') || `<p class="text-[10px] text-slate-400 italic">No hay jugadores asignados.</p>`}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
        modalOverlay.classList.add('active');
    };

    window.viewEvento = async (id) => {
        const events = await db.getAll('eventos');
        const evento = events.find(e => e.id == id);
        const { data: users } = await supabaseClient.from('profiles').select('*');
        const currentUser = (await supabaseClient.auth.getUser()).data.user;
        const isAdminOrTecnico = db.userRole !== 'TECNICO CLUB CONVENIDO';

        modalContainer.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-slate-800">Editar Evento</h3>
                    <button onclick="closeModal()" class="p-2 bg-slate-100 rounded-full text-slate-400"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>
                <form id="edit-evento-form" class="space-y-6">
                    <input type="hidden" name="id" value="${evento.id}">
                    <div class="grid grid-cols-2 gap-4">
                         <div class="col-span-2">
                             <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nombre del Evento</label>
                             <input name="nombre" value="${evento.nombre}" class="w-full p-3 border rounded-xl font-bold text-lg" required>
                         </div>
                         <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Categoría</label>
                            <select name="categoria" class="w-full p-3 border rounded-xl bg-white focus:ring-2 ring-amber-100 outline-none">
                                <option ${evento.categoria === 'Reunión' ? 'selected' : ''}>Reunión</option>
                                <option ${evento.categoria === 'Partido' ? 'selected' : ''}>Partido</option>
                                <option ${evento.categoria === 'Scouting' ? 'selected' : ''}>Scouting</option>
                                <option ${evento.categoria === 'Mandar convocatorias' ? 'selected' : ''}>Mandar convocatorias</option>
                                <option ${evento.categoria === 'Preparar equipos torneos' ? 'selected' : ''}>Preparar equipos torneos</option>
                                <option ${evento.categoria === 'Preparar jugadores ciclos/sesiones' ? 'selected' : ''}>Preparar jugadores ciclos/sesiones</option>
                                <option ${evento.categoria === 'Lavar ropa' ? 'selected' : ''}>Lavar ropa</option>
                                <option ${evento.categoria === 'Otro' ? 'selected' : ''}>Otro</option>
                            </select>
                         </div>
                         <div class="grid grid-cols-2 gap-2 col-span-1">
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Fecha</label>
                                <input name="fecha" type="date" value="${evento.fecha}" class="w-full p-3 border rounded-xl" required>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Hora</label>
                                <input name="hora" type="time" value="${evento.hora}" class="w-full p-3 border rounded-xl" required>
                            </div>
                         </div>
                         <div class="col-span-2">
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Lugar</label>
                            <input name="lugar" value="${window.cleanLugar(evento.lugar) || ''}" placeholder="Lugar" class="w-full p-3 border rounded-xl">
                         </div>
                         <div class="col-span-2">
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Notas</label>
                            <textarea name="notas" class="w-full p-3 border rounded-xl h-24" placeholder="Notas...">${evento.notas || ''}</textarea>
                         </div>
                    </div>

                    <!-- Panel de Compartir (solo si puede editar) -->
                    ${(users && isAdminOrTecnico) ? `
                        <div class="space-y-3">
                            <label class="block text-xs font-black text-slate-400 uppercase tracking-widest">Compartir con el Staff</label>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100 custom-scrollbar">
                                ${users.filter(u => u.id !== currentUser.id).map(u => `
                                    <label class="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 transition-all select-none">
                                        <input type="checkbox" name="sharedWith" value="${u.id}" ${evento.sharedWith && evento.sharedWith.includes(u.id) ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 focus:ring-blue-100">
                                        <div class="flex-1">
                                            <p class="text-[10px] font-bold text-slate-700">${u.name || u.full_name || u.nombre || 'Sin Nombre'}</p>
                                        </div>
                                    </label>
                                `).join('') || '<p class="text-[10px] text-slate-400 italic">No hay otros usuarios registrados.</p>'}
                            </div>
                        </div>
                    ` : ''}

                    <div class="flex gap-4 mt-6">
                        <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
                        <button type="submit" class="flex-[2] py-4 bg-amber-600 text-white font-bold rounded-2xl shadow-lg shadow-amber-600/20 hover:bg-amber-700 transition-all uppercase tracking-widest">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        `;
        lucide.createIcons(); modalOverlay.classList.add('active');

        document.getElementById('edit-evento-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.sharedWith = formData.getAll('sharedWith');

            const eventId = parseInt(data.id);
            delete data.id;

            if (data.nombre) data.nombre = data.nombre.toUpperCase().trim();
            if (data.lugar) data.lugar = data.lugar.toUpperCase().trim();

            const { error } = await supabaseClient.from('eventos').update(data).eq('id', eventId);

            if (error) {
                window.customAlert('Error', 'No se pudo guardar: ' + error.message, 'error');
            } else {
                window.customAlert('Éxito', 'Evento actualizado', 'success');
                closeModal();
                if (window.refreshNotifications) window.refreshNotifications();
                window.switchView(currentView || 'calendario');
            }
        });
    };

    window.deleteEvento = async (id) => {
        window.customConfirm('¿Eliminar Evento?', 'Se borrará este evento de tu agenda.', async () => {
            await db.delete('eventos', Number(id));
            window.switchView('eventos');
        });
    };

    window.taskFilters = { search: '', type: 'TODOS', categoria: 'TODAS', objetivo: 'TODOS', espacio: 'TODOS', currentPage: 1 };
    let playerFilters = { search: '', team: 'TODOS' };
    let tasksPerPage = 12;
    let currentTaskPage = 1;

    window.renderTareas = async function (container, onlyTable = false) {
        let tasks = await db.getAll('tareas');

        if (!onlyTable) {
            container.innerHTML = `
                <div class="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between animate-in slide-in-from-top-4 duration-500">
                    <div class="relative flex-1 w-full">
                        <i data-lucide="search" class="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input type="text" id="task-search-input" value="${window.taskFilters.search}" placeholder="Filtrar biblioteca de ejercicios..." 
                            class="w-full pl-12 pr-12 py-4 bg-white border border-slate-100 rounded-[2rem] text-sm focus:ring-4 ring-blue-50 outline-none transition-all shadow-sm">
                        ${window.taskFilters.search ? `
                            <button onclick="window.taskFilters.search = ''; window.renderTareas(document.getElementById('content-container'))" 
                                class="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Borrar búsqueda">
                                <i data-lucide="x" class="w-4 h-4"></i>
                            </button>
                        ` : ''}
                    </div>
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full lg:w-auto">
                        <select id="task-type-filter" class="px-4 py-4 bg-white border border-slate-100 rounded-2xl text-[10px] font-black text-slate-600 outline-none hover:border-blue-200 transition-all shadow-sm uppercase tracking-widest">
                            <option value="TODOS">TIPOS</option>
                            ${TASK_TYPES.map(t => `<option value="${t}" ${window.taskFilters.type === t ? 'selected' : ''}>${t}</option>`).join('')}
                        </select>
                        <select id="task-cat-filter" class="px-4 py-4 bg-white border border-slate-100 rounded-2xl text-[10px] font-black text-slate-600 outline-none hover:border-blue-200 transition-all shadow-sm uppercase tracking-widest">
                            <option value="TODAS">ETAPAS</option>
                            ${TASK_CATEGORIES.map(c => `<option value="${c}" ${window.taskFilters.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                        <select id="task-obj-filter" class="px-4 py-4 bg-white border border-slate-100 rounded-2xl text-[10px] font-black text-slate-600 outline-none hover:border-blue-200 transition-all shadow-sm uppercase tracking-widest">
                            <option value="TODOS">OBJETIVOS</option>
                            ${TASK_OBJECTIVES.map(o => `<option value="${o}" ${window.taskFilters.objetivo === o ? 'selected' : ''}>${o}</option>`).join('')}
                        </select>
                        <select id="task-esp-filter" class="px-4 py-4 bg-white border border-slate-100 rounded-2xl text-[10px] font-black text-slate-600 outline-none hover:border-blue-200 transition-all shadow-sm uppercase tracking-widest">
                            <option value="TODOS">ESPACIOS</option>
                            ${TASK_SPACES.map(s => `<option value="${s}" ${window.taskFilters.espacio === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>
                    <button id="clear-task-filters" class="w-full md:w-auto px-6 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                        Limpiar
                    </button>
                </div>

                <div id="tasks-table-container" class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                    <!-- Aquí se inyecta la tabla -->
                </div>
            `;
        }

        const tableContainer = onlyTable ? document.getElementById('tasks-table-container') : container.querySelector('#tasks-table-container');
        if (tableContainer) {
            const filteredTasks = tasks.filter(t => {
                const f = window.taskFilters || {};
                const searchLower = (f.search || '').trim().toLowerCase();
                const matchesSearch = !searchLower || (t.name || '').toLowerCase().includes(searchLower) || (t.description || '').toLowerCase().includes(searchLower);

                const typeVal = (t.type || '').trim().toUpperCase();
                const filterType = (f.type || 'TODOS').toUpperCase();
                const matchesType = filterType === 'TODOS' || typeVal === filterType;

                const catVal = (t.categoria || '').trim().toUpperCase();
                const filterCat = (f.categoria || 'TODAS').toUpperCase();
                const matchesCat = filterCat === 'TODAS' || catVal === filterCat;

                const objVal = (t.objetivo || '').trim().toUpperCase();
                const filterObj = (f.objetivo || 'TODOS').toUpperCase();
                const matchesObj = filterObj === 'TODOS' || objVal === filterObj;

                const espVal = (t.espacio || '').trim().toUpperCase();
                const filterEsp = (f.espacio || 'TODOS').toUpperCase();
                const matchesEsp = filterEsp === 'TODOS' || espVal === filterEsp;

                return matchesSearch && matchesType && matchesCat && matchesObj && matchesEsp;
            }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            const pageSize = 25;
            const totalTasks = filteredTasks.length;
            const totalPages = Math.ceil(totalTasks / pageSize);
            if (window.taskFilters.currentPage > totalPages) window.taskFilters.currentPage = Math.max(1, totalPages);

            const startIdx = (window.taskFilters.currentPage - 1) * pageSize;
            const pageTasks = filteredTasks.slice(startIdx, startIdx + pageSize);

            tableContainer.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/50">
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vista Previa</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Ejercicio</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Etapa</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Duración</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${pageTasks.map(t => `
                                <tr class="hover:bg-blue-50/30 transition-colors group cursor-pointer" onclick="window.viewTask(${t.id})">
                                    <td class="px-8 py-4">
                                        <div class="w-20 h-12 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 shadow-sm transition-transform group-hover:scale-105">
                                            ${t.image ? `<img src="${t.image}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center"><i data-lucide="image" class="w-4 h-4 text-slate-300"></i></div>`}
                                        </div>
                                    </td>
                                    <td class="px-8 py-4">
                                        <div class="flex flex-col">
                                            <span class="text-sm font-black text-slate-800">${t.name}</span>
                                            <span class="text-[10px] text-slate-400 line-clamp-1">${t.description || 'Sin descripción...'}</span>
                                        </div>
                                    </td>
                                    <td class="px-8 py-4">
                                        <span class="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-tight">${t.type || 'FÚTBOL'}</span>
                                    </td>
                                    <td class="px-8 py-4 text-center">
                                        <span class="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest">${t.categoria || '---'}</span>
                                    </td>
                                    <td class="px-8 py-4 text-center">
                                        <span class="text-xs font-bold text-slate-600">${t.duration} min</span>
                                    </td>
                                    <td class="px-8 py-4 text-right">
                                        <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            ${t.video ? `<button onclick="event.stopPropagation(); window.open('${t.video.startsWith('http') ? t.video : `https://drive.google.com/open?id=${t.video}`}', '_blank')" class="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"><i data-lucide="play-circle" class="w-5 h-5"></i></button>` : ''}
                                            <button onclick="event.stopPropagation(); window.viewTask(${t.id})" class="p-2 text-blue-500 hover:bg-blue-100 rounded-xl transition-all"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                                            <button onclick="event.stopPropagation(); window.deleteTask(${t.id})" class="p-2 text-red-400 hover:bg-red-100 rounded-xl transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('') || `
                                <tr>
                                    <td colspan="6" class="px-8 py-20 text-center">
                                        <div class="flex flex-col items-center gap-2">
                                            <i data-lucide="search-x" class="w-12 h-12 text-slate-200 mb-2"></i>
                                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">No se encontraron tareas con estos filtros</p>
                                        </div>
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>

                <!-- Pagination Footer -->
                ${totalPages > 1 ? `
                    <div class="px-8 py-5 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
                        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Mostrando ${startIdx + 1} - ${Math.min(startIdx + pageSize, totalTasks)} de ${totalTasks} ejercicios
                        </div>
                        <div class="flex gap-2">
                            <button onclick="window.changeTaskPage(${window.taskFilters.currentPage - 1})" ${window.taskFilters.currentPage === 1 ? 'disabled' : ''} 
                                class="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-600">
                                <i data-lucide="chevron-left" class="w-4 h-4"></i>
                            </button>
                            <div class="flex items-center px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest bg-white rounded-xl border border-slate-100 shadow-sm">
                                Página ${window.taskFilters.currentPage} / ${totalPages}
                            </div>
                            <button onclick="window.changeTaskPage(${window.taskFilters.currentPage + 1})" ${window.taskFilters.currentPage === totalPages ? 'disabled' : ''} 
                                class="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-600">
                                <i data-lucide="chevron-right" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                ` : ''}
            `;
        }

        window.changeTaskPage = (page) => {
            window.taskFilters.currentPage = page;
            window.renderTareas(container, true);
        };

        if (onlyTable) {
            if (window.lucide) lucide.createIcons();
            return;
        }

        // Listeners para los filtros - Buscamos dentro de 'container' porque aún puede no estar en el document
        const searchInput = container.querySelector('#task-search-input');
        const typeFilter = container.querySelector('#task-type-filter');
        const catFilter = container.querySelector('#task-cat-filter');
        const objFilter = container.querySelector('#task-obj-filter');
        const espFilter = container.querySelector('#task-esp-filter');
        const clearBtn = container.querySelector('#clear-task-filters');

        if (clearBtn) {
            clearBtn.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
                window.taskFilters = { search: '', type: 'TODOS', categoria: 'TODAS', objetivo: 'TODOS', espacio: 'TODOS', currentPage: 1 };
                window.renderView('tareas');
            };
        }

        let searchTimer;
        if (searchInput) {
            searchInput.oninput = (e) => {
                window.taskFilters.search = e.target.value;
                window.taskFilters.currentPage = 1;
                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => {
                    window.renderTareas(container, true);
                }, 300);
            };
        }

        if (typeFilter) {
            typeFilter.oninput = (e) => {
                window.taskFilters.type = e.target.value;
                window.taskFilters.currentPage = 1;
                window.renderTareas(container, true);
            };
        }

        if (catFilter) {
            catFilter.oninput = (e) => {
                window.taskFilters.categoria = e.target.value;
                window.taskFilters.currentPage = 1;
                window.renderTareas(container, true);
            };
        }
        if (objFilter) {
            objFilter.oninput = (e) => {
                window.taskFilters.objetivo = e.target.value;
                window.taskFilters.currentPage = 1;
                window.renderTareas(container, true);
            };
        }
        if (espFilter) {
            espFilter.oninput = (e) => {
                window.taskFilters.espacio = e.target.value;
                window.taskFilters.currentPage = 1;
                window.renderTareas(container, true);
            };
        }

        if (window.lucide) lucide.createIcons();
    }

    let isUpdatingGrid = false;
    async function updateTaskGrid(container) {
        if (isUpdatingGrid) return;
        isUpdatingGrid = true;

        try {
            let tasks = await db.getAll('tareas');
            let filteredTasks = tasks.filter(t => {
                const matchesSearch = !taskFilters.search || t.name.toLowerCase().includes(taskFilters.search.toLowerCase());
                const matchesType = taskFilters.type === 'TODOS' || t.type === taskFilters.type;
                const matchesCat = taskFilters.categoria === 'TODAS' || t.categoria === taskFilters.categoria;
                return matchesSearch && matchesType && matchesCat;
            });

            const grid = container.querySelector('#main-task-grid');
            const loadMoreContainer = document.getElementById('load-more-container');

            if (grid) {
                const start = 0;
                const end = currentTaskPage * tasksPerPage;
                const pageTasks = filteredTasks.slice(start, end);
                const hasMore = end < filteredTasks.length;

                const html = pageTasks.map(t => `
                    <div onclick="window.viewTask(${t.id})" class="task-card flex flex-col h-full cursor-pointer group fade-in">
                        <div class="h-44 bg-slate-100 overflow-hidden flex items-center justify-center border-b border-slate-100 relative">
                            ${t.image ? `<img src="${t.image}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">` : `<i data-lucide="image" class="text-slate-300 w-12 h-12"></i>`}
                            <div class="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors flex items-center justify-center">
                                <i data-lucide="edit-2" class="text-white w-8 h-8 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all"></i>
                            </div>
                        </div>
                        <div class="p-5 flex-1 flex flex-col">
                            <div class="flex items-center gap-2 mb-2 flex-wrap">
                                <span class="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-tighter">${t.type || 'FÚTBOL'}</span>
                                <span class="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase tracking-tighter">${t.categoria || 'ETAPA'}</span>
                                <span class="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded tracking-tighter">${t.duration} min</span>
                                ${t.video ? `<span class="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded uppercase tracking-tighter flex items-center gap-1"><i data-lucide="video" class="w-2.5 h-2.5"></i> VIDEO</span>` : ''}
                            </div>
                            <h4 class="font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">${t.name}</h4>
                            <p class="text-xs text-slate-500 line-clamp-2 flex-1">${t.description || ''}</p>
                            <div class="mt-4 pt-4 border-t border-slate-50 flex justify-end gap-2">
                                ${t.video ? `
                                    <button onclick="event.stopPropagation(); window.open('${t.video.startsWith('http') ? t.video : `https://drive.google.com/open?id=${t.video}`}', '_blank')" class="p-2 text-blue-500 hover:text-blue-700 transition-all" title="Ver Video">
                                        <i data-lucide="play-circle" class="w-4 h-4"></i>
                                    </button>
                                ` : ''}
                                <button onclick="event.stopPropagation(); window.deleteTask(${t.id})" class="p-2 text-red-400 hover:text-red-600 transition-all">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');

                grid.innerHTML = html;
                if (window.lucide) lucide.createIcons();

                if (loadMoreContainer) {
                    if (hasMore) {
                        loadMoreContainer.classList.remove('hidden');
                        const btn = document.getElementById('load-more-tasks-btn');
                        btn.onclick = () => {
                            currentTaskPage++;
                            updateTaskGrid(container);
                        };
                    } else {
                        loadMoreContainer.classList.add('hidden');
                    }
                }
            }
            isUpdatingGrid = false;
        } catch (err) {
            console.error("Grid update fail:", err);
            isUpdatingGrid = false;
        }
    }

    window.getTaskVideoEmbed = (video) => {
        if (!video) return '';
        let embedUrl = '';

        if (video.includes('youtube.com/watch?v=')) {
            const id = video.split('v=')[1].split('&')[0];
            embedUrl = `https://www.youtube.com/embed/${id}`;
        } else if (video.includes('youtu.be/')) {
            const id = video.split('youtu.be/')[1].split('?')[0];
            embedUrl = `https://www.youtube.com/embed/${id}`;
        } else if (video.includes('drive.google.com')) {
            const match = video.match(/\/file\/d\/([^\/]+)/) || video.match(/id=([^\&]+)/);
            if (match) embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
            else embedUrl = video;
        } else if (!video.startsWith('http')) {
            embedUrl = `https://www.youtube.com/embed/${video}`;
        } else {
            embedUrl = video;
        }

        return `<div class="video-container mb-6 overflow-hidden border-4 border-slate-900 shadow-2xl">
                    <iframe src="${embedUrl}" allow="autoplay; fullscreen" allowfullscreen class="w-full aspect-video"></iframe>
                </div>`;
    };

    window.previewTask = async (id) => {
        if (!id) return;
        const tasks = await db.getAll('tareas');
        const task = tasks.find(t => t.id == id);
        if (!task) return;

        const previewOverlay = document.getElementById('preview-overlay');
        const previewContent = document.getElementById('preview-content');

        const videoEmbed = window.getTaskVideoEmbed(task.video);

        previewContent.innerHTML = `
            <div class="p-8 md:p-12">
                <div class="mb-10">
                    <span class="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 inline-block">${task.type}</span>
                    <h3 class="text-4xl font-black text-slate-800 uppercase tracking-tight leading-tight">${task.name}</h3>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div class="space-y-8">
                        ${task.image ? `
                            <div class="rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-slate-50 relative group">
                                <img src="${task.image}" class="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110">
                                <div class="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                        ` : `
                            <div class="aspect-square bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
                                <i data-lucide="image" class="w-16 h-16 mb-4"></i>
                                <p class="font-black uppercase tracking-widest text-xs">Sin Gráfico disponible</p>
                            </div>
                        `}

                        ${task.video ? `
                            <div class="space-y-4">
                                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <i data-lucide="play-circle" class="w-4 h-4 text-blue-600"></i>
                                    Video Demostrativo
                                </h4>
                                ${videoEmbed}
                            </div>
                        ` : ''}
                    </div>

                    <div class="space-y-10">
                        <div class="grid grid-cols-2 gap-6">
                            <div class="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <p class="text-[10px] font-black text-slate-400 uppercase mb-2">Objetivo</p>
                                <p class="text-sm font-bold text-slate-700 font-outfit uppercase">${task.objetivo || 'No definido'}</p>
                            </div>
                            <div class="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <p class="text-[10px] font-black text-slate-400 uppercase mb-2">Duración</p>
                                <p class="text-sm font-bold text-slate-700 font-outfit uppercase">${task.duration} MINUTOS</p>
                            </div>
                            <div class="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <p class="text-[10px] font-black text-slate-400 uppercase mb-2">Espacio</p>
                                <p class="text-sm font-bold text-slate-700 font-outfit uppercase">${task.espacio || 'No definido'}</p>
                            </div>
                            <div class="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <p class="text-[10px] font-black text-slate-400 uppercase mb-2">Categoría</p>
                                <p class="text-sm font-bold text-slate-700 font-outfit uppercase">${task.categoria || 'No definido'}</p>
                            </div>
                        </div>

                        ${task.material ? `
                            <div>
                                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Material Necesario</h4>
                                <div class="flex flex-wrap gap-2">
                                    ${task.material.split(', ').map(m => `
                                        <span class="px-4 py-2 bg-blue-50 text-blue-600 text-[10px] font-black rounded-xl uppercase tracking-tight">${m}</span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <div>
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Descripción de la Tarea</h4>
                            <div class="prose prose-slate max-w-none">
                                <p class="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-line">${task.description}</p>
                            </div>
                        </div>

                        ${task.variantes ? `
                            <div class="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                                <h4 class="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">Variantes Sugeridas</h4>
                                <p class="text-xs text-emerald-900/70 leading-relaxed italic font-medium">${task.variantes}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        previewOverlay.classList.remove('hidden');
        setTimeout(() => {
            previewOverlay.classList.add('opacity-100');
            previewOverlay.querySelector('#preview-container').classList.remove('scale-95');
            previewOverlay.querySelector('#preview-container').classList.add('scale-100');
        }, 10);

        if (window.lucide) lucide.createIcons();
    };

    window.closePreview = () => {
        const previewOverlay = document.getElementById('preview-overlay');
        previewOverlay.classList.remove('opacity-100');
        previewOverlay.querySelector('#preview-container').classList.remove('scale-100');
        previewOverlay.querySelector('#preview-container').classList.add('scale-95');
        setTimeout(() => {
            previewOverlay.classList.add('hidden');
        }, 300);
    };

    window.viewTask = async (id) => {
        const tasks = await db.getAll('tareas');
        const task = tasks.find(t => t.id == id);

        const videoEmbed = window.getTaskVideoEmbed(task.video);

        modalContainer.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Ficha de Tarea</h3>
                    <button onclick="closeModal()" class="p-2 bg-slate-100 rounded-full text-slate-400 group hover:bg-red-50 hover:text-red-500 transition-all"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>

                <div id="video-preview-container">
                    ${videoEmbed}
                </div>

                <form id="edit-task-form" class="space-y-4">
                    <input type="hidden" name="id" value="${task.id}">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nombre de la Tarea</label>
                            <input name="name" value="${task.name}" class="w-full p-3 border rounded-xl outline-none focus:ring-2 ring-blue-100" required>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Tipo</label>
                                <select name="type" class="w-full p-3 border rounded-xl bg-white outline-none">
                                    ${TASK_TYPES.map(t => `<option ${task.type === t ? 'selected' : ''}>${t}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Categoría</label>
                                <select name="categoria" class="w-full p-3 border rounded-xl bg-white outline-none">
                                    ${TASK_CATEGORIES.map(c => `<option ${task.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Objetivo</label>
                                <select name="objetivo" class="w-full p-3 border rounded-xl bg-white outline-none">
                                    <option value="">Seleccionar...</option>
                                    ${TASK_OBJECTIVES.map(obj => `<option ${task.objetivo === obj ? 'selected' : ''}>${obj}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Espacio</label>
                                <select name="espacio" class="w-full p-3 border rounded-xl bg-white outline-none">
                                    <option value="">Seleccionar...</option>
                                    ${TASK_SPACES.map(s => `<option ${task.espacio === s ? 'selected' : ''}>${s}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Tiempo (min)</label>
                                <input name="duration" type="number" value="${task.duration}" class="w-full p-3 border rounded-xl outline-none" required>
                            </div>
                        <div class="col-span-2">
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Material Necesario</label>
                            <div class="grid grid-cols-2 md:grid-cols-3 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                ${TASK_MATERIALS.map(m => `
                                    <label class="flex items-center gap-2 cursor-pointer p-1">
                                        <input type="checkbox" name="material" value="${m}" ${task.material && task.material.split(', ').includes(m) ? 'checked' : ''} class="rounded border-slate-300 text-blue-600 focus:ring-blue-100">
                                        <span class="text-[10px] font-bold text-slate-600 uppercase">${m}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        </div>
                        <div>
                             <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Descripción Técnica</label>
                             <textarea name="description" class="w-full p-3 border rounded-xl h-24 outline-none focus:ring-2 ring-blue-100">${task.description}</textarea>
                        </div>
                        <div>
                             <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Variantes (Opcional)</label>
                             <textarea name="variantes" class="w-full p-3 border rounded-xl h-24 outline-none focus:ring-2 ring-blue-100">${task.variantes || ''}</textarea>
                        </div>
                        <div>
                             <label class="block text-xs font-bold text-slate-400 uppercase mb-2">ID / Enlace Video (Drive/Youtube)</label>
                             <input name="video" value="${task.video || ''}" class="w-full p-3 border rounded-xl outline-none focus:ring-2 ring-blue-100" placeholder="ID o enlace al video">
                        </div>
                        <div class="col-span-2 text-center p-6 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50 group hover:border-blue-200 transition-all cursor-pointer relative overflow-hidden">
                             <input type="file" id="edit-task-image-input" accept="image/*" class="hidden">
                             <label for="edit-task-image-input" class="cursor-pointer block">
                                 <div id="edit-image-preview" class="flex flex-col items-center">
                                     ${task.image ? `<img src="${task.image}" class="h-24 rounded-xl shadow-sm border border-slate-200 mb-2">` : '<i data-lucide="upload-cloud" class="w-8 h-8 text-slate-300 mb-2"></i>'}
                                     <p class="text-xs font-bold text-slate-500">Cambiar Imagen</p>
                                 </div>
                             </label>
                        </div>
                    </div>
                    <div class="flex gap-4 mt-6">
                        <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
                        <button type="submit" class="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        `;

        lucide.createIcons(); modalOverlay.classList.add('active');


        // Handle input change for preview
        const input = document.getElementById('edit-task-image-input');
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    document.getElementById('edit-image-preview').innerHTML = `<img src="${re.target.result}" class="h-24 rounded-xl shadow-sm mb-2"><p class="text-xs font-bold text-blue-500">Imagen Seleccionada</p>`;
                };
                reader.readAsDataURL(file);
            }
        });

        // Real-time video preview
        const videoInput = modalContainer.querySelector('input[name="video"]');
        if (videoInput) {
            videoInput.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                const container = document.getElementById('video-preview-container');
                container.innerHTML = window.getTaskVideoEmbed(val);
            });
        }

        document.getElementById('edit-task-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.id = parseInt(data.id);
            if (data.name) data.name = data.name.toUpperCase().trim();
            data.material = formData.getAll('material').join(', ');


            const imgInput = document.getElementById('edit-task-image-input');
            if (imgInput && imgInput.files[0]) {
                data.image = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = (re) => resolve(re.target.result);
                    reader.readAsDataURL(imgInput.files[0]);
                });
            } else {
                data.image = task.image; // Keep existing
            }

            await db.update('tareas', data);
            closeModal();
            window.switchView('tareas');
        });
    };

    window.clearAllTasks = async () => {
        window.customConfirm(
            '¡Atención: Borrado Total!',
            '¿Estás seguro de que quieres borrar TODA tu biblioteca de tareas? Esta acción no se puede deshacer.',
            async () => {
                await db.deleteAll('tareas');
                window.customAlert('Biblioteca Limpia', 'Se han borrado todas las tareas correctamente.', 'success');
                window.switchView('tareas');
            }
        );
    };

    window.linkTaskImages = async (input) => {
        const files = Array.from(input.files);
        if (files.length === 0) return;

        const tasks = await db.getAll('tareas');

        window.customConfirm(
            'Vincular Imágenes',
            `¿Deseas intentar vincular ${files.length} imágenes con las tareas por coincidencia de nombre?`,
            async () => {
                let linkedCount = 0;

                // Mostrar un pequeño indicador de que estamos trabajando
                const loading = document.createElement('div');
                loading.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center';
                loading.innerHTML = '<div class="bg-white p-8 rounded-3xl flex flex-col items-center gap-4"><div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div><p class="font-bold text-xs uppercase tracking-widest">Procesando imágenes...</p></div>';
                document.body.appendChild(loading);

                try {
                    const normalize = (str) => {
                        if (!str) return "";
                        return str.toString()
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
                            .replace(/[^a-zA-Z0-9]/g, "")    // Quitar TODO lo que no sea letra o número (espacios, guiones, puntos...)
                            .trim()
                            .toUpperCase();
                    };

                    for (const file of files) {
                        const originalName = file.name.split('.').slice(0, -1).join('.');
                        const fileName = normalize(originalName);

                        const match = tasks.find(t => normalize(t.name) === fileName);

                        if (match) {
                            console.log(`Vinculando: ${originalName} -> ${match.name}`);
                            const publicUrl = await db.uploadImage(file);

                            if (publicUrl) {
                                match.image = publicUrl;
                                await db.update('tareas', match);
                                linkedCount++;
                            }
                        } else {
                            console.warn(`No se encontró tarea para: ${originalName} (Buscado como: ${fileName})`);
                        }
                    }
                    loading.remove();
                    window.customAlert('Proceso Finalizado', `Se han vinculado ${linkedCount} imágenes automáticamente.`, 'success');
                    window.switchView('tareas');
                } catch (err) {
                    loading.remove();
                    console.error(err);
                    window.customAlert('Error', 'Hubo un problema vinculando las imágenes.', 'error');
                }
            }
        );
        input.value = '';
    };

    window.deleteTask = async (id) => {
        window.customConfirm(
            '¿Eliminar Tarea?',
            'Esta acción borrará permanentemente el ejercicio de tu biblioteca técnica.',
            async () => {
                await db.delete('tareas', Number(id));
                closeModal();
                window.switchView('tareas');
            }
        );
    };

    let sessionFilters = { team: 'TODOS', coach: 'TODOS', search: '', lugar: 'TODOS', comunidad: 'TODOS' };

    window.filterSessions = (type, value) => {
        sessionFilters[type] = value;
        const container = document.getElementById('content-container');
        if (type === 'search') {
            // Si es búsqueda, actualizamos solo la tabla para no perder el foco
            window.renderSesiones(container, true);
        } else {
            window.renderSesiones(container, false);
        }
    };

    window.renderSesiones = async function (container, onlyTable = false) {
        const allSessions = await db.getAll('sesiones');
        // Si hay un técnico seleccionado, pedimos a applyGlobalFilters que no filtre por visibilidad personal
        const sessions = window.applyGlobalFilters(allSessions, 'fecha', { skipVisibility: sessionFilters.coach !== 'TODOS' });
        const teams = window.getSortedTeams(await db.getAll('equipos'));
        const teamsMap = Object.fromEntries(teams.map(t => [t.id, t.nombre]));
        const sortedTeams = window.getSortedTeams(teams);

        const userRes = await supabaseClient.auth.getUser();
        const currentUser = userRes.data?.user;

        const { data: profiles } = await supabaseClient.from('profiles').select('*');

        const isGlobal = window.currentVisibilityMode === 'global';
        // En "Mi Espacio" (TODOS + Personal), solo mostramos las creadas por el usuario actual o compartidas con él
        const mySessions = (isGlobal || sessionFilters.coach !== 'TODOS') ? sessions : sessions.filter(s => {
            if (!currentUser) return false;
            if (s.createdBy === currentUser.id) return true;
            const { extra } = window.parseLugarMetadata(s.lugar);
            return extra.sw && Array.isArray(extra.sw) && extra.sw.includes(currentUser.id);
        });

        const uniqueLugares = [...new Set(mySessions.map(s => window.cleanLugar(s.lugar)).filter(Boolean))].sort();

        const filteredSessions = mySessions.filter(s => {
            let sessionTeamIds = [String(s.equipoid)];
            const { extra: ex } = window.parseLugarMetadata(s.lugar);
            if (ex.eids) sessionTeamIds = [...new Set([...sessionTeamIds, ...ex.eids.map(String)])];

            const matchesTeam = sessionFilters.team === 'TODOS' || sessionTeamIds.includes(String(sessionFilters.team));
            const matchesCoach = sessionFilters.coach === 'TODOS' || 
                                (s.createdBy == sessionFilters.coach) || 
                                (ex.sw && Array.isArray(ex.sw) && ex.sw.includes(sessionFilters.coach));

            const sessionLugar = window.cleanLugar(s.lugar) || 'SIN ASIGNAR';
            const matchesLugar = sessionFilters.lugar === 'TODOS' || sessionLugar.toUpperCase() === sessionFilters.lugar.toUpperCase();

            const sessionComunidad = window.getComunidadByLugar(s.lugar, s.titulo);
            const matchesComunidad = sessionFilters.comunidad === 'TODOS' || sessionComunidad === sessionFilters.comunidad;

            const searchTerm = (sessionFilters.search || '').toLowerCase();
            const teamName = (teamsMap[s.equipoid] || '').toLowerCase();
            const matchesSearch = !searchTerm ||
                (s.titulo || '').toLowerCase().includes(searchTerm) ||
                teamName.includes(searchTerm) ||
                (s.lugar || '').toLowerCase().includes(searchTerm);

            return matchesTeam && matchesCoach && matchesLugar && matchesSearch && matchesComunidad;
        }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha) || (b.hora || '').localeCompare(a.hora || ''));

        const coaches = profiles ? profiles.filter(p => p.role === 'TECNICO' || p.role === 'ELITE' || p.role === 'ADMIN') : [];

        if (!onlyTable) {
            container.innerHTML = `
                <div class="flex flex-col gap-6">
                    <!-- Search Bar -->
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div class="relative flex-1 w-full max-w-md">
                            <i data-lucide="search" class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <input type="text" id="session-search-input" value="${sessionFilters.search}" placeholder="Buscar sesión por título, equipo o lugar..." 
                                class="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm focus:ring-4 ring-blue-50 outline-none transition-all shadow-sm"
                                oninput="window.filterSessions('search', this.value)">
                        </div>

                        <div class="flex flex-col lg:flex-row gap-4">
                            <!-- Comunidad Tabs -->
                            <div class="flex items-center p-1 bg-slate-100 rounded-2xl shadow-inner w-fit">
                                <button onclick="window.filterSessions('comunidad', 'TODOS')" class="px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${sessionFilters.comunidad === 'TODOS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}">Todas</button>
                                <button onclick="window.filterSessions('comunidad', 'NAVARRA')" class="px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${sessionFilters.comunidad === 'NAVARRA' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}">Navarra</button>
                                <button onclick="window.filterSessions('comunidad', 'LA RIOJA')" class="px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${sessionFilters.comunidad === 'LA RIOJA' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}">La Rioja</button>
                            </div>

                            <!-- Coach Tabs -->
                            <div class="flex items-center p-1 bg-slate-100 rounded-2xl shadow-inner w-fit max-w-[500px] overflow-x-auto no-scrollbar">
                                <button onclick="window.filterSessions('coach', 'TODOS')" class="px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${sessionFilters.coach === 'TODOS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'} whitespace-nowrap">Todos los Técnicos</button>
                                ${coaches.map(c => `
                                    <button onclick="window.filterSessions('coach', '${c.id}')" class="px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${sessionFilters.coach == c.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'} whitespace-nowrap">
                                        ${(c.name || c.nombre || 'Técnico').toUpperCase()}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Filters Toolbar -->
                    <div class="bg-white p-3 rounded-[2rem] border border-slate-100 shadow-sm">
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:flex items-center gap-3">
                                <!-- Team Filter -->
                                <div class="relative flex-1 lg:min-w-[220px]">
                                    <select onchange="window.filterSessions('team', this.value)" class="w-full p-3.5 bg-blue-50 border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:bg-white focus:border-blue-200 transition-all appearance-none cursor-pointer text-blue-600">
                                        <option value="TODOS" ${sessionFilters.team === 'TODOS' ? 'selected' : ''}>TODAS LAS PLANTILLAS</option>
                                        ${sortedTeams.map(t => `<option value="${t.id}" ${sessionFilters.team == t.id ? 'selected' : ''}>${t.nombre.split(' ||| ')[0]}</option>`).join('')}
                                    </select>
                                    <i data-lucide="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none"></i>
                                </div>

                                <!-- Place Filter -->
                                <div class="relative flex-1 lg:min-w-[200px]">
                                    <select onchange="window.filterSessions('lugar', this.value)" class="w-full p-3.5 bg-slate-50 border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:bg-white focus:border-blue-100 transition-all appearance-none cursor-pointer text-slate-500">
                                        <option value="TODOS" ${sessionFilters.lugar === 'TODOS' ? 'selected' : ''}>TODOS LOS LUGARES</option>
                                        ${uniqueLugares.map(l => `<option value="${l}" ${sessionFilters.lugar === l ? 'selected' : ''}>${l.toUpperCase()}</option>`).join('')}
                                    </select>
                                    <i data-lucide="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"></i>
                                </div>
                            </div>
                    </div>

                    <div id="sessions-list-container">
                        <!-- Dynamic content -->
                    </div>
                </div>
            `;
        }

        const listContainer = onlyTable ? document.getElementById('sessions-list-container') : container.querySelector('#sessions-list-container');
        if (listContainer) {
            listContainer.innerHTML = `
                <!-- Desktop View -->
                <div class="hidden md:block bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div class="table-container">
                        <table class="w-full">
                        <thead>
                            <tr class="bg-slate-50/50 text-left border-b border-slate-100">
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Objetivo de Sesión</th>
                                <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha / Hora</th>
                                <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipo / Técnico</th>
                                <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lugar</th>
                                <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tareas</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredSessions.map(s => {
                const d = new Date(s.fecha);
                const day = d.getDate();
                const month = d.toLocaleString('es', { month: 'short' }).toUpperCase();
                const coach = profiles ? profiles.find(p => p.id === s.createdBy) : null;
                return `
                                    <tr onclick="window.viewSessionFicha('${s.id}')" class="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-all cursor-pointer group">
                                        <td class="px-8 py-5">
                                            <div class="flex items-center gap-2">
                                                <p class="text-sm font-black text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors uppercase tracking-tight ${s.completada ? 'line-through opacity-50' : ''}">${s.titulo || 'Sesión programada'}</p>
                                                <span class="text-[7px] font-black px-1.5 py-0.5 rounded ${window.getComunidadByLugar(s.lugar, s.titulo) === 'NAVARRA' ? 'bg-red-100 text-red-600' : (window.getComunidadByLugar(s.lugar, s.titulo) === 'LA RIOJA' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400')} uppercase whitespace-nowrap">${window.getComunidadByLugar(s.lugar, s.titulo)}</span>
                                            </div>
                                        </td>
                                        <td class="px-6 py-5">
                                            <div class="flex items-center gap-4">
                                                <div class="w-11 h-11 bg-slate-900 text-white rounded-xl flex flex-col items-center justify-center shadow-md">
                                                    <span class="text-[8px] font-black leading-none">${month}</span>
                                                    <span class="text-base font-black leading-none mt-0.5">${day}</span>
                                                </div>
                                                <div>
                                                    <p class="text-[11px] font-black text-slate-800 uppercase tracking-tight">${s.hora || '--:--'}</p>
                                                    <p class="text-[9px] font-bold text-slate-400 italic">Planificada ${s.completada ? '✅' : ''}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="px-6 py-5">
                                            <div class="flex flex-col gap-1.5">
                                                <div class="flex flex-wrap gap-1">
                                                    ${(() => {
                        const { extra } = window.parseLugarMetadata(s.lugar);
                        let teamIds = [s.equipoid];
                        if (extra.eids) teamIds = [...new Set([...teamIds.map(String), ...extra.eids.map(String)])];
                        return teamIds.filter(id => id && teamsMap[id]).map(id => `
                                                            <span class="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-tight border border-blue-100/50">${teamsMap[id].split(' ||| ')[0]}</span>
                                                        `).join('');
                    })()}
                                                </div>
                                                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">${coach ? (coach.name || coach.nombre) : 'Sistema'}</span>
                                            </div>
                                        </td>
                                        <td class="px-6 py-5">
                                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${window.cleanLugar(s.lugar) || 'Campo No Asignado'}</span>
                                        </td>
                                        <td class="px-6 py-5 text-center">
                                            <div class="flex flex-col items-center">
                                                <span class="text-sm font-black text-slate-800">${(s.taskids || []).length}</span>
                                                <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Ejercicios</span>
                                            </div>
                                        </td>
                                        <td class="px-8 py-5 text-right">
                                            <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onclick="event.stopPropagation(); window.viewSession('${s.id}')" class="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-blue-500 hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Editar Sesión">
                                                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                                                </button>
                                                <button onclick="event.stopPropagation(); window.duplicateSession('${s.id}')" class="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-amber-600 hover:border-amber-200 transition-all shadow-sm" title="Duplicar Sesión">
                                                    <i data-lucide="copy" class="w-4 h-4"></i>
                                                </button>
                                                <button onclick="event.stopPropagation(); window.printSession('${s.id}')" class="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
                                                    <i data-lucide="printer" class="w-4 h-4"></i>
                                                </button>
                                                <button onclick="event.stopPropagation(); window.deleteSession('${s.id}')" class="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-red-300 hover:text-red-500 hover:border-red-200 transition-all shadow-sm">
                                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
            }).join('') || '<tr><td colspan="5" class="py-24 text-center text-slate-400 uppercase text-[10px] font-black tracking-widest">Sin sesiones que coincidan</td></tr>'}
                        </tbody>
                    </table>
                    </div>
                </div>

                <!-- Mobile View -->
                <div class="md:hidden space-y-4">
                    ${filteredSessions.map(s => `
                        <div onclick="window.viewSessionFicha(${s.id})" class="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                            <div class="flex justify-between items-start mb-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 bg-slate-900 text-white rounded-xl flex flex-col items-center justify-center">
                                        <span class="text-[7px] font-black">${new Date(s.fecha).toLocaleString('es', { month: 'short' }).toUpperCase()}</span>
                                        <span class="text-sm font-black">${new Date(s.fecha).getDate()}</span>
                                    </div>
                                    <div>
                                        <div class="flex flex-wrap gap-1 mb-1">
                                            ${(() => {
                    const { extra } = window.parseLugarMetadata(s.lugar);
                    let teamIds = [s.equipoid];
                    if (extra.eids) teamIds = [...new Set([...teamIds.map(String), ...extra.eids.map(String)])];
                    return teamIds.filter(id => id && teamsMap[id]).map(id => `
                                                    <span class="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[8px] font-black uppercase tracking-widest">${teamsMap[id].split(' ||| ')[0]}</span>
                                                `).join('');
                })()}
                                        </div>
                                        <p class="text-xs font-black text-slate-800 mt-0.5">${s.hora || '--:--'}</p>
                                    </div>
                                </div>
                                <div class="flex gap-2">
                                    <button onclick="event.stopPropagation(); window.duplicateSession(${s.id})" class="w-8 h-8 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center"><i data-lucide="copy" class="w-4 h-4"></i></button>
                                    <button onclick="event.stopPropagation(); window.printSession(${s.id})" class="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center"><i data-lucide="printer" class="w-4 h-4"></i></button>
                                    <button onclick="event.stopPropagation(); window.deleteSession(${s.id})" class="w-8 h-8 bg-red-50 text-red-300 rounded-lg flex items-center justify-center"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                                </div>
                            </div>
                            <h4 class="text-base font-black text-slate-800 uppercase tracking-tight mb-3 ${s.completada ? 'line-through opacity-50' : ''}">${s.titulo || 'Sin título'}</h4>
                            <div class="flex items-center justify-between pt-4 border-t border-slate-50">
                                <div class="flex items-center gap-2">
                                    <i data-lucide="layers" class="w-3.5 h-3.5 text-blue-500"></i>
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${(s.taskids || []).length} Ejercicios</span>
                                </div>
                            </div>
                        </div>
                    `).join('') || '<div class="py-12 text-center text-slate-400 uppercase text-[10px] font-black tracking-widest">Sin resultados</div>'}
                </div>
            `;
        }

        if (window.lucide) lucide.createIcons();
    }

    window.renderSessionModal = async (sessionData = null) => {
        const teams = window.getSortedTeams(await db.getAll('equipos'));
        const tasks = await db.getAll('tareas');
        const players = await db.getAll('jugadores');
        const { data: users } = await supabaseClient.from('profiles').select('*');
        const { data: convs } = await supabaseClient.from('convocatorias').select('*').order('fecha', { ascending: false }).order('hora', { ascending: false });
        const currentUser = (await supabaseClient.auth.getUser()).data.user;

        const isEdit = sessionData !== null && sessionData.id !== undefined && sessionData.id !== null;
        const session = {
            id: null,
            titulo: '',
            equipoid: '',
            fecha: new Date().toISOString().split('T')[0],
            hora: '19:00',
            ciclo: 1,
            numSesion: 1,
            taskids: [],
            playerids: [],
            sharedWith: [],
            createdBy: currentUser.id,
            ...sessionData
        };

        const coaches = users ? users.filter(p => p.role === 'TECNICO' || p.role === 'ELITE' || p.role === 'ADMIN') : [];
        const sessionCreator = coaches.find(u => u.id === session.createdBy);

        modalContainer.innerHTML = `
            <div class="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-slate-800">${isEdit ? 'Editar Planificación' : 'Nueva Planificación'}</h3>
                        ${isEdit ? `<p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Creado por: <span class="text-blue-600">${sessionCreator ? (sessionCreator.name || sessionCreator.nombre) : 'Sistema'}</span></p>` : ''}
                    </div>
                    <button onclick="closeModal()" class="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-all"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>
                
                <form id="session-modal-form" class="space-y-6">
                    ${isEdit ? `<input type="hidden" name="id" value="${session.id}">` : ''}
                    <div class="grid grid-cols-2 gap-6">
                        <div class="col-span-2">
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nombre de la Sesión</label>
                            <input name="titulo" value="${session.titulo || ''}" placeholder="Ej: S1 Arnedo 2010 (S=Sesión, 1=Num, Arnedo=Lugar, 2010=Equipo)" class="w-full p-3 border rounded-xl outline-none focus:ring-2 ring-blue-100" required>
                        </div>
                        <div class="col-span-2">
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2 px-1">Equipos Participantes</label>
                            <div id="session-teams-container" class="grid grid-cols-2 md:grid-cols-4 gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 max-h-32 overflow-y-auto custom-scrollbar">
                                ${teams.map(t => {
            const { extra } = window.parseLugarMetadata(session.lugar);
            let isSelected = session.equipoid == t.id;
            if (extra.eids && extra.eids.includes(t.id.toString())) isSelected = true;
            return `
                                        <label class="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 transition-all select-none">
                                            <input type="checkbox" name="equipoids" value="${t.id}" ${isSelected ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 session-team-check">
                                            <span class="text-[10px] font-bold text-slate-700 truncate">${t.nombre.split(' ||| ')[0]}</span>
                                        </label>
                                    `;
        }).join('')}
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Fecha</label>
                                <input name="fecha" type="date" value="${session.fecha}" class="w-full p-3 border rounded-xl" required>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Hora</label>
                                <input name="hora" type="time" value="${session.hora}" class="w-full p-3 border rounded-xl" required>
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Ciclo</label>
                            <select name="ciclo" class="w-full p-3 border rounded-xl bg-white focus:ring-2 ring-blue-100 outline-none">
                                <option value="" ${!session.ciclo ? 'selected' : ''}>Ninguno</option>
                                ${[1, 2, 3, 4, 5, 6].map(num => `<option value="${num}" ${session.ciclo == num ? 'selected' : ''}>Ciclo ${num}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nº Sesión</label>
                            <select name="numSesion" class="w-full p-3 border rounded-xl bg-white focus:ring-2 ring-blue-100 outline-none">
                                ${Array.from({ length: 25 }, (_, i) => i + 1).map(num => `<option value="${num}" ${session.numSesion == num ? 'selected' : ''}>Sesión ${num}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-span-2">
                             <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Lugar / Campo</label>
                             <input name="lugar" value="${window.cleanLugar(session.lugar) || ''}" placeholder="Ej: Campo 1, Zubieta..." class="w-full p-3 border rounded-xl outline-none focus:ring-2 ring-blue-100">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2 px-1">Técnico Responsable</label>
                            <select name="createdBy" class="w-full p-3 border rounded-xl bg-white focus:ring-2 ring-blue-100 outline-none text-xs font-bold uppercase shadow-sm">
                                ${coaches.map(c => `<option value="${c.id}" ${session.createdBy == c.id ? 'selected' : ''}>${(c.name || c.nombre || 'Técnico').toUpperCase()}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2 px-1">Técnicos Acompañantes</label>
                            <div class="p-2 bg-slate-50 border rounded-xl max-h-[120px] overflow-y-auto custom-scrollbar space-y-1">
                                ${coaches.map(u => `
                                    <label class="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-100 cursor-pointer hover:border-blue-200 transition-all select-none">
                                        <input type="checkbox" name="sharedWith" value="${u.id}" ${session.sharedWith && session.sharedWith.includes(u.id) ? 'checked' : ''} class="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-100">
                                        <span class="text-[9px] font-bold text-slate-600 uppercase truncate">${(u.name || u.nombre || 'Sin nombre').split(' ')[0]}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div class="space-y-6">
                        <label class="block text-xs font-black text-slate-400 uppercase tracking-widest">Estructura de la Sesión (Orden Cronológico)</label>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            ${[1, 2, 3, 4, 5, 6].map(num => `
                                <div class="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex flex-col gap-3">
                                    <div class="flex justify-between items-center">
                                        <span class="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-widest">Tarea ${num}</span>
                                        <button type="button" onclick="window.clearSessionSlot(${num})" class="text-[9px] font-bold text-slate-400 hover:text-red-500 uppercase transition-colors">Limpiar</button>
                                    </div>
                                    <div class="relative flex flex-col gap-2">
                                        <div class="flex gap-2">
                                            <select id="slot-type-${num}" class="flex-1 p-2 text-[10px] border-none bg-white rounded-xl shadow-sm outline-none">
                                                <option value="TODOS">TODOS LOS TIPOS</option>
                                                ${TASK_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
                                            </select>
                                            <button type="button" onclick="window.previewTask(document.getElementById('task-select-${num}').value)" class="p-2 bg-white text-blue-600 rounded-xl shadow-sm hover:bg-blue-50 transition-all border border-blue-50" title="Previsualizar Tarea">
                                                <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                                            </button>
                                        </div>
                                        <select name="task-select-${num}" id="task-select-${num}" class="w-full p-3 text-xs font-bold border-none bg-white rounded-xl shadow-sm outline-none appearance-none cursor-pointer">
                                            <option value="">Seleccionar ejercicio...</option>
                                            ${tasks.map(t => `<option value="${t.id}" data-type="${t.type}" ${session.taskids && session.taskids[num - 1] == t.id.toString() ? 'selected' : ''}>${t.name}</option>`).join('')}
                                        </select>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div>
                        <div class="flex justify-between items-center mb-4">
                            <label class="block text-xs font-bold text-slate-400 uppercase">Convocatoria de Jugadores</label>
                            <div class="flex items-center gap-2">
                            <div class="flex flex-col items-end gap-2">
                                <div class="relative w-full md:w-64">
                                    <i data-lucide="search" class="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300"></i>
                                    <input type="text" id="session-modal-conv-search" placeholder="Filtrar convocatoria..." class="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-bold outline-none focus:ring-2 ring-blue-50">
                                </div>
                                <select id="session-modal-conv-select" class="p-2 bg-slate-100 border-none rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 ring-blue-100 w-full min-w-[200px]">
                                    <option value="">-- MODO MANUAL --</option>
                                    <!-- Options injected via updateConvsByTeam -->
                                </select>
                                <div id="session-modal-conv-count" class="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-widest hidden">
                                    0 Jugadores
                                </div>
                            </div>
                            </div>
                        </div>
                        <div class="relative mb-2">
                            <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300"></i>
                            <input type="text" id="session-modal-player-search" placeholder="Buscar jugador..." class="w-full pl-10 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 ring-blue-50">
                        </div>
                        <div id="session-modal-players-list" class="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-100">
                            <p class="col-span-full p-4 text-center text-xs text-slate-400 italic">Selecciona un equipo para cargar jugadores</p>
                        </div>
                    </div>


                    <div class="flex gap-4 mt-8">
                        <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
                        <button type="submit" class="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all uppercase tracking-widest">${isEdit ? 'Guardar Cambios' : 'Crear Sesión'}</button>
                    </div>
                </form>
            </div>
        `;

        const playersList = document.getElementById('session-modal-players-list');
        const convSelect = document.getElementById('session-modal-conv-select');
        const convSearch = document.getElementById('session-modal-conv-search');
        const sessionPlayerSearch = document.getElementById('session-modal-player-search');
        const teamChecks = document.querySelectorAll('.session-team-check');

        // Filtros slots
        [1, 2, 3, 4, 5, 6].forEach(num => {
            const typeSel = document.getElementById(`slot-type-${num}`);
            const taskSel = document.getElementById(`task-select-${num}`);
            typeSel.onchange = () => {
                const type = typeSel.value;
                taskSel.querySelectorAll('option').forEach(opt => {
                    if (opt.value === "") return;
                    opt.style.display = (type === 'TODOS' || opt.dataset.type === type) ? 'block' : 'none';
                });
                taskSel.value = "";
            };
        });

        window.clearSessionSlot = (num) => { document.getElementById(`task-select-${num}`).value = ""; };

        const updatePlayers = () => {
            const selectedTeamIds = Array.from(teamChecks).filter(c => c.checked).map(c => c.value);
            if (selectedTeamIds.length === 0) {
                playersList.innerHTML = '<p class="col-span-full p-4 text-center text-xs text-slate-400 italic">Selecciona algún equipo para ver jugadores.</p>';
                return;
            }
            const teamPlayers = players.filter(p => selectedTeamIds.includes(String(p.equipoid)));
            playersList.innerHTML = teamPlayers.map(p => `
                <label class="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-xl cursor-pointer hover:border-blue-200 transition-all player-label">
                    <input type="checkbox" name="playerids" value="${p.id}" ${session.playerids && session.playerids.includes(p.id.toString()) ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600">
                    <span class="text-[10px] font-bold text-slate-700 truncate player-name">${p.nombre}</span>
                </label>
            `).join('') || '<p class="col-span-full p-4 text-center text-xs text-slate-400 italic">No hay jugadores vinculados.</p>';

            if (window.lucide) lucide.createIcons();
        };

        const updateConvsByTeam = () => {
            const selectedTeamIds = Array.from(teamChecks).filter(c => c.checked).map(c => c.value);
            if (!convSelect) return;

            let filteredConvs = convs || [];
            if (selectedTeamIds.length > 0) {
                filteredConvs = (convs || []).filter(c => selectedTeamIds.includes(String(c.equipoid)));
            }

            const currentVal = convSelect.value;
            convSelect.innerHTML = `<option value="">-- MODO MANUAL --</option>` +
                filteredConvs.map(c => `<option value="${c.id}" data-players='${JSON.stringify(c.playerids || [])}'>${c.nombre} (${c.fecha}) [${(c.playerids || []).length} JUG]</option>`).join('');
            if (currentVal) convSelect.value = currentVal;
        };

        teamChecks.forEach(c => c.onchange = () => {
            updatePlayers();
            updateConvsByTeam();
        });

        if (Array.from(teamChecks).some(c => c.checked)) {
            updatePlayers();
            updateConvsByTeam();
        }

        if (sessionPlayerSearch) {
            sessionPlayerSearch.oninput = (e) => {
                const term = e.target.value.toLowerCase();
                const labels = playersList.querySelectorAll('.player-label');
                labels.forEach(label => {
                    const name = label.querySelector('.player-name').textContent.toLowerCase();
                    label.style.display = name.includes(term) ? 'flex' : 'none';
                });
            };
        }

        if (convSearch && convSelect) {
            convSearch.oninput = (e) => {
                const term = e.target.value.toLowerCase();
                const options = convSelect.querySelectorAll('option');
                options.forEach(opt => {
                    if (opt.value === "") return;
                    const text = opt.textContent.toLowerCase();
                    if (text.includes(term)) {
                        opt.style.display = 'block';
                        opt.disabled = false;
                    } else {
                        opt.style.display = 'none';
                        opt.disabled = true;
                    }
                });
            };
        }

        convSelect.onchange = () => {
            const opt = convSelect.selectedOptions[0];
            const countBadge = document.getElementById('session-modal-conv-count');
            if (!opt || !opt.value) {
                if (countBadge) countBadge.classList.add('hidden');
                return;
            }
            try {
                const playerIds = JSON.parse(opt.dataset.players);
                if (countBadge) {
                    countBadge.textContent = `${playerIds.length} JUGADORES`;
                    countBadge.classList.remove('hidden');
                }
                const checkboxes = playersList.querySelectorAll('input[name="playerids"]');
                checkboxes.forEach(cb => {
                    cb.checked = playerIds.includes(cb.value) || playerIds.includes(parseInt(cb.value));
                });
            } catch (e) { console.error("Error parsing conv players:", e); }
        };

        lucide.createIcons();
        modalOverlay.classList.add('active');

        document.getElementById('session-modal-form').onsubmit = async (e) => {
            e.preventDefault();
            try {
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());

                const checkedTeamIds = Array.from(teamChecks).filter(c => c.checked).map(c => c.value);
                data.equipoid = checkedTeamIds.length > 0 ? checkedTeamIds[0] : (session.equipoid || null);

                // Reconstruct data structure
                const extra = {
                    eids: checkedTeamIds,
                    sw: formData.getAll('sharedWith'),
                };

                data.taskids = [1, 2, 3, 4, 5, 6].map(num => formData.get(`task-select-${num}`)).filter(x => x);
                data.playerids = formData.getAll('playerids');
                data.lugar = window.serializeLugarMetadata(data.lugar, extra);

                // Cleanup: Remove fields that don't belong to the DB schema
                delete data.equipoids;
                delete data.sharedWith;
                [1, 2, 3, 4, 5, 6].forEach(num => delete data[`task-select-${num}`]);
                if (data.id) delete data.id;

                if (isEdit) {
                    await db.update('sesiones', { ...data, id: session.id });
                } else {
                    await db.add('sesiones', data);
                }

                window.customAlert('¡Éxito!', 'Sesión guardada correctamente.', 'success');
                closeModal();
                window.switchView('sesiones');
            } catch (err) {
                console.error("Error saving session:", err);
                window.customAlert('Error', 'No se pudo guardar la sesión: ' + err.message, 'error');
            }
        };
    };

    window.viewSession = async (id) => {
        const session = await db.get('sesiones', id);
        if (session) await window.renderSessionModal(session);
    };

    window.duplicateSession = async (id) => {
        const session = await db.get('sesiones', id);
        const currentUser = (await supabaseClient.auth.getUser()).data.user;
        if (session) {
            const copy = { ...session };
            delete copy.id;
            copy.titulo = (copy.titulo || '') + " (COPIA)";
            copy.fecha = new Date().toISOString().split('T')[0];
            copy.createdBy = currentUser.id; // La copia pertenece a quien la duplica
            await window.renderSessionModal(copy);
        }
    };

    window.printSession = async (id) => {
        if (window.exportSessionPDF) {
            await window.exportSessionPDF(id);
        } else {
            window.customAlert('Error', 'La función de exportación PDF no está disponible.', 'error');
        }
    };

    window.deleteSession = async (id) => {
        if (confirm('¿Estás seguro de que deseas eliminar esta sesión?')) {
            await db.delete('sesiones', id);
            window.customAlert('Eliminado', 'Sesión eliminada correctamente.', 'success');
            window.switchView('sesiones');
        }
    };

    window.openConvocatoriaForm = async (convData = null, defaultType = 'Sesión') => {
        const userRes = await supabaseClient.auth.getUser();
        const players = await db.getAll('jugadores');
        const teams = window.getSortedTeams(await db.getAll('equipos'));
        const clubsMap = {};
        players.forEach(p => {
            const raw = (p.equipoConvenido || '').trim();
            if (raw) {
                // Normalización robusta para agrupar clubes
                const normalized = raw.toUpperCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .replace(/^(UD|CD|C\.D\.|S\.D\.|SD|AD|A\.D\.|C\.F\.|CF|E\.F\.|EF|F\.C\.|FC|S\.C\.|SC)\s+/i, '')
                    .replace(/\s+(UD|CD|C\.D\.|S\.D\.|SD|AD|A\.D\.|C\.F\.|CF|E\.F\.|EF|F\.C\.|FC|S\.C\.|SC|KE|K\.E\.|KJKE|KKE|FB)$/i, '')
                    .trim();

                if (!clubsMap[normalized]) {
                    clubsMap[normalized] = {
                        original: raw,
                        players: []
                    };
                }
                // Si encontramos un nombre más completo/largo para el mismo club, lo usamos como display
                if (raw.length > clubsMap[normalized].original.length) {
                    clubsMap[normalized].original = raw;
                }
            }
        });
        const sortedClubs = Object.entries(clubsMap)
            .map(([id, data]) => ({ id, name: data.original }))
            .sort((a, b) => a.name.localeCompare(b.name));

        const isEdit = convData !== null;
        const activeTab = isEdit ? convData.tipo : defaultType;

        const { base: baseLugar, extra: meta } = window.parseLugarMetadata(convData?.lugar || ' ||| {}');

        const conv = convData || {
            id: null,
            tipo: activeTab,
            nombre: '',
            fecha: new Date().toISOString().split('T')[0],
            hora: '19:00',
            lugar: ' ||| {}',
            playerids: [],
            equipoid: null,
            createdBy: userRes.data.user?.id,
            sharedWith: []
        };

        if (isEdit) {
            conv.createdBy = convData.createdBy || meta.cb || userRes.data.user?.id;
            conv.sharedWith = convData.sharedWith || [];
        }

        const { data: profiles } = await supabaseClient.from('profiles').select('*');
        const coaches = profiles ? profiles.filter(p => p.role === 'TECNICO' || p.role === 'ELITE' || p.role === 'ADMIN') : [];

        modalContainer.innerHTML = `
            <div class="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">${isEdit ? 'Editar' : 'Nueva'} <span class="text-blue-600">${activeTab}</span></h3>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gestión de convocatoria y planificación</p>
                    </div>
                    <button onclick="closeModal()" class="p-3 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-all"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>

                <form id="convocatoria-unified-form" class="space-y-6">
                    <input type="hidden" name="id" value="${conv.id || ''}">
                    <input type="hidden" name="tipo" value="${activeTab}">
                    
                    <div class="grid grid-cols-2 gap-6">
                        <div class="col-span-2">
                             <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">Nombre del Ciclo / Evento</label>
                             <input name="nombre" value="${conv.nombre || ''}" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-black outline-none focus:ring-4 ring-blue-50 transition-all uppercase" placeholder="Ej: Ciclo Tecnificación Mayo" required>
                        </div>

                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase mb-2 px-1">Técnico Responsable</label>
                            <select name="createdBy" class="w-full p-4 bg-white border border-slate-100 rounded-2xl font-bold outline-none text-xs uppercase shadow-sm">
                                ${coaches.map(c => `<option value="${c.id}" ${conv.createdBy == c.id ? 'selected' : ''}>${(c.name || c.nombre || 'Técnico').toUpperCase()}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase mb-2 px-1">Técnicos Acompañantes</label>
                            <div class="p-2 bg-slate-50 border border-slate-100 rounded-2xl max-h-[100px] overflow-y-auto custom-scrollbar">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-1">
                                        ${coaches.map(u => `
                                        <label class="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-slate-100 cursor-pointer hover:border-blue-200 transition-all select-none">
                                            <input type="checkbox" name="sharedWith" value="${u.id}" ${conv.sharedWith && conv.sharedWith.includes(u.id) ? 'checked' : ''} class="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-100">
                                            <span class="text-[8px] font-black text-slate-600 uppercase truncate">${(u.name || u.nombre || 'Técnico').split(' ')[0]}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        
                        ${activeTab === 'Ciclo' ? `
                            <!-- Bloque Sesión 1 -->
                            <div class="col-span-2 p-6 bg-blue-50/30 rounded-[2rem] border border-blue-100/50 space-y-4">
                                <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                    <i data-lucide="calendar" class="w-3.5 h-3.5"></i> Sesión 1 (Principal)
                                </p>
                                <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div>
                                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Fecha</label>
                                        <input name="fecha" value="${conv.fecha || ''}" type="date" class="w-full p-2.5 border rounded-xl outline-none text-xs" required>
                                    </div>
                                    <div>
                                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">H. Llegada</label>
                                        <input name="hl" value="${meta.hl || ''}" type="time" class="w-full p-2.5 border rounded-xl outline-none text-xs">
                                    </div>
                                    <div>
                                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">H. Inicio</label>
                                        <input name="hi" value="${meta.hi || conv.hora || ''}" type="time" class="w-full p-2.5 border rounded-xl outline-none text-xs" required>
                                    </div>
                                    <div>
                                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">H. Salida</label>
                                        <input name="hs" value="${meta.hs || ''}" type="time" class="w-full p-2.5 border rounded-xl outline-none text-xs">
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Lugar Sesión 1</label>
                                    <input name="lugar" value="${baseLugar || ''}" class="w-full p-2.5 border rounded-xl outline-none text-xs uppercase" placeholder="Ej: Zubieta">
                                </div>
                            </div>

                            <!-- Bloque Sesión 2 -->
                            <div class="col-span-2 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Sesión 2</p>
                                <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div>
                                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Fecha</label>
                                        <input name="fecha2" value="${meta.s2?.f || ''}" type="date" class="w-full p-2.5 border rounded-xl outline-none text-xs">
                                    </div>
                                    <div>
                                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">H. Llegada</label>
                                        <input name="hl2" value="${meta.s2?.hl || ''}" type="time" class="w-full p-2.5 border rounded-xl outline-none text-xs">
                                    </div>
                                    <div>
                                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">H. Inicio</label>
                                        <input name="hi2" value="${meta.s2?.hi || ''}" type="time" class="w-full p-2.5 border rounded-xl outline-none text-xs">
                                    </div>
                                    <div>
                                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">H. Salida</label>
                                        <input name="hs2" value="${meta.s2?.hs || ''}" type="time" class="w-full p-2.5 border rounded-xl outline-none text-xs">
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Lugar Sesión 2</label>
                                    <input name="lugar2" value="${meta.s2?.l || ''}" class="w-full p-2.5 border rounded-xl outline-none text-xs uppercase" placeholder="Opcional">
                                </div>
                            </div>

                            <!-- Bloque Sesión 3 -->
                            <div class="col-span-2 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">Sesión 3</p>
                                <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div>
                                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Fecha</label>
                                        <input name="fecha3" value="${meta.s3?.f || ''}" type="date" class="w-full p-2.5 border rounded-xl outline-none text-xs">
                                    </div>
                                    <div>
                                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">H. Llegada</label>
                                        <input name="hl3" value="${meta.s3?.hl || ''}" type="time" class="w-full p-2.5 border rounded-xl outline-none text-xs">
                                    </div>
                                    <div>
                                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">H. Inicio</label>
                                        <input name="hi3" value="${meta.s3?.hi || ''}" type="time" class="w-full p-2.5 border rounded-xl outline-none text-xs">
                                    </div>
                                    <div>
                                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">H. Salida</label>
                                        <input name="hs3" value="${meta.s3?.hs || ''}" type="time" class="w-full p-2.5 border rounded-xl outline-none text-xs">
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Lugar Sesión 3</label>
                                    <input name="lugar3" value="${meta.s3?.l || ''}" class="w-full p-2.5 border rounded-xl outline-none text-xs uppercase" placeholder="Opcional">
                                </div>
                            </div>
                        ` : `
                            ${activeTab === 'Torneo' ? `
                                <div class="col-span-2 grid grid-cols-2 gap-4">
                                    <div>
                                         <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">Fecha Inicio</label>
                                         <input name="fecha" value="${conv.fecha || ''}" type="date" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" required>
                                    </div>
                                    <div>
                                         <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">Fecha Final</label>
                                         <input name="fecha_fin" value="${meta.fecha_fin || ''}" type="date" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none">
                                    </div>
                                </div>
                            ` : `
                                <div>
                                     <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">Fecha</label>
                                     <input name="fecha" value="${conv.fecha || ''}" type="date" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" required>
                                </div>
                            `}
                            <div class="grid grid-cols-3 gap-2 col-span-2">
                                 <div>
                                     <label class="block text-[10px] font-black text-slate-400 uppercase mb-2">H. Llegada</label>
                                     <input name="hl" value="${meta.hl || ''}" type="time" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none text-xs">
                                 </div>
                                 <div>
                                     <label class="block text-[10px] font-black text-slate-400 uppercase mb-2">H. Inicio</label>
                                     <input name="hi" value="${meta.hi || conv.hora || ''}" type="time" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none text-xs" required>
                                 </div>
                                 <div>
                                     <label class="block text-[10px] font-black text-slate-400 uppercase mb-2">H. Salida</label>
                                     <input name="hs" value="${meta.hs || ''}" type="time" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none text-xs">
                                 </div>
                            </div>
                            <div class="col-span-2">
                                 <label class="block text-[10px] font-black text-slate-400 uppercase mb-2">Lugar / Campo</label>
                                 <input name="lugar" value="${baseLugar || ''}" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none uppercase" placeholder="Ej: Zubieta - Campo 4">
                            </div>
                        `}
                    </div>

                    <div id="unified-player-selector-container" class="space-y-4 pt-4 border-t border-slate-100">
                        <div class="flex items-center justify-between">
                            <label class="block text-[10px] font-black text-blue-600 uppercase tracking-widest px-1">Convocatoria de Jugadores</label>
                            <button type="button" id="unified-conv-select-all" class="text-[10px] font-black text-blue-600 uppercase hover:underline">Seleccionar Todos</button>
                        </div>
                        
                        <div class="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Filtrar por Equipos</label>
                            <div id="unified-conv-teams-grid" class="grid grid-cols-2 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                ${teams.map(t => {
            let precheckedTeams = meta.eids ? meta.eids.map(String) : [];
            if (precheckedTeams.length === 0 && conv.equipoid) precheckedTeams = [String(conv.equipoid)];
            return `
                                        <label class="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 transition-all shadow-sm">
                                            <input type="checkbox" value="${t.id}" ${precheckedTeams.includes(String(t.id)) ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 unified-conv-team-check">
                                            <span class="text-[9px] font-bold text-slate-700 truncate uppercase">${t.nombre.split(' ||| ')[0]}</span>
                                        </label>
                                    `;
        }).join('')}
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div class="relative">
                                <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300"></i>
                                <input type="text" id="unified-conv-player-search" placeholder="Buscar por nombre..." class="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-blue-50 transition-all uppercase">
                            </div>
                            <div class="relative">
                                <i data-lucide="building-2" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300"></i>
                                <select id="unified-conv-club-filter" class="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-blue-50 transition-all uppercase appearance-none">
                                    <option value="all">TODOS LOS CLUBES CONVENIDOS</option>
                                    ${sortedClubs.map(c => `<option value="${c.id}">${c.name.toUpperCase()}</option>`).join('')}
                                </select>
                            </div>
                        </div>

                        <div id="unified-filtered-players-list" class="max-h-64 overflow-y-auto border border-slate-100 rounded-2xl p-4 bg-slate-50 space-y-1 custom-scrollbar"></div>
                    </div>

                    <div class="flex gap-4 mt-8">
                        <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-[10px]">Cancelar</button>
                        <button type="submit" class="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all uppercase tracking-widest text-[10px]">
                            ${isEdit ? 'Guardar Cambios' : 'Crear Convocatoria'}
                        </button>
                    </div>
                </form>
            </div>
        `;
        modalOverlay.classList.add('active');
        if (window.lucide) lucide.createIcons();

        // Auto-copy start date to end date for Tournaments
        if (activeTab === 'Torneo') {
            const startInput = document.querySelector('input[name="fecha"]');
            const endInput = document.querySelector('input[name="fecha_fin"]');
            if (startInput && endInput) {
                startInput.addEventListener('input', () => {
                    if (!endInput.value || endInput.dataset.synced === 'true' || endInput.value === '') {
                        endInput.value = startInput.value;
                        endInput.dataset.synced = 'true';
                    }
                });
                endInput.addEventListener('input', () => {
                    endInput.dataset.synced = 'false';
                });
            }
        }

        const searchInput = document.getElementById('unified-conv-player-search');
        const playerList = document.getElementById('unified-filtered-players-list');
        const teamChecks = document.querySelectorAll('.unified-conv-team-check');
        const selectedPlayerIds = new Set((conv.playerids || []).map(String));

        const updatePlayers = () => {
            const checkedTeamIds = Array.from(teamChecks).filter(c => c.checked).map(c => c.value);
            const searchText = (searchInput.value || '').toLowerCase();
            const clubFilterId = document.getElementById('unified-conv-club-filter')?.value || 'all';

            let filtered = players;
            if (checkedTeamIds.length > 0) filtered = filtered.filter(p => checkedTeamIds.includes(String(p.equipoid)));
            if (searchText) filtered = filtered.filter(p => p.nombre.toLowerCase().includes(searchText));

            if (clubFilterId !== 'all') {
                filtered = filtered.filter(p => {
                    const raw = (p.equipoConvenido || '').trim().toUpperCase()
                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                        .replace(/^(UD|CD|C\.D\.|S\.D\.|SD|AD|A\.D\.|C\.F\.|CF|E\.F\.|EF|F\.C\.|FC|S\.C\.|SC)\s+/i, '')
                        .replace(/\s+(UD|CD|C\.D\.|S\.D\.|SD|AD|A\.D\.|C\.F\.|CF|E\.F\.|EF|F\.C\.|FC|S\.C\.|SC|KE|K\.E\.|KJKE|KKE|FB)$/i, '')
                        .trim();
                    return raw === clubFilterId;
                });
            }

            // Grouping logic for the list
            const grouped = {};
            filtered.forEach(p => {
                let groupName = 'Sin Club';
                if (clubFilterId !== 'all') {
                    // Group by Team if a Club is selected
                    const team = teams.find(t => String(t.id) === String(p.equipoid));
                    groupName = team ? team.nombre.split(' ||| ')[0] : 'JUGADORES LIBRES';
                } else {
                    // Group by Club if looking at all clubs
                    groupName = (p.equipoConvenido || 'SIN CLUB ASIGNADO').toUpperCase();
                }
                if (!grouped[groupName]) grouped[groupName] = [];
                grouped[groupName].push(p);
            });

            playerList.innerHTML = filtered.length > 0 ? Object.entries(grouped).map(([groupName, groupPlayers]) => `
                <div class="mb-4">
                    <p class="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg uppercase tracking-widest mb-2 inline-block">${groupName}</p>
                    <div class="space-y-1">
                        ${groupPlayers.sort((a, b) => a.nombre.localeCompare(b.nombre)).map(p => `
                            <label class="flex items-center justify-between p-3 hover:bg-white rounded-xl cursor-pointer transition-all border border-transparent hover:border-slate-100 group">
                                <div class="flex items-center gap-3">
                                    <input type="checkbox" value="${p.id}" ${selectedPlayerIds.has(String(p.id)) ? 'checked' : ''} class="w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-600 player-check">
                                    <div>
                                        <span class="block text-sm font-bold text-slate-700 uppercase">${p.nombre}</span>
                                        <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                            ${p.equipoConvenido || 'Sin Club'} ${clubFilterId !== 'all' ? '' : ` • ${teams.find(t => String(t.id) === String(p.equipoid))?.nombre.split(' ||| ')[0] || 'Libre'}`}
                                        </p>
                                    </div>
                                </div>
                                <span class="text-[10px] font-black text-blue-500 uppercase tracking-widest">${window.parsePosition(p.posicion)[0] || '--'}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `).join('') : '<p class="text-center py-6 text-slate-400 text-xs font-black uppercase">No se encontraron jugadores</p>';

            playerList.querySelectorAll('.player-check').forEach(chk => {
                chk.onchange = (e) => {
                    if (e.target.checked) selectedPlayerIds.add(String(chk.value));
                    else selectedPlayerIds.delete(String(chk.value));
                };
            });
        };

        teamChecks.forEach(c => c.onchange = updatePlayers);
        searchInput.oninput = updatePlayers;
        const clubSelect = document.getElementById('unified-conv-club-filter');
        if (clubSelect) clubSelect.onchange = updatePlayers;
        document.getElementById('unified-conv-select-all').onclick = () => {
            const checks = playerList.querySelectorAll('.player-check');
            const allChecked = Array.from(checks).every(c => c.checked);
            checks.forEach(c => {
                c.checked = !allChecked;
                if (c.checked) selectedPlayerIds.add(String(c.value));
                else selectedPlayerIds.delete(String(c.value));
            });
        };

        // Auto-copy logic for Ciclo hours and lugar
        if (activeTab === 'Ciclo') {
            const form = document.getElementById('convocatoria-unified-form');
            ['hl', 'hi', 'hs', 'lugar'].forEach(field => {
                const source = form.querySelector(`[name="${field}"]`);
                if (source) {
                    source.addEventListener('input', () => {
                        const val = source.value;
                        ['2', '3'].forEach(suffix => {
                            const target = form.querySelector(`[name="${field}${suffix}"]`);
                            if (target) target.value = val;
                        });
                    });
                }
            });
        }

        updatePlayers();

        document.getElementById('convocatoria-unified-form').onsubmit = async (e) => {
            e.preventDefault();
            try {
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());
                data.playerids = Array.from(selectedPlayerIds);
                const checkedTeamIds = Array.from(teamChecks).filter(c => c.checked).map(c => c.value);

                let extra = {
                    eids: checkedTeamIds,
                    hl: data.hl,
                    hi: data.hi,
                    hs: data.hs,
                    fecha_fin: data.fecha_fin || null
                };

                if (activeTab === 'Ciclo') {
                    extra.s2 = {
                        f: data.fecha2,
                        hl: data.hl2,
                        hi: data.hi2,
                        hs: data.hs2,
                        l: (data.lugar2 || '').toUpperCase().trim()
                    };
                    extra.s3 = {
                        f: data.fecha3,
                        hl: data.hl3,
                        hi: data.hi3,
                        hs: data.hs3,
                        l: (data.lugar3 || '').toUpperCase().trim()
                    };
                    ['fecha2', 'hl2', 'hi2', 'hs2', 'lugar2', 'fecha3', 'hl3', 'hi3', 'hs3', 'lugar3'].forEach(f => delete data[f]);
                }

                data.hora = extra.hi;
                data.equipoid = checkedTeamIds[0] || null;
                data.sharedWith = formData.getAll('sharedWith');
                data.lugar = `${(data.lugar || '').toUpperCase().trim()} ||| ${JSON.stringify(extra)}`;
                ['hl', 'hi', 'hs', 'id', 'fecha_fin'].forEach(f => delete data[f]);

                const currentUserRes = await supabaseClient.auth.getUser();
                const currentUser = currentUserRes.data.user;

                if (isEdit) {
                    const { error } = await supabaseClient.from('convocatorias').update(data).eq('id', conv.id);
                    if (error) throw error;
                    await db.saveLocal('convocatorias', { ...data, id: conv.id });

                    // Sincronización automática con Asistencia al editar
                    try {
                        const allAttendance = await db.getAll('asistencia');
                        const linkedAttendance = allAttendance.filter(a => a.convocatoriaid?.toString() === conv.id.toString());

                        for (const att of linkedAttendance) {
                            const currentPlayers = att.players || att.data || {};
                            const updatedPlayers = {};
                            const newPids = Array.isArray(data.playerids) ? data.playerids : [];

                            newPids.forEach(pid => {
                                if (currentPlayers[pid]) {
                                    updatedPlayers[pid] = currentPlayers[pid];
                                } else {
                                    updatedPlayers[pid] = { status: 'asiste' };
                                }
                            });

                            const team = teams.find(t => t.id == data.equipoid);
                            const teamName = team ? team.nombre : 'EQUIPO';

                            const attUpdate = {
                                fecha: data.fecha,
                                nombre: window.formatAttendanceName(data.fecha, teamName, data.tipo, data.nombre),
                                tipo: data.tipo,
                                equipoid: data.equipoid,
                                players: updatedPlayers
                            };

                            await supabaseClient.from('asistencia').update(attUpdate).eq('id', att.id);
                            await db.saveLocal('asistencia', { ...att, ...attUpdate });
                        }
                    } catch (syncErr) {
                        console.error("Error sincronizando asistencia:", syncErr);
                    }

                    window.customAlert('¡Actualizado!', 'Los cambios se han guardado y la asistencia se ha sincronizado.', 'success');
                } else {
                    const { data: savedArray, error } = await supabaseClient.from('convocatorias').insert([data]).select();
                    if (error) throw error;

                    const convSaved = (savedArray && savedArray[0]) || { ...data, id: Date.now() };
                    if (savedArray && savedArray[0]) {
                        await db.saveLocal('convocatorias', convSaved);
                    } else {
                        await db.add('convocatorias', data);
                    }

                    // Automatización: Generar parte de asistencia automáticamente
                    try {
                        const playersData = {};
                        const pids = Array.isArray(data.playerids) ? data.playerids : [];
                        pids.forEach(pid => {
                            playersData[pid] = { status: 'asiste' };
                        });

                        const teams = await db.getAll('equipos');
                        const team = teams.find(t => t.id == data.equipoid);
                        const teamName = team ? team.nombre : 'EQUIPO';

                        const attendanceData = {
                            fecha: data.fecha || new Date().toISOString().split('T')[0],
                            nombre: window.formatAttendanceName(data.fecha, teamName, data.tipo, data.nombre),
                            tipo: data.tipo || 'Convocatoria',
                            equipoid: data.equipoid || null,
                            convocatoriaid: convSaved.id,
                            lugar: data.lugar || '',
                            players: playersData,
                            createdBy: currentUser?.id
                        };

                        // Intentamos añadir la asistencia. Si falla (ej: falta columna), lo logueamos pero no bloqueamos la convocatoria
                        try {
                            await db.add('asistencia', attendanceData);
                        } catch (innerErr) {
                            console.error("Critical: Could not sync attendance to Supabase. Checking local fallback.", innerErr);
                            // Fallback local si falla Supabase (ej: falta columna convocatoriaid)
                            await db.saveLocal('asistencia', { ...attendanceData, id: Date.now() });
                        }
                    } catch (attErr) {
                        console.error("Error creating auto-attendance:", attErr);
                    }

                    window.customAlert('¡Creado!', 'La convocatoria ha sido guardada y se ha generado su parte de asistencia.', 'success');
                }

                closeModal();
                if (window.currentView === 'convocatorias' || window.currentView === 'torneos') {
                    window.switchView(window.currentView);
                }
            } catch (err) {
                console.error("Save error detail:", err);
                window.customAlert('Error al guardar', err.message || 'Error desconocido', 'error');
            }
        };
    };

    window.editConvocatoria = async (id) => {
        const { data: conv, error } = await supabaseClient.from('convocatorias').select('*').eq('id', id).single();
        if (error || !conv) return;
        await window.openConvocatoriaForm(conv);
    };


    window.deleteConvocatoria = async (id) => {
        window.customConfirm('¿Eliminar Convocatoria?', '¿Estás seguro de que quieres borrar este listado permanentemente?', async () => {
            try {
                const { error } = await supabaseClient.from('convocatorias').delete().eq('id', id);
                if (error) throw error;

                window.customAlert('¡Borrado!', 'La convocatoria ha sido eliminada.', 'success');

                // Refresh reliably
                if (window.currentView === 'torneos') {
                    window.switchView('torneos');
                } else {
                    window.switchView('convocatorias');
                }
            } catch (err) {
                console.error("Delete error:", err);
                alert("Error al borrar: " + err.message);
            }
        });
    };


    window.updateModalPitch = async (formationId, id, type = 'Convocatoria') => {
        if (!window.formationsState) {
            const saved = localStorage.getItem('ms_coach_formation_state');
            window.formationsState = saved ? JSON.parse(saved) : { teams: {}, torneos: {}, convocatorias: {} };
        }

        const sectionMapping = {
            'Torneo': 'torneos',
            'Convocatoria': 'convocatorias'
        };
        const sectionKey = sectionMapping[type] || 'convocatorias';

        if (!window.formationsState[sectionKey]) window.formationsState[sectionKey] = {};
        window.formationsState[sectionKey][id] = formationId;

        // Persistir en localStorage
        localStorage.setItem('ms_coach_formation_state', JSON.stringify(window.formationsState));

        if (type === 'Torneo') {
            window.viewTorneoRendimiento(id);
        } else {
            window.viewConvocatoria(id);
        }
    };

    window.toggleConvEdit = (id) => {
        const display = document.getElementById('conv-info-display');
        const edit = document.getElementById('conv-info-edit');
        if (display && edit) {
            display.classList.toggle('hidden');
            edit.classList.toggle('hidden');
        }
    };

    window.saveConvEdit = async (e, id) => {
        if (e && e.preventDefault) e.preventDefault();
        try {
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.sharedWith = formData.getAll('sharedWith');

            const selectedTeams = formData.getAll('equipoids');
            data.equipoid = selectedTeams.length > 0 ? parseInt(selectedTeams[0]) : null;

            // Formalized metadata serialization using centralized utility
            const extra = {
                hl: data.hl || data.hora_llegada,
                hi: data.hi || data.hora_inicio || data.hora,
                hs: data.hs || data.hora_salida,
                s2: {
                    f: data.fecha2,
                    hl: data.hl2,
                    hi: data.hi2 || data.hora2,
                    hs: data.hs2,
                    l: (data.lugar2 || '').toUpperCase().trim()
                },
                s3: {
                    f: data.fecha3,
                    hl: data.hl3,
                    hi: data.hi3 || data.hora3,
                    hs: data.hs3,
                    l: (data.lugar3 || '').toUpperCase().trim()
                },
                sw: data.sharedWith,
                eids: selectedTeams
            };

            const bundledData = { ...data };
            bundledData.hora = extra.hi || data.hora;
            ['fecha2', 'hora2', 'lugar2', 'fecha3', 'hora3', 'lugar3', 'sharedWith', 'equipoids', 'hora_llegada', 'hora_inicio', 'hora_salida', 'hl', 'hi', 'hs', 'hl2', 'hi2', 'hs2', 'hl3', 'hi3', 'hs3'].forEach(f => delete bundledData[f]);
            bundledData.lugar = window.serializeLugarMetadata(data.lugar, extra);

            await db.update('convocatorias', { ...bundledData, id });

            window.customAlert('Éxito', 'Convocatoria actualizada', 'success');
            window.viewConvocatoria(id);

            // Refresh table
            const currentView = document.querySelector('[data-view].active')?.getAttribute('data-view');
            const container = document.getElementById('content-container');
            if (container && (currentView === 'convocatorias' || currentView === 'torneos')) {
                if (currentView === 'convocatorias') window.renderConvocatorias(container);
                else window.renderTorneos(container);
            }
        } catch (err) {
            alert("Error al guardar: " + err.message);
        }
    };
    window.renderPlayerSelectionForConvocatoria = async (containerId, teamIds) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        const allPlayers = await db.getAll('jugadores');
        const teams = window.getSortedTeams(await db.getAll('equipos'));

        // Ensure teamIds is an array of strings
        const selectedTeamIds = Array.isArray(teamIds) ? teamIds.map(String) : [String(teamIds)];

        const filteredPlayers = allPlayers.filter(p => selectedTeamIds.includes(String(p.equipoid)));

        if (filteredPlayers.length === 0) {
            container.innerHTML = `
                <div class="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">No hay jugadores vinculados a los equipos seleccionados</p>
                </div>
            `;
            return;
        }

        // Group by team for better UX
        const grouped = {};
        filteredPlayers.forEach(p => {
            const teamName = teams.find(t => String(t.id) === String(p.equipoid))?.nombre || 'General';
            if (!grouped[teamName]) grouped[teamName] = [];
            grouped[teamName].push(p);
        });

        container.innerHTML = `
            <div class="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                ${Object.entries(grouped).map(([teamName, players]) => `
                    <div class="space-y-2">
                        <p class="text-[9px] font-black text-blue-600 uppercase tracking-widest px-1">${teamName}</p>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                            ${players.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')).map(p => `
                                <label class="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-blue-300 transition-all cursor-pointer group">
                                    <input type="checkbox" name="playerids" value="${p.id}" class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500">
                                    <div class="flex-1 min-w-0">
                                        <p class="text-[10px] font-bold text-slate-700 truncate">${p.nombre}</p>
                                        <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">${window.formatPosition(p.posicion)}</p>
                                    </div>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    };

    window.showNewConvocatoriaModal = (type) => {
        const activeType = type || currentConvocatoriaTypeTab;
        window.openConvocatoriaForm(null, activeType);
    };

    window.showNewTorneoModal = () => {
        window.openConvocatoriaForm(null, 'Torneo');
    };




    window.showNewEventoModal = async () => {
        modalContainer.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Nuevo Evento</h3>
                        <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Añadir a la agenda personal</p>
                    </div>
                    <button onclick="closeModal()" class="p-3 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-all"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
                <form id="new-evento-form" class="space-y-6">
                    <div class="space-y-2">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Título del Evento</label>
                        <input name="nombre" type="text" required placeholder="Ej: Reunión de Coordinación" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all uppercase">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha</label>
                            <input name="fecha" type="date" required class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none">
                        </div>
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Hora</label>
                            <input name="hora" type="time" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Etiqueta / Categoría</label>
                            <select name="categoria" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none appearance-none">
                                <option value="Reunión">Reunión</option>
                                <option value="Partido">Partido</option>
                                <option value="Scouting">Scouting</option>
                                <option value="Mandar convocatorias">Mandar convocatorias</option>
                                <option value="Preparar equipos torneos">Preparar equipos torneos</option>
                                <option value="Preparar jugadores ciclos/sesiones">Preparar jugadores ciclos/sesiones</option>
                                <option value="Lavar ropa">Lavar ropa</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Lugar</label>
                            <input name="lugar" type="text" placeholder="Ej: Zubieta" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none uppercase">
                        </div>
                    </div>
                    <div class="space-y-2">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Notas</label>
                        <textarea name="notas" rows="3" placeholder="Detalles adicionales..." class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all"></textarea>
                    </div>
                    <div class="pt-6 border-t border-slate-100 flex justify-end gap-3">
                        <button type="button" onclick="closeModal()" class="px-8 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px]">Cancelar</button>
                        <button type="submit" class="px-12 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-[10px]">Guardar Evento</button>
                    </div>
                </form>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        modalOverlay.classList.add('active');

        document.getElementById('new-evento-form').onsubmit = async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            const userRes = await supabaseClient.auth.getUser();
            const currentUser = userRes.data?.user;

            try {
                if (data.nombre) data.nombre = data.nombre.toUpperCase().trim();
                if (data.lugar) data.lugar = data.lugar.toUpperCase().trim();

                await db.add('eventos', { ...data, createdBy: currentUser?.id });
                window.customAlert('¡Guardado!', 'El compromiso se ha añadido a tu agenda.', 'success');
                closeModal();

                const container = document.getElementById('content-container');
                if (currentView === 'eventos') window.renderEventos(container);
                if (currentView === 'calendario') renderCalendario(container);
            } catch (err) {
                window.customAlert('Error', 'No se pudo guardar el evento', 'error');
            }
        };
    };

    window.showNewSesionModal = async () => {
        await window.renderSessionModal();
    };

    window.showNewTareaModal = async () => {
        if (currentView === 'tareas') {
            await window.showNewExerciseModal();
        } else {
            await window.showNewManagementTaskModal();
        }
    };

    window.showNewManagementTaskModal = async () => {
        modalContainer.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Nueva Tarea</h3>
                        <p class="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-1">Recordatorio de gestión</p>
                    </div>
                    <button onclick="closeModal()" class="p-3 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-all"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
                <form id="new-mgmt-task-form" class="space-y-6">
                    <div class="space-y-2">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Título de la Tarea</label>
                        <input name="titulo" type="text" required placeholder="Ej: Llamar a representante" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-amber-50 transition-all">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha Límite</label>
                            <input name="fecha" type="date" required class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none">
                        </div>
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Prioridad</label>
                            <select name="prioridad" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none">
                                <option value="Baja">Baja</option>
                                <option value="Media" selected>Media</option>
                                <option value="Alta">Alta</option>
                            </select>
                        </div>
                    </div>
                    <div class="pt-6 border-t border-slate-100 flex justify-end gap-3">
                        <button type="button" onclick="closeModal()" class="px-8 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px]">Cancelar</button>
                        <button type="submit" class="px-12 py-4 bg-amber-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-[10px]">Guardar Tarea</button>
                    </div>
                </form>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        modalOverlay.classList.add('active');

        document.getElementById('new-mgmt-task-form').onsubmit = async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            const userRes = await supabaseClient.auth.getUser();
            const currentUser = userRes.data?.user;

            try {
                await db.add('tareas', { ...data, estado: 'pendiente', createdBy: currentUser?.id });
                window.customAlert('Éxito', 'Tarea guardada', 'success');
                closeModal();
                if (currentView === 'agenda' || currentView === 'dashboard') window.renderView(currentView);
            } catch (err) {
                window.customAlert('Error', 'No se pudo guardar la tarea', 'error');
            }
        };
    };

    window.showNewExerciseModal = async () => {
        modalContainer.innerHTML = `
            <div class="p-8 max-w-4xl mx-auto">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Nuevo Ejercicio</h3>
                        <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Biblioteca de Entrenamiento</p>
                    </div>
                    <button onclick="closeModal()" class="p-3 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-all"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
                <form id="new-exercise-form" class="space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-6">
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre del Ejercicio</label>
                                <input name="name" type="text" required placeholder="Ej: Rondo 4x4 + 3" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all">
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-2">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo</label>
                                    <select name="type" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none">
                                        ${TASK_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="space-y-2">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Etapa</label>
                                    <select name="categoria" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none">
                                        ${TASK_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Objetivo Principal</label>
                                <select name="objetivo" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none">
                                    ${TASK_OBJECTIVES.map(o => `<option value="${o}">${o}</option>`).join('')}
                                </select>
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Espacio</label>
                                <select name="espacio" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none">
                                    ${TASK_SPACES.map(s => `<option value="${s}">${s}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="space-y-6">
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Descripción / Reglas</label>
                                <textarea name="description" rows="10" placeholder="Describe la dinámica del ejercicio..." class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all"></textarea>
                            </div>
                        </div>
                    </div>
                    <div class="pt-6 border-t border-slate-100 flex justify-end gap-3">
                        <button type="button" onclick="closeModal()" class="px-8 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px]">Cancelar</button>
                        <button type="submit" class="px-12 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-[10px]">Guardar en Biblioteca</button>
                    </div>
                </form>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        modalOverlay.classList.add('active');

        document.getElementById('new-exercise-form').onsubmit = async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            const userRes = await supabaseClient.auth.getUser();
            const currentUser = userRes.data?.user;

            try {
                await db.add('tareas', { ...data, createdBy: currentUser?.id });
                window.customAlert('Éxito', 'Ejercicio añadido a la biblioteca', 'success');
                closeModal();
                if (currentView === 'tareas') window.renderTareas(document.getElementById('content-container'));
            } catch (err) {
                window.customAlert('Error', 'No se pudo guardar el ejercicio', 'error');
            }
        };
    };

    window.viewConvocatoria = async (id, activeTab = 'pizarra') => {
        try {
            const userRes = await supabaseClient.auth.getUser();
            const currentUser = userRes.data?.user;
            modalOverlay.classList.add('p-0');
            modalOverlay.classList.remove('md:p-8', 'p-4');

            const { data: rawConv, error } = await supabaseClient.from("convocatorias").select("*").eq("id", id).single();
            if (error) throw error;
            let conv = { ...rawConv };

            // Refactored to use centralized parseLugarMetadata
            const { base, extra: meta } = window.parseLugarMetadata(conv.lugar);
            conv.lugar = base;
            if (meta.s2) {
                conv.fecha2 = meta.s2.f;
                conv.hl2 = meta.s2.hl; conv.hi2 = meta.s2.hi || meta.s2.h; conv.hs2 = meta.s2.hs; conv.lugar2 = meta.s2.l;
                conv.fecha3 = meta.s3.f;
                conv.hl3 = meta.s3.hl; conv.hi3 = meta.s3.hi || meta.s3.h; conv.hs3 = meta.s3.hs; conv.lugar3 = meta.s3.l;
            }
            conv.hl = meta.hl; conv.hi = meta.hi || conv.hora; conv.hs = meta.hs;
            if (meta.sw) conv.sharedWith = meta.sw;
            if (meta.eids && !conv.equipoid) conv.equipoid = meta.eids;

            const players = await db.getAll('jugadores');
            const teams = window.getSortedTeams(await db.getAll('equipos'));

            // Reset filter if opening a different convocatoria
            if (window.lastViewedConvId !== id) {
                window.currentConvClubFilter = 'all';
                window.lastViewedConvId = id;
            } else {
                window.currentConvClubFilter = window.currentConvClubFilter || 'all';
            }
            const { data: users } = await (supabaseClient ? supabaseClient.from('profiles').select('*') : { data: [] });

            let selectedTeamIds = [];
            const { base: mainLugar, extra } = window.parseLugarMetadata(rawConv.lugar);
            if (extra.eids && Array.isArray(extra.eids)) {
                selectedTeamIds = extra.eids.map(String);
            }

            if (selectedTeamIds.length === 0 && rawConv.equipoid) {
                selectedTeamIds = [rawConv.equipoid.toString()];
            }

            const selectedTeams = teams.filter(t => selectedTeamIds.includes(t.id.toString()));
            const pids = Array.isArray(conv.playerids) ? conv.playerids.map(String) : [];

            // Map convocados with potential custom positions (store original for the select)
            const convocados = players.filter(p => pids.includes(p.id.toString())).map(p => {
                const customPos = extra.pos && extra.pos[p.id];
                return {
                    ...p,
                    originalPos: p.posicion,
                    posicion: customPos || p.posicion,
                    customPos: customPos || null
                };
            });

            // If no teams selected, show all players initially in mgmt list
            const teamPlayers = selectedTeamIds.length > 0
                ? players.filter(p => selectedTeamIds.includes(p.equipoid?.toString()))
                : players;

            modalContainer.className = "bg-white w-full h-full rounded-none shadow-none overflow-y-auto transform transition-all duration-300 custom-scrollbar";
            modalContainer.innerHTML = `
            <div class="p-4 md:p-12">
                <div class="flex justify-between items-start mb-8">
                    <div class="flex-1">
                        <div class="flex items-center gap-3 mb-2">
                            <span id="conv-type-badge" class="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-black uppercase tracking-widest">${conv.tipo}</span>
                            <span class="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[10px] font-black uppercase tracking-widest">${selectedTeams.length > 0 ? selectedTeams.map(t => t.nombre).join(', ') : 'Equipo General'}</span>
                            <button onclick="window.toggleConvEdit(${conv.id})" class="p-1.5 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Editar información">
                                <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
                            </button>
                            <button id="toggle-player-mgmt" class="p-1.5 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex items-center gap-2 px-3" title="Gestionar Jugadores">
                                <i data-lucide="users" class="w-3.5 h-3.5"></i>
                                <span class="text-[9px] font-black uppercase tracking-widest">Gestionar Jugadores</span>
                                <span id="conv-player-count-badge" class="ml-1 bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded-full">${pids.length}</span>
                            </button>
                        </div>
                        <div id="conv-info-display">
                            <h3 class="text-3xl font-black text-slate-800 uppercase tracking-tight">${conv.nombre}</h3>
                            ${conv.tipo === 'Ciclo' ? `
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                                    <!-- Card Sesión 1 -->
                                    <div class="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100/50 shadow-sm relative overflow-hidden group">
                                        <div class="absolute -right-4 -top-4 w-16 h-16 bg-blue-600/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                                        <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <i data-lucide="calendar" class="w-3 h-3"></i> Sesión 1
                                        </p>
                                        <div class="space-y-3">
                                            <p class="text-sm font-black text-slate-800 uppercase tracking-tight">${conv.fecha}</p>
                                            <div class="flex items-center gap-4 py-2 border-y border-blue-100/30">
                                                <div class="flex flex-col"><span class="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Llegada</span><span class="text-xs font-bold text-slate-700">${conv.hl || '--'}</span></div>
                                                <div class="w-px h-6 bg-blue-100/50"></div>
                                                <div class="flex flex-col"><span class="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Inicio</span><span class="text-xs font-bold text-blue-600">${conv.hi || '--'}</span></div>
                                                <div class="w-px h-6 bg-blue-100/50"></div>
                                                <div class="flex flex-col"><span class="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Salida</span><span class="text-xs font-bold text-slate-700">${conv.hs || '--'}</span></div>
                                            </div>
                                            <div class="flex items-center gap-2 text-slate-400">
                                                <i data-lucide="map-pin" class="w-3.5 h-3.5"></i>
                                                <span class="text-[10px] font-bold uppercase tracking-tight">${window.cleanLugar(conv.lugar) || 'SIN LUGAR'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Card Sesión 2 -->
                                    <div class="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                                        <div class="absolute -right-4 -top-4 w-16 h-16 bg-slate-100 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <i data-lucide="calendar" class="w-3 h-3"></i> Sesión 2
                                        </p>
                                        <div class="space-y-3">
                                            <p class="text-sm font-black text-slate-800 uppercase tracking-tight">${conv.fecha2 || '--'}</p>
                                            <div class="flex items-center gap-4 py-2 border-y border-slate-100">
                                                <div class="flex flex-col"><span class="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Llegada</span><span class="text-xs font-bold text-slate-700">${conv.hl2 || '--'}</span></div>
                                                <div class="w-px h-6 bg-slate-100"></div>
                                                <div class="flex flex-col"><span class="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Inicio</span><span class="text-xs font-bold text-slate-700">${conv.hi2 || '--'}</span></div>
                                                <div class="w-px h-6 bg-slate-100"></div>
                                                <div class="flex flex-col"><span class="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Salida</span><span class="text-xs font-bold text-slate-700">${conv.hs2 || '--'}</span></div>
                                            </div>
                                            <div class="flex items-center gap-2 text-slate-400">
                                                <i data-lucide="map-pin" class="w-3.5 h-3.5"></i>
                                                <span class="text-[10px] font-bold uppercase tracking-tight">${window.cleanLugar(conv.lugar2) || 'SIN LUGAR'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Card Sesión 3 -->
                                    <div class="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                                        <div class="absolute -right-4 -top-4 w-16 h-16 bg-slate-100 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <i data-lucide="calendar" class="w-3 h-3"></i> Sesión 3
                                        </p>
                                        <div class="space-y-3">
                                            <p class="text-sm font-black text-slate-800 uppercase tracking-tight">${conv.fecha3 || '--'}</p>
                                            <div class="flex items-center gap-4 py-2 border-y border-slate-100">
                                                <div class="flex flex-col"><span class="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Llegada</span><span class="text-xs font-bold text-slate-700">${conv.hl3 || '--'}</span></div>
                                                <div class="w-px h-6 bg-slate-100"></div>
                                                <div class="flex flex-col"><span class="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Inicio</span><span class="text-xs font-bold text-slate-700">${conv.hi3 || '--'}</span></div>
                                                <div class="w-px h-6 bg-slate-100"></div>
                                                <div class="flex flex-col"><span class="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Salida</span><span class="text-xs font-bold text-slate-700">${conv.hs3 || '--'}</span></div>
                                            </div>
                                            <div class="flex items-center gap-2 text-slate-400">
                                                <i data-lucide="map-pin" class="w-3.5 h-3.5"></i>
                                                <span class="text-[10px] font-bold uppercase tracking-tight">${window.cleanLugar(conv.lugar3) || 'SIN LUGAR'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ` : `
                                <div class="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2">
                                    <p class="text-slate-500 font-bold flex items-center gap-2">
                                        <i data-lucide="calendar" class="w-4 h-4 opacity-40"></i>
                                        ${conv.fecha}
                                    </p>
                                    ${(() => {
                    let times = [];
                    const { extra: meta } = window.parseLugarMetadata(rawConv.lugar);
                    if (meta.hl) times.push(`<div class="flex flex-col"><span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Llegada</span><span class="text-xs font-bold text-slate-700">${meta.hl}</span></div>`);
                    if (meta.hi) times.push(`<div class="flex flex-col"><span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Inicio</span><span class="text-xs font-bold text-slate-700">${meta.hi}</span></div>`);
                    if (meta.hs) times.push(`<div class="flex flex-col"><span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Salida</span><span class="text-xs font-bold text-slate-700">${meta.hs}</span></div>`);
                    if (times.length === 0) return `<p class="text-slate-500 font-bold flex items-center gap-2"><i data-lucide="clock" class="w-4 h-4 opacity-40"></i> ${conv.hora || '--:--'}</p>`;
                    return `<div class="flex items-center gap-4">${times.join('<div class="w-px h-4 bg-slate-200"></div>')}</div>`;
                })()}
                                    <p class="text-slate-500 font-bold flex items-center gap-2">
                                        <i data-lucide="map-pin" class="w-4 h-4 opacity-40"></i>
                                        ${window.cleanLugar(conv.lugar) || 'Sin lugar asignado'}
                                    </p>
                                </div>
                            `}
                        </div>

                        <!-- Player Management Area -->
                        <div id="player-mgmt-area" class="hidden animate-in fade-in slide-in-from-top-2 duration-300 bg-blue-50/30 p-8 rounded-[3rem] mt-6 border border-blue-100/50">
                            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                                <div>
                                    <h4 class="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                        <i data-lucide="user-plus" class="w-4 h-4"></i>
                                        Gestión de Plantilla
                                    </h4>
                                    <p class="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-tight">Recluta jugadores y asigna posiciones tácticas</p>
                                </div>
                                <div class="relative w-full md:w-80">
                                    <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300"></i>
                                    <input type="text" id="mgmt-player-search" placeholder="Buscar por nombre..." class="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest outline-none focus:ring-8 ring-blue-50/30 transition-all shadow-sm">
                                </div>
                            </div>
                            
                            <!-- Multi-Team Toggle within Management -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div class="p-4 bg-white border border-slate-100 rounded-3xl shadow-inner-sm">
                                    <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Filtrar Jugadores por Squads</label>
                                    <div class="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                                        ${window.getSortedTeams(teams).map(t => `
                                            <label class="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-transparent cursor-pointer hover:border-blue-200 transition-all select-none">
                                                <input type="checkbox" value="${t.id}" ${selectedTeamIds.includes(String(t.id)) ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 conv-team-check">
                                                <span class="text-[9px] font-black text-slate-600 truncate uppercase">${t.nombre}</span>
                                            </label>
                                        `).join('')}
                                    </div>
                                </div>
                                <div class="p-4 bg-white border border-slate-100 rounded-3xl shadow-inner-sm">
                                    <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Filtrar por Club Convenido</label>
                                    <select id="mgmt-club-filter" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-600 outline-none focus:ring-4 ring-blue-50/30 transition-all cursor-pointer">
                                        <option value="all">TODOS LOS CLUBES</option>
                                        ${(() => {
                    const clubsMap = players.reduce((acc, p) => {
                        const raw = (p.equipoConvenido || 'Libre').trim();
                        const key = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
                        if (!acc[key]) acc[key] = raw;
                        return acc;
                    }, {});

                    return Object.entries(clubsMap)
                        .sort((a, b) => a[1].localeCompare(b[1]))
                        .map(([key, name]) => `<option value="${key}">${name.toUpperCase()}</option>`)
                        .join('');
                })()}
                                    </select>
                                </div>
                            </div>

                            <div id="mgmt-player-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar p-1">
                                ${teamPlayers.map(p => {
                    const isConvocado = pids.includes(p.id.toString());
                    // Custom Position Logic
                    let currentPos = p.posicion || '';
                    if (extra.pos && extra.pos[p.id]) currentPos = extra.pos[p.id];

                    return `
                                        <div class="flex flex-col gap-2 p-4 bg-white rounded-3xl border border-slate-100 mgmt-player-label shadow-sm hover:shadow-lg transition-all border-transparent hover:border-blue-100 group">
                                            <div class="flex items-center gap-3">
                                                <input type="checkbox" data-pid="${p.id}" ${isConvocado ? 'checked' : ''} class="w-5 h-5 rounded-xl text-blue-600 border-slate-200 focus:ring-blue-100 mgmt-player-check">
                                                <div class="flex-1 min-w-0">
                                                    <p class="text-[11px] font-black text-slate-700 truncate mgmt-player-name uppercase tracking-tight">${p.nombre}</p>
                                                    <p class="text-[8px] text-slate-400 font-black uppercase tracking-widest">${p.equipoConvenido || 'Libre'}</p>
                                                </div>
                                            </div>
                                            <div class="mt-2 pt-2 border-t border-slate-50 flex items-center gap-2">
                                                <label class="text-[8px] font-black text-slate-300 uppercase shrink-0">POS:</label>
                                                <select class="flex-1 p-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-600 outline-none mgmt-player-pos transition-all focus:bg-white focus:border-blue-200">
                                                    <option value="">${window.formatPosition(p.posicion)}</option>
                                                    ${PLAYER_POSITIONS.map(pos => `<option value="${pos}" ${currentPos === pos ? 'selected' : ''}>${pos}</option>`).join('')}
                                                </select>
                                            </div>
                                        </div>
                                    `;
                }).join('') || '<p class="col-span-full text-center py-20 text-slate-400 italic text-[10px] uppercase font-black tracking-widest">Selecciona un equipo para reclutar jugadores</p>'}
                            </div>

                            <div class="mt-10 pt-8 border-t border-blue-100/30 flex justify-end gap-3">
                                <button onclick="document.getElementById('player-mgmt-area').classList.add('hidden')" class="px-8 py-4 bg-white text-slate-400 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all border border-slate-100">Cancelar</button>
                                <button id="save-conv-players" class="px-10 py-4 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-2xl shadow-blue-500/30 hover:bg-blue-700 transition-all">Guardar Plantilla</button>
                            </div>
                        </div>

                        <div id="conv-info-edit" class="hidden animate-in fade-in slide-in-from-top-2 duration-300 bg-slate-50 p-6 rounded-3xl mt-4 border border-slate-200">
                            <form onsubmit="window.saveConvEdit(event, ${conv.id})" class="grid grid-cols-2 gap-4">
                                <div class="col-span-2">
                                    <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre del Evento</label>
                                    <input name="nombre" value="${conv.nombre}" class="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 ring-blue-500">
                                </div>
                                <div>
                                    <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo</label>
                                    <select name="tipo" class="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none cursor-pointer">
                                        <option value="Ciclo" ${conv.tipo === 'Ciclo' ? 'selected' : ''}>Ciclo</option>
                                        <option value="Sesión" ${conv.tipo === 'Sesión' ? 'selected' : ''}>Sesión</option>
                                        <option value="Zubieta" ${conv.tipo === 'Zubieta' ? 'selected' : ''}>Zubieta</option>
                                        <option value="Torneo" ${conv.tipo === 'Torneo' ? 'selected' : ''}>Torneo</option>
                                        <option value="Partido" ${conv.tipo === 'Partido' ? 'selected' : ''}>Partido</option>
                                    </select>
                                </div>
                                
                                ${conv.tipo === 'Ciclo' ? `
                                    <div class="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-white rounded-[2.5rem] border border-slate-100">
                                        <div class="space-y-4">
                                            <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest">Sesión 1</p>
                                            <input name="fecha" type="date" value="${conv.fecha}" class="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-blue-500">
                                            <div class="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label class="text-[8px] font-black text-slate-400 uppercase tracking-tighter">LLegada</label>
                                                    <input name="hl" type="time" value="${conv.hl || ''}" class="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold outline-none">
                                                </div>
                                                <div>
                                                    <label class="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Inicio</label>
                                                    <input name="hi" type="time" value="${conv.hi || ''}" class="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold outline-none">
                                                </div>
                                                <div>
                                                    <label class="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Salida</label>
                                                    <input name="hs" type="time" value="${conv.hs || ''}" class="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold outline-none">
                                                </div>
                                            </div>
                                            <input name="lugar" value="${conv.lugar || ''}" class="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" placeholder="Lugar 1">
                                        </div>
                                        <div class="space-y-4">
                                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sesión 2</p>
                                            <input name="fecha2" type="date" value="${conv.fecha2 || ''}" class="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-blue-500">
                                            <div class="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label class="text-[8px] font-black text-slate-400 uppercase tracking-tighter">LLegada</label>
                                                    <input name="hl2" type="time" value="${conv.hl2 || ''}" class="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold outline-none">
                                                </div>
                                                <div>
                                                    <label class="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Inicio</label>
                                                    <input name="hi2" type="time" value="${conv.hi2 || ''}" class="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold outline-none">
                                                </div>
                                                <div>
                                                    <label class="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Salida</label>
                                                    <input name="hs2" type="time" value="${conv.hs2 || ''}" class="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold outline-none">
                                                </div>
                                            </div>
                                            <input name="lugar2" value="${conv.lugar2 || ''}" class="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" placeholder="Lugar 2">
                                        </div>
                                        <div class="space-y-4">
                                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sesión 3</p>
                                            <input name="fecha3" type="date" value="${conv.fecha3 || ''}" class="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-blue-500">
                                            <div class="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label class="text-[8px] font-black text-slate-400 uppercase tracking-tighter">LLegada</label>
                                                    <input name="hl3" type="time" value="${conv.hl3 || ''}" class="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold outline-none">
                                                </div>
                                                <div>
                                                    <label class="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Inicio</label>
                                                    <input name="hi3" type="time" value="${conv.hi3 || ''}" class="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold outline-none">
                                                </div>
                                                <div>
                                                    <label class="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Salida</label>
                                                    <input name="hs3" type="time" value="${conv.hs3 || ''}" class="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold outline-none">
                                                </div>
                                            </div>
                                            <input name="lugar3" value="${conv.lugar3 || ''}" class="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" placeholder="Lugar 3">
                                        </div>
                                    </div>
                                ` : `
                                    <div>
                                        <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Fecha</label>
                                        <input name="fecha" type="date" value="${conv.fecha}" class="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 ring-blue-500">
                                    </div>
                                    <div class="col-span-2 grid grid-cols-3 gap-3">
                                        <div>
                                            <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Hora Llegada</label>
                                            <input name="hora_llegada" type="time" value="${(() => {
                    if (rawConv.lugar && rawConv.lugar.includes(' ||| ')) {
                        try { return JSON.parse(rawConv.lugar.split(' ||| ')[1]).hl || ''; } catch (e) { }
                    }
                    return '';
                })()}" class="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none">
                                        </div>
                                        <div>
                                            <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Hora Inicio</label>
                                            <input name="hora_inicio" type="time" value="${(() => {
                    if (rawConv.lugar && rawConv.lugar.includes(' ||| ')) {
                        try { return JSON.parse(rawConv.lugar.split(' ||| ')[1]).hi || conv.hora || ''; } catch (e) { }
                    }
                    return conv.hora || '';
                })()}" class="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none">
                                        </div>
                                        <div>
                                            <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Hora Salida</label>
                                            <input name="hora_salida" type="time" value="${(() => {
                    if (rawConv.lugar && rawConv.lugar.includes(' ||| ')) {
                        try { return JSON.parse(rawConv.lugar.split(' ||| ')[1]).hs || ''; } catch (e) { }
                    }
                    return '';
                })()}" class="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none">
                                        </div>
                                    </div>
                                `}
                                <div class="col-span-2">
                                    <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Equipos Vinculados</label>
                                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto p-4 bg-white rounded-[1.5rem] border border-slate-200 custom-scrollbar">
                                        ${window.getSortedTeams(teams).map(t => `
                                            <label class="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-50 cursor-pointer hover:border-blue-200 transition-all select-none">
                                                <input type="checkbox" name="equipoids" value="${t.id}" ${selectedTeamIds.includes(t.id.toString()) ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 focus:ring-blue-100 conv-team-check">
                                                <span class="text-[9px] font-bold text-slate-700 truncate">${t.nombre}</span>
                                            </label>
                                        `).join('')}
                                    </div>
                                </div>

                                <div class="col-span-2">
                                    <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Lugar</label>
                                    <input name="lugar" value="${conv.lugar || ''}" class="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 ring-blue-500">
                                </div>

                                ${(users) ? `
                                    <div class="col-span-2 space-y-3 pt-4 border-t border-slate-200">
                                        <label class="block text-xs font-black text-slate-400 uppercase tracking-widest">Compartir con el Staff</label>
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-white rounded-2xl border border-slate-100 custom-scrollbar">
                                            ${(users && currentUser) ? users.filter(u => u.id !== currentUser.id).map(u => `
                                                <label class="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 transition-all select-none">
                                                    <input type="checkbox" name="sharedWith" value="${u.id}" ${conv.sharedWith && conv.sharedWith.includes(u.id) ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 focus:ring-blue-100">
                                                    <div class="flex-1">
                                                        <p class="text-[10px] font-bold text-slate-700">${u.name || u.full_name || u.nombre || 'Sin nombre'}</p>
                                                    </div>
                                                </label>
                                            `).join('') : '<p class="text-[10px] text-slate-400 italic">No hay otros usuarios registrados.</p>'}
                                        </div>
                                    </div>
                                ` : ''}

                                <div class="col-span-2 flex gap-2 pt-2">
                                    <button type="submit" class="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all">Guardar</button>
                                    <button type="button" onclick="window.toggleConvEdit(${conv.id})" class="px-4 py-3 bg-slate-200 text-slate-600 font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-slate-300 transition-all">Cancelar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="window.exportConvocatoria(${conv.id})" class="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/10 flex items-center gap-2">
                            <i data-lucide="file-down" class="w-4 h-4 text-blue-400"></i>
                            Generar PDF
                        </button>
                        <button onclick="closeModal()" class="p-2.5 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"><i data-lucide="x" class="w-5 h-5"></i></button>
                    </div>
                </div>

                <!-- Tabs -->
                <div class="flex gap-8 border-b border-slate-100 mb-10">
                    <button onclick="window.viewConvocatoria(${id}, 'pizarra')" class="pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'pizarra' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600 opacity-60'}">
                        Pizarra Táctica
                        ${activeTab === 'pizarra' ? '<div class="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full animate-in slide-in-from-left duration-300"></div>' : ''}
                    </button>
                    <button onclick="window.viewConvocatoria(${id}, 'sesiones')" class="pb-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'sesiones' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600 opacity-60'}">
                        Sesiones de Trabajo
                        ${activeTab === 'sesiones' ? '<div class="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full animate-in slide-in-from-left duration-300"></div>' : ''}
                    </button>
                </div>

                ${activeTab === 'pizarra' ? `
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
                        <!-- List side -->
                        <div class="space-y-4">
                            ${(() => {
                        const clubCounts = convocados.reduce((acc, p) => {
                            let raw = (p.equipoConvenido || 'Sin Club').trim();
                            let key = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
                            if (!acc[key]) acc[key] = { name: raw, count: 0 };
                            acc[key].count++;
                            return acc;
                        }, {});

                        return `
                                    <div class="flex flex-wrap gap-2 mb-2 p-4 bg-slate-50/50 rounded-3xl border border-slate-100">
                                        <button onclick="window.setConvClubFilter('all', ${id})" class="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${window.currentConvClubFilter === 'all' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'bg-white text-slate-400 border border-slate-100 hover:border-blue-200'}">
                                            Todos (${convocados.length})
                                        </button>
                                        ${Object.entries(clubCounts).map(([key, data]) => `
                                            <button onclick="window.setConvClubFilter('${key}', ${id})" class="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${window.currentConvClubFilter === key ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-slate-400 border border-slate-100 hover:border-blue-200'}">
                                                <span class="truncate max-w-[100px]">${data.name}</span>
                                                <span class="px-1.5 py-0.5 rounded-md ${window.currentConvClubFilter === key ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'} font-bold">${data.count}</span>
                                            </button>
                                        `).join('')}
                                    </div>
                                `;
                    })()}

                            <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                                <div class="flex justify-between items-center px-6 py-4 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                                    <div class="flex gap-4">
                                        <span>#</span>
                                        <span>Jugador / Posición</span>
                                    </div>
                                    <div class="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1 rounded-full text-[9px]">
                                        <i data-lucide="users" class="w-3 h-3 text-blue-100"></i>
                                        <span>${convocados.length} CONVOCADOS</span>
                                    </div>
                                </div>
                                <div class="divide-y divide-slate-50">
                                    ${(() => {
                        const filtered = window.currentConvClubFilter === 'all'
                            ? convocados
                            : convocados.filter(p => {
                                const raw = (p.equipoConvenido || 'Sin Club').trim();
                                const key = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
                                return key === window.currentConvClubFilter;
                            });

                        if (filtered.length === 0) return '<p class="text-center py-20 text-slate-400 italic text-[10px] uppercase font-black tracking-widest">No hay jugadores para este club</p>';

                        return filtered.map((p, i) => `
                                            <div class="grid grid-cols-12 items-center p-4 hover:bg-slate-50 transition-colors">
                                                <div class="col-span-1 text-xs font-black text-blue-600">${i + 1}</div>
                                                <div class="col-span-11 flex justify-between items-center">
                                                    <div class="flex flex-col">
                                                        <span class="font-bold text-slate-800 text-sm truncate">${p.nombre}</span>
                                                        <span class="text-[9px] font-black text-blue-500 uppercase tracking-tighter">${p.equipoConvenido || 'Sin Club'}</span>
                                                    </div>
                                                    <select onchange="window.updateConvPlayerPosition(${id}, '${p.id}', this.value)" class="bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-blue-100 outline-none hover:bg-blue-100 transition-all cursor-pointer">
                                                        <option value="" ${!p.customPos ? 'selected' : ''}>Original (${window.parsePosition(p.originalPos)[0] || '--'})</option>
                                                        ${PLAYER_POSITIONS.map(pos => `<option value="${pos}" ${p.customPos === pos ? 'selected' : ''}>${pos}</option>`).join('')}
                                                    </select>
                                                </div>
                                            </div>
                                        `).join('');
                    })()}
                                </div>
                            </div>
                            
                            <div class="flex gap-4">
                                 <button onclick="closeModal()" class="w-full py-4 bg-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-300 transition-all">Cerrar Ficha</button>
                            </div>
                        </div>

                        <!-- Pitch side -->
                        <div class="space-y-4">
                            <div class="bg-slate-900 p-8 rounded-[3rem] shadow-2xl overflow-hidden relative group/pitch">
                                <div class="flex justify-between items-center mb-6">
                                    <h4 class="text-xs font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                                        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><circle cx="12" cy="12" r="3"/></svg>
                                        Pizarra Táctica
                                    </h4>
                                    <div class="flex items-center gap-2">
                                        <select onchange="window.updateModalPitch(this.value, '${conv.id}', 'Convocatoria')" class="p-2 bg-slate-800 border border-slate-700 rounded-xl text-[10px] font-black uppercase text-white outline-none shadow-sm cursor-pointer">
                                            ${Object.entries(FORMATIONS).map(([fid, f]) => {
                        const current = (window.formationsState && window.formationsState.convocatorias && window.formationsState.convocatorias[conv.id]) || 'F11_433';
                        return `<option value="${fid}" ${fid === current ? 'selected' : ''}>${f.name}</option>`;
                    }).join('')}
                                        </select>
                                        <button onclick="window.openFullScreenPitch('conv', '${conv.id}', '${(window.formationsState && window.formationsState.convocatorias && window.formationsState.convocatorias[conv.id]) || 'F11_433'}')" class="p-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-white/60 uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2">
                                            <i data-lucide="maximize" class="w-4 h-4"></i>
                                            Panorámica
                                        </button>
                                    </div>
                                </div>
                                <div id="modal-pitch-view" class="relative animate-in fade-in duration-500">
                                    ${renderTacticalPitchHtml(convocados, (window.formationsState && window.formationsState.convocatorias && window.formationsState.convocatorias[conv.id]) || 'F11_433', 'horizontal')}
                                </div>
                            </div>
                        </div>
                    </div>
                ` : `
                    <div id="async-sessions-container">
                         <div class="py-20 text-center"><div class="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div></div>
                    </div>
                `}
            </div>
        `;

            modalOverlay.classList.add('active');
            if (window.lucide) lucide.createIcons();

            // Reactive Player List based on teams
            const teamChecks = modalContainer.querySelectorAll('.conv-team-check');
            const mgmtList = document.getElementById('mgmt-player-list');

            // State for recruitment (persists across filter changes)
            let currentPids = [...pids];
            let currentCustomPositions = extra.pos ? { ...extra.pos } : {};

            const updateMgmtList = () => {
                const checkedTeamIds = Array.from(teamChecks).filter(c => c.checked).map(c => c.value);
                const clubFilter = document.getElementById('mgmt-club-filter')?.value || 'all';

                let filteredPlayers = players.filter(p => checkedTeamIds.includes(p.equipoid?.toString()));

                if (clubFilter !== 'all') {
                    filteredPlayers = filteredPlayers.filter(p => {
                        const raw = (p.equipoConvenido || 'Libre').trim();
                        const key = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
                        return key === clubFilter;
                    });
                }

                mgmtList.innerHTML = filteredPlayers.map(p => {
                    const isConvocado = currentPids.includes(p.id.toString());
                    const currentPos = currentCustomPositions[p.id] || p.posicion || '';

                    return `
                    <div class="flex flex-col gap-2 p-4 bg-white rounded-3xl border border-slate-100 mgmt-player-label shadow-sm hover:shadow-lg transition-all border-transparent hover:border-blue-100 group">
                        <div class="flex items-center gap-3">
                            <input type="checkbox" data-pid="${p.id}" ${isConvocado ? 'checked' : ''} class="w-5 h-5 rounded-xl text-blue-600 border-slate-200 focus:ring-blue-100 mgmt-player-check">
                            <div class="flex-1 min-w-0">
                                <p class="text-[11px] font-black text-slate-700 truncate mgmt-player-name uppercase tracking-tight">${p.nombre}</p>
                                <p class="text-[8px] text-slate-400 font-black uppercase tracking-widest">${p.equipoConvenido || 'Libre'}</p>
                            </div>
                        </div>
                        <div class="mt-2 pt-2 border-t border-slate-50 flex items-center gap-2">
                            <label class="text-[8px] font-black text-slate-300 uppercase shrink-0">POS:</label>
                            <select class="flex-1 p-1.5 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-600 outline-none mgmt-player-pos transition-all focus:bg-white focus:border-blue-200">
                                <option value="">${window.formatPosition(p.posicion)}</option>
                                ${PLAYER_POSITIONS.map(pos => `<option value="${pos}" ${currentPos === pos ? 'selected' : ''}>${pos}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                `;
                }).join('') || '<p class="col-span-full text-center py-10 text-slate-400 italic text-[10px] uppercase font-black">Selecciona al menos un equipo para ver jugadores.</p>';
            };

            teamChecks.forEach(cb => cb.onchange = updateMgmtList);
            const mgmtClubFilter = document.getElementById('mgmt-club-filter');
            if (mgmtClubFilter) mgmtClubFilter.onchange = updateMgmtList;




            // Toggle Player Management
            const toggleMgmtBtn = document.getElementById('toggle-player-mgmt');
            const mgmtArea = document.getElementById('player-mgmt-area');
            if (toggleMgmtBtn && mgmtArea) {
                toggleMgmtBtn.onclick = () => {
                    mgmtArea.classList.toggle('hidden');
                    if (window.lucide) lucide.createIcons();
                };
            }

            const mgmtPlayerSearch = document.getElementById('mgmt-player-search');
            if (mgmtPlayerSearch) {
                mgmtPlayerSearch.oninput = (e) => {
                    const term = e.target.value.toLowerCase();
                    const list = document.getElementById('mgmt-player-list');
                    const labels = list.querySelectorAll('.mgmt-player-label');
                    labels.forEach(label => {
                        const name = label.querySelector('.mgmt-player-name').textContent.toLowerCase();
                        label.style.display = name.includes(term) ? 'flex' : 'none';
                    });
                };
            }

            const savePlayersBtn = document.getElementById('save-conv-players');
            if (savePlayersBtn) {
                savePlayersBtn.onclick = async () => {
                    try {
                        // Update extra info with custom positions
                        let currentExtra = {};
                        if (rawConv.lugar && rawConv.lugar.includes(" ||| ")) {
                            try { currentExtra = JSON.parse(rawConv.lugar.split(" ||| ")[1]); } catch (e) { }
                        }
                        currentExtra.pos = currentCustomPositions;
                        const mainLugar = (rawConv.lugar || "").split(" ||| ")[0];
                        const updatedLugar = `${mainLugar} ||| ${JSON.stringify(currentExtra)}`;

                        await db.update('convocatorias', {
                            id: Number(id),
                            playerids: currentPids,
                            lugar: updatedLugar
                        });

                        // SYNC ASISTENCIA
                        try {
                            const allAsist = await db.getAll('asistencia');
                            let currentEids = [];
                            if (updatedLugar.includes(" ||| ")) {
                                try { const ex = JSON.parse(updatedLugar.split(" ||| ")[1]); currentEids = ex.eids || []; } catch (e) { }
                            }
                            const syncTeams = currentEids.length > 0 ? currentEids.map(String) : [String(conv.equipoid)];
                            const reports = allAsist.filter(a => a.fecha === conv.fecha && syncTeams.includes(String(a.equipoid)));
                            for (const r of reports) {
                                let changed = false;
                                const updatedPls = { ...r.players };
                                const newPidsStrings = currentPids.map(String);
                                for (const pid in updatedPls) {
                                    if (!newPidsStrings.includes(String(pid))) {
                                        delete updatedPls[pid];
                                        changed = true;
                                    }
                                }
                                if (changed) await db.update('asistencia', { ...r, players: updatedPls });
                            }
                        } catch (e) { console.warn("Asistencia sync failed:", e); }

                        window.customAlert('¡Convocatoria Actualizada!', 'Los jugadores y sus posiciones han sido guardados correctamente.', 'success');
                        window.viewConvocatoria(id, activeTab);

                        // Trigger a background refresh of the underlying list if possible
                        const currentViewSelection = document.querySelector('.nav-link.active')?.getAttribute('data-view');
                        if (currentViewSelection === 'convocatorias' || currentViewSelection === 'torneos') {
                            const container = document.getElementById('content-container');
                            if (container) {
                                if (currentViewSelection === 'convocatorias') window.renderConvocatorias(container);
                                else window.renderTorneos(container);
                            }
                        }
                    } catch (err) {
                        alert("Error actualizando: " + err.message);
                    }
                };
            }

            // Delegate listener for real-time count and state sync
            if (mgmtList) {
                mgmtList.onchange = (e) => {
                    const row = e.target.closest('.mgmt-player-label');
                    if (!row) return;
                    const pid = row.querySelector('.mgmt-player-check').getAttribute('data-pid');

                    if (e.target.classList.contains('mgmt-player-check')) {
                        if (e.target.checked) {
                            if (!currentPids.includes(pid.toString())) currentPids.push(pid.toString());
                        } else {
                            currentPids = currentPids.filter(id => id !== pid.toString());
                        }
                    }

                    if (e.target.classList.contains('mgmt-player-pos')) {
                        if (e.target.value) {
                            currentCustomPositions[pid] = e.target.value;
                        } else {
                            delete currentCustomPositions[pid];
                        }
                    }

                    const badge = document.getElementById('conv-player-count-badge');
                    if (badge) badge.textContent = currentPids.length;
                };
            }

            // Handle async sessions loading
            if (activeTab === 'sesiones') {
                const container = document.getElementById('async-sessions-container');
                const allSesiones = await db.getAll('sesiones');
                const convTeamIds = Array.isArray(conv.equipoid) ? conv.equipoid.map(String) : [String(conv.equipoid)];
                const relatedSesiones = allSesiones.filter(s => s.fecha === conv.fecha && convTeamIds.includes(String(s.equipoid)));

                if (relatedSesiones.length === 0) {
                    container.innerHTML = `
                    <div class="py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100">
                        <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <i data-lucide="calendar-x" class="w-8 h-8 text-slate-300"></i>
                        </div>
                        <p class="text-xs font-black text-slate-400 uppercase tracking-widest">No hay sesiones este día</p>
                    </div>
                `;
                } else {
                    container.innerHTML = `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        ${relatedSesiones.map(s => `
                            <div class="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-blue-100 transition-all group">
                                <h4 class="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">${s.titulo || 'Sesión'}</h4>
                                <button onclick="closeModal(); window.switchView('sesiones')" class="w-full py-4 bg-slate-900 text-white text-[10px] font-black uppercase rounded-2xl">Ver Sesión</button>
                            </div>
                        `).join('')}
                    </div>
                `;
                }
                if (window.lucide) lucide.createIcons();
            }

        } catch (err) {
            console.error("Error viewConvocatoria:", err);
            alert("Error abriendo convocatoria: " + err.message);
        }
    };

    window.updateConvPlayerPosition = async (convId, playerId, newPos) => {
        try {
            const { data: conv, error } = await supabaseClient.from("convocatorias").select("*").eq("id", convId).single();
            if (error) throw error;

            const { base: mainLugar, extra } = window.parseLugarMetadata(conv.lugar);

            if (!extra.pos) extra.pos = {};
            if (newPos === "") {
                delete extra.pos[playerId];
            } else {
                extra.pos[playerId] = newPos;
            }

            const updatedLugar = window.serializeLugarMetadata(mainLugar, extra);

            await db.update('convocatorias', {
                id: Number(convId),
                lugar: updatedLugar
            });

            window.viewConvocatoria(convId, 'pizarra');
        } catch (err) {
            console.error("Error updating player position:", err);
            window.customAlert('Error', 'No se pudo actualizar la posición.', 'error');
        }
    };

    window.setConvClubFilter = (club, id) => {
        window.currentConvClubFilter = club;
        window.viewConvocatoria(id, 'pizarra');
    };

    window.previewDocument = (url, name = 'Documento') => {
        const previewOverlay = document.getElementById('preview-overlay');
        const previewContainer = document.getElementById('preview-container');
        const previewContent = document.getElementById('preview-content');

        const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);
        const isPdf = /\.pdf$/i.test(url) || url.startsWith('blob:') || url.startsWith('data:application/pdf');

        // Ajustar ancho del contenedor si es PDF para mejor lectura
        if (isPdf) {
            previewContainer.classList.remove('max-w-4xl');
            previewContainer.classList.add('max-w-6xl');
        } else {
            previewContainer.classList.remove('max-w-6xl');
            previewContainer.classList.add('max-w-4xl');
        }

        previewContent.innerHTML = `
            <div class="p-4 md:p-8">
                <div class="mb-6 flex justify-between items-center px-4">
                    <div>
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">${name}</h3>
                    </div>
                </div>
                
                <div class="bg-slate-50 rounded-[2rem] border-2 border-slate-100 overflow-hidden shadow-inner flex items-center justify-center">
                    ${isImage ? `
                        <div class="p-4">
                            <img src="${url}" class="max-w-full h-auto shadow-2xl rounded-2xl">
                        </div>
                    ` : isPdf ? `
                        <div class="w-full h-[80vh]">
                            <object data="${url}" type="application/pdf" class="w-full h-full">
                                <iframe src="${url}" class="w-full h-full border-none">
                                    <div class="p-20 text-center">
                                        <p class="text-slate-500 font-bold mb-4">Tu navegador no permite la previsualización directa.</p>
                                        <a href="${url}" target="_blank" class="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold uppercase text-[10px]">Abrir en pestaña nueva</a>
                                    </div>
                                </iframe>
                            </object>
                        </div>
                    ` : `
                        <div class="text-center p-20">
                            <i data-lucide="file-warning" class="w-16 h-16 text-slate-300 mx-auto mb-4"></i>
                            <p class="text-slate-500 font-bold">No se puede previsualizar este tipo de archivo.</p>
                            <a href="${url}" target="_blank" class="mt-6 inline-block px-8 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs">Descargar Archivo</a>
                        </div>
                    `}
                </div>
            </div>
        `;

        previewOverlay.classList.remove('hidden');
        setTimeout(() => {
            previewOverlay.classList.add('opacity-100');
            previewOverlay.querySelector('#preview-container').classList.remove('scale-95');
        }, 10);
        if (window.lucide) lucide.createIcons();
    };


    window.previewConvocatoriaPDF = async (id) => {
        const url = await window.exportConvocatoria(id, 'preview');
        if (url) window.previewDocument(url, 'Convocatoria');
    };
    window.previewTorneoPDF = async (id) => {
        const url = await window.exportConvocatoria(id, 'preview');
        if (url) window.previewDocument(url, 'Ficha de Torneo');
    };

    window.handleTorneoDocUpload = async (id, files) => {
        if (!files || files.length === 0) return;
        const btn = document.querySelector(`button[onclick*="torneo-doc-upload"]`);
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="w-4 h-4 animate-spin text-blue-600">...</i>';

        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                // Probamos con la ruta 'tasks' que es la que sabemos que funciona para otros módulos
                const publicUrl = await db.uploadFile(file, 'tareas', 'tasks');
                return publicUrl ? { name: file.name, url: publicUrl } : null;
            });

            const results = (await Promise.all(uploadPromises)).filter(r => r !== null);

            if (results.length > 0) {
                // Buscamos la convocatoria asegurando el tipo de ID
                const { data: conv, error: fetchError } = await supabaseClient
                    .from('convocatorias')
                    .select('lugar')
                    .eq('id', Number(id))
                    .single();

                if (fetchError || !conv) {
                    console.error("Error buscando convocatoria:", fetchError);
                    window.customAlert('Error', 'No se ha podido localizar el torneo en la base de datos para guardar los archivos.', 'error');
                    return;
                }

                const metadata = window.getConvMetadata(conv);
                const docs = metadata.documentos || [];
                const updatedDocs = [...docs, ...results];

                await window.saveConvMetadata(id, 'documentos', updatedDocs);
                window.viewTorneoRendimiento(id);
                window.customAlert('Éxito', `${results.length} archivo(s) subido(s) correctamente`, 'success');
            }
        } catch (err) {
            console.error("Upload error details:", err);
            const errorMsg = err.message || err.error_description || 'Error de permisos o conexión';
            window.customAlert('Error al subir', `No se pudieron subir los archivos. Detalle: ${errorMsg}`, 'error');
        } finally {
            btn.innerHTML = originalHtml;
        }
    };

    window.deleteTorneoDoc = async (id, docIndex) => {
        if (!confirm('¿Seguro que quieres eliminar este documento?')) return;
        try {
            const { data: conv, error: fetchError } = await supabaseClient.from('convocatorias').select('lugar').eq('id', Number(id)).single();
            if (fetchError || !conv) throw new Error('No se pudo encontrar el torneo');

            const metadata = window.getConvMetadata(conv);
            const docs = metadata.documentos || [];
            docs.splice(docIndex, 1);

            await window.saveConvMetadata(id, 'documentos', docs);
            window.viewTorneoRendimiento(id);
        } catch (err) {
            console.error("Delete error:", err);
            window.customAlert('Error', 'No se pudo eliminar el documento: ' + err.message, 'error');
        }
    };

    window.exportConvocatoria = async (id, mode = 'download') => {
        const { data: conv, error } = await supabaseClient.from('convocatorias').select('*').eq('id', id).single();
        if (error) return;

        const players = await db.getAll('jugadores');
        const teams = window.getSortedTeams(await db.getAll('equipos'));
        const team = teams.find(t => t.id == conv.equipoid);
        const convocados = players.filter(p => conv.playerids.includes(p.id.toString()));

        // Aplicar posiciones específicas del torneo (herencia del rendimiento)
        const rendimiento = conv.rendimiento || {};
        const docs = window.getConvMetadata(conv).documentos || [];
        convocados.forEach(p => {
            if (rendimiento[p.id] && rendimiento[p.id].pos) {
                p.posicion = rendimiento[p.id].pos;
            }
        });

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Estilo de diseño
        const blueColor = [37, 99, 235];
        const slateColor = [30, 41, 59];

        // Añadir Logo si existe
        if (team && team.escudo) {
            try {
                doc.addImage(team.escudo, 'PNG', 15, 15, 20, 20);
            } catch (e) { console.error("Logo error:", e); }
        }

        // Título Cabecera
        doc.setFontSize(22);
        doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
        doc.setFont("helvetica", "bold");
        doc.text(conv.nombre.toUpperCase(), 45, 25);

        doc.setFontSize(10);
        doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
        doc.text(`CONVOCATORIA: ${conv.tipo.toUpperCase()}`, 45, 30);

        // Datos del Evento
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9);
        doc.text(`EQUIPO: ${team ? team.nombre : 'General'}`, 45, 37);
        doc.text(`FECHA: ${conv.fecha}   |   HORA: ${conv.hora || '--'}   |   LUGAR: ${window.cleanLugar(conv.lugar) || '--'}`, 45, 42);

        // Línea separadora
        doc.setDrawColor(241, 245, 249);
        doc.line(15, 50, 195, 50);

        // Tabla de Jugadores
        const isTorneo = (conv.tipo || '').toUpperCase() === 'TORNEO';
        const tableBody = convocados.map((p, index) => {
            const row = [
                index + 1,
                p.nombre,
                p.equipoConvenido || (team ? team.nombre : '--'),
                p.posicion || '--',
                p.anionacimiento || '--'
            ];
            if (isTorneo) {
                const rend = (conv.rendimiento && conv.rendimiento[p.id]) ? conv.rendimiento[p.id].score : '--';
                row.push(rend);
            }
            return row;
        });

        const tableHead = ['#', 'JUGADOR', 'CLUB / EQUIPO', 'POSICIÓN', 'AÑO'];
        if (isTorneo) tableHead.push('NOTA');

        doc.autoTable({
            startY: 55,
            head: [tableHead],
            body: tableBody,
            headStyles: {
                fillColor: blueColor,
                textColor: [255, 255, 255],
                fontSize: 10,
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: {
                fontSize: 9,
                textColor: [51, 65, 85],
                cellPadding: 4
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 15 },
                2: { halign: 'center' },
                3: { halign: 'center' },
                4: { halign: 'center' },
                5: { halign: 'center' }
            },
            margin: { left: 15, right: 15 }
        });

        // --- ADD TACTICAL PITCH (CAMPOGRAMA) ON NEW PAGE ---
        doc.addPage();

        // Titulo de la página
        doc.setFontSize(16);
        doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
        doc.text("DISPOSICIÓN TÁCTICA", 15, 25);

        let formationId = 'F11_433';
        if (window.formationsState) {
            if (isTorneo) formationId = window.formationsState.torneos?.[id] || 'F11_433';
            else formationId = window.formationsState.convocatorias?.[id] || 'F11_433';
        }
        const activeFormation = FORMATIONS[formationId] || FORMATIONS['F11_433'];
        doc.setFontSize(10);
        doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
        doc.text(`SISTEMA: ${activeFormation.name}`, 15, 32);

        // Draw Pitch Background
        const px = 15, py = 40, pw = 180, ph = 120;
        doc.setFillColor(26, 77, 46); // Dark green
        doc.roundedRect(px, py, pw, ph, 5, 5, 'F');

        // Draw Pitch Lines
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.3);

        // Outer line
        doc.rect(px + 10, py + 10, pw - 20, ph - 20);
        // Middle line
        doc.line(px + pw / 2, py + 10, px + pw / 2, py + ph - 10);
        // Center circle
        doc.circle(px + pw / 2, py + ph / 2, 12);

        // Areas
        // Left Area
        doc.rect(px + 10, py + ph / 2 - 25, 25, 50);
        doc.rect(px + 10, py + ph / 2 - 10, 8, 20);
        // Right Area
        doc.rect(px + pw - 35, py + ph / 2 - 25, 25, 50);
        doc.rect(px + pw - 18, py + ph / 2 - 10, 8, 20);

        // Draw Players - Intelligent Assignment
        const assignments = activeFormation.positions.map(() => []);
        const checkMatch = (pPos, targetSlot) => {
            const groupingRules = [
                { key: 'DC', list: ['DC', 'DCD', 'DCZ'] },
                { key: 'MC', list: ['MC', 'MCD', 'MCZ'] },
                { key: 'MP', list: ['MP', 'MPD', 'MPZ'] },
                { key: 'AC', list: ['AC', 'ACD', 'ACZ'] }
            ];
            for (const rule of groupingRules) {
                if (rule.list.includes(targetSlot)) {
                    const countInFormation = activeFormation.positions.filter(p => rule.list.includes(p.pos)).length;
                    if (countInFormation === 1) return rule.list.includes(pPos);
                }
            }
            const staticGroups = {
                'PO': ['PO', 'POR', 'GK', 'POD', 'POZ'],
                'DBD': ['DBD', 'LD', 'CAD'],
                'DBZ': ['DBZ', 'LI', 'CAI'],
                'DCD': ['DCD', 'DFC', 'CD'],
                'DCZ': ['DCZ', 'DFC', 'CZ']
            };
            if (staticGroups[targetSlot]) return staticGroups[targetSlot].includes(pPos);
            return pPos === targetSlot;
        };

        (convocados || []).forEach(player => {
            const rawPos = player.posicion || '--';
            const choices = rawPos.split(',').map(c => c.trim());

            let validSlots = [];
            // P1
            activeFormation.positions.forEach((s, idx) => {
                if (checkMatch(choices[0], s.pos)) validSlots.push({ idx, priority: 1 });
            });
            // P2
            if (choices[1]) {
                activeFormation.positions.forEach((s, idx) => {
                    if (checkMatch(choices[1], s.pos)) validSlots.push({ idx, priority: 2 });
                });
            }

            if (validSlots.length === 0) return;

            // Sort by occupancy, then priority
            validSlots.sort((a, b) => {
                const countA = assignments[a.idx].length;
                const countB = assignments[b.idx].length;
                if (countA !== countB) return countA - countB;
                return a.priority - b.priority;
            });

            assignments[validSlots[0].idx].push(player);
        });

        activeFormation.positions.forEach((pos, idx) => {
            const playersInPos = assignments[idx];

            // Renaming logic for single slots
            let displayPos = pos.pos;
            const groupingRules = [
                { key: 'DC', list: ['DC', 'DCD', 'DCZ'] },
                { key: 'MC', list: ['MC. ', 'MCD', 'MCZ'] },
                { key: 'MP', list: ['MP', 'MPD', 'MPZ'] },
                { key: 'AC', list: ['AC', 'ACD', 'ACZ'] }
            ];
            for (const rule of groupingRules) {
                if (rule.list.includes(pos.pos)) {
                    const countInFormation = activeFormation.positions.filter(p => rule.list.includes(p.pos)).length;
                    if (countInFormation === 1) displayPos = rule.key;
                }
            }

            const realX = px + 10 + (pos.x * (pw - 20) / 100);
            const realY = py + 10 + (pos.y * (ph - 20) / 100);

            // Always render Position Icon (Circle)
            doc.setFillColor(255, 255, 255);
            doc.circle(realX, realY, 4, 'F');

            // Position Text
            doc.setFontSize(5);
            doc.setTextColor(0, 0, 0);
            doc.setFont("Montserrat", "bold");
            doc.text(pos.pos, realX, realY + 0.5, { align: 'center' });

            // Render Player Names (if any)
            playersInPos.forEach((player, idx) => {
                // Player Name Tag (Stacked)
                const offsetY = 5 + (idx * 5); // Shift down for each player
                doc.setFillColor(30, 41, 59); // Slate 800
                doc.rect(realX - 8, realY + offsetY, 16, 4, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(4.5);
                const parts = player.nombre.trim().split(/\s+/);
                const shortName = (parts.length > 1 ? `${parts[0]}. ${parts[1][0]}` : parts[0]).toUpperCase();
                doc.text(shortName, realX, realY + offsetY + 2.8, { align: 'center' });
            });
        });

        doc.setFont("helvetica", "normal"); // Reset font

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`Generado por RS CENTRO - Página ${i} de ${pageCount}`, 150, 285);
        }

        if (mode === 'preview') {
            const blob = doc.output('blob');
            return URL.createObjectURL(blob);
        } else {
            doc.save(`Convocatoria_${conv.nombre}_${conv.fecha}.pdf`);
        }
    };

    window.exportSessionPDF = async (id, mode = 'download') => {
        const { jsPDF } = window.jspdf;
        const session = (await db.getAll('sesiones')).find(s => s.id == id);
        if (!session) return;

        const allTasks = await db.getAll('tareas');
        const teams = window.getSortedTeams(await db.getAll('equipos'));
        const players = await db.getAll('jugadores');

        const currentTeam = teams.find(t => t.id == session.equipoid);
        const sessionTasks = (session.taskids || []).map(taskId => allTasks.find(t => t.id == taskId)).filter(Boolean);
        const sessionPlayers = players.filter(p => (session.playerids || []).includes(p.id.toString()));

        // Aggregate materials from tasks
        const materials = [...new Set(sessionTasks.flatMap(t => (t.material || '').split(',').map(m => m.trim()).filter(m => m)))].join(', ').toUpperCase();

        const doc = new jsPDF();
        const blue = [37, 99, 235];
        const slate = [30, 41, 59];
        const gray = [100, 116, 139];
        const lightGray = [241, 245, 249];

        // --- PAGE 1: HEADER & SUMMARY ---
        // Header info
        doc.setFontSize(8);
        doc.setTextColor(gray[0], gray[1], gray[2]);
        doc.setFont("helvetica", "bold");

        // Main Labels
        doc.text("NOMBRE DE LA SESIÓN", 20, 25);
        doc.text("EQUIPO", 100, 25);
        doc.text("FECHA / HORA", 135, 25);

        // Lugar with blue bracket
        doc.setDrawColor(blue[0], blue[1], blue[2]);
        doc.setLineWidth(1.5);
        doc.line(165, 22, 165, 38);
        doc.line(165, 22, 167, 22);
        doc.line(165, 38, 167, 38);
        doc.text("LUGAR", 170, 25);

        // Values
        doc.setFontSize(9);
        doc.setTextColor(slate[0], slate[1], slate[2]);

        // Use maxWidth to prevent overlapping
        const sessionTitle = (session.titulo || 'S/N').toUpperCase();
        doc.text(sessionTitle, 20, 32, { maxWidth: 75 });

        doc.text((session.equiponombre || 'GENERACIÓN').toUpperCase(), 100, 32, { maxWidth: 30 });
        doc.text(`${session.fecha}\n${session.hora || '--:--'}`, 135, 32);
        doc.text((window.cleanLugar(session.lugar) || 'ZUBIETA').toUpperCase(), 170, 32, { maxWidth: 25 });

        // Summary Boxes
        let boxY = 48;
        doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.setLineWidth(0.5);

        // Convocatoria & Material Box
        doc.roundedRect(15, boxY, 110, 25, 5, 5, 'D');
        doc.setFontSize(7);
        doc.setTextColor(gray[0], gray[1], gray[2]);
        doc.text("CONVOCATORIA", 22, boxY + 8);
        doc.text("MATERIAL REQUERIDO", 60, boxY + 8);

        doc.setFontSize(10);
        doc.setTextColor(slate[0], slate[1], slate[2]);
        doc.text(`${sessionPlayers.length}`, 22, boxY + 15);
        doc.setFontSize(8);
        doc.text("JUGADORES", 22, boxY + 20);

        doc.setFontSize(8);
        const materialLines = doc.splitTextToSize(materials || 'BALONES, CHINOS, PETOS', 65);
        doc.text(materialLines, 60, boxY + 15);

        // Ejercicios Count Box
        doc.roundedRect(130, boxY, 65, 25, 5, 5, 'D');
        doc.setFontSize(16);
        doc.setTextColor(blue[0], blue[1], blue[2]);
        doc.text(`${sessionTasks.length}`, 145, boxY + 16);
        doc.setFontSize(8);
        doc.setTextColor(gray[0], gray[1], gray[2]);
        doc.text("EJERCICIOS", 155, boxY + 15);

        // Player List
        let listY = 85;
        doc.roundedRect(15, listY, 180, 45, 8, 8, 'D');
        doc.setFontSize(8);
        doc.setTextColor(gray[0], gray[1], gray[2]);
        doc.text("LISTADO DE JUGADORES CONVOCADOS", 22, listY + 8);

        doc.setFontSize(6.5);
        doc.setTextColor(slate[0], slate[1], slate[2]);
        let colW = 60; // Increased width
        let startX = 22;
        sessionPlayers.forEach((p, i) => {
            let col = i % 3; // 3 columns instead of 4 to give more space
            let row = Math.floor(i / 3);
            if (row > 4) return; // Cap at 15 for this box layout

            // Format: Nombre. Inicial del 1er Apellido + (Club)
            const nameParts = p.nombre.trim().split(/\s+/);
            const shortName = (nameParts.length > 1 ? `${nameParts[0]}. ${nameParts[1][0]}` : nameParts[0]).toUpperCase();
            const club = p.equipoConvenido ? `(${p.equipoConvenido})` : '';
            const playerStr = `${shortName} ${club}`.toUpperCase();

            doc.text(playerStr, startX + (col * colW), listY + 18 + (row * 6), { maxWidth: 58 });
        });

        // --- TASK BREAKDOWN ---
        let currentY = 140;
        doc.setFontSize(10);
        doc.setTextColor(slate[0], slate[1], slate[2]);
        doc.text("DESGLOSE DE TAREAS - PARTE I", 15, currentY);
        doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.line(15, currentY + 3, 195, currentY + 3);

        currentY += 15;

        sessionTasks.forEach((t, i) => {
            // Pagination logic: Task 1 (i=0) on Page 1. Task 2 (i=1) starts Page 2. 
            // Then every 2 tasks start a new page (i=3, 5, etc.)
            if (i === 1 || (i > 1 && (i - 1) % 2 === 0)) {
                doc.addPage();
                currentY = 25;
                doc.setFontSize(9);
                doc.setTextColor(gray[0], gray[1], gray[2]);
                doc.text(`DESGLOSE DE TAREAS - PARTE ${Math.floor((i - 1) / 2) + 2}`, 15, currentY);
                doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
                doc.line(15, currentY + 3, 195, currentY + 3);
                currentY += 15;
            }

            // Task Header with Blue Bar
            doc.setFillColor(blue[0], blue[1], blue[2]);
            doc.rect(15, currentY - 5, 2, 8, 'F');
            doc.setFontSize(11);
            doc.setTextColor(slate[0], slate[1], slate[2]);
            doc.text(`${i + 1}. ${(t.name || 'Tarea').toUpperCase()}`, 20, currentY + 1);

            // Task Box
            let taskBoxY = currentY + 8;
            doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
            doc.roundedRect(15, taskBoxY, 180, 65, 5, 5, 'D');

            // Image (Left)
            if (t.image) {
                try { doc.addImage(t.image, 'JPEG', 18, taskBoxY + 5, 85, 55); } catch (e) {
                    doc.setDrawColor(240, 240, 240);
                    doc.rect(18, taskBoxY + 5, 85, 55);
                }
            } else {
                doc.setDrawColor(240, 240, 240);
                doc.rect(18, taskBoxY + 5, 85, 55);
            }

            // Description (Right)
            doc.setFontSize(8);
            doc.setTextColor(gray[0], gray[1], gray[2]);
            doc.text("EXPLICACIÓN TÉCNICA", 110, taskBoxY + 10);
            doc.setFont("Montserrat", "bold");
            doc.setTextColor(slate[0], slate[1], slate[2]);
            const splitDesc = doc.splitTextToSize(t.description || 'Sin descripción.', 80);
            doc.text(splitDesc, 110, taskBoxY + 18);

            // Video Button (Interactive)
            if (t.video) {
                const videoUrl = t.video.startsWith('http') ? t.video : `https://drive.google.com/open?id=${t.video}`;
                const vidX = 110;
                const vidY = taskBoxY + 45;

                doc.setFillColor(239, 246, 255);
                doc.roundedRect(vidX - 2, vidY - 2, 75, 18, 3, 3, 'F');

                doc.setFillColor(blue[0], blue[1], blue[2]);
                doc.roundedRect(vidX, vidY, 12, 12, 2, 2, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(10);
                doc.text(">", vidX + 6, vidY + 8.5, { align: 'center' });

                doc.setTextColor(blue[0], blue[1], blue[2]);
                doc.setFontSize(7);
                doc.setFont("Montserrat", "bold");
                doc.text("VER VIDEO INTERACTIVO", vidX + 16, vidY + 7);

                doc.link(vidX, vidY, 75, 18, { url: videoUrl });

                try {
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(videoUrl)}`;
                    doc.addImage(qrUrl, 'PNG', vidX + 60, vidY - 2, 14, 14);
                } catch (e) { }
            }

            currentY += 85;
        });

        // Final Footer & Page Numbers
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(gray[0], gray[1], gray[2]);
            doc.text("https://rs-centro.vercel.app", 15, 285);
            doc.text(`${i}/${pageCount}`, 190, 285, { align: 'right' });
        }

        if (mode === 'preview') {
            const blob = doc.output('blob');
            return URL.createObjectURL(blob);
        } else {
            doc.save(`Sesion_${session.titulo || 'Entrenamiento'}_${session.fecha}.pdf`);
        }
    };

    window.previewSessionPDF = async (id) => {
        const url = await window.exportSessionPDF(id, 'preview');
        if (url) window.previewDocument(url, 'Ficha de Sesión');
    };

    // PDF Generation Utilities


    const FORMATIONS = {
        // --- FÚTBOL 11 ---
        'F11_433': {
            name: '4-3-3 (F11)', positions: [
                { pos: 'PO', x: 8, y: 50 }, { pos: 'DBD', x: 28, y: 85 }, { pos: 'DCD', x: 28, y: 65 }, { pos: 'DCZ', x: 28, y: 35 }, { pos: 'DBZ', x: 28, y: 15 },
                { pos: 'MCD', x: 48, y: 50 }, { pos: 'MVD', x: 65, y: 75 }, { pos: 'MVZ', x: 65, y: 25 }, { pos: 'MBD', x: 85, y: 85 }, { pos: 'ACZ', x: 92, y: 50 }, { pos: 'MBZ', x: 85, y: 15 }
            ]
        },
        'F11_442': {
            name: '4-4-2 (F11)', positions: [
                { pos: 'PO', x: 8, y: 50 }, { pos: 'DBD', x: 28, y: 85 }, { pos: 'DCD', x: 28, y: 65 }, { pos: 'DCZ', x: 28, y: 35 }, { pos: 'DBZ', x: 28, y: 15 },
                { pos: 'MBD', x: 55, y: 85 }, { pos: 'MCD', x: 55, y: 60 }, { pos: 'MCZ', x: 55, y: 40 }, { pos: 'MBZ', x: 55, y: 15 }, { pos: 'ACD', x: 90, y: 60 }, { pos: 'ACZ', x: 90, y: 40 }
            ]
        },
        'F11_4231': {
            name: '4-2-3-1 (F11)', positions: [
                { pos: 'PO', x: 8, y: 50 }, { pos: 'DBD', x: 25, y: 85 }, { pos: 'DCD', x: 25, y: 65 }, { pos: 'DCZ', x: 25, y: 35 }, { pos: 'DBZ', x: 25, y: 15 },
                { pos: 'MCD', x: 45, y: 65 }, { pos: 'MCZ', x: 45, y: 35 }, { pos: 'MBD', x: 70, y: 85 }, { pos: 'MPZ', x: 70, y: 50 }, { pos: 'MBZ', x: 70, y: 15 }, { pos: 'ACZ', x: 92, y: 50 }
            ]
        },
        'F11_352': {
            name: '3-5-2 (F11)', positions: [
                { pos: 'PO', x: 8, y: 50 }, { pos: 'DBD', x: 25, y: 75 }, { pos: 'DCD', x: 25, y: 50 }, { pos: 'DBZ', x: 25, y: 25 },
                { pos: 'MBD', x: 50, y: 90 }, { pos: 'MCD', x: 50, y: 65 }, { pos: 'MCZ', x: 50, y: 35 }, { pos: 'MBZ', x: 50, y: 10 }, { pos: 'MPZ', x: 68, y: 50 },
                { pos: 'ACD', x: 90, y: 65 }, { pos: 'ACZ', x: 90, y: 35 }
            ]
        },
        'F11_541': {
            name: '5-4-1 (F11)', positions: [
                { pos: 'PO', x: 8, y: 50 }, { pos: 'DBD', x: 25, y: 90 }, { pos: 'DCD', x: 25, y: 70 }, { pos: 'DCZ', x: 25, y: 50 }, { pos: 'DCD', x: 25, y: 30 }, { pos: 'DBZ', x: 25, y: 10 },
                { pos: 'MBD', x: 55, y: 80 }, { pos: 'MCD', x: 55, y: 60 }, { pos: 'MCZ', x: 55, y: 40 }, { pos: 'MBZ', x: 55, y: 20 }, { pos: 'ACZ', x: 92, y: 50 }
            ]
        },
        'F11_4141': {
            name: '4-1-4-1 (F11)', positions: [
                { pos: 'PO', x: 8, y: 50 }, { pos: 'DBD', x: 25, y: 85 }, { pos: 'DCD', x: 25, y: 65 }, { pos: 'DCZ', x: 25, y: 35 }, { pos: 'DBZ', x: 25, y: 15 },
                { pos: 'MCD', x: 45, y: 50 }, { pos: 'MVD', x: 65, y: 80 }, { pos: 'MVD', x: 65, y: 60 }, { pos: 'MVZ', x: 65, y: 40 }, { pos: 'MVZ', x: 65, y: 20 }, { pos: 'ACZ', x: 90, y: 50 }
            ]
        },

        // --- FÚTBOL 8 ---
        'F8_331': {
            name: '3-3-1 (F8)', positions: [
                { pos: 'PO', x: 8, y: 50 }, { pos: 'DBD', x: 25, y: 80 }, { pos: 'DCD', x: 25, y: 50 }, { pos: 'DBZ', x: 25, y: 20 },
                { pos: 'MVD', x: 55, y: 80 }, { pos: 'MCD', x: 55, y: 50 }, { pos: 'MVZ', x: 55, y: 20 }, { pos: 'ACZ', x: 90, y: 50 }
            ]
        },
        'F8_322': {
            name: '3-2-2 (F8)', positions: [
                { pos: 'PO', x: 8, y: 50 }, { pos: 'DBD', x: 25, y: 80 }, { pos: 'DCD', x: 25, y: 50 }, { pos: 'DBZ', x: 25, y: 20 },
                { pos: 'MCD', x: 55, y: 65 }, { pos: 'MCZ', x: 55, y: 35 }, { pos: 'ACD', x: 90, y: 65 }, { pos: 'ACZ', x: 90, y: 35 }
            ]
        },
        'F8_241': {
            name: '2-4-1 (F8)', positions: [
                { pos: 'PO', x: 8, y: 50 }, { pos: 'DCD', x: 25, y: 65 }, { pos: 'DCZ', x: 25, y: 35 },
                { pos: 'MBD', x: 55, y: 90 }, { pos: 'MCD', x: 55, y: 65 }, { pos: 'MCZ', x: 55, y: 35 }, { pos: 'MBZ', x: 55, y: 10 }, { pos: 'ACZ', x: 90, y: 50 }
            ]
        },

        // --- FÚTBOL 7 ---
        'F7_321': {
            name: '3-2-1 (F7)', positions: [
                { pos: 'PO', x: 10, y: 50 }, { pos: 'DBD', x: 30, y: 80 }, { pos: 'DCD', x: 30, y: 50 }, { pos: 'DBZ', x: 30, y: 20 },
                { pos: 'MCD', x: 60, y: 65 }, { pos: 'MCZ', x: 60, y: 35 }, { pos: 'ACZ', x: 90, y: 50 }
            ]
        },
        'F7_231': {
            name: '2-3-1 (F7)', positions: [
                { pos: 'PO', x: 10, y: 50 }, { pos: 'DCD', x: 30, y: 65 }, { pos: 'DCZ', x: 30, y: 35 },
                { pos: 'MVD', x: 55, y: 85 }, { pos: 'MCD', x: 55, y: 50 }, { pos: 'MVZ', x: 55, y: 15 }, { pos: 'ACZ', x: 90, y: 50 }
            ]
        },
        'F7_132': {
            name: '1-3-2 (F7)', positions: [
                { pos: 'PO', x: 10, y: 50 }, { pos: 'DCD', x: 30, y: 50 },
                { pos: 'MBD', x: 55, y: 85 }, { pos: 'MCD', x: 55, y: 50 }, { pos: 'MBZ', x: 55, y: 15 }, { pos: 'ACD', x: 90, y: 65 }, { pos: 'ACZ', x: 90, y: 35 }
            ]
        },
        'F7_312': {
            name: '3-1-2 (F7)', positions: [
                { pos: 'PO', x: 10, y: 50 }, { pos: 'DBD', x: 30, y: 80 }, { pos: 'DCD', x: 30, y: 50 }, { pos: 'DBZ', x: 30, y: 20 },
                { pos: 'MCD', x: 60, y: 50 }, { pos: 'ACD', x: 92, y: 65 }, { pos: 'ACZ', x: 92, y: 35 }
            ]
        }
    };

    function renderTacticalPitchHtml(filteredPlayers, formationId = 'F11_433', orientation = 'horizontal') {
        const activeFormation = FORMATIONS[formationId] || FORMATIONS['F11_433'];

        // Force vertical on mobile for better visibility
        if (window.innerWidth < 768) orientation = 'vertical';
        const isVert = orientation === 'vertical';

        const aspect = isVert ? 'aspect-[2/3]' : 'aspect-[3/2]';
        const bgGradient = isVert ?
            'repeating-linear-gradient(0deg, #1a4d2e, #1a4d2e 40px, #164328 40px, #164328 80px)' :
            'repeating-linear-gradient(90deg, #1a4d2e, #1a4d2e 40px, #164328 40px, #164328 80px)';

        return `
            <div class="relative w-full mx-auto ${aspect} max-h-[70vh] md:max-h-[85vh] bg-[#1a4d2e] rounded-[2.5rem] p-4 shadow-xl overflow-hidden border-[10px] border-[#133a22] group/pitch">
                <!-- Grass Stripes -->
                <div class="absolute inset-0 pointer-events-none" style="background: ${bgGradient};"></div>
                
                <!-- Pitch Lines -->
                <div class="absolute inset-4 border-2 border-white/20 rounded-[1.5rem] pointer-events-none">
                    ${isVert ? `
                        <!-- Vertical Pitch Lines -->
                        <div class="absolute top-1/2 left-0 right-0 h-[2px] bg-white/20"></div>
                        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/20 rounded-full"></div>
                        <!-- Bottom Area -->
                        <div class="absolute bottom-0 left-1/2 -translate-x-1/2 h-[18%] w-[68%] border-2 border-white/20 border-b-0"></div>
                        <div class="absolute bottom-0 left-1/2 -translate-x-1/2 h-[6%] w-[32%] border-2 border-white/20 border-b-0"></div>
                        <div class="absolute bottom-[18%] left-1/2 -translate-x-1/2 h-[8%] w-[30%] border-2 border-white/20 border-b-0 rounded-t-full"></div>
                        <!-- Top Area -->
                        <div class="absolute top-0 left-1/2 -translate-x-1/2 h-[18%] w-[68%] border-2 border-white/20 border-t-0"></div>
                        <div class="absolute top-0 left-1/2 -translate-x-1/2 h-[6%] w-[32%] border-2 border-white/20 border-t-0"></div>
                        <div class="absolute top-[18%] left-1/2 -translate-x-1/2 h-[8%] w-[30%] border-2 border-white/20 border-t-0 rounded-b-full"></div>
                    ` : `
                        <!-- Horizontal Pitch Lines -->
                        <div class="absolute left-1/2 top-0 bottom-0 w-[2px] bg-white/20"></div>
                        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white/20 rounded-full"></div>
                        <!-- Left Area -->
                        <div class="absolute left-0 top-1/2 -translate-y-1/2 w-[18%] h-[68%] border-2 border-white/20 border-l-0"></div>
                        <div class="absolute left-0 top-1/2 -translate-y-1/2 w-[6%] h-[32%] border-2 border-white/20 border-l-0"></div>
                        <div class="absolute left-[18%] top-1/2 -translate-y-1/2 w-[8%] h-[30%] border-2 border-white/20 border-l-0 rounded-r-full"></div>
                        <!-- Right Area -->
                        <div class="absolute right-0 top-1/2 -translate-y-1/2 w-[18%] h-[68%] border-2 border-white/20 border-r-0"></div>
                        <div class="absolute right-0 top-1/2 -translate-y-1/2 w-[6%] h-[32%] border-2 border-white/20 border-r-0"></div>
                        <div class="absolute right-[18%] top-1/2 -translate-y-1/2 w-[8%] h-[30%] border-2 border-white/20 border-r-0 rounded-l-full"></div>
                    `}
                </div>

                ${(() => {
                const assignments = activeFormation.positions.map(() => []);

                const checkMatch = (pPos, targetSlot) => {
                    const groupingRules = [
                        { key: 'DC', list: ['DC', 'DCD', 'DCZ'] },
                        { key: 'MC', list: ['MC', 'MCD', 'MCZ'] },
                        { key: 'MP', list: ['MP', 'MPD', 'MPZ'] },
                        { key: 'AC', list: ['AC', 'ACD', 'ACZ'] }
                    ];
                    for (const rule of groupingRules) {
                        if (rule.list.includes(targetSlot)) {
                            const countInFormation = activeFormation.positions.filter(p => rule.list.includes(p.pos)).length;
                            if (countInFormation === 1) return rule.list.includes(pPos);
                        }
                    }
                    const staticGroups = {
                        'PO': ['PO', 'POR', 'GK', 'POD', 'POZ'],
                        'DBD': ['DBD', 'LD', 'CAD'],
                        'DBZ': ['DBZ', 'LI', 'CAI'],
                        'DCD': ['DCD', 'DFC', 'CD'],
                        'DCZ': ['DCZ', 'DFC', 'CZ']
                    };
                    if (staticGroups[targetSlot]) return staticGroups[targetSlot].includes(pPos);
                    return pPos === targetSlot;
                };

                (filteredPlayers || []).forEach(player => {
                    const choices = window.parsePosition(player.posicion);
                    if (choices.length === 0) return;

                    let validSlots = [];
                    activeFormation.positions.forEach((s, idx) => {
                        if (checkMatch(choices[0], s.pos)) validSlots.push({ idx, priority: 1 });
                    });
                    if (choices[1]) {
                        activeFormation.positions.forEach((s, idx) => {
                            if (checkMatch(choices[1], s.pos)) validSlots.push({ idx, priority: 2 });
                        });
                    }

                    if (validSlots.length === 0) return;

                    validSlots.sort((a, b) => {
                        const countA = assignments[a.idx].length;
                        const countB = assignments[b.idx].length;
                        if (countA !== countB) return countA - countB;
                        return a.priority - b.priority;
                    });

                    assignments[validSlots[0].idx].push(player);
                });

                return activeFormation.positions.map((pos, idx) => {
                    let displayPos = pos.pos;
                    const playersInPos = assignments[idx];

                    const groupingRules = [
                        { key: 'DC', list: ['DC', 'DCD', 'DCZ'] },
                        { key: 'MC', list: ['MC', 'MCD', 'MCZ'] },
                        { key: 'MP', list: ['MP', 'MPD', 'MPZ'] },
                        { key: 'AC', list: ['AC', 'ACD', 'ACZ'] }
                    ];
                    for (const rule of groupingRules) {
                        if (rule.list.includes(pos.pos)) {
                            const countInFormation = activeFormation.positions.filter(p => rule.list.includes(p.pos)).length;
                            if (countInFormation === 1) displayPos = rule.key;
                        }
                    }

                    // Map coordinates based on orientation
                    const left = isVert ? pos.y : pos.x;
                    const top = isVert ? (100 - pos.x) : pos.y;

                    return `
                        <div class="absolute flex flex-col items-center" style="left: ${left}%; top: ${top}%; transform: translate(-50%, -50%); z-index: 10;">
                            <div class="w-8 h-8 bg-white/95 rounded-full flex items-center justify-center shadow-lg mb-1 border-2 border-slate-900/10">
                                <span class="text-[9px] font-black text-slate-800">${displayPos}</span>
                            </div>
                            <div class="flex flex-col gap-0.5 w-[75px]">
                                ${playersInPos.map(player => `
                                    <div class="bg-slate-900 border border-white/10 px-2 py-1.5 rounded-xl shadow-xl overflow-hidden">
                                        <p class="text-[8px] font-black text-white text-center uppercase truncate">${(() => {
                            const parts = player.nombre.trim().split(/\s+/);
                            return parts.length > 1 ? `${parts[0]}. ${parts[1][0]}` : parts[0];
                        })()}</p>
                                        <div class="flex justify-center gap-0.5 mt-0.5">
                                            ${Array(Number(player.nivel || 3)).fill(0).map(() => `<div class="w-1.5 h-1.5 bg-amber-400 rounded-full"></div>`).join('')}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')
            })()}
            </div>
        `;
    }

    async function renderCampograma(container) {
        const players = await db.getAll('jugadores');
        const teams = window.getSortedTeams(await db.getAll('equipos'));
        const years = [...new Set(players.map(p => p.anionacimiento).filter(y => y))].sort((a, b) => b - a);
        const clubs = [...new Set(players.map(p => p.equipoConvenido).filter(c => c))].sort();

        const hasActiveFilters =
            campogramaFilters.equipos.length > 0 ||
            campogramaFilters.posiciones.length > 0 ||
            campogramaFilters.years.length > 0 ||
            campogramaFilters.clubesConvenidos.length > 0 ||
            campogramaFilters.niveles.length > 0;

        const filteredPlayers = !hasActiveFilters ? [] : players.filter(p => {
            const teamMatch = campogramaFilters.equipos.length === 0 || campogramaFilters.equipos.includes((p.equipoid || "").toString());
            const levelMatch = campogramaFilters.niveles.length === 0 || campogramaFilters.niveles.includes(Number(p.nivel || 3));

            const playerPositions = window.parsePosition(p.posicion);
            const posMatch = campogramaFilters.posiciones.length === 0 || playerPositions.some(pos => campogramaFilters.posiciones.includes(pos));

            const yearMatch = campogramaFilters.years.length === 0 || campogramaFilters.years.includes(p.anionacimiento?.toString());
            const clubMatch = campogramaFilters.clubesConvenidos.length === 0 || campogramaFilters.clubesConvenidos.includes(p.equipoConvenido);
            return teamMatch && levelMatch && posMatch && yearMatch && clubMatch;
        });

        const renderMultiSelect = (label, options, selectedValues, onToggle, id) => {
            const labelText = selectedValues.length === 0 ? `TODOS (${options.length})` : `${selectedValues.length} SELECCIONADOS`;
            return `
                <div class="space-y-2 relative group/ms">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">${label}</label>
                    <button onclick="document.getElementById('${id}-menu').classList.toggle('hidden')" 
                        class="w-full p-4 bg-slate-900 border-none rounded-2xl font-bold text-white text-xs uppercase tracking-widest flex justify-between items-center hover:bg-black transition-all">
                        <span>${labelText}</span>
                        <i data-lucide="chevron-down" class="w-4 h-4 opacity-50"></i>
                    </button>
                    <!-- Floating Menu -->
                    <div id="${id}-menu" class="hidden absolute z-[50] top-full left-0 w-64 bg-white border border-slate-100 shadow-2xl rounded-3xl mt-2 p-4 max-h-64 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-200">
                        <div class="space-y-1">
                            ${options.map(opt => {
                const isSelected = selectedValues.includes(opt.value.toString());
                return `
                                    <label class="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                        <input type="checkbox" onchange="${onToggle}('${opt.value}')" ${isSelected ? 'checked' : ''} 
                                            class="w-5 h-5 rounded-md border-2 border-slate-200 text-blue-600 focus:ring-4 focus:ring-blue-100">
                                        <span class="text-xs font-bold ${isSelected ? 'text-blue-600' : 'text-slate-600'}">${opt.label.toUpperCase()}</span>
                                    </label>
                                `;
            }).join('')}
                        </div>
                    </div>
                </div>
            `;
        };

        container.innerHTML = `
            <!-- Advanced Scouting Filters - Optimized Grid -->
            <div class="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-2xl mb-12">
                <div class="grid grid-cols-1 md:grid-cols-6 gap-6">
                    <!-- Sistema & Full Screen -->
                    <div class="col-span-1 md:col-span-2 space-y-2">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Sistema & Pizarra</label>
                        <div class="flex gap-2">
                            <select onchange="window.updateCampogramaFilter('sistema', this.value)" 
                                class="flex-1 p-4 bg-blue-600 text-white border-none rounded-2xl font-black text-xs uppercase tracking-widest outline-none hover:bg-blue-700 transition-all cursor-pointer appearance-none text-center shadow-lg shadow-blue-600/20">
                                ${Object.entries(FORMATIONS).map(([id, f]) => `<option value="${id}" ${campogramaFilters.sistema === id ? 'selected' : ''}>${f.name}</option>`).join('')}
                            </select>
                            <button onclick="window.openFullScreenPitch('scouting', null, '${campogramaFilters.sistema}')" class="p-4 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all shadow-lg flex items-center justify-center">
                                <i data-lucide="maximize-2" class="w-5 h-5"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Filter Options -->
                    ${renderMultiSelect('Equipos', teams.map(t => ({ label: t.nombre, value: t.id })), campogramaFilters.equipos, 'window.toggleCampogramaTeam', 'teams')}
                    ${renderMultiSelect('Posiciones', PLAYER_POSITIONS.map(p => ({ label: p, value: p })), campogramaFilters.posiciones, 'window.toggleCampogramaPos', 'positions')}
                    ${renderMultiSelect('Año Nac.', years.map(y => ({ label: y.toString(), value: y })), campogramaFilters.years, 'window.toggleCampogramaYear', 'years')}
                    ${renderMultiSelect('Club Convenido', clubs.map(c => ({ label: c, value: c })), campogramaFilters.clubesConvenidos, 'window.toggleCampogramaClub', 'clubs')}
                    ${renderMultiSelect('Nivel Pro', [1, 2, 3, 4, 5].map(lvl => ({ label: `NIVEL ${lvl}`, value: lvl })), campogramaFilters.niveles, 'window.toggleCampogramaLevel', 'levels')}
                </div>
            </div>

            <div class="max-w-6xl mx-auto shadow-2xl rounded-[3.5rem] overflow-hidden relative group">
                ${renderTacticalPitchHtml(filteredPlayers, campogramaFilters.sistema, window.innerWidth < 768 ? 'vertical' : 'horizontal')}
                ${!hasActiveFilters ? `
                    <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-10 transition-all duration-500">
                        <div class="text-center p-8 bg-white/95 rounded-[2.5rem] shadow-2xl border border-white max-w-sm mx-4 transform group-hover:scale-105 transition-transform">
                            <i data-lucide="filter" class="w-12 h-12 text-blue-600 mx-auto mb-4"></i>
                            <h3 class="text-lg font-black text-slate-800 uppercase mb-2">Campograma Vacío</h3>
                            <p class="text-xs text-slate-500 font-bold uppercase tracking-tight leading-relaxed">Por favor, utiliza los filtros superiores para seleccionar los equipos o criterios que deseas analizar.</p>
                        </div>
                    </div>
                ` : ''}
            </div>

            <div class="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div class="bg-indigo-600 p-6 rounded-[2.5rem] shadow-xl text-white">
                    <p class="text-[10px] font-black uppercase opacity-60 mb-1">Total Analizados</p>
                    <p class="text-3xl font-black">${filteredPlayers.length}</p>
                 </div>
                 <div class="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <p class="text-[10px] font-black uppercase text-slate-400 mb-1">Equipos en Filtro</p>
                    <p class="text-3xl font-black text-slate-800">${campogramaFilters.equipos.length || 'TODOS'}</p>
                 </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    window.updateCampogramaFilter = (key, value) => {
        campogramaFilters[key] = value;
        if (key === 'sistema') {
            // Persistir específicamente el sistema elegido en la pizarra de scouting
            const savedPrefs = JSON.parse(localStorage.getItem('ms_coach_formation_prefs') || '{}');
            savedPrefs.campograma = value;
            localStorage.setItem('ms_coach_formation_prefs', JSON.stringify(savedPrefs));

            if (!window.formationsState) window.formationsState = {};
            window.formationsState.campograma = value;
        }
        window.switchView('campograma');
    };

    window.updateCampogramaSearch = (val) => {
        campogramaFilters.search = val;
        window.switchView('campograma');
    };

    window.toggleCampogramaTeam = (teamId) => {
        const idStr = teamId.toString();
        const idx = campogramaFilters.equipos.indexOf(idStr);
        if (idx > -1) campogramaFilters.equipos.splice(idx, 1);
        else campogramaFilters.equipos.push(idStr);
        window.switchView('campograma');
    };

    window.toggleCampogramaPos = (pos) => {
        const idx = campogramaFilters.posiciones.indexOf(pos);
        if (idx > -1) campogramaFilters.posiciones.splice(idx, 1);
        else campogramaFilters.posiciones.push(pos);
        window.switchView('campograma');
    };

    window.toggleCampogramaYear = (year) => {
        const yStr = year.toString();
        const idx = campogramaFilters.years.indexOf(yStr);
        if (idx > -1) campogramaFilters.years.splice(idx, 1);
        else campogramaFilters.years.push(yStr);
        window.switchView('campograma');
    };

    window.toggleCampogramaClub = (club) => {
        const idx = campogramaFilters.clubesConvenidos.indexOf(club);
        if (idx > -1) campogramaFilters.clubesConvenidos.splice(idx, 1);
        else campogramaFilters.clubesConvenidos.push(club);
        window.switchView('campograma');
    };

    window.toggleCampogramaLevel = (lvl) => {
        const lNum = Number(lvl);
        const idx = campogramaFilters.niveles.indexOf(lNum);
        if (idx > -1) campogramaFilters.niveles.splice(idx, 1);
        else campogramaFilters.niveles.push(lNum);
        window.switchView('campograma');
    };

    window.closeModal = () => {
        modalOverlay.classList.remove('active');
        // Reset modal classes to default
        setTimeout(() => {
            modalOverlay.classList.add('md:p-8', 'p-4');
            modalOverlay.classList.remove('p-0');
            modalContainer.className = "bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[95vh] transform scale-95 transition-transform duration-300 custom-scrollbar";
            modalContainer.innerHTML = '';
        }, 300);
    };

    // --- SECCIÓN DE TORNEOS ---
    let torneoSearchTerm = '';
    let currentTorneoTeamId = 'all';
    let currentTorneoLugar = 'all';
    let currentTorneoStatusTab = 'upcoming'; // 'upcoming' or 'finished'

    window.updateTorneoSearch = (val) => {
        torneoSearchTerm = val;
        window.renderView('torneos');
    };

    window.switchTorneoTeamTab = (tid) => {
        currentTorneoTeamId = tid;
        window.renderView('torneos');
    };

    window.switchTorneoStatusTab = (st) => {
        currentTorneoStatusTab = st;
        window.renderView('torneos');
    };

    window.switchTorneoLugar = (lugar) => {
        currentTorneoLugar = lugar;
        window.renderView('torneos');
    };

    let convocatoriaSearchTerm = '';
    let currentConvocatoriaTeamId = 'all';
    let currentConvocatoriaLugar = 'all';
    let currentConvocatoriaTypeTab = 'Ciclo';
    let currentConvocatoriaComunidad = 'all';
    window.currentConvocatoriaCoachId = 'all';

    window.switchConvocatoriaCoach = (id) => {
        window.currentConvocatoriaCoachId = id;
        window.renderView('convocatorias');
    };

    window.switchConvocatoriaComunidad = (com) => {
        currentConvocatoriaComunidad = com;
        window.renderView('convocatorias');
    };

    window.updateConvocatoriaSearch = (val) => {
        convocatoriaSearchTerm = val;
        window.renderView('convocatorias');
    };

    window.switchConvocatoriaTeamTab = (tid) => {
        currentConvocatoriaTeamId = tid;
        window.renderView('convocatorias');
    };

    window.switchConvocatoriaTypeTab = (type) => {
        currentConvocatoriaTypeTab = type;
        window.renderView('convocatorias');
    };

    window.switchConvocatoriaLugar = (lugar) => {
        currentConvocatoriaLugar = lugar;
        window.renderView('convocatorias');
    };

    window.renderConvocatorias = async function (container) {
        const allConvs = await db.getAll('convocatorias');
        const { data: profiles } = await supabaseClient.from('profiles').select('*');
        const currentUser = (await supabaseClient.auth.getUser()).data.user;
        const isGlobal = window.currentVisibilityMode === 'global';

        // Determinar si saltamos la visibilidad (si filtramos por un técnico concreto)
        const currentCoachId = window.currentConvocatoriaCoachId || 'all';

        const convs = window.applyGlobalFilters(allConvs, 'fecha', { skipVisibility: currentCoachId !== 'all' })
            .filter(c => !['Torneo', 'TORNEO'].includes(c.tipo))
            .sort((a, b) => {
                if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
                return (b.hora || '').localeCompare(a.hora || '');
            });

        // En "Mi Espacio" (Personal + Todas), solo lo que yo he creado o compartido conmigo
        const myConvs = (isGlobal || currentCoachId !== 'all') ? convs : convs.filter(c => {
            if (!currentUser) return false;
            if (c.createdBy === currentUser.id) return true;
            const { extra } = window.parseLugarMetadata(c.lugar);
            return extra.sw && Array.isArray(extra.sw) && extra.sw.includes(currentUser.id);
        });

        const teams = window.getSortedTeams(await db.getAll('equipos'));
        const teamsMap = Object.fromEntries(teams.map(t => [t.id, t.nombre]));

        const uniqueLugares = [...new Set(convs.map(c => window.cleanLugar(c.lugar)).filter(Boolean))].sort();

        const filtered = myConvs.filter(c => {
            const { extra } = window.parseLugarMetadata(c.lugar);

            // Filter by TYPE tab
            const matchesType = (c.tipo || '').toLowerCase() === currentConvocatoriaTypeTab.toLowerCase();

            // Filter by COACH (Direct column use + Shared with)
            const matchesCoach = currentCoachId === 'all' || 
                                (c.createdBy && c.createdBy.toString() === currentCoachId.toString()) ||
                                (extra.sw && Array.isArray(extra.sw) && extra.sw.map(String).includes(currentCoachId.toString()));

            // Filter by Team tab
            const matchesTeam = currentConvocatoriaTeamId === 'all' ||
                (c.equipoid && c.equipoid.toString() === currentConvocatoriaTeamId.toString()) ||
                (extra.eids && extra.eids.map(String).includes(currentConvocatoriaTeamId.toString()));

            const sessionLugar = window.cleanLugar(c.lugar) || 'SIN ASIGNAR';
            const matchesLugar = currentConvocatoriaLugar === 'all' || sessionLugar.toUpperCase() === currentConvocatoriaLugar.toUpperCase();

            // Filter by COMUNIDAD
            const comunidad = window.getComunidadByLugar(c.lugar, c.nombre);
            const matchesComunidad = currentConvocatoriaComunidad === 'all' || comunidad === currentConvocatoriaComunidad;

            const matchesSearch = !convocatoriaSearchTerm ||
                (c.nombre || '').toLowerCase().includes(convocatoriaSearchTerm.toLowerCase()) ||
                (window.cleanLugar(c.lugar)).toLowerCase().includes(convocatoriaSearchTerm.toLowerCase());

            return matchesType && matchesTeam && matchesLugar && matchesSearch && matchesComunidad && matchesCoach;
        });

        const coaches = profiles ? profiles.filter(p => p.role === 'TECNICO' || p.role === 'ELITE' || p.role === 'ADMIN') : [];

        const renderConvCard = (c) => {
            const teamName = teamsMap[c.equipoid] || 'Múltiples / Gen.';
            const playerCount = Array.isArray(c.playerids) ? c.playerids.length : 0;
            return `
                <div onclick="window.viewConvocatoria(${c.id})" class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm active:scale-[0.98] transition-all">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs shadow-lg">${(c.nombre || 'C').substring(0, 1).toUpperCase()}</div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <h4 class="font-bold text-slate-800 text-sm uppercase">${c.nombre}</h4>
                                    <span class="text-[7px] font-black px-1.5 py-0.5 rounded ${window.getComunidadByLugar(c.lugar, c.nombre) === 'NAVARRA' ? 'bg-red-100 text-red-600' : (window.getComunidadByLugar(c.lugar, c.nombre) === 'LA RIOJA' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400')} uppercase whitespace-nowrap">${window.getComunidadByLugar(c.lugar, c.nombre)}</span>
                                </div>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${c.fecha}</p>
                            </div>
                        </div>
                        <span class="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest">${teamName}</span>
                    </div>
                    <div class="flex items-center justify-between mt-4">
                        <div class="flex items-center gap-2 text-blue-600 font-black">
                            <i data-lucide="users" class="w-4 h-4"></i>
                            <span class="text-xs uppercase">${playerCount} Jugadores</span>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="event.stopPropagation(); window.editConvocatoria(${c.id})" class="p-2 text-slate-300 hover:text-blue-600"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                            <button onclick="event.stopPropagation(); window.deleteConvocatoria(${c.id})" class="p-2 text-red-300 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </div>
                    </div>
                </div>
            `;
        };

        const renderConvRow = (c) => {
            let displayLugar = window.cleanLugar(c.lugar) || '--';
            const teamName = teamsMap[c.equipoid] || 'Múltiples / Gen.';
            const playerCount = Array.isArray(c.playerids) ? c.playerids.length : 0;
            const { extra } = window.parseLugarMetadata(c.lugar);

            return `
                <tr class="hover:bg-slate-50 transition-colors group cursor-pointer" onclick="window.viewConvocatoria(${c.id})">
                    <td class="p-6">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white text-[10px] font-black shadow-lg">${(c.nombre || 'C').substring(0, 1).toUpperCase()}</div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <p class="text-sm font-black text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors">${c.nombre}</p>
                                    <span class="text-[7px] font-black px-1.5 py-0.5 rounded ${window.getComunidadByLugar(c.lugar, c.nombre) === 'NAVARRA' ? 'bg-red-50 text-red-600 border border-red-100' : (window.getComunidadByLugar(c.lugar, c.nombre) === 'LA RIOJA' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400')} uppercase whitespace-nowrap">${window.getComunidadByLugar(c.lugar, c.nombre)}</span>
                                </div>
                                <span class="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[8px] font-black uppercase tracking-widest">${c.tipo}</span>
                            </div>
                        </div>
                    </td>
                    <td class="p-6">
                        <div class="flex flex-col">
                            <span class="text-xs font-bold text-slate-700">${c.fecha}</span>
                            <span class="text-[9px] font-black text-slate-400 uppercase">
                                ${extra.hi ? `${extra.hl ? `${extra.hl} > ` : ''}${extra.hi}${extra.hs ? ` > ${extra.hs}` : ''}` : (c.hora || '--:--')}
                            </span>
                        </div>
                    </td>
                    <td class="p-6">
                        <span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">${teamName}</span>
                    </td>
                    <td class="p-6">
                        <p class="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[150px]">${displayLugar}</p>
                    </td>
                    <td class="p-6 text-center">
                        <div class="inline-flex items-center gap-2.5 bg-blue-50 text-blue-600 px-4 py-2 rounded-2xl border border-blue-100/50">
                            <i data-lucide="users" class="w-4 h-4"></i>
                            <span class="text-sm font-black tracking-tight">${playerCount}</span>
                        </div>
                    </td>
                    <td class="p-6 text-right">
                        <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="event.stopPropagation(); window.editConvocatoria(${c.id})" class="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                            <button onclick="event.stopPropagation(); window.deleteConvocatoria(${c.id})" class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        };

        const teamsWithConvs = teams.filter(t =>
            convs.some(c => {
                const { extra } = window.parseLugarMetadata(c.lugar);
                return (c.equipoid && c.equipoid.toString() === t.id.toString()) ||
                    (extra.eids && extra.eids.map(String).includes(t.id.toString()));
            })
        );

        container.innerHTML = `
            <div class="space-y-6 mb-8">
                <div class="flex flex-col md:flex-row gap-4">
                    <!-- Type Tabs -->
                    <div class="flex items-center p-1.5 bg-slate-100 rounded-[1.5rem] w-fit shadow-inner">
                        <button onclick="window.switchConvocatoriaTypeTab('Ciclo')" class="px-8 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${currentConvocatoriaTypeTab === 'Ciclo' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}">
                            Ciclos
                        </button>
                        <button onclick="window.switchConvocatoriaTypeTab('Sesión')" class="px-8 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${currentConvocatoriaTypeTab === 'Sesión' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}">
                            Sesiones
                        </button>
                        <button onclick="window.switchConvocatoriaTypeTab('Zubieta')" class="px-8 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${currentConvocatoriaTypeTab === 'Zubieta' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}">
                            Zubieta
                        </button>
                    </div>

                    <!-- Comunidad Tabs -->
                    <div class="flex items-center p-1.5 bg-slate-100 rounded-[1.5rem] w-fit shadow-inner">
                        <button onclick="window.switchConvocatoriaComunidad('all')" class="px-6 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${currentConvocatoriaComunidad === 'all' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}">
                            Todas
                        </button>
                        <button onclick="window.switchConvocatoriaComunidad('NAVARRA')" class="px-6 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${currentConvocatoriaComunidad === 'NAVARRA' ? 'bg-white text-red-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}">
                            Navarra
                        </button>
                        <button onclick="window.switchConvocatoriaComunidad('LA RIOJA')" class="px-6 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${currentConvocatoriaComunidad === 'LA RIOJA' ? 'bg-white text-emerald-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}">
                            La Rioja
                        </button>
                    </div>

                    <!-- Coach Tabs -->
                    <div class="flex items-center p-1.5 bg-slate-100 rounded-[1.5rem] w-fit shadow-inner overflow-x-auto max-w-full custom-scrollbar">
                        <button onclick="window.switchConvocatoriaCoach('all')" class="px-6 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${currentCoachId === 'all' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}">
                            Todas
                        </button>
                        ${coaches.map(c => `
                            <button onclick="window.switchConvocatoriaCoach('${c.id}')" class="px-6 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${currentCoachId == c.id ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}">
                                ${(c.name || c.nombre || 'Técnico').split(' ')[0]}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Filters & Search Toolbar -->
                <div class="bg-white p-3 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:flex items-center gap-3">
                        <!-- Team Filter -->
                        <div class="relative flex-1 lg:min-w-[220px]">
                            <select onchange="window.switchConvocatoriaTeamTab(this.value)" class="w-full p-3.5 bg-blue-50 border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:bg-white focus:border-blue-200 transition-all appearance-none cursor-pointer text-blue-600">
                                <option value="all" ${currentConvocatoriaTeamId === 'all' ? 'selected' : ''}>TODAS LAS PLANTILLAS</option>
                                ${teamsWithConvs.map(t => `<option value="${t.id}" ${currentConvocatoriaTeamId.toString() === t.id.toString() ? 'selected' : ''}>${t.nombre}</option>`).join('')}
                            </select>
                            <i data-lucide="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none"></i>
                        </div>

                        <!-- Place Filter -->
                        <div class="relative flex-1 lg:min-w-[200px]">
                            <select onchange="window.switchConvocatoriaLugar(this.value)" class="w-full p-3.5 bg-slate-50 border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:bg-white focus:border-blue-100 transition-all appearance-none cursor-pointer text-slate-500">
                                <option value="all" ${currentConvocatoriaLugar === 'all' ? 'selected' : ''}>TODOS LOS LUGARES</option>
                                ${uniqueLugares.map(l => `<option value="${l}" ${currentConvocatoriaLugar === l ? 'selected' : ''}>${l.toUpperCase()}</option>`).join('')}
                            </select>
                            <i data-lucide="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"></i>
                        </div>

                        <!-- Search -->
                        <div class="relative flex-1 lg:min-w-[250px]">
                            <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                            <input type="text" 
                                id="convocatoria-search-input"
                                placeholder="BUSCAR POR NOMBRE O LUGAR..." 
                                value="${convocatoriaSearchTerm}"
                                oninput="window.updateConvocatoriaSearch(this.value)"
                                class="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-100 rounded-xl text-[10px] font-black outline-none focus:ring-4 ring-blue-50 transition-all uppercase tracking-widest">
                            ${convocatoriaSearchTerm ? `
                                <button onclick="window.updateConvocatoriaSearch(''); window.renderConvocatorias(document.getElementById('content-container'))" 
                                    class="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Borrar búsqueda">
                                    <i data-lucide="x" class="w-3 h-3"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mobile View -->
            <div class="md:hidden space-y-4">
                ${filtered.map(c => renderConvCard(c)).join('') || `<div class="py-20 text-center italic text-slate-400">No hay convocatorias registradas</div>`}
            </div>

            <!-- Desktop View -->
            <div class="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div class="table-container">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-50 border-b border-slate-100">
                            <th class="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Convocatoria</th>
                            <th class="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fecha / Horario</th>
                            <th class="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Equipo</th>
                            <th class="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Lugar</th>
                            <th class="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Jugadores</th>
                            <th class="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        ${filtered.map(c => renderConvRow(c)).join('') || `
                            <tr><td colspan="6" class="p-12 text-center text-slate-300 italic text-xs">No se han encontrado convocatorias.</td></tr>
                        `}
                    </tbody>
                </table>
            </div>
            
            <div class="mt-8 flex justify-between items-center px-4">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Listado de Convocatorias y Citas · ${filtered.length} registros</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();

        const searchInput = document.getElementById('convocatoria-search-input');
        if (searchInput && convocatoriaSearchTerm) {
            searchInput.focus();
            searchInput.setSelectionRange(convocatoriaSearchTerm.length, convocatoriaSearchTerm.length);
        }
    }

    window.renderTorneos = async function (container) {
        const allConvs = await db.getAll('convocatorias');
        const convs = window.applyGlobalFilters(allConvs).filter(c => ['Torneo', 'TORNEO'].includes(c.tipo))
            .sort((a, b) => {
                if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
                return (b.hora || '').localeCompare(a.hora || '');
            });

        const teams = window.getSortedTeams(await db.getAll('equipos'));
        const teamsMap = Object.fromEntries(teams.map(t => [t.id, t.nombre]));

        const uniqueLugares = [...new Set(convs.map(c => window.cleanLugar(c.lugar)).filter(Boolean))].sort();

        const filtered = convs.filter(c => {
            const { extra } = window.parseLugarMetadata(c.lugar);

            const matchesTeam = currentTorneoTeamId === 'all' ||
                (c.equipoid && c.equipoid.toString() === currentTorneoTeamId.toString()) ||
                (extra.eids && extra.eids.map(String).includes(currentTorneoTeamId.toString())) ||
                (extra.sw && extra.sw.map(String).includes(currentTorneoTeamId.toString()));

            const sessionLugar = window.cleanLugar(c.lugar) || 'SIN ASIGNAR';
            const matchesLugar = currentTorneoLugar === 'all' || sessionLugar.toUpperCase() === currentTorneoLugar.toUpperCase();

            const matchesSearch = !torneoSearchTerm ||
                (c.nombre || '').toLowerCase().includes(torneoSearchTerm.toLowerCase()) ||
                (window.cleanLugar(c.lugar)).toLowerCase().includes(torneoSearchTerm.toLowerCase());

            return matchesTeam && matchesLugar && matchesSearch;
        });

        const today = new Date().toISOString().split('T')[0];
        const showStatusTabs = !torneoSearchTerm;

        // Determine segments based on status tab
        let displaySections = [];
        if (showStatusTabs) {
            const upcoming = filtered.filter(c => c.fecha >= today);
            const finished = filtered.filter(c => c.fecha < today);

            if (currentTorneoStatusTab === 'upcoming') {
                displaySections = [{ title: 'Próximos Torneos y Citas', items: upcoming }];
            } else {
                displaySections = [{ title: 'Torneos Finalizados', items: finished }];
            }
        } else {
            displaySections = [{ title: '', items: filtered }];
        }

        // Helper for Mobile Card
        const renderTorneoCard = (c) => {
            const teamName = teamsMap[c.equipoid] || 'Múltiples / Gen.';
            const playerCount = Array.isArray(c.playerids) ? c.playerids.length : 0;
            return `
                <div onclick="window.viewTorneoRendimiento(${c.id})" class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm active:scale-[0.98] transition-all">
                    <div class="flex justify-between items-start mb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-xs shadow-lg shadow-blue-500/20">${(c.nombre || 'T').substring(0, 1).toUpperCase()}</div>
                            <div>
                                <h4 class="font-bold text-slate-800 text-sm uppercase">${c.nombre}</h4>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${c.fecha}</p>
                            </div>
                        </div>
                        <span class="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest">${teamName}</span>
                    </div>
                    <div class="flex items-center justify-between mt-4">
                        <div class="flex items-center gap-2 text-blue-600 font-black">
                            <i data-lucide="users" class="w-4 h-4"></i>
                            <span class="text-xs uppercase">${playerCount} Convocados</span>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="event.stopPropagation(); window.editConvocatoria(${c.id})" class="p-2 text-slate-300 hover:text-blue-600"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                            <button onclick="event.stopPropagation(); window.deleteConvocatoria(${c.id})" class="p-2 text-red-300 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </div>
                    </div>
                </div>
            `;
        };

        // Helper for Desktop Row
        const renderTorneoRow = (c) => {
            let displayLugar = window.cleanLugar(c.lugar) || '--';
            const teamName = teamsMap[c.equipoid] || 'Múltiples / Gen.';
            const playerCount = Array.isArray(c.playerids) ? c.playerids.length : 0;
            return `
                <tr class="hover:bg-blue-50/30 transition-colors group cursor-pointer" onclick="window.viewTorneoRendimiento(${c.id})">
                    <td class="p-4 md:p-6">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-[10px] font-black shadow-lg shadow-blue-500/20">${(c.nombre || 'T').substring(0, 1).toUpperCase()}</div>
                            <p class="text-xs md:text-sm font-black text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors">${c.nombre}</p>
                        </div>
                    </td>
                    <td class="p-4 md:p-6">
                        <div class="flex flex-col">
                            <span class="text-[10px] md:text-xs font-bold text-slate-700">${c.fecha}</span>
                            <span class="text-[9px] font-black text-slate-400 uppercase">
                                ${(() => {
                    const { extra } = window.parseLugarMetadata(c.lugar);
                    if (extra.hi) return `${extra.hl ? `${extra.hl} > ` : ''}${extra.hi}${extra.hs ? ` > ${extra.hs}` : ''}`;
                    return c.hora || '--:--';
                })()}
                            </span>
                        </div>
                    </td>
                    <td class="p-4 md:p-6">
                        <span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest">${teamName}</span>
                    </td>
                    <td class="p-4 md:p-6">
                        <p class="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase truncate max-w-[80px] md:max-w-[150px]">${displayLugar}</p>
                    </td>
                    <td class="p-4 md:p-6 text-center">
                        <div class="inline-flex items-center gap-2.5 bg-blue-50 text-blue-600 px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl border border-blue-100/50">
                            <i data-lucide="users" class="w-3.5 h-3.5 md:w-4 h-4"></i>
                            <span class="text-xs md:text-sm font-black tracking-tight">${playerCount}</span>
                        </div>
                    </td>
                    <td class="p-4 md:p-6 text-right">
                        <div class="flex justify-end gap-1 md:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onclick="event.stopPropagation(); window.editConvocatoria(${c.id})" class="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                <i data-lucide="edit-3" class="w-3.5 h-3.5 md:w-4 h-4"></i>
                            </button>
                            <button onclick="event.stopPropagation(); window.deleteConvocatoria(${c.id})" class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5 md:w-4 h-4"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        };

        let teamsWithTorneos = teams.filter(t =>
            convs.some(c => {
                const { extra } = window.parseLugarMetadata(c.lugar);
                return (c.equipoid && c.equipoid.toString() === t.id.toString()) ||
                    (extra.eids && extra.eids.map(String).includes(t.id.toString()));
            })
        );

        // Sort by year ascending (2010 to 2017)
        teamsWithTorneos = window.getSortedTeams(teamsWithTorneos);

        container.innerHTML = `
            <!-- Filters & Search Toolbar -->
            <div class="bg-white p-3 rounded-[2rem] border border-slate-100 shadow-sm mb-8">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:flex items-center gap-3">
                    <!-- Team Filter -->
                    <div class="relative flex-1 lg:min-w-[220px]">
                        <select onchange="window.switchTorneoTeamTab(this.value)" class="w-full p-3.5 bg-blue-50 border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:bg-white focus:border-blue-200 transition-all appearance-none cursor-pointer text-blue-600">
                            <option value="all" ${currentTorneoTeamId === 'all' ? 'selected' : ''}>TODAS LAS PLANTILLAS</option>
                            ${teamsWithTorneos.map(t => `<option value="${t.id}" ${currentTorneoTeamId.toString() === t.id.toString() ? 'selected' : ''}>${t.nombre}</option>`).join('')}
                        </select>
                        <i data-lucide="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none"></i>
                    </div>

                    <!-- Place Filter -->
                    <div class="relative flex-1 lg:min-w-[200px]">
                        <select onchange="window.switchTorneoLugar(this.value)" class="w-full p-3.5 bg-slate-50 border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:bg-white focus:border-blue-100 transition-all appearance-none cursor-pointer text-slate-500">
                            <option value="all" ${currentTorneoLugar === 'all' ? 'selected' : ''}>TODOS LOS LUGARES</option>
                            ${uniqueLugares.map(l => `<option value="${l}" ${currentTorneoLugar === l ? 'selected' : ''}>${l.toUpperCase()}</option>`).join('')}
                        </select>
                        <i data-lucide="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"></i>
                    </div>

                    <!-- Search -->
                    <div class="relative flex-1 lg:min-w-[250px]">
                        <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                        <input type="text" 
                            id="torneo-search-input"
                            placeholder="BUSCAR TORNEO O LUGAR..." 
                            value="${torneoSearchTerm}"
                            oninput="window.updateTorneoSearch(this.value)"
                            class="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-100 rounded-xl text-[10px] font-black outline-none focus:ring-4 ring-blue-50 transition-all uppercase tracking-widest">
                        ${torneoSearchTerm ? `
                            <button onclick="window.updateTorneoSearch(''); window.renderTorneos(document.getElementById('content-container'))" 
                                class="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Borrar búsqueda">
                                <i data-lucide="x" class="w-3 h-3"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>

            ${showStatusTabs ? `
                <div class="flex items-center p-1.5 bg-slate-100 rounded-[1.5rem] w-full md:w-fit mb-8 shadow-inner">
                    <button onclick="window.switchTorneoStatusTab('upcoming')" class="flex-1 md:flex-none px-8 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${currentTorneoStatusTab === 'upcoming' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}">
                        Próximas Citas
                    </button>
                    <button onclick="window.switchTorneoStatusTab('finished')" class="flex-1 md:flex-none px-8 py-3 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${currentTorneoStatusTab === 'finished' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-400 hover:text-slate-600'}">
                        Torneos Jugados
                    </button>
                </div>
            ` : ''}

            <!-- Mobile View (Cards) -->
            <div class="md:hidden space-y-10">
                ${displaySections.map(sec => `
                    ${sec.title ? `
                        <div class="px-2 pt-6 pb-2 border-b border-slate-100 mb-2">
                            <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">${sec.title}</h3>
                        </div>
                    ` : ''}
                    <div class="space-y-4">
                        ${sec.items.map(c => renderTorneoCard(c)).join('') || `
                            <div class="py-10 text-center italic text-slate-300 text-xs">No hay torneos en esta sección</div>
                        `}
                    </div>
                `).join('')}
                ${filtered.length === 0 ? `<div class="py-20 text-center italic text-slate-400">No hay torneos registrados</div>` : ''}
            </div>

            <!-- Desktop View (Table) -->
            <div class="hidden md:block space-y-12">
                ${displaySections.map(sec => `
                    <div class="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        ${sec.title ? `
                            <div class="flex items-center gap-4 mb-6 px-4">
                                <h3 class="text-[11px] font-black text-slate-800 uppercase tracking-[0.3em]">${sec.title}</h3>
                                <div class="h-px flex-1 bg-slate-100"></div>
                                <span class="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">${sec.items.length}</span>
                            </div>
                        ` : ''}
                        <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                            <div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse">
                                    <thead>
                                        <tr class="bg-slate-50 border-b border-slate-100">
                                            <th class="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Torneo / Evento</th>
                                            <th class="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fecha</th>
                                            <th class="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Equipo</th>
                                            <th class="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Lugar</th>
                                            <th class="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Convocados</th>
                                            <th class="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-50">
                                        ${sec.items.map(c => renderTorneoRow(c)).join('') || `
                                            <tr><td colspan="6" class="p-12 text-center text-slate-300 italic text-xs">No hay torneos en esta sección.</td></tr>
                                        `}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `).join('')}
                ${filtered.length === 0 ? `
                    <div class="bg-white rounded-[2.5rem] border border-slate-100 p-20 text-center italic text-slate-300">
                        No se han encontrado torneos registrados.
                    </div>
                ` : ''}
            </div>
            <div class="mt-8 flex justify-between items-center px-4">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizado con Supabase · ${filtered.length} torneos listados</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();

        const searchInput = document.getElementById('torneo-search-input');
        if (searchInput && torneoSearchTerm) {
            searchInput.focus();
            searchInput.setSelectionRange(torneoSearchTerm.length, torneoSearchTerm.length);
        }
    }

    window.viewTorneoRendimiento = async (id) => {
        modalOverlay.classList.add('p-0');
        modalOverlay.classList.remove('md:p-8', 'p-4');

        try {
            const userRes = await supabaseClient.auth.getUser();
            const currentUser = userRes.data?.user;
            const { data: conv, error } = await supabaseClient.from('convocatorias').select('*').eq('id', id).single();
            if (error) throw error;

            // Fetch players directly from Supabase for maximum reliability in this view
            const { data: players } = await supabaseClient.from('jugadores').select('*');
            const teams = window.getSortedTeams(await db.getAll('equipos'));
            const { data: users } = await supabaseClient.from('profiles').select('*');

            const pids = Array.isArray(conv.playerids) ? conv.playerids.map(String) : [];
            const convocados = players.filter(p => pids.includes(p.id.toString()));
            const rendimiento = conv.rendimiento || {};
            const docs = window.getConvMetadata(conv).documentos || [];

            // Aplicar posiciones específicas del torneo (herencia)
            convocados.forEach(p => {
                if (rendimiento[p.id] && rendimiento[p.id].pos) {
                    p.posicion = rendimiento[p.id].pos;
                }
            });
            const team = (conv.equipoid && conv.equipoid !== 'null') ? await db.get('equipos', conv.equipoid) : null;
            const teamPlayers = team ? players.filter(p => p.equipoid == team.id) : [];

            modalContainer.className = "bg-white w-full h-full rounded-none shadow-none overflow-y-auto transform transition-all duration-300 custom-scrollbar";
            modalContainer.innerHTML = `
                <div class="p-8 md:p-12">
                    <div class="flex justify-between items-start mb-8">
                        <div>
                            <h3 class="text-3xl font-black text-slate-800 uppercase tracking-tight">Análisis de Rendimiento</h3>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-black uppercase tracking-widest">${conv.nombre}</span>
                                <span class="text-slate-400 font-bold text-xs">Torneo • ${conv.fecha}</span>
                            </div>
                        </div>
                        <div class="flex gap-2">
                             <button onclick="window.previewTorneoPDF(${conv.id})" class="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg" title="Previsualizar PDF"><i data-lucide="eye" class="w-5 h-5"></i></button>
                             <button onclick="window.exportConvocatoria(${conv.id})" class="p-2 bg-slate-900 text-white rounded-full hover:bg-black transition-all shadow-lg" title="Descargar PDF"><i data-lucide="file-down" class="w-5 h-5"></i></button>
                             <button onclick="window.viewTorneoRendimiento(${conv.id})" class="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-all"><i data-lucide="refresh-cw" class="w-5 h-5"></i></button>
                             <button onclick="closeModal()" class="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-all"><i data-lucide="x" class="w-6 h-6"></i></button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <!-- Left: Evaluation Table -->
                        <div class="lg:col-span-7 space-y-6">
                            <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                                <form id="torneo-rendimiento-form">
                                    <input type="hidden" name="convocatoriaId" value="${conv.id}">
                                    <div class="overflow-x-auto">
                                        <table class="w-full text-left border-collapse">
                                            <thead>
                                                <tr class="bg-slate-50/50 border-b border-slate-100">
                                                    <th class="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[25%]">Jugador</th>
                                                    <th class="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[15%]">Posición</th>
                                                    <th class="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[10%]">Nota</th>
                                                    <th class="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[45%]">Observaciones</th>
                                                    <th class="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[5%] text-center"><i data-lucide="trash-2" class="w-3 h-3 mx-auto"></i></th>
                                                </tr>
                                            </thead>
                                            <tbody id="torneo-table-body">
                                                ${convocados.map(p => {
                const { extra: meta } = window.parseLugarMetadata(conv.lugar);
                const evalData = (conv.rendimiento && conv.rendimiento[p.id]) || { score: '', comment: '' };
                return `
                                                        <tr class="border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
                                                            <td class="p-4">
                                                                <p class="text-[11px] font-black text-slate-800 uppercase truncate">${p.nombre}</p>
                                                                <p class="text-[9px] font-black text-blue-500 uppercase tracking-tighter">${p.equipoConvenido || 'Sin Club'}</p>
                                                            </td>
                                                            <td class="p-4">
                                                                <select name="pos_${p.id}" onchange="window.updateLocalPlayerPos(${p.id}, this.value)" class="w-full bg-slate-100/50 border-none rounded-lg text-[10px] font-bold p-2 outline-none focus:ring-2 ring-blue-50">
                                                                    ${(() => {
                        const currentPos = evalData.pos || window.parsePosition(p.posicion)[0] || '';
                        return PLAYER_POSITIONS.map(pos => `
                                                                            <option value="${pos}" ${currentPos === pos ? 'selected' : ''}>${pos}</option>
                                                                        `).join('');
                    })()}
                                                                </select>
                                                            </td>
                                                            <td class="p-4">
                                                                <select name="score_${p.id}" class="w-full bg-slate-100/50 border-none rounded-lg text-[10px] font-bold p-2 outline-none focus:ring-2 ring-blue-50 text-blue-600">
                                                                    <option value="">-</option>
                                                                    ${Array.from({ length: 10 }, (_, i) => i + 1).map(n => `<option value="${n}" ${evalData.score == n ? 'selected' : ''}>${n}</option>`).join('')}
                                                                </select>
                                                            </td>
                                                            <td class="p-4">
                                                                <textarea name="comment_${p.id}" class="w-full bg-slate-100/50 border-none rounded-lg text-[10px] font-bold p-2 outline-none focus:ring-2 ring-blue-50 h-8 resize-none scrollbar-hide focus:h-20 transition-all" placeholder="Nota...">${evalData.comment || ''}</textarea>
                                                            </td>
                                                            <td class="p-4 text-center">
                                                                <button type="button" onclick="window.removePlayerFromTorneo(${conv.id}, ${p.id})" class="text-slate-300 hover:text-red-500 transition-colors">
                                                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    `;
            }).join('')}
                                                
                                                <!-- Row for adding new players -->
                                                <tr class="bg-blue-50/10">
                                                    <td class="p-4" colspan="4">
                                                        <div class="space-y-4">
                                                            <div class="flex flex-col md:flex-row gap-3">
                                                                <div class="relative w-full md:w-1/3">
                                                                    <i data-lucide="users" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400"></i>
                                                                    <select id="torneo-team-add-filter" class="w-full pl-10 pr-4 py-2.5 bg-white border border-blue-100 rounded-xl text-[11px] font-black uppercase outline-none focus:ring-4 ring-blue-50/50 transition-all">
                                                                        <option value="none">Elegir Equipo para añadir...</option>
                                                                        ${teams.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('')}
                                                                    </select>
                                                                </div>
                                                                <div class="relative flex-1">
                                                                    <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400"></i>
                                                                    <input type="text" id="add-player-torneo-input" placeholder="O busca por nombre..." class="w-full pl-10 pr-4 py-2.5 bg-white border border-blue-100 rounded-xl text-[11px] font-bold outline-none focus:ring-4 ring-blue-50/50 transition-all">
                                                                </div>
                                                            </div>
                                                            <!-- Checklist Area -->
                                                            <div id="add-player-results" class="hidden relative bg-white border border-blue-50 rounded-2xl overflow-hidden transition-all duration-300">
                                                                <!-- Listado con checks -->
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td class="p-4 bg-blue-50/20 text-center align-bottom">
                                                        <button type="button" id="confirm-bulk-add" class="hidden w-10 h-10 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center hover:bg-blue-700 transition-all animate-in zoom-in">
                                                            <i data-lucide="user-plus" class="w-5 h-5"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div class="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                                        <button type="submit" class="px-8 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-black transition-all uppercase tracking-widest text-[11px]">Guardar Evaluación</button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <!-- Right: Stats/Graph Side -->
                        <div class="lg:col-span-5 space-y-8">


                             <div class="grid grid-cols-2 gap-4">
                                <div class="bg-blue-600 p-8 rounded-[2.5rem] shadow-xl shadow-blue-500/20 text-white">
                                    <p class="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Media Equipo</p>
                                    <h4 class="text-4xl font-black">
                                        ${convocados.length > 0 ? (Object.values(rendimiento).reduce((acc, curr) => acc + (parseFloat(curr.score) || 0), 0) / (Object.values(rendimiento).filter(v => v.score).length || 1)).toFixed(1) : '--'}
                                    </h4>
                                </div>
                                <div class="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                    <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Evaluados</p>
                                    <h4 class="text-4xl font-black text-slate-800">
                                        ${Object.values(rendimiento).filter(v => v.score).length} <span class="text-xs uppercase text-slate-300">/ ${convocados.length}</span>
                                    </h4>
                                </div>
                             </div>

                             <!-- Campograma -->
                             <div class="bg-slate-900 p-8 rounded-[3rem] shadow-2xl overflow-hidden relative group/pitch">
                                 <div class="flex justify-between items-center mb-6">
                                     <h4 class="text-xs font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                                         <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" y1="4" x2="12" y2="20"/><circle cx="12" cy="12" r="3"/></svg>
                                         Pizarra Táctica
                                     </h4>
                                     <div class="flex items-center gap-2">
                                         <select onchange="window.updateModalPitch(this.value, '${conv.id}', 'Torneo')" class="p-2 bg-slate-800 border border-slate-700 rounded-xl text-[10px] font-black uppercase text-white outline-none shadow-sm cursor-pointer">
                                             ${Object.entries(FORMATIONS).map(([fid, f]) => {
                const current = (window.formationsState && window.formationsState.torneos && window.formationsState.torneos[conv.id]) || 'F11_433';
                return `<option value="${fid}" ${fid === current ? 'selected' : ''}>${f.name}</option>`;
            }).join('')}
                                         </select>
                                         <button onclick="window.openFullScreenPitch('torneo', '${conv.id}', '${(window.formationsState && window.formationsState.torneos && window.formationsState.torneos[conv.id]) || 'F11_433'}')" class="p-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-white/60 uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2">
                                            <i data-lucide="maximize" class="w-4 h-4"></i>
                                            Panorámica
                                         </button>
                                     </div>
                                 </div>
                                 <div id="pitch-display-area" class="relative">
                                     ${renderTacticalPitchHtml(convocados, (window.formationsState && window.formationsState.torneos && window.formationsState.torneos[conv.id]) || 'F11_433', 'horizontal')}
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
                                     <input type="file" id="torneo-doc-upload" class="hidden" multiple onchange="window.handleTorneoDocUpload(${conv.id}, this.files)">
                                 </div>
                                 <div id="torneo-docs-list" class="space-y-2">
                                     ${docs.length > 0 ? docs.map((doc, idx) => `
                                         <div class="flex items-center justify-between p-3 bg-slate-50 rounded-2xl group hover:bg-blue-50/50 transition-all border border-transparent hover:border-blue-100">
                                             <div class="flex items-center gap-3 overflow-hidden">
                                                 <div class="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm border border-slate-100">
                                                     <i data-lucide="file" class="w-4 h-4"></i>
                                                 </div>
                                                 <span class="text-[10px] font-bold text-slate-600 truncate">${doc.name}</span>
                                             </div>
                                             <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                 <button onclick="window.previewDocument('${doc.url}', '${doc.name}')" class="p-1.5 text-blue-500 hover:bg-white rounded-lg transition-all" title="Previsualizar"><i data-lucide="eye" class="w-3.5 h-3.5"></i></button>
                                                 <button onclick="window.deleteTorneoDoc(${conv.id}, ${idx})" class="p-1.5 text-red-400 hover:bg-white rounded-lg transition-all" title="Eliminar"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                                             </div>
                                         </div>
                                     `).join('') : '<p class="text-[10px] text-slate-400 italic text-center py-4">No hay documentos adjuntos.</p>'}
                                 </div>
                             </div>
                        </div>

                        ${(users) ? `
                            <div class="lg:col-span-3 space-y-3 pt-6 border-t border-slate-100">
                                <div class="flex items-center justify-between mb-2">
                                    <label class="block text-xs font-black text-slate-400 uppercase tracking-widest">Compartir con el Staff</label>
                                    <button id="save-torneo-sharing" class="px-6 py-2 bg-blue-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20">Guardar Compartidos</button>
                                </div>
                                <div id="torneo-sharing-list" class="grid grid-cols-2 md:grid-cols-4 gap-2 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                    ${(users && currentUser) ? users.filter(u => u.id !== currentUser.id).map(u => `
                                        <label class="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 transition-all select-none">
                                            <input type="checkbox" name="sharedWith" value="${u.id}" ${conv.sharedWith && conv.sharedWith.includes(u.id) ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 focus:ring-blue-100">
                                            <div class="flex-1 min-w-0">
                                                <p class="text-[10px] font-bold text-slate-700 truncate">${u.name || u.full_name || u.nombre || 'Sin nombre'}</p>
                                            </div>
                                        </label>
                                    `).join('') : '<p class="text-xs text-slate-400 italic">No hay otros usuarios registrados.</p>'}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
            modalOverlay.classList.add('active');
            if (window.lucide) lucide.createIcons();

            // Helper to update pitch in memory
            window.updateLocalPlayerPos = (pid, newPos) => {
                const p = convocados.find(player => player.id == pid);
                if (p) {
                    p.posicion = newPos;
                    const pitchArea = document.getElementById('pitch-display-area');
                    const currentFormation = (window.formationsState && window.formationsState.torneos && window.formationsState.torneos[conv.id]) || 'F11_433';
                    pitchArea.innerHTML = renderTacticalPitchHtml(convocados, currentFormation, 'horizontal');
                    if (window.lucide) lucide.createIcons();
                }
            };

            // Helper to remove player
            window.removePlayerFromTorneo = async (tid, pid) => {
                window.customConfirm('QUITAR JUGADOR', '¿Seguro que quieres quitar a este futbolista del torneo?', async () => {
                    const newPids = pids.filter(id => id.toString() !== pid.toString());
                    try {
                        const { error } = await supabaseClient.from('convocatorias').update({ playerids: newPids }).eq('id', tid);
                        if (error) throw error;
                        window.viewTorneoRendimiento(tid);
                    } catch (err) {
                        window.customAlert('Error al quitar', err.message, 'error');
                    }
                });
            };

            // Add player search logic
            const addInput = document.getElementById('add-player-torneo-input');
            const teamAddFilter = document.getElementById('torneo-team-add-filter');
            const addResults = document.getElementById('add-player-results');
            const confirmBtn = document.getElementById('confirm-bulk-add');

            const bulkSelection = new Set();

            const updateAddResults = () => {
                const term = (addInput.value || '').toLowerCase().trim();
                const teamId = String(teamAddFilter.value);

                if (teamId === 'none' && term.length < 2) {
                    addResults.classList.add('hidden');
                    addResults.innerHTML = '';
                    return;
                }

                if (!players) return;

                // Filtrar los que NO están ya en el torneo
                let filtered = players.filter(p => !pids.includes(String(p.id)));

                // Filtro por equipo
                if (teamId !== 'none') {
                    filtered = filtered.filter(p => String(p.equipoid) === teamId);
                }

                // Filtro por término
                if (term.length >= 2) {
                    filtered = filtered.filter(p => (p.nombre || '').toLowerCase().includes(term));
                }

                addResults.classList.remove('hidden');

                if (filtered.length > 0) {
                    addResults.innerHTML = `
                    <div class="p-3 bg-slate-50 border-b border-blue-50 flex justify-between items-center">
                        <span class="text-[9px] font-black text-blue-600 uppercase tracking-widest">Disponibles (${filtered.length})</span>
                        <button type="button" id="add-select-all-ficha" class="text-[9px] font-black text-slate-400 uppercase hover:text-blue-600">Marcar Todos</button>
                    </div>
                    <div class="max-h-64 overflow-y-auto p-2 grid grid-cols-1 md:grid-cols-2 gap-2 custom-scrollbar">
                        ${filtered.map(p => `
                            <label class="flex items-center gap-3 p-3 bg-white rounded-xl border border-blue-50/50 hover:border-blue-400 cursor-pointer transition-all group/p">
                                <input type="checkbox" value="${p.id}" ${bulkSelection.has(String(p.id)) ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 torneo-add-check">
                                <div class="flex-1 min-w-0">
                                    <p class="text-[10px] font-bold text-slate-700 truncate group-hover/p:text-blue-600 transition-colors uppercase">${p.nombre}</p>
                                    <div class="flex items-center gap-2">
                                        <p class="text-[8px] text-slate-400 font-bold uppercase">${window.formatPosition(p.posicion)}</p>
                                        <span class="text-[8px] text-blue-500 font-black uppercase tracking-tighter">${p.equipoConvenido || 'Sin Club'}</span>
                                    </div>
                                </div>
                            </label>
                        `).join('')}
                    </div>
                `;

                    addResults.classList.remove('hidden');

                    // Toggle logic
                    addResults.querySelectorAll('.torneo-add-check').forEach(chk => {
                        chk.onchange = (e) => {
                            if (e.target.checked) bulkSelection.add(String(e.target.value));
                            else bulkSelection.delete(String(e.target.value));
                            confirmBtn.classList.toggle('hidden', bulkSelection.size === 0);
                        };
                    });

                    const selectAll = addResults.querySelector('#add-select-all-ficha');
                    if (selectAll) {
                        selectAll.onclick = () => {
                            const checks = addResults.querySelectorAll('.torneo-add-check');
                            const allChecked = Array.from(checks).every(c => c.checked);
                            checks.forEach(c => {
                                c.checked = !allChecked;
                                if (c.checked) bulkSelection.add(String(c.value));
                                else bulkSelection.delete(String(c.value));
                            });
                            confirmBtn.classList.toggle('hidden', bulkSelection.size === 0);
                        };
                    }
                } else {
                    addResults.innerHTML = '<div class="p-6 text-center text-[10px] text-slate-400 uppercase tracking-widest font-bold">No hay jugadores disponibles</div>';
                    addResults.classList.remove('hidden');
                }
                if (window.lucide) lucide.createIcons();
            };

            if (addInput) addInput.oninput = updateAddResults;
            if (teamAddFilter) teamAddFilter.onchange = updateAddResults;

            if (confirmBtn) {
                confirmBtn.onclick = async () => {
                    if (bulkSelection.size === 0) return;
                    const newPids = [...pids, ...Array.from(bulkSelection)];
                    try {
                        const { error } = await supabaseClient.from('convocatorias').update({ playerids: [...new Set(newPids)] }).eq('id', id);
                        if (error) throw error;
                        window.viewTorneoRendimiento(id);
                    } catch (err) {
                        window.customAlert('Error al añadir', err.message, 'error');
                    }
                };
            }

            window.addPlayerToTorneo = async (tid, pid) => {
                const newPids = [...pids, pid.toString()];
                try {
                    const { error } = await supabaseClient.from('convocatorias').update({ playerids: newPids }).eq('id', tid);
                    if (error) throw error;
                    window.viewTorneoRendimiento(tid);
                } catch (err) {
                    window.customAlert('Error al añadir', err.message, 'error');
                }
            };

            const shareTorneoBtn = document.getElementById('save-torneo-sharing');
            if (shareTorneoBtn) {
                shareTorneoBtn.onclick = async () => {
                    const sharingChecks = document.getElementById('torneo-sharing-list').querySelectorAll('input[name="sharedWith"]');
                    const sharedWithList = Array.from(sharingChecks).filter(c => c.checked).map(c => c.value);

                    try {
                        const { error } = await supabaseClient.from('convocatorias').update({ sharedWith: sharedWithList }).eq('id', id);
                        if (error) throw error;
                        window.customAlert('Compartido', 'Lista de staff actualizada correctamente.', 'success');
                    } catch (err) {
                        window.customAlert('Error compartiendo', err.message, 'error');
                    }
                };
            }

            document.getElementById('torneo-rendimiento-form').onsubmit = async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const convId = formData.get('convocatoriaId');

                const newRendimiento = {};
                convocados.forEach(p => {
                    const score = formData.get(`score_${p.id}`);
                    const comment = formData.get(`comment_${p.id}`);
                    const pos = formData.get(`pos_${p.id}`);
                    if (score || comment || pos) {
                        newRendimiento[p.id] = { score, comment, pos };
                    }
                });

                try {
                    const { error } = await supabaseClient.from('convocatorias').update({ rendimiento: newRendimiento }).eq('id', convId);
                    if (error) throw error;
                    window.customAlert('¡Éxito!', 'Rendimiento guardado correctamente', 'success');
                    closeModal();
                    window.switchView('torneos');
                } catch (err) {
                    console.error(err);
                    window.customAlert('Error al guardar', err.message, 'error');
                }
            };

        } catch (err) {
            console.error(err);
            window.customAlert('Error al cargar', 'No se ha podido abrir el detalle del torneo: ' + err.message, 'error');
        }
    }

    // Global Click Listeners
    document.addEventListener('click', (e) => {
        // Modal backdrop close
        if (e.target === modalOverlay) {
            closeModal();
        }

        // Close custom multiselects if clicking outside
        if (!e.target.closest('.group\\/ms')) {
            document.querySelectorAll('[id$="-menu"]').forEach(m => m.classList.add('hidden'));
        }

        // Close player search results if clicking outside
        if (!e.target.closest('#add-player-torneo-input')) {
            const res = document.getElementById('add-player-results');
            if (res) res.classList.add('hidden');
        }

        // Sidebar mobile close logic
        if (window.innerWidth < 768 && sidebar && mobileMenuBtn && !sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            sidebar.classList.add('-translate-x-full');
            sidebar.classList.remove('active-mobile');
        }
    });

    window.viewNewUnifiedEvent = async (date) => {
        const teams = window.getSortedTeams(await db.getAll('equipos'));
        const tasks = await db.getAll('tareas');
        const players = await db.getAll('jugadores');
        const sesiones = await db.getAll('sesiones');
        const convocatorias = await db.getAll('convocatorias');

        modalContainer.innerHTML = `
            <div class="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Planificador de Jornada</h3>
                        <p class="text-slate-400 font-bold">${date}</p>
                    </div>
                    <button onclick="closeModal()" class="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-all"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>

                <form id="unified-event-form" class="space-y-8">
                    <input type="hidden" name="fecha" value="${date}">
                    
                    <!-- PARTE 1: EVENTO / TAREA -->
                    <div class="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                        <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <i data-lucide="alarm-clock" class="w-4 h-4"></i> Datos del Evento
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="col-span-1 md:col-span-2">
                                <input name="nombre" placeholder="Título: Ej. Sesión 3 Ciclo 2 Arnedo" class="w-full p-4 border border-slate-200 rounded-2xl bg-white focus:ring-4 ring-blue-50 outline-none font-bold" required>
                            </div>
                            <div class="grid grid-cols-2 gap-4 col-span-1 md:col-span-2">
                                <select name="categoria" class="p-4 border border-slate-200 rounded-2xl bg-white outline-none">
                                    <option>Sesión entrenamiento</option>
                                    <option>Torneo</option>
                                    <option>Reunión</option>
                                    <option>Amistoso</option>
                                    <option>Otros</option>
                                </select>
                                <input name="hora" type="time" class="p-4 border border-slate-200 rounded-2xl bg-white outline-none" required>
                            </div>
                        </div>
                    </div>

                    <!-- PARTE 2: VINCULACIONES -->
                    <div class="space-y-4">
                        <div class="flex items-center gap-2 mb-2 p-2">
                            <i data-lucide="link" class="w-4 h-4 text-blue-500"></i>
                            <span class="text-xs font-black text-slate-400 uppercase tracking-widest">¿Qué quieres vincular a este día?</span>
                        </div>

                        <!-- Sesión Checkbox -->
                        <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:border-blue-200 transition-all">
                            <label class="flex items-center gap-4 cursor-pointer">
                                <input type="checkbox" id="link-session" class="w-6 h-6 rounded-xl border-2 border-slate-200 text-blue-600 focus:ring-blue-100">
                                <div>
                                    <p class="font-bold text-slate-800">Añadir Sesión de Entrenamiento</p>
                                    <p class="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none">Biblioteca de tareas y metodología</p>
                                </div>
                            </label>
                            <div id="session-fields" class="hidden mt-6 pt-6 border-t border-slate-50 space-y-4">
                                    <select name="session_equipoid" id="session-master-equipo" class="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none">
                                        <option value="">Selecciona equipo...</option>
                                        ${window.getSortedTeams(teams).map(t => `<option value="${t.id}">${t.nombre}</option>`).join('')}
                                    </select>
                                    <select id="session-template-selector" class="w-full p-4 border border-blue-100 rounded-2xl bg-white outline-none hidden text-[11px] font-bold text-blue-600">
                                        <option value="">Opcional: Importar sesión existente...</option>
                                    </select>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Tareas (Separadas por ;) o arrastra desde Tareas</label>
                                <input name="session_tasks" placeholder="IDs de tareas si las sabes, o se creará vacía" class="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none">
                            </div>
                        </div>

                        <!-- Convocatoria Checkbox -->
                        <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:border-emerald-200 transition-all">
                            <label class="flex items-center gap-4 cursor-pointer">
                                <input type="checkbox" id="link-convocatoria" class="w-6 h-6 rounded-xl border-2 border-slate-200 text-emerald-600 focus:ring-emerald-100">
                                <div>
                                    <p class="font-bold text-slate-800">Añadir Convocatoria / Listado</p>
                                    <p class="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none">Listado de jugadores citados</p>
                                </div>
                            </label>
                            <div id="convocatoria-fields" class="hidden mt-6 pt-6 border-t border-slate-50 space-y-4">
                                <select name="conv_tipo" class="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none">
                                    <option>Entrenamiento</option>
                                    <option>Partido</option>
                                    <option>Ciclo</option>
                                    <option>Torneo</option>
                                </select>
                                <select name="conv_equipoid" id="conv-master-equipo" class="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none">
                                    <option value="">Selecciona equipo...</option>
                                    ${window.getSortedTeams(teams).map(t => `<option value="${t.id}">${t.nombre}</option>`).join('')}
                                </select>
                                <select id="conv-template-selector" class="w-full p-4 border border-emerald-100 rounded-2xl bg-white outline-none hidden text-[11px] font-bold text-emerald-600">
                                    <option value="">Opcional: Importar convocatoria existente...</option>
                                </select>
                                <div class="relative mb-2">
                                     <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300"></i>
                                     <input type="text" id="unified-player-search" placeholder="Buscar jugador..." class="w-full pl-10 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-[10px] outline-none focus:ring-2 ring-emerald-50">
                                 </div>
                                <div id="conv-players-list" class="max-h-48 overflow-y-auto custom-scrollbar p-2 bg-slate-50 rounded-2xl border border-slate-100 hidden">
                                    <!-- Players list -->
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex gap-4 mt-12 bg-white/80 backdrop-blur-sm p-4 rounded-[2rem] border border-slate-100 shadow-2xl sticky bottom-0">
                        <button type="button" onclick="closeModal()" class="flex-1 py-5 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
                        <button type="submit" class="flex-[2] py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all uppercase tracking-widest">Guardar Planificación</button>
                    </div>
                </form>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
        modalOverlay.classList.add('active');

        // UI Logic for toggles
        const sCheck = document.getElementById('link-session');
        const sFields = document.getElementById('session-fields');
        sCheck.onchange = () => sFields.classList.toggle('hidden', !sCheck.checked);

        const cCheck = document.getElementById('link-convocatoria');
        const cFields = document.getElementById('convocatoria-fields');
        cCheck.onchange = () => cFields.classList.toggle('hidden', !cCheck.checked);

        // Session Template Logic
        const sTeamSel = document.getElementById('session-master-equipo');
        const sTemplSel = document.getElementById('session-template-selector');
        const sTasksInput = document.querySelector('input[name="session_tasks"]');

        sTeamSel.onchange = () => {
            const tid = sTeamSel.value;
            if (!tid) { sTemplSel.classList.add('hidden'); return; }
            const filtered = sesiones.filter(s => s.equipoid == tid);
            if (filtered.length > 0) {
                sTemplSel.innerHTML = '<option value="">Opcional: Importar sesión existente...</option>' +
                    filtered.map(s => `<option value="${s.id}">${(s.titulo || 'Sin título').toUpperCase()} (${s.fecha || '--'})</option>`).join('');
                sTemplSel.classList.remove('hidden');
            } else {
                sTemplSel.classList.add('hidden');
            }
        };

        sTemplSel.onchange = () => {
            const sid = sTemplSel.value;
            if (!sid) return;
            const found = sesiones.find(s => s.id == sid);
            if (found && found.taskids) {
                sTasksInput.value = (found.taskids || []).join('; ');
                // Opcional: llenar también el nombre del evento si está vacío
                const nameInput = document.querySelector('input[name="nombre"]');
                if (!nameInput.value) nameInput.value = found.titulo;
            }
        };

        // Player loader for convocatoria
        const teamSel = document.getElementById('conv-master-equipo');
        const pList = document.getElementById('conv-players-list');
        const cTemplSel = document.getElementById('conv-template-selector');

        teamSel.onchange = () => {
            const tid = teamSel.value;
            if (!tid) {
                pList.classList.add('hidden');
                cTemplSel.classList.add('hidden');
                return;
            }

            // Población de jugadores
            pList.classList.remove('hidden');
            const filteredPlayers = players.filter(p => p.equipoid == tid);
            pList.innerHTML = filteredPlayers.map(p => `
                <label class="flex items-center gap-3 p-2 hover:bg-white rounded-xl transition-all unified-player-label">
                    <input type="checkbox" name="conv_playerids" value="${p.id}" class="w-4 h-4 rounded text-blue-600">
                    <span class="text-xs font-bold text-slate-700 unified-player-name">${p.nombre}</span>
                </label>
            `).join('') || '<p class="text-[10px] text-slate-400 p-2 italic">Sin jugadores en este equipo</p>';

            // Población de plantillas de convocatoria
            const filteredConvs = convocatorias.filter(c => c.equipoid == tid);
            if (filteredConvs.length > 0) {
                cTemplSel.innerHTML = '<option value="">Opcional: Importar convocatoria existente...</option>' +
                    filteredConvs.map(c => `<option value="${c.id}">${(c.nombre || 'Sin título').toUpperCase()} (${c.fecha || '--'})</option>`).join('');
                cTemplSel.classList.remove('hidden');
            } else {
                cTemplSel.classList.add('hidden');
            }

            if (window.lucide) lucide.createIcons();
        };

        cTemplSel.onchange = () => {
            const cid = cTemplSel.value;
            if (!cid) return;
            const found = convocatorias.find(c => c.id == cid);
            if (found && found.playerids) {
                const checkboxes = pList.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(cb => {
                    cb.checked = found.playerids.includes(cb.value.toString());
                });
                const nameInput = document.querySelector('input[name="nombre"]');
                if (!nameInput.value) nameInput.value = found.nombre;
            }
        };

        const unifiedPlayerSearch = document.getElementById('unified-player-search');
        if (unifiedPlayerSearch) {
            unifiedPlayerSearch.oninput = (e) => {
                const term = e.target.value.toLowerCase();
                const labels = pList.querySelectorAll('.unified-player-label');
                labels.forEach(label => {
                    const name = label.querySelector('.unified-player-name').textContent.toLowerCase();
                    label.style.display = name.includes(term) ? 'flex' : 'none';
                });
            };
        }

        document.getElementById('unified-event-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const baseData = Object.fromEntries(formData.entries());

            try {
                const userRes = await supabaseClient.auth.getUser();
                const currentUser = userRes.data?.user;
                if (!currentUser) throw new Error("Usuario no autenticado");

                // 1. Crear Evento
                const evento = {
                    nombre: baseData.nombre,
                    categoria: baseData.categoria,
                    fecha: baseData.fecha,
                    hora: baseData.hora,
                    completada: false,
                    createdBy: currentUser.id
                };
                const { data: evRes, error: evErr } = await supabaseClient.from('eventos').insert(evento).select();
                if (evErr) throw evErr;

                // 2. Crear Sesión si procede
                if (sCheck.checked) {
                    const session = {
                        titulo: baseData.nombre,
                        fecha: baseData.fecha,
                        hora: baseData.hora,
                        equipoid: baseData.session_equipoid,
                        taskids: baseData.session_tasks ? baseData.session_tasks.split(';').map(id => id.trim()) : [],
                        createdBy: currentUser.id
                    };
                    await supabaseClient.from('sesiones').insert(session);
                }

                // 3. Crear Convocatoria si procede
                if (cCheck.checked) {
                    const playerIds = formData.getAll('conv_playerids');
                    const conv = {
                        nombre: baseData.nombre,
                        fecha: baseData.fecha,
                        hora: baseData.hora,
                        tipo: baseData.conv_tipo,
                        equipoid: baseData.conv_equipoid,
                        playerids: playerIds,
                        createdBy: currentUser.id
                    };
                    const newConv = await db.add('convocatorias', conv);

                    // Auto-crear asistencia para el planificador
                    try {
                        const playersData = {};
                        playerIds.forEach(pid => { playersData[pid] = { status: 'asiste' }; });

                        const team = teams.find(t => t.id.toString() === (baseData.conv_equipoid || '').toString());
                        const teamName = team ? team.nombre : 'EQUIPO';

                        const attendanceData = {
                            fecha: baseData.fecha || new Date().toISOString().split('T')[0],
                            nombre: window.formatAttendanceName(baseData.fecha, teamName, baseData.conv_tipo, baseData.nombre),
                            tipo: baseData.conv_tipo || 'Convocatoria',
                            equipoid: baseData.conv_equipoid ? parseInt(baseData.conv_equipoid) : null,
                            convocatoriaid: newConv.id,
                            players: playersData,
                            lugar: conv.lugar || '',
                            createdBy: currentUser.id
                        };
                        await db.add('asistencia', attendanceData);
                    } catch (attErr) {
                        console.error("Error auto-creating attendance in planner:", attErr);
                    }
                }

                // Forzar actualización de IndexedDB para que se vea en el calendario sin esperar al pooler
                if (window.syncAllData) await window.syncAllData();

                window.customAlert('¡Planificado!', 'Se han creado los registros solicitados.', 'success');
                closeModal();

                // Refresh calendar view
                window.switchView('calendario');
            } catch (err) {
                console.error(err);
                alert("Error en planificación: " + err.message);
            }
        };
    }

    // === NOTIFICATION CENTER ===
    const initNotifications = async () => {
        const notifBtn = document.getElementById('notif-btn');
        const notifBtnMobile = document.getElementById('notif-btn-mobile');
        const notifPanel = document.getElementById('notif-panel');
        const notifBadge = document.getElementById('notif-badge');
        const notifBadgeMobile = document.getElementById('notif-badge-mobile');
        const notifList = document.getElementById('notif-list');
        const notifCount = document.getElementById('notif-count');
        const clearNotifsBtn = document.getElementById('clear-notifs');

        if (!notifBtn || !notifPanel) return;

        const togglePanel = async () => {
            const isClosing = !notifPanel.classList.contains('hidden');
            if (isClosing) {
                notifPanel.classList.add('hidden');
            } else {
                // Opening: refresh first to get latest IDs
                await window.refreshNotifications();
                notifPanel.classList.remove('hidden');

                notifBadge.classList.add('hidden');
                if (notifBadgeMobile) notifBadgeMobile.classList.add('hidden');
                const ringIcon = notifBtn.querySelector('i');
                if (ringIcon) ringIcon.classList.remove('animate-ring');

                // Mark current items as seen
                const seenNotifs = JSON.parse(localStorage.getItem('ms_coach_seen_notifs') || '[]');
                const currentIds = Array.from(notifList.querySelectorAll('[data-notif-id]')).map(el => el.dataset.notifId);
                const updatedSeen = [...new Set([...seenNotifs, ...currentIds])];
                localStorage.setItem('ms_coach_seen_notifs', JSON.stringify(updatedSeen));
            }
        };

        notifBtn.onclick = (e) => { e.stopPropagation(); togglePanel(); };
        if (notifBtnMobile) notifBtnMobile.onclick = (e) => { e.stopPropagation(); togglePanel(); };

        document.addEventListener('click', (e) => {
            if (!notifPanel.contains(e.target) && !notifBtn.contains(e.target) && (!notifBtnMobile || !notifBtnMobile.contains(e.target))) {
                notifPanel.classList.add('hidden');
            }
        });

        window.refreshNotifications = async () => {
            try {
                const now = new Date();
                const today = now.toISOString().split('T')[0];
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tomorrowStr = tomorrow.toISOString().split('T')[0];

                const allEventos = await db.getAll('eventos');
                const allSesiones = await db.getAll('sesiones');
                const allConvocatorias = await db.getAll('convocatorias');

                const userRes = await supabaseClient.auth.getUser();
                const currentUser = userRes.data?.user;
                if (!currentUser) return;

                const seenNotifs = JSON.parse(localStorage.getItem('ms_coach_seen_notifs') || '[]');
                const dismissedNotifs = JSON.parse(localStorage.getItem('ms_coach_dismissed_notifs') || '[]');

                const allItems = [
                    ...allEventos.map(e => ({ ...e, type: 'evento', color: 'amber', icon: 'alarm-clock', view: 'eventos' })),
                    ...allSesiones.map(s => ({ ...s, type: 'sesion', color: 'blue', icon: 'calendar', nombre: s.titulo || 'Sesión', view: 'sesiones' })),
                    ...allConvocatorias.map(c => ({
                        ...c,
                        type: 'convocatoria',
                        color: c.tipo === 'Torneo' ? 'emerald' : 'indigo',
                        icon: c.tipo === 'Torneo' ? 'trophy' : 'users',
                        view: c.tipo === 'Torneo' ? 'torneos' : 'convocatorias'
                    }))
                ];

                const agendaItems = allItems.filter(item => {
                    const defaultTime = '09:00';
                    const itemDateTime = new Date(`${item.fecha}T${item.hora || defaultTime}`);

                    const isTime = itemDateTime <= now;
                    const isMine = item.createdBy === currentUser.id;
                    const isSharedWithMe = item.sharedWith && item.sharedWith.includes(currentUser.id);
                    const notSeen = !seenNotifs.includes(`${item.type}_${item.id}`);
                    const isDismissed = dismissedNotifs.includes(`${item.type}_${item.id}`);

                    const isUpcomingShared = isSharedWithMe && !isMine && notSeen;

                    return (isTime || isUpcomingShared) && !item.completada && !isDismissed;
                }).sort((a, b) => {
                    const timeA = new Date(`${a.fecha}T${a.hora || '09:00'}`).getTime();
                    const timeB = new Date(`${b.fecha}T${b.hora || '09:00'}`).getTime();
                    return timeB - timeA;
                });

                if (agendaItems.length > 0) {
                    const hasUnseen = agendaItems.some(item => !seenNotifs.includes(`${item.type}_${item.id}`));

                    if (!notifPanel.classList.contains('hidden')) {
                        const currentIds = agendaItems.map(item => `${item.type}_${item.id}`);
                        const updatedSeen = [...new Set([...seenNotifs, ...currentIds])];
                        localStorage.setItem('ms_coach_seen_notifs', JSON.stringify(updatedSeen));
                    }

                    if (hasUnseen && notifPanel.classList.contains('hidden')) {
                        notifBadge.classList.remove('hidden');
                        if (notifBadgeMobile) notifBadgeMobile.classList.remove('hidden');
                        const ringIcon = notifBtn.querySelector('i');
                        if (ringIcon) ringIcon.classList.add('animate-ring');
                    }

                    notifCount.textContent = `${agendaItems.length} avisos`;
                    notifList.innerHTML = agendaItems.map(item => {
                        const isSeen = seenNotifs.includes(`${item.type}_${item.id}`);
                        const isShared = item.sharedWith && item.sharedWith.includes(currentUser.id) && item.createdBy !== currentUser.id;

                        let dateLabel = item.fecha === today ? 'Hoy' : item.fecha === tomorrowStr ? 'Mañana' : item.fecha;
                        if (isShared && !isSeen) dateLabel = "¡NUEVO!";

                        return `
                        <div data-notif-id="${item.type}_${item.id}" class="notif-swipe-container rounded-2xl">
                            <div class="notif-swipe-actions">
                                <div class="notif-swipe-action-left flex items-center opacity-0 gap-2">
                                    <i data-lucide="mail-open" class="w-4 h-4"></i>
                                    <span>${isSeen ? 'POR LEER' : 'VISTO'}</span>
                                </div>
                                <div class="notif-swipe-action-right flex items-center opacity-0 gap-2">
                                    <span>BORRAR</span>
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </div>
                            </div>
                            <div class="notif-swipe-content flex items-start gap-3 p-3 hover:bg-slate-50 transition-colors rounded-2xl cursor-pointer group">
                                <div class="w-10 h-10 ${item.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                                item.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                                    item.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                        'bg-indigo-50 text-indigo-600'
                            } rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-white relative" onclick="window.switchView('${item.view}')">
                                    <i data-lucide="${item.icon}" class="w-4 h-4"></i>
                                    ${!isSeen ? '<span class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white"></span>' : ''}
                                </div>
                                <div class="flex-1 min-w-0" onclick="window.switchView('${item.view}')">
                                    <div class="flex justify-between items-start mb-0.5">
                                        <span class="text-[9px] font-black uppercase tracking-widest ${item.fecha === today || (isShared && !isSeen) ? 'text-blue-500' : 'text-slate-400'}">${dateLabel} · ${item.hora || '--:--'}</span>
                                    </div>
                                    <h5 class="text-[11px] font-bold ${isSeen ? 'text-slate-500' : 'text-slate-800'} line-clamp-1 group-hover:text-blue-600 transition-colors uppercase">${item.nombre || 'Sin título'}</h5>
                                    <p class="text-[9px] text-slate-500 truncate lowercase italic">${isShared ? 'Compartido por Staff' : (item.lugar || item.equiponombre || 'Campo Principal')}</p>
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('');
                    if (window.lucide) lucide.createIcons();
                    window.initNotifSwiping();
                } else {
                    notifList.innerHTML = `
                        <div class="py-12 text-center text-slate-300">
                            <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                <i data-lucide="calendar-check" class="w-8 h-8 opacity-20 text-slate-400"></i>
                            </div>
                            <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Todo al día</p>
                        </div>
                    `;
                    notifCount.textContent = '0 nuevas';
                    notifBadge.classList.add('hidden');
                    if (notifBadgeMobile) notifBadgeMobile.classList.add('hidden');
                    const ringIcon = notifBtn.querySelector('i');
                    if (ringIcon) ringIcon.classList.remove('animate-ring');
                    if (window.lucide) lucide.createIcons();
                }
            } catch (err) {
                console.error("Notif refresh fail:", err);
            }
        };

        if (clearNotifsBtn) {
            clearNotifsBtn.onclick = () => {
                const seenNotifs = JSON.parse(localStorage.getItem('ms_coach_seen_notifs') || '[]');
                const currentIds = Array.from(notifList.querySelectorAll('[data-notif-id]')).map(el => el.dataset.notifId);
                const updatedSeen = [...new Set([...seenNotifs, ...currentIds])];
                localStorage.setItem('ms_coach_seen_notifs', JSON.stringify(updatedSeen));

                notifBadge.classList.add('hidden');
                if (notifBadgeMobile) notifBadgeMobile.classList.add('hidden');
                if (notifBtn.querySelector('i')) notifBtn.querySelector('i').classList.remove('animate-ring');
                window.refreshNotifications();
            };
        }

        const dismissNotifsBtn = document.getElementById('dismiss-notifs');
        if (dismissNotifsBtn) {
            dismissNotifsBtn.onclick = () => {
                const dismissedNotifs = JSON.parse(localStorage.getItem('ms_coach_dismissed_notifs') || '[]');
                const currentIds = Array.from(notifList.querySelectorAll('[data-notif-id]')).map(el => el.dataset.notifId);
                const updatedDismissed = [...new Set([...dismissedNotifs, ...currentIds])];
                localStorage.setItem('ms_coach_dismissed_notifs', JSON.stringify(updatedDismissed));

                notifBadge.classList.add('hidden');
                if (notifBadgeMobile) notifBadgeMobile.classList.add('hidden');
                if (notifBtn.querySelector('i')) notifBtn.querySelector('i').classList.remove('animate-ring');
                notifPanel.classList.add('hidden');
                window.refreshNotifications();
            };
        }

        // Marcar una notificación individual como leída/no leída
        window.toggleNotifSeen = (fullId, currentIsSeen) => {
            let seenNotifs = JSON.parse(localStorage.getItem('ms_coach_seen_notifs') || '[]');
            if (currentIsSeen) {
                // Mark as UNREAD: remove from seen
                seenNotifs = seenNotifs.filter(id => id !== fullId);
            } else {
                // Mark as READ: add to seen
                if (!seenNotifs.includes(fullId)) seenNotifs.push(fullId);
            }
            localStorage.setItem('ms_coach_seen_notifs', JSON.stringify(seenNotifs));
            window.refreshNotifications();
        };
        // Descartar notificación individual (Borrar)
        window.dismissIndividualNotif = (fullId) => {
            const dismissedNotifs = JSON.parse(localStorage.getItem('ms_coach_dismissed_notifs') || '[]');
            if (!dismissedNotifs.includes(fullId)) dismissedNotifs.push(fullId);
            localStorage.setItem('ms_coach_dismissed_notifs', JSON.stringify(dismissedNotifs));
            window.refreshNotifications();
        };

        // Swipe Functionality Logic
        window.initNotifSwiping = () => {
            const containers = document.querySelectorAll('.notif-swipe-container');
            containers.forEach(container => {
                const content = container.querySelector('.notif-swipe-content');
                const actionLeft = container.querySelector('.notif-swipe-action-left');
                const actionRight = container.querySelector('.notif-swipe-action-right');
                const fullId = container.dataset.notifId;

                if (!content) return;

                let startX = 0;
                let currentTranslate = 0;
                let isDragging = false;
                const threshold = 80;

                const onStart = (e) => {
                    startX = (e.type === 'touchstart') ? e.touches[0].clientX : e.clientX;
                    isDragging = true;
                    content.style.transition = 'none';

                    // Attach global listeners for move and end
                    if (e.type === 'touchstart') {
                        document.addEventListener('touchmove', onMove, { passive: false });
                        document.addEventListener('touchend', onEnd);
                    } else {
                        document.addEventListener('mousemove', onMove);
                        document.addEventListener('mouseup', onEnd);
                    }
                };

                const onMove = (e) => {
                    if (!isDragging) return;

                    // Prevent default scrolling if swiping horizontally
                    const x = (e.type === 'touchmove') ? e.touches[0].clientX : e.clientX;
                    currentTranslate = x - startX;

                    if (Math.abs(currentTranslate) > 10) {
                        if (e.cancelable) e.preventDefault();
                    }

                    if (currentTranslate > 120) currentTranslate = 120;
                    if (currentTranslate < -120) currentTranslate = -120;

                    content.style.transform = `translateX(${currentTranslate}px)`;

                    if (currentTranslate > 20) {
                        actionLeft.style.opacity = Math.min(1, currentTranslate / 60);
                        actionRight.style.opacity = 0;
                    } else if (currentTranslate < -20) {
                        actionRight.style.opacity = Math.min(1, Math.abs(currentTranslate) / 60);
                        actionLeft.style.opacity = 0;
                    } else {
                        actionLeft.style.opacity = 0;
                        actionRight.style.opacity = 0;
                    }
                };

                const onEnd = (e) => {
                    if (!isDragging) return;
                    isDragging = false;

                    content.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

                    if (currentTranslate > threshold) {
                        content.style.transform = 'translateX(0px)';
                        const isSeen = JSON.parse(localStorage.getItem('ms_coach_seen_notifs') || '[]').includes(fullId);
                        window.toggleNotifSeen(fullId, isSeen);
                    } else if (currentTranslate < -threshold) {
                        content.style.transform = 'translateX(-100%)';
                        setTimeout(() => window.dismissIndividualNotif(fullId), 200);
                    } else {
                        content.style.transform = 'translateX(0px)';
                        actionLeft.style.opacity = 0;
                        actionRight.style.opacity = 0;
                    }

                    // Clean up global listeners
                    document.removeEventListener('touchmove', onMove);
                    document.removeEventListener('touchend', onEnd);
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onEnd);

                    currentTranslate = 0;
                };

                content.onmousedown = onStart;
                content.ontouchstart = onStart;
            });
        };

        // Trigger check at start
        await window.refreshNotifications();

        // Refresh every minute to check time-based notifications
        setInterval(window.refreshNotifications, 60 * 1000);
    };

    // === EMAIL NOTIFICATIONS ===
    window.sendEmailNotification = async (type, item) => {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user || !user.email) return;

            const isSession = type === 'sesiones';
            const subject = `⚽ Recordatorio RS CENTRO: ${item.nombre || item.titulo}`;
            const html = `
                <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
                    <div style="background: #2563eb; padding: 32px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">RS CENTRO</h1>
                        <p style="color: #dbeafe; margin: 8px 0 0 0;">Recordatorio de Agenda</p>
                    </div>
                    <div style="padding: 32px;">
                        <h2 style="margin: 0 0 16px 0; font-size: 20px;">${item.nombre || item.titulo}</h2>
                        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
                            <p style="margin: 0 0 8px 0;"><strong>Fecha:</strong> ${item.fecha}</p>
                            <p style="margin: 0 0 8px 0;"><strong>Hora:</strong> ${item.hora}</p>
                            <p style="margin: 0;"><strong>Lugar:</strong> ${item.lugar || item.equiponombre || 'Campo Principal'}</p>
                        </div>
                        ${item.notas ? `<p style="color: #64748b; font-size: 14px; line-height: 1.5;">${item.notas}</p>` : ''}
                        <div style="margin-top: 32px; padding-top: 32px; border-t: 1px solid #e2e8f0; text-align: center;">
                            <a href="https://mscoach.com" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Ver en el Panel</a>
                        </div>
                    </div>
                </div>
            `;

            // Para que esto funcione, se requiere una Supabase Edge Function o un servicio como Resend.
            // Implementación vía Edge Function (Recomendado):
            /*
            await supabaseClient.functions.invoke('send-email', {
                body: { to: user.email, subject, html }
            });
            */

            // Simulación en consola por ahora (hasta configurar la clave de Resend/Edge Function)
            console.log("SIMULACIÓN DE ENVÍO DE EMAIL:");
            console.log(`Para: ${user.email}`);
            console.log(`Asunto: ${subject}`);

            // Si el usuario tiene una Edge Function llamada 'send-email', se activaría aquí.
            window.customAlert('Aviso Email', `Se ha programado el recordatorio para ${user.email}. (Asegúrate de tener configurada la Edge Function en Supabase)`, 'success');

        } catch (err) {
            console.error("Error sending email:", err);
        }
    };

    window.autoDetectLateralidad = () => {
        const checked = Array.from(document.querySelectorAll('input[name="posicion"]:checked')).map(i => i.value);
        const select = document.querySelector('select[name="lateralidad"]');
        if (!select) return;

        let hasD = checked.some(p => p.endsWith('D'));
        let hasZ = checked.some(p => p.endsWith('Z'));

        if (hasD && hasZ) select.value = 'Ambidiestro';
        else if (hasD) select.value = 'Derecho';
        else if (hasZ) select.value = 'Zurdo';
    };

    window.parsePosition = (pos) => {
        if (!pos) return [];
        if (Array.isArray(pos)) return pos;
        if (typeof pos !== 'string') return [pos];

        let cleanPos = pos.trim();
        // Handle strings that look like arrays: ["ACD"] or ['ACD'] or [ACD]
        if (cleanPos.startsWith('[') && cleanPos.endsWith(']')) {
            try {
                const parsed = JSON.parse(cleanPos.replace(/'/g, '"')); // Try fixing single quotes
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {
                // Manual fallback for very malformed strings
                cleanPos = cleanPos.substring(1, cleanPos.length - 1).replace(/['"]/g, '');
            }
        }

        // Handle comma or slash separated strings
        return cleanPos.split(/[,/]/).map(s => s.trim()).filter(Boolean);
    };

    window.formatPosition = (pos) => {
        const parsed = window.parsePosition(pos);
        if (parsed.length === 0) return '--';
        return parsed.join(', ');
    };

    window.bulkUpdateLateralidad = async (e) => {
        const btn = e?.currentTarget || document.querySelector('button[onclick*="bulkUpdateLateralidad"]');
        if (!btn) return;

        const originalHtml = btn.innerHTML;
        btn.style.pointerEvents = 'none';

        try {
            // Use current filtered players or fallback to all
            const players = window.currentFilteredPlayers || await db.getAll('jugadores');
            const total = players.length;
            let updatedCount = 0;

            if (total === 0) {
                window.customAlert('Aviso', 'No hay jugadores para actualizar', 'info');
                return;
            }

            for (let i = 0; i < total; i++) {
                const p = players[i];

                // Actualizar progreso visual en el botón
                btn.innerHTML = `<i class="w-4 h-4 animate-spin text-amber-600"></i> ${i + 1}/${total}`;

                const positions = window.parsePosition(p.posicion);
                if (positions.length === 0) continue;

                let hasD = positions.some(pos => typeof pos === 'string' && pos.toUpperCase().endsWith('D'));
                let hasZ = positions.some(pos => typeof pos === 'string' && pos.toUpperCase().endsWith('Z'));

                let newPie = '';
                if (hasD && hasZ) newPie = 'Ambidiestro';
                else if (hasD) newPie = 'Derecho';
                else if (hasZ) newPie = 'Zurdo';

                if (newPie && (!p.lateralidad || p.lateralidad.trim() === '')) {
                    p.lateralidad = newPie;
                    await db.update('jugadores', p);
                    updatedCount++;
                }
            }
            window.customAlert('Proceso Completado', `Se ha analizado a ${total} jugadores y se ha asignado el pie a ${updatedCount} de ellos.`, 'success');
            window.renderJugadores(document.getElementById('content-container'));
        } catch (err) {
            console.error("Bulk update error:", err);
            window.customAlert('Error', 'No se pudo completar el proceso: ' + err.message, 'error');
        } finally {
            btn.innerHTML = originalHtml;
            btn.style.pointerEvents = 'auto';
            if (window.lucide) lucide.createIcons();
        }
    };

    window.renderJugadores = async function (container) {
        const [players, teams] = await Promise.all([
            db.getAll('jugadores'),
            db.getAll('equipos')
        ]);
        const sortedTeams = window.getSortedTeams(teams);

        const currentTeamId = window.currentJugadoresTeamId || 'all';
        const searchTerm = window.jugadoresSearchTerm || '';
        const currentAno = window.currentJugadoresAno || 'all';
        const currentSexo = window.currentJugadoresSexo || 'all';
        const currentPosicion = window.currentJugadoresPosicion || 'all';
        const currentClub = window.currentJugadoresClub || 'all';

        // Obtener años y clubes únicos para los filtros (Menor a Mayor)
        const uniqueYears = [...new Set(players.map(p => p.anionacimiento).filter(Boolean))].sort((a, b) => a - b);
        const uniqueClubs = [...new Set(players.map(p => p.equipoConvenido).filter(Boolean))].sort((a, b) => a.localeCompare(b));

        const filtered = players.filter(p => {
            const matchesTeam = currentTeamId === 'all' ||
                p.equipoid?.toString() === currentTeamId.toString() ||
                (p.equipo_ids && Array.isArray(p.equipo_ids) && p.equipo_ids.map(String).includes(currentTeamId.toString()));

            const matchesSearch = !searchTerm || p.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesAno = currentAno === 'all' || p.anionacimiento?.toString() === currentAno.toString();
            const matchesSexo = currentSexo === 'all' ||
                (currentSexo === 'none' ? !(p.sexo || '').trim() :
                    (p.sexo || '').toLowerCase().startsWith(currentSexo.toLowerCase().substring(0, 1)));
            const matchesPosicion = currentPosicion === 'all' || window.parsePosition(p.posicion).includes(currentPosicion);
            const matchesClub = currentClub === 'all' || p.equipoConvenido === currentClub;
            return matchesTeam && matchesSearch && matchesAno && matchesSexo && matchesPosicion && matchesClub;
        }).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

        window.currentFilteredPlayers = filtered;

        container.innerHTML = `
            <div class="space-y-8 animate-in fade-in duration-500">
                <!-- Search & Filters Toolbar -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <button onclick="window.cleanDuplicatePlayers()" class="px-4 py-2 bg-rose-50 text-rose-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2 border border-rose-100/50 shadow-sm mr-2">
                            <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
                            Limpiar Duplicados
                        </button>
                    </div>
                    <div class="relative w-full md:w-96 group">
                        <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors"></i>
                        <input type="text" 
                            id="jugadores-search-input"
                            placeholder="Buscar jugador por nombre..." 
                            value="${searchTerm}"
                            oninput="window.updateJugadoresSearch(this.value)"
                            class="w-full pl-12 pr-12 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 ring-blue-50 transition-all shadow-sm">
                        ${searchTerm ? `
                            <button onclick="window.updateJugadoresSearch(''); window.renderJugadores(document.getElementById('content-container'))" 
                                class="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Borrar búsqueda">
                                <i data-lucide="x" class="w-4 h-4"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Interactive Filters Toolbar -->
                <div class="bg-white p-3 rounded-[2rem] border border-slate-100 shadow-sm">
                    <!-- Detailed Selectors Row -->
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:flex items-center gap-2">
                        <!-- Team Filter (New Primary) -->
                        <div class="relative flex-1 lg:min-w-[200px]">
                            <select onchange="window.switchJugadoresTeam(this.value)" class="w-full p-3.5 bg-blue-50 border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:bg-white focus:border-blue-200 transition-all appearance-none cursor-pointer text-blue-600">
                                <option value="all" ${currentTeamId === 'all' ? 'selected' : ''}>TODAS LAS PLANTILLAS</option>
                                ${sortedTeams.map(t => `
                                    <option value="${t.id}" ${currentTeamId.toString() === t.id.toString() ? 'selected' : ''}>${t.nombre.split(' ||| ')[0]}</option>
                                `).join('')}
                            </select>
                            <i data-lucide="chevron-down" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none"></i>
                        </div>

                        <div class="relative flex-1 lg:min-w-[140px]">
                            <select onchange="window.switchJugadoresAno(this.value)" class="w-full p-3.5 bg-slate-50 border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:bg-white focus:border-blue-100 transition-all appearance-none cursor-pointer">
                                <option value="all" ${currentAno === 'all' ? 'selected' : ''}>AÑOS: TODOS</option>
                                ${uniqueYears.map(y => `<option value="${y}" ${currentAno.toString() === y.toString() ? 'selected' : ''}>${y}</option>`).join('')}
                            </select>
                            <i data-lucide="chevron-down" class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"></i>
                        </div>

                        <div class="relative flex-1 lg:min-w-[140px]">
                            <select onchange="window.switchJugadoresPosicion(this.value)" class="w-full p-3.5 bg-slate-50 border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:bg-white focus:border-blue-100 transition-all appearance-none cursor-pointer">
                                <option value="all" ${currentPosicion === 'all' ? 'selected' : ''}>TODAS LAS POSICIONES</option>
                                ${PLAYER_POSITIONS.map(pos => `<option value="${pos}" ${currentPosicion === pos ? 'selected' : ''}>${pos}</option>`).join('')}
                            </select>
                            <i data-lucide="chevron-down" class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"></i>
                        </div>

                        <div class="relative flex-1 lg:min-w-[140px]">
                            <select onchange="window.switchJugadoresSexo(this.value)" class="w-full p-3.5 bg-slate-50 border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:bg-white focus:border-blue-100 transition-all appearance-none cursor-pointer">
                                <option value="all" ${currentSexo === 'all' ? 'selected' : ''}>AMBOS SEXOS</option>
                                <option value="Masculino" ${currentSexo === 'Masculino' ? 'selected' : ''}>MASCULINO</option>
                                <option value="Femenino" ${currentSexo === 'Femenino' ? 'selected' : ''}>FEMENINO</option>
                                <option value="none" ${currentSexo === 'none' ? 'selected' : ''}>SIN ASIGNAR</option>
                            </select>
                            <i data-lucide="chevron-down" class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"></i>
                        </div>

                        <!-- Club Filter -->
                        <div class="relative flex-1 lg:min-w-[160px]">
                            <select onchange="window.switchJugadoresClub(this.value)" class="w-full p-3.5 bg-slate-50 border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:bg-white focus:border-blue-100 transition-all appearance-none cursor-pointer">
                                <option value="all" ${currentClub === 'all' ? 'selected' : ''}>CLUBES: TODOS</option>
                                ${uniqueClubs.map(c => `<option value="${c}" ${currentClub === c ? 'selected' : ''}>${c}</option>`).join('')}
                            </select>
                            <i data-lucide="chevron-down" class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"></i>
                        </div>

                        <button onclick="window.bulkUpdateLateralidad(event)" class="lg:ml-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all group" title="Auto-asignar pie por posición">
                            <i data-lucide="zap" class="w-4 h-4 group-hover:animate-pulse"></i>
                            AUTO-PIE
                        </button>
                    </div>
                </div>

                <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50/50 border-b border-slate-100">
                                    <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jugador</th>
                                    <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Posición</th>
                                    <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Año</th>
                                    <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Nivel</th>
                                    <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Pie</th>
                                    <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Sexo</th>
                                    <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filtered.map(p => {
            const playerTeam = teams.find(t => t.id?.toString() === p.equipoid?.toString());
            const playerTeamName = playerTeam ? playerTeam.nombre.split(' ||| ')[0] : '';
            return `
                                        <tr class="border-b border-slate-50 hover:bg-blue-50/30 transition-all group">
                                            <td class="px-8 py-4">
                                                <div class="flex items-center gap-4">
                                                    <div class="w-12 h-12 rounded-xl bg-slate-50 overflow-hidden border border-slate-100 group-hover:border-blue-200 transition-all cursor-pointer flex items-center justify-center" onclick="window.editPlayer('${p.id}')">
                                                        ${p.foto ? `<img src="${p.foto}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden')">` : ''}
                                                        <i data-lucide="user" class="w-5 h-5 text-slate-300 ${p.foto ? 'hidden' : ''}"></i>
                                                    </div>
                                                    <div>
                                                        <p class="text-[11px] font-black text-slate-800 uppercase tracking-tight cursor-text outline-none focus:text-blue-600 focus:ring-0" contenteditable="true" onblur="if(this.innerText !== '${p.nombre}') window.updatePlayerField('${p.id}', 'nombre', this.innerText.toUpperCase())" onkeydown="if(event.key === 'Enter') { event.preventDefault(); this.blur(); }">${p.nombre}</p>
                                                        <div class="flex flex-wrap items-center gap-1.5 mt-0.5">
                                                            <p class="text-[9px] font-black text-blue-500 uppercase tracking-widest">${p.equipoConvenido || 'SIN CLUB'}</p>
                                                            ${p.equipoid ? `<span class="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-[4px] text-[7px] font-black uppercase tracking-tight">${playerTeamName}</span>` : ''}
                                                            ${(p.equipo_ids || []).map(tid => {
                const t = teams.find(tm => tm.id?.toString() === tid.toString());
                if (!t) return '';
                return `<span class="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-[4px] text-[7px] font-black uppercase tracking-tight">${t.nombre.split(' ||| ')[0]}</span>`;
            }).join('')}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="cursor-pointer" onclick="window.toggleInlinePosSelector('${p.id}', event)">
                                                    <span class="text-[10px] font-black text-blue-600 uppercase tracking-[0.15em] border-b border-blue-200/30 hover:border-blue-600 transition-all">
                                                        ${window.parsePosition(p.posicion).join(', ') || '--'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4 text-center">
                                                <div class="inline-block px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg">
                                                    <p class="text-[10px] font-black text-slate-500 cursor-text outline-none focus:text-blue-600" contenteditable="true" onblur="if(this.innerText !== '${p.anionacimiento || ''}') window.updatePlayerField('${p.id}', 'anionacimiento', parseInt(this.innerText))" onkeydown="if(event.key === 'Enter') { event.preventDefault(); this.blur(); }">${p.anionacimiento || ''}</p>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4 text-center">
                                                ${window.renderStars(p.nivel || 3, p.id)}
                                            </td>
                                            <td class="px-6 py-4 text-center">
                                                <button onclick="window.togglePlayerLateralidad('${p.id}', '${p.lateralidad || ''}')" class="text-[9px] font-black uppercase tracking-tight transition-all hover:scale-110 ${p.lateralidad === 'Zurdo' ? 'text-amber-600' : (p.lateralidad === 'Ambidiestro' ? 'text-emerald-600' : 'text-slate-400')}">
                                                    ${p.lateralidad || '--'}
                                                </button>
                                            </td>
                                            <td class="px-6 py-4 text-center">
                                                <button onclick="window.togglePlayerSexo('${p.id}', '${p.sexo || ''}')" class="text-[10px] font-black uppercase tracking-widest transition-all hover:scale-110 ${p.sexo?.toUpperCase().startsWith('F') ? 'text-rose-500' : (p.sexo?.toUpperCase().startsWith('M') ? 'text-blue-500' : 'text-slate-300')}">
                                                    ${p.sexo?.substring(0, 1).toUpperCase() || '?'}
                                                </button>
                                            </td>
                                            <td class="px-6 py-4 text-right">
                                                <div class="flex justify-end gap-2">
                                                    <button onclick="window.viewPlayerProfile('${p.id}')" class="p-2.5 bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all" title="Ver Ficha">
                                                        <i data-lucide="user" class="w-4 h-4"></i>
                                                    </button>
                                                    <button onclick="window.editPlayer('${p.id}')" class="p-2.5 bg-slate-50 text-slate-400 hover:bg-amber-500 hover:text-white rounded-xl transition-all" title="Editar">
                                                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
        }).join('') || `
                                    <tr>
                                        <td colspan="7" class="py-20 text-center">
                                            <i data-lucide="users" class="w-12 h-12 text-slate-200 mx-auto mb-4"></i>
                                            <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No se han encontrado jugadores</p>
                                        </td>
                                    </tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) {
            requestAnimationFrame(() => {
                lucide.createIcons();
            });
        }

        const searchInput = document.getElementById('jugadores-search-input');
        if (searchInput && searchTerm) {
            searchInput.focus();
            searchInput.setSelectionRange(searchTerm.length, searchTerm.length);
        }
    };

    window.switchJugadoresTeam = (teamId) => {
        window.currentJugadoresTeamId = teamId;
        window.renderJugadores(document.getElementById('content-container'));
    };

    window.updateJugadoresSearch = window.debounce((val) => {
        window.jugadoresSearchTerm = val;
        window.renderJugadores(document.getElementById('content-container'));
    }, 300);

    window.switchJugadoresAno = (val) => {
        window.currentJugadoresAno = val;
        window.renderJugadores(document.getElementById('content-container'));
    };

    window.switchJugadoresSexo = (val) => {
        window.currentJugadoresSexo = val;
        window.renderJugadores(document.getElementById('content-container'));
    };

    window.switchJugadoresPosicion = (val) => {
        window.currentJugadoresPosicion = val;
        window.renderJugadores(document.getElementById('content-container'));
    };

    window.switchJugadoresClub = (val) => {
        window.currentJugadoresClub = val;
        window.renderJugadores(document.getElementById('content-container'));
    };

    window.showNewPlayerModal = async () => {
        const teams = window.getSortedTeams(await db.getAll('equipos'));
        const clubs = await db.getAll('clubes');
        modalContainer.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Nuevo Jugador</h3>
                        <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Añadir ficha al sistema global</p>
                    </div>
                    <button onclick="closeModal()" class="p-3 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-all"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>

                <form id="new-player-form" class="space-y-6">
                    <div class="flex flex-col md:flex-row gap-8">
                        <div class="w-full md:w-48 flex flex-col items-center gap-4">
                            <div class="w-40 h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex items-center justify-center relative overflow-hidden group cursor-pointer">
                                <img id="player-photo-preview" src="" class="hidden w-full h-full object-cover">
                                <div id="photo-placeholder" class="text-center">
                                    <i data-lucide="camera" class="w-8 h-8 text-slate-300 mx-auto mb-2"></i>
                                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Subir Foto</p>
                                </div>
                                <input type="file" id="player-photo-input" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer">
                            </div>
                        </div>

                        <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="space-y-2 md:col-span-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre Completo</label>
                                <input name="nombre" type="text" required class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all">
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Equipo</label>
                                <select name="equipoid" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all appearance-none">
                                    <option value="">Jugador Libre</option>
                                    ${teams.map(t => `<option value="${t.id}">${t.nombre.split(' ||| ')[0]}</option>`).join('')}
                                </select>
                            </div>
                            <div class="space-y-3 md:col-span-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Posiciones</label>
                                <div class="flex flex-wrap gap-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                    ${PLAYER_POSITIONS.map(pos => `
                                        <label class="cursor-pointer group">
                                            <input type="checkbox" name="posicion" value="${pos}" class="hidden peer" onchange="window.autoDetectLateralidad(this)">
                                            <span class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight border border-slate-200 bg-white text-slate-400 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 transition-all hover:border-blue-200">
                                                ${pos}
                                            </span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha de Nacimiento</label>
                                <input name="fechanacimiento" type="date" onchange="const y = this.value.split('-')[0]; if(y) this.form.anionacimiento.value = y;" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all">
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Año Nacimiento</label>
                                <input name="anionacimiento" type="number" placeholder="2010" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all">
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Sexo</label>
                                <select name="sexo" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all appearance-none">
                                    <option value="" selected>Sin asignar</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Femenino">Femenino</option>
                                </select>
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Lateralidad (Pie)</label>
                                <select name="lateralidad" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all appearance-none">
                                    <option value="" selected>Sin asignar</option>
                                    <option value="Derecho">Derecho</option>
                                    <option value="Zurdo">Zurdo</option>
                                    <option value="Ambidiestro">Ambidiestro</option>
                                </select>
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Club Convenido</label>
                                <input name="equipoConvenido" list="clubs-list-new" placeholder="Escribe o selecciona club..." class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all">
                                <datalist id="clubs-list-new">
                                    ${clubs.map(c => `<option value="${c.nombre}">`).join('')}
                                </datalist>
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nivel Inicial</label>
                                <div id="star-rating-new"></div>
                            </div>

                            <!-- Otros Equipos (Solo Femenino) -->
                            <div id="extra-teams-container" class="space-y-2 md:col-span-2 hidden">
                                <label class="block text-[10px] font-black text-blue-600 uppercase tracking-widest px-1">Otros Equipos (Multiequipo)</label>
                                <div class="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-blue-50/30 border border-blue-100 rounded-2xl">
                                    ${teams.map(t => `
                                        <label class="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 transition-all">
                                            <input type="checkbox" name="equipo_ids" value="${t.id}" class="w-4 h-4 rounded text-blue-600">
                                            <span class="text-[9px] font-bold text-slate-600 truncate uppercase">${t.nombre.split(' ||| ')[0]}</span>
                                        </label>
                                    `).join('')}
                                </div>
                                <p class="text-[8px] font-medium text-blue-400 italic px-1">Solo disponible para jugadoras que participan en varias categorías.</p>
                            </div>
                        </div>
                    </div>

                    <div class="pt-6 border-t border-slate-100 flex justify-end gap-3">
                        <button type="button" onclick="closeModal()" class="px-8 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase tracking-widest hover:bg-slate-200 transition-all text-[10px]">Cancelar</button>
                        <button type="submit" class="px-12 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all uppercase tracking-widest text-[10px]">Guardar Jugador</button>
                    </div>
                </form>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
        window.initStarRating('star-rating-new', 3);
        modalOverlay.classList.add('active');

        const photoInput = document.getElementById('player-photo-input');
        const photoPreview = document.getElementById('player-photo-preview');
        const placeholder = document.getElementById('photo-placeholder');

        const sexoSelect = document.querySelector('select[name="sexo"]');
        const extraTeams = document.getElementById('extra-teams-container');
        if (sexoSelect && extraTeams) {
            sexoSelect.addEventListener('change', () => {
                if (sexoSelect.value === 'Femenino') extraTeams.classList.remove('hidden');
                else extraTeams.classList.add('hidden');
            });
        }

        photoInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    photoPreview.src = re.target.result;
                    photoPreview.classList.remove('hidden');
                    placeholder.classList.add('hidden');
                };
                reader.readAsDataURL(file);
            }
        };

        document.getElementById('new-player-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.posicion = formData.getAll('posicion').join(', '); // Save as clean string
            data.equipo_ids = formData.getAll('equipo_ids'); // Save as array

            // Cast numeric fields
            if (data.anionacimiento) data.anionacimiento = parseInt(data.anionacimiento);
            if (data.nivel) data.nivel = parseInt(data.nivel);

            // Handle equipoid (should be number or null)
            if (data.equipoid === "") data.equipoid = null;
            else if (data.equipoid) data.equipoid = parseInt(data.equipoid);

            // Handle multi-team (should be array of numbers)
            if (data.equipo_ids && Array.isArray(data.equipo_ids)) {
                data.equipo_ids = data.equipo_ids.map(id => parseInt(id));
            }

            // Forzar el campo exacto para Supabase
            data.equipoConvenido = formData.get('equipoConvenido') || null;

            try {
                if (photoInput.files[0]) {
                    data.foto = await db.uploadImage(photoInput.files[0]);
                    data.foto_blob = await window.generatePdfBlob(photoInput.files[0]);
                }

                await db.add('jugadores', data);
                window.customAlert('¡Éxito!', 'Jugador creado correctamente.', 'success');
                closeModal();
                window.renderJugadores(document.getElementById('content-container'));
            } catch (err) {
                console.error(err);
                window.customAlert('Error', `No se pudo crear el jugador: ${err.message}`, 'error');
            }
        };
    };

    window.viewPlayerProfile = async (playerId, selectedSeason = window.currentSeason) => {
        const player = await db.get('jugadores', playerId);
        if (!player) return;

        const teams = window.getSortedTeams(await db.getAll('equipos'));
        const attendance = await db.getAll('asistencia');
        const convocatorias = await db.getAll('convocatorias');

        // --- SEASON TABS CALCULATION ---
        const allDates = [...attendance.map(a => a.fecha), ...convocatorias.map(c => c.fecha)].filter(Boolean);
        const availableSeasons = [...new Set(allDates.map(d => window.getSeason(d)))].sort().reverse();

        // Cache for inner scopes
        const rawPlayerConvs = convocatorias.filter(c => {
            const pids = c.playerids || [];
            return pids.map(String).includes(String(playerId));
        });

        // Filter by season
        const filterBySeason = (items, dateField = 'fecha') => {
            if (selectedSeason === 'ALL') return items;
            return items.filter(i => window.getSeason(i[dateField]) === selectedSeason);
        };

        const playerConvs = filterBySeason(rawPlayerConvs);
        const playerAttendance = filterBySeason(attendance.filter(a => a.players && a.players[playerId]));

        const team = teams.find(t => t.id?.toString() === player.equipoid?.toString());

        // --- PRE-CALCULATE CATEGORIZED DATA ---
        const categorized = { ciclos: [], sesiones: [], torneos: [] };

        // Detailed Attendance Counts
        const attendanceSummary = {};
        playerAttendance.forEach(a => {
            const s = a.players[playerId];
            let status = (typeof s === 'object' ? s.status : s || 'Sin estado');
            if (status === 'presente') status = 'asiste';
            status = status.toUpperCase();
            attendanceSummary[status] = (attendanceSummary[status] || 0) + 1;
        });

        // 1. Process explicit attendance records only (as requested: "que salgan las asistencias, no las convocatorias")
        playerAttendance.forEach(a => {
            if (a.convocatoriaid) {
                const c = convocatorias.find(cv => cv.id == a.convocatoriaid);
                const score = (c?.rendimiento && c.rendimiento[playerId]) ? c.rendimiento[playerId].score : null;
                const item = { ...a, rating: score };

                if (c?.tipo === 'Ciclo') categorized.ciclos.push(item);
                else if (c?.tipo === 'Torneo') categorized.torneos.push(item);
                else if (c?.tipo === 'Sesión' || c?.tipo === 'Zubieta') categorized.sesiones.push(item);
            } else {
                categorized.sesiones.push(a);
            }
        });

        const playerTorneoConvs = rawPlayerConvs.filter(c => c.tipo === 'Torneo');
        const playerTorneoNames = [...new Set(playerTorneoConvs.map(t => t.nombre?.split(' ||| ')[0] || 'Torneo'))];

        const uniqueTorneoNames = [...new Set(categorized.torneos.map(t => t.nombre?.split(' ||| ')[0] || 'Torneo'))];

        // --- CALCULATE PARTICIPATION PERCENTAGES ---
        const teamId = player.equipoid?.toString();
        const teamStats = {
            totalTorneos: convocatorias.filter(c => c.equipoid?.toString() === teamId && c.tipo === 'Torneo').length,
            totalSesiones: convocatorias.filter(c => (c.playerids || []).map(String).includes(String(playerId)) && (c.tipo === 'Sesión' || c.tipo === 'Zubieta')).length,
            totalCiclos: convocatorias.filter(c => c.equipoid?.toString() === teamId && c.tipo === 'Ciclo').length
        };

        const playerStats = {
            torneoPercent: teamStats.totalTorneos > 0 ? Math.round((playerTorneoConvs.length / teamStats.totalTorneos) * 100) : 0,
            sesionPercent: teamStats.totalSesiones > 0 ? Math.round((categorized.sesiones.length / teamStats.totalSesiones) * 100) : 0,
            cicloPercent: teamStats.totalCiclos > 0 ? Math.round((categorized.ciclos.length / teamStats.totalCiclos) * 100) : 0
        };

        modalContainer.innerHTML = `
            <div class="relative overflow-hidden">
                <div class="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
                    <button onclick="closeModal()" class="absolute top-6 right-6 p-2 bg-white/10 text-white hover:bg-white/20 rounded-full transition-all backdrop-blur-md">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                
                <div class="px-8 pb-8 -mt-12 relative z-10">
                    <div class="flex flex-col md:flex-row gap-8 items-start">
                        <div class="w-32 h-32 rounded-[2.5rem] bg-white p-1.5 shadow-2xl flex items-center justify-center overflow-hidden border border-slate-50">
                            ${player.foto ? `<img src="${player.foto}" class="w-full h-full object-cover rounded-[2rem]" onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden')">` : ''}
                            <i data-lucide="user" class="w-12 h-12 text-slate-300 ${player.foto ? 'hidden' : ''}"></i>
                        </div>
                        <div class="flex-1 pt-14">
                            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 class="text-3xl font-black text-slate-800 uppercase tracking-tight">${player.nombre}</h3>
                                    <div class="flex flex-wrap items-center gap-3 mt-2">
                                        <div class="flex gap-1">
                                            ${window.parsePosition(player.posicion).length > 0 ? window.parsePosition(player.posicion).map(pos => `
                                                <span class="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest">${pos}</span>
                                            `).join('') : '<span class="px-3 py-1 bg-slate-50 text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest">SIN POSICIÓN</span>'}
                                        </div>
                                        <span class="w-1 h-1 bg-slate-200 rounded-full"></span>
                                        <span class="text-slate-400 text-[10px] font-black uppercase tracking-widest">${team ? team.nombre.split(' ||| ')[0] : 'JUGADOR LIBRE'}</span>
                                        ${player.equipoConvenido ? `
                                            <span class="w-1 h-1 bg-slate-200 rounded-full"></span>
                                            <span class="text-blue-600 text-[10px] font-black uppercase tracking-widest">${player.equipoConvenido}</span>
                                        ` : ''}
                                    </div>
                                </div>
                                <div class="flex gap-2">
                                    <div class="relative group">
                                        <button onclick="window.showExportDialog('${playerId}')" class="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center gap-2">
                                            <i data-lucide="download" class="w-4 h-4"></i>
                                            Exportar PDF
                                        </button>
                                    </div>
                                    <button onclick="window.editPlayer('${playerId}')" class="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-900/10 flex items-center gap-2">
                                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                                        Editar Perfil
                                    </button>
                                </div>
                            </div>
                            
                                <div class="relative w-full md:w-64">
                                    <select onchange="window.viewPlayerProfile('${playerId}', this.value)" class="w-full p-3 bg-slate-100 border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:bg-white focus:ring-4 ring-blue-50 transition-all appearance-none cursor-pointer text-slate-600">
                                        <option value="ALL" ${selectedSeason === 'ALL' ? 'selected' : ''}>HISTORIAL COMPLETO</option>
                                        ${availableSeasons.map(s => `<option value="${s}" ${selectedSeason === s ? 'selected' : ''}>TEMPORADA ${s}</option>`).join('')}
                                    </select>
                                    <i data-lucide="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"></i>
                                </div>
                            </div>
                        </div>
                    </div>

                    ${(() => {
                // Background Repair: If player has photo but no blob, try to generate it now
                if (player.foto && !player.foto_blob) {
                    window.generatePdfBlob(player.foto).then(blob => {
                        if (blob) db.update('jugadores', { id: playerId, foto_blob: blob });
                    });
                }
                return '';
            })()}

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                        <div class="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Información Personal</p>
                            <div class="space-y-4">
                                <div class="flex justify-between items-center py-2 border-b border-slate-200/50">
                                    <span class="text-[10px] font-bold text-slate-500">Fecha de Nacimiento</span>
                                    <span class="text-[11px] font-black text-slate-800">${player.fechanacimiento || player.anionacimiento || '----'}</span>
                                </div>
                                <div class="flex justify-between items-center py-2 border-b border-slate-200/50">
                                    <span class="text-[10px] font-bold text-slate-500">Sexo</span>
                                    <span class="text-[11px] font-black text-slate-800 uppercase">${player.sexo || 'Masculino'}</span>
                                </div>
                                <div class="flex justify-between items-center py-2 border-b border-slate-200/50">
                                    <span class="text-[10px] font-bold text-slate-500">Lateralidad</span>
                                    <span class="text-[11px] font-black text-slate-800 uppercase">${player.pie || 'Diestro'}</span>
                                </div>
                            </div>
                        </div>

                        <div class="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-between">
                            <div>
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Evaluación Técnica</p>
                                <div class="flex items-center gap-3 mb-6">
                                    <span class="text-4xl font-black text-slate-800">${player.nivel || '3'}</span>
                                    <div class="flex-1">
                                        <div class="flex gap-1">
                                            ${window.renderStars(player.nivel || 3, playerId)}
                                        </div>
                                        <p class="text-[8px] font-bold text-slate-400 uppercase mt-1">Haz clic para editar nivel</p>
                                    </div>
                                </div>
                            </div>
                            <div class="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div class="h-full bg-blue-600 rounded-full transition-all duration-500" style="width: ${(player.nivel || 3) * 20}%"></div>
                            </div>
                            <p class="text-[9px] font-bold text-slate-400 mt-4 leading-relaxed uppercase italic">Nivel estimado según rendimiento actual.</p>
                        </div>

                                <div class="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100/50 flex flex-col justify-between">
                                    <div class="mb-6">
                                        <div class="flex justify-between items-center mb-3">
                                            <p class="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Competiciones</p>
                                            <span class="text-[10px] font-black text-indigo-600">${playerStats.torneoPercent}%</span>
                                        </div>
                                        <div class="flex items-center gap-4 mb-4">
                                            <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                                <i data-lucide="trophy" class="w-6 h-6 text-indigo-600"></i>
                                            </div>
                                            <div>
                                                <span class="text-3xl font-black text-slate-800">${playerTorneoConvs.length}</span>
                                                <p class="text-[8px] font-bold text-slate-400 uppercase">Torneos Seleccionados</p>
                                            </div>
                                        </div>
                                        <div class="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
                                            <div class="h-full bg-indigo-500 rounded-full transition-all duration-1000" style="width: ${playerStats.torneoPercent}%"></div>
                                        </div>
                                        <p class="text-[8px] font-black text-indigo-500 uppercase tracking-widest text-right mt-2 mb-6">${playerStats.torneoPercent}% Participación</p>
                                        <div class="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-2 custom-scrollbar">
                                            ${playerTorneoNames.map(t => `
                                                <span class="px-2 py-1 bg-white/80 border border-indigo-100 rounded-lg text-[8px] font-black text-indigo-600 uppercase truncate max-w-[120px] shadow-sm">${t}</span>
                                            `).join('') || '<span class="text-[8px] text-slate-300 italic uppercase">Sin selecciones registradas</span>'}
                                        </div>
                                    </div>
                                    <p class="text-[9px] font-bold text-indigo-400/70 mt-4 leading-relaxed uppercase italic">Participación en eventos competitivos.</p>
                                </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                        ${(() => {
                return `
                                <div class="bg-amber-50/50 p-6 rounded-3xl border border-amber-100/50 flex flex-col justify-between">
                                    <div>
                                        <div class="flex justify-between items-center mb-3">
                                            <p class="text-[9px] font-black text-amber-500 uppercase tracking-widest">Entrenamientos</p>
                                            <span class="text-[10px] font-black text-amber-600">${playerStats.sesionPercent}%</span>
                                        </div>
                                        <div class="flex items-center gap-4">
                                            <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                                <i data-lucide="calendar" class="w-6 h-6 text-amber-500"></i>
                                            </div>
                                            <div>
                                                <span class="text-3xl font-black text-slate-800">${teamStats.totalSesiones}</span>
                                                <p class="text-[8px] font-bold text-slate-400 uppercase">Selecciones Totales</p>
                                            </div>
                                        </div>
                                        <div class="w-full h-2 bg-amber-100 rounded-full overflow-hidden mt-6">
                                            <div class="h-full bg-amber-500 rounded-full transition-all duration-1000" style="width: ${playerStats.sesionPercent}%"></div>
                                        </div>
                                        <p class="text-[8px] font-black text-amber-500 uppercase tracking-widest text-right mt-2">${playerStats.sesionPercent}% Asistencia</p>
                                    </div>
                                    <p class="text-[9px] font-bold text-amber-500/70 mt-4 leading-relaxed uppercase italic">Asistencia a entrenamientos regulares.</p>
                                </div>

                                <div class="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100/50 flex flex-col justify-between">
                                    <div>
                                        <div class="flex justify-between items-center mb-3">
                                            <p class="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Ciclos de Trabajo</p>
                                            <span class="text-[10px] font-black text-emerald-600">${playerStats.cicloPercent}%</span>
                                        </div>
                                        <div class="flex items-center gap-4">
                                            <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                                <i data-lucide="layers" class="w-6 h-6 text-emerald-500"></i>
                                            </div>
                                            <div>
                                                <span class="text-3xl font-black text-slate-800">${categorized.ciclos.length}</span>
                                                <p class="text-[8px] font-bold text-slate-400 uppercase">Ciclos Completados</p>
                                            </div>
                                        </div>
                                        <div class="w-full h-2 bg-emerald-100 rounded-full overflow-hidden mt-6">
                                            <div class="h-full bg-emerald-500 rounded-full transition-all duration-1000" style="width: ${playerStats.cicloPercent}%"></div>
                                        </div>
                                        <p class="text-[8px] font-black text-emerald-500 uppercase tracking-widest text-right mt-2">${playerStats.cicloPercent}% Cumplimiento</p>
                                    </div>
                                    <p class="text-[9px] font-bold text-emerald-500/70 mt-4 leading-relaxed uppercase italic">Participación en periodos de formación.</p>
                                </div>

                                <div class="bg-rose-50/50 p-6 rounded-3xl border border-rose-100/50 flex flex-col justify-between">
                                    <div>
                                        <p class="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-3">Rendimiento en Torneos</p>
                                        ${(() => {
                        const allEvents = [...categorized.sesiones, ...categorized.ciclos, ...categorized.torneos];
                        const ratings = allEvents.map(t => {
                            return { nombre: t.nombre?.split(' ||| ')[0] || 'Evento', rating: t.rating, fecha: t.fecha };
                        }).filter(r => r.rating && r.rating !== '--');

                        const avgRating = ratings.length > 0 ? (ratings.reduce((acc, r) => acc + parseFloat(r.rating), 0) / ratings.length).toFixed(1) : null;
                        const ratingPercent = avgRating ? Math.round((avgRating / 10) * 100) : 0;

                        if (ratings.length === 0) return `
                                                <div class="flex items-center gap-4 mb-4">
                                                    <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                                        <i data-lucide="award" class="w-6 h-6 text-rose-300"></i>
                                                    </div>
                                                    <div>
                                                        <span class="text-3xl font-black text-slate-300">--</span>
                                                        <p class="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Media Torneos</p>
                                                    </div>
                                                </div>
                                                <div class="py-6 text-center bg-white/30 rounded-xl border border-dashed border-rose-100"><p class="text-[8px] text-slate-300 italic uppercase">Sin puntuaciones</p></div>
                                            `;

                        return `
                                                <div class="flex justify-between items-center mb-3">
                                                    <p class="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-3">Rendimiento en Torneos</p>
                                                    <span class="text-[10px] font-black text-rose-600">${ratingPercent}%</span>
                                                </div>
                                                <div class="flex items-center gap-4 mb-4">
                                                    <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                                        <i data-lucide="award" class="w-6 h-6 text-rose-600"></i>
                                                    </div>
                                                    <div>
                                                        <span class="text-3xl font-black text-slate-800">${avgRating}</span>
                                                        <p class="text-[8px] font-bold text-slate-400 uppercase">Nota Media</p>
                                                    </div>
                                                </div>
                                                <div class="w-full h-2 bg-rose-100 rounded-full overflow-hidden mt-6">
                                                    <div class="h-full bg-rose-500 rounded-full transition-all duration-1000" style="width: ${ratingPercent}%"></div>
                                                </div>
                                                <p class="text-[8px] font-black text-rose-500 uppercase tracking-widest text-right mt-2 mb-6">${ratingPercent}% Rendimiento</p>
                                                <div class="space-y-3 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                                                    ${ratings.map(r => `
                                                        <div class="flex justify-between items-center py-2 border-b border-rose-100/30">
                                                            <div>
                                                                <p class="text-[9px] font-black text-slate-700 uppercase truncate max-w-[100px]">${r.nombre}</p>
                                                                <p class="text-[7px] font-bold text-slate-400 uppercase">${r.fecha}</p>
                                                            </div>
                                                            <div class="flex items-center gap-1.5">
                                                                <span class="text-xs font-black text-rose-600">${r.rating}</span>
                                                            </div>
                                                        </div>
                                                    `).join('')}
                                                </div>
                                            `;
                    })()}
                                    </div>
                                    <p class="text-[9px] font-bold text-rose-500/60 mt-4 leading-relaxed uppercase italic">Media histórica en competición.</p>
                                </div>
                            `;
            })()}
                    </div>
                    

                    <div class="mt-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div class="flex items-center justify-between mb-8">
                            <h4 class="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                                <div class="p-2 bg-emerald-50 rounded-xl">
                                    <i data-lucide="calendar-check" class="w-5 h-5 text-emerald-600"></i>
                                </div>
                                Historial de Asistencia
                            </h4>
                        </div>
                        
                        <div class="space-y-12">
                            ${(() => {
                if (categorized.sesiones.length === 0 && categorized.ciclos.length === 0 && categorized.torneos.length === 0) {
                    return '<div class="py-20 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100"><p class="text-xs font-black text-slate-300 uppercase tracking-widest italic">No hay registros de asistencia</p></div>';
                }

                const renderGroup = (title, items, icon, colorClass) => {
                    if (items.length === 0) return '';
                    return `
                                        <div class="space-y-4">
                                            <div class="flex items-center gap-3 pb-2 border-b-2 border-slate-50">
                                                <i data-lucide="${icon}" class="w-4 h-4 ${colorClass}"></i>
                                                <h5 class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">${title} (${items.length})</h5>
                                            </div>
                                            <div class="overflow-hidden bg-white">
                                                <table class="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr class="bg-slate-50/30">
                                                            <th class="py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Fecha / Evento</th>
                                                            <th class="py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest px-4 text-center">Estado</th>
                                                            <th class="py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">Observaciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody class="divide-y divide-slate-50">
                                                        ${items.sort((a, b) => b.fecha.localeCompare(a.fecha)).map(a => {
                        const status = a.players[playerId];
                        const reason = (typeof status === 'object') ? status.reason : '';
                        const statusValue = (typeof status === 'object') ? status.status : status;
                        let badge = '';
                        if (statusValue === 'asiste') badge = '<span class="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[8px] font-black uppercase">Presente</span>';
                        else if (statusValue === 'falta') badge = '<span class="px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-[8px] font-black uppercase">Sin Motivo</span>';
                        else if (statusValue === 'lesion') badge = '<span class="px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[8px] font-black uppercase">Lesionado</span>';
                        else badge = `<span class="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-black uppercase">${statusValue}</span>`;

                        return `
                                                                <tr class="hover:bg-slate-50/50 transition-colors">
                                                                    <td class="py-4 px-4">
                                                                        <p class="text-[10px] font-bold text-slate-700 uppercase">${a.nombre?.split(' ||| ')[0] || 'Evento'}</p>
                                                                        <p class="text-[8px] font-black text-slate-400 uppercase">${a.fecha}</p>
                                                                    </td>
                                                                    <td class="py-4 px-4 text-center">${badge}</td>
                                                                    <td class="py-4 px-4 text-[9px] font-bold text-slate-500 italic">${reason || (statusValue === 'asiste' ? '-' : '...')}</td>
                                                                </tr>
                                                            `;
                    }).join('')}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    `;
                };

                return `
                                    ${renderGroup('Ciclos de Perfeccionamiento', categorized.ciclos, 'refresh-ccw', 'text-blue-500')}
                                    ${renderGroup('Entrenamientos', categorized.sesiones, 'calendar', 'text-amber-500')}
                                    ${renderGroup('Torneos', categorized.torneos, 'trophy', 'text-indigo-500')}
                                `;
            })()}
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
        modalOverlay.classList.add('active');
    };

    window.editPlayer = async (playerId) => {
        const player = await db.get('jugadores', playerId);
        if (!player) return;
        const teams = window.getSortedTeams(await db.getAll('equipos'));
        const clubs = await db.getAll('clubes');

        modalContainer.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Editar Jugador</h3>
                        <p class="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-1">Modificando ficha de ${player.nombre}</p>
                    </div>
                    <button onclick="closeModal()" class="p-3 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-all"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>

                <form id="edit-player-form" class="space-y-6">
                    <div class="flex flex-col md:flex-row gap-8">
                        <div class="w-full md:w-48 flex flex-col items-center gap-4">
                            <div class="w-40 h-40 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] flex items-center justify-center relative overflow-hidden group cursor-pointer">
                                <img id="player-photo-preview" src="${player.foto || 'Imagenes/Foto Jugador General.png'}" class="w-full h-full object-cover" onerror="this.src='https://via.placeholder.com/150'">
                                <div class="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <i data-lucide="camera" class="w-6 h-6 mb-1"></i>
                                    <span class="text-[8px] font-black uppercase">Cambiar</span>
                                </div>
                                <input type="file" id="player-photo-input" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer">
                            </div>
                        </div>

                        <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="space-y-2 md:col-span-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre Completo</label>
                                <input name="nombre" type="text" value="${player.nombre}" required class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all">
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Equipo</label>
                                <select name="equipoid" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all appearance-none">
                                    <option value="">Jugador Libre</option>
                                    ${teams.map(t => `<option value="${t.id}" ${player.equipoid?.toString() === t.id.toString() ? 'selected' : ''}>${t.nombre.split(' ||| ')[0]}</option>`).join('')}
                                </select>
                            </div>
                            <div class="space-y-3 md:col-span-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Posiciones</label>
                                <div class="flex flex-wrap gap-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                    ${PLAYER_POSITIONS.map(pos => {
            const playerPositions = window.parsePosition(player.posicion);
            const isSelected = playerPositions.includes(pos);
            return `
                                            <label class="cursor-pointer group">
                                                <input type="checkbox" name="posicion" value="${pos}" class="hidden peer" ${isSelected ? 'checked' : ''} onchange="window.autoDetectLateralidad(this)">
                                                <span class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight border border-slate-200 bg-white text-slate-400 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 transition-all hover:border-blue-200">
                                                    ${pos}
                                                </span>
                                            </label>
                                        `;
        }).join('')}
                                </div>
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha de Nacimiento</label>
                                <input name="fechanacimiento" type="date" value="${player.fechanacimiento || ''}" onchange="const y = this.value.split('-')[0]; if(y) this.form.anionacimiento.value = y;" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all">
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Año Nacimiento</label>
                                <input name="anionacimiento" type="number" value="${player.anionacimiento || ''}" placeholder="2010" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all">
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Sexo</label>
                                <select name="sexo" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all appearance-none">
                                    <option value="" ${!player.sexo ? 'selected' : ''}>Sin asignar</option>
                                    <option value="Masculino" ${player.sexo === 'Masculino' ? 'selected' : ''}>Masculino</option>
                                    <option value="Femenino" ${player.sexo === 'Femenino' ? 'selected' : ''}>Femenino</option>
                                </select>
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Lateralidad (Pie)</label>
                                <select name="lateralidad" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all appearance-none">
                                    <option value="" ${!player.lateralidad ? 'selected' : ''}>Sin asignar</option>
                                    <option value="Derecho" ${player.lateralidad === 'Derecho' ? 'selected' : ''}>Derecho</option>
                                    <option value="Zurdo" ${player.lateralidad === 'Zurdo' ? 'selected' : ''}>Zurdo</option>
                                    <option value="Ambidiestro" ${player.lateralidad === 'Ambidiestro' ? 'selected' : ''}>Ambidiestro</option>
                                </select>
                            </div>
                             <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Club Convenido</label>
                                <input name="equipoConvenido" list="clubs-list" value="${player.equipoConvenido || ''}" placeholder="Escribe o selecciona club..." class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all">
                                <datalist id="clubs-list">
                                    ${clubs.map(c => `<option value="${c.nombre}">`).join('')}
                                </datalist>
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nivel Actual</label>
                                <div id="star-rating-edit"></div>
                            </div>

                            <!-- Otros Equipos (Solo Femenino) -->
                            <div id="extra-teams-container-edit" class="space-y-2 md:col-span-2 ${player.sexo === 'Femenino' ? '' : 'hidden'}">
                                <label class="block text-[10px] font-black text-blue-600 uppercase tracking-widest px-1">Otros Equipos (Multiequipo)</label>
                                <div class="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-blue-50/30 border border-blue-100 rounded-2xl">
                                    ${teams.map(t => {
            const isMain = player.equipoid?.toString() === t.id.toString();
            const isSecondary = (player.equipo_ids || []).map(String).includes(t.id.toString());
            return `
                                            <label class="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 transition-all ${isMain ? 'opacity-50 pointer-events-none bg-slate-50' : ''}">
                                                <input type="checkbox" name="equipo_ids" value="${t.id}" ${isSecondary ? 'checked' : ''} ${isMain ? 'disabled' : ''} class="w-4 h-4 rounded text-blue-600">
                                                <span class="text-[9px] font-bold text-slate-600 truncate uppercase">${t.nombre.split(' ||| ')[0]}</span>
                                            </label>
                                        `;
        }).join('')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="pt-6 border-t border-slate-100 flex justify-between gap-3">
                        <button type="button" onclick="window.deletePlayer('${playerId}')" class="px-8 py-4 bg-red-50 text-red-500 font-black rounded-2xl uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all text-[10px]">Eliminar Jugador</button>
                        <div class="flex gap-2">
                            <button type="button" onclick="closeModal()" class="px-8 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase tracking-widest hover:bg-slate-200 transition-all text-[10px]">Cancelar</button>
                            <button type="submit" class="px-12 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all uppercase tracking-widest text-[10px]">Guardar Cambios</button>
                        </div>
                    </div>
                </form>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
        window.initStarRating('star-rating-edit', player.nivel || 3);
        modalOverlay.classList.add('active');

        const photoInput = document.getElementById('player-photo-input');
        const photoPreview = document.getElementById('player-photo-preview');

        const sexoSelectEdit = document.querySelector('#edit-player-form select[name="sexo"]');
        const extraTeamsEdit = document.getElementById('extra-teams-container-edit');
        if (sexoSelectEdit && extraTeamsEdit) {
            sexoSelectEdit.addEventListener('change', () => {
                if (sexoSelectEdit.value === 'Femenino') extraTeamsEdit.classList.remove('hidden');
                else extraTeamsEdit.classList.add('hidden');
            });
        }

        photoInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => { photoPreview.src = re.target.result; };
                reader.readAsDataURL(file);
            }
        };

        document.getElementById('edit-player-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.id = playerId;
            data.posicion = formData.getAll('posicion').join(', '); // Save as clean string
            data.equipo_ids = formData.getAll('equipo_ids'); // Save as array

            // Cast numeric fields
            if (data.anionacimiento) data.anionacimiento = parseInt(data.anionacimiento);
            if (data.nivel) data.nivel = parseInt(data.nivel);

            // Handle equipoid (should be number or null)
            if (data.equipoid === "") data.equipoid = null;
            else if (data.equipoid) data.equipoid = parseInt(data.equipoid);

            // Handle multi-team (should be array of numbers)
            if (data.equipo_ids && Array.isArray(data.equipo_ids)) {
                data.equipo_ids = data.equipo_ids.map(id => parseInt(id));
            }

            // Forzar el campo exacto para Supabase
            data.equipoConvenido = formData.get('equipoConvenido') || null;

            try {
                if (photoInput.files[0]) {
                    data.foto = await db.uploadImage(photoInput.files[0]);
                    data.foto_blob = await window.generatePdfBlob(photoInput.files[0]);
                }

                await db.update('jugadores', data);
                window.customAlert('¡Actualizado!', 'Datos guardados correctamente.', 'success');
                closeModal();
                window.renderJugadores(document.getElementById('content-container'));
            } catch (err) {
                console.error(err);
                window.customAlert('Error', `No se pudieron guardar los cambios: ${err.message}`, 'error');
            }
        };
    };

    window.deletePlayer = async (playerId) => {
        if (confirm('¿Estás seguro de que quieres eliminar este jugador? Esta acción no se puede deshacer.')) {
            try {
                await db.delete('jugadores', playerId);
                window.customAlert('Eliminado', 'El jugador ha sido borrado del sistema.', 'success');
                closeModal();
                window.renderJugadores(document.getElementById('content-container'));
            } catch (err) {
                console.error(err);
                window.customAlert('Error', 'No se pudo eliminar el jugador.', 'error');
            }
        }
    };

    window.renderEquipos = async function (container) {
        const teams = window.getSortedTeams(await db.getAll('equipos'));
        const players = await db.getAll('jugadores');
        const sortedTeams = window.getSortedTeams(teams);

        container.innerHTML = `
            <div class="space-y-8 animate-in fade-in duration-500">
                <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50/50 border-b border-slate-100">
                                    <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipo</th>
                                    <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</th>
                                    <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Plantilla</th>
                                    <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sortedTeams.map(t => {
            const teamPlayers = players.filter(p => p.equipoid?.toString() === t.id.toString());
            const teamName = (t.nombre || '').split(' ||| ')[0];
            return `
                                        <tr class="border-b border-slate-50 hover:bg-blue-50/30 transition-all group">
                                            <td class="px-8 py-5">
                                                <div class="flex items-center gap-4">
                                                    <div class="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 overflow-hidden p-2 group-hover:border-blue-200 transition-all">
                                                        ${t.escudo ? `<img src="${t.escudo}" class="w-full h-full object-contain">` : `<i data-lucide="shield" class="w-5 h-5 text-blue-600"></i>`}
                                                    </div>
                                                    <div>
                                                        <p class="text-[11px] font-black text-slate-800 uppercase tracking-tight">${teamName}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="px-6 py-5">
                                                <span class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                                    ${t.categoria || 'BASE'}
                                                </span>
                                            </td>
                                            <td class="px-6 py-5 text-center">
                                                <div class="flex flex-col items-center">
                                                    <span class="text-sm font-black text-slate-700">${teamPlayers.length}</span>
                                                    <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest">Jugadores</span>
                                                </div>
                                            </td>
                                            <td class="px-6 py-5 text-right">
                                                <div class="flex justify-end gap-2">
                                                    <button onclick="window.switchJugadoresTeam('${t.id}'); window.switchView('jugadores')" class="p-2.5 bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all" title="Ver Plantilla">
                                                        <i data-lucide="users" class="w-4 h-4"></i>
                                                    </button>
                                                    <button onclick="window.editTeam('${t.id}')" class="p-2.5 bg-slate-50 text-slate-400 hover:bg-amber-500 hover:text-white rounded-xl transition-all" title="Editar">
                                                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                                                    </button>
                                                    <button onclick="window.deleteTeam('${t.id}')" class="p-2.5 bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white rounded-xl transition-all" title="Eliminar">
                                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
        }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    };

    window.showNewTeamModal = () => {
        modalContainer.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Nuevo Equipo</h3>
                        <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Crear nueva categoría o plantilla</p>
                    </div>
                    <button onclick="closeModal()" class="p-3 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-all"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
                <form id="new-team-form" class="space-y-6">
                    <div class="flex flex-col md:flex-row gap-8">
                        <div class="flex flex-col items-center gap-4">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Escudo / Logo</label>
                            <div class="relative group">
                                <div id="team-logo-preview" class="w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-300">
                                    <i data-lucide="shield" class="w-8 h-8 text-slate-300"></i>
                                </div>
                                <input type="file" id="team-logo-input" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer" onchange="window.handleTeamLogoPreview(this)">
                                <input type="hidden" name="escudo" id="team-logo-url">
                            </div>
                            <p class="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Click para subir foto</p>
                        </div>
                        <div class="flex-1 space-y-6">
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre del Equipo</label>
                                <input name="nombre" type="text" required class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50">
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Categoría</label>
                                <input name="categoria" type="text" placeholder="Ej: ALEVÍN A" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50">
                            </div>
                        </div>
                    </div>
                    <div class="pt-6 border-t border-slate-100 flex justify-end gap-3">
                        <button type="button" onclick="closeModal()" class="px-8 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px]">Cancelar</button>
                        <button type="submit" id="btn-save-team" class="px-12 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-[10px]">Crear Equipo</button>
                    </div>
                </form>
            </div>
        `;
        modalOverlay.classList.add('active');
        if (window.lucide) lucide.createIcons();

        window.handleTeamLogoPreview = async (input) => {
            if (input.files && input.files[0]) {
                const preview = document.getElementById('team-logo-preview');
                const btn = document.getElementById('btn-save-team');
                const originalText = btn.innerText;

                btn.disabled = true;
                btn.innerText = 'SUBIENDO...';
                preview.innerHTML = '<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>';

                try {
                    const publicUrl = await db.uploadImage(input.files[0]);
                    if (publicUrl) {
                        preview.innerHTML = `<img src="${publicUrl}" class="w-full h-full object-contain">`;
                        document.getElementById('team-logo-url').value = publicUrl;
                    }
                } catch (err) {
                    window.customAlert('Error', 'No se pudo subir la imagen', 'error');
                } finally {
                    btn.disabled = false;
                    btn.innerText = originalText;
                }
            }
        };

        document.getElementById('new-team-form').onsubmit = async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            try {
                await db.add('equipos', data);
                window.customAlert('Éxito', 'Equipo creado correctamente', 'success');
                closeModal();
                window.renderEquipos(document.getElementById('content-container'));
            } catch (err) {
                window.customAlert('Error', err.message, 'error');
            }
        };
    };

    window.editTeam = async (teamId) => {
        const team = await db.get('equipos', teamId);
        modalContainer.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-8">
                    <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Editar Equipo</h3>
                    <button onclick="closeModal()" class="p-3 bg-slate-100 rounded-full text-slate-400"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
                <form id="edit-team-form" class="space-y-6">
                    <div class="flex flex-col md:flex-row gap-8">
                        <div class="flex flex-col items-center gap-4">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Escudo / Logo</label>
                            <div class="relative group">
                                <div id="team-logo-preview" class="w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-300">
                                    ${team.escudo ? `<img src="${team.escudo}" class="w-full h-full object-contain">` : `<i data-lucide="shield" class="w-8 h-8 text-slate-300"></i>`}
                                </div>
                                <input type="file" id="team-logo-input" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer" onchange="window.handleTeamLogoPreview(this)">
                                <input type="hidden" name="escudo" id="team-logo-url" value="${team.escudo || ''}">
                            </div>
                            <p class="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Click para cambiar foto</p>
                        </div>
                        <div class="flex-1 space-y-6">
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre</label>
                                <input name="nombre" type="text" value="${team.nombre}" required class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none">
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Categoría</label>
                                <input name="categoria" type="text" value="${team.categoria || ''}" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none">
                            </div>
                        </div>
                    </div>
                    <div class="pt-6 border-t border-slate-100 flex justify-end gap-3">
                        <button type="button" onclick="closeModal()" class="px-8 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-[10px]">Cancelar</button>
                        <button type="submit" id="btn-save-team" class="px-12 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px]">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        `;
        modalOverlay.classList.add('active');
        if (window.lucide) lucide.createIcons();

        window.handleTeamLogoPreview = async (input) => {
            if (input.files && input.files[0]) {
                const preview = document.getElementById('team-logo-preview');
                const btn = document.getElementById('btn-save-team');
                const originalText = btn.innerText;

                btn.disabled = true;
                btn.innerText = 'SUBIENDO...';
                preview.innerHTML = '<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>';

                try {
                    const publicUrl = await db.uploadImage(input.files[0]);
                    if (publicUrl) {
                        preview.innerHTML = `<img src="${publicUrl}" class="w-full h-full object-contain">`;
                        document.getElementById('team-logo-url').value = publicUrl;
                    }
                } catch (err) {
                    window.customAlert('Error', 'No se pudo subir la imagen', 'error');
                } finally {
                    btn.disabled = false;
                    btn.innerText = originalText;
                }
            }
        };

        document.getElementById('edit-team-form').onsubmit = async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            data.id = teamId;
            try {
                await db.update('equipos', data);
                window.customAlert('Actualizado', 'Equipo actualizado correctamente', 'success');
                closeModal();
                window.renderEquipos(document.getElementById('content-container'));
            } catch (err) {
                window.customAlert('Error', err.message, 'error');
            }
        };
    };

    window.deleteTeam = async (teamId) => {
        if (confirm('¿Eliminar este equipo?')) {
            try {
                await db.delete('equipos', teamId);
                window.customAlert('Eliminado', 'Equipo borrado', 'success');
                window.renderEquipos(document.getElementById('content-container'));
            } catch (err) {
                window.customAlert('Error', err.message, 'error');
            }
        }
    };

    window.renderClubes = async function (container) {
        const clubes = await db.getAll('clubes');

        container.innerHTML = `
            <div class="space-y-8 animate-in fade-in duration-500">
                <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50/50 border-b border-slate-100">
                                    <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Club</th>
                                    <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${clubes.length === 0 ? `
                                    <tr>
                                        <td colspan="2" class="py-20 text-center">
                                            <i data-lucide="building-2" class="w-12 h-12 text-slate-200 mx-auto mb-4"></i>
                                            <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No hay clubes registrados</p>
                                        </td>
                                    </tr>
                                ` : clubes.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')).map(club => {
            return `
                                        <tr class="border-b border-slate-50 hover:bg-blue-50/30 transition-all group">
                                            <td class="px-8 py-5">
                                                <div class="flex items-center gap-4">
                                                    <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-100 overflow-hidden p-2 group-hover:border-blue-200 transition-all">
                                                        ${club.escudo ? `<img src="${club.escudo}" class="w-full h-full object-contain">` : `<i data-lucide="building-2" class="w-5 h-5 text-blue-600"></i>`}
                                                    </div>
                                                    <div>
                                                        <p class="text-[11px] font-black text-slate-800 uppercase tracking-tight">${club.nombre}</p>
                                                        ${club.lugar ? `
                                                            <div class="flex items-center gap-1.5 mt-1">
                                                                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${club.lugar}</p>
                                                                ${club.ubicacion ? `<a href="${club.ubicacion}" target="_blank" class="text-blue-500 hover:text-blue-700"><i data-lucide="map-pin" class="w-3 h-3"></i></a>` : ''}
                                                            </div>
                                                        ` : ''}
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="px-6 py-5 text-right">
                                                <div class="flex justify-end gap-2">
                                                    <button onclick="window.viewClubTeams('${club.nombre}')" class="p-2.5 bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all" title="Ver Ficha">
                                                        <i data-lucide="layout" class="w-4 h-4"></i>
                                                    </button>
                                                    <button onclick="window.editClub('${club.id}')" class="p-2.5 bg-slate-50 text-slate-400 hover:bg-amber-500 hover:text-white rounded-xl transition-all" title="Editar">
                                                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                                                    </button>
                                                    <button onclick="window.deleteClub('${club.id}')" class="p-2.5 bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white rounded-xl transition-all" title="Eliminar">
                                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
        }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    };

    window.showNewClubModal = () => {
        modalContainer.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Nuevo Club Convenido</h3>
                        <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Registrar entidad colaboradora</p>
                    </div>
                    <button onclick="closeModal()" class="p-3 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-all"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
                <form id="new-club-form" class="space-y-6">
                    <div class="flex flex-col md:flex-row gap-8">
                        <!-- Logo Upload -->
                        <div class="flex flex-col items-center gap-4">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Escudo / Logo</label>
                            <div class="relative group">
                                <div id="club-logo-preview" class="w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-300">
                                    <i data-lucide="image" class="w-8 h-8 text-slate-300"></i>
                                </div>
                                <input type="file" id="club-logo-input" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer" onchange="window.handleClubLogoPreview(this)">
                                <input type="hidden" name="escudo" id="club-logo-url">
                            </div>
                            <p class="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">Click para subir foto</p>
                        </div>

                        <!-- Info -->
                        <div class="flex-1 space-y-6">
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre del Club</label>
                                <input name="nombre" type="text" required placeholder="Nombre oficial de la entidad" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all">
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="space-y-2">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Lugar / Sede</label>
                                    <input name="lugar" type="text" placeholder="Ej: Zubieta" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all uppercase">
                                </div>
                                <div class="space-y-2">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Enlace Google Maps</label>
                                    <input name="ubicacion" type="url" placeholder="https://goo.gl/maps/..." class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 transition-all">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="pt-6 border-t border-slate-100 flex justify-end gap-3">
                        <button type="button" onclick="closeModal()" class="px-8 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px]">Cancelar</button>
                        <button type="submit" id="btn-save-club" class="px-12 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all uppercase tracking-widest text-[10px]">Registrar Club</button>
                    </div>
                </form>
            </div>
        `;

        window.handleClubLogoPreview = async (input) => {
            if (input.files && input.files[0]) {
                const preview = document.getElementById('club-logo-preview');
                const btn = document.getElementById('btn-save-club');
                const originalText = btn.innerText;

                btn.disabled = true;
                btn.innerText = 'SUBIENDO...';
                preview.innerHTML = '<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>';

                try {
                    const publicUrl = await db.uploadImage(input.files[0]);
                    if (publicUrl) {
                        preview.innerHTML = `<img src="${publicUrl}" class="w-full h-full object-contain">`;
                        document.getElementById('club-logo-url').value = publicUrl;
                    }
                } catch (err) {
                    console.error("Logo upload error:", err);
                    preview.innerHTML = '<i data-lucide="alert-circle" class="w-8 h-8 text-red-500"></i>';
                } finally {
                    btn.disabled = false;
                    btn.innerText = originalText;
                }
            }
        };

        if (window.lucide) lucide.createIcons();
        modalOverlay.classList.add('active');

        document.getElementById('new-club-form').onsubmit = async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            try {
                await db.add('clubes', data);
                window.customAlert('¡Éxito!', 'Club registrado correctamente.', 'success');
                closeModal();
                window.renderClubes(document.getElementById('content-container'));
            } catch (err) {
                window.customAlert('Error', 'No se pudo registrar el club.', 'error');
            }
        };
    };

    window.editClub = async (clubId) => {
        const club = await db.get('clubes', clubId);
        modalContainer.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-8">
                    <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Editar Club</h3>
                    <button onclick="closeModal()" class="p-3 bg-slate-100 rounded-full text-slate-400"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>
                <form id="edit-club-form" class="space-y-6">
                    <div class="space-y-2">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre del Club</label>
                        <input name="nombre" type="text" value="${club.nombre}" required class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none">
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Lugar / Sede</label>
                            <input name="lugar" type="text" value="${club.lugar || ''}" placeholder="Ej: Zubieta" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none uppercase">
                        </div>
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Enlace Google Maps</label>
                            <input name="ubicacion" type="url" value="${club.ubicacion || ''}" placeholder="https://..." class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none">
                        </div>
                    </div>
                    <div class="pt-6 border-t border-slate-100 flex justify-end gap-3">
                        <button type="button" onclick="closeModal()" class="px-8 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase text-[10px]">Cancelar</button>
                        <button type="submit" class="px-12 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl uppercase text-[10px]">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        `;
        modalOverlay.classList.add('active');
        document.getElementById('edit-club-form').onsubmit = async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            data.id = clubId;
            try {
                await db.update('clubes', data);
                window.customAlert('Actualizado', 'Club actualizado correctamente', 'success');
                closeModal();
                window.renderClubes(document.getElementById('content-container'));
            } catch (err) {
                window.customAlert('Error', err.message, 'error');
            }
        };
    };

    window.deleteClub = async (clubId) => {
        if (confirm('¿Eliminar este club convenido?')) {
            try {
                await db.delete('clubes', clubId);
                window.customAlert('Eliminado', 'Club borrado', 'success');
                window.renderClubes(document.getElementById('content-container'));
            } catch (err) {
                window.customAlert('Error', err.message, 'error');
            }
        }
    };

    window.viewClubTeams = async (clubName) => {
        const clubs = await db.getAll('clubes');
        const club = clubs.find(c => c.nombre === clubName);
        const allPlayers = await db.getAll('jugadores');
        const sesiones = await db.getAll('sesiones');
        const convocatorias = await db.getAll('convocatorias');

        // Calculate Stats
        const clubPlayers = allPlayers.filter(p => p.equipoConvenido === clubName);
        const clubPlayerIds = new Set(clubPlayers.map(p => p.id.toString()));

        let sesionCount = 0;
        sesiones.forEach(s => {
            if (s.playerids) {
                s.playerids.forEach(pid => {
                    if (clubPlayerIds.has(pid.toString())) sesionCount++;
                });
            }
        });

        let torneoCount = 0;
        convocatorias.forEach(c => {
            if ((c.tipo || '').toUpperCase() === 'TORNEO' && c.playerids) {
                c.playerids.forEach(pid => {
                    if (clubPlayerIds.has(pid.toString())) torneoCount++;
                });
            }
        });

        modalContainer.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-start mb-8">
                    <div class="flex items-center gap-4">
                        <div class="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-sm border border-slate-100 overflow-hidden p-3 relative group">
                            ${club.escudo ? `<img src="${club.escudo}" class="w-full h-full object-contain">` : `<i data-lucide="building-2" class="w-8 h-8 text-blue-600"></i>`}
                            <label class="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <i data-lucide="camera" class="w-5 h-5"></i>
                                <input type="file" class="hidden" accept="image/*" onchange="window.updateClubShield('${clubName}', this.files[0])">
                            </label>
                        </div>
                        <div>
                            <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">${clubName}</h3>
                            <div class="flex items-center gap-2 mt-1">
                                <p class="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">${club.lugar || 'Sede no definida'}</p>
                                ${club.ubicacion ? `<a href="${club.ubicacion}" target="_blank" class="text-blue-500"><i data-lucide="map-pin" class="w-3 h-3"></i></a>` : ''}
                            </div>
                        </div>
                    </div>
                    <button onclick="closeModal()" class="p-3 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-all"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-8">
                    <div class="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
                        <p class="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Participaciones en Sesiones</p>
                        <div class="flex items-baseline gap-2">
                            <span class="text-3xl font-black text-blue-600">${sesionCount}</span>
                            <span class="text-[10px] font-bold text-blue-400 uppercase">Convocatorias</span>
                        </div>
                    </div>
                    <div class="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100">
                        <p class="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Participaciones en Torneos</p>
                        <div class="flex items-baseline gap-2">
                            <span class="text-3xl font-black text-emerald-600">${torneoCount}</span>
                            <span class="text-[10px] font-bold text-emerald-400 uppercase">Convocatorias</span>
                        </div>
                    </div>
                </div>

                <div class="space-y-6">
                    <div class="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar space-y-12">
                        ${(() => {
                if (clubPlayers.length === 0) return `
                                <div class="py-20 text-center">
                                    <i data-lucide="users" class="w-12 h-12 text-slate-200 mx-auto mb-4"></i>
                                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No hay jugadores registrados para este club</p>
                                </div>
                            `;

                // Group by birth year
                const grouped = {};
                clubPlayers.forEach(p => {
                    const year = p.anionacimiento || 'Sin Año';
                    if (!grouped[year]) grouped[year] = [];
                    grouped[year].push(p);
                });

                return Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(year => {
                    const players = grouped[year].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
                    return `
                                    <div class="space-y-4">
                                        <div class="flex items-center gap-4 px-4">
                                            <h4 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">GENERACIÓN ${year}</h4>
                                            <div class="flex-1 h-px bg-slate-100"></div>
                                            <span class="text-[9px] font-black text-blue-600 uppercase tracking-widest">${players.length} JUGADORES</span>
                                        </div>
                                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            ${players.map(p => `
                                                <div onclick="window.viewPlayerProfile('${p.id}')" class="flex items-center gap-3 p-4 bg-white rounded-3xl border border-slate-100 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer group">
                                                    <div class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0">
                                                        <div class="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300">
                                                            ${p.foto ? `<img src="${p.foto}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden')">` : ''}
                                                            <i data-lucide="user" class="w-12 h-12 ${p.foto ? 'hidden' : ''}"></i>
                                                        </div>
                                                    </div>
                                                    <div class="flex-1 min-w-0">
                                                        <p class="text-[10px] font-bold text-slate-700 truncate group-hover:text-blue-600 transition-colors">${p.nombre}</p>
                                                        <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">${window.formatPosition(p.posicion)}</p>
                                                    </div>
                                                    <i data-lucide="arrow-right" class="w-3 h-3 text-slate-300 group-hover:text-blue-400 group-hover:translate-x-1 transition-all"></i>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                `;
                }).join('');
            })()}
                    </div>
                    
                    <div class="pt-6 border-t border-slate-100 flex justify-end">
                        <button onclick="closeModal()" class="px-10 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-black transition-all uppercase tracking-widest text-[10px]">Cerrar Ficha</button>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        modalOverlay.classList.add('active');
    };

    window.filterAsistencia = (teamId) => {
        window.asistenciaFilters.activeTeamId = teamId;
        window.renderAsistencia(document.getElementById('content-container'));
    };

    window.repairAttendance = async (e) => {
        const btn = e?.currentTarget || document.querySelector('button[onclick*="repairAttendance"]');
        if (!btn) return;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="w-4 h-4 animate-spin"></i> Reparando Nombres y Registros...';
        btn.style.pointerEvents = 'none';

        try {
            const convocatorias = await db.getAll('convocatorias');
            const asistencias = await db.getAll('asistencia');
            const teams = await db.getAll('equipos');
            const linkedIds = new Set(asistencias.map(a => a.convocatoriaid?.toString()).filter(id => id));

            let createdCount = 0;
            let renamedCount = 0;
            let dateFixCount = 0;

            // 1. Normalizar nombres y LUGARES de registros existentes
            for (const asist of asistencias) {
                const team = teams.find(t => t.id == asist.equipoid);
                const teamName = team ? team.nombre : 'EQUIPO';

                const linkedConv = convocatorias.find(c => c.id.toString() === asist.convocatoriaid?.toString());
                const eventName = linkedConv ? linkedConv.nombre : asist.nombre;
                const eventType = linkedConv ? linkedConv.tipo : asist.tipo;

                const newName = window.formatAttendanceName(asist.fecha, teamName, eventType, eventName);

                let needsUpdate = false;
                const updatePayload = { id: asist.id };

                if (asist.nombre !== newName) {
                    updatePayload.nombre = newName;
                    needsUpdate = true;
                }

                // Sincronizar lugar si falta en la asistencia pero está en la convocatoria
                if (!asist.lugar && linkedConv && linkedConv.lugar) {
                    updatePayload.lugar = linkedConv.lugar;
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    await db.update('asistencia', updatePayload);
                    renamedCount++;
                }
            }

            // 2. Normalizar fechas de torneos y corregir asignaciones por año
            for (const conv of convocatorias) {
                if (['Torneo', 'TORNEO'].includes(conv.tipo)) {
                    // Normalizar fecha fin
                    const { base, extra } = window.parseLugarMetadata(conv.lugar);
                    if (!extra.fecha_fin) {
                        extra.fecha_fin = conv.fecha;
                        const newLugar = `${base} ||| ${JSON.stringify(extra)}`;
                        await db.update('convocatorias', { id: conv.id, lugar: newLugar });
                        dateFixCount++;
                    }

                    // CORRECCIÓN DE EQUIPO: Si el torneo dice 2010 pero el equipo es 2011
                    const convName = (conv.nombre || '').toUpperCase();
                    if (convName.includes('2010')) {
                        const currentTeam = teams.find(t => t.id == conv.equipoid);
                        if (currentTeam && (currentTeam.nombre || '').includes('2011')) {
                            const correctTeam = teams.find(t => (t.nombre || '').includes('2010'));
                            if (correctTeam) {
                                await db.update('convocatorias', { id: conv.id, equipoid: correctTeam.id });
                                // Actualizar también la asistencia vinculada si existe
                                const linkedAsist = asistencias.find(a => String(a.convocatoriaid) === String(conv.id));
                                if (linkedAsist) {
                                    await db.update('asistencia', { id: linkedAsist.id, equipoid: correctTeam.id });
                                }
                            }
                        }
                    }
                }
            }

            // 3. Create missing records from convocatorias
            for (const conv of convocatorias) {
                const team = teams.find(t => t.id == conv.equipoid);
                const teamName = team ? team.nombre : 'EQUIPO';
                const standardName = window.formatAttendanceName(conv.fecha, teamName, conv.tipo, conv.nombre);

                // Comprobación de duplicados: por ID vinculado o por coincidencia de nombre/fecha/equipo
                const alreadyLinked = linkedIds.has(conv.id.toString());
                const alreadyExistsByName = asistencias.some(a =>
                    a.fecha === conv.fecha &&
                    String(a.equipoid) === String(conv.equipoid) &&
                    a.nombre === standardName
                );

                if (!alreadyLinked && !alreadyExistsByName) {
                    const playersData = {};
                    const pids = Array.isArray(conv.playerids) ? conv.playerids : [];
                    pids.forEach(pid => {
                        playersData[pid] = { status: 'asiste' };
                    });

                    const team = teams.find(t => t.id == conv.equipoid);
                    const teamName = team ? team.nombre : 'EQUIPO';

                    const attendanceData = {
                        fecha: conv.fecha || new Date().toISOString().split('T')[0],
                        nombre: window.formatAttendanceName(conv.fecha, teamName, conv.tipo, conv.nombre),
                        tipo: conv.tipo || 'Sesión',
                        equipoid: conv.equipoid || null,
                        convocatoriaid: conv.id,
                        lugar: conv.lugar || '',
                        players: playersData
                    };

                    try {
                        await db.add('asistencia', attendanceData);
                        createdCount++;
                    } catch (err) {
                        await db.saveLocal('asistencia', { ...attendanceData, id: Date.now() });
                        createdCount++;
                    }
                }
            }
            window.customAlert('¡Hecho!', `Se han reparado ${createdCount} asistencias, normalizado ${renamedCount} nombres y corregido ${dateFixCount} fechas de torneos.`, 'success');
            window.renderAsistencia(document.getElementById('content-container'));
        } catch (err) {
            console.error("Repair error:", err);
            window.customAlert('Error', 'No se pudo completar la reparación: ' + err.message, 'error');
        } finally {
            btn.innerHTML = originalHtml;
            btn.style.pointerEvents = 'auto';
        }
    };

    window.renderAsistencia = async function (container) {
        const teams = window.getSortedTeams(await db.getAll('equipos'));
        const allAttendance = await db.getAll('asistencia');
        const attendance = window.applyGlobalFilters(allAttendance);
        const sortedTeams = window.getSortedTeams(teams);

        // Inicializar filtros si no existen
        if (!window.asistenciaFilters) window.asistenciaFilters = { activeTeamId: 'TODOS', activeType: 'Sesión', activeLugar: 'TODOS' };

        const activeType = window.asistenciaFilters.activeType || 'Sesión';
        const activeTeamId = window.asistenciaFilters.activeTeamId || 'TODOS';
        const activeLugar = window.asistenciaFilters.activeLugar || 'TODOS';

        const filteredAttendance = attendance.filter(a => {
            if (activeType === 'all') {
                return activeTeamId === 'TODOS' || (a.equipoid && a.equipoid.toString() === activeTeamId.toString());
            }

            const clean = (t) => (t || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const target = clean(activeType);
            let item = clean(a.tipo);

            let matchesType = false;
            if (target === 'sesion') {
                matchesType = item === 'sesion' || item === 'convocatoria' || item === '' || (!['ciclo', 'torneo'].includes(item));
            } else if (target === 'ciclo') {
                matchesType = item === 'ciclo';
            } else if (target === 'torneo') {
                matchesType = item === 'torneo';
            } else {
                matchesType = item === target;
            }

            const matchesTeam = activeTeamId === 'TODOS' || (a.equipoid && a.equipoid.toString() === activeTeamId.toString());
            return matchesType && matchesTeam;
        }).sort((a, b) => b.fecha.localeCompare(a.fecha));

        container.innerHTML = `
            <div class="space-y-6 animate-in fade-in duration-500">
                <!-- Primary Tabs: Tipo de Evento -->
                <div class="flex items-center gap-1 p-1 bg-slate-100 rounded-[2rem] w-fit">
                    <button onclick="window.filterAsistenciaType('all')" 
                        class="px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.1em] transition-all ${activeType === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}">
                        TODAS
                    </button>
                    ${[
                { id: 'Sesión', label: 'SESIONES' },
                { id: 'Ciclo', label: 'CICLOS' },
                { id: 'Torneo', label: 'TORNEOS' }
            ].map(type => `
                        <button onclick="window.filterAsistenciaType('${type.id}')" 
                            class="px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.1em] transition-all ${activeType === type.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}">
                            ${type.label}
                        </button>
                    `).join('')}
                </div>

                <!-- Filters Toolbar -->
                <div class="bg-white p-3 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div class="flex items-center gap-3">
                        <!-- Team Filter -->
                        <div class="relative w-full md:w-80">
                            <select onchange="window.filterAsistencia(this.value)" class="w-full p-3.5 bg-blue-50 border border-transparent rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:bg-white focus:border-blue-200 transition-all appearance-none cursor-pointer text-blue-600">
                                <option value="TODOS" ${activeTeamId === 'TODOS' ? 'selected' : ''}>TODAS LAS PLANTILLAS</option>
                                ${sortedTeams.map(t => `<option value="${t.id}" ${activeTeamId.toString() === t.id.toString() ? 'selected' : ''}>${t.nombre.split(' ||| ')[0]}</option>`).join('')}
                            </select>
                            <i data-lucide="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none"></i>
                        </div>
                    </div>
                </div>

                <!-- Table View -->
                <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr class="bg-slate-50/50 border-b border-slate-100">
                                    <th class="text-left px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                                    <th class="text-left px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipo</th>
                                    <th class="text-left px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sesión / Evento</th>
                                    <th class="text-left px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lugar</th>
                                    <th class="text-center px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Asistencia</th>
                                    <th class="text-right px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-50">
                                ${filteredAttendance.length > 0 ? filteredAttendance.map(a => {
                const team = teams.find(t => t.id?.toString() === a.equipoid?.toString());
                const pls = a.players || a.data || {};
                const total = Object.keys(pls).length;
                const present = Object.values(pls).filter(v => (v.status || v) === 'asiste' || (v.status || v) === 'presente').length;
                const percent = total > 0 ? Math.round((present / total) * 100) : 0;

                return `
                                        <tr class="hover:bg-slate-50/50 transition-colors group">
                                            <td class="px-8 py-5">
                                                <div class="flex items-center gap-3">
                                                    <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-black text-[10px] group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                        ${a.fecha.split('-')[2]}
                                                    </div>
                                                    <div>
                                                        <p class="text-xs font-black text-slate-800 uppercase">${new Date(a.fecha).toLocaleDateString('es', { month: 'short', year: 'numeric' })}</p>
                                                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">${a.fecha}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="px-8 py-5 text-xs font-black text-slate-600 uppercase">
                                                ${team ? team.nombre.split(' ||| ')[0] : 'General'}
                                            </td>
                                            <td class="px-8 py-5 text-xs font-black text-slate-800 uppercase">
                                                ${a.nombre?.split(' ||| ')[0] || 'Entrenamiento'}
                                            </td>
                                            <td class="px-8 py-5">
                                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${window.cleanLugar(a.lugar) || '--'}</span>
                                            </td>
                                            <td class="px-8 py-5">
                                                <div class="flex flex-col items-center gap-1">
                                                    <span class="text-[10px] font-black ${percent > 80 ? 'text-emerald-600' : (percent > 50 ? 'text-amber-600' : 'text-rose-600')}">${percent}%</span>
                                                    <div class="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                        <div class="h-full ${percent > 80 ? 'bg-emerald-500' : (percent > 50 ? 'bg-amber-500' : 'bg-rose-500')}" style="width: ${percent}%"></div>
                                                    </div>
                                                    <span class="text-[8px] font-bold text-slate-400">${present}/${total}</span>
                                                </div>
                                            </td>
                                            <td class="px-8 py-5 text-right">
                                                <div class="flex justify-end gap-2">
                                                    <button onclick="console.log('View ID:', '${String(a.id)}'); window.viewAsistenciaDetail('${String(a.id)}')" class="p-2 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all" title="Ver Detalle">
                                                        <i data-lucide="eye" class="w-4 h-4"></i>
                                                    </button>
                                                    <button onclick="console.log('Edit ID:', '${String(a.id)}'); window.editAsistencia('${String(a.id)}')" class="p-2 bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-600 rounded-xl transition-all" title="Editar Asistencia">
                                                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                                                    </button>
                                                    <button onclick="window.deleteAsistencia('${String(a.id)}')" class="p-2 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all" title="Eliminar">
                                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
            }).join('') : `
                                    <tr>
                                        <td colspan="5" class="px-8 py-20 text-center">
                                            <div class="flex flex-col items-center gap-4 opacity-30">
                                                <i data-lucide="calendar-x" class="w-12 h-12"></i>
                                                <p class="text-[10px] font-black uppercase tracking-widest">No hay registros de asistencia</p>
                                            </div>
                                        </td>
                                    </tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
    };

    window.showNewAsistenciaModal = async () => {
        modalContainer.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Pasar Asistencia</h3>
                        <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Seleccionar Tipo de Evento</p>
                    </div>
                    <button onclick="closeModal()" class="p-3 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-all"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button onclick="window.showAsistenciaStep1('Sesión')" class="flex flex-col items-center gap-4 p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 hover:bg-emerald-100 transition-all group">
                        <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-all">
                            <i data-lucide="calendar" class="w-8 h-8"></i>
                        </div>
                        <span class="text-xs font-black text-emerald-600 uppercase tracking-widest">Asistencia Sesión</span>
                    </button>

                    <button onclick="window.showAsistenciaStep1('Ciclo')" class="flex flex-col items-center gap-4 p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100 hover:bg-blue-100 transition-all group">
                        <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <i data-lucide="layers" class="w-8 h-8"></i>
                        </div>
                        <span class="text-xs font-black text-blue-600 uppercase tracking-widest">Asistencia Ciclo</span>
                    </button>

                    <button onclick="window.showAsistenciaStep1('Zubieta')" class="flex flex-col items-center gap-4 p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100 hover:bg-amber-100 transition-all group">
                        <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-amber-600 group-hover:text-white transition-all">
                            <i data-lucide="trophy" class="w-8 h-8"></i>
                        </div>
                        <span class="text-xs font-black text-amber-600 uppercase tracking-widest">Asistencia Zubieta</span>
                    </button>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        modalOverlay.classList.add('active');
    };

    window.showAsistenciaStep1 = async (type) => {
        const teams = window.getSortedTeams(await db.getAll('equipos'));
        const sortedTeams = window.getSortedTeams(teams);

        modalContainer.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Nueva Asistencia</h3>
                        <p class="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Paso 1: Selección de Equipo (${type})</p>
                    </div>
                    <button onclick="closeModal()" class="p-3 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-all"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>

                <form id="pre-asistencia-form" class="space-y-6">
                    <input type="hidden" name="tipo" value="${type}">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Equipo / Plantilla</label>
                            <select name="equipoid" required class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-emerald-50 transition-all">
                                <option value="">Seleccionar Equipo...</option>
                                ${sortedTeams.map(t => `<option value="${t.id}">${t.nombre.split(' ||| ')[0]}</option>`).join('')}
                            </select>
                        </div>
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha</label>
                            <input name="fecha" type="date" required value="${new Date().toISOString().split('T')[0]}" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none">
                        </div>
                    </div>
                    <div class="space-y-2">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre / Título (Opcional)</label>
                        <input name="nombre" type="text" placeholder="Ej: ${type} Técnico Lunes" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none">
                    </div>

                    <div class="pt-6 border-t border-slate-100 flex justify-between gap-3">
                        <button type="button" onclick="window.showNewAsistenciaModal()" class="px-8 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px]">Atrás</button>
                        <button type="submit" class="px-12 py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl hover:bg-emerald-700 transition-all uppercase tracking-widest text-[10px]">Siguiente: Pasar Lista</button>
                    </div>
                </form>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
        modalOverlay.classList.add('active');

        document.getElementById('pre-asistencia-form').onsubmit = async (e) => {
            e.preventDefault();
            const preData = Object.fromEntries(new FormData(e.target));
            await window.showAsistenciaRosterModal(preData);
        };
    };

    window.setAttendance = (pid, value) => {
        const ausenteBtn = document.getElementById(`aus-btn-${pid}`);
        const asisteBtn = document.getElementById(`as-btn-${pid}`);
        const opts = document.getElementById(`abs-opts-${pid}`);
        if (!ausenteBtn || !asisteBtn || !opts) return;

        if (value === 'asiste') {
            ausenteBtn.className = 'py-2.5 text-center text-[10px] font-black uppercase rounded-xl cursor-pointer text-slate-400 transition-all hover:bg-slate-50';
            asisteBtn.className = 'py-2.5 text-center text-[10px] font-black uppercase rounded-xl cursor-pointer bg-emerald-500 text-white shadow-lg shadow-emerald-200 transition-all';
            opts.classList.add('hidden');
        } else {
            asisteBtn.className = 'py-2.5 text-center text-[10px] font-black uppercase rounded-xl cursor-pointer text-slate-400 transition-all hover:bg-slate-50';
            ausenteBtn.className = 'py-2.5 text-center text-[10px] font-black uppercase rounded-xl cursor-pointer bg-rose-500 text-white shadow-lg shadow-rose-200 transition-all';
            opts.classList.remove('hidden');
        }
    };

    window.showAsistenciaRosterModal = async (preData) => {
        const players = await db.getAll('jugadores');
        const allConvs = await db.getAll('convocatorias');
        const allSesiones = await db.getAll('sesiones');

        // Find players called via Convocatorias
        const matchingConvs = allConvs.filter(c =>
            String(c.equipoid) === String(preData.equipoid) &&
            c.fecha === preData.fecha
        );

        // Find players called via Sesiones
        const matchingSesiones = allSesiones.filter(s =>
            String(s.equipoid) === String(preData.equipoid) &&
            s.fecha === preData.fecha
        );

        // Collect all expected player IDs
        const expectedPlayerIds = new Set();
        matchingConvs.forEach(c => (c.playerids || []).forEach(id => expectedPlayerIds.add(String(id))));
        matchingSesiones.forEach(s => (s.playerids || []).forEach(id => expectedPlayerIds.add(String(id))));

        let teamPlayers = players.filter(p => p.equipoid?.toString() === preData.equipoid.toString());
        let filteredPlayers = expectedPlayerIds.size > 0
            ? teamPlayers.filter(p => expectedPlayerIds.has(String(p.id)))
            : teamPlayers;

        if (teamPlayers.length === 0) {
            window.customAlert('Atención', 'No hay jugadores vinculados a este equipo.', 'warning');
            return;
        }

        const renderTable = (list) => {
            const tbody = document.getElementById('asistencia-roster-tbody');
            if (!tbody) return;

            tbody.innerHTML = list.map(p => `
                <tr class="group hover:bg-slate-50 transition-all">
                    <td class="py-4 px-2">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-black text-[10px] text-slate-400 uppercase">
                                ${window.parsePosition(p.posicion)[0] || 'PJ'}
                            </div>
                            <div>
                                <span class="text-xs font-black text-slate-700 uppercase block">${p.nombre} ${p.apellidos || ''}</span>
                                ${expectedPlayerIds.has(String(p.id)) ? `<span class="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Convocado</span>` : ''}
                            </div>
                        </div>
                    </td>
                    <td class="py-4">
                        <div class="flex flex-col gap-2">
                            <!-- Selector Principal -->
                            <div class="flex gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                                <label class="flex-1">
                                    <input type="radio" name="p_${p.id}" value="asiste" checked 
                                           onclick="window.setAttendance('${p.id}', 'asiste')" class="hidden">
                                    <div id="as-btn-${p.id}" class="py-2.5 text-center text-[10px] font-black uppercase rounded-xl cursor-pointer bg-emerald-500 text-white shadow-lg shadow-emerald-200 transition-all">Asiste</div>
                                </label>
                                <label class="flex-1">
                                    <input type="radio" name="p_${p.id}" id="aus-radio-${p.id}" value="falta" 
                                           onclick="window.setAttendance('${p.id}', 'falta')" class="hidden">
                                    <div id="aus-btn-${p.id}" class="py-2.5 text-center text-[10px] font-black uppercase rounded-xl cursor-pointer text-slate-400 transition-all hover:bg-slate-50">Ausente</div>
                                </label>
                            </div>
                            <!-- Sub-opciones de Ausente -->
                                <div id="abs-opts-${p.id}" class="hidden grid grid-cols-5 gap-1 bg-rose-50 p-1 rounded-xl border border-rose-100/50 transition-all">
                                ${[
                    { v: 'falta', l: 'Sin Mot.' },
                    { v: 'zubieta', l: 'Zub' },
                    { v: 'estudios', l: 'Est' },
                    { v: 'lesion', l: 'Les' },
                    { v: 'enfermo', l: 'Enf' },
                    { v: 'seleccion', l: 'Sel' }
                ].map(opt => `
                                    <label class="flex-1">
                                        <input type="radio" name="p_${p.id}" value="${opt.v}" 
                                               onclick="window.setAttendance('${p.id}', 'falta')" class="hidden peer">
                                        <div class="py-1.5 text-center text-[7px] font-black uppercase rounded-lg cursor-pointer peer-checked:bg-rose-500 peer-checked:text-white text-rose-400 bg-white/50 hover:bg-rose-100 transition-all">${opt.l}</div>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    </td>
                </tr>
            `).join('');
        };

        modalContainer.innerHTML = `
            <div class="p-8 max-h-[90vh] flex flex-col">
                <div class="flex justify-between items-center mb-6 shrink-0">
                    <div>
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Pasar Lista</h3>
                        <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">${preData.nombre || 'Control Diario'} - ${preData.fecha}</p>
                    </div>
                    <button onclick="closeModal()" class="p-3 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-all"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>

                <div class="mb-6 flex items-center justify-between gap-4 p-4 bg-slate-50 rounded-[2rem] border border-slate-100 animate-in slide-in-from-top duration-300">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                            <i data-lucide="users" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mostrando</p>
                            <p id="roster-status-text" class="text-xs font-black text-slate-800 uppercase italic">
                                ${expectedPlayerIds.size > 0 ? `Solo convocados (${filteredPlayers.length})` : `Toda la plantilla (${teamPlayers.length})`}
                            </p>
                        </div>
                    </div>
                    ${expectedPlayerIds.size > 0 ? `
                        <button id="toggle-full-roster" class="px-4 py-2 bg-white border border-slate-200 text-[10px] font-black text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest shadow-sm">
                            Ver Plantilla Completa
                        </button>
                    ` : ''}
                </div>

                <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <table class="w-full">
                        <thead class="sticky top-0 bg-white z-10">
                            <tr class="border-b border-slate-100">
                                <th class="text-left py-4 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jugador</th>
                                <th class="text-center py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                            </tr>
                        </thead>
                        <tbody id="asistencia-roster-tbody" class="divide-y divide-slate-50">
                            <!-- Players rendered here -->
                        </tbody>
                    </table>
                </div>

                <div class="pt-8 border-t border-slate-100 flex justify-between items-center gap-3 shrink-0">
                    <button onclick="window.showAsistenciaStep1('${preData.tipo || 'Sesión'}')" class="px-8 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px]">Atrás</button>
                    <button id="save-asistencia-btn" class="px-12 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all uppercase tracking-widest text-[10px]">Guardar Registro</button>
                </div>
            </div>
        `;

        renderTable(filteredPlayers);
        if (window.lucide) lucide.createIcons();

        const toggleBtn = document.getElementById('toggle-full-roster');
        if (toggleBtn) {
            let showingFull = false;
            toggleBtn.onclick = () => {
                showingFull = !showingFull;
                if (showingFull) {
                    renderTable(teamPlayers);
                    toggleBtn.textContent = 'Ver Solo Convocados';
                    document.getElementById('roster-status-text').textContent = `Toda la plantilla (${teamPlayers.length})`;
                } else {
                    renderTable(filteredPlayers);
                    toggleBtn.textContent = 'Ver Plantilla Completa';
                    document.getElementById('roster-status-text').textContent = `Solo convocados (${filteredPlayers.length})`;
                }
            };
        }

        document.getElementById('save-asistencia-btn').onclick = async () => {
            const playersStatus = {};
            const tbody = document.getElementById('asistencia-roster-tbody');
            const checkedRadios = tbody.querySelectorAll('input[type="radio"]:checked');

            checkedRadios.forEach(radio => {
                const pid = radio.name.replace('p_', '');
                playersStatus[pid] = radio.value;
            });

            if (Object.keys(playersStatus).length === 0) {
                window.customAlert('Error', 'No hay jugadores en la lista.', 'error');
                return;
            }

            const payload = {
                ...preData,
                players: playersStatus
            };

            try {
                await db.add('asistencia', payload);
                window.customAlert('¡Éxito!', 'Control de asistencia guardado.', 'success');
                closeModal();
                if (currentView === 'asistencia') window.renderAsistencia(document.getElementById('content-container'));
            } catch (err) {
                window.customAlert('Error', 'No se pudo guardar la asistencia.', 'error');
            }
        };
    };

    window.viewAsistenciaDetail = async (id) => {
        const a = await db.get('asistencia', Number(id) || id);
        if (!a) {
            console.error("No se encontró el registro de asistencia con ID:", id);
            return;
        }

        const pls = a.players || a.data || {};
        const pids = Object.keys(pls);

        const teams = window.getSortedTeams(await db.getAll('equipos'));
        const team = teams.find(t => t.id?.toString() === a.equipoid?.toString());
        const players = await db.getAll('jugadores');

        const allConvs = await db.getAll('convocatorias');
        const allSesiones = await db.getAll('sesiones');

        const matchingConvs = allConvs.filter(c =>
            String(c.equipoid) === String(a.equipoid) &&
            c.fecha === a.fecha
        );
        const matchingSesiones = allSesiones.filter(s =>
            String(s.equipoid) === String(a.equipoid) &&
            s.fecha === a.fecha
        );

        const expectedPlayerIds = new Set();
        matchingConvs.forEach(c => (c.playerids || []).forEach(pid => expectedPlayerIds.add(String(pid))));
        matchingSesiones.forEach(s => (s.playerids || []).forEach(pid => expectedPlayerIds.add(String(pid))));

        const teamPlayers = players.filter(p => {
            const isRecorded = pids.includes(p.id.toString()) || pids.includes(p.id);
            const isConvocado = expectedPlayerIds.has(String(p.id));

            // Si hay registros de asistencia específicos, solo mostramos esos
            if (pids.length > 0) return isRecorded;

            // Si no hay registros aún pero hay una convocatoria vinculada, mostramos los convocados
            if (expectedPlayerIds.size > 0) return isConvocado;

            // Fallback: si no hay nada de lo anterior (error o registro huérfano), mostramos los del equipo
            return a.equipoid && p.equipoid?.toString() === a.equipoid?.toString();
        }).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

        const mContainer = document.getElementById('modal-container');
        const mOverlay = document.getElementById('modal-overlay');

        if (!mContainer || !mOverlay) return;

        mContainer.innerHTML = `
            <div class="p-8 max-h-[90vh] flex flex-col">
                <div class="flex justify-between items-start mb-8 shrink-0">
                    <div>
                        <div class="flex items-center gap-3 mb-1">
                            <span class="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-black uppercase tracking-widest">${team ? team.nombre.split(' ||| ')[0] : 'General'}</span>
                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">${a.fecha}</span>
                        </div>
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">${a.nombre?.split(' ||| ')[0] || 'Control de Asistencia'}</h3>
                        ${a.lugar ? `<p class="text-[9px] font-bold text-blue-600 uppercase tracking-widest mt-1 flex items-center gap-1.5"><i data-lucide="map-pin" class="w-3 h-3"></i> ${window.parseLugarMetadata(a.lugar).base}</p>` : ''}
                    </div>
                    <div class="flex gap-2">
                        <button onclick="window.generateAsistenciaPDF('${a.id}', false)" class="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all" title="Previsualizar PDF"><i data-lucide="eye" class="w-5 h-5"></i></button>
                        <button onclick="window.editAsistencia('${a.id}')" class="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all"><i data-lucide="edit-3" class="w-5 h-5"></i></button>
                        <button onclick="window.deleteAsistencia('${a.id}')" class="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-all"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
                        <button onclick="closeModal()" class="p-3 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-all"><i data-lucide="x" class="w-5 h-5"></i></button>
                    </div>
                </div>

                <div class="grid grid-cols-3 md:grid-cols-7 gap-2 mb-8 shrink-0">
                    ${['asiste', 'falta', 'zubieta', 'estudios', 'lesion', 'enfermo', 'seleccion', 'viaje', 'vacaciones'].map(status => {
            const count = Object.values(pls).filter(v => (v.status || v) === status || (v.status || v) === (status === 'asiste' ? 'presente' : '')).length;
            const labelMap = {
                'asiste': 'PRESENTES',
                'falta': 'SIN MOTIVO',
                'zubieta': 'ZUBIETA',
                'estudios': 'ESTUDIOS',
                'lesion': 'LESION.',
                'enfermo': 'ENFERMOS',
                'seleccion': 'SELECCIÓN',
                'viaje': 'VIAJE COL.',
                'vacaciones': 'VACACIONES'
            };
            const colorMap = {
                'asiste': 'emerald',
                'falta': 'rose',
                'zubieta': 'indigo',
                'estudios': 'blue',
                'lesion': 'amber',
                'enfermo': 'orange',
                'seleccion': 'sky',
                'viaje': 'cyan',
                'vacaciones': 'purple'
            };

            return `
                            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                                <p class="text-[6px] font-black text-slate-400 uppercase tracking-widest mb-1">${labelMap[status]}</p>
                                <p class="text-lg font-black text-${colorMap[status]}-600">${count}</p>
                            </div>
                        `;
        }).join('')}
                </div>

                <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <table class="w-full text-xs">
                        <thead class="sticky top-0 bg-white z-10 border-b border-slate-100">
                            <tr>
                                <th class="text-left py-3 font-black text-slate-400 uppercase tracking-widest">Jugador</th>
                                <th class="text-right py-3 font-black text-slate-400 uppercase tracking-widest">Estado</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${teamPlayers.map(p => {
            const statusRaw = pls[p.id]?.status || pls[p.id] || 'N/A';
            const status = (statusRaw === 'no_asiste' || statusRaw === 'falta') ? 'falta' :
                (statusRaw === 'lesionado' || statusRaw === 'lesion') ? 'lesion' : statusRaw;

            let statusLabel = 'Presente';
            let colorClass = 'bg-emerald-100 text-emerald-700';

            if (status === 'falta') { statusLabel = 'Sin Motivo'; colorClass = 'bg-rose-100 text-rose-700'; }
            else if (status === 'zubieta') { statusLabel = 'Zubieta'; colorClass = 'bg-indigo-100 text-indigo-700'; }
            else if (status === 'estudios') { statusLabel = 'Estudios'; colorClass = 'bg-blue-100 text-blue-700'; }
            else if (status === 'lesion') { statusLabel = 'Lesionado'; colorClass = 'bg-amber-100 text-amber-700'; }
            else if (status === 'enfermo') { statusLabel = 'Enfermo'; colorClass = 'bg-orange-100 text-orange-700'; }
            else if (status === 'seleccion') { statusLabel = 'Selección'; colorClass = 'bg-sky-100 text-sky-700'; }
            else if (status === 'viaje') { statusLabel = 'Viaje Col.'; colorClass = 'bg-cyan-100 text-cyan-700'; }
            else if (status === 'vacaciones') { statusLabel = 'Vacaciones'; colorClass = 'bg-purple-100 text-purple-700'; }
            else if (status === 'N/A') { statusLabel = 'No registrado'; colorClass = 'bg-slate-100 text-slate-400'; }

            return `
                                    <tr class="group hover:bg-slate-50 transition-all">
                                        <td class="py-3">
                                            <p class="font-bold text-slate-700 uppercase transition-all">${p.nombre} ${p.apellidos || ''}</p>
                                            <p class="text-[8px] font-bold text-blue-500 uppercase tracking-tight">${p.equipoConvenido || 'Sin Club'}</p>
                                        </td>
                                        <td class="py-3 text-right">
                                            <span class="px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${colorClass}">${statusLabel}</span>
                                        </td>
                                    </tr>
                                `;
        }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
        mOverlay.classList.add('active');
    };

    window.editAsistencia = async (id) => {
        const a = await db.get('asistencia', Number(id) || id);
        if (!a) return;

        const pls = a.players || a.data || {};
        const pids = Object.keys(pls);
        const players = await db.getAll('jugadores');

        const allConvs = await db.getAll('convocatorias');
        const allSesiones = await db.getAll('sesiones');

        const matchingConvs = allConvs.filter(c =>
            String(c.equipoid) === String(a.equipoid) &&
            c.fecha === a.fecha
        );
        const matchingSesiones = allSesiones.filter(s =>
            String(s.equipoid) === String(a.equipoid) &&
            s.fecha === a.fecha
        );

        const expectedPlayerIds = new Set();
        matchingConvs.forEach(c => (c.playerids || []).forEach(pid => expectedPlayerIds.add(String(pid))));
        matchingSesiones.forEach(s => (s.playerids || []).forEach(pid => expectedPlayerIds.add(String(pid))));

        const teamPlayers = players.filter(p => {
            const isRecorded = pids.includes(p.id.toString()) || pids.includes(p.id);
            const isConvocado = expectedPlayerIds.has(String(p.id));

            // Si hay registros de asistencia específicos, solo mostramos esos
            if (pids.length > 0) return isRecorded;

            // Si no hay registros aún pero hay una convocatoria vinculada, mostramos los convocados
            if (expectedPlayerIds.size > 0) return isConvocado;

            // Fallback: si no hay nada de lo anterior (error o registro huérfano), mostramos los del equipo
            return a.equipoid && p.equipoid?.toString() === a.equipoid?.toString();
        }).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

        const mContainer = document.getElementById('modal-container');
        const mOverlay = document.getElementById('modal-overlay');

        if (!mContainer || !mOverlay) return;

        mContainer.innerHTML = `
            <div class="p-8 max-h-[90vh] flex flex-col">
                <div class="flex justify-between items-center mb-8 shrink-0">
                    <div>
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Editar Asistencia</h3>
                        <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">${a.nombre?.split(' ||| ')[0] || 'Sesión'} - ${a.fecha}</p>
                    </div>
                    <button onclick="closeModal()" class="p-3 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-all"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>

                <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <table class="w-full">
                        <thead class="sticky top-0 bg-white z-10">
                            <tr class="border-b border-slate-100">
                                <th class="text-left py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jugador</th>
                                <th class="text-center py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${teamPlayers.map(p => {
            const status = pls[p.id]?.status || pls[p.id] || 'asiste';
            return `
                                    <tr>
                                        <td class="py-4">
                                            <div class="flex items-center gap-3">
                                                <div class="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-black text-[10px] text-slate-400 uppercase">
                                                    ${window.parsePosition(p.posicion)[0] || 'PJ'}
                                                </div>
                                                <span class="text-xs font-black text-slate-700 uppercase">${p.nombre} ${p.apellidos || ''}</span>
                                            </div>
                                        </td>
                                        <td class="py-4">
                                            <div class="flex flex-col gap-2">
                                                <div class="flex gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                                                    <label class="flex-1">
                                                        <input type="radio" name="p_${p.id}" value="asiste" ${status === 'asiste' || status === 'presente' ? 'checked' : ''} onclick="window.setAttendance('${p.id}', 'asiste')" class="hidden">
                                                        <div id="as-btn-${p.id}" class="py-2.5 text-center text-[10px] font-black uppercase rounded-xl cursor-pointer ${status === 'asiste' || status === 'presente' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-slate-400'} transition-all">Asiste</div>
                                                    </label>
                                                    <label class="flex-1">
                                                        <input type="radio" name="p_${p.id}" id="aus-radio-${p.id}" value="falta" ${status !== 'asiste' && status !== 'presente' && status !== 'N/A' ? 'checked' : ''} onclick="window.setAttendance('${p.id}', 'falta')" class="hidden">
                                                        <div id="aus-btn-${p.id}" class="py-2.5 text-center text-[10px] font-black uppercase rounded-xl cursor-pointer ${status !== 'asiste' && status !== 'presente' && status !== 'N/A' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'text-slate-400'} transition-all">Ausente</div>
                                                    </label>
                                                </div>
                                                <div id="abs-opts-${p.id}" class="${status !== 'asiste' && status !== 'presente' && status !== 'N/A' ? '' : 'hidden'} grid grid-cols-5 gap-1 bg-rose-50 p-1 rounded-xl border border-rose-100/50 transition-all">
                                                    ${[
                    { v: 'falta', l: 'S.M' },
                    { v: 'zubieta', l: 'Zub' },
                    { v: 'estudios', l: 'Est' },
                    { v: 'lesion', l: 'Les' },
                    { v: 'enfermo', l: 'Enf' },
                    { v: 'viaje', l: 'Viaj' },
                    { v: 'vacaciones', l: 'Vac' }
                ].map(opt => `
                                                        <label class="flex-1">
                                                            <input type="radio" name="p_${p.id}" value="${opt.v}" ${status === opt.v ? 'checked' : ''} onclick="window.setAttendance('${p.id}', 'falta')" class="hidden peer">
                                                            <div class="py-1.5 text-center text-[7px] font-black uppercase rounded-lg cursor-pointer peer-checked:bg-rose-500 peer-checked:text-white text-rose-400 bg-white/50 hover:bg-rose-100 transition-all">${opt.l}</div>
                                                        </label>
                                                    `).join('')}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                `;
        }).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="pt-8 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                    <button onclick="window.viewAsistenciaDetail('${a.id}')" class="px-8 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px]">Cancelar</button>
                    <button id="update-asistencia-btn" class="px-12 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all uppercase tracking-widest text-[10px]">Actualizar Registro</button>
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();

        document.getElementById('update-asistencia-btn').onclick = async () => {
            const playersStatus = {};
            teamPlayers.forEach(p => {
                const checked = mContainer.querySelector(`input[name="p_${p.id}"]:checked`);
                playersStatus[p.id] = checked ? checked.value : 'asiste';
            });

            try {
                await db.update('asistencia', { ...a, players: playersStatus });
                window.customAlert('¡Actualizado!', 'Registro de asistencia actualizado.', 'success');
                window.viewAsistenciaDetail(id);
                window.renderAsistencia(document.getElementById('content-container'));
            } catch (err) {
                window.customAlert('Error', 'No se pudo actualizar la asistencia.', 'error');
            }
        };

        mOverlay.classList.add('active');
    };

    window.deleteAsistencia = async (id) => {
        window.customConfirm('¿Eliminar Registro?', '¿Estás seguro de que quieres borrar este parte de asistencia permanentemente?', async () => {
            try {
                await db.delete('asistencia', Number(id) || id);
                window.customAlert('¡Eliminado!', 'El registro de asistencia ha sido borrado correctamente.', 'success');
                closeModal();
                if (window.currentView === 'asistencia') window.renderAsistencia(document.getElementById('content-container'));
            } catch (err) {
                console.error("Error al eliminar asistencia:", err);
                window.customAlert('Error', 'No se pudo eliminar el registro.', 'error');
            }
        });
    };

    window.updateClubShield = async (clubName, file) => {
        if (!file) return;
        try {
            const clubs = await db.getAll('clubes');
            const club = clubs.find(c => c.nombre === clubName);
            if (!club) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                club.escudo = e.target.result;
                await db.update('clubes', club);
                window.customAlert('Éxito', 'Escudo de club actualizado.', 'success');
                window.viewClubTeams(clubName);
                if (currentView === 'clubes') window.renderClubes(document.getElementById('content-container'));
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error(err);
            window.customAlert('Error', 'No se pudo subir el escudo.', 'error');
        }
    };

    window.toggleTeamClubLink = async (teamId, clubName, isChecked) => {
        try {
            const team = await db.get('equipos', teamId);
            if (team) {
                team.equipoConvenido = isChecked ? clubName : null;
                await db.update('equipos', team);
                window.viewClubTeams(clubName);
                if (currentView === 'clubes') {
                    const container = document.getElementById('content-container');
                    if (container) window.renderClubes(container);
                }
            }
        } catch (err) {
            console.error("Error toggling team-club link:", err);
            window.customAlert('Error', 'No se pudo actualizar la vinculación.', 'error');
        }
    };

    window.renderConvocatoriasPDF = async function (container) {
        try {
            const players = await db.getAll('jugadores');
            const convocatorias = await db.getAll('convocatorias');
            const teams = window.getSortedTeams(await db.getAll('equipos'));
            const teamsMap = Object.fromEntries(teams.map(t => [t.id, (t.nombre || 'EQUIPO').split(' ||| ')[0]]));

            let currentType = 'Sesión';
            let currentPdfComunidad = 'all';

            window.renderConvocatoriasPDFWithType = (type, com = currentPdfComunidad) => {
                currentType = type;
                currentPdfComunidad = com;
                renderForm(type);
            };

            const renderForm = (type) => {
                const sortedConvs = [...convocatorias]
                    .filter(c => c.tipo === type)
                    .filter(c => currentPdfComunidad === 'all' || window.getComunidadByLugar(c.lugar, c.nombre) === currentPdfComunidad)
                    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

                container.innerHTML = `
                    <div class="max-w-5xl mx-auto space-y-8 pb-20">
                        <div class="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden relative">
                            <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 animate-gradient-x"></div>
                            
                            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                                <div class="flex items-center gap-5">
                                    <div class="w-16 h-16 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center shadow-inner">
                                        <i data-lucide="file-text" class="w-8 h-8"></i>
                                    </div>
                                </div>
                                <button onclick="window.switchView('dashboard')" class="p-4 bg-slate-50 text-slate-400 rounded-full hover:bg-slate-100 hover:text-slate-600 transition-all"><i data-lucide="x" class="w-6 h-6"></i></button>
                            </div>

                            <div class="flex flex-col md:flex-row gap-4 mb-10">
                                <div class="flex gap-2 p-1.5 bg-slate-100 rounded-[2rem] w-fit">
                                    ${['Ciclo', 'Sesión', 'Torneo'].map(t => `
                                        <button onclick="window.renderConvocatoriasPDFWithType('${t}', '${currentPdfComunidad}')" class="px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${currentType === t ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}">
                                            ${t}S
                                        </button>
                                    `).join('')}
                                </div>

                                <div class="flex gap-2 p-1.5 bg-slate-100 rounded-[2rem] w-fit">
                                    <button onclick="window.renderConvocatoriasPDFWithType('${currentType}', 'all')" class="px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${currentPdfComunidad === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}">
                                        TODAS
                                    </button>
                                    <button onclick="window.renderConvocatoriasPDFWithType('${currentType}', 'NAVARRA')" class="px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${currentPdfComunidad === 'NAVARRA' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}">
                                        NAVARRA
                                    </button>
                                    <button onclick="window.renderConvocatoriasPDFWithType('${currentType}', 'LA RIOJA')" class="px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${currentPdfComunidad === 'LA RIOJA' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}">
                                        LA RIOJA
                                    </button>
                                </div>
                            </div>

                            <form id="convocatoria-pdf-form" class="space-y-10">
                                <input type="hidden" name="type" value="${type}">
                                
                                <div class="space-y-6 p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
                                        <i data-lucide="link" class="w-3.5 h-3.5"></i> Selección y Jugador
                                    </p>
                                    
                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div class="relative">
                                            <select id="filter-team-conv" class="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-blue-50 transition-all appearance-none cursor-pointer">
                                                <option value="">TODOS LOS EQUIPOS</option>
                                                ${window.getSortedTeams(teams).map(t => `<option value="${t.id}">${(t.nombre || 'EQUIPO').split(' ||| ')[0]}</option>`).join('')}
                                            </select>
                                            <i data-lucide="users" class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none"></i>
                                        </div>
                                        <div class="relative">
                                            <input type="date" id="filter-date-conv" class="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-blue-50 transition-all">
                                            <i data-lucide="calendar" class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none"></i>
                                        </div>
                                        <div class="relative lg:col-span-2">
                                            <select id="link-conv-select" class="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 ring-blue-50 transition-all appearance-none cursor-pointer">
                                                <option value="">-- Vincular con ${type} --</option>
                                                ${sortedConvs.map(c => `
                                                    <option value="${c.id}" data-equipoid="${c.equipoid}" data-fecha="${c.fecha}" data-nombre="${(c.nombre || '').replace(/"/g, '&quot;')}" data-lugar="${(c.lugar || '').replace(/"/g, '&quot;')}" data-players='${JSON.stringify(c.playerids || [])}'>
                                                        [${c.fecha}] ${(c.nombre || 'Sin nombre').toUpperCase()} (${teamsMap[c.equipoid] || 'Múltiples'})
                                                    </option>
                                                `).join('')}
                                            </select>
                                            <i data-lucide="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none"></i>
                                        </div>
                                    </div>

                                    <div class="relative group">
                                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">Jugador a convocar</label>
                                        <select name="playerid" id="pdf-player-select" class="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 ring-blue-50 transition-all appearance-none cursor-pointer">
                                            <option value="">Selecciona un jugador...</option>
                                            ${players.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')).map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')}
                                        </select>
                                        <i data-lucide="chevron-down" class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none"></i>
                                    </div>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div class="col-span-2 space-y-3">
                                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Título del PDF (Cabecera)</label>
                                        <input name="evento" id="pdf-titulo" placeholder="Ej: CATEGORIA INFANTIL-ALEVIN FEMENINO" class="w-full p-5 bg-slate-50 border border-slate-100 rounded-3xl text-lg font-black outline-none focus:ring-4 ring-blue-50/50 transition-all uppercase" required>
                                    </div>

                                    ${type === 'Ciclo' ? `
                                        ${[1, 2, 3].map(i => `
                                            <div class="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-blue-50/30 rounded-3xl border border-blue-50">
                                                <div class="space-y-2">
                                                    <label class="text-[9px] font-black text-blue-600 uppercase tracking-widest">Sesión ${i} - Fecha</label>
                                                    <input name="fecha_${i}" type="date" class="w-full p-3 bg-white border border-slate-100 rounded-xl font-bold outline-none text-sm">
                                                </div>
                                                <div class="grid grid-cols-3 gap-2">
                                                    <div><input name="hl_${i}" type="time" class="w-full p-2 bg-white border border-slate-100 rounded-lg text-[10px] font-bold outline-none"></div>
                                                    <div><input name="hi_${i}" type="time" class="w-full p-2 bg-white border border-slate-100 rounded-lg text-[10px] font-bold outline-none"></div>
                                                    <div><input name="hs_${i}" type="time" class="w-full p-2 bg-white border border-slate-100 rounded-lg text-[10px] font-bold outline-none"></div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    ` : `
                                        <div class="space-y-3">
                                            <input name="fecha" id="pdf-fecha" type="date" value="${new Date().toISOString().split('T')[0]}" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" required>
                                        </div>
                                        <div class="grid grid-cols-3 gap-3">
                                            <input name="hl" id="pdf-hl" type="time" class="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none">
                                            <input name="hi" id="pdf-hi" type="time" class="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none">
                                            <input name="hs" id="pdf-hs" type="time" class="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none">
                                        </div>
                                    `}

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div class="space-y-3">
                                            <input name="lugar" id="pdf-lugar" placeholder="LUGAR" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none uppercase">
                                        </div>
                                        <div class="space-y-3">
                                            <select name="superficie" id="pdf-superficie" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none appearance-none cursor-pointer">
                                                <option value="HIERBA ARTIFICIAL">HIERBA ARTIFICIAL / BELAR ARTIFIZIALA</option>
                                                <option value="HIERBA NATURAL">HIERBA NATURAL / BELAR NATURALA</option>
                                                <option value="PABELLÓN / SALA">PABELLÓN / ARETOA</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="space-y-3">
                                        <input name="ubicacion" id="pdf-ubicacion" placeholder="LINK GOOGLE MAPS" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none">
                                    </div>
                                    <div class="space-y-3 col-span-2">
                                        <textarea name="extra" id="pdf-extra" rows="4" class="w-full p-5 bg-slate-50 border border-slate-100 rounded-[2rem] font-medium text-sm outline-none resize-none">Nos gustaría ofrecer al jugador perteneciente a su Club la posibilidad de participar en un ciclo de entrenamiento organizado por la Real Sociedad.

EL CICLO DE ENTRENAMIENTO se llevará a cabo en las instalaciones deportivas de la EF Arnedo en Arnedo (La Rioja)</textarea>
                                    </div>
                                    <div class="space-y-3 col-span-2 md:col-span-1">
                                        <textarea name="notas" id="pdf-notas" rows="6" class="w-full p-5 bg-slate-50 border border-slate-100 rounded-[2rem] font-medium text-[11px] outline-none resize-none">La sesión de tecnificación será de 1 hora y 15 minutos.

La Real Sociedad facilitará la ropa deportiva para la sesión de tecnificación, tendrán que llevar MEDIAS.

Solo podrán acceder a la instalación de entrenamiento los participantes en la tecnificación.</textarea>
                                    </div>
                                    <div class="space-y-3 col-span-2 md:col-span-1">
                                        <textarea name="muy_importante" id="pdf-importante" rows="6" class="w-full p-5 bg-slate-50 border border-slate-100 rounded-[2rem] font-medium text-[11px] outline-none resize-none">Se deberán DUCHAR después de cada sesión de entrenamiento, por lo que necesitan material para la ducha.

Los jugadores tendrán que llevar su PROPIA BOTELLA DE AGUA.

Si el jugador citado no puede asistir a la convocatoria os pedimos que nos lo hagáis saber por ESCRITO.</textarea>
                                    </div>
                                </div>

                                <div class="pt-10 border-t border-slate-100 flex flex-col md:flex-row gap-4">
                                    <button type="submit" name="action" value="single" class="flex-1 py-6 bg-slate-900 text-white font-black rounded-[2rem] shadow-2xl hover:bg-black transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                                        <i data-lucide="printer" class="w-6 h-6"></i>
                                        Generar PDF Individual
                                    </button>
                                    <button type="submit" id="btn-generate-all" name="action" value="all" class="hidden flex-1 py-6 bg-blue-600 text-white font-black rounded-[2rem] shadow-2xl hover:bg-blue-700 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                                        <i data-lucide="layers" class="w-6 h-6"></i>
                                        Generar Todas (${type}S)
                                    </button>
                                </div>
                            </form>
                        </div>
                        <div id="pdf-preview-status" class="hidden p-8 bg-blue-50 border border-blue-100 rounded-[3rem] flex items-center gap-5 animate-pulse">
                            <div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                <div class="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                            </div>
                            <div>
                                <p class="text-sm font-black text-blue-600">Procesando PDF...</p>
                            </div>
                        </div>
                    </div>
                `;

                if (window.lucide) lucide.createIcons();

                const convSelect = container.querySelector('#link-conv-select');
                const playerSelect = container.querySelector('#pdf-player-select');
                const filterTeam = container.querySelector('#filter-team-conv');
                const filterDate = container.querySelector('#filter-date-conv');

                filterTeam.onchange = filterDate.onchange = () => {
                    const tid = filterTeam.value;
                    const dval = filterDate.value;
                    Array.from(convSelect.options).forEach(opt => {
                        if (!opt.value) return;
                        opt.style.display = ((!tid || opt.dataset.equipoid === tid) && (!dval || opt.dataset.fecha === dval)) ? '' : 'none';
                    });
                    convSelect.value = "";
                };

                const mapsInput = container.querySelector('#pdf-ubicacion');
                const lugarInput = container.querySelector('#pdf-lugar');
                const btnAll = container.querySelector('#btn-generate-all');

                const updateMapsFromLugar = async () => {
                    const val = lugarInput.value.trim().toUpperCase();
                    if (!val) return;
                    const clubes = await db.getAll('clubes');
                    const match = clubes.find(c =>
                        (c.lugar || '').toUpperCase() === val ||
                        (c.nombre || '').toUpperCase().includes(val)
                    );
                    if (match && match.ubicacion) {
                        mapsInput.value = match.ubicacion;
                    }
                };

                lugarInput.oninput = updateMapsFromLugar;

                convSelect.onchange = async (e) => {
                    const opt = e.target.selectedOptions[0];
                    if (!opt || !opt.value) {
                        if (btnAll) btnAll.classList.add('hidden');
                        return;
                    }
                    const pids = JSON.parse(opt.dataset.players || '[]');
                    const filtered = players.filter(p => pids.includes(p.id) || pids.includes(String(p.id)));
                    playerSelect.innerHTML = `<option value="">Selecciona un jugador...</option>` +
                        filtered.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');

                    if (filtered.length > 0 && btnAll) {
                        btnAll.classList.remove('hidden');
                        btnAll.innerText = `GENERAR TODAS LAS INDIVIDUALES (${filtered.length})`;
                    } else if (btnAll) {
                        btnAll.classList.add('hidden');
                    }

                    container.querySelector('#pdf-titulo').value = (opt.dataset.nombre || '').toUpperCase();
                    const meta = window.parseLugarMetadata(opt.dataset.lugar);
                    lugarInput.value = meta.base;

                    // Auto-buscar el link de maps según el lugar
                    await updateMapsFromLugar();

                    if (type === 'Ciclo') {
                        const sessions = [
                            { f: opt.dataset.fecha, hl: meta.extra.hl, hi: meta.extra.hi, hs: meta.extra.hs },
                            meta.extra.s2 || {},
                            meta.extra.s3 || {}
                        ];
                        sessions.forEach((s, i) => {
                            const idx = i + 1;
                            const fFld = container.querySelector(`[name="fecha_${idx}"]`);
                            if (fFld) fFld.value = s.f || s.fecha || '';
                            const hlFld = container.querySelector(`[name="hl_${idx}"]`);
                            if (hlFld) hlFld.value = s.hl || '';
                            const hiFld = container.querySelector(`[name="hi_${idx}"]`);
                            if (hiFld) hiFld.value = s.hi || '';
                            const hsFld = container.querySelector(`[name="hs_${idx}"]`);
                            if (hsFld) hsFld.value = s.hs || '';
                        });
                    } else {
                        const fld = container.querySelector('#pdf-fecha');
                        if (fld) fld.value = opt.dataset.fecha;
                        const hlFld = container.querySelector('#pdf-hl');
                        if (hlFld) hlFld.value = meta.extra.hl || '';
                        const hiFld = container.querySelector('#pdf-hi');
                        if (hiFld) hiFld.value = meta.extra.hi || '';
                        const hsFld = container.querySelector('#pdf-hs');
                        if (hsFld) hsFld.value = meta.extra.hs || '';
                    }
                };

                let currentAction = 'single';
                container.querySelectorAll('button[type="submit"]').forEach(btn => {
                    btn.onclick = () => { currentAction = btn.value; };
                });

                container.querySelector('#convocatoria-pdf-form').onsubmit = async (e) => {
                    e.preventDefault();
                    const action = currentAction;
                    const data = Object.fromEntries(new FormData(e.target));
                    const status = container.querySelector('#pdf-preview-status');
                    const statusText = status.querySelector('p');

                    try {
                        if (action === 'single') {
                            const player = players.find(p => p.id.toString() === (data.playerid || '').toString());
                            if (!player) {
                                window.customAlert('Atención', 'Selecciona un jugador primero.', 'warning');
                                return;
                            }
                            status.classList.remove('hidden');
                            await generateIndividualConvocatoriaPDF(player, data);
                            window.customAlert('¡PDF Generado!', 'Descarga completada.', 'success');
                        } else {
                            const opt = convSelect.selectedOptions[0];
                            if (!opt || !opt.value) {
                                window.customAlert('Atención', 'Selecciona una convocatoria primero.', 'warning');
                                return;
                            }
                            const pids = JSON.parse(opt.dataset.players || '[]');
                            const filtered = players.filter(p => pids.includes(p.id) || pids.includes(String(p.id)));

                            if (filtered.length === 0) {
                                window.customAlert('Atención', 'No hay jugadores en esta convocatoria.', 'warning');
                                return;
                            }

                            status.classList.remove('hidden');
                            for (let i = 0; i < filtered.length; i++) {
                                const p = filtered[i];
                                statusText.innerText = `Generando ${i + 1} de ${filtered.length}: ${p.nombre}...`;
                                try {
                                    await generateIndividualConvocatoriaPDF(p, data);
                                } catch (pdfErr) {
                                    console.error(`Error generating PDF for ${p.nombre}:`, pdfErr);
                                }
                                // Pequeño delay para no saturar las descargas del navegador
                                await new Promise(r => setTimeout(r, 800));
                            }
                            window.customAlert('¡Finalizado!', `Proceso de generación masiva terminado.`, 'success');
                        }
                    } catch (err) {
                        console.error("Error general en generación de PDF:", err);
                        const stackLine = err.stack ? err.stack.split('\n')[1] : 'no stack';
                        window.customAlert('Error Técnico', `Error: ${err.message}\nUbicación: ${stackLine}`, 'error');
                    } finally {
                        status.classList.add('hidden');
                        statusText.innerText = 'Procesando PDF...';
                    }
                };
            };

            window.renderConvocatoriasPDFWithType = (type) => {
                currentType = type;
                renderForm(type);
            };

            renderForm(currentType);

        } catch (err) {
            console.error("Error rendering PDF generator:", err);
            if (container) {
                container.innerHTML = `<div class="p-20 text-center italic text-slate-400">Error al cargar el generador: ${err.message}</div>`;
            }
        }
    };





    async function generateIndividualConvocatoriaPDF(player, info) {
        console.log("Iniciando generación de PDF para:", player?.nombre);

        if (!window.jspdf || !window.jspdf.jsPDF) {
            console.error("Librería jsPDF no encontrada");
            throw new Error("Librería de PDF no cargada correctamente.");
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        if (typeof doc.autoTable !== 'function') {
            console.error("Plugin autoTable no encontrado");
            throw new Error("Plugin de tablas no cargado.");
        }

        const loadImage = (url) => new Promise((resolve) => {
            if (!url) return resolve(null);
            const img = new Image();
            const timer = setTimeout(() => resolve(null), 5000);

            img.onload = () => {
                clearTimeout(timer);
                if (img.naturalWidth > 0 && img.naturalHeight > 0) resolve(img);
                else resolve(null);
            };
            img.onerror = () => {
                const img2 = new Image();
                img2.crossOrigin = "Anonymous";
                img2.onload = () => {
                    clearTimeout(timer);
                    if (img2.naturalWidth > 0 && img2.naturalHeight > 0) resolve(img2);
                    else resolve(null);
                };
                img2.onerror = () => { clearTimeout(timer); resolve(null); };
                img2.src = url;
            };
            img.src = url;
        });

        const normalize = (s) => (s || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const clubes = await db.getAll('clubes');

        // RS Logo (Search for "Real Sociedad" club or fallback to RS.png)
        const rsClub = clubes.find(c => normalize(c.nombre) === "REAL SOCIEDAD");
        const rsLogo = await loadImage(rsClub?.escudo || 'RS.png');

        // Player Club Logo
        let clubShield = null;
        if (player.equipoConvenido) {
            const pClubNorm = normalize(player.equipoConvenido);
            const club = clubes.find(c => normalize(c.nombre) === pClubNorm);
            if (club && club.escudo) clubShield = await loadImage(club.escudo);
        }

        // --- HEADER ---
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text(`SESIÓN: ${info.evento || 'CONVOCATORIA'}`.toUpperCase(), 105, 25, { align: "center" });

        // --- LOGOS ---
        const logoY = 32;
        const safeAddImage = (img, x, y, w, h) => {
            if (!img) return;
            try {
                doc.addImage(img, 'AUTO', x, y, w, h);
            } catch (e) {
                console.warn("Error al añadir imagen al PDF:", e);
            }
        };

        safeAddImage(rsLogo, 85, logoY, 15, 15);
        safeAddImage(clubShield, 110, logoY, 15, 15);

        // --- PLAYER NAME ---
        doc.setFontSize(20);
        const pName = (player.nombre || 'JUGADOR').toUpperCase();
        doc.text(pName, 105, 60, { align: "center" });

        // --- INVITATION TEXT ---
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        const defaultInvitation = `Nos gustaría ofrecer al jugador perteneciente a su Club la posibilidad de participar en un ciclo de entrenamiento organizado por la Real Sociedad.

EL CICLO DE ENTRENAMIENTO se llevará a cabo en las instalaciones deportivas de la EF Arnedo en Arnedo (La Rioja)`;
        const invitation = info.extra && info.extra !== 'Invitación oficial...' ? info.extra : defaultInvitation;
        const splitInvitation = doc.splitTextToSize(invitation, 170);
        doc.text(splitInvitation, 20, 75);

        // --- TABLE ---
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const daysBasque = ['Igandea', 'Astelehena', 'Asteartea', 'Asteazkena', 'Osteguna', 'Ostirala', 'Larunbata'];

        const getSafeDayLabel = (dateStr) => {
            if (!dateStr) return '--';
            try {
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return dateStr;
                const dayIdx = d.getDay();
                return `${dateStr}\n\n${days[dayIdx]} / ${daysBasque[dayIdx]}`;
            } catch (e) { return dateStr; }
        };

        let body = [
            ['Día / Eguna'],
            ['Lugar / Lekua'],
            ['Superficie / Gainazala'],
            ['Hora / Ordua']
        ];

        let head = [['']];
        let colStyles = { 0: { cellWidth: 40, fontStyle: 'bold', fillColor: [230, 230, 230] } };

        if (info.type === 'Ciclo') {
            [1, 2, 3].forEach(i => {
                const f = info[`fecha_${i}`];
                if (f) {
                    head[0].push(`SESIÓN ${i}`);
                    body[0].push(getSafeDayLabel(f));

                    body[1].push({
                        content: `${(info.lugar || '').toUpperCase()}\n\nVER UBICACIÓN EN GOOGLE MAPS`,
                        data: { url: (info.ubicacion || '').trim() },
                        styles: { fontStyle: 'bold', textColor: [0, 50, 200], fontSize: 7.5 }
                    });

                    body[2].push(info.superficie || 'HIERBA ARTIFICIAL');

                    const hl = info[`hl_${i}`] || '--:--';
                    const hi = info[`hi_${i}`] || '--:--';
                    const hs = info[`hs_${i}`] || '';
                    body[3].push(`${hl} (Llegada)\n\n${hi} (Comienzo)\n\n${hs ? `${hs} (Salida)` : ''}`);
                }
            });
        } else {
            head[0].push('DATOS / DATUAK');
            body[0].push(getSafeDayLabel(info.fecha));
            body[1].push({
                content: `${(info.lugar || '').toUpperCase()}\n\nVER UBICACIÓN EN GOOGLE MAPS`,
                data: { url: (info.ubicacion || '').trim() },
                styles: { fontStyle: 'bold', textColor: [0, 50, 200], fontSize: 7.5 }
            });
            body[2].push(info.superficie || 'HIERBA ARTIFICIAL');
            body[3].push(`${info.hl || '--:--'} (Llegada)\n\n${info.hi || '--:--'} (Comienzo)\n\n${info.hs ? `${info.hs} (Salida)` : ''}`);
        }

        try {
            doc.autoTable({
                startY: 100,
                head: head,
                body: body,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 3, lineColor: [180, 180, 180], textColor: [0, 0, 0], halign: 'center', valign: 'middle', overflow: 'linebreak' },
                headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 10 },
                columnStyles: colStyles,
                margin: { left: 20, right: 20 },
                didDrawCell: (data) => {
                    // Si la celda tiene una URL en sus datos personalizados, añadimos el enlace manualmente
                    if (data.cell.raw && data.cell.raw.data && data.cell.raw.data.url) {
                        doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: data.cell.raw.data.url });
                    }
                }
            });
        } catch (tableErr) {
            console.error("Error drawing table:", tableErr);
            throw new Error("Error técnico al generar la tabla del PDF.");
        }

        let finalY = (doc.lastAutoTable?.finalY || 140) + 10;

        // --- SECTIONS (NOTAS / IMPORTANTE) ---
        const drawSection = (title, content, y, fullHighlight = false) => {
            if (!content || content === 'Notas...' || content === 'Importante...') return y;
            if (y > 270) doc.addPage();

            const splitContent = doc.splitTextToSize(content, 170);

            if (fullHighlight) {
                doc.setFillColor(255, 241, 118);
                doc.rect(20, y - 5, 170, (splitContent.length * 4.5) + 12, 'F');
            } else {
                doc.setFillColor(255, 241, 118);
                const titleWidth = doc.getTextWidth(title + " ") + 4;
                doc.rect(20, y - 5, titleWidth, 7, 'F');
            }

            doc.setFont("Montserrat", "bold");
            doc.setFontSize(11);
            doc.text(title, 22, y);

            doc.setFont("Montserrat", "bold");
            doc.setFontSize(8.5);
            doc.text(splitContent, 20, y + 6);

            return y + (splitContent.length * 4.5) + 10;
        };

        const defaultNotas = `La sesión de tecnificación será de 1 hora y 15 minutos.

La Real Sociedad facilitará la ropa deportiva para la sesión de tecnificación, tendrán que llevar MEDIAS.

Solo podrán acceder a la instalación de entrenamiento los participantes en la tecnificación.`;
        const defaultImp = `Se deberán DUCHAR después de cada sesión de entrenamiento, por lo que necesitan material para la ducha.

Los jugadores tendrán que llevar su PROPIA BOTELLA DE AGUA.

Si el jugador citado no puede asistir a la convocatoria os pedimos que nos lo hagáis saber por ESCRITO.`;

        finalY = drawSection("NOTAS:", info.notas || defaultNotas, finalY);
        finalY = drawSection("MUY IMPORTANTE:", info.muy_importante || defaultImp, finalY);

        doc.save(`${pName}.pdf`);
        console.log("PDF generado con éxito para:", pName);
    }

    window.generateAsistenciaPDF = async (id, download = true) => {
        const a = await db.get('asistencia', Number(id) || id);
        if (!a) return window.customAlert('Error', 'No se encontró la asistencia.', 'error');

        const pls = a.players || a.data || {};
        const players = await db.getAll('jugadores');
        const teams = window.getSortedTeams(await db.getAll('equipos'));
        const team = teams.find(t => String(t.id) === String(a.equipoid));

        const teamPlayers = players.filter(p => Object.keys(pls).includes(String(p.id)));

        if (!window.jspdf || !window.jspdf.jsPDF) {
            return window.customAlert('Error', 'Librería PDF no disponible.', 'error');
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.text("CONTROL DE ASISTENCIA", 105, 20, { align: "center" });

        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`${team?.nombre || 'EQUIPO'} - ${a.fecha}`, 105, 30, { align: "center" });

        const tableData = teamPlayers.map(p => {
            const statusRaw = pls[p.id]?.status || pls[p.id] || 'N/A';
            const statusLabelMap = {
                'asiste': 'Presente',
                'falta': 'Sin Motivo',
                'zubieta': 'Zubieta',
                'estudios': 'Estudios',
                'lesion': 'Lesionado',
                'enfermo': 'Enfermo',
                'seleccion': 'Selección',
                'viaje': 'Viaje Colegio',
                'vacaciones': 'Vacaciones'
            };
            return [
                (p.nombre + ' ' + (p.apellidos || '')).toUpperCase(),
                (window.parsePosition(p.posicion)[0] || 'PJ').toUpperCase(),
                (p.equipoConvenido || 'Sin Club').toUpperCase(),
                statusLabelMap[statusRaw] || statusRaw
            ];
        });

        doc.autoTable({
            startY: 40,
            head: [['JUGADOR', 'POS', 'CLUB', 'ESTADO']],
            body: tableData,
            headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            styles: { fontSize: 8, cellPadding: 4 },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 70 },
                1: { halign: 'center', cellWidth: 20 },
                2: { halign: 'center', cellWidth: 65 },
                3: { fontStyle: 'bold', halign: 'center', cellWidth: 35 }
            },
            didParseCell: function (data) {
                if (data.section === 'body' && data.column.index === 3) {
                    const status = data.cell.raw;
                    if (status === 'Presente') data.cell.styles.textColor = [16, 185, 129];
                    else if (status === 'Sin Motivo' || status === 'Falta') data.cell.styles.textColor = [225, 29, 72];
                }
            }
        });

        const filename = `ASISTENCIA_${a.fecha}_${team?.nombre || 'EQUIPO'}`;
        if (download) {
            doc.save(`${filename}.pdf`);
        } else {
            const blobUrl = doc.output('bloburl');
            window.showPdfPreviewModal(blobUrl, filename, id);
        }
    };

    window.showPdfPreviewModal = (url, filename, originalId) => {
        console.log("Opening High-Z Preview Modal for:", filename);

        const isPlayer = filename.startsWith('DOSSIER_');
        const backAction = isPlayer ? `window.viewPlayerProfile('${originalId}')` : `window.viewAsistenciaDetail('${originalId}')`;

        const previewOverlay = document.createElement('div');
        previewOverlay.id = 'pdf-preview-overlay';
        previewOverlay.className = 'fixed inset-0 z-[150] flex items-center justify-center p-0 md:p-8 animate-in fade-in duration-300';
        previewOverlay.innerHTML = `
            <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-md"></div>
            <div class="bg-white w-full max-w-5xl h-full md:h-[90vh] rounded-none md:rounded-[2.5rem] relative shadow-2xl overflow-hidden flex flex-col transform animate-in zoom-in duration-300">
                <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">Previsualización</h3>
                        <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">${filename}.pdf</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="document.getElementById('pdf-preview-overlay').remove(); ${backAction}" class="flex items-center gap-2 px-6 py-3 bg-slate-200 text-slate-600 font-black rounded-2xl hover:bg-slate-300 transition-all uppercase tracking-widest text-[10px]">
                            <i data-lucide="arrow-left" class="w-4 h-4"></i> Volver
                        </button>
                        <a href="${url}" download="${filename}.pdf" class="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all uppercase tracking-widest text-[10px]">
                            <i data-lucide="download" class="w-4 h-4"></i> Descargar PDF
                        </a>
                        <button onclick="document.getElementById('pdf-preview-overlay').remove()" class="p-3 bg-white rounded-full text-slate-400 hover:bg-slate-200 transition-all shadow-sm border border-slate-100"><i data-lucide="x" class="w-5 h-5"></i></button>
                    </div>
                </div>
                <div class="flex-1 bg-slate-800 p-2 md:p-4">
                    <iframe src="${url}#toolbar=0" class="w-full h-full border-none rounded-none md:rounded-xl bg-white shadow-2xl"></iframe>
                </div>
            </div>
        `;

        document.body.appendChild(previewOverlay);
        if (window.lucide) lucide.createIcons();
    };

    window.filterAsistenciaType = (type) => {
        if (!window.asistenciaFilters) window.asistenciaFilters = {};
        window.asistenciaFilters.activeType = type;
        window.renderAsistencia(document.getElementById('content-container'));
    };


    window.generatePlayerPDF = async (playerId, selectedSeason = 'ALL', mode = 'save') => {
        try {
            const player = await db.get('jugadores', playerId);
            if (!player) throw new Error("Jugador no encontrado");

            if (!window.jspdf || !window.jspdf.jsPDF) {
                throw new Error("La librería PDF (jsPDF) no está cargada correctamente.");
            }

            const teams = await db.getAll('equipos');
            const team = teams.find(t => String(t.id) === String(player.equipoid));
            const allAttendance = await db.getAll('asistencia');
            const allConvocatorias = await db.getAll('convocatorias');

            const filterBySeason = (items, dateField = 'fecha') => {
                if (selectedSeason === 'ALL') return items;
                return items.filter(i => window.getSeason(i[dateField]) === selectedSeason);
            };

            const playerAttendance = filterBySeason(allAttendance.filter(a => a.players && a.players[playerId]));
            const torneos = filterBySeason(allConvocatorias.filter(c => {
                const pids = c.playerids || [];
                return pids.map(String).includes(String(playerId)) && (['Torneo', 'Partido'].includes(c.tipo));
            }));

            const attendanceSummary = { asiste: 0, falta: 0, lesion: 0, enfermo: 0, total: playerAttendance.length };
            playerAttendance.forEach(a => {
                const s = a.players[playerId];
                const statusRaw = (typeof s === 'object' ? s.status : s) || 'N/A';
                const status = String(statusRaw).toLowerCase();
                if (status === 'asiste' || status === 'presente') attendanceSummary.asiste++;
                else if (status === 'falta' || status === 'no_asiste') attendanceSummary.falta++;
                else if (status === 'lesion' || status === 'lesionado') attendanceSummary.lesion++;
                else if (status === 'enfermo') attendanceSummary.enfermo++;
            });

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // --- FONT INTEGRATION ---
            if (window.MONTSERRAT_BOLD) {
                doc.addFileToVFS("Montserrat-Bold.ttf", window.MONTSERRAT_BOLD);
                doc.addFont("Montserrat-Bold.ttf", "Montserrat", "bold");
                doc.setFont("Montserrat", "bold");
            }

            let yPos = 75;

            // --- THEME DEFINITION ---
            const colors = {
                navy: [15, 23, 42],      // Slate 900
                blue: [37, 99, 235],     // Blue 600
                accent: [241, 245, 249], // Slate 100
                text: [30, 41, 59],      // Slate 800
                muted: [100, 116, 139],  // Slate 500
                white: [255, 255, 255]
            };

            // Helper for high-reliability image loading
            const getPlayerDataURL = async (player) => {
                if (player.foto_blob) return player.foto_blob;
                if (!player.foto) return null;
                try {
                    const generated = await window.generatePdfBlob(player.foto);
                    if (generated) {
                        db.update('jugadores', { id: player.id, foto_blob: generated }, true);
                    }
                    return generated;
                } catch (e) {
                    console.warn("Error generating photo blob:", e);
                    return null;
                }
            };

            // --- PAGE HEADER ---
            doc.setFillColor(...colors.navy);
            doc.rect(0, 0, 210, 50, 'F');
            doc.setFillColor(...colors.blue);
            doc.roundedRect(15, 10, 8, 8, 2, 2, 'F');
            doc.setTextColor(...colors.white);
            doc.setFont("Montserrat", "bold");
            doc.setFontSize(10);
            doc.text("DOSSIER INDIVIDUAL DE RENDIMIENTO", 27, 16);
            const seasonLabel = selectedSeason === 'ALL' ? 'HISTORIAL COMPLETO' : `TEMPORADA ${selectedSeason}`;
            doc.setFontSize(8);
            doc.text(seasonLabel, 195, 16, { align: 'right' });
            doc.setFontSize(26);
            doc.text((player.nombre || '').toUpperCase(), 15, 35);
            doc.setFontSize(11);
            doc.setFont("Montserrat", "bold");
            const teamLabel = team ? team.nombre.split(' ||| ')[0] : 'JUGADOR SIN EQUIPO';
            doc.text(teamLabel.toUpperCase() + (player.equipoConvenido ? `  |  ${player.equipoConvenido.toUpperCase()}` : ''), 15, 43);

            let imgData = await getPlayerDataURL(player);
            if (!imgData) {
                try {
                    imgData = await window.generatePdfBlob('Imagenes/Foto Jugador General.png');
                } catch (e) { console.warn("Fallback photo failed"); }
            }

            if (imgData) {
                try {
                    doc.setFillColor(255, 255, 255);
                    doc.roundedRect(155, 25, 40, 45, 4, 4, 'F');
                    doc.addImage(imgData, 'JPEG', 157.5, 27.5, 35, 40);
                } catch (e) {
                    doc.setDrawColor(230);
                    doc.roundedRect(155, 25, 40, 45, 4, 4, 'D');
                }
            } else {
                doc.setDrawColor(200);
                doc.setLineDash([1, 1]);
                doc.roundedRect(155, 25, 40, 45, 4, 4, 'D');
                doc.setLineDash([]);
                doc.setTextColor(180);
                doc.setFontSize(8);
                doc.text("SIN FOTOGRAFÍA", 175, 48, { align: 'center' });
            }

            // --- EXECUTIVE SUMMARY ---
            doc.setTextColor(...colors.navy);
            doc.setFontSize(12);
            doc.setFont("Montserrat", "bold");
            doc.text("RESUMEN EJECUTIVO TÉCNICO", 15, yPos);
            yPos += 3;
            doc.setFillColor(...colors.blue);
            doc.rect(15, yPos, 15, 1.5, 'F');
            yPos += 8;

            const summaryData = [
                ["FECHA NAC.", "POSICIÓN", "LATERALIDAD", "NIVEL TÉCNICO"],
                [
                    player.fechanacimiento || player.anionacimiento || '----',
                    window.formatPosition(player.posicion).toUpperCase(),
                    (player.lateralidad || player.pie || 'DIESTRO').toUpperCase(),
                    `${player.nivel || 3} / 5`
                ]
            ];

            doc.autoTable({
                startY: yPos,
                head: [summaryData[0]],
                body: [summaryData[1]],
                theme: 'plain',
                headStyles: { fillColor: colors.accent, textColor: colors.muted, fontSize: 8, fontStyle: 'bold', halign: 'center' },
                styles: { font: 'Montserrat', halign: 'center', fontSize: 10, fontStyle: 'bold', textColor: colors.navy, cellPadding: 5 },
                margin: { left: 15, right: 15 }
            });

            yPos = doc.lastAutoTable.finalY + 15;

            // --- PERFORMANCE METRICS ---
            doc.setTextColor(...colors.navy);
            doc.setFontSize(12);
            doc.setFont("Montserrat", "bold");
            doc.text("MÉTRICAS DE PARTICIPACIÓN", 15, yPos);
            yPos += 3;
            doc.setFillColor(...colors.blue);
            doc.rect(15, yPos, 15, 1.5, 'F');
            yPos += 8;

            const assistRate = attendanceSummary.total > 0 ? Math.round((attendanceSummary.asiste / attendanceSummary.total) * 100) : 0;
            doc.autoTable({
                startY: yPos,
                head: [['TOTAL SESIONES', 'ASISTENCIAS', 'AUSENCIAS', 'TORNEOS', 'RATIO ASISTENCIA']],
                body: [[attendanceSummary.total, attendanceSummary.asiste, attendanceSummary.falta, torneos.length, `${assistRate}%`]],
                headStyles: { fillColor: colors.navy, textColor: colors.white, fontStyle: 'bold', halign: 'center' },
                styles: { font: 'Montserrat', halign: 'center', fontSize: 9, cellPadding: 5 },
                columnStyles: { 4: { fontStyle: 'bold', textColor: assistRate > 80 ? [16, 185, 129] : colors.blue } },
                margin: { left: 15, right: 15 }
            });

            yPos = doc.lastAutoTable.finalY + 20;

            // --- ACTIVITY LOG ---
            const activityData = playerAttendance.sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 25).map(a => {
                const c = allConvocatorias.find(cv => cv.id == a.convocatoriaid);
                const status = a.players[playerId];
                const statusValue = (typeof status === 'object' ? status.status : status) || 'ASISTE';
                let finalStatus = statusValue.toUpperCase();
                if (finalStatus === 'ASISTE') finalStatus = 'PRESENTE';
                return [a.fecha, (a.nombre || c?.nombre || 'SESIÓN INDIVIDUAL').split(' ||| ')[0].toUpperCase(), (c?.tipo || 'SESIÓN').toUpperCase(), finalStatus];
            });

            if (activityData.length > 0) {
                doc.setTextColor(...colors.navy);
                doc.setFontSize(12);
                doc.setFont("Montserrat", "bold");
                doc.text("REGISTRO DETALLADO DE ACTIVIDAD", 15, yPos);
                yPos += 3;
                doc.setFillColor(...colors.blue);
                doc.rect(15, yPos, 15, 1.5, 'F');
                yPos += 8;
                doc.autoTable({
                    startY: yPos,
                    head: [['FECHA', 'ACTIVIDAD / EVENTO', 'TIPO', 'ESTADO']],
                    body: activityData,
                    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], halign: 'center', fontSize: 7 },
                    styles: { font: 'Montserrat', fontSize: 8, cellPadding: 3.5, halign: 'center', textColor: colors.text },
                    columnStyles: { 1: { halign: 'left', cellWidth: 80 }, 3: { fontStyle: 'bold' } },
                    margin: { left: 15, right: 15 },
                    didDrawCell: (data) => {
                        if (data.section === 'body' && data.column.index === 3) {
                            const val = data.cell.raw;
                            if (val === 'PRESENTE') doc.setTextColor(16, 185, 129);
                            else if (val === 'FALTA') doc.setTextColor(239, 68, 68);
                            else doc.setTextColor(colors.blue);
                        }
                    }
                });
                yPos = doc.lastAutoTable.finalY + 15;
            }

            if (torneos.length > 0) {
                if (yPos > 240) { doc.addPage(); yPos = 20; }
                doc.setTextColor(...colors.navy);
                doc.setFontSize(12);
                doc.setFont("Montserrat", "bold");
                doc.text("HISTORIAL DE COMPETICIÓN", 15, yPos);
                yPos += 8;
                const torneoData = torneos.slice(0, 10).map(t => [t.fecha, t.nombre.split(' ||| ')[0].toUpperCase(), (t.rendimiento && t.rendimiento[playerId]) ? `${t.rendimiento[playerId].score} / 10` : 'PENDIENTE']);
                doc.autoTable({
                    startY: yPos,
                    head: [['FECHA', 'TORNEO / PARTIDO', 'VALORACIÓN']],
                    body: torneoData,
                    headStyles: { fillColor: colors.blue, textColor: colors.white, halign: 'center' },
                    styles: { font: 'Montserrat', fontSize: 8, cellPadding: 4, halign: 'center' },
                    columnStyles: { 1: { halign: 'left' } },
                    margin: { left: 15, right: 15 }
                });
            }

            const fileName = `DOSSIER_${player.nombre.toUpperCase().replace(/ /g, '_')}`;
            if (mode === 'save') {
                doc.save(`${fileName}.pdf`);
            } else {
                const blob = doc.output('blob');
                const pdfUrl = URL.createObjectURL(blob);
                window.showPdfPreviewModal(pdfUrl, fileName, playerId);
            }
        } catch (err) {
            console.error("PDF Generation Error:", err);
            window.customAlert('Error de PDF', `Ocurrió un error al generar el documento: ${err.message}`, 'error');
            throw err;
        }
    };
    window.showExportDialog = async (playerId) => {
        const attendance = await db.getAll('asistencia');
        const convocatorias = await db.getAll('convocatorias');
        const allDates = [...attendance.map(a => a.fecha), ...convocatorias.map(c => c.fecha)].filter(Boolean);
        const availableSeasons = [...new Set(allDates.map(d => window.getSeason(d)))].sort().reverse();

        const dialogHtml = `
            <div class="p-10">
                <div class="flex items-center gap-4 mb-8">
                    <div class="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                        <i data-lucide="file-text" class="w-7 h-7"></i>
                    </div>
                    <div>
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Exportar Ficha</h3>
                        <p class="text-sm text-slate-400 font-bold uppercase tracking-widest">Selecciona el periodo del informe</p>
                    </div>
                </div>
                
                <div class="space-y-6">
                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Periodo / Temporada</label>
                        <select id="pdf-season-select" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-black text-slate-700 uppercase tracking-tight focus:ring-4 focus:ring-blue-50 transition-all appearance-none cursor-pointer">
                            <option value="ALL">HISTORIAL COMPLETO</option>
                            ${availableSeasons.map(s => `<option value="${s}" ${s === window.currentSeason ? 'selected' : ''}>TEMPORADA ${s}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="flex flex-col gap-3 mt-10">
                    <button id="preview-pdf-btn" onclick="window.confirmPDFExport('${playerId}', 'preview')" class="w-full py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-slate-900 transition-all flex items-center justify-center gap-2">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                        Previsualizar Ficha
                    </button>
                    <div class="flex gap-3">
                        <button onclick="window.closeCustomModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                        <button id="confirm-pdf-btn" onclick="window.confirmPDFExport('${playerId}', 'save')" class="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                            <i data-lucide="download" class="w-4 h-4"></i>
                            Exportar PDF
                        </button>
                    </div>
                </div>
            </div>
        `;

        window.customModal(dialogHtml);
        if (window.lucide) lucide.createIcons();
    };

    window.confirmPDFExport = (playerId, mode = 'save') => {
        const season = document.getElementById('pdf-season-select').value;

        if (mode === 'preview') {
            // Close selection dialog immediately to avoid z-index overlay conflicts
            window.closeCustomModal();
            // Start generation
            window.generatePlayerPDF(playerId, season, 'preview');
            return;
        }

        const btnId = 'confirm-pdf-btn';
        const btn = document.getElementById(btnId);
        if (!btn) return;

        const originalHtml = btn.innerHTML;
        btn.innerHTML = 'PREPARANDO DESCARGA...';
        btn.style.pointerEvents = 'none';

        window.generatePlayerPDF(playerId, season, 'save').then(() => {
            window.closeCustomModal();
        }).catch(err => {
            console.error(err);
            btn.innerHTML = originalHtml;
            btn.style.pointerEvents = 'auto';
            window.customAlert('Error', 'No se pudo generar el PDF. Revisa la consola.', 'error');
        });
    };

    window.showBulkPhotoUpload = async () => {
        const players = await db.getAll('jugadores');
        const withoutPhoto = players.filter(p => !p.foto || p.foto.includes('General'));

        modalContainer.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Carga Masiva de Fotos</h3>
                        <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Selecciona jugadores y elige una foto para todos ellos</p>
                    </div>
                    <button onclick="closeModal()" class="p-3 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-all"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>

                <div class="space-y-6">
                    <div class="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                        <label class="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">1. Elige la foto para aplicar</label>
                        <input type="file" id="bulk-photo-input" accept="image/*" class="w-full text-[10px] font-bold text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer">
                    </div>

                    <div class="space-y-2">
                        <div class="flex justify-between items-center px-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Selecciona Jugadores (${withoutPhoto.length})</label>
                            <button onclick="window.toggleAllBulk(this)" class="text-[9px] font-black text-blue-600 uppercase">Seleccionar Todos</button>
                        </div>
                        <div class="max-h-[400px] overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-50 custom-scrollbar">
                            ${withoutPhoto.map(p => `
                                <label class="flex items-center gap-4 p-4 hover:bg-slate-50 transition-all cursor-pointer group">
                                    <input type="checkbox" name="player-bulk" value="${p.id}" class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500">
                                    <div class="w-10 h-10 rounded-lg bg-slate-50 overflow-hidden border border-slate-100 flex items-center justify-center">
                                        ${p.foto ? `<img src="${p.foto}" class="w-full h-full object-cover">` : '<i data-lucide="user" class="w-4 h-4 text-slate-300"></i>'}
                                    </div>
                                    <div class="flex-1">
                                        <p class="text-[11px] font-black text-slate-800 uppercase tracking-tight">${p.nombre}</p>
                                        <p class="text-[9px] font-bold text-slate-400 uppercase">${p.equipoConvenido || 'Sin Club'}</p>
                                    </div>
                                </label>
                            `).join('') || '<p class="p-8 text-center text-slate-400 text-[10px] font-black uppercase italic tracking-widest">Todos los jugadores tienen foto</p>'}
                        </div>
                    </div>

                    <div class="pt-4">
                        <button onclick="window.applyBulkPhoto()" id="apply-bulk-btn" class="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-black transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                            <i data-lucide="check" class="w-4 h-4"></i>
                            Aplicar Foto a Seleccionados
                        </button>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
        modalOverlay.classList.add('active');
    };

    window.toggleAllBulk = (btn) => {
        const checks = document.querySelectorAll('input[name="player-bulk"]');
        const allChecked = Array.from(checks).every(c => c.checked);
        checks.forEach(c => c.checked = !allChecked);
        btn.innerText = !allChecked ? 'Desmarcar Todos' : 'Seleccionar Todos';
    };

    window.applyBulkPhoto = async () => {
        const fileInput = document.getElementById('bulk-photo-input');
        const selectedIds = Array.from(document.querySelectorAll('input[name="player-bulk"]:checked')).map(c => c.value);

        if (selectedIds.length === 0) return window.customAlert('Atención', 'Selecciona al menos un jugador.', 'warning');
        if (!fileInput.files || !fileInput.files[0]) return window.customAlert('Atención', 'Elige una foto para aplicar.', 'warning');

        const btn = document.getElementById('apply-bulk-btn');
        btn.disabled = true;
        btn.innerText = 'PROCESANDO...';

        try {
            const avatarUrl = await db.uploadImage(fileInput.files[0]);
            for (const id of selectedIds) {
                const p = await db.get('jugadores', id);
                if (p) {
                    p.foto = avatarUrl;
                    await db.update('jugadores', p);
                }
            }
            window.customAlert('¡Éxito!', `Se ha aplicado la foto a ${selectedIds.length} jugadores.`, 'success');
            closeModal();
            if (typeof window.renderJugadores === 'function') {
                window.renderJugadores(document.getElementById('content-container'));
            }
        } catch (err) {
            console.error(err);
            window.customAlert('Error', 'No se pudo subir la imagen.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerText = 'Aplicar Foto a Seleccionados';
        }
    };

    window.resetAllPlayerPhotos = async () => {
        if (!confirm('¿Estás SEGURO de que quieres borrar TODAS las fotos de los jugadores en la base de datos de Supabase y local? Esta acción no se puede deshacer.')) return;

        try {
            const players = await db.getAll('jugadores');
            let count = 0;

            // 1. Update Cloud in bulk if possible, or one by one to ensure sync logic
            for (const p of players) {
                p.foto = null;
                await db.update('jugadores', p);
                count++;
            }

            window.customAlert('¡Éxito!', `Se han borrado las fotos de ${count} jugadores correctamente.`, 'success');
            if (typeof window.renderJugadores === 'function') {
                window.renderJugadores(document.getElementById('content-container'));
            }
        } catch (err) {
            console.error("Error resetting photos:", err);
            window.customAlert('Error', 'No se pudieron borrar todas las fotos: ' + err.message, 'error');
        }
    };

    window.cleanDuplicatePlayers = async () => {
        const normalize = (str) => {
            return (str || '')
                .trim()
                .toUpperCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/\s+/g, ' ');
        };

        try {
            const database = window.db || (typeof db !== 'undefined' ? db : null);
            if (!database) throw new Error("Base de datos no inicializada");

            const players = await database.getAll('jugadores');
            const groups = {};
            players.forEach(p => {
                const name = normalize(p.nombre);
                if (!name) return;
                if (!groups[name]) groups[name] = [];
                groups[name].push(p);
            });

            const duplicates = Object.entries(groups).filter(([name, list]) => list.length > 1);

            if (duplicates.length === 0) {
                return window.customAlert('Sin Duplicados', 'No se han encontrado jugadores repetidos.', 'info');
            }

            const modalHtml = `
                <div class="space-y-6 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                    <div class="flex flex-col gap-4">
                        ${duplicates.map(([name, list], groupIdx) => `
                            <div class="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 space-y-4">
                                <div class="flex items-center justify-between px-2">
                                    <h4 class="text-[10px] font-black text-blue-600 uppercase tracking-widest">Grupo: ${name}</h4>
                                    <span class="px-2 py-1 bg-blue-100 text-blue-600 rounded-lg text-[9px] font-black">${list.length} FICHAS</span>
                                </div>
                                <div class="grid grid-cols-1 gap-3">
                                    ${list.map(p => {
                const completeness = Object.values(p).filter(v => v !== null && v !== '').length;
                return `
                                            <div class="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-all shadow-sm">
                                                <div class="flex items-center gap-4">
                                                    <div class="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100">
                                                        ${p.foto ? `<img src="${p.foto}" class="w-full h-full object-cover">` : `<i data-lucide="user" class="w-5 h-5 text-slate-300"></i>`}
                                                    </div>
                                                    <div>
                                                        <p class="text-xs font-bold text-slate-800">${p.nombre}</p>
                                                        <p class="text-[9px] text-slate-400 font-bold uppercase">${p.equipoConvenido || 'Sin Club'} • ${completeness} datos</p>
                                                    </div>
                                                </div>
                                                <div class="flex gap-2">
                                                    <button onclick="window.keepOneDeleteOthers('${p.id}', '${groupIdx}')" 
                                                        class="px-4 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-200/50">
                                                        MANTENER ESTA
                                                    </button>
                                                    <button onclick="window.deleteSingleDuplicate('${p.id}', this)" 
                                                        class="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                                                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        `;
            }).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            window.currentDuplicateGroups = duplicates;

            window.customModal(`
                <div class="space-y-6">
                    <div class="text-center space-y-2 mb-8">
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Gestor de Duplicados</h3>
                        <p class="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em]">Selecciona qué ficha deseas conservar de cada grupo</p>
                    </div>
                    ${modalHtml}
                </div>
            `);
            if (window.lucide) lucide.createIcons();

        } catch (err) {
            console.error("Duplicate manager error:", err);
            window.customAlert('Error', 'No se pudo abrir el gestor de duplicados.', 'error');
        }
    };

    window.keepOneDeleteOthers = async (keepId, groupIdx) => {
        const group = window.currentDuplicateGroups[groupIdx][1];
        const toDelete = group.filter(p => String(p.id) !== String(keepId)).map(p => p.id);

        if (!confirm(`¿Seguro que quieres borrar las otras ${toDelete.length} fichas y quedarte solo con esta?`)) return;

        try {
            const database = window.db || db;
            for (const id of toDelete) {
                await database.delete('jugadores', id);
            }
            window.customAlert('Hecho', 'Duplicados eliminados correctamente.', 'success');
            window.closeCustomModal();
            window.renderJugadores(document.getElementById('content-container'));
        } catch (err) {
            window.customAlert('Error', 'No se pudieron borrar los duplicados.', 'error');
        }
    };

    window.deleteSingleDuplicate = async (id, btn) => {
        if (!confirm('¿Borrar esta ficha específica?')) return;
        try {
            const database = window.db || db;
            await database.delete('jugadores', id);
            btn.closest('.group').remove();
            window.customAlert('Eliminado', 'Ficha borrada.', 'success');
        } catch (err) {
            window.customAlert('Error', 'No se pudo borrar.', 'error');
        }
    };
    window.handleConvocatoriaImport = (input) => {
        const file = input.files[0];
        if (!file) return;
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'pdf') {
            window.importConvocatoriaFromPDF(input);
        } else if (ext === 'csv') {
            window.importConvocatoriaFromCSV(input);
        }
    };

    window.importConvocatoriaFromCSV = async (input) => {
        const file = input.files[0];
        if (!file) return;

        const loadingAlert = document.createElement('div');
        loadingAlert.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center';
        loadingAlert.innerHTML = `
            <div class="bg-white p-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p class="font-bold text-slate-800 uppercase tracking-widest text-xs">Analizando CSV...</p>
            </div>
        `;
        document.body.appendChild(loadingAlert);

        try {
            const reader = new FileReader();
            reader.onload = async (re) => {
                const text = re.target.result;
                const lines = text.split('\n').filter(line => line.trim() !== '');
                if (lines.length < 2) {
                    loadingAlert.remove();
                    window.customAlert('Error', 'El CSV está vacío o no tiene el formato correcto.', 'error');
                    return;
                }

                const firstLine = lines[0];
                const delimiter = firstLine.includes(';') ? ';' : ',';
                const headers = firstLine.split(delimiter).map(h => h.trim().toUpperCase().replace(/^"|"$/g, ''));

                const allPlayers = await db.getAll('jugadores');
                const teams = window.getSortedTeams(await db.getAll('equipos'));

                const firstData = lines[1].split(new RegExp(`\\${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`)).map(c => c.trim().replace(/^"|"$/g, ''));
                const dataObj = {};
                headers.forEach((h, idx) => dataObj[h] = firstData[idx]);

                const nombre = (dataObj['NOMBRE'] || dataObj['TITLE'] || 'CONVOCATORIA').toUpperCase();
                const fecha = dataObj['FECHA'] || dataObj['DATE'] || new Date().toISOString().split('T')[0];
                const lugar = (dataObj['LUGAR'] || dataObj['PLACE'] || 'DESCONOCIDO').toUpperCase();

                const playersInPdf = [];

                for (let i = 1; i < lines.length; i++) {
                    const row = lines[i].split(new RegExp(`\\${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`)).map(c => c.trim().replace(/^"|"$/g, ''));
                    if (row.length < headers.length) continue;
                    const rowData = {};
                    headers.forEach((h, idx) => rowData[h] = row[idx]);

                    const pName = rowData['JUGADOR'] || rowData['PLAYER'] || rowData['NOMBRE'];
                    if (!pName) continue;

                    const dbPlayer = allPlayers.find(p => (p.nombre || '').toUpperCase() === pName.toUpperCase());
                    if (dbPlayer) {
                        playersInPdf.push({ name: pName, found: true, id: dbPlayer.id, dbName: dbPlayer.nombre });
                    } else {
                        playersInPdf.push({ name: pName, found: false });
                    }
                }

                loadingAlert.remove();
                window.showPdfImportReviewModal({ nombre, fecha, lugar, playersInPdf, teams });
            };
            reader.readAsText(file);
        } catch (err) {
            if (document.body.contains(loadingAlert)) loadingAlert.remove();
            window.customAlert('Error', err.message, 'error');
        }
    };

    window.importConvocatoriaFromPDF = async (input) => {
        const file = input.files[0];
        if (!file) return;

        // Visual Progress
        const loadingAlert = document.createElement('div');
        loadingAlert.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center';
        loadingAlert.innerHTML = `
            <div class="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in duration-300 max-w-sm w-full">
                <div class="relative">
                    <div class="w-20 h-20 border-4 border-slate-100 rounded-full"></div>
                    <div class="absolute inset-0 w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <div class="absolute inset-0 flex items-center justify-center">
                        <i data-lucide="file-text" class="w-8 h-8 text-blue-600"></i>
                    </div>
                </div>
                <div class="text-center">
                    <p class="font-black text-slate-800 uppercase tracking-widest text-xs">Analizando PDF</p>
                    <p id="pdf-progress-text" class="text-slate-400 text-[10px] font-bold uppercase mt-2 tracking-tighter">Extrayendo texto y jugadores...</p>
                </div>
            </div>
        `;
        document.body.appendChild(loadingAlert);
        if (window.lucide) lucide.createIcons();

        try {
            const arrayBuffer = await file.arrayBuffer();
            if (!window.pdfjsLib) {
                throw new Error("Librería PDF.js no cargada");
            }
            if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }

            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = "";
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(item => item.str).join(' ') + "\n";
                const pText = document.getElementById('pdf-progress-text');
                if (pText) pText.innerText = `Procesando página ${i} de ${pdf.numPages}...`;
            }

            const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);

            let nombre = "CONVOCATORIA";
            let fecha = new Date().toISOString().split('T')[0];
            let lugar = "DESCONOCIDO";

            const dateMatch = fullText.match(/(\d{2})[/-](\d{2})[/-](\d{2,4})/);
            if (dateMatch) {
                const [_, d, m, y] = dateMatch;
                const year = y.length === 2 ? `20${y}` : y;
                fecha = `${year}-${m}-${d}`;
            }

            if (lines.length > 3) lugar = lines[3].toUpperCase();

            const allPlayers = await db.getAll('jugadores');
            const teams = window.getSortedTeams(await db.getAll('equipos'));
            const playersInPdf = [];

            const playerLines = lines.filter(l => /^\d+\s+[A-ZÁÉÍÓÚÑ\s]+/.test(l));

            playerLines.forEach(line => {
                const match = line.match(/^\d+\s+([A-ZÁÉÍÓÚÑ\s]{5,})/);
                if (match) {
                    const extractedName = match[1].trim().replace(/\s+/g, ' ');

                    const dbPlayer = allPlayers.find(p => {
                        const pName = (p.nombre || '').toUpperCase();
                        return pName.includes(extractedName) || extractedName.includes(pName);
                    });

                    if (dbPlayer) {
                        playersInPdf.push({ name: extractedName, found: true, id: dbPlayer.id, dbName: dbPlayer.nombre });
                    } else {
                        playersInPdf.push({ name: extractedName, found: false });
                    }
                }
            });

            if (document.body.contains(loadingAlert)) document.body.removeChild(loadingAlert);
            window.showPdfImportReviewModal({ nombre, fecha, lugar, playersInPdf, teams });

        } catch (err) {
            if (document.body.contains(loadingAlert)) document.body.removeChild(loadingAlert);
            console.error("PDF Error:", err);
            window.customAlert('Error', 'No se pudo procesar el PDF: ' + err.message, 'error');
        }
    };

    window.showPdfImportReviewModal = (data) => {
        const found = data.playersInPdf.filter(p => p.found);
        const missing = data.playersInPdf.filter(p => !p.found);

        window.toggleImportExtraDates = (val) => {
            const el = document.getElementById('import-extra-dates');
            const f1 = document.getElementById('import-pdf-fecha').value;
            const f2 = document.getElementById('import-pdf-fecha2');
            const f3 = document.getElementById('import-pdf-fecha3');

            if (val === 'Ciclo') {
                el.classList.remove('hidden');
                if (f1) {
                    if (!f2.value) f2.value = f1;
                    if (!f3.value) f3.value = f1;
                }
            } else {
                el.classList.add('hidden');
            }
        };

        const dialogHtml = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Revisar Importación</h3>
                        <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">Detectado desde PDF/CSV</p>
                    </div>
                    <button onclick="window.closeCustomModal()" class="p-3 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-all"><i data-lucide="x" class="w-5 h-5"></i></button>
                </div>

                <div class="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    <div class="space-y-4">
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Título de la Convocatoria</label>
                            <input type="text" id="import-pdf-nombre" value="CONVOCATORIA ${data.lugar.toUpperCase()}" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50 uppercase">
                        </div>
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tipo de Convocatoria</label>
                            <select id="import-pdf-tipo" onchange="window.toggleImportExtraDates(this.value)" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50">
                                <option value="Sesión">SESIÓN</option>
                                <option value="Ciclo">CICLO</option>
                                <option value="Zubieta">ZUBIETA</option>
                            </select>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha Principal</label>
                                <input type="date" id="import-pdf-fecha" value="${data.fecha}" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50">
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Lugar / Título</label>
                                <input type="text" id="import-pdf-lugar" value="${data.lugar}" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50">
                            </div>
                        </div>
                        <div id="import-extra-dates" class="hidden grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha Sesión 2</label>
                                <input type="date" id="import-pdf-fecha2" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50">
                            </div>
                            <div class="space-y-2">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Fecha Sesión 3</label>
                                <input type="date" id="import-pdf-fecha3" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-4 ring-blue-50">
                            </div>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Asignar a Equipos / Plantillas</label>
                        <div class="p-4 bg-slate-50 border border-slate-100 rounded-3xl max-h-[180px] overflow-y-auto custom-scrollbar">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                                ${data.teams.map(t => `
                                    <label class="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 transition-all select-none">
                                        <input type="checkbox" name="import-team-check" value="${t.id}" class="w-4 h-4 rounded text-blue-600 focus:ring-blue-100">
                                        <span class="text-[10px] font-black text-slate-700 uppercase">${t.nombre.split(' ||| ')[0]}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <div class="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                        <div class="flex items-center justify-between mb-4">
                            <h4 class="text-[11px] font-black text-slate-800 uppercase tracking-widest">Jugadores Detectados (${data.playersInPdf.length})</h4>
                            <div class="flex gap-2">
                                <span class="px-2 py-1 bg-green-100 text-green-700 rounded text-[9px] font-bold">${found.length} OK</span>
                                <span class="px-2 py-1 bg-red-100 text-red-700 rounded text-[9px] font-bold">${missing.length} FALTAN</span>
                            </div>
                        </div>
                        
                        <div class="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            ${data.playersInPdf.map(p => `
                                <div class="flex items-center justify-between p-3 ${p.found ? 'bg-white' : 'bg-red-50/50'} rounded-xl border ${p.found ? 'border-slate-100' : 'border-red-100'}">
                                    <div class="flex flex-col">
                                        <span class="text-xs font-bold ${p.found ? 'text-slate-700' : 'text-red-600'}">${p.name}</span>
                                        ${p.found ? `<span class="text-[8px] text-slate-400 uppercase font-black">Vinculado a: ${p.dbName}</span>` : ''}
                                    </div>
                                    ${p.found ? `<i data-lucide="check-circle-2" class="w-4 h-4 text-green-500"></i>` : `<i data-lucide="alert-circle" class="w-4 h-4 text-red-400"></i>`}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="pt-8 border-t border-slate-100 flex justify-end gap-3 mt-8">
                    <button onclick="window.closeCustomModal()" class="px-8 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-[10px]">Cancelar</button>
                    <button id="btn-confirm-pdf-import" class="px-12 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all">Confirmar Importación</button>
                </div>
            </div>
        `;

        window.customModal(dialogHtml);
        if (window.lucide) lucide.createIcons();

        document.getElementById('btn-confirm-pdf-import').onclick = async () => {
            const teamChecks = document.querySelectorAll('input[name="import-team-check"]:checked');
            const selectedTeamIds = Array.from(teamChecks).map(c => c.value);

            if (selectedTeamIds.length === 0) {
                window.customAlert('Atención', 'Debes seleccionar al menos un equipo para la convocatoria', 'warning');
                return;
            }

            const finalNombre = document.getElementById('import-pdf-nombre').value;
            const finalFecha = document.getElementById('import-pdf-fecha').value;
            const finalLugar = document.getElementById('import-pdf-lugar').value;
            const finalTipo = document.getElementById('import-pdf-tipo').value;
            const finalFecha2 = document.getElementById('import-pdf-fecha2').value;
            const finalFecha3 = document.getElementById('import-pdf-fecha3').value;
            const playerIds = found.map(p => p.id.toString());

            try {
                let metadata = {};
                if (finalTipo === 'Ciclo') {
                    if (finalFecha2) metadata.s2 = { f: finalFecha2 };
                    if (finalFecha3) metadata.s3 = { f: finalFecha3 };
                }

                const currentUser = (await supabaseClient.auth.getUser()).data.user;

                // Guardar los IDs de todos los equipos en el metadata extra
                metadata.eids = selectedTeamIds.map(Number);
                const serializedLugar = window.serializeLugarMetadata(finalLugar, metadata);

                const convData = {
                    nombre: (finalNombre || `CONVOCATORIA ${finalLugar}`).toUpperCase(),
                    fecha: finalFecha,
                    lugar: serializedLugar,
                    tipo: finalTipo,
                    equipoid: selectedTeamIds[0] ? Number(selectedTeamIds[0]) : null,
                    playerids: playerIds,
                    createdBy: currentUser?.id,
                    sharedWith: []
                };

                await db.add('convocatorias', convData);
                window.customAlert('Éxito', `Convocatoria creada con ${playerIds.length} jugadores.`, 'success');
                window.closeCustomModal();

                // Cambiar al tab correspondiente para ver la nueva convocatoria
                if (typeof currentConvocatoriaTypeTab !== 'undefined') {
                    currentConvocatoriaTypeTab = finalTipo;
                }
                window.renderConvocatorias(document.getElementById('content-container'));
            } catch (err) {
                window.customAlert('Error', err.message, 'error');
            }
        };
    };

    initNotifications();
});
