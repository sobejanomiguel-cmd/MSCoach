window.customAlert = (title, message) => {
    const alertModal = document.createElement('div');
    alertModal.className = 'fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300';
    alertModal.innerHTML = `
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
        <div class="bg-white rounded-3xl p-8 max-w-sm w-full relative shadow-2xl scale-in-center">
            <div class="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <i data-lucide="info" class="w-8 h-8"></i>
            </div>
            <h4 class="text-xl font-bold text-slate-800 text-center mb-2">${title}</h4>
            <p class="text-slate-500 text-center text-sm mb-8 leading-relaxed">${message}</p>
            <button id="close-alert" class="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">Entendido</button>
        </div>
    `;
    document.body.appendChild(alertModal);
    if (window.lucide) lucide.createIcons();
    alertModal.querySelector('#close-alert').onclick = () => {
        alertModal.classList.add('fade-out');
        setTimeout(() => document.body.removeChild(alertModal), 300);
    };
};

window.customConfirm = (title, message, onConfirm) => {
    const confirmModal = document.createElement('div');
    confirmModal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300';
    confirmModal.innerHTML = `
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
        <div class="bg-white rounded-3xl p-8 max-w-sm w-full relative shadow-2xl scale-in-center">
            <div class="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <i data-lucide="alert-triangle" class="w-8 h-8"></i>
            </div>
            <h4 class="text-xl font-bold text-slate-800 text-center mb-2">${title}</h4>
            <p class="text-slate-500 text-center text-sm mb-8 leading-relaxed">${message}</p>
            <div class="flex gap-3">
                <button id="cancel-confirm" class="flex-1 py-3 bg-slate-50 text-slate-500 font-bold rounded-xl hover:bg-slate-100 transition-all">Cancelar</button>
                <button id="exec-confirm" class="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all">Confirmar</button>
            </div>
        </div>
    `;
    document.body.appendChild(confirmModal);
    if (window.lucide) lucide.createIcons();

    const close = () => {
        confirmModal.classList.add('fade-out');
        setTimeout(() => document.body.removeChild(confirmModal), 300);
    };

    confirmModal.querySelector('#cancel-confirm').onclick = close;
    confirmModal.querySelector('#exec-confirm').onclick = () => {
        onConfirm();
        close();
    };
};

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize DB
    await db.init().catch(err => {
        if(err !== 'blocked') window.customAlert('Error de base de datos', err);
    });

    // Auth Logic
    const authScreen = document.getElementById('auth-screen');
    const authForm = document.getElementById('auth-form');
    const authTitle = document.getElementById('auth-title');
    const authSubmit = document.getElementById('auth-submit');
    const toggleAuthBtn = document.getElementById('toggle-auth');
    const appEl = document.getElementById('app');
    let isLogin = true;

    const checkAuth = async () => {
        console.log("Checking authentication...");
        if (!supabaseClient) {
            console.warn("Supabase not initialized yet.");
            return;
        }

        try {
            const user = await db.getUser();
            if (user) {
                console.log("User authenticated:", user.email);
                await db.syncRole();
                authScreen.classList.add('hidden');
                appEl.classList.remove('hidden');
                switchView('dashboard');
                applyRoleRestrictions();
            } else {
                console.log("No active session.");
                authScreen.classList.remove('hidden');
                appEl.classList.add('hidden');
            }
        } catch (err) {
            console.error("Auth check failed:", err);
        }
    };

    const applyRoleRestrictions = () => {
        const isTecnico = db.userRole === 'TECNICO';
        const secondaryBtn = document.getElementById('secondary-add-btn');
        if (secondaryBtn) {
            secondaryBtn.style.display = isTecnico ? 'none' : 'flex';
        }
        document.body.classList.toggle('role-tecnico', isTecnico);
    };

    if (toggleAuthBtn) {
        toggleAuthBtn.onclick = () => {
            isLogin = !isLogin;
            console.log("Toggling Auth Mode. isLogin:", isLogin);
            authTitle.textContent = isLogin ? 'Acceso Entrenador' : 'Registro Nuevo';
            authSubmit.textContent = isLogin ? 'Entrar al Panel' : 'Crear Cuenta';
            toggleAuthBtn.textContent = isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Entra';
        };
    }


    authForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        authSubmit.disabled = true;
        authSubmit.textContent = 'Procesando...';

        try {
            console.log(`Starting ${isLogin ? 'Login' : 'Sign Up'} process for: ${email}`);
            if (isLogin) {
                await db.login(email, password);
            } else {
                console.log("Calling Supabase signUp...");
                const signUpResult = await db.signUp(email, password);
                console.log("Supabase Response:", signUpResult);
                
                window.customAlert('Registro exitoso', 'Cuenta creada. Por favor, verifica tu email (mira el SPAM) e inicia sesión.');
                isLogin = true;
                if (toggleAuthBtn) toggleAuthBtn.click();
            }
            console.log("Post-Auth check...");
            await checkAuth();
        } catch (err) {
            console.error("FATAL Auth Error:", err);
            window.customAlert('Fallo de Conexión', `Detalle: ${err.message || 'Error de red o base de datos no configurada'}`);
        } finally {
            console.log("Process finished.");
            authSubmit.disabled = false;
            authSubmit.textContent = isLogin ? 'Entrar al Panel' : 'Crear Cuenta';
        }


    };

    // Logout logic
    const logoutBtn = document.querySelector('button i[data-lucide="log-out"]')?.parentElement;
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            window.customConfirm('¿Cerrar Sesión?', 'Saldrás de tu panel de control.', async () => {
                await db.logout();
            });
        };
    }

    await checkAuth();
    
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


    // Sidebar Toggle Logic for Mobile
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
            sidebar.classList.toggle('active-mobile');
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth < 768 && !sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                sidebar.classList.add('-translate-x-full');
            }
        });
    }

    // Navigation logic
    const navLinksMobile = document.querySelectorAll('.nav-link-mobile');
    
    const handleNavClick = (view) => {
        switchView(view);
        if (window.innerWidth < 768) {
            sidebar.classList.add('-translate-x-full');
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
    let currentView = 'dashboard';
    let attendanceData = {};
    const DB_VERSION = 7;

    const viewMeta = {
        'dashboard': { title: 'MS Coach', subtitle: 'Resumen general de tu actividad.', addButtonEnabled: false },
        'calendario': { title: 'Calendario Maestro', subtitle: 'Planificación de sesiones y tareas diarias.', addButtonEnabled: false },
        'eventos': { title: 'Agenda y Tareas', subtitle: 'Listado de tareas de gestión y recordatorios.', addButtonLabel: 'Nueva Tarea', addButtonEnabled: true },
        'tareas': { title: 'Directorio de Tareas', subtitle: 'Biblioteca de ejercicios de entrenamiento.', addButtonLabel: 'Nueva Tarea', addButtonEnabled: true, secondaryButtonEnabled: true, secondaryButtonLabel: 'Importar CSV' },
        'sesiones': { title: 'Sesiones de Entrenamiento', subtitle: 'Planificación y calendario.', addButtonLabel: 'Nueva Sesión', addButtonEnabled: true },
        'equipos': { title: 'Gestión de Equipos', subtitle: 'Plantillas y datos de jugadores.', addButtonLabel: 'Nuevo Equipo', addButtonEnabled: true },
        'jugadores': { title: 'Directorio de Jugadores', subtitle: 'Base de datos global de futbolistas.', addButtonLabel: 'Nuevo Jugador', addButtonEnabled: true, secondaryButtonEnabled: true, secondaryButtonLabel: 'Importar CSV' },
        'asistencia': { title: 'Control de Asistencia', subtitle: 'Histórico de asistencia por día y equipo.', addButtonLabel: 'Pasar Asistencia', addButtonEnabled: true }
    };

    window.switchView = async (viewId) => {
        currentView = viewId;
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

        // Sync mobile title
        const viewTitleMobile = document.getElementById('view-title-mobile');
        if (viewTitleMobile) {
            viewTitleMobile.textContent = meta.title.replace('Directorio de ', '').replace('Gestión de ', '');
        }

        // Button logic
        const secondaryAddBtn = document.getElementById('secondary-add-btn');
        if (meta.addButtonEnabled) {
            addBtn.classList.remove('hidden');
            const btnText = addBtn.querySelector('.btn-text');
            if (btnText) btnText.textContent = meta.addButtonLabel;
            if (addBtnMobile) addBtnMobile.classList.remove('hidden');
        } else {
            addBtn.classList.add('hidden');
            if (addBtnMobile) addBtnMobile.classList.add('hidden');
        }

        if (meta.secondaryButtonEnabled) {
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
                            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                            
                            const startIndex = headers.indexOf('TAREA');
                            if (startIndex === -1) {
                                window.customAlert('CSV Inválido', 'No se ha encontrado la columna "TAREA". Asegúrate de que el formato sea el correcto.', 'error');
                                return;
                            }

                            const existingTasks = await db.getAll('tareas');
                            const existingNames = new Set(existingTasks.map(t => t.name.toLowerCase()));
                            
                            let importedCount = 0;
                            let skippedCount = 0;

                            for (let i = 1; i < lines.length; i++) {
                                // Simple CSV line parser (handles some quotes)
                                const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
                                if (row.length < headers.length) continue;

                                const taskData = {};
                                headers.forEach((h, idx) => {
                                    taskData[h] = row[idx];
                                });

                                const name = taskData['TAREA'];
                                if (!name || existingNames.has(name.toLowerCase())) {
                                    skippedCount++;
                                    continue;
                                }

                                const newTask = {
                                    name: name,
                                    category: taskData['TIPO DE TAREA'] || 'Ataque',
                                    description: taskData['DESCRIPCIÓN'] || '',
                                    variantes: taskData['VARIANTES'] || '',
                                    objetivo: taskData['OBJETIVO'] || '',
                                    espacio: taskData['ESPACIO'] || '',
                                    duration: parseInt(taskData['TIEMPO TOTAL']) || 15,
                                    material: taskData['MATERIAL'] || '',
                                    video: taskData['VIDEO_DRIVE'] || '',
                                    rangoCategorias: taskData['CATEGORIA'] || '',
                                    series: taskData['SERIES'] || '',
                                    tiempoSeries: taskData['TIEMPO SERIES'] || ''
                                };

                                await db.add('tareas', newTask);
                                existingNames.add(name.toLowerCase());
                                importedCount++;
                            }

                            window.customAlert('Importación Completada', 
                                `Se han importado ${importedCount} tareas nuevas. ` + 
                                (skippedCount > 0 ? `${skippedCount} tareas saltadas por estar ya registradas.` : ''), 
                                'success');
                            renderView('tareas');
                        };
                        reader.readAsText(file);
                    };
                    fileInput.click();
                };
            }

            // CSV Import Logic for Jugadores
            if (viewId === 'jugadores') {
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

                            const headers = lines[0].split(',').map(h => h.trim().toUpperCase());
                            const teams = await db.getAll('equipos');

                            let importedCount = 0;
                            for (let i = 1; i < lines.length; i++) {
                                const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
                                if (row.length < headers.length) continue;

                                const data = {};
                                headers.forEach((h, idx) => data[h] = row[idx]);

                                // Find team ID by name
                                const teamName = data['EQUIPO'];
                                const team = teams.find(t => t.nombre.toLowerCase() === (teamName || '').toLowerCase());

                                const newPlayer = {
                                    nombre: data['NOMBRE'],
                                    equipoId: team ? team.id : '',
                                    dorsal: data['DORSAL'] || '',
                                    posicion: data['POSICION'] || 'PO',
                                    equipoConvenido: data['EQUIPO CONVENIDO'] || '',
                                    anioNacimiento: data['AÑO NACIMIENTO'] || '',
                                    fechaNacimiento: data['FECHA NACIMIENTO'] || ''
                                };

                                if (newPlayer.nombre) {
                                    await db.add('jugadores', newPlayer);
                                    importedCount++;
                                }
                            }

                            window.customAlert('Importación Completada', `Se han importado ${importedCount} jugadores correctamente.`, 'success');
                            renderView('jugadores');
                        };
                        reader.readAsText(file);
                    };
                    fileInput.click();
                };
            }
        } else {
            secondaryAddBtn.classList.add('hidden');
        }

        currentView = viewId;
        contentContainer.innerHTML = '';
        await renderView(viewId);
        lucide.createIcons();
    }

    window.renderView = async (viewId) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'view animate-in fade-in duration-500';
        
        switch(viewId) {
            case 'dashboard': await renderDashboard(wrapper); break;
            case 'calendario': await renderCalendario(wrapper); break;
            case 'eventos': await renderEventos(wrapper); break;
            case 'tareas': await renderTareas(wrapper); break;
            case 'sesiones': await renderSesiones(wrapper); break;
            case 'equipos': await renderEquipos(wrapper); break;
            case 'jugadores': await renderJugadores(wrapper); break;
            case 'asistencia': await renderAsistencia(wrapper); break;
        }
        
        contentContainer.innerHTML = ''; // Ensure container is empty before appending new view
        contentContainer.appendChild(wrapper);
    }

    // View Renderers
    async function renderDashboard(container) {
        const tasks = await db.getAll('tareas');
        const sessions = await db.getAll('sesiones');
        const teams = await db.getAll('equipos');
        const players = await db.getAll('jugadores');

        // Logic for task distribution chart
        const categories = {};
        tasks.forEach(t => {
            categories[t.category] = (categories[t.category] || 0) + 1;
        });
        const totalTasks = tasks.length || 1;

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="stat-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><i data-lucide="clipboard-list"></i></div>
                    </div>
                    <h3 class="text-slate-500 text-sm font-medium">Tareas totales</h3>
                    <p class="text-3xl font-bold text-slate-800">${tasks.length}</p>
                </div>
                <div class="stat-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><i data-lucide="calendar"></i></div>
                    </div>
                    <h3 class="text-slate-500 text-sm font-medium">Sesiones</h3>
                    <p class="text-3xl font-bold text-slate-800">${sessions.length}</p>
                </div>
                <div class="stat-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><i data-lucide="users"></i></div>
                    </div>
                    <h3 class="text-slate-500 text-sm font-medium">Equipos</h3>
                    <p class="text-3xl font-bold text-slate-800">${teams.length}</p>
                </div>
                <div class="stat-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><i data-lucide="user-check"></i></div>
                    </div>
                    <h3 class="text-slate-500 text-sm font-medium">Jugadores</h3>
                    <p class="text-3xl font-bold text-slate-800">${players.length}</p>
                </div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 class="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <i data-lucide="trending-up" class="w-5 h-5 text-blue-600"></i>
                        Rendimiento Asistencia por Equipo
                    </h3>
                    <div class="space-y-6">
                        ${teams.map(e => `
                            <div>
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-xs font-bold text-slate-600 uppercase tracking-wider">${e.nombre}</span>
                                    <span class="text-xs font-black text-blue-600">${e.asistenciaMedia}%</span>
                                </div>
                                <div class="attendance-bar-bg">
                                    <div class="attendance-bar-fill" style="width: ${e.asistenciaMedia}%"></div>
                                </div>
                            </div>
                        `).join('')}
                        ${teams.length === 0 ? '<p class="text-xs text-slate-400 italic text-center">No hay datos de asistencia disponibles.</p>' : ''}
                    </div>
                </div>

                <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 class="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <i data-lucide="pie-chart" class="w-5 h-5 text-indigo-600"></i>
                        Estructura de Contenidos (Tareas)
                    </h3>
                    <div class="grid grid-cols-1 gap-4">
                        ${Object.entries(categories).map(([cat, count]) => {
                            const pct = Math.round((count / totalTasks) * 100);
                            return `
                                <div class="flex items-center gap-4">
                                    <div class="w-24 text-[10px] font-black text-slate-400 uppercase truncate">${cat}</div>
                                    <div class="flex-1 h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                        <div class="h-full bg-indigo-500 rounded-full transition-all duration-700" style="width: ${pct}%"></div>
                                    </div>
                                    <div class="w-10 text-xs font-bold text-indigo-600 text-right">${pct}%</div>
                                </div>
                            `;
                        }).join('')}
                        ${Object.keys(categories).length === 0 ? '<p class="text-xs text-slate-400 italic text-center p-4">Carga tareas para ver su distribución.</p>' : ''}
                    </div>
                </div>
            </div>

            <div class="bg-white p-6 rounded-2xl border border-slate-100">
                <h3 class="font-bold text-slate-800 mb-4">Próxima sesión planificada</h3>
                ${sessions.length > 0 ? `
                    <div class="p-6 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-500/20 relative overflow-hidden group">
                         <div class="relative z-10">
                             <h4 class="font-bold text-xl mb-1">${sessions[0].titulo}</h4>
                             <p class="text-blue-100 text-sm flex items-center gap-2">
                                <i data-lucide="calendar" class="w-4 h-4"></i> ${sessions[0].fecha} 
                                <span class="opacity-30">|</span> 
                                <i data-lucide="users" class="w-4 h-4"></i> ${sessions[0].equipoNombre || 'Equipo'}
                             </p>
                         </div>
                         <i data-lucide="zap" class="absolute right-[-20px] bottom-[-20px] w-32 h-32 text-white/10 -rotate-12 group-hover:rotate-0 transition-transform duration-700"></i>
                    </div>
                ` : '<div class="p-10 text-center text-slate-400 border border-dashed rounded-3xl">No hay sesiones próximas en el calendario.</div>'}
            </div>
        `;
    }

    let currentCalendarDate = new Date();
    let selectedCalendarDate = new Date();

    async function renderCalendario(container) {
        try {
            const sessions = await db.getAll('sesiones');
            let eventos = [];
            try { eventos = await db.getAll('eventos'); } catch(e) { console.warn('Store eventos no listo'); }
            
            const year = currentCalendarDate.getFullYear();
            const month = currentCalendarDate.getMonth();
            
            const monthName = new Intl.DateTimeFormat('es', { month: 'long' }).format(currentCalendarDate);
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            let startingDay = firstDay === 0 ? 6 : firstDay - 1;

            const selDateStr = `${selectedCalendarDate.getFullYear()}-${String(selectedCalendarDate.getMonth() + 1).padStart(2, '0')}-${String(selectedCalendarDate.getDate()).padStart(2, '0')}`;
            const selectedDaySessions = sessions.filter(s => s.fecha === selDateStr);
            const selectedDayEvents = eventos.filter(e => e.fecha === selDateStr);
            const combinedItems = [
                ...selectedDaySessions.map(s => ({ ...s, type: 'sesion' })),
                ...selectedDayEvents.map(e => ({ ...e, type: 'evento' }))
            ].sort((a,b) => (a.hora || '00:00').localeCompare(b.hora || '00:00'));

            container.innerHTML = `
                <div class="flex flex-col lg:flex-row gap-8 min-h-[600px]">
                    <!-- Left: Calendar Grid -->
                    <div class="flex-1 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                        <div class="p-6 border-b flex justify-between items-center bg-white">
                            <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">${monthName} <span class="text-blue-600">${year}</span></h3>
                            <div class="flex gap-2 bg-slate-100 p-1 rounded-xl">
                                <button id="prev-month" class="p-2 hover:bg-white rounded-lg transition-all shadow-sm"><i data-lucide="chevron-left" class="w-5 h-5"></i></button>
                                <button id="next-month" class="p-2 hover:bg-white rounded-lg transition-all shadow-sm"><i data-lucide="chevron-right" class="w-5 h-5"></i></button>
                            </div>
                        </div>
                        <div class="grid grid-cols-7 border-b bg-slate-50 text-center">
                            ${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => `<div class="py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">${d}</div>`).join('')}
                        </div>
                        <div class="grid grid-cols-7 flex-1 auto-rows-fr">
                            ${Array(startingDay).fill('').map(() => `<div class="border-r border-b border-slate-50 bg-slate-50/20"></div>`).join('')}
                            ${Array(daysInMonth).fill('').map((_, i) => {
                                const day = i + 1;
                                const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const isSelected = selectedCalendarDate.toDateString() === new Date(year, month, day).toDateString();
                                const hasSessions = sessions.some(s => s.fecha === dStr);
                                const hasEvents = eventos.some(e => e.fecha === dStr);
                                const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                                
                                return `
                                    <div onclick="window.selectDate(${year}, ${month}, ${day})" class="border-r border-b border-slate-50 p-2 min-h-[90px] cursor-pointer transition-all flex flex-col items-center justify-center relative ${isSelected ? 'bg-blue-600' : 'hover:bg-blue-50'}">
                                        <span class="text-sm font-bold ${isSelected ? 'text-white' : isToday ? 'text-blue-600' : 'text-slate-600'}">${day}</span>
                                        <div class="flex gap-1 mt-1">
                                            ${hasSessions ? `<div class="w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}"></div>` : ''}
                                            ${hasEvents ? `<div class="w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-500'}"></div>` : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Right Sidebar -->
                    <div class="w-full lg:w-96">
                        <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm sticky top-8">
                            <div class="mb-6">
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Agenda para el día</p>
                                <h4 class="text-xl font-black text-slate-800">${selectedCalendarDate.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
                            </div>
                            <div class="space-y-3">
                                ${combinedItems.length > 0 ? combinedItems.map(item => {
                                    const isSession = item.type === 'sesion';
                                    return `
                                        <div onclick="${isSession ? `window.viewSession(${item.id})` : `window.viewEvento(${item.id})`}" class="p-4 rounded-2xl border ${isSession ? 'bg-blue-50/30 border-blue-100' : 'bg-amber-50/30 border-amber-100'} hover:bg-white transition-all cursor-pointer group">
                                            <div class="flex justify-between items-center mb-1">
                                                <span class="text-[10px] font-black text-slate-400 uppercase">${item.hora}</span>
                                                <i data-lucide="${isSession ? 'calendar' : 'alarm-clock'}" class="w-3 h-3 text-slate-300"></i>
                                            </div>
                                            <p class="font-bold text-slate-800 text-sm leading-tight">${item.titulo || item.nombre}</p>
                                        </div>
                                    `;
                                }).join('') : `<div class="py-12 text-center text-slate-300 italic text-sm">Sin eventos planeados</div>`}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            container.querySelector('#prev-month').onclick = () => {
                currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
                renderCalendario(container);
            };
            container.querySelector('#next-month').onclick = () => {
                currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
                renderCalendario(container);
            };
            window.selectDate = (y, m, d) => {
                selectedCalendarDate = new Date(y, m, d);
                renderCalendario(container);
            };
            lucide.createIcons();
        } catch (err) {
            console.error(err);
            container.innerHTML = `<div class="p-10 bg-red-50 text-red-600 rounded-2xl">Error cargando calendario: ${err.message}</div>`;
        }
    }

    window.toggleTaskStatus = async (id) => {
        const events = await db.getAll('eventos');
        const task = events.find(e => e.id == id);
        if (task) {
            task.completada = !task.completada;
            await db.update('eventos', task);
            renderView(currentView);
        }
    };

    async function renderEventos(container) {
        const events = await db.getAll('eventos');
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${events.map(e => `
                    <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-blue-100 transition-all group relative overflow-hidden">
                        <div class="flex items-start gap-4">
                            <input type="checkbox" ${e.completada ? 'checked' : ''} onclick="window.toggleTaskStatus(${e.id})" class="mt-1 w-6 h-6 rounded-xl border-2 border-slate-200 text-blue-600 focus:ring-blue-500 cursor-pointer">
                            <div class="flex-1 ${e.completada ? 'opacity-40 grayscale' : ''}">
                                <div class="flex justify-between items-start mb-2">
                                    <span class="px-2 py-1 bg-slate-50 text-slate-400 rounded text-[10px] font-black uppercase tracking-widest">${e.hora}</span>
                                    <span class="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">${e.categoria}</span>
                                </div>
                                <h4 class="font-bold text-slate-800 text-lg leading-tight mb-2 ${e.completada ? 'line-through' : ''}">${e.nombre}</h4>
                                <p class="text-xs text-slate-500 mb-4">${e.fecha} ${e.lugar ? `• ${e.lugar}` : ''}</p>
                            </div>
                        </div>
                        <div class="mt-4 pt-4 border-t border-slate-50 flex justify-end gap-2">
                            <button onclick="window.viewEvento(${e.id})" class="p-2 text-slate-400 hover:text-blue-600 transition-all"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                            <button onclick="window.deleteEvento(${e.id})" class="p-2 text-slate-400 hover:text-red-500 transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </div>
                    </div>
                `).join('') || '<div class="col-span-full py-20 text-center text-slate-400 italic">No hay tareas pendientes en la agenda.</div>'}
            </div>
        `;
    }

    window.viewEvento = async (id) => {
        const events = await db.getAll('eventos');
        const evento = events.find(e => e.id == id);
        
        modalContainer.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-slate-800">Editar Evento</h3>
                    <button onclick="closeModal()" class="p-2 bg-slate-100 rounded-full text-slate-400"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>
                <form id="edit-evento-form" class="space-y-4">
                    <input type="hidden" name="id" value="${evento.id}">
                    <div class="grid grid-cols-2 gap-4">
                         <div class="col-span-2">
                             <input name="nombre" value="${evento.nombre}" class="w-full p-3 border rounded-xl font-bold text-lg" required>
                         </div>
                         <select name="categoria" class="w-full p-3 border rounded-xl bg-white focus:ring-2 ring-amber-100 outline-none">
                             <option ${evento.categoria === 'Reunión' ? 'selected' : ''}>Reunión</option>
                             <option ${evento.categoria === 'Partido' ? 'selected' : ''}>Partido</option>
                             <option ${evento.categoria === 'Scouting' ? 'selected' : ''}>Scouting</option>
                             <option ${evento.categoria === 'Fisioterapia' ? 'selected' : ''}>Fisioterapia</option>
                             <option ${evento.categoria === 'Otro' ? 'selected' : ''}>Otro</option>
                         </select>
                         <input name="hora" type="time" value="${evento.hora}" class="w-full p-3 border rounded-xl" required>
                         <input name="fecha" type="date" value="${evento.fecha}" class="w-full p-3 border rounded-xl" required>
                         <input name="lugar" value="${evento.lugar || ''}" placeholder="Lugar" class="w-full p-3 border rounded-xl">
                         <textarea name="notas" class="col-span-2 w-full p-3 border rounded-xl h-24" placeholder="Notas...">${evento.notas || ''}</textarea>
                    </div>
                    <button type="submit" class="w-full py-4 bg-amber-600 text-white font-bold rounded-2xl shadow-lg mt-4">Guardar Evento</button>
                </form>
            </div>
        `;
        modalOverlay.classList.add('active');
        lucide.createIcons();
        
        document.getElementById('edit-evento-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target).entries());
            data.id = parseInt(data.id);
            await db.update('eventos', data);
            closeModal();
            renderView('eventos');
        });
    };

    window.deleteEvento = async (id) => {
        window.customConfirm('¿Eliminar Evento?', 'Se borrará este evento de tu agenda.', async () => {
            await db.delete('eventos', Number(id));
            renderView('eventos');
        });
    };

    async function renderTareas(container) {
        const tasks = await db.getAll('tareas');
        container.innerHTML = `
            <div class="task-grid">
                ${tasks.map(t => `
                    <div onclick="window.viewTask(${t.id})" class="task-card flex flex-col h-full cursor-pointer group">
                        <div class="h-44 bg-slate-100 overflow-hidden flex items-center justify-center border-b border-slate-100 relative">
                            ${t.image ? `<img src="${t.image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">` : `<i data-lucide="image" class="text-slate-300 w-12 h-12"></i>`}
                            <div class="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors flex items-center justify-center">
                                <i data-lucide="edit-2" class="text-white w-8 h-8 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all"></i>
                            </div>
                        </div>
                        <div class="p-5 flex-1 flex flex-col">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">${t.category}</span>
                                <span class="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">${t.duration} min</span>
                            </div>
                            <h4 class="font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">${t.name}</h4>
                            <p class="text-xs text-slate-500 line-clamp-2 flex-1">${t.description}</p>
                            <div class="mt-4 pt-4 border-t border-slate-50 flex justify-end">
                                <button onclick="event.stopPropagation(); window.deleteTask(${t.id})" class="p-2 text-slate-300 hover:text-red-500 transition-all">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    window.viewTask = async (id) => {
        const tasks = await db.getAll('tareas');
        const task = tasks.find(t => t.id == id);
        
        modalContainer.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-slate-800">Editar Tarea</h3>
                    <button onclick="closeModal()" class="p-2 bg-slate-100 rounded-full text-slate-400 group hover:bg-red-50 hover:text-red-500 transition-all"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>
                <form id="edit-task-form" class="space-y-4">
                    <input type="hidden" name="id" value="${task.id}">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="col-span-2">
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nombre de la Tarea</label>
                            <input name="name" value="${task.name}" class="w-full p-3 border rounded-xl outline-none focus:ring-2 ring-blue-100" required>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Categoría</label>
                            <select name="category" class="w-full p-3 border rounded-xl bg-white outline-none">
                                <option ${task.category === 'Ataque' ? 'selected' : ''}>Ataque</option>
                                <option ${task.category === 'Defensa' ? 'selected' : ''}>Defensa</option>
                                <option ${task.category === 'Transición' ? 'selected' : ''}>Transición</option>
                                <option ${task.category === 'Físico' ? 'selected' : ''}>Físico</option>
                                <option ${task.category === 'Porteros' ? 'selected' : ''}>Porteros</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Duración (min)</label>
                            <input name="duration" type="number" value="${task.duration}" class="w-full p-3 border rounded-xl outline-none" required>
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
                        <div class="col-span-2">
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Descripción Técnica</label>
                            <textarea name="description" class="w-full p-3 border rounded-xl h-24 outline-none focus:ring-2 ring-blue-100">${task.description}</textarea>
                        </div>
                    </div>
                    <div class="flex gap-4 mt-6">
                        <button type="button" onclick="window.deleteTask(${task.id})" class="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all"><i data-lucide="trash-2"></i></button>
                        <button type="submit" class="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        `;
        
        modalOverlay.classList.add('active');
        lucide.createIcons();
        
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

        document.getElementById('edit-task-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.id = parseInt(data.id);
            
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
            renderView('tareas');
        });
    };

    window.deleteTask = async (id) => {
        window.customConfirm(
            '¿Eliminar Tarea?',
            'Esta acción borrará permanentemente el ejercicio de tu biblioteca técnica.',
            async () => {
                await db.delete('tareas', Number(id));
                closeModal();
                renderView('tareas');
            }
        );
    };

    async function renderSesiones(container) {
        const sessions = await db.getAll('sesiones');
        container.innerHTML = `
            <div class="space-y-4">
                ${sessions.map(s => `
                    <div onclick="window.viewSession(${s.id})" class="bg-white p-6 rounded-2xl border border-slate-100 flex items-center gap-6 group hover:border-blue-200 cursor-pointer transition-all">
                        <div class="w-16 h-16 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border text-slate-700 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all">
                            <span class="text-[10px] uppercase font-bold text-slate-400 group-hover:text-blue-100">${new Date(s.fecha).toLocaleString('es', { month: 'short' })}</span>
                            <span class="text-2xl font-black">${new Date(s.fecha).getDate()}</span>
                        </div>
                        <div class="flex-1">
                            <span class="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase">${s.equipoNombre}</span>
                            <h4 class="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">${s.titulo || 'Sesión de entrenamiento'}</h4>
                            <p class="text-sm text-slate-500">${s.hora} - ${s.lugar || 'Campo principal'}</p>
                        </div>
                        <div class="flex gap-2">
                             <button onclick="event.stopPropagation(); window.printSession(${s.id})" class="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Imprimir PDF">
                                <i data-lucide="printer" class="w-5 h-5"></i>
                            </button>
                        </div>
                    </div>
                `).join('') || '<div class="py-20 text-center text-slate-400">No hay sesiones creadas.</div>'}
            </div>
        `;
    }

    window.viewSession = async (id) => {
        const sessions = await db.getAll('sesiones');
        const session = sessions.find(s => s.id == id);
        const teams = await db.getAll('equipos');
        const tasks = await db.getAll('tareas');
        const players = await db.getAll('jugadores');
        
        modalContainer.innerHTML = `
            <div class="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-slate-800">Editar Planificación</h3>
                    <button onclick="closeModal()" class="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-all"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>
                
                <form id="edit-session-form" class="space-y-6">
                    <input type="hidden" name="id" value="${session.id}">
                    <div class="grid grid-cols-2 gap-6">
                        <div class="col-span-2">
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Objetivo de la Sesión</label>
                            <input name="titulo" value="${session.titulo || ''}" class="w-full p-3 border rounded-xl outline-none focus:ring-2 ring-blue-100" required>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Equipo</label>
                            <select name="equipoId" id="edit-session-team-select" class="w-full p-3 border rounded-xl bg-white">
                                ${teams.map(t => `<option value="${t.id}" ${session.equipoId == t.id ? 'selected' : ''}>${t.nombre}</option>`).join('')}
                            </select>
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
                    </div>
                    
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-4">Tareas Vinculadas (Máx. 5)</label>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-100">
                            ${tasks.map(t => `
                                <label class="flex items-center gap-3 p-3 bg-white border ${session.taskIds && session.taskIds.includes(t.id.toString()) ? 'border-blue-400' : 'border-slate-100'} rounded-xl cursor-pointer hover:border-blue-300 transition-colors">
                                    <input type="checkbox" name="taskIds" value="${t.id}" ${session.taskIds && session.taskIds.includes(t.id.toString()) ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600">
                                    <div class="flex-1">
                                        <p class="text-xs font-bold text-slate-800">${t.name}</p>
                                        <p class="text-[10px] text-slate-400 uppercase">${t.category}</p>
                                    </div>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-4">Convocatoria de Jugadores</label>
                        <div id="edit-session-players-list" class="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-100">
                            <!-- Players will be loaded here -->
                        </div>
                    </div>

                    <div class="flex gap-4">
                        <button type="button" onclick="window.deleteSession(${session.id})" class="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"><i data-lucide="trash-2"></i></button>
                        <button type="submit" class="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        `;
        
        const teamSelect = document.getElementById('edit-session-team-select');
        const playersList = document.getElementById('edit-session-players-list');
        
        const updatePlayers = () => {
            const teamId = teamSelect.value;
            const teamPlayers = players.filter(p => p.equipoId == teamId);
            playersList.innerHTML = teamPlayers.map(p => `
                <label class="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-xl cursor-pointer hover:border-blue-200">
                    <input type="checkbox" name="playerIds" value="${p.id}" ${session.playerIds && session.playerIds.includes(p.id.toString()) ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600">
                    <span class="text-[10px] font-bold text-slate-700 truncate">${p.nombre}</span>
                </label>
            `).join('');
        };
        
        teamSelect.addEventListener('change', updatePlayers);
        updatePlayers();
        
        modalOverlay.classList.add('active');
        lucide.createIcons();
        
        document.getElementById('edit-session-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.id = parseInt(data.id);
            data.taskIds = formData.getAll('taskIds');
            data.playerIds = formData.getAll('playerIds');
            
            const team = teams.find(t => t.id == data.equipoId);
            data.equipoNombre = team ? team.nombre : 'Equipo';
            
            await db.update('sesiones', data);
            closeModal();
            renderView('sesiones');
        });
    };

    window.deleteSession = async (id) => {
        window.customConfirm(
            '¿Eliminar sesión?',
            'Se borrará toda la planificación de este entrenamiento del calendario.',
            async () => {
                await db.delete('sesiones', Number(id));
                closeModal();
                renderView('sesiones');
            }
        );
    };

    window.printSession = async (id) => {
        const sessions = await db.getAll('sesiones');
        const session = sessions.find(s => s.id == id);
        if (!session) return;
        
        const allTasks = await db.getAll('tareas');
        const allPlayers = await db.getAll('jugadores');
        const teams = await db.getAll('equipos');
        const currentTeam = teams.find(t => t.id == session.equipoId);

        const sessionTasks = allTasks.filter(t => session.taskIds && session.taskIds.includes(t.id.toString()));
        const sessionPlayers = allPlayers.filter(p => session.playerIds && session.playerIds.includes(p.id.toString()));
        
        const printDiv = document.createElement('div');
        printDiv.className = 'print-view bg-white p-12 fixed inset-0 z-[200] overflow-y-auto';
        printDiv.innerHTML = `
            <style>
                @media print {
                    body * { visibility: hidden; }
                    .print-view, .print-view * { visibility: visible; }
                    .print-view { position: absolute; left: 0; top: 0; width: 100%; height: auto; display: block !important; }
                }
            </style>
            <div class="max-w-[900px] mx-auto">
                <header class="flex justify-between items-center border-b-8 border-blue-600 pb-8 mb-10">
                    <div class="flex items-center gap-6">
                        <img src="RS.png" class="w-24 h-24 object-contain">
                        ${currentTeam && currentTeam.escudo ? `<div class="w-px h-16 bg-slate-200"></div><img src="${currentTeam.escudo}" class="w-24 h-24 object-contain">` : ''}
                    </div>
                    <div class="text-right">
                        <h1 class="text-4xl font-black text-blue-900 uppercase leading-none">MS Coach</h1>
                        <p class="text-blue-600 font-bold text-lg mt-1 tracking-widest uppercase">Plan de Entrenamiento</p>
                    </div>
                </header>

                <div class="grid grid-cols-4 gap-4 mb-10">
                    <div class="bg-slate-50 p-4 rounded-2xl">
                        <p class="text-[10px] font-black text-slate-400 uppercase mb-1">Sesión</p>
                        <p class="text-sm font-bold text-slate-800">${session.nombre || session.titulo}</p>
                    </div>
                    <div class="bg-slate-50 p-4 rounded-2xl">
                        <p class="text-[10px] font-black text-slate-400 uppercase mb-1">Fecha / Hora</p>
                        <p class="text-sm font-bold text-slate-800">${session.fecha} | ${session.hora}</p>
                    </div>
                    <div class="bg-slate-50 p-4 rounded-2xl">
                        <p class="text-[10px] font-black text-slate-400 uppercase mb-1">Equipo</p>
                        <p class="text-sm font-bold text-slate-800">${session.equipoNombre}</p>
                    </div>
                    <div class="bg-slate-50 p-4 rounded-2xl border-l-4 border-blue-500">
                        <p class="text-[10px] font-black text-slate-400 uppercase mb-1">Convocatoria</p>
                        <p class="text-sm font-bold text-slate-800">${sessionPlayers.length} Jugadores</p>
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-8 mb-12">
                    <div class="col-span-2">
                        <h3 class="text-xs font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                            <i data-lucide="target" class="w-4 h-4"></i> Objetivos Técnicos
                        </h3>
                        <p class="text-slate-700 font-medium bg-slate-50 p-6 rounded-3xl border border-slate-100">${session.objetivos || 'Pendiente de definir...'}</p>
                    </div>
                    <div>
                        <h3 class="text-xs font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                            <i data-lucide="package" class="w-4 h-4"></i> Material
                        </h3>
                        <p class="text-slate-700 font-medium bg-slate-50 p-6 rounded-3xl border border-slate-100">${session.material || 'Estándar'}</p>
                    </div>
                </div>

                <div class="space-y-8">
                    <h3 class="text-sm font-black text-slate-800 uppercase border-b-2 border-slate-100 pb-2 mb-6">Bloques de Entrenamiento</h3>
                    ${sessionTasks.map((t, idx) => {
                        const meta = session.tasksMeta ? session.tasksMeta[t.id] : { time: t.duration, groups: 'General' };
                        return `
                        <div class="flex gap-8 items-start breakout-page">
                            <div class="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black shrink-0 shadow-lg shadow-blue-500/20">${idx + 1}</div>
                            <div class="flex-1">
                                <div class="flex justify-between items-center mb-4">
                                    <h4 class="text-lg font-bold text-slate-800 uppercase">${t.name}</h4>
                                    <div class="flex gap-3">
                                        <span class="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">${t.category}</span>
                                        <span class="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">${meta.time || t.duration} MIN</span>
                                    </div>
                                </div>
                                <div class="grid grid-cols-1 gap-6">
                                    ${t.imagen ? `<img src="${t.imagen}" class="w-full rounded-2xl border border-slate-200">` : ''}
                                    <div class="bg-white p-6 rounded-2xl border-2 border-dashed border-slate-100 space-y-4">
                                        <div class="flex justify-between items-center gap-6">
                                            <div class="flex-1">
                                                <p class="text-[9px] font-black text-slate-400 uppercase mb-1">Descripción Técnica</p>
                                                <p class="text-xs text-slate-600 leading-relaxed font-medium">${t.description}</p>
                                            </div>
                                            <div class="w-1/3 bg-blue-50 rounded-xl p-4 border border-blue-100 text-center">
                                                <p class="text-[9px] font-black text-blue-400 uppercase mb-1">Espacio</p>
                                                <p class="text-xs font-black text-blue-700 uppercase">${meta.space || 'General'}</p>
                                            </div>
                                        </div>
                                        ${meta.playerGroups && Object.keys(meta.playerGroups).length > 0 ? `
                                            <div class="pt-4 border-t border-slate-50">
                                                <p class="text-[9px] font-black text-slate-400 uppercase mb-2">Grupos de Trabajo</p>
                                                <div class="flex flex-wrap gap-2">
                                                    ${Object.entries(meta.playerGroups).map(([pid, g]) => {
                                                        const p = allPlayers.find(pl => pl.id == pid);
                                                        const colorClass = g === 'Azul' ? 'bg-blue-600 text-white' : g === 'Rojo' ? 'bg-red-600 text-white' : 'bg-yellow-400 text-slate-900';
                                                        return `<span class="${colorClass} px-2 py-1 rounded-lg text-[10px] font-black uppercase shadow-sm"> ${p ? p.nombre : 'Jugador'}</span>`;
                                                    }).join('')}
                                                </div>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;}).join('<hr class="my-10 border-slate-100">')}
                </div>

                <footer class="mt-20 pt-8 border-t border-slate-100 text-center">
                    <p class="text-[10px] font-bold text-slate-300 uppercase tracking-widest">MS Coach Professional Tool • www.mscoach.com</p>
                </footer>
            </div>
        `;
        
        document.body.appendChild(printDiv);
        lucide.createIcons();
        
        setTimeout(() => {
            window.print();
            document.body.removeChild(printDiv);
        }, 500);
    };

    async function renderEquipos(container) {
        const teams = await db.getAll('equipos');
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${teams.map(e => `
                    <div onclick="window.viewTeam(${e.id})" class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group cursor-pointer hover:border-blue-200 transition-all">
                        <div class="flex items-center gap-4 mb-6">
                            ${e.escudo ? `<img src="${e.escudo}" class="w-14 h-14 object-contain rounded-xl">` : `<div class="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">${e.nombre.substring(0,2).toUpperCase()}</div>`}
                            <div>
                                <h4 class="font-bold text-slate-800">${e.nombre}</h4>
                                <p class="text-xs text-slate-500">${e.anioNacimiento || 'Año no def.'}</p>
                            </div>
                        </div>
                        <div class="space-y-4 mb-6">
                            <div class="flex justify-between items-end">
                                <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Asistencia Media</span>
                                <span class="text-sm font-black text-blue-600">${e.asistenciaMedia || 0}%</span>
                            </div>
                            <div class="attendance-bar-bg"><div class="attendance-bar-fill" style="width: ${e.asistenciaMedia || 0}%"></div></div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="bg-slate-50 p-3 rounded-xl"><p class="text-[10px] font-bold text-slate-400 uppercase">Plantilla</p><p class="text-lg font-bold">${e.jugadoresCount || 0}</p></div>
                        </div>
                        <div class="flex gap-2 mt-6">
                            <button onclick="event.stopPropagation(); window.viewTeamPlayers(${e.id})" class="flex-1 py-3 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-blue-200 transition-all">
                                Ver Plantilla
                            </button>
                            <button onclick="event.stopPropagation(); window.deleteTeam(${e.id})" class="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-red-500 hover:bg-red-50 transition-all">
                                <i data-lucide="trash-2" class="w-5 h-5"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    window.deleteTeam = async (id) => {
        window.customConfirm(
            '¿Eliminar Equipo?',
            'Se borrarán los datos del equipo. Los jugadores asociados dejarán de estar asignados.',
            async () => {
                await db.delete('equipos', Number(id));
                renderView('equipos');
            }
        );
    };

    window.viewTeam = async (id) => {
        const team = await db.get('equipos', id);
        const players = await db.getAll('jugadores');
        
        modalContainer.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-slate-800">Editar Equipo</h3>
                    <button onclick="closeModal()" class="p-2 bg-slate-100 rounded-full text-slate-400"><i data-lucide="x"></i></button>
                </div>
                <form id="edit-team-form" class="space-y-6">
                    <input type="hidden" name="id" value="${team.id}">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="col-span-2">
                             <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nombre del equipo</label>
                             <input name="nombre" value="${team.nombre}" class="w-full p-3 border rounded-xl" required>
                        </div>
                        <div class="col-span-2">
                             <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Año de Nacimiento (Categoría)</label>
                             <select id="edit-team-year-input" name="anioNacimiento" class="w-full p-3 border rounded-xl bg-white" required>
                                <option value="">Seleccionar año...</option>
                                ${[2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018].map(y => `<option value="${y}" ${team.anioNacimiento == y ? 'selected' : ''}>${y}</option>`).join('')}
                             </select>
                        </div>
                        <div class="col-span-2">
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Escudo del Equipo</label>
                            <div class="flex items-center gap-4 p-4 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50">
                                <div id="edit-crest-preview">
                                    ${team.escudo ? `<img src="${team.escudo}" class="h-16 w-16 object-contain">` : `<i data-lucide="shield" class="w-10 h-10 text-slate-300"></i>`}
                                </div>
                                <input type="file" id="edit-team-crest-input" accept="image/*" class="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700">
                            </div>
                        </div>
                        <div class="col-span-2">
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-4">Vincular Jugadores (Filtrados por Año)</label>
                            <div id="edit-linked-players-list" class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <!-- Filered players will load here -->
                            </div>
                        </div>
                    </div>
                    <button type="submit" class="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg mt-4">Guardar Cambios</button>
                </form>
            </div>
        `;
        
        const yearInput = document.getElementById('edit-team-year-input');
        const listDiv = document.getElementById('edit-linked-players-list');
        
        const updatePlayerLinkage = () => {
            const year = yearInput.value;
            const filtered = players.filter(p => !year || p.anioNacimiento == year);
            listDiv.innerHTML = filtered.map(p => `
                <label class="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-xl cursor-pointer hover:border-blue-200">
                    <input type="checkbox" name="linkedPlayerIds" value="${p.id}" ${p.equipoId == team.id ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600">
                    <span class="text-[10px] font-bold text-slate-700 truncate">${p.nombre}</span>
                </label>
            `).join('') || `<p class="col-span-full p-4 text-center text-xs text-slate-400 italic">No hay jugadores nacidos en ${year || 'este año'}.</p>`;
        };

        yearInput.addEventListener('change', updatePlayerLinkage);
        updatePlayerLinkage();
        
        modalOverlay.classList.add('active');
        lucide.createIcons();

        document.getElementById('edit-team-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.id = parseInt(data.id);
            
            const imgInput = document.getElementById('edit-team-crest-input');
            if (imgInput.files[0]) {
                data.escudo = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = (re) => resolve(re.target.result);
                    reader.readAsDataURL(imgInput.files[0]);
                });
            } else {
                data.escudo = team.escudo;
            }

            const linkedPlayerIds = formData.getAll('linkedPlayerIds');
            
            // Update individual players to point to this team (or remove if unchecked)
            for (const p of players) {
                const isLinked = linkedPlayerIds.includes(p.id.toString());
                if (isLinked && p.equipoId != data.id) {
                    p.equipoId = data.id.toString();
                    await db.update('jugadores', p);
                } else if (!isLinked && p.equipoId == data.id) {
                    p.equipoId = '';
                    await db.update('jugadores', p);
                }
            }

            // Recalculate players count
            data.jugadoresCount = linkedPlayerIds.length;
            
            await db.update('equipos', data);
            closeModal();
            renderView('equipos');
        });
    };

    window.viewTeamPlayers = async (teamId) => {
        const teams = await db.getAll('equipos');
        const team = teams.find(t => t.id == teamId);
        const players = (await db.getAll('jugadores')).filter(p => p.equipoId == teamId);
        
        modalContainer.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h3 class="text-2xl font-bold text-slate-800">${team.nombre}</h3>
                        <p class="text-slate-500">${team.anioNacimiento || 'Año no def.'}</p>
                    </div>
                    <button onclick="closeModal()" class="p-2 bg-slate-100 rounded-full text-slate-400"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>
                <div class="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    ${players.map(p => `
                        <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-white border border-transparent hover:border-blue-100 transition-all group">
                            <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-black text-blue-600 shadow-sm border border-slate-100">${p.dorsal || '--'}</div>
                            <div class="flex-1">
                                <h4 class="font-bold text-slate-800">${p.nombre}</h4>
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">${p.posicion || 'Sin posición'}</p>
                            </div>
                            <div class="text-right">
                                <span class="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">EN FORMA</span>
                            </div>
                        </div>
                    `).join('') || '<p class="text-center py-10 text-slate-400 italic">No hay jugadores en este equipo.</p>'}
                </div>
                <button onclick="window.addPlayerToTeam(${teamId})" class="w-full mt-6 py-4 bg-blue-50 text-blue-600 font-bold rounded-2xl hover:bg-blue-100 transition-all flex items-center justify-center gap-2">
                    <i data-lucide="plus-circle" class="w-5 h-5"></i>
                    Añadir Jugador
                </button>
            </div>
        `;
        modalOverlay.classList.add('active');
        lucide.createIcons();
    };

    window.addPlayerToTeam = (teamId) => {
        modalContainer.innerHTML = `
            <div class="p-8">
                <h3 class="text-2xl font-bold mb-6 text-slate-800">Nuevo Jugador</h3>
                <form id="new-player-form" class="space-y-4">
                    <input type="hidden" name="equipoId" value="${teamId}">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="col-span-2"><input name="nombre" placeholder="Nombre completo" class="w-full p-3 border rounded-xl" required></div>
                        <input name="dorsal" type="number" placeholder="Dorsal" class="w-full p-3 border rounded-xl">
                        <select name="posicion" class="w-full p-3 border rounded-xl">
                            <option>Portero</option><option>Defensa</option><option>Mediocentro</option><option>Extremo</option><option>Delantero</option>
                        </select>
                        <textarea name="notas" placeholder="Notas adicionales..." class="col-span-2 w-full p-3 border rounded-xl h-24"></textarea>
                    </div>
                    <button type="submit" class="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg mt-4">Guardar Jugador</button>
                </form>
            </div>
        `;
        document.getElementById('new-player-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target).entries());
            await db.add('jugadores', data);
            window.viewTeamPlayers(teamId);
        });
        lucide.createIcons();
    };

    async function renderJugadores(container) {
        const players = await db.getAll('jugadores');
        const teams = await db.getAll('equipos');
        
        container.innerHTML = `
            <div class="flex justify-between items-center mb-8">
                <div class="flex gap-4">
                    <div class="relative">
                        <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input type="text" placeholder="Buscar por nombre..." class="pl-10 pr-4 py-2 border rounded-xl text-sm w-64 bg-white">
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <table class="w-full">
                    <thead>
                        <tr class="bg-slate-50 text-left border-b border-slate-100">
                            <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Nombre</th>
                            <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Equipo</th>
                            <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Posición</th>
                            <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase text-center">Dorsal</th>
                            <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${players.map(p => {
                            const team = teams.find(t => t.id == p.equipoId);
                            return `
                                <tr onclick="window.viewPlayer(${p.id})" class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer group">
                                    <td class="px-6 py-4 flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs group-hover:bg-blue-600 group-hover:text-white transition-all">${p.nombre.substring(0,1)}</div>
                                        <span class="text-sm font-bold text-slate-800">${p.nombre}</span>
                                    </td>
                                    <td class="px-6 py-4">
                                        <span class="text-xs font-bold text-slate-500">${team ? team.nombre : 'Sin equipo'}</span>
                                    </td>
                                    <td class="px-6 py-4">
                                        <span class="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-600 uppercase">${p.posicion || '--'}</span>
                                    </td>
                                    <td class="px-6 py-4 text-center">
                                         <span class="text-sm font-black text-slate-400">${p.dorsal || '--'}</span>
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <div class="flex justify-end gap-1">
                                            <button class="p-2 text-slate-300 group-hover:text-blue-600 transition-colors"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                                            <button onclick="event.stopPropagation(); window.deletePlayer(${p.id})" class="p-2 text-slate-300 hover:text-red-500 transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('') || '<tr><td colspan="5" class="p-20 text-center text-slate-400 italic">No hay jugadores registrados en la base de datos global.</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    }

    window.viewPlayer = async (id) => {
        const players = await db.getAll('jugadores');
        const teams = await db.getAll('equipos');
        const player = players.find(p => p.id == id);
        
        modalContainer.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-8">
                    <div class="flex items-center gap-4">
                        <div class="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-500/20">${player.nombre.substring(0,1)}</div>
                        <div>
                            <h3 class="text-2xl font-bold text-slate-800">Ficha del Jugador</h3>
                            <p class="text-slate-400 text-sm">ID #${player.id}</p>
                        </div>
                    </div>
                    <button onclick="closeModal()" class="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-all"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>
                
                <form id="edit-player-form" class="space-y-6">
                    <input type="hidden" name="id" value="${player.id}">
                    <div class="grid grid-cols-2 gap-6">
                        <div class="col-span-2">
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nombre Completo</label>
                            <input name="nombre" value="${player.nombre}" class="w-full p-4 border rounded-2xl text-lg font-bold outline-none focus:ring-2 ring-blue-100" required>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">EQUIPO RS</label>
                            <select name="equipoId" class="w-full p-3 border rounded-xl bg-white outline-none">
                                <option value="">Sin equipo</option>
                                ${teams.map(t => `<option value="${t.id}" ${player.equipoId == t.id ? 'selected' : ''}>${t.nombre}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Dorsal</label>
                            <input name="dorsal" type="number" value="${player.dorsal || ''}" class="w-full p-3 border rounded-xl outline-none" placeholder="nº">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Posición</label>
                            <select name="posicion" class="w-full p-3 border rounded-xl bg-white outline-none">
                                <option ${player.posicion === 'Portero' ? 'selected' : ''}>Portero</option>
                                <option ${player.posicion === 'Defensa' ? 'selected' : ''}>Defensa</option>
                                <option ${player.posicion === 'Mediocentro' ? 'selected' : ''}>Mediocentro</option>
                                <option ${player.posicion === 'Extremo' ? 'selected' : ''}>Extremo</option>
                                <option ${player.posicion === 'Delantero' ? 'selected' : ''}>Delantero</option>
                            </select>
                        </div>
                        <div class="col-span-2">
                             <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Notas Técnicas / Scout</label>
                             <textarea name="notas" class="w-full p-4 border rounded-2xl h-32 outline-none focus:ring-2 ring-blue-100" placeholder="Añade comentarios sobre su rendimiento...">${player.notas || ''}</textarea>
                        </div>
                    </div>
                    
                    <div class="flex gap-4">
                        <button type="button" onclick="window.deletePlayer(${player.id})" class="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"><i data-lucide="trash-2"></i></button>
                        <button type="submit" class="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">Actualizar Jugador</button>
                    </div>
                </form>
            </div>
        `;
        
        modalOverlay.classList.add('active');
        lucide.createIcons();
        
        document.getElementById('edit-player-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target).entries());
            data.id = parseInt(data.id);
            await db.update('jugadores', data);
            closeModal();
            renderView('jugadores');
        });
    };

    window.deletePlayer = async (id) => {
        window.customConfirm(
            '¿Eliminar Jugador?',
            'Se borrarán todos los datos y notas técnicas de este futbolista del sistema.',
            async () => {
                await db.delete('jugadores', Number(id));
                closeModal();
                renderView('jugadores');
            }
        );
    };


    async function renderAsistencia(container) {
        const reports = await db.getAll('asistencia');
        const teams = await db.getAll('equipos');
        
        container.innerHTML = `
            <div class="space-y-4">
                ${reports.sort((a,b) => b.date.localeCompare(a.date)).map(r => {
                    const team = teams.find(t => t.id == r.teamId);
                    const presentes = Object.values(r.data).filter(s => s === 'presente').length;
                    const total = Object.keys(r.data).length;
                    
                    return `
                        <div onclick="window.viewAsistenciaReport(${r.id})" class="bg-white p-6 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-blue-200 cursor-pointer transition-all">
                            <div class="flex items-center gap-6">
                                <div class="w-12 h-12 bg-slate-50 rounded-xl flex flex-col items-center justify-center border text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    <span class="text-lg font-black">${r.date.split('-')[2]}</span>
                                </div>
                                <div>
                                    <p class="text-[10px] font-bold text-blue-600 uppercase mb-1">${team ? team.nombre : 'Equipo desconocido'}</p>
                                    <h4 class="font-bold text-slate-800">${new Date(r.date).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}</h4>
                                </div>
                            </div>
                            <div class="flex items-center gap-8">
                                <div class="text-right">
                                    <p class="text-xs font-bold text-slate-400 uppercase">Asistencia</p>
                                    <p class="text-lg font-black text-slate-800">${presentes}/${total}</p>
                                </div>
                                <i data-lucide="chevron-right" class="w-5 h-5 text-slate-300 group-hover:text-blue-600"></i>
                            </div>
                        </div>
                    `;
                }).join('') || `<div class="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                    <i data-lucide="check-square" class="w-12 h-12 text-slate-200 mx-auto mb-4"></i>
                    <p class="text-slate-400">No hay informes de asistencia registrados.</p>
                </div>`}
            </div>
        `;
    }

    window.newAsistenciaReport = async () => {
        const wrapper = document.createElement('div');
        wrapper.className = 'view animate-in slide-in-from-right duration-300';
        await renderAsistenciaForm(wrapper);
        contentContainer.innerHTML = '';
        contentContainer.appendChild(wrapper);
        lucide.createIcons();
    };

    window.viewAsistenciaReport = async (id) => {
        const reports = await db.getAll('asistencia');
        const report = reports.find(r => r.id == id);
        const wrapper = document.createElement('div');
        wrapper.className = 'view animate-in slide-in-from-right duration-300';
        await renderAsistenciaForm(wrapper, report);
        contentContainer.innerHTML = '';
        contentContainer.appendChild(wrapper);
        lucide.createIcons();
    };

    async function renderAsistenciaForm(container, existingReport = null) {
        const teams = await db.getAll('equipos');
        const players = await db.getAll('jugadores');
        let selectedTeamId = existingReport ? existingReport.teamId : (teams.length > 0 ? teams[0].id : null);
        let selectedDate = existingReport ? existingReport.date : new Date().toISOString().split('T')[0];
        
        attendanceData = existingReport ? existingReport.data : {};

        const updateBoard = () => {
            const teamPlayers = players.filter(j => j.equipoId == selectedTeamId);
            const list = document.getElementById('asistencia-list');
            if (list) {
                list.innerHTML = teamPlayers.map(j => {
                    const status = attendanceData[j.id] || 'presente';
                    const colors = { 'presente': 'bg-green-500', 'ausente': 'bg-red-500', 'tarde': 'bg-amber-500', 'lesion': 'bg-indigo-500' };
                    return `
                        <tr class="border-b border-slate-50">
                            <td class="px-6 py-4 font-bold text-slate-400">${j.dorsal || '--'}</td>
                            <td class="px-6 py-4 font-bold text-slate-800">${j.nombre}</td>
                            <td class="px-6 py-4 text-right">
                                <div class="flex justify-end gap-1">
                                    ${['presente', 'ausente', 'tarde', 'lesion'].map(s => `
                                        <button onclick="window.setPlayerStatus(${j.id}, '${s}')" class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${status === s ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}">
                                            ${s}
                                        </button>
                                    `).join('')}
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        };

        window.setPlayerStatus = (pId, s) => { attendanceData[pId] = s; updateBoard(); };

        container.innerHTML = `
            <div class="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                <div class="p-8 border-b bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div class="flex items-center gap-4">
                        <button onclick="window.switchView('asistencia')" class="p-2 bg-white rounded-xl shadow-sm hover:bg-red-50 hover:text-red-500 transition-all"><i data-lucide="arrow-left"></i></button>
                        <h3 class="text-xl font-bold text-slate-800">${existingReport ? 'Editar Informe' : 'Nuevo Informe'}</h3>
                    </div>
                    <div class="flex gap-3">
                        <select id="team-sel" class="p-3 border rounded-2xl bg-white font-bold text-sm" ${existingReport ? 'disabled' : ''}>
                            ${teams.map(t => `<option value="${t.id}" ${selectedTeamId == t.id ? 'selected' : ''}>${t.nombre}</option>`).join('')}
                        </select>
                        <input id="date-sel" type="date" value="${selectedDate}" class="p-3 border rounded-2xl bg-white font-bold text-sm">
                        <button id="save-report" class="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-500/20 hover:scale-105 transition-all">Guardar Informe</button>
                    </div>
                </div>
                <table class="w-full">
                    <thead class="bg-slate-50 border-b border-slate-100">
                        <tr><th class="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase">Dorsal</th><th class="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase">Jugador</th><th class="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase">Asistencia</th></tr>
                    </thead>
                    <tbody id="asistencia-list"></tbody>
                </table>
            </div>
        `;

        setTimeout(() => {
            container.querySelector('#save-report').onclick = async () => {
                const report = { id: existingReport ? existingReport.id : undefined, teamId: selectedTeamId, date: selectedDate, data: attendanceData };
                if (existingReport) await db.update('asistencia', report);
                else await db.add('asistencia', report);
                window.switchView('asistencia');
            };
            container.querySelector('#team-sel').onchange = (e) => { selectedTeamId = e.target.value; updateBoard(); };
            container.querySelector('#date-sel').onchange = (e) => { selectedDate = e.target.value; };
            updateBoard();
            lucide.createIcons();
        }, 0);
    }

    // Modal Handling
    addBtn.addEventListener('click', async () => {
        if (currentView === 'asistencia') {
            window.newAsistenciaReport();
            return;
        }

        let modalHtml = '';
        if (currentView === 'tareas') {
            modalHtml = `
                <div class="p-8 max-w-2xl w-full mx-auto overflow-y-auto max-h-[80vh]">
                    <h3 class="text-2xl font-black mb-6 text-slate-800">Nueva Tarea de Entrenamiento</h3>
                    <form id="modal-form" class="space-y-6">
                        <div class="grid grid-cols-2 gap-4">
                            <div class="col-span-2">
                                <label class="block text-xs font-black text-slate-400 uppercase mb-2">Nombre de la Tarea</label>
                                <input name="name" placeholder="Ej: Rondo 4x4 + 3" class="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all outline-none" required>
                            </div>
                            <div>
                                <label class="block text-xs font-black text-slate-400 uppercase mb-2">Tipo / Categoría</label>
                                <select name="category" class="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white transition-all outline-none">
                                    <option>Ataque</option>
                                    <option>Defensa</option>
                                    <option>Transición</option>
                                    <option>Estrategia / ABP</option>
                                    <option>Físico</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-black text-slate-400 uppercase mb-2">Tiempo Total (min)</label>
                                <input name="duration" type="number" value="15" class="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white transition-all outline-none" required>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-black text-slate-400 uppercase mb-2">Objetivo</label>
                                <input name="objetivo" placeholder="Ej: Velocidad" class="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white transition-all outline-none">
                            </div>
                            <div>
                                <label class="block text-xs font-black text-slate-400 uppercase mb-2">Espacio</label>
                                <input name="espacio" placeholder="Ej: 30x20m" class="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white transition-all outline-none">
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-black text-slate-400 uppercase mb-2">Descripción del Ejercicio</label>
                            <textarea name="description" rows="3" placeholder="Explica el funcionamiento de la tarea..." class="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white transition-all outline-none"></textarea>
                        </div>

                        <div>
                            <label class="block text-xs font-black text-slate-400 uppercase mb-2">Variantes (Opcional)</label>
                            <textarea name="variantes" rows="2" placeholder="Posibles variaciones..." class="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white transition-all outline-none"></textarea>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-black text-slate-400 uppercase mb-2">Material</label>
                                <input name="material" placeholder="Ej: Conos, Balones..." class="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white transition-all outline-none">
                            </div>
                            <div>
                                <label class="block text-xs font-black text-slate-400 uppercase mb-2">ID Video (Drive/Youtube)</label>
                                <input name="video" placeholder="ID del video" class="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white transition-all outline-none">
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="col-span-2">
                                <label class="block text-xs font-black text-slate-400 uppercase mb-2">Cargar Gráfico (Imagen)</label>
                                <input type="file" id="task-image-input" accept="image/*" class="w-full text-xs text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition-all">
                            </div>
                        </div>

                        <button type="submit" class="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all uppercase tracking-widest">Crear Tarea</button>
                    </form>
                </div>
            `;
            
            // Add image preview logic
            setTimeout(() => {
                const input = document.getElementById('task-image-input');
                const preview = document.getElementById('image-preview-container');
                input.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (re) => {
                            preview.innerHTML = `<img src="${re.target.result}" class="h-28 rounded-xl object-contain">`;
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }, 0);
        } else if (currentView === 'sesiones') {
            Promise.all([db.getAll('equipos'), db.getAll('tareas'), db.getAll('jugadores')]).then(([teams, tasks, players]) => {
                modalContainer.innerHTML = `
                    <div class="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <h3 class="text-2xl font-bold mb-6 text-slate-800">Planificar Nueva Sesión</h3>
                        <form id="modal-form" class="space-y-6">
                            <div class="grid grid-cols-2 gap-6">
                                <div class="col-span-2">
                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Objetivo de la Sesión</label>
                                    <input name="titulo" placeholder="Ej: Transiciones ofensivas rápidas" class="w-full p-3 border rounded-xl outline-none focus:ring-2 ring-blue-100" required>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Equipo</label>
                                    <select name="equipoId" id="session-team-select" class="w-full p-3 border rounded-xl bg-white">
                                        ${teams.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="grid grid-cols-2 gap-2">
                                    <div>
                                        <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Fecha</label>
                                        <input name="fecha" type="date" class="w-full p-3 border rounded-xl" required>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Hora</label>
                                        <input name="hora" type="time" class="w-full p-3 border rounded-xl" required>
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <div class="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                    ${tasks.map(t => `
                                        <div class="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4 hover:border-blue-200 transition-all">
                                            <label class="flex items-center gap-4 cursor-pointer">
                                                <input type="checkbox" name="taskIds" value="${t.id}" onchange="document.getElementById('task-meta-${t.id}').classList.toggle('hidden', !this.checked)" class="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500">
                                                <div class="flex-1">
                                                    <p class="text-sm font-bold text-slate-800">${t.name}</p>
                                                    <p class="text-[10px] text-slate-400 font-black uppercase tracking-widest">${t.category}</p>
                                                </div>
                                            </label>
                                            <div id="task-meta-${t.id}" class="hidden space-y-4 pt-4 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">
                                                <div class="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Tiempo de trabajo</label>
                                                        <div class="flex items-center gap-2">
                                                            <input name="taskTime_${t.id}" type="number" value="${t.duration}" class="w-full p-2 text-xs border border-slate-200 rounded-xl bg-slate-50 font-bold focus:bg-white transition-all">
                                                            <span class="text-[9px] font-black text-slate-400">MIN</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Espacio de trabajo</label>
                                                        <input name="taskSpace_${t.id}" type="text" placeholder="Ej: Medio campo" class="w-full p-2 text-xs border border-slate-200 rounded-xl bg-slate-50 font-bold focus:bg-white transition-all">
                                                    </div>
                                                </div>
                                                <div>
                                                    <label class="block text-[9px] font-black text-slate-400 uppercase mb-2">Asignación de Grupos (Jugadores)</label>
                                                    <div class="task-players-assignment-${t.id} grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100">
                                                        <p class="text-[9px] text-slate-400 italic col-span-full">Selecciona un equipo para asignar grupos</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-4">Jugadores Disponibles</label>
                                <div id="session-players-list" class="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p class="col-span-full p-4 text-center text-xs text-slate-400 italic">Selecciona un equipo para cargar jugadores</p>
                                </div>
                            </div>

                            <button type="submit" class="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">Guardar Planificación</button>
                        </form>
                    </div>
                `;
                
                // Logic to filter players by team
                const teamSelect = document.getElementById('session-team-select');
                const playersList = document.getElementById('session-players-list');
                
                const updatePlayers = () => {
                    const teamId = teamSelect.value;
                    const teamPlayers = players.filter(p => p.equipoId == teamId);
                    
                    // Main list
                    playersList.innerHTML = teamPlayers.map(p => `
                        <label class="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-xl cursor-pointer hover:border-blue-200">
                            <input type="checkbox" name="playerIds" value="${p.id}" checked class="w-4 h-4 rounded text-blue-600">
                            <span class="text-[10px] font-bold text-slate-700 truncate">${p.nombre}</span>
                        </label>
                    `).join('') || '<p class="col-span-full p-4 text-center text-xs text-slate-400 italic">No hay jugadores en este equipo.</p>';

                    // Per-task group assignment
                    tasks.forEach(t => {
                        const target = document.querySelector(`.task-players-assignment-${t.id}`);
                        if (target) {
                            target.innerHTML = teamPlayers.map(p => `
                                <div class="flex items-center gap-3 bg-white px-2 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                                    <span class="text-[9px] font-bold text-slate-600 truncate flex-1">${p.nombre}</span>
                                    <div class="flex gap-1.5">
                                        <label class="cursor-pointer group/color">
                                            <input type="radio" name="taskPlayerGroup_${t.id}_${p.id}" value="Azul" class="hidden peer">
                                            <div class="w-5 h-5 rounded-md bg-blue-500 border-2 border-white ring-1 ring-slate-100 peer-checked:ring-slate-900 peer-checked:scale-110 transition-all"></div>
                                        </label>
                                        <label class="cursor-pointer group/color">
                                            <input type="radio" name="taskPlayerGroup_${t.id}_${p.id}" value="Rojo" class="hidden peer">
                                            <div class="w-5 h-5 rounded-md bg-red-500 border-2 border-white ring-1 ring-slate-100 peer-checked:ring-slate-900 peer-checked:scale-110 transition-all"></div>
                                        </label>
                                        <label class="cursor-pointer group/color">
                                            <input type="radio" name="taskPlayerGroup_${t.id}_${p.id}" value="Amarillo" class="hidden peer">
                                            <div class="w-5 h-5 rounded-md bg-yellow-400 border-2 border-white ring-1 ring-slate-100 peer-checked:ring-slate-900 peer-checked:scale-110 transition-all"></div>
                                        </label>
                                    </div>
                                </div>
                            `).join('') || '<p class="text-[9px] text-slate-400 italic col-span-full">Sin jugadores</p>';
                        }
                    });
                };
                
                teamSelect.addEventListener('change', updatePlayers);
                updatePlayers();
                attachFormSubmit('sesiones');
            });
        } else if (currentView === 'equipos') {
            const players = await db.getAll('jugadores');
            modalHtml = `
                <div class="p-8">
                    <h3 class="text-2xl font-bold mb-6 text-slate-800">Registrar Nuevo Equipo</h3>
                    <form id="modal-form" class="space-y-6">
                        <div class="grid grid-cols-2 gap-4">
                            <div class="col-span-2">
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nombre del Equipo</label>
                                <input name="nombre" placeholder="Ej: Benjamín A" class="w-full p-4 border rounded-2xl font-bold outline-none focus:ring-2 ring-blue-100" required>
                            </div>
                            <div class="col-span-2">
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Año de Nacimiento (Categoría)</label>
                                <select id="new-team-year-input" name="anioNacimiento" class="w-full p-4 border rounded-2xl bg-white outline-none focus:ring-2 ring-blue-100" required>
                                    <option value="">Seleccionar año...</option>
                                    ${[2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018].map(y => `<option value="${y}">${y}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-span-2">
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Escudo del Equipo</label>
                                <div class="flex items-center gap-4 p-4 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50">
                                    <input type="file" id="team-crest-input" accept="image/*" class="text-xs text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition-all">
                                </div>
                            </div>
                            <div class="col-span-2">
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-4">Vincular Jugadores (Filtrados por Año)</label>
                                <div id="new-linked-players-list" class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <!-- Players will be filtered here -->
                                </div>
                            </div>
                        </div>
                        <button type="submit" class="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all mt-4 uppercase tracking-widest">Crear Equipo</button>
                    </form>
                </div>
            `;
            setTimeout(() => {
                const yearInput = document.getElementById('new-team-year-input');
                const listDiv = document.getElementById('new-linked-players-list');
                const update = () => {
                    const year = yearInput.value;
                    const filtered = players.filter(p => !year || p.anioNacimiento == year);
                    listDiv.innerHTML = filtered.map(p => `
                        <label class="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-xl cursor-pointer hover:border-blue-200">
                            <input type="checkbox" name="linkedPlayerIds" value="${p.id}" class="w-4 h-4 rounded text-blue-600">
                            <span class="text-[10px] font-bold text-slate-700 truncate">${p.nombre}</span>
                        </label>
                    `).join('') || `<p class="col-span-full p-4 text-center text-xs text-slate-400 italic">Escribe un año para filtrar jugadores.</p>`;
                };
                yearInput.addEventListener('change', update);
                update();
                attachFormSubmit('equipos');
            }, 0);
        } else if (currentView === 'eventos') {
            modalHtml = `
                <div class="p-8">
                    <h3 class="text-2xl font-bold mb-6 text-slate-800">Nuevo Evento de Agenda</h3>
                    <form id="modal-form" class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <input name="nombre" placeholder="Título del evento" class="col-span-2 w-full p-4 border rounded-2xl text-lg font-bold outline-none focus:ring-2 ring-amber-100" required>
                            <select name="categoria" class="w-full p-3 border rounded-xl bg-white outline-none">
                                <option>Reunión</option><option>Partido</option><option>Scouting</option><option>Fisioterapia</option><option>Otro</option>
                            </select>
                            <input name="hora" type="time" class="w-full p-3 border rounded-xl" required>
                            <input name="fecha" type="date" class="w-full p-3 border rounded-xl" required>
                            <input name="lugar" placeholder="Lugar (Campo, Oficina...)" class="w-full p-3 border rounded-xl">
                            <textarea name="notas" placeholder="Notas adicionales..." class="col-span-2 w-full p-3 border rounded-xl h-24 outline-none focus:ring-2 ring-amber-100"></textarea>
                        </div>
                        <button type="submit" class="w-full py-4 bg-amber-600 text-white font-bold rounded-2xl shadow-lg shadow-amber-500/20 hover:bg-amber-700 transition-all mt-4">Añadir a la Agenda</button>
                    </form>
                </div>
            `;
        } else if (currentView === 'jugadores') {
            const teams = await db.getAll('equipos');
            modalHtml = `
                <div class="p-8">
                    <h3 class="text-2xl font-bold mb-6 text-slate-800">Registrar Futbolista</h3>
                    <form id="modal-form" class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div class="col-span-2">
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nombre del Jugador</label>
                                <input name="nombre" placeholder="Nombre completo" class="w-full p-3 border rounded-xl" required>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">EQUIPO RS</label>
                                <select name="equipoId" class="w-full p-3 border rounded-xl bg-white">
                                    <option value="">Ninguno (Libre)</option>
                                    ${teams.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Dorsal</label>
                                <input name="dorsal" type="number" placeholder="nº" class="w-full p-3 border rounded-xl">
                            </div>
                            <div class="col-span-2">
                                 <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Posición Principal</label>
                                 <select name="posicion" class="w-full p-3 border rounded-xl bg-white">
                                    <option>PO</option>
                                    <option>DBD</option><option>DBZ</option>
                                    <option>DCD</option><option>DCZ</option>
                                    <option>MBD</option><option>MBZ</option>
                                    <option>MCD</option><option>MCZ</option>
                                    <option>MVD</option><option>MVZ</option>
                                    <option>MPD</option><option>MPZ</option>
                                    <option>ACD</option><option>ACZ</option>
                                </select>
                            </div>
                            <div class="col-span-2">
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Equipo Convenido</label>
                                <select name="equipoConvenido" class="w-full p-3 border rounded-xl bg-white">
                                    <option value="">Ninguno</option>
                                    <option>CD BAZTAN KE</option>
                                    <option>BETI GAZTE KJKE</option>
                                    <option>GURE TXOKOA KKE</option>
                                    <option>CA RIVER EBRO</option>
                                    <option>CALAHORRA FB</option>
                                    <option>EF ARNEDO</option>
                                    <option>EFB ALFARO</option>
                                    <option>UD BALSAS PICARRAL</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Año de Nacimiento</label>
                                <input name="anioNacimiento" type="number" placeholder="Ej: 2010" class="w-full p-3 border rounded-xl">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Fecha de Nacimiento</label>
                                <input name="fechaNacimiento" type="date" class="w-full p-3 border rounded-xl">
                            </div>
                        </div>
                        <button type="submit" class="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg mt-4">Guardar en Directorio</button>
                    </form>
                </div>
            `;
            setTimeout(() => attachFormSubmit('jugadores'), 0);
        }

        if (modalHtml) {
            modalContainer.innerHTML = modalHtml;
            modalOverlay.classList.add('active');
            attachFormSubmit(currentView);
        } else if (currentView === 'sesiones') {
            modalOverlay.classList.add('active');
        }
    });

    function attachFormSubmit(viewId) {
        const form = document.getElementById('modal-form');
        if (!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            try {
                // Handle multiple checkboxes (taskIds, playerIds)
                if (viewId === 'sesiones') {
                    data.taskIds = formData.getAll('taskIds');
                    data.playerIds = formData.getAll('playerIds');
                    
                    const tasksMeta = {};
                    data.taskIds.forEach(tid => {
                        const playerGroups = {};
                        data.playerIds.forEach(pid => {
                            const g = formData.get(`taskPlayerGroup_${tid}_${pid}`);
                            if (g) playerGroups[pid] = g;
                        });
                        tasksMeta[tid] = {
                            time: formData.get(`taskTime_${tid}`),
                            space: formData.get(`taskSpace_${tid}`),
                            playerGroups: playerGroups
                        };
                    });
                    data.tasksMeta = tasksMeta;
                }
                
                if (viewId === 'tareas') {
                    const imgInput = document.getElementById('task-image-input');
                    if (imgInput && imgInput.files[0]) {
                        data.image = await new Promise(resolve => {
                            const reader = new FileReader();
                            reader.onload = (re) => resolve(re.target.result);
                            reader.readAsDataURL(imgInput.files[0]);
                        });
                    }
                }

                if (viewId === 'equipos') {
                    const imgInput = document.getElementById('team-crest-input');
                    if (imgInput && imgInput.files[0]) {
                        data.escudo = await new Promise(resolve => {
                            const reader = new FileReader();
                            reader.onload = (re) => resolve(re.target.result);
                            reader.readAsDataURL(imgInput.files[0]);
                        });
                    }

                    const linkedPlayerIds = formData.getAll('linkedPlayerIds');
                    data.jugadoresCount = linkedPlayerIds.length;
                    
                    const id = await db.add('equipos', data);
                    
                    // Update linked players
                    if (linkedPlayerIds.length > 0) {
                        const players = await db.getAll('jugadores');
                        for (const pid of linkedPlayerIds) {
                            const p = players.find(x => x.id == pid);
                            if (p) {
                                p.equipoId = id.toString();
                                await db.update('jugadores', p);
                            }
                        }
                    }
                    
                    closeModal();
                    renderView('equipos');
                    return; // Prevent default db.add at bottom
                }
                
                if (viewId === 'sesiones') {
                    const teams = await db.getAll('equipos');
                    const t = teams.find(team => team.id == data.equipoId);
                    data.equipoNombre = t ? t.nombre : 'Equipo';
                }

                await db.add(viewId, data);
                window.customAlert('Éxito', 'Guardado correctamente');
                closeModal();
                switchView(viewId);
            } catch (err) {
                console.error('Error saving data:', err);
                window.customAlert('Error', 'Error al guardar: ' + err.message);
            }
        });
    }

    window.closeModal = () => modalOverlay.classList.remove('active');
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

    // Seed Data
    async function seed() {
        if ((await db.getAll('tareas')).length === 0) {
            await db.add('tareas', { name: 'Rondo 4x4 + 3', category: 'Ataque', duration: 15, description: 'Mejora de la circulación rápida y el juego interior.' });
            await db.add('tareas', { name: 'Presión Alta', category: 'Defensa', duration: 20, description: 'Bloque alto y presión coordinada tras pérdida.' });
            await db.add('tareas', { name: 'Finalización 1x1', category: 'Ataque', duration: 10, description: 'Duelos en área con portero.' });
        }
        
        let firstTeamId;
        if ((await db.getAll('equipos')).length === 0) {
            firstTeamId = await db.add('equipos', { nombre: 'Juvenil A', categoria: 'División de Honor', jugadoresCount: 18, asistenciaMedia: 94 });
            await db.add('equipos', { nombre: 'Primer Equipo', categoria: '3ª RFEF', jugadoresCount: 22, asistenciaMedia: 98 });
        } else {
            const teams = await db.getAll('equipos');
            firstTeamId = teams[0].id;
        }

        if ((await db.getAll('jugadores')).length === 0 && firstTeamId) {
            const players = [
                { nombre: 'Dani García', dorsal: 1, equipoId: firstTeamId },
                { nombre: 'Hugo López', dorsal: 4, equipoId: firstTeamId },
                { nombre: 'Marc Soler', dorsal: 7, equipoId: firstTeamId },
                { nombre: 'Erik Martínez', dorsal: 9, equipoId: firstTeamId },
                { nombre: 'Alvaro Sanz', dorsal: 10, equipoId: firstTeamId }
            ];
            for (const p of players) await db.add('jugadores', p);
        }
        if ((await db.getAll('eventos')).length === 0) {
            await db.add('eventos', { nombre: 'Preparar Equipación', categoria: 'Otro', fecha: new Date().toISOString().split('T')[0], hora: '09:00', completada: false });
            await db.add('eventos', { nombre: 'Reunión Coordinadores', categoria: 'Reunión', fecha: new Date().toISOString().split('T')[0], hora: '12:00', completada: false });
        }
    }

    await seed();
    switchView('dashboard');
});
