const PLAYER_POSITIONS = ['PO', 'DBD', 'DBZ', 'DCD', 'DCZ', 'MCD', 'MCZ', 'MVD', 'MVZ', 'MBD', 'MBZ', 'MPD', 'MPZ', 'ACD', 'ACZ'];
const CLUBES_CONVENIDOS = ['CD BAZTAN KE', 'BETI GAZTE KJKE', 'GURE TXOKOA KKE', 'CA RIVER EBRO', 'CALAHORRA FB', 'EF ARNEDO', 'EFB ALFARO', 'UD BALSAS PICARRAL'];

window.currentVisibilityMode = 'personal'; 
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
        
        const yearA = parseInt(a.categoria) || 9999;
        const yearB = parseInt(b.categoria) || 9999;
        
        if (yearA !== yearB) return yearA - yearB;
        return nameA.localeCompare(nameB);
    });
};

window.cleanLugar = (l) => {
    if (!l) return '';
    if (typeof l !== 'string') return l;
    return l.split(' ||| ')[0];
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

document.addEventListener('DOMContentLoaded', async () => {
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
    window.formationsState = {
        convocatoria: savedPrefs.convocatoria || 'F11_433',
        torneo: savedPrefs.torneo || 'F11_433',
        campograma: savedPrefs.campograma || 'F11_433'
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
                await db.syncRole();
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
    let currentView = 'dashboard';
    let attendanceData = {};
    const DB_VERSION = 7;

    const TASK_TYPES = [
        "ABP", "ACCIONES COMBINADAS", "EVOLUCIONES", "JUEGO DE FÚTBOL", 
        "JUEGO DE POSICIÓN", "JUEGO LÚDICO", "POSESIÓN", "RONDO", 
        "TÉCNICA COLECTIVA", "TÉCNICA INDIVIDUAL", "FÚTBOL", "PORTEROS", "MOVIMIENTOS"
    ];

    const TASK_CATEGORIES = [
        "SENIOR", "JUVENIL", "CADETE", "INFANTIL", "ALEVIN", "BENJAMIN"
    ];

    const TASK_OBJECTIVES = [
        "1x1", "ABP", "AMPLITUD", "ATAQUE RAPIDO", "BASCULACIONES", "BLOCAJES", 
        "BUSCAR SUPERIORIDADES", "CAIDAS", "CAMBIOS DE ORIENTACIÓN", "CENTRO Y REMATE", 
        "COBERTURAS", "COOPERACIÓN", "CONCENTRACIÓN", "CONDUCCIÓN", "CONTROL", 
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
        'jugadores': { title: 'Directorio de Jugadores', subtitle: 'Base de datos global de futbolistas.', addButtonLabel: 'Nuevo Jugador', addButtonEnabled: true, secondaryButtonEnabled: true, secondaryButtonLabel: 'Importar CSV' },
        'asistencia': { title: 'Control de Asistencia', subtitle: 'Histórico de asistencia por día y equipo.', addButtonLabel: 'Asistencia', addButtonEnabled: true },
        'convocatorias': { title: 'Gestión de Convocatorias', subtitle: 'Listados de jugadores por ciclos y eventos.', addButtonLabel: 'Nueva Convocatoria', addButtonEnabled: true, secondaryButtonEnabled: true, secondaryButtonLabel: 'Importar CSV' },
        'torneos': { title: 'Control de Torneos', subtitle: 'Evaluación y rendimiento de jugadores en competición.', addButtonLabel: 'Nuevo Torneo', addButtonEnabled: true },
        'usuarios': { title: 'Gestión de Staff', subtitle: 'Añade y gestiona los técnicos de tu plataforma.', addButtonEnabled: true, addButtonLabel: 'Nuevo Miembro' },
        'perfil': { title: 'Mi Perfil', subtitle: 'Configuración personal y seguridad.', addButtonEnabled: false }
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
            } else if (viewId === 'jugadores') {
                secondaryAddBtn.onclick = () => window.showPlayerImportModal();
            } else if (viewId === 'convocatorias') {
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
                            
                            const teams = await db.getAll('equipos');
                            const players = await db.getAll('jugadores');
                            const existingConvs = await db.getAll('convocatorias');

                            let importedCount = 0;
                            let updatedCount = 0;
                            
                            const loadingAlert = document.createElement('div');
                            loadingAlert.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center';
                            loadingAlert.innerHTML = `
                                <div class="bg-white p-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                                    <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    <p class="font-bold text-slate-800 uppercase tracking-widest text-xs">Sincronizando Convocatorias...</p>
                                </div>
                            `;
                            document.body.appendChild(loadingAlert);

                            const regex = new RegExp(`\\${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`);

                            for (let i = 1; i < lines.length; i++) {
                                const row = lines[i].split(regex).map(c => c.trim().replace(/^"|"$/g, ''));
                                if (row.length < headers.length) continue;

                                const data = {};
                                headers.forEach((h, idx) => data[h] = row[idx]);
                                
                                const teamName = data['EQUIPO'];
                                const team = teams.find(t => t.nombre.toLowerCase() === (teamName || '').toLowerCase());
                                const playerNames = (data['JUGADORES'] || '').split(';').map(n => n.trim().toLowerCase());
                                const foundPlayerIds = players
                                    .filter(p => playerNames.includes(p.nombre?.toLowerCase()))
                                    .map(p => p.id.toString());

                                const convData = {
                                    nombre: (data['NOMBRE'] || '').toUpperCase().trim(),
                                    tipo: data['TIPO'] || 'Ciclo',
                                    fecha: data['FECHA'],
                                    hora: data['HORA'],
                                    lugar: (data['LUGAR'] || '').toUpperCase().trim(),
                                    equipoid: team ? team.id.toString() : null,
                                    playerids: foundPlayerIds
                                };

                                if (!convData.nombre || !convData.fecha) continue;

                                const key = `${convData.nombre.toLowerCase()}|${convData.fecha}`;
                                const existing = existingConvs.find(c => `${c.nombre?.toLowerCase()}|${c.fecha}` === key);

                                if (existing) {
                                    await supabaseClient.from('convocatorias').update(convData).eq('id', existing.id);
                                    updatedCount++;
                                } else {
                                    await supabaseClient.from('convocatorias').insert(convData);
                                    importedCount++;
                                }
                            }
                            loadingAlert.remove();
                            window.customAlert('Importación Exitosa', `Se han creado ${importedCount} convocatorias y actualizado ${updatedCount}.`, 'success');
                            window.switchView('convocatorias');
                        };
                        reader.readAsText(file);
                    };
                    fileInput.click();
                };
            } else if (viewId === 'equipos') {
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
                            
                            const existingTeams = await db.getAll('equipos');

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
        
        switch(viewId) {
            case 'dashboard': await renderDashboard(wrapper); break;
            case 'calendario': await renderCalendario(wrapper); break;
            case 'campograma': await renderCampograma(wrapper); break;
            case 'eventos': await window.renderEventos(wrapper); break;
            case 'tareas': await window.renderTareas(wrapper); break;
            case 'sesiones': await window.renderSesiones(wrapper); break;
            case 'equipos': await renderEquipos(wrapper); break;
            case 'jugadores': await window.renderJugadores(wrapper); break;
            case 'asistencia': await renderAsistencia(wrapper); break;
            case 'convocatorias': await renderConvocatorias(wrapper); break;
            case 'torneos': await renderTorneos(wrapper); break;
            case 'usuarios': await renderUsuarios(wrapper); break;
            case 'perfil': await renderPerfil(wrapper); break;
        }
        
        contentContainer.innerHTML = '';
        contentContainer.appendChild(wrapper);
        
        // El chispazo maestro: activar todos los iconos de la nueva vista
        if (window.lucide) {
            setTimeout(() => {
                lucide.createIcons();
            }, 100);
        }
    }

    // View Renderers
    async function renderDashboard(container) {
        const [allTasks, allSessions, teams, allConvocatorias, players, attendance] = await Promise.all([
            db.getAll('tareas'),
            db.getAll('sesiones'),
            db.getAll('equipos'),
            db.getAll('convocatorias'),
            db.getAll('jugadores'),
            db.getAll('asistencia')
        ]);
        
        const userRes = await supabaseClient.auth.getUser();
        const currentUser = userRes.data?.user;

        const isGlobal = window.currentVisibilityMode === 'global';
        const filterByVisibility = (items) => {
            if (isGlobal) return items;
            return items.filter(i => i.createdBy === currentUser?.id || (i.sharedWith && i.sharedWith.includes(currentUser?.id)));
        };

        const tasks = allTasks; // Tareas are always global (library)
        const sessions = filterByVisibility(allSessions);
        const convocatorias = filterByVisibility(allConvocatorias);
        const torneos = allConvocatorias.filter(c => (c.tipo || '').toUpperCase() === 'TORNEO');
        
        // Calculate dynamic attendance for each team
        teams.forEach(t => {
            const teamReports = attendance.filter(r => r.equipoid && r.equipoid.toString() === t.id.toString());
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

        const totalMale = players.filter(p => p.sexo === 'Masculino').length;
        const totalFemale = players.filter(p => p.sexo === 'Femenino').length;
 
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
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
                        <div class="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><i data-lucide="trophy"></i></div>
                    </div>
                    <h3 class="text-slate-500 text-sm font-medium">Torneos</h3>
                    <p class="text-3xl font-bold text-slate-800">${torneos.length}</p>
                </div>
                <div class="stat-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><i data-lucide="users"></i></div>
                    </div>
                    <h3 class="text-slate-500 text-sm font-medium">Equipos</h3>
                    <p class="text-3xl font-bold text-slate-800">${teams.length}</p>
                </div>
                <div class="stat-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><i data-lucide="user-check"></i></div>
                    </div>
                    <h3 class="text-slate-500 text-sm font-medium">Total Jugadores</h3>
                    <p class="text-3xl font-bold text-slate-800">${players.length}</p>
                </div>
                <div class="stat-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                    <div class="flex items-center justify-between mb-4">
                        <div class="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center"><i data-lucide="users-round"></i></div>
                    </div>
                    <h3 class="text-slate-500 text-sm font-medium">Género (F / M)</h3>
                    <div class="flex items-center gap-2">
                        <p class="text-3xl font-bold text-rose-500">${totalFemale}</p>
                        <span class="text-slate-200 text-xl font-thin">/</span>
                        <p class="text-3xl font-bold text-blue-500">${totalMale}</p>
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 gap-8 mb-8">
                <div class="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                    <h3 class="text-xl font-black text-slate-800 mb-10 flex items-center gap-3 uppercase tracking-tight">
                        <i data-lucide="trending-up" class="w-8 h-8 text-blue-600"></i>
                        Rendimiento Asistencia por Equipo
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        ${teams.map(e => `
                            <div class="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <div class="flex justify-between items-center mb-4 px-1">
                                    <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">${e.nombre}</span>
                                    <span class="text-xs font-black text-blue-600">${e.computedAsistencia || 0}%</span>
                                </div>
                                <div class="h-3 bg-white rounded-full overflow-hidden border border-slate-200">
                                    <div class="h-full bg-blue-600 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(37,99,235,0.3)]" style="width: ${e.computedAsistencia || 0}%"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    let currentCalendarDate = new Date();
    let selectedCalendarDate = new Date();

    async function renderCalendario(container) {
        try {
            const currentUserRes = await supabaseClient.auth.getUser();
            const currentUser = currentUserRes.data.user;
            if (!currentUser) return;

            const allSessions = await db.getAll('sesiones');
            const allEventos = await db.getAll('eventos');
            const allConvocatorias = await db.getAll('convocatorias');

            // Helper to check if an item is shared with the current user
            const isSharedWithMe = (item) => {
                if (item.sharedWith) {
                    const sw = Array.isArray(item.sharedWith) ? item.sharedWith : [item.sharedWith.toString()];
                    if (sw.includes(currentUser.id)) return true;
                }
                if (item.lugar && item.lugar.includes(' ||| ')) {
                    try {
                        const extra = JSON.parse(item.lugar.split(' ||| ')[1]);
                        if (extra.sw) {
                            const sw = Array.isArray(extra.sw) ? extra.sw : [extra.sw.toString()];
                            if (sw.includes(currentUser.id)) return true;
                        }
                    } catch (e) {}
                }
                return false;
            };

            const isConvenido = db.userRole === 'TECNICO CLUB CONVENIDO';
            const isGlobal = window.currentVisibilityMode === 'global';

            const sessions = isGlobal ? allSessions : allSessions.filter(s => s.createdBy === currentUser.id || isSharedWithMe(s));
            const eventos = isGlobal ? allEventos : allEventos.filter(e => e.createdBy === currentUser.id || isSharedWithMe(e));
            const filterConvs = isGlobal ? allConvocatorias : allConvocatorias.filter(c => !isConvenido || c.createdBy === currentUser.id || isSharedWithMe(c));
            const convocatorias = filterConvs;
            
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
                        const extra = JSON.parse(c.lugar.split(' ||| ')[1]);
                        isExtraDate = (extra.s2?.f === selDateStr) || (extra.s3?.f === selDateStr);
                    } catch (e) {}
                }
                return isMainDate || isExtraDate;
            });

            const combinedItems = [
                ...selectedDaySessions.map(s => ({ ...s, type: 'sesion' })),
                ...selectedDayEvents.map(e => ({ ...e, type: 'evento' })),
                ...selectedDayConvocatorias.map(c => ({ ...c, type: 'convocatoria' }))
            ].sort((a,b) => (a.hora || '00:00').localeCompare(b.hora || '00:00'));

        window.updateSelectedCalendarDay = (dStr) => {
            selectedCalendarDate = new Date(dStr + 'T12:00:00');
            renderCalendario(container);
        };

        const selDateFullStr = selectedCalendarDate.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

        container.innerHTML = `
            <div class="flex flex-col md:flex-row gap-6">
                <!-- Left Column: Calendar Grid (80%) -->
                <div class="flex-[8] min-w-0 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">
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
                                        } catch (e) {}
                                    }
                                    return false;
                                });

                                const combined = [
                                    ...daySessions.map(s => ({ ...s, color: 'bg-red-500' })),
                                    ...dayEvents.map(e => ({ ...e, color: 'bg-emerald-500' })),
                                    ...dayConcs.map(c => ({ ...c, color: (c.tipo || '').toUpperCase() === 'TORNEO' ? 'bg-slate-900' : 'bg-amber-400' }))
                                ];

                                const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                                
                                return `
                                    <div onclick="window.updateSelectedCalendarDay('${dStr}')" class="border-r border-b border-slate-100/30 p-4 min-h-0 cursor-pointer hover:bg-blue-50/50 transition-all flex flex-col items-start gap-2 relative group ${isToday ? 'bg-blue-50/20' : ''} ${dStr === selDateStr ? 'bg-blue-50/50 ring-2 ring-blue-100 ring-inset' : ''}">
                                        <div class="flex justify-between items-center w-full">
                                            <span class="text-sm font-black transition-all ${isToday ? 'w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center -ml-1 shadow-lg' : (dStr === selDateStr ? 'text-blue-600' : 'text-slate-300 group-hover:text-blue-600')}">${day}</span>
                                        </div>
                                        <div class="w-full flex-1 overflow-hidden flex flex-wrap gap-1 mt-1">
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
                    <div class="flex-[3] w-full md:w-80 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col md:h-[700px] min-h-[400px]">
                        <div class="p-6 border-b bg-slate-50/30">
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Agenda del Día</h4>
                            <p class="text-lg font-black text-slate-800 uppercase tracking-tight">${selDateFullStr}</p>
                        </div>
                        <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/10 min-h-[200px]">
                            ${combinedItems.length > 0 ? combinedItems.map(item => {
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

                                const isChecked = item.completada;

                                return `
                                    <div onclick="${action}" class="p-5 rounded-2xl border border-slate-100 bg-white hover:border-${accent}-300 hover:shadow-xl hover:shadow-${accent}-500/10 transition-all cursor-pointer group ${isChecked ? 'opacity-40' : ''}">
                                        <div class="flex items-center gap-3 mb-3">
                                            <div class="w-8 h-8 rounded-lg bg-${accent}-50 flex items-center justify-center group-hover:bg-${accent}-600 transition-colors">
                                                <i data-lucide="${icon}" class="w-4 h-4 text-${accent}-600 group-hover:text-white transition-colors"></i>
                                            </div>
                                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${item.hora || '--:--'}</span>
                                        </div>
                                        <p class="text-xs font-black text-slate-800 uppercase leading-snug ${isChecked ? 'line-through' : ''}">${item.titulo || item.nombre}</p>
                                    </div>
                                `;
                            }).join('') : `
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
                        } catch (e) {}
                    }
                    return false;
                });

                const combinedItems = [
                    ...daySessions.map(s => ({ ...s, type: 'sesion' })),
                    ...dayEvents.map(e => ({ ...e, type: 'evento' })),
                    ...dayConcs.map(c => ({ ...c, type: 'convocatoria' }))
                ].sort((a,b) => (a.hora || '00:00').localeCompare(b.hora || '00:00'));

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
                    <a href="PLANTILLA_IMPORTACION_JUGADORES.csv" download class="w-full py-4 bg-white border-2 border-slate-100 text-slate-600 font-bold rounded-2xl flex items-center justify-center gap-3 hover:border-blue-200 hover:text-blue-600 transition-all uppercase tracking-widest text-[10px]">
                        <i data-lucide="download" class="w-4 h-4"></i>
                        Descargar Plantilla CSV
                    </a>
                    
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
                        
                        const mapHeader = (possible) => headers.findIndex(h => possible.includes(h));

                        const idxNombre = mapHeader(['NOMBRE', 'JUGADOR', 'PLAYER', 'NAME']);
                        const idxEquipo = mapHeader(['EQUIPO', 'TEAM', 'CLUB']);
                        const idxPosicion = mapHeader(['POSICION', 'POSITION', 'POS']);
                        const idxAnio = mapHeader(['AÑO', 'YEAR', 'NACIMIENTO']);
                        const idxNivel = mapHeader(['NIVEL', 'LEVEL']);
                        const idxSexo = mapHeader(['SEXO', 'GENERO', 'GENDER']);
                        const idxPie = mapHeader(['PIE', 'FOOT']);
                        const idxNotas = mapHeader(['NOTAS', 'NOTES']);

                        if (idxNombre === -1) throw new Error("Columna NOMBRE no encontrada");

                        const teams = await db.getAll('equipos');
                        const existingPlayers = await db.getAll('jugadores');
                        const playersToInsert = [];
                        let updatedCount = 0;

                        const regex = new RegExp(`\\${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`);

                        for (let i = 1; i < lines.length; i++) {
                            const row = lines[i].split(regex).map(c => c.trim().replace(/^"|"$/g, ''));
                            if (!row[idxNombre]) continue;

                            const rawNombre = row[idxNombre].toUpperCase().trim();
                            const teamName = idxEquipo !== -1 ? row[idxEquipo] : '';
                            const team = teams.find(t => t.nombre.split(' ||| ')[0].toLowerCase() === (teamName || '').toLowerCase());

                            const csvPlayer = {
                                nombre: rawNombre,
                                nivel: idxNivel !== -1 ? (parseInt(row[idxNivel]) || 3) : 3,
                                equipoid: team ? team.id : null,
                                posicion: idxPosicion !== -1 ? (row[idxPosicion] || 'PO') : 'PO',
                                anionacimiento: idxAnio !== -1 ? (parseInt(row[idxAnio]) || null) : null,
                                sexo: idxSexo !== -1 ? (row[idxSexo] || 'Masculino') : 'Masculino',
                                pie: idxPie !== -1 ? (row[idxPie] || 'DIESTRO') : 'DIESTRO',
                                notas: idxNotas !== -1 ? row[idxNotas] : ''
                            };

                            const existing = existingPlayers.find(p => p.nombre.toUpperCase() === rawNombre);
                            if (existing) {
                                Object.assign(existing, csvPlayer);
                                await db.update('jugadores', existing);
                                updatedCount++;
                            } else {
                                playersToInsert.push(csvPlayer);
                            }
                        }

                        if (playersToInsert.length > 0) {
                            const { error } = await supabaseClient.from('jugadores').insert(playersToInsert);
                            if (error) throw error;
                        }

                        await db.getAll('jugadores'); // Refresh cache
                        window.customAlert('Éxito', `Importados: ${playersToInsert.length}, Actualizados: ${updatedCount}`, 'success');
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

    window.renderEventos = async function(container, onlyTable = false) {
        const currentUser = (await supabaseClient.auth.getUser()).data.user;
        const allEvents = await db.getAll('eventos');
        const isGlobal = window.currentVisibilityMode === 'global';

        const tasks = allEvents.filter(e => {
            if (isGlobal) return true;
            if (e.createdBy === currentUser.id) return true;
            if (e.sharedWith) {
                const sw = Array.isArray(e.sharedWith) ? e.sharedWith : [e.sharedWith.toString()];
                if (sw.includes(currentUser.id)) return true;
            }
            return false;
        });
        
        if (!window.eventFilters) window.eventFilters = { search: '', category: 'TODOS' };

        const categories = ['TODOS', ...new Set(tasks.map(t => t.categoria || 'Otro').filter(Boolean))].sort();

        const filteredTasks = tasks.filter(t => {
            const searchVal = (window.eventFilters.search || '').toLowerCase();
            const matchesSearch = (t.nombre || '').toLowerCase().includes(searchVal) || 
                                 (t.categoria || '').toLowerCase().includes(searchVal) ||
                                 (t.lugar || '').toLowerCase().includes(searchVal);
            
            const matchesCategory = window.eventFilters.category === 'TODOS' || (t.categoria || 'Otro') === window.eventFilters.category;
            
            return matchesSearch && matchesCategory;
        }).sort((a,b) => new Date(b.fecha) - new Date(a.fecha) || (b.hora || '').localeCompare(a.hora || ''));

        if (!onlyTable) {
            container.innerHTML = `
                <div class="space-y-6 mb-10">
                    <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div class="relative flex-1 w-full">
                            <i data-lucide="search" class="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                            <input type="text" id="event-search-input" value="${window.eventFilters.search}" placeholder="Buscar en la agenda (nombre, lugar...)" 
                                class="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-[2rem] text-sm focus:ring-4 ring-blue-50 outline-none transition-all shadow-sm"
                                oninput="window.eventFilters.search = this.value; window.renderEventos(document.getElementById('content-container'), true)">
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
        const teams = await db.getAll('equipos');

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

        const teams = await db.getAll('equipos');
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
                                if (session.lugar && session.lugar.includes(' ||| ')) {
                                    try {
                                        const ex = JSON.parse(session.lugar.split(' ||| ')[1]);
                                        if (ex.eids) teamIds = [...new Set([...teamIds.map(String), ...ex.eids.map(String)])];
                                    } catch(e) {}
                                }
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
                                            <p class="text-[9px] font-bold text-slate-400 uppercase">${p.posicion || '---'}</p>
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

    window.renderTareas = async function(container, onlyTable = false) {
        let tasks = await db.getAll('tareas');
        
        if (!onlyTable) {
            container.innerHTML = `
                <div class="mb-8 flex flex-col md:flex-row gap-4 items-center justify-between animate-in slide-in-from-top-4 duration-500">
                    <div class="relative flex-1 w-full">
                        <i data-lucide="search" class="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input type="text" id="task-search-input" value="${window.taskFilters.search}" placeholder="Filtrar biblioteca de ejercicios..." 
                            class="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-[2rem] text-sm focus:ring-4 ring-blue-50 outline-none transition-all shadow-sm">
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
            }).sort((a,b) => (a.name || '').localeCompare(b.name || ''));

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

    let sessionFilters = { team: 'TODOS', coach: 'TODOS', search: '' };

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

    window.renderSesiones = async function(container, onlyTable = false) {
        const sessions = await db.getAll('sesiones');
        const teams = await db.getAll('equipos');
        const teamsMap = Object.fromEntries(teams.map(t => [t.id, t.nombre]));
        const sortedTeams = window.getSortedTeams(teams);
        
        const userRes = await supabaseClient.auth.getUser();
        const currentUser = userRes.data?.user;

        const { data: profiles } = await supabaseClient.from('profiles').select('*');
        
        const isGlobal = window.currentVisibilityMode === 'global';
        const mySessions = isGlobal ? sessions : sessions.filter(s => {
            if (!currentUser) return false;
            return s.createdBy === currentUser.id || (s.sharedWith && s.sharedWith.includes(currentUser.id));
        });

        const filteredSessions = mySessions.filter(s => {
            let sessionTeamIds = [String(s.equipoid)];
            if (s.lugar && s.lugar.includes(' ||| ')) {
                try {
                    const ex = JSON.parse(s.lugar.split(' ||| ')[1]);
                    if (ex.eids) sessionTeamIds = [...new Set([...sessionTeamIds, ...ex.eids.map(String)])];
                } catch(e) {}
            }

            const matchesTeam = sessionFilters.team === 'TODOS' || sessionTeamIds.includes(String(sessionFilters.team));
            const matchesCoach = sessionFilters.coach === 'TODOS' || s.createdBy == sessionFilters.coach;
            const searchTerm = (sessionFilters.search || '').toLowerCase();
            const matchesSearch = !searchTerm || 
                                (s.titulo || '').toLowerCase().includes(searchTerm) || 
                                (s.equiponombre || '').toLowerCase().includes(searchTerm) ||
                                (s.lugar || '').toLowerCase().includes(searchTerm);
            return matchesTeam && matchesCoach && matchesSearch;
        }).sort((a,b) => new Date(b.fecha) - new Date(a.fecha) || (b.hora || '').localeCompare(a.hora || ''));

        const coaches = profiles ? profiles.filter(p => p.role === 'TECNICO' || p.role === 'ELITE') : [];

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
                    </div>

                    <!-- Filters Bar -->
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar flex-1">
                            <button onclick="window.filterSessions('team', 'TODOS')" class="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sessionFilters.team === 'TODOS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'}">Todas las Plantillas</button>
                            ${sortedTeams.map(t => `
                                <button onclick="window.filterSessions('team', ${t.id})" class="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${sessionFilters.team == t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'}">
                                    ${t.nombre.split(' ||| ')[0]}
                                </button>
                            `).join('')}
                        </div>

                        <div class="flex items-center gap-2">
                            <i data-lucide="filter" class="w-4 h-4 text-slate-300"></i>
                            <select onchange="window.filterSessions('coach', this.value)" class="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 ring-blue-100">
                                <option value="TODOS">Todos los Técnicos</option>
                                ${coaches.map(c => `<option value="${c.id}" ${sessionFilters.coach === c.id ? 'selected' : ''}>${c.name || c.nombre || 'Entrenador'}</option>`).join('')}
                            </select>
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
                                            <p class="text-sm font-black text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors uppercase tracking-tight ${s.completada ? 'line-through opacity-50' : ''}">${s.titulo || 'Sesión programada'}</p>
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
                                                        let teamIds = [s.equipoid];
                                                        if (s.lugar && s.lugar.includes(' ||| ')) {
                                                            try {
                                                                const ex = JSON.parse(s.lugar.split(' ||| ')[1]);
                                                                if (ex.eids) teamIds = [...new Set([...teamIds.map(String), ...ex.eids.map(String)])];
                                                            } catch(e) {}
                                                        }
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
                                                let teamIds = [s.equipoid];
                                                if (s.lugar && s.lugar.includes(' ||| ')) {
                                                    try {
                                                        const ex = JSON.parse(s.lugar.split(' ||| ')[1]);
                                                        if (ex.eids) teamIds = [...new Set([...teamIds.map(String), ...ex.eids.map(String)])];
                                                    } catch(e) {}
                                                }
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
        
        const isEdit = sessionData !== null;
        const session = sessionData || {
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
            createdBy: currentUser.id
        };

        const sessionCreator = users ? users.find(u => u.id === session.createdBy) : null;

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
                                    let isSelected = session.equipoid == t.id;
                                    if (session.lugar && session.lugar.includes(' ||| ')) {
                                        try {
                                            const extra = JSON.parse(session.lugar.split(' ||| ')[1]);
                                            if (extra.eids && extra.eids.includes(t.id.toString())) isSelected = true;
                                        } catch(e) {}
                                    }
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
                                ${[1,2,3,4,5,6].map(num => `<option value="${num}" ${session.ciclo == num ? 'selected' : ''}>Ciclo ${num}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nº Sesión</label>
                            <select name="numSesion" class="w-full p-3 border rounded-xl bg-white focus:ring-2 ring-blue-100 outline-none">
                                ${Array.from({length: 25}, (_, i) => i + 1).map(num => `<option value="${num}" ${session.numSesion == num ? 'selected' : ''}>Sesión ${num}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-span-2">
                             <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Lugar / Campo</label>
                             <input name="lugar" value="${window.cleanLugar(session.lugar) || ''}" placeholder="Ej: Campo 1, Zubieta..." class="w-full p-3 border rounded-xl outline-none focus:ring-2 ring-blue-100">
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
                                        <select id="task-select-${num}" class="w-full p-3 text-xs font-bold border-none bg-white rounded-xl shadow-sm outline-none appearance-none cursor-pointer">
                                            <option value="">Seleccionar ejercicio...</option>
                                            ${tasks.map(t => `<option value="${t.id}" data-type="${t.type}" ${session.taskids && session.taskids[num-1] == t.id.toString() ? 'selected' : ''}>${t.name}</option>`).join('')}
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

                    ${(users && db.userRole !== 'TECNICO CLUB CONVENIDO') ? `
                        <div class="space-y-3">
                            <label class="block text-xs font-black text-slate-400 uppercase tracking-widest">Compartir con el Staff</label>
                            <div id="staff-share-list" class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100 custom-scrollbar">
                                ${users.filter(u => u.id !== currentUser.id).map(u => `
                                    <label class="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 transition-all select-none">
                                        <input type="checkbox" name="sharedWith" value="${u.id}" ${session.sharedWith && session.sharedWith.includes(u.id) ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 focus:ring-blue-100">
                                        <div class="flex-1">
                                            <p class="text-[10px] font-bold text-slate-700">${u.name || u.full_name || u.nombre || 'Sin nombre'}</p>
                                        </div>
                                    </label>
                                `).join('') || '<p class="text-[10px] text-slate-400 italic">No hay otros usuarios registrados.</p>'}
                            </div>
                        </div>
                    ` : ''}

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
        [1,2,3,4,5,6].forEach(num => {
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
            } catch(e) { console.error("Error parsing conv players:", e); }
        };

        lucide.createIcons();
        modalOverlay.classList.add('active');

        document.getElementById('session-modal-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            const selectedTeamIds = Array.from(teamChecks).filter(c => c.checked).map(c => c.value);
            const extra = { eids: selectedTeamIds };
            const baseLugar = (formData.get('lugar') || '').toUpperCase().trim();
            const fullLugar = `${baseLugar} ||| ${JSON.stringify(extra)}`;

            // Build clean data object with ONLY valid DB columns
            const data = {
                titulo: (formData.get('titulo') || '').toUpperCase().trim(),
                fecha: formData.get('fecha'),
                hora: formData.get('hora'),
                lugar: fullLugar,
                ciclo: formData.get('ciclo') ? parseInt(formData.get('ciclo')) : null,
                numSesion: formData.get('numSesion') ? parseInt(formData.get('numSesion')) : null,
                equipoid: selectedTeamIds.length > 0 ? parseInt(selectedTeamIds[0]) : null,
                createdBy: currentUser?.id || session.createdBy || null,
                sharedWith: formData.getAll('sharedWith'),
                playerids: formData.getAll('playerids'),
                taskids: []
            };

            if (isEdit && session.id) data.id = parseInt(session.id);

            for (let i = 1; i <= 6; i++) {
                const sel = document.getElementById(`task-select-${i}`);
                if (sel && sel.value) data.taskids.push(sel.value);
            }

            try {
                if (isEdit && data.id) {
                    await db.update('sesiones', data);
                } else {
                    await db.add('sesiones', data);
                }
                closeModal();
                window.renderView('sesiones');
            } catch (err) {
                console.error("Error saving session:", err);
                const errorMsg = err.message || "Error desconocido";
                window.customAlert('Error al Guardar', `No se pudo guardar la sesión: ${errorMsg}`, 'error');
            }
        };
    };

    window.viewSession = async (id) => {
        const sessions = await db.getAll('sesiones');
        const session = sessions.find(s => s.id == id);
        window.renderSessionModal(session);
    };

    window.duplicateSession = async (id) => {
        try {
            const sessions = await db.getAll('sesiones');
            const session = sessions.find(s => s.id == id);
            if (!session) return;

            const newSession = { ...session };
            delete newSession.id;
            newSession.titulo = `${newSession.titulo} (COPIA)`.toUpperCase();
            
            // Set date to today? Maybe user prefers keeping the original date to adjust later
            // We'll keep original date but it will be at the end of the list usually
            
            await db.add('sesiones', newSession);
            window.customAlert('¡Duplicado!', 'La sesión ha sido duplicada con éxito.', 'success');
            window.renderView('sesiones');
        } catch (err) {
            console.error("Duplicate error:", err);
            window.customAlert('Error', 'No se pudo duplicar la sesión.', 'error');
        }
    };

    window.deleteSession = async (id) => {
        window.customConfirm(
            '¿Eliminar sesión?',
            'Se borrará toda la planificación de este entrenamiento del calendario.',
            async () => {
                await db.delete('sesiones', Number(id));
                closeModal();
                window.switchView('sesiones');
            }
        );
    };

    window.printSession = async (id) => {
        const session = (await db.getAll('sesiones')).find(s => s.id == id);
        if (!session) return;
        
        const allTasks = await db.getAll('tareas');
        const allPlayers = await db.getAll('jugadores');
        const teams = await db.getAll('equipos');
        const currentTeam = teams.find(t => t.id == session.equipoid);

        // Solo un escudo: Prioridad al del equipo, sino el de RS
        const headerShield = (currentTeam && currentTeam.escudo) ? currentTeam.escudo : 'RS.png';

        const sessionTasks = (session.taskids || []).map(taskId => allTasks.find(t => t.id == taskId)).filter(Boolean);
        const sessionPlayers = allPlayers.filter(p => session.playerids && session.playerids.includes(p.id.toString()));
        
        const allMaterials = sessionTasks.map(t => t.material || '').join(',').split(',').map(m => m.trim()).filter(m => m !== '');
        const uniqueMaterialList = [...new Set(allMaterials)].join(', ') || 'Estándar';

        // Lógica de nombre de archivo PDF: 26.04.22_sesion1_Calahorra_2011
        const d = new Date(session.fecha);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const yy = String(d.getFullYear()).slice(-2);
        const dateStr = `${day}.${month}.${yy}`;
        
        const daySessions = (await db.getAll('sesiones'))
            .filter(s => s.fecha === session.fecha && s.equipoid === session.equipoid)
            .sort((a,b) => (a.hora || '00:00').localeCompare(b.hora || '00:00'));
        const sesIdx = daySessions.findIndex(s => s.id == session.id) + 1;
        const sesNum = `sesion${sesIdx}`;
        
        const lugarClean = (session.lugar || 'Lugar').split(' - ')[0].trim().replace(/\s+/g, '');
        const teamYear = (session.equiponombre || '').match(/\d{4}/)?.[0] || '';
        const pdfFileName = `${dateStr}_${sesNum}_${lugarClean}_${teamYear}`;

        window.doPrintSession = () => {
            const originalTitle = document.title;
            document.title = pdfFileName;
            window.print();
            setTimeout(() => { document.title = originalTitle; }, 1000);
        };

        const printDiv = document.createElement('div');
        printDiv.className = 'print-view bg-slate-100 fixed inset-0 z-[200] overflow-y-auto p-4 md:p-12';
        printDiv.innerHTML = `
            <style>
                @media print {
                    html, body { 
                        height: auto !important; 
                        overflow: visible !important; 
                        margin: 0 !important; 
                        padding: 0 !important; 
                    }
                    body * { visibility: hidden; }
                    .print-view, .print-view * { visibility: visible; }
                    .print-view { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%; 
                        height: auto !important; 
                        display: block !important; 
                        background: white !important; 
                        padding: 0 !important; 
                        overflow: visible !important;
                    }
                    .no-print { display: none !important; }
                    .sheet-preview { 
                        margin: 0 !important; 
                        box-shadow: none !important; 
                        border: none !important; 
                        padding: 40px !important; 
                        border-radius: 0 !important; 
                    }
                    .force-page-break { 
                        page-break-before: always !important; 
                        break-before: page !important; 
                        display: block !important;
                    }
                }
                .sheet-preview {
                    background: white;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.1);
                    margin-bottom: 40px;
                    padding: 60px;
                    width: 100%;
                    max-width: 900px;
                    margin-left: auto;
                    margin-right: auto;
                    border-radius: 8px;
                }
            </style>
            
            <div class="no-print sticky top-0 mb-8 flex justify-center gap-4 z-[300]">
                <div class="bg-white/90 backdrop-blur-md p-3 rounded-[2.5rem] border border-white shadow-2xl flex gap-3">
                    <button onclick="window.doPrintSession()" class="px-8 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-3">
                        <i data-lucide="file-down" class="w-5 h-5"></i>
                        GUARDAR PDF
                    </button>
                    <button onclick="document.querySelector('.print-view').remove()" class="px-8 py-4 bg-slate-800 text-white font-black rounded-2xl shadow-xl hover:bg-slate-900 transition-all flex items-center gap-3">
                        <i data-lucide="x" class="w-5 h-5"></i>
                        CERRAR VISTA
                    </button>
                </div>
            </div>

            <!-- Page 1 -->
            <div class="sheet-preview">
                <header class="flex justify-between items-center border-b-8 border-blue-600 pb-8 mb-10">
                    <div class="flex items-center gap-6">
                        <img src="${headerShield}" class="w-[77px] h-[77px] object-contain">
                    </div>
                    <div class="text-right">
                        <h1 class="text-4xl font-black text-blue-900 uppercase leading-none">RS CENTRO</h1>
                        <p class="text-blue-600 font-bold text-lg mt-1 tracking-widest uppercase">Plan de Entrenamiento</p>
                    </div>
                </header>

                <div class="grid grid-cols-5 gap-3 mb-10">
                    <div class="bg-slate-50 p-4 rounded-2xl col-span-2">
                        <p class="text-[10px] font-black text-slate-400 uppercase mb-1">Nombre de la Sesión</p>
                        <p class="text-sm font-bold text-slate-800 uppercase tracking-tight">${session.titulo || session.nombre}</p>
                    </div>
                    <div class="bg-slate-50 p-4 rounded-2xl">
                        <p class="text-[10px] font-black text-slate-400 uppercase mb-1">Equipo</p>
                        <p class="text-[11px] font-bold text-slate-800 uppercase">${session.equiponombre}</p>
                    </div>
                    <div class="bg-slate-50 p-4 rounded-2xl">
                        <p class="text-[10px] font-black text-slate-400 uppercase mb-1">Fecha / Hora</p>
                        <p class="text-[11px] font-bold text-slate-800 uppercase">${session.fecha} | ${session.hora}</p>
                    </div>
                    <div class="bg-slate-50 p-4 rounded-2xl border-l-4 border-blue-500">
                        <p class="text-[10px] font-black text-slate-400 uppercase mb-1">Lugar</p>
                        <p class="text-[11px] font-bold text-slate-800 uppercase">${window.cleanLugar(session.lugar) || '--'}</p>
                    </div>
                </div>

                <div class="grid grid-cols-3 gap-8 mb-8">
                    <div class="col-span-2">
                        <div class="flex items-center gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                            <div>
                                <p class="text-[9px] font-black text-slate-400 uppercase mb-1">Convocatoria</p>
                                <p class="text-sm font-bold text-slate-800">${sessionPlayers.length} Jugadores</p>
                            </div>
                            <div class="w-px h-8 bg-slate-200"></div>
                            <div>
                                <p class="text-[9px] font-black text-slate-400 uppercase mb-1">Material Requerido</p>
                                <p class="text-sm font-bold text-slate-800">${uniqueMaterialList}</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <p class="text-2xl font-black text-blue-600 bg-blue-50 p-5 rounded-3xl border border-blue-100 text-center">${sessionTasks.length} <span class="text-[10px] text-blue-400 uppercase tracking-widest ml-1">Ejercicios</span></p>
                    </div>
                </div>

                <!-- NEW: Convocatoria Names List -->
                <div class="mb-8 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Listado de Jugadores Convocados</p>
                    <div class="flex flex-wrap gap-x-3 gap-y-2">
                        ${sessionPlayers.map(p => `
                            <span class="text-[10px] font-bold text-slate-700 flex items-center gap-1.5">
                                <span class="w-1 h-1 bg-blue-500 rounded-full"></span>
                                ${p.nombre}
                            </span>
                        `).join('') || '<span class="text-[10px] text-slate-400 italic">No hay jugadores asignados a esta sesión</span>'}
                    </div>
                </div>

                <div class="space-y-8">
                    <p class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b pb-2">Desglose de Tareas - Parte I</p>
                    ${sessionTasks.slice(0, 1).map((t, idx) => `
                        <div class="breakout-page">
                            <h4 class="text-sm font-black text-slate-800 uppercase border-l-4 border-blue-600 pl-3 py-1 mb-3">${idx + 1}. ${t.name}</h4>
                            <div class="grid grid-cols-2 gap-4 items-start">
                                <div class="space-y-2">
                                    ${t.image ? `<img src="${t.image}" class="w-full h-[220px] rounded-2xl object-contain border border-slate-100 bg-slate-50 shadow-sm">` : `<div class="w-full h-[220px] bg-slate-50 rounded-2xl flex items-center justify-center border border-dashed border-slate-200"><i data-lucide="image" class="w-8 h-8 text-slate-300"></i></div>`}
                                </div>
                                <div class="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col h-full min-h-[220px]">
                                    <p class="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Explicación Técnica</p>
                                    <p class="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap flex-1">${t.description || 'Sin descripción.'}</p>
                                    ${t.video ? `
                                        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                            <div class="flex items-center gap-2">
                                                <a href="${t.video.startsWith('http') ? t.video : `https://drive.google.com/open?id=${t.video}`}" target="_blank" class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/10 transition-all" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
                                                </a>
                                                <span class="text-[8px] font-black text-blue-600 uppercase">Ver Video Interactivo</span>
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <span class="text-[8px] font-black text-slate-400 uppercase text-right">Escanea<br>QR</span>
                                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(t.video.startsWith('http') ? t.video : `https://drive.google.com/open?id=${t.video}`)}" class="w-10 h-10 bg-white p-1 border rounded-lg">
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Additional Pages (2 tasks per page) -->
            ${(() => {
                let extraPages = '';
                const remaining = sessionTasks.slice(1);
                for (let i = 0; i < remaining.length; i += 2) {
                    const chunk = remaining.slice(i, i + 2);
                    extraPages += `
                        <div class="sheet-preview force-page-break" style="padding: 40px !important;">
                            <div class="space-y-6">
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 border-b pb-2">Desglose de Tareas - Parte ${Math.floor(i/2) + 2}</p>
                                ${chunk.map((t, idx) => {
                                    const totalIdx = i + idx + 2;
                                    return `
                                    <div class="breakout-page border-b border-slate-50 pb-6 last:border-0">
                                        <h4 class="text-sm font-black text-slate-800 uppercase border-l-4 border-blue-600 pl-3 py-1 mb-3">${totalIdx}. ${t.name}</h4>
                                        <div class="grid grid-cols-2 gap-4 items-start">
                                            <div class="space-y-2">
                                                ${t.image ? `<img src="${t.image}" class="w-full h-[220px] rounded-2xl object-contain border border-slate-100 bg-slate-50 shadow-sm">` : `<div class="w-full h-[220px] bg-slate-50 rounded-2xl flex items-center justify-center border border-dashed border-slate-200"><i data-lucide="image" class="w-8 h-8 text-slate-300"></i></div>`}
                                            </div>
                                            <div class="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col h-full min-h-[220px]">
                                                <p class="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Explicación Técnica</p>
                                                <p class="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap flex-1">${t.description || 'Sin descripción.'}</p>
                                                ${t.video ? `
                                                    <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                                        <div class="flex items-center gap-2">
                                                            <a href="${t.video.startsWith('http') ? t.video : `https://drive.google.com/open?id=${t.video}`}" target="_blank" class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/10 transition-all" style="-webkit-print-color-adjust: exact; print-color-adjust: exact;">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
                                                            </a>
                                                            <span class="text-[8px] font-black text-blue-600 uppercase">Ver Video</span>
                                                        </div>
                                                        <div class="flex items-center gap-2">
                                                            <span class="text-[8px] font-black text-slate-400 uppercase text-right">Escanea<br>QR</span>
                                                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(t.video.startsWith('http') ? t.video : `https://drive.google.com/open?id=${t.video}`)}" class="w-10 h-10 bg-white p-1 border rounded-lg">
                                                        </div>
                                                    </div>
                                                ` : ''}
                                        </div>
                                    </div>
                                </div>
                                `;}).join('')}
                            </div>
                        </div>
                    `;
                }
                return extraPages;
            })()}

            <footer class="mt-20 py-10 text-center no-print border-t border-slate-100">
                <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">RS CENTRO Tactician • Pro Reporting System • Powering Performance</p>
            </footer>
        `;
        
        document.body.appendChild(printDiv);
        if (window.lucide) lucide.createIcons();
    };


    async function renderEquipos(container) { 
        const [teams, allPlayers, allConvs, allSessions, allAttendance] = await Promise.all([
            db.getAll('equipos'),
            db.getAll('jugadores'),
            db.getAll('convocatorias'),
            db.getAll('sesiones'),
            db.getAll('asistencia')
        ]);
        
        // Calculate dynamic attendance for each team
        teams.forEach(t => {
            const teamReports = allAttendance.filter(r => r.equipoid && r.equipoid.toString() === t.id.toString());
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

        const sortedTeams = window.getSortedTeams(teams);

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                ${teams.map(e => {
                    const playersCount = allPlayers.filter(p => p.equipoid == e.id).length;
                    const tournamentsCount = allConvs.filter(c => c.equipoid == e.id && (c.tipo || '').toUpperCase() === 'TORNEO').length;
                    const sessionsCount = allSessions.filter(s => s.equipoid == e.id).length;

                    return `
                    <div onclick="window.editTeam(${e.id})" class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group cursor-pointer hover:border-blue-200 transition-all">
                        <div class="flex items-center gap-4 mb-6">
                            ${e.escudo ? `<img src="${e.escudo}" class="w-[45px] h-[45px] object-contain rounded-xl">` : `<div class="w-[45px] h-[45px] bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">${e.nombre.substring(0,2).toUpperCase()}</div>`}
                            <div>
                                <h4 class="font-bold text-slate-800">${e.nombre.split(' ||| ')[0]}</h4>
                                <p class="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-0.5">${e.nombre.includes(' ||| ') ? e.nombre.split(' ||| ')[1] : e.categoria || 'S/C'}</p>
                            </div>
                        </div>
                        <div class="space-y-4 mb-6">
                            <div class="flex justify-between items-end">
                                <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Asistencia Media</span>
                                <span class="text-sm font-black text-blue-600">${e.computedAsistencia || 0}%</span>
                            </div>
                            <div class="attendance-bar-bg"><div class="attendance-bar-fill" style="width: ${e.computedAsistencia || 0}%"></div></div>
                        </div>
                        <div class="grid grid-cols-3 gap-2">
                            <div class="bg-slate-50 p-3 rounded-xl text-center flex flex-col justify-center"><p class="text-[8px] font-black text-slate-300 uppercase">Plantilla</p><p class="text-sm font-black text-slate-700">${playersCount}</p></div>
                            <div class="bg-slate-50 p-3 rounded-xl text-center flex flex-col justify-center"><p class="text-[8px] font-black text-slate-300 uppercase">Torneos</p><p class="text-sm font-black text-blue-600">${tournamentsCount}</p></div>
                            <div class="bg-slate-50 p-3 rounded-xl text-center flex flex-col justify-center"><p class="text-[8px] font-black text-slate-300 uppercase">Sesiones</p><p class="text-sm font-black text-emerald-600">${sessionsCount}</p></div>
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
                `;}).join('')}
            </div>
        `;
    }


    window.deleteTeam = async (id) => {
        window.customConfirm(
            '¿Eliminar Equipo?',
            'Se borrarán los datos del equipo. Los jugadores asociados dejarán de estar asignados.',
            async () => {
                await db.delete('equipos', Number(id));
                window.switchView('equipos');
            }
        );
    };

    window.editTeam = async (id) => {
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
                             <input name="nombre" value="${team.nombre.split(' ||| ')[0].toUpperCase()}" class="w-full p-3 border rounded-xl" required>
                        </div>
                        <div class="col-span-2">
                             <label class="block text-xs font-bold text-slate-400 uppercase mb-3">Años de Nacimiento (Categoría)</label>
                             <div class="grid grid-cols-3 gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 max-h-40 overflow-y-auto custom-scrollbar">
                                 ${[2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020].map(y => {
                                     const currentYears = team.nombre.includes(' ||| ') ? team.nombre.split(' ||| ')[1].split(', ').map(s=>s.trim()) : [team.categoria?.toString()];
                                     return `
                                        <label class="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 transition-all">
                                            <input type="checkbox" name="categoria" value="${y}" ${currentYears.includes(y.toString()) ? 'checked' : ''} class="edit-year-checkbox w-4 h-4 rounded text-blue-600">
                                            <span class="text-[10px] font-black text-slate-600">${y}</span>
                                        </label>
                                     `;
                                 }).join('')}
                             </div>
                        </div>
                        <div class="col-span-2">
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Escudo del Equipo</label>
                            <div class="flex items-center gap-4 p-4 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50">
                                <div id="edit-crest-preview">
                                    ${team.escudo ? `<img src="${team.escudo}" class="h-[51px] w-[51px] object-contain">` : `<i data-lucide="shield" class="w-10 h-10 text-slate-300"></i>`}
                                </div>
                                <input type="file" id="edit-team-crest-input" accept="image/*" class="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700">
                            </div>
                        </div>
                        <div class="col-span-2">
                            <div class="flex justify-between items-center mb-4">
                                <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Vincular Jugadores (Filtrados por Año)</label>
                                <button type="button" id="edit-select-all-btn" class="text-[9px] font-black text-blue-600 uppercase hover:text-blue-700 transition-colors">Seleccionar Todos</button>
                            </div>
                            <div id="edit-linked-players-list" class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <!-- Filered players will load here -->
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-4 mt-6">
                        <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
                        <button type="submit" class="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        `;
        
        const yearInput = document.getElementById('edit-team-year-input');
        const listDiv = document.getElementById('edit-linked-players-list');
        
        const updatePlayerLinkage = () => {
            const selectedYears = [...document.querySelectorAll('.edit-year-checkbox:checked')].map(cb => cb.value);
            const filtered = players.filter(p => selectedYears.length === 0 || selectedYears.includes(p.anionacimiento?.toString()));
            listDiv.innerHTML = filtered.map(p => `
                <label class="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-xl cursor-pointer hover:border-blue-200 transition-all">
                    <input type="checkbox" name="linkedPlayerIds" value="${p.id}" ${p.equipoid == team.id ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600">
                    <div class="flex-1 min-w-0">
                         <p class="text-[10px] font-bold text-slate-700 truncate">${p.nombre}</p>
                         <p class="text-[8px] font-black text-slate-400 uppercase">${p.anionacimiento || '----'}</p>
                    </div>
                </label>
            `).join('') || `<p class="col-span-full p-8 text-center text-xs text-slate-400 italic font-medium">No hay jugadores para estos años.</p>`;
        };

        document.querySelectorAll('.edit-year-checkbox').forEach(cb => cb.addEventListener('change', updatePlayerLinkage));
        updatePlayerLinkage();
        
        document.getElementById('edit-select-all-btn').onclick = () => {
            const checkboxes = listDiv.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = true);
        };
        
        lucide.createIcons(); modalOverlay.classList.add('active');
        

        document.getElementById('edit-team-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Guardando...';

            try {
                const formData = new FormData(e.target);
                const selectedYears = formData.getAll('categoria');
                const catStr = selectedYears.join(', ');
                const data = { 
                    ...team,
                    id: parseInt(formData.get('id')),
                    nombre: `${formData.get('nombre').toString().trim().toUpperCase()} ||| ${catStr}`,
                    categoria: parseInt(selectedYears[0]) || null
                };
                
                const imgInput = document.getElementById('edit-team-crest-input');
                if (imgInput.files[0]) {
                    const url = await db.uploadImage(imgInput.files[0]);
                    if (url) data.escudo = url;
                } else {
                    data.escudo = team.escudo;
                }

                const linkedPlayerIds = formData.getAll('linkedPlayerIds').map(id => parseInt(id));
                
                // Update individual players
                for (const p of players) {
                    const isNowLinked = linkedPlayerIds.includes(p.id);
                    const wasLinked = p.equipoid == data.id;

                    if (isNowLinked && !wasLinked) {
                        p.equipoid = data.id;
                        await db.update('jugadores', p);
                    } else if (!isNowLinked && wasLinked) {
                        p.equipoid = null;
                        await db.update('jugadores', p);
                    }
                }


                
                await db.update('equipos', data);
                closeModal();
                
                window.customAlert('¡Cambios Guardados!', 'El equipo se ha actualizado correctamente en el sistema.', 'success');
                window.switchView('equipos');
            } catch (err) {
                console.error("Error saving team:", err);
                window.customAlert('Error al guardar', 'Supabase ha rechazado el cambio: ' + (err.message || err), 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    };

    window.viewTeamPlayers = async (equipoid) => {
        try {
            const userRes = await supabaseClient.auth.getUser();
            const currentUser = userRes.data?.user;
            if (!currentUser) return;

            // Fetch all data from Supabase for real-time consistency
            const { data: teams } = await supabaseClient.from('equipos').select('*');
            const team = (teams || []).find(t => t.id == equipoid);
            if (!team) return;

            const { data: allPlayers } = await supabaseClient.from('jugadores').select('*').eq('equipoid', equipoid);
            const teamPlayers = allPlayers || [];
            
            const { data: allSessions } = await supabaseClient.from('sesiones').select('*').eq('equipoid', equipoid);
            const teamSessions = (allSessions || []).sort((a,b) => b.fecha.localeCompare(a.fecha));
            
            const { data: allTasks } = await supabaseClient.from('tareas').select('*');
            const sessionTaskIds = [...new Set(teamSessions.flatMap(s => s.taskids || []))];
            const teamTasks = sessionTaskIds.map(tid => (allTasks || []).find(t => t.id == tid)).filter(Boolean);

            const { data: allConvs } = await supabaseClient.from('convocatorias').select('*').eq('equipoid', equipoid);
            const teamTournaments = (allConvs || []).filter(c => (c.tipo || '').toUpperCase() === 'TORNEO').sort((a,b) => b.fecha.localeCompare(a.fecha));

            const wrapper = document.createElement('div');
            wrapper.className = 'animate-in fade-in slide-in-from-right duration-500 max-w-7xl mx-auto pb-20';
            
            // Per-team formation state
            if (!window.formationsState) window.formationsState = { teams: {}, torneos: {}, convocatorias: {} };
            const currentFormationId = (window.formationsState.teams && window.formationsState.teams[equipoid.toString()]) || 'F11_433';

            wrapper.innerHTML = `
                <!-- Header -->
                <div class="flex justify-between items-center mb-10 px-4 pt-8">
                    <div class="flex items-center gap-6">
                        <button onclick="window.switchView('equipos')" class="p-3 bg-white rounded-2xl shadow-sm hover:bg-red-50 hover:text-red-500 transition-all border border-slate-100"><i data-lucide="arrow-left" class="text-slate-600"></i></button>
                        <div>
                            <h2 class="text-4xl font-black text-slate-900 tracking-tight uppercase">${team.nombre}</h2>
                            <p class="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mt-1">${team.categoria || 'Sin Categoría'} • ${teamPlayers.length} Jugadores</p>
                        </div>
                    </div>
                    <div class="flex gap-3">
                         <button onclick="window.addPlayerToTeam('${equipoid}')" class="px-8 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:scale-105 transition-all text-[11px] uppercase tracking-widest">Añadir Jugador</button>
                    </div>
                </div>

                <!-- Summary Row: 3 Columns -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 mb-8">
                    
                    <!-- Col 1: Tasks -->
                    <div class="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col min-h-[400px]">
                        <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <i data-lucide="target" class="w-4 h-4 text-emerald-500"></i>
                            Tareas Trabajadas
                        </h4>
                        <div class="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                            ${teamTasks.slice(0, 10).map(t => `
                                <div onclick="window.viewTask(${t.id})" class="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-white border border-transparent hover:border-emerald-100 transition-all group cursor-pointer">
                                    <div class="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center font-black text-[9px] uppercase group-hover:bg-emerald-600 group-hover:text-white transition-all">${t.type?.substring(0,3) || 'TAR'}</div>
                                    <div class="flex-1 min-w-0">
                                        <h4 class="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">${t.name}</h4>
                                        <p class="text-[8px] font-black text-emerald-600 uppercase tracking-tighter mt-1">${t.type || 'General'}</p>
                                    </div>
                                    <i data-lucide="external-link" class="w-4 h-4 text-slate-200 group-hover:text-emerald-400 transition-all"></i>
                                </div>
                            `).join('') || '<p class="text-center py-20 text-slate-300 font-bold uppercase text-[10px]">Sin tareas registradas</p>'}
                        </div>
                    </div>

                    <!-- Col 2: Sessions -->
                    <div class="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col min-h-[400px]">
                        <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <i data-lucide="calendar" class="w-4 h-4 text-indigo-500"></i>
                            Historial de Sesiones
                        </h4>
                        <div class="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                            ${teamSessions.slice(0, 10).map(s => `
                                <div onclick="window.viewSessionFicha('${s.id}')" class="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-white border border-transparent hover:border-indigo-100 transition-all group cursor-pointer">
                                    <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-black text-indigo-600 shadow-sm border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">${s.fecha.split('-')[2]}</div>
                                    <div class="flex-1 min-w-0">
                                        <h4 class="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">${s.titulo || s.nombre}</h4>
                                        <p class="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">${s.fecha}</p>
                                    </div>
                                    <i data-lucide="external-link" class="w-4 h-4 text-slate-200 group-hover:text-indigo-400 transition-all"></i>
                                </div>
                            `).join('') || '<p class="text-center py-20 text-slate-300 font-bold uppercase text-[10px]">Sin sesiones registradas</p>'}
                        </div>
                    </div>

                    <!-- Col 3: Tournaments -->
                    <div class="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col min-h-[400px]">
                        <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <i data-lucide="award" class="w-4 h-4 text-amber-500"></i>
                            Historial de Torneos
                        </h4>
                        <div class="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                            ${teamTournaments.slice(0, 10).map(t => `
                                <div onclick="window.viewTorneoRendimiento('${t.id}')" class="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-white border border-transparent hover:border-amber-100 transition-all group cursor-pointer">
                                    <div class="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-amber-600 group-hover:text-white transition-all">
                                        <i data-lucide="trophy" class="w-5 h-5"></i>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <h4 class="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">${t.nombre}</h4>
                                        <p class="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">${t.fecha}</p>
                                    </div>
                                    <i data-lucide="external-link" class="w-4 h-4 text-slate-200 group-hover:text-amber-400 transition-all"></i>
                                </div>
                            `).join('') || '<p class="text-center py-20 text-slate-300 font-bold uppercase text-[10px]">Sin torneos registrados</p>'}
                        </div>
                    </div>

                </div>

                <!-- Squad List: Full Width -->
                <div class="px-4 mb-12">
                    <div class="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                        <div class="flex justify-between items-center mb-8">
                            <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <i data-lucide="users" class="w-4 h-4 text-blue-500"></i>
                                Plantilla / Jugadores
                            </h4>
                            <span class="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">${teamPlayers.length} Futbolistas</span>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            ${teamPlayers.map(p => `
                                <div onclick="window.viewPlayer('${p.id}')" class="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-white border border-transparent hover:border-blue-100 transition-all group cursor-pointer">
                                    <div class="w-11 h-11 bg-white rounded-xl flex items-center justify-center font-black text-blue-600 shadow-sm border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all text-xs">${p.dorsal || '--'}</div>
                                    <div class="flex-1 min-w-0">
                                        <h4 class="text-[11px] font-black text-slate-800 uppercase tracking-tight truncate">${p.nombre}</h4>
                                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">${p.posicion || 'Sin posición'}</p>
                                    </div>
                                    <i data-lucide="chevron-right" class="w-4 h-4 text-slate-200 group-hover:text-blue-400 transition-all"></i>
                                </div>
                            `).join('') || '<p class="col-span-full text-center py-20 text-slate-300 font-bold uppercase text-[10px]">Sin jugadores registrados</p>'}
                        </div>
                    </div>
                </div>

                <div class="px-4">
                    <div class="bg-slate-900 p-10 rounded-[4rem] shadow-2xl relative overflow-hidden">
                        <i data-lucide="map" class="absolute -bottom-10 -right-10 w-64 h-64 text-white/5"></i>
                        <div class="flex justify-between items-center mb-10 relative z-10">
                            <div>
                                <h4 class="text-xs font-black text-blue-400 uppercase tracking-[0.2em]">Mapa Táctico de Plantilla</h4>
                                <p class="text-[10px] text-white/40 font-bold mt-1">Visualización de todos los jugadores según posición técnica</p>
                            </div>
                            <div class="flex items-center gap-3">
                                <select onchange="window.updateTeamPitch(this.value, '${equipoid}')" class="p-3 bg-slate-800 border border-slate-700 rounded-xl text-[10px] font-black uppercase text-white outline-none shadow-sm cursor-pointer">
                                    ${Object.entries(FORMATIONS).map(([fid, f]) => `
                                        <option value="${fid}" ${fid === currentFormationId ? 'selected' : ''}>${f.name}</option>
                                    `).join('')}
                                </select>
                                <button onclick="window.openFullScreenPitch('team', '${equipoid}', '${currentFormationId}')" class="bg-white/5 border border-white/10 px-6 py-3 rounded-xl text-[10px] font-bold text-white/60 uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2">
                                    <i data-lucide="maximize" class="w-4 h-4"></i>
                                    Versión Panorámica
                                </button>
                            </div>
                        </div>
                        
                        <div id="team-pitch-container" class="relative z-10 w-full flex items-center justify-center">
                            <div class="w-full max-w-[1000px]">
                                ${renderTacticalPitchHtml(teamPlayers, currentFormationId, 'horizontal')}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            contentContainer.innerHTML = '';
            contentContainer.appendChild(wrapper);
            if (window.lucide) lucide.createIcons();
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (err) {
            console.error("Error viewTeamPlayers:", err);
            window.customAlert('Error', 'No se pudo cargar la vista de equipo.', 'error');
        }
    };

    window.updateTeamPitch = (formationId, equipoid) => {
        if (!window.formationsState) window.formationsState = { teams: {}, torneos: {}, convocatorias: {} };
        window.formationsState.teams[equipoid.toString()] = formationId;
        
        // Persistir en localStorage
        localStorage.setItem('ms_coach_formation_state', JSON.stringify(window.formationsState));
        
        window.viewTeamPlayers(equipoid);
    };

    window.openFullScreenPitch = async (type, id, formation) => {
        let players = [];
        
        // Resolución robusta de la formación actual
        let currentFormation = formation || 'F11_433';
        
        // Si nos llega la por defecto, intentamos buscar una más específica en el estado global
        if (!window.formationsState) {
            const saved = localStorage.getItem('ms_coach_formation_state');
            if (saved) window.formationsState = JSON.parse(saved);
        }

        if (currentFormation === 'F11_433' && window.formationsState) {
            if (type === 'team' && window.formationsState.teams) currentFormation = window.formationsState.teams[id] || 'F11_433';
            else if (type === 'torneo' && window.formationsState.torneos) currentFormation = window.formationsState.torneos[id] || 'F11_433';
            else if (type === 'conv' && window.formationsState.torneos) currentFormation = window.formationsState.torneos[id] || 'F11_433';
            else if (type === 'conv' && window.formationsState.convocatorias) currentFormation = window.formationsState.convocatorias[id] || 'F11_433';
        }

        if (type === 'team') {
            const { data: teamPlayers } = await supabaseClient.from('jugadores').select('*').eq('equipoid', id);
            players = teamPlayers || [];
        } else if (type === 'scouting') {
            const allPlayers = await db.getAll('jugadores');
            players = allPlayers.filter(p => {
                const teamMatch = campogramaFilters.equipos.length === 0 || campogramaFilters.equipos.includes((p.equipoid || "").toString());
                const levelMatch = campogramaFilters.niveles.length === 0 || campogramaFilters.niveles.includes(Number(p.nivel || 3));
                const posMatch = campogramaFilters.posiciones.length === 0 || campogramaFilters.posiciones.includes(p.posicion);
                const yearMatch = campogramaFilters.years.length === 0 || campogramaFilters.years.includes(p.anionacimiento?.toString());
                const clubMatch = campogramaFilters.clubesConvenidos.length === 0 || campogramaFilters.clubesConvenidos.includes(p.equipoConvenido);
                return teamMatch && levelMatch && posMatch && yearMatch && clubMatch;
            });
        } else {
            // Convocatoria or Torneo - Fetch from Supabase for consistency
            const { data: conv } = await supabaseClient.from('convocatorias').select('*').eq('id', id).single();
            if (conv) {
                const allPlayers = await db.getAll('jugadores');
                const pids = Array.isArray(conv.playerids) ? conv.playerids.map(x => x.toString()) : [];
                players = allPlayers.filter(p => pids.includes(p.id.toString()));
            }
        }
        
        const fsDiv = document.createElement('div');
        fsDiv.className = 'fixed inset-0 z-[1000] bg-slate-900 p-10 flex flex-col animate-in fade-in zoom-in duration-300';
        fsDiv.innerHTML = `
            <div class="flex justify-between items-center mb-10">
                <div>
                    <h2 class="text-white text-3xl font-black uppercase tracking-tight">Pizarra Táctica Panorámica</h2>
                    <p class="text-blue-400 text-xs font-bold uppercase tracking-widest mt-1">Vista del sistema: ${FORMATIONS[currentFormation]?.name || currentFormation}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="p-5 bg-white/5 text-white rounded-full hover:bg-white/20 transition-all border border-white/10"><i data-lucide="x" class="w-10 h-10"></i></button>
            </div>
            <div class="flex-1 flex justify-center items-center overflow-hidden p-4 md:p-8">
                <div class="w-full h-full flex items-center justify-center">
                    <div class="w-full max-w-[1400px] h-fit max-h-full">
                        ${renderTacticalPitchHtml(players, currentFormation, 'horizontal')}
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(fsDiv);
        if (window.lucide) lucide.createIcons();
    };

    window.addPlayerToTeam = (equipoid) => {
        modalContainer.innerHTML = `
            <div class="p-8">
                <h3 class="text-2xl font-bold mb-6 text-slate-800">Nuevo Jugador</h3>
                <form id="new-player-form" class="space-y-4">
                    <input type="hidden" name="equipoid" value="${equipoid}">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="col-span-2"><input name="nombre" placeholder="Nombre completo" class="w-full p-3 border rounded-xl" required></div>
                        <div class="col-span-2">
                             <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Posiciones del Jugador</label>
                             ${window.renderPositionSelector()}
                        </div>
                        <select name="pie" class="w-full p-3 border rounded-xl bg-white outline-none">
                            <option value="">Selecciona Pie...</option>
                            <option value="DIESTRO">DIESTRO</option>
                            <option value="ZURDO">ZURDO</option>
                            <option value="AMBIDIESTRO">AMBIDIESTRO</option>
                        </select>
                        <select name="sexo" class="w-full p-3 border rounded-xl bg-white outline-none">
                            <option value="Masculino">Masculino</option>
                            <option value="Femenino">Femenino</option>
                            <option value="Otro">Otro</option>
                        </select>
                        <textarea name="notas" placeholder="Notas adicionales..." class="col-span-2 w-full p-3 border rounded-xl h-24"></textarea>

                    </div>
                    <div class="flex gap-4 mt-6">
                        <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
                        <button type="submit" class="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">Guardar Jugador</button>
                    </div>
                </form>
            </div>
        `;
        document.getElementById('new-player-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            if (data.nombre) data.nombre = data.nombre.toUpperCase().trim();
            data.posicion = formData.getAll('posicion').join(', ');
            await db.add('jugadores', data);
            window.viewTeamPlayers(equipoid);
            closeModal();
        });
        
    };

    window.renderJugadores = async function(container, onlyTable = false) {
        try {
            const players = await db.getAll('jugadores');
            const teams = await db.getAll('equipos');
            const sortedTeams = window.getSortedTeams(teams);
            
            if (!window.currentPlayerTeamTab) window.currentPlayerTeamTab = 'all';
            if (!window.playerFilters) {
                window.playerFilters = { 
                    search: '', 
                    teams: [], 
                    clubs: [], 
                    positions: [], 
                    levels: [] 
                };
            }

            if (!onlyTable) {
                container.innerHTML = `
                    <!-- Sub-tabs -->
                    <div class="mb-8 flex flex-wrap gap-2 animate-in slide-in-from-left duration-500">
                        <button onclick="window.switchPlayerTeamTab('all')" class="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${window.currentPlayerTeamTab === 'all' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}">
                            TODOS LOS JUGADORES
                        </button>
                        ${sortedTeams.map(t => `
                            <button onclick="window.switchPlayerTeamTab('${t.id}')" class="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${window.currentPlayerTeamTab.toString() === t.id.toString() ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}">
                                ${t.nombre}
                            </button>
                        `).join('')}
                        <button onclick="window.switchPlayerTeamTab('none')" class="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${window.currentPlayerTeamTab === 'none' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}">
                            JUGADORES LIBRES
                        </button>
                    </div>

                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                        <div class="flex flex-wrap flex-1 gap-3 w-full">
                            <div class="relative flex-1 min-w-[300px]">
                                <i data-lucide="search" class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                <input type="text" id="player-search-input" value="${window.playerFilters.search}" placeholder="Buscar jugador..." class="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm focus:ring-4 ring-blue-50 outline-none transition-all shadow-sm" oninput="window.togglePlayerFilter('search', this.value)">
                            </div>
                            
                            <!-- Multi-Select Filters -->
                            <div class="flex flex-wrap gap-2">
                                ${(() => {
                                    const renderFilter = (id, label, options, currentValues) => {
                                        const displayText = currentValues.length === 0 ? `TODOS ${label}` : `${currentValues.length} ${label}`;
                                        return `
                                            <div class="relative group/ms">
                                                <button id="${id}-btn" onclick="document.querySelectorAll('[id$=-menu]').forEach(m => m.id !== '${id}-menu' && m.classList.add('hidden')); document.getElementById('${id}-menu').classList.toggle('hidden')" 
                                                    class="px-5 py-3 bg-white border border-slate-100 rounded-2xl text-[10px] font-black text-slate-600 outline-none focus:ring-4 ring-blue-50 transition-all shadow-sm flex items-center gap-2 hover:border-blue-200">
                                                    <span>${displayText.toUpperCase()}</span>
                                                    <i data-lucide="chevron-down" class="w-3 h-3 opacity-50"></i>
                                                </button>
                                                <div id="${id}-menu" class="hidden absolute top-full left-0 mt-2 w-64 bg-white border border-slate-100 rounded-3xl shadow-2xl z-[100] p-4 max-h-72 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-200">
                                                    <div class="space-y-1">
                                                        <label class="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                                            <input type="checkbox" onchange="window.togglePlayerFilter('${id}', 'TODOS')" ${currentValues.length === 0 ? 'checked' : ''} class="w-5 h-5 rounded-md border-2 border-slate-200 text-blue-600 focus:ring-4 focus:ring-blue-100">
                                                            <span class="text-xs font-black text-slate-400 uppercase">Todos</span>
                                                        </label>
                                                        <div class="h-px bg-slate-50 my-2"></div>
                                                        ${options.map(opt => {
                                                            const isSelected = currentValues.includes(opt.value.toString());
                                                            return `
                                                                <label class="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                                                    <input type="checkbox" onchange="window.togglePlayerFilter('${id}', '${opt.value}')" ${isSelected ? 'checked' : ''} class="w-5 h-5 rounded-md border-2 border-slate-200 text-blue-600 focus:ring-4 focus:ring-blue-100">
                                                                    <span class="text-xs font-bold ${isSelected ? 'text-blue-600' : 'text-slate-600'} uppercase">${opt.label}</span>
                                                                </label>
                                                            `;
                                                        }).join('')}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                };

                                    return `
                                        ${window.currentPlayerTeamTab === 'all' ? renderFilter('team', 'Equipos', sortedTeams.map(t=>({value:t.id, label:t.nombre})).concat([{value:'SIN_EQUIPO', label:'Libres'}]), window.playerFilters.teams) : ''}
                                        ${renderFilter('club', 'Clubes', [...new Set(players.map(p => (p.equipoConvenido || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase()).filter(c => c))].sort().map(c=>({value:c, label:c})), window.playerFilters.clubs)}
                                        ${renderFilter('pos', 'Posiciones', PLAYER_POSITIONS.map(p=>({value:p, label:p})), window.playerFilters.positions)}
                                        ${renderFilter('level', 'Niveles', [1,2,3,4,5].map(lvl=>({value:lvl, label:`Nivel ${'★'.repeat(lvl)}`})), window.playerFilters.levels)}
                                    `;
                                })()}
                            </div>
                        </div>
                    </div>

                    <div id="players-table-container">
                        <!-- Se inyecta vía updateTable -->
                    </div>
                `;
            }

            const tableContainer = onlyTable ? document.getElementById('players-table-container') : container.querySelector('#players-table-container');

            window.switchPlayerTeamTab = (tab) => {
                window.currentPlayerTeamTab = tab;
                window.renderJugadores(document.getElementById('content-container'));
            };

            const updateTable = () => {
                if (!tableContainer) return;

                const searchVal = (window.playerFilters.search || '').toLowerCase();
                
                const filtered = (players || []).filter(p => {
                    const matchesSearch = (p.nombre || '').toLowerCase().includes(searchVal);
                    
                    let matchesTeam = true;
                    if (window.currentPlayerTeamTab === 'none') {
                        matchesTeam = !p.equipoid;
                    } else if (window.currentPlayerTeamTab !== 'all') {
                        matchesTeam = p.equipoid?.toString() === window.currentPlayerTeamTab.toString();
                    } else {
                        // Tab "Todos": usar filtro multi-select si hay algo seleccionado
                        matchesTeam = window.playerFilters.teams.length === 0 || 
                                     (window.playerFilters.teams.includes('SIN_EQUIPO') && !p.equipoid) ||
                                     (window.playerFilters.teams.includes(p.equipoid?.toString()));
                    }
                    
                    const matchesClub = window.playerFilters.clubs.length === 0 || window.playerFilters.clubs.includes((p.equipoConvenido || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase());
                    const matchesPos = window.playerFilters.positions.length === 0 || window.playerFilters.positions.some(pos => (p.posicion || '').includes(pos));
                    const matchesLevel = window.playerFilters.levels.length === 0 || window.playerFilters.levels.includes(p.nivel?.toString());
                    
                    return matchesSearch && matchesTeam && matchesClub && matchesPos && matchesLevel;
                });

                tableContainer.innerHTML = `
                    <!-- Desktop View (Table) -->
                    <div class="hidden md:block bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                        <table class="w-full border-collapse">
                            <thead>
                                <tr class="bg-slate-50/50 text-left border-b border-slate-100">
                                    <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jugador</th>
                                    <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipo RS</th>
                                    <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Club</th>
                                    <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Posición</th>
                                    <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center font-bold">Nivel</th>
                                    <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-50">
                                ${filtered.map(p => {
                                    const playerTeam = teams.find(t => t.id == p.equipoid);
                                    let levelVal = Math.min(Math.max(parseInt(p.nivel) || 1, 1), 5);

                                    return `
                                        <tr class="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-all group">
                                            <td class="px-8 py-4 flex items-center gap-4 min-w-[280px]">
                                                ${p.foto ? 
                                                    `<img src="${p.foto}" class="w-10 h-10 rounded-xl object-cover shadow-sm transition-all">` :
                                                    `<div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm shadow-sm">${(p.nombre || 'J').substring(0,1).toUpperCase()}</div>`
                                                }
                                                <div class="flex-1">
                                                    <span contenteditable="true" onblur="window.updatePlayerField('${p.id}', 'nombre', this.textContent)" class="text-sm font-black text-slate-800 uppercase tracking-tight block outline-none px-1 rounded-md transition-all hover:bg-slate-100 focus:bg-white focus:ring-2 ring-blue-100 cursor-text">${p.nombre}</span>
                                                    <span contenteditable="true" onblur="window.updatePlayerField('${p.id}', 'anionacimiento', this.textContent)" class="text-[9px] font-black text-slate-300 uppercase tracking-widest block mt-0.5 px-1 outline-none hover:bg-slate-100 rounded cursor-text">${p.anionacimiento || '----'}</span>
                                                </div>
                                            </td>
                                            <td class="px-8 py-4 text-center">
                                                <select onchange="window.updatePlayerField('${p.id}', 'equipoid', this.value)" class="bg-transparent border-none text-[10px] font-bold text-slate-600 uppercase tracking-tight outline-none focus:ring-2 ring-blue-50 rounded p-1 cursor-pointer">
                                                    <option value="">LIBRE</option>
                                                    ${sortedTeams.map(t => `<option value="${t.id}" ${p.equipoid == t.id ? 'selected' : ''}>${t.nombre.split(' ||| ')[0].toUpperCase()}</option>`).join('')}
                                                </select>
                                            </td>
                                            <td class="px-8 py-4 text-center">
                                                <select onchange="window.updatePlayerField('${p.id}', 'equipoConvenido', this.value)" class="bg-transparent border-none text-[10px] font-bold text-slate-400 uppercase tracking-tight outline-none focus:ring-2 ring-blue-50 rounded p-1 cursor-pointer">
                                                    <option value="">NINGUNO</option>
                                                    ${CLUBES_CONVENIDOS.map(c => `<option value="${c}" ${p.equipoConvenido === c ? 'selected' : ''}>${c}</option>`).join('')}
                                                </select>
                                            </td>
                                            <td class="px-8 py-4 text-center">
                                                <select onchange="window.updatePlayerField('${p.id}', 'posicion', this.value)" class="bg-slate-100 border-none text-[9px] font-black text-slate-600 uppercase tracking-widest rounded-lg px-2 py-1 outline-none focus:ring-2 ring-blue-50 cursor-pointer">
                                                    <option value="">S/P</option>
                                                    ${PLAYER_POSITIONS.map(pos => `<option value="${pos}" ${p.posicion === pos ? 'selected' : ''}>${pos}</option>`).join('')}
                                                </select>
                                            </td>
                                            <td class="px-8 py-4 text-center">
                                                <div class="flex items-center justify-center gap-0.5 text-slate-200 hover:text-amber-400 transition-colors cursor-pointer" onclick="const newLvl = (parseInt('${p.nivel}')||0)%5+1; window.updatePlayerField('${p.id}', 'nivel', newLvl)">
                                                    ${Array.from({length: 5}, (_, i) => i < levelVal ? '<span class="text-amber-400">★</span>' : '<span>★</span>').join('')}
                                                </div>
                                            </td>
                                            <td class="px-8 py-4 text-right">
                                                <div class="flex justify-end gap-1">
                                                    <button onclick="window.viewPlayer('${p.id}')" title="Ver Ficha" class="p-2 bg-white shadow-sm border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                                        <i data-lucide="eye" class="w-4 h-4"></i>
                                                    </button>
                                                    <button onclick="window.editPlayer('${p.id}')" title="Editar Completo" class="p-2 bg-white shadow-sm border border-slate-100 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all">
                                                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                                                    </button>
                                                    <button onclick="window.deletePlayer('${p.id}')" title="Eliminar" class="p-2 bg-white shadow-sm border border-slate-100 rounded-xl text-red-200 hover:text-red-600 hover:bg-red-50 transition-all">
                                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('') || `<tr><td colspan="6" class="py-24 text-center text-slate-300 italic">No hay jugadores registrados</td></tr>`}
                            </tbody>
                        </table>
                    </div>

                    <!-- Mobile View (Cards) -->
                    <div class="md:hidden space-y-3">
                        ${filtered.length > 0 ? filtered.map(p => {
                            const team = teams.find(t => t.id == p.equipoid);
                            let levelVal = parseInt(p.nivel) || 1;
                            return `
                                <div onclick="window.viewPlayer(${p.id})" class="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-center gap-3 active:scale-[0.98] transition-all">
                                    <div class="relative">
                                        ${p.foto ? 
                                            `<img src="${p.foto}" class="w-14 h-14 rounded-2xl object-cover">` :
                                            `<div class="w-14 h-14 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center font-black text-lg">${(p.nombre || 'J').substring(0,1).toUpperCase()}</div>`
                                        }
                                        <div class="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 text-white rounded-lg flex items-center justify-center text-[10px] font-black border-2 border-white">${p.dorsal || '--'}</div>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <h4 class="font-bold text-slate-800 text-sm truncate">${p.nombre}</h4>
                                        <div class="flex items-center gap-2 mt-0.5">
                                            <span class="text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-1.5 py-0.5 rounded">${p.posicion || 'S/P'}</span>
                                            <span class="text-[9px] font-bold text-slate-400 uppercase truncate">${team ? team.nombre : 'Libre'}</span>
                                            ${p.equipoConvenido ? `<span class="text-[9px] font-bold text-emerald-600 uppercase truncate bg-emerald-50 px-1.5 py-0.5 rounded">${p.equipoConvenido}</span>` : ''}
                                        </div>
                                    </div>
                                    <div class="flex flex-col items-end gap-2">
                                         <div class="flex text-amber-400 text-[8px]">${'★'.repeat(levelVal)}</div>
                                         <button onclick="event.stopPropagation(); window.deletePlayer(${p.id})" class="p-2 text-red-300 hover:text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                                    </div>
                                </div>
                            `;
                        }).join('') : `
                                 <p class="text-xs text-slate-400">Sin resultados</p>
                             </div>
                        `}
                    </div>
                `;
                if (window.lucide) lucide.createIcons();
            };

            window.togglePlayerFilter = async (type, value) => {
                if (type === 'search') {
                    window.playerFilters.search = value;
                    updateTable();
                    return;
                }
                const filterKey = type === 'team' ? 'teams' : type === 'club' ? 'clubs' : type === 'pos' ? 'positions' : 'levels';
                if (value === 'TODOS') {
                    window.playerFilters[filterKey] = [];
                } else {
                    const idx = window.playerFilters[filterKey].indexOf(value.toString());
                    if (idx > -1) window.playerFilters[filterKey].splice(idx, 1);
                    else window.playerFilters[filterKey].push(value.toString());
                }
                await window.renderJugadores(container);
                // Mantener el menú abierto tras el re-render
                const menu = document.getElementById(`${type}-menu`);
                if (menu) menu.classList.remove('hidden');
            };

            updateTable();
            if (window.lucide) lucide.createIcons();
        } catch (err) {
            console.error("Error en renderJugadores:", err);
            container.innerHTML = `<div class="p-20 text-center text-red-500 font-bold uppercase tracking-widest text-xs">Error al cargar listado: ${err.message}</div>`;
        }
    }

    window.updatePlayerField = async (id, field, value) => {
        let cleanValue = typeof value === 'string' ? value.trim() : value;
        if (field === 'nombre' || field === 'posicion' || field === 'equipoConvenido') cleanValue = cleanValue.toUpperCase();
        
        try {
            // Usar db.update para sincronizar tanto localmente como en la nube
            await db.update('jugadores', { id: Number(id), [field]: cleanValue });
            
            // Si el campo afecta visualmente o a los filtros, refrescamos la tabla
            if (['nivel', 'nombre', 'posicion', 'equipoConvenido', 'equipoid', 'anionacimiento'].includes(field)) {
                const container = document.getElementById('content-container');
                if (container) await window.renderJugadores(container, true);
            }
        } catch (err) {
            console.error('Error actualizando jugador:', err);
            window.customAlert('Error', 'No se pudo guardar el cambio', 'error');
        }
    };

    window.editPlayer = async (id) => {
        await window.viewPlayer(id);
    };

    window.viewPlayer = async (id) => {
        const currentUserRes = await supabaseClient.auth.getUser();
        const currentUser = currentUserRes.data.user;

        const { data: allConvs } = await (supabaseClient.from('convocatorias').select('*'));
        const { data: allSess } = await (supabaseClient.from('sesiones').select('*'));
        const { data: allAsistencia } = await (supabaseClient.from('asistencia').select('*'));
        const teams = await db.getAll('equipos');
        const players = await db.getAll('jugadores');
        const player = players.find(p => p.id == id);
        if (!player) return;

        // Helper para visibilidad (igual que en el calendario)
        const isSharedWithMe = (item) => {
            if (item.sharedWith) {
                const sw = Array.isArray(item.sharedWith) ? item.sharedWith : [item.sharedWith.toString()];
                if (sw.includes(currentUser.id)) return true;
            }
            if (item.lugar && item.lugar.includes(' ||| ')) {
                try {
                    const extra = JSON.parse(item.lugar.split(' ||| ')[1]);
                    if (extra.sw) {
                        const sw = Array.isArray(extra.sw) ? extra.sw : [extra.sw.toString()];
                        if (sw.includes(currentUser.id)) return true;
                    }
                } catch (e) {}
            }
            return false;
        };

        const pidStr = id.toString();
        
        // Filtrar por propiedad/compartido Y por pertenencia del jugador
        const playerConvs = allConvs.filter(c => {
            return Array.isArray(c.playerids) && c.playerids.map(x => x.toString()).includes(pidStr);
        });

        const playerSesiones = allSess.filter(s => {
            const isOwnerOrShared = s.createdBy === currentUser.id || isSharedWithMe(s);
            const isParticipant = Array.isArray(s.playerids) && s.playerids.map(x => x.toString()).includes(pidStr);
            return isOwnerOrShared && isParticipant;
        });

        const playerAsistencias = allAsistencia.filter(a => {
            const isOwnerOrShared = a.createdBy === currentUser.id || isSharedWithMe(a);
            const isParticipant = a.data && (a.data[pidStr] || a.data[id]);
            return isOwnerOrShared && isParticipant;
        });

        const stats = {
            asiste: playerAsistencias.filter(a => a.data[id] === 'asiste' || a.data[id] === 'presente').length,
            ausente: playerAsistencias.filter(a => a.data[id] === 'ausente').length,
            sin_motivo: playerAsistencias.filter(a => a.data[id] === 'sin_motivo').length,
            enfermo: playerAsistencias.filter(a => a.data[id] === 'enfermo').length,
            lesionado: playerAsistencias.filter(a => a.data[id] === 'lesionado' || a.data[id] === 'lesion').length,
            seleccion: playerAsistencias.filter(a => a.data[id] === 'seleccion').length,
            zubieta: playerAsistencias.filter(a => a.data[id] === 'zubieta').length,
            estudiar: playerAsistencias.filter(a => a.data[id] === 'estudiar').length,
            otro: playerAsistencias.filter(a => a.data[id] === 'otro').length,
            total: playerAsistencias.length
        };
        const attendanceRate = stats.total > 0 ? Math.round((stats.asiste / stats.total) * 100) : 0;

        const wrapper = document.createElement('div');
        wrapper.className = 'animate-in fade-in slide-in-from-right duration-500';
        wrapper.innerHTML = `
            <div class="max-w-6xl mx-auto pb-20">
                <!-- Header / Intro -->
                <div class="bg-white p-8 md:p-12 rounded-[3rem] border border-slate-100 shadow-sm mb-8 relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    <div class="flex flex-col md:flex-row items-center gap-10 relative z-10">
                        <div class="relative group cursor-pointer" onclick="document.getElementById('player-photo-input').click()">
                            ${player.foto ? 
                                `<img src="${player.foto}" class="w-32 h-32 md:w-48 md:h-48 rounded-[2.5rem] object-cover shadow-2xl ring-8 ring-slate-50">` :
                                `<div class="w-32 h-32 md:w-48 md:h-48 rounded-[2.5rem] bg-blue-600 text-white flex items-center justify-center text-6xl font-black shadow-2xl ring-8 ring-slate-50">${(player.nombre || 'J').substring(0,1)}</div>`
                            }
                            <div class="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-xl group-hover:bg-blue-600 group-hover:text-white transition-all scale-0 group-hover:scale-100 duration-300">
                                <i data-lucide="camera" class="w-5 h-5"></i>
                            </div>
                            <input type="file" id="player-photo-input" class="hidden" accept="image/*">
                        </div>
                        <div class="flex-1 text-center md:text-left">
                            <div class="flex flex-col md:flex-row items-center gap-4 mb-4 justify-center md:justify-start">
                                <h2 class="text-4xl md:text-5xl font-black text-slate-900 tracking-tight uppercase">${player.nombre}</h2>
                                <span class="px-4 py-1 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20">${teams.find(t => t.id == player.equipoid)?.nombre || 'Jugador Libre'}</span>
                            </div>
                            <div class="flex flex-wrap justify-center md:justify-start gap-3 items-center">
                                <div class="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                    <i data-lucide="fingerprint" class="w-4 h-4 text-slate-400"></i>
                                    <span class="text-xs font-black text-slate-500 uppercase tracking-widest">ID #${player.id}</span>
                                </div>
                                <div class="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                    <i data-lucide="map-pin" class="w-4 h-4 text-slate-400"></i>
                                    <span class="text-xs font-black text-slate-500 uppercase tracking-widest">${player.equipoConvenido || 'Sin Club Convenido'}</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex gap-3">
                            <button onclick="window.printPlayerCard(${player.id})" class="px-6 py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                                <i data-lucide="file-down" class="w-4 h-4"></i>
                                EXPORTAR FICHA PDF
                            </button>
                            <button onclick="window.switchView('jugadores')" class="px-6 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-[10px]">VOLVER AL LISTADO</button>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Left Column: Info & Form -->
                    <div class="lg:col-span-2 space-y-8">
                        <div class="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                            <div class="flex items-center justify-between mb-10">
                                <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                                    <i data-lucide="user-plus" class="w-6 h-6 text-blue-600"></i>
                                    Información Técnica
                                </h3>
                            </div>
                            <form id="edit-player-form-full" class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <input type="hidden" name="id" value="${player.id}">
                                <div class="col-span-1">
                                     <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Nombre y Apellidos</label>
                                     <input name="nombre" value="${player.nombre || ''}" class="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 ring-blue-50 transition-all">
                                </div>
                                <div class="col-span-1">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Equipo / Categoría</label>
                                    <select name="equipoid" class="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 ring-blue-50 transition-all appearance-none cursor-pointer">
                                        <option value="">Sin equipo</option>
                                        ${teams.map(t => `<option value="${t.id}" ${player.equipoid == t.id ? 'selected' : ''}>${t.nombre}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="col-span-1">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Club Convenido</label>
                                    <select name="equipoConvenido" class="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 ring-blue-50 transition-all appearance-none cursor-pointer">
                                        <option value="">Ninguno</option>
                                        ${CLUBES_CONVENIDOS.map(c => `<option value="${c}" ${player.equipoConvenido === c ? 'selected' : ''}>${c}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="col-span-full">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Posiciones Técnicas (Multiselección)</label>
                                    ${window.renderPositionSelector((player.posicion || '').split(',').map(s=>s.trim()), 'edit-pos')}
                                </div>
                                <div>
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Año de Nacimiento</label>
                                    <input name="anionacimiento" type="number" value="${player.anionacimiento || ''}" class="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 ring-blue-50 transition-all">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Fecha de Nacimiento</label>
                                    <input name="fechanacimiento" type="date" value="${player.fechanacimiento || ''}" class="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 ring-blue-50 transition-all">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Nivel Actual (1-5)</label>
                                    <select name="nivel" class="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 ring-blue-50 transition-all cursor-pointer">
                                        ${[1,2,3,4,5].map(n => `<option value="${n}" ${player.nivel == n ? 'selected' : ''}>${'★'.repeat(n)} ${n === 5 ? 'Top Elite' : ''}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Lateralidad / Pie</label>
                                    <select name="pie" class="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 ring-blue-50 transition-all cursor-pointer">
                                        <option value="DIESTRO" ${player.pie === 'DIESTRO' ? 'selected' : ''}>DIESTRO</option>
                                        <option value="ZURDO" ${player.pie === 'ZURDO' ? 'selected' : ''}>ZURDO</option>
                                        <option value="AMBIDIESTRO" ${player.pie === 'AMBIDIESTRO' ? 'selected' : ''}>AMBIDIESTRO</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Género / Sexo</label>
                                    <select name="sexo" class="w-full p-5 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 ring-blue-50 transition-all cursor-pointer">
                                        <option value="Masculino" ${player.sexo === 'Masculino' ? 'selected' : ''}>Masculino</option>
                                        <option value="Femenino" ${player.sexo === 'Femenino' ? 'selected' : ''}>Femenino</option>
                                        <option value="Otro" ${player.sexo === 'Otro' ? 'selected' : ''}>Otro</option>
                                    </select>
                                </div>
                                <div class="col-span-full">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Análisis Técnico / Notas de Scout</label>
                                    <textarea name="notas" class="w-full p-6 bg-slate-50 border-none rounded-3xl h-48 font-medium text-slate-700 outline-none focus:ring-4 ring-blue-50 transition-all">${player.notas || ''}</textarea>
                                </div>
                                <div class="col-span-full pt-4 flex gap-4">
                                    <button type="submit" class="flex-[3] py-5 bg-blue-600 text-white font-black rounded-3xl shadow-2xl shadow-blue-500/20 hover:bg-blue-700 hover:scale-[1.02] transition-all uppercase tracking-widest text-xs">Guardar Cambios en Ficha</button>
                                    <button type="button" onclick="window.deletePlayer(${player.id})" class="flex-1 py-5 bg-rose-50 text-rose-500 font-black rounded-3xl hover:bg-rose-100 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                        Borrar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- Right Column: Stats & History -->
                    <div class="space-y-8">
                        <!-- Asistencia Summary -->
                        <div class="bg-slate-900 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                            <i data-lucide="check-circle" class="absolute -bottom-10 -right-10 w-48 h-48 text-white/5"></i>
                            <h4 class="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-8">Asistencia Global</h4>
                            <div class="flex items-end gap-3 mb-8">
                                <span class="text-6xl font-black">${attendanceRate}%</span>
                                <span class="text-blue-400 font-bold mb-2">Ratio</span>
                            </div>
                            <div class="grid grid-cols-2 gap-4 mb-8">
                                <div class="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
                                    <p class="text-[9px] font-black text-emerald-400 uppercase mb-1">Presencias</p>
                                    <p class="text-2xl font-black text-emerald-400">${stats.asiste}</p>
                                </div>
                                <div class="bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20">
                                    <p class="text-[9px] font-black text-rose-400 uppercase mb-1">Ausencias</p>
                                    <p class="text-2xl font-black text-rose-400">${stats.total - stats.asiste}</p>
                                </div>
                            </div>
                            
                            <h5 class="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4 border-b border-white/5 pb-2">Desglose Detallado</h5>
                            <div class="grid grid-cols-2 gap-y-3 gap-x-6">
                                ${[
                                    { label: 'Asiste', val: stats.asiste, color: 'text-emerald-400' },
                                    { label: 'Ausente', val: stats.ausente, color: 'text-rose-400' },
                                    { label: 'Sin Motivo', val: stats.sin_motivo, color: 'text-rose-400/70' },
                                    { label: 'Enfermo', val: stats.enfermo, color: 'text-amber-400' },
                                    { label: 'Lesionado', val: stats.lesionado, color: 'text-amber-500' },
                                    { label: 'Selección', val: stats.seleccion, color: 'text-blue-400' },
                                    { label: 'Zubieta', val: stats.zubieta, color: 'text-indigo-400' },
                                    { label: 'Estudiar', val: stats.estudiar, color: 'text-violet-400' },
                                    { label: 'Otro', val: stats.otro, color: 'text-slate-400' }
                                ].map(s => `
                                    <div class="flex justify-between items-center text-[11px]">
                                        <span class="font-bold text-white/50">${s.label}</span>
                                        <span class="font-black ${s.color}">${s.val}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Torneos History -->
                        <div class="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                            <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <i data-lucide="trophy" class="w-4 h-4 text-blue-500"></i>
                                Historial Competitivo
                            </h4>
                            <div class="space-y-4">
                                ${playerConvs.filter(c => (c.tipo || '').toUpperCase() === 'TORNEO').map(c => {
                                    const evalData = c.rendimiento && c.rendimiento[id] ? c.rendimiento[id] : null;
                                    return `
                                        <div onclick="window.viewTorneoRendimiento(${c.id})" class="p-5 bg-slate-50 rounded-2xl border border-slate-100/50 hover:border-blue-200 hover:bg-white hover:shadow-xl transition-all group cursor-pointer">
                                            <div class="flex justify-between items-start mb-3">
                                                <div>
                                                    <p class="text-[9px] font-bold text-blue-600 uppercase opacity-60 tracking-widest">${c.fecha}</p>
                                                    <p class="text-xs font-black text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors">${c.nombre}</p>
                                                </div>
                                                <div class="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs">
                                                    ${evalData ? evalData.score : '--'}
                                                </div>
                                            </div>
                                            ${evalData ? `<p class="text-[10px] text-slate-500 italic leading-relaxed border-t pt-3 border-slate-200 mt-2 line-clamp-2">${evalData.comment}</p>` : ''}
                                        </div>
                                    `;
                                }).join('') || '<p class="text-center py-10 text-[10px] font-bold text-slate-300 uppercase tracking-widest">Sin torneos registrados</p>'}
                            </div>
                        </div>

                        <!-- Sesiones Summary -->
                        <div class="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                            <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <i data-lucide="calendar" class="w-4 h-4 text-emerald-500"></i>
                                Sesiones de Entrenamiento
                            </h4>
                            <div class="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                ${(() => {
                                    const combinedSesiones = [...playerSesiones].sort((a,b) => b.fecha.localeCompare(a.fecha));

                                    return combinedSesiones.map(s => `
                                        <div onclick="window.viewSession(${s.id})" class="flex items-center gap-4 p-3 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-emerald-100 group">
                                            <div class="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black text-[10px] group-hover:bg-white transition-colors">${s.fecha.split('-')[2]}</div>
                                            <div class="min-w-0 flex-1">
                                                <p class="text-[10px] font-black text-slate-800 uppercase tracking-tight truncate group-hover:text-emerald-600 transition-colors">${s.titulo || s.nombre}</p>
                                                <p class="text-[8px] font-bold text-slate-400 uppercase">${new Date(s.fecha).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                                            </div>
                                            <i data-lucide="chevron-right" class="w-3 h-3 text-slate-200 group-hover:text-emerald-400"></i>
                                        </div>
                                    `).join('') || '<p class="text-center py-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sin sesiones</p>';
                                })()}
                            </div>
                        </div>

                        <!-- Convocatorias History -->
                        <div class="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm mt-8">
                            <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <i data-lucide="clipboard-list" class="w-4 h-4 text-blue-500"></i>
                                Historial de Convocatorias
                            </h4>
                            <div class="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                ${playerConvs.filter(c => c.tipo !== 'Torneo').sort((a,b) => b.fecha.localeCompare(a.fecha)).map(c => `
                                    <div onclick="window.viewConvocatoria(${c.id})" class="flex items-center gap-4 p-3 hover:bg-blue-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-blue-100 group">
                                        <div class="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-[10px] group-hover:bg-white transition-colors">${c.fecha.split('-')[2]}</div>
                                        <div class="min-w-0 flex-1">
                                            <div class="flex items-center gap-2">
                                                <span class="px-1 text-[7px] font-black bg-blue-100 text-blue-600 rounded uppercase tracking-tighter">${c.tipo}</span>
                                                <p class="text-[10px] font-black text-slate-800 uppercase tracking-tight truncate group-hover:text-blue-600 transition-colors">${c.nombre}</p>
                                            </div>
                                            <p class="text-[8px] font-bold text-slate-400 uppercase">${new Date(c.fecha).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                                        </div>
                                        <i data-lucide="chevron-right" class="w-3 h-3 text-slate-200 group-hover:text-blue-400"></i>
                                    </div>
                                `).join('') || '<p class="text-center py-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Sin convocatorias</p>'}
                            </div>
                        </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        contentContainer.innerHTML = '';
        contentContainer.appendChild(wrapper);
        if (window.lucide) lucide.createIcons();
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Handle Image Upload
        document.getElementById('player-photo-input').onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const url = await db.uploadImage(file);
                if (url) {
                    player.foto = url;
                    await db.update('jugadores', player);
                    window.viewPlayer(id);
                }
            } catch (err) { console.error(err); }
        };

        // Handle Form Submit
        document.getElementById('edit-player-form-full').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            if (data.nombre) data.nombre = data.nombre.toUpperCase().trim();
            data.posicion = formData.getAll('posicion').join(', ');
            
            const upId = Number(data.id);
            const updatePayload = {
                id: upId,
                nombre: data.nombre,
                equipoid: data.equipoid ? Number(data.equipoid) : null,
                posicion: data.posicion,
                anionacimiento: data.anionacimiento ? Number(data.anionacimiento) : null,
                fechanacimiento: data.fechanacimiento || null,
                pie: data.pie || null,
                sexo: data.sexo || 'Masculino',
                nivel: data.nivel ? Number(data.nivel) : 3,
                equipoConvenido: data.equipoConvenido || null,
                notas: data.notas
            };

            try {
                await db.update('jugadores', updatePayload);
                window.customAlert('¡Actualizado!', 'La ficha se ha guardado con éxito.', 'success');
                window.viewPlayer(upId);
            } catch (err) {
                console.error(err);
                window.customAlert('Error al guardar', 'No se ha podido guardar la ficha: ' + err.message, 'error');
            }
        };
    };

    window.updatePlayerInline = async (id, field, value) => {
        try {
            const payload = { id: Number(id) };
            if (field === 'nivel' || field === 'equipoid') {
                payload[field] = value ? Number(value) : null;
            } else {
                payload[field] = value;
            }
            await db.update('jugadores', payload);
            // Si es un cambio que afecta a filtros o nombres, refrescamos la vista suavemente
            if (field === 'equipoid' || field === 'equipoConvenido' || field === 'posicion') {
                const container = document.getElementById('main-content');
                if (container) await renderJugadores(container.firstChild);
            }
        } catch (err) {
            console.error("Error inline update:", err);
        }
    };

    window.deletePlayer = async (id) => {
        window.customConfirm(
            '¿Eliminar Jugador?',
            'Se borrarán todos los datos y notas técnicas de este futbolista del sistema.',
            async () => {
                await db.delete('jugadores', Number(id));
                closeModal();
                window.switchView('jugadores');
            }
        );
    };


    window.printPlayerCard = async (id) => {
        const players = await db.getAll('jugadores');
        const teams = await db.getAll('equipos');
        const convocatorias = await db.getAll('convocatorias');
        const sesiones = await db.getAll('sesiones');
        const asistencia = await db.getAll('asistencia');
        
        const player = players.find(p => p.id == id);
        if (!player) return;

        const playerTeam = teams.find(t => t.id == player.equipoid);
        const playerConvs = convocatorias.filter(c => c.players && c.players.includes(id.toString()));
        const playerSesiones = sesiones.filter(s => s.asistenciadatos && s.asistenciadatos.players && s.asistenciadatos.players.some(pId => pId.toString() === id.toString()));
        
        // Attendance stats
        const playerAsist = asistencia.filter(a => a.players && a.players[id]);
        const stats = {
            total: playerAsist.length,
            asiste: playerAsist.filter(a => a.players[id].status === 'asiste').length,
            ausente: playerAsist.filter(a => a.players[id].status === 'ausente').length,
            lesionado: playerAsist.filter(a => a.players[id].status === 'lesionado').length,
            enfermo: playerAsist.filter(a => a.players[id].status === 'enfermo').length,
            seleccion: playerAsist.filter(a => a.players[id].status === 'seleccion').length,
            zubieta: playerAsist.filter(a => a.players[id].status === 'zubieta').length,
            estudiar: playerAsist.filter(a => a.players[id].status === 'estudiar').length
        };
        const attendanceRate = stats.total > 0 ? Math.round((stats.asiste / stats.total) * 100) : 0;

        const headerShield = "RS.png"; // Official shield

        const printView = document.createElement('div');
        printView.className = 'print-view fixed inset-0 bg-slate-100 z-[500] overflow-y-auto no-scrollbar';
        printView.innerHTML = `
            <style>
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .print-view { position: relative !important; inset: auto !important; background: white !important; padding: 0 !important; }
                    .sheet-preview { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
                }
                .sheet-preview {
                    background: white;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.1);
                    margin: 40px auto;
                    padding: 60px;
                    width: 210mm;
                    min-height: 297mm;
                    border-radius: 4px;
                }
            </style>
            
            <div class="no-print sticky top-0 mb-8 flex justify-center gap-4 z-[600] py-6">
                <div class="bg-white/90 backdrop-blur-md p-3 rounded-[2.5rem] border border-white shadow-2xl flex gap-3">
                    <button onclick="window.print()" class="px-8 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-all flex items-center gap-3">
                        <i data-lucide="file-down" class="w-5 h-5"></i>
                        GUARDAR PDF
                    </button>
                    <button onclick="document.querySelector('.print-view').remove()" class="px-8 py-4 bg-slate-800 text-white font-black rounded-2xl shadow-xl hover:bg-slate-900 transition-all flex items-center gap-3">
                        <i data-lucide="x" class="w-5 h-5"></i>
                        CERRAR VISTA
                    </button>
                </div>
            </div>

            <div class="sheet-preview">
                <!-- Header -->
                <header class="flex justify-between items-start border-b-8 border-slate-900 pb-10 mb-10">
                    <div class="flex items-center gap-8">
                        <div class="relative">
                            ${player.foto ? 
                                `<img src="${player.foto}" class="w-32 h-32 rounded-3xl object-cover border-4 border-slate-900 shadow-xl">` :
                                `<div class="w-32 h-32 rounded-3xl bg-slate-900 text-white flex items-center justify-center text-5xl font-black">${(player.nombre || 'J').substring(0,1)}</div>`
                            }
                        </div>
                        <div>
                            <h1 class="text-4xl font-black text-slate-900 uppercase leading-none mb-2">${player.nombre}</h1>
                            <div class="flex items-center gap-3">
                                <span class="px-3 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">${playerTeam?.nombre || 'LIBRE'}</span>
                                <span class="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">${player.posicion || 'SIN POSICIÓN'}</span>
                            </div>
                        </div>
                    </div>
                    <img src="${headerShield}" class="w-20 h-20 object-contain grayscale opacity-20">
                </header>

                <div class="grid grid-cols-3 gap-10">
                    <div class="col-span-2 space-y-10">
                        <!-- Technical Data -->
                        <section>
                            <h2 class="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-b-2 border-slate-100 pb-2 flex items-center gap-2">
                                <span class="w-2 h-2 bg-blue-600 rounded-full"></span>
                                Datos Biográficos y Técnicos
                            </h2>
                            <div class="grid grid-cols-2 gap-y-6">
                                <div>
                                    <p class="text-[9px] font-black text-slate-400 uppercase">Año de Nacimiento</p>
                                    <p class="text-lg font-bold text-slate-800">${player.anionacimiento || '----'}</p>
                                </div>
                                <div>
                                    <p class="text-[9px] font-black text-slate-400 uppercase">Club Convenido</p>
                                    <p class="text-lg font-bold text-slate-800">${player.equipoConvenido || 'Sin Club'}</p>
                                </div>
                                <div>
                                    <p class="text-[9px] font-black text-slate-400 uppercase">Lateralidad / Pie</p>
                                    <p class="text-lg font-bold text-slate-800">${player.pie || 'Indiferente'}</p>
                                </div>
                                <div>
                                    <p class="text-[9px] font-black text-slate-400 uppercase">Nivel RS Centro</p>
                                    <p class="text-lg font-bold text-amber-500">${'★'.repeat(player.nivel || 3)}</p>
                                </div>
                            </div>
                        </section>

                        <!-- Tournament History -->
                        <section>
                            <h2 class="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-b-2 border-slate-100 pb-2 flex items-center gap-2">
                                <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                Historial Competitivo (Torneos)
                            </h2>
                            <div class="bg-slate-50 rounded-3xl overflow-hidden border border-slate-100">
                                <table class="w-full">
                                    <thead class="bg-slate-100">
                                        <tr>
                                            <th class="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest">Fecha</th>
                                            <th class="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest">Competición</th>
                                            <th class="px-6 py-4 text-center text-[9px] font-black uppercase tracking-widest">Rend.</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-200">
                                        ${playerConvs.length > 0 ? playerConvs.filter(c => c.tipo === 'Torneo').map(c => {
                                            const evalData = c.rendimiento && c.rendimiento[id] ? c.rendimiento[id] : null;
                                            return `
                                                <tr>
                                                    <td class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">${c.fecha}</td>
                                                    <td class="px-6 py-4 text-xs font-black text-slate-800 uppercase">${c.nombre}</td>
                                                    <td class="px-6 py-4 text-center font-black text-blue-600">${evalData ? evalData.score : '--'}</td>
                                                </tr>
                                            `;
                                        }).join('') : `<tr><td colspan="3" class="px-6 py-8 text-center text-[10px] text-slate-400 font-bold uppercase">Sin registros competitivos</td></tr>`}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <!-- Sessions History -->
                        <section>
                            <h2 class="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 border-b-2 border-slate-100 pb-2 flex items-center gap-2">
                                <span class="w-2 h-2 bg-indigo-500 rounded-full"></span>
                                Sesiones de Entrenamiento
                            </h2>
                            <div class="space-y-2">
                                ${playerSesiones.slice(0, 10).map(s => `
                                    <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div class="flex items-center gap-4">
                                            <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100">${s.fecha.split('-')[2]}</div>
                                            <p class="text-xs font-black text-slate-800 uppercase">${s.titulo || s.nombre}</p>
                                        </div>
                                        <p class="text-[9px] font-bold text-slate-400 uppercase">${s.fecha}</p>
                                    </div>
                                `).join('') || `<p class="text-center py-6 text-[10px] text-slate-400 font-bold uppercase">No hay sesiones registradas</p>`}
                            </div>
                        </section>
                    </div>

                    <div class="space-y-10">
                        <!-- Stats Center -->
                        <div class="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
                            <i data-lucide="activity" class="absolute -bottom-10 -right-10 w-48 h-48 text-white/5"></i>
                            <h3 class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-8">Asistencia Global</h3>
                            <div class="text-6xl font-black mb-8">${attendanceRate}% <span class="text-xs font-bold text-blue-400 block mt-2 opacity-60">Ratio Presencia</span></div>
                            
                            <div class="space-y-4">
                                ${[
                                    { label: 'Presencias', val: stats.asiste, color: 'text-emerald-400' },
                                    { label: 'Ausencias', val: stats.ausente, color: 'text-rose-400' },
                                    { label: 'Lesiones', val: stats.lesionado, color: 'text-amber-400' },
                                    { label: 'Zubieta / Sel.', val: stats.zubieta + stats.seleccion, color: 'text-blue-400' },
                                    { label: 'Estudios', val: stats.estudiar, color: 'text-indigo-400' }
                                ].map(s => `
                                    <div class="flex justify-between items-center text-[11px] border-b border-white/10 pb-2">
                                        <span class="font-bold text-white/40">${s.label}</span>
                                        <span class="font-black ${s.color}">${s.val}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Technical Notes -->
                        <div class="bg-blue-50 p-8 rounded-[3rem] border border-blue-100">
                            <h3 class="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-6">Análisis del Coach</h3>
                            <p class="text-sm text-blue-900/70 italic leading-relaxed whitespace-pre-line">
                                ${player.notas || 'No se han registrado observaciones técnicas adicionales para este futbolista.'}
                            </p>
                        </div>

                        <div class="pt-20 opacity-20 text-right">
                            <p class="text-[8px] font-black uppercase tracking-[0.3em]">RS CENTRO INTEL</p>
                            <p class="text-[7px] font-bold uppercase">${new Date().toLocaleDateString()} | ${new Date().toLocaleTimeString()}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(printView);
        if (window.lucide) lucide.createIcons();
    };

    async function renderAsistencia(container) {
        const reports = (await db.getAll('asistencia')) || [];
        const teams = (await db.getAll('equipos')) || [];
        
        const filteredReports = reports.filter(r => {
            if (!r || !r.fecha) return false;
            
            let reportTeamIds = [String(r.equipoid)];
            if (r.nombre && r.nombre.includes(' ||| ')) {
                try {
                    const ex = JSON.parse(r.nombre.split(' ||| ')[1]);
                    if (ex.eids) reportTeamIds = [...new Set([...reportTeamIds, ...ex.eids.map(String)])];
                } catch(e) {}
            }

            const searchTerm = (asistenciaFilters.search || '').toLowerCase();
            const matchesSearch = !searchTerm || 
                                 (r.nombre || '').toLowerCase().includes(searchTerm) || 
                                 reportTeamIds.some(id => teams.find(t => t.id == id)?.nombre.toLowerCase().includes(searchTerm));
                                 
            const matchesTeam = asistenciaFilters.activeTeamId === 'TODOS' || reportTeamIds.includes(String(asistenciaFilters.activeTeamId));
            return matchesSearch && matchesTeam;
        }).sort((a,b) => (b.fecha || '').localeCompare(a.fecha || ''));

        container.innerHTML = `
            <div class="space-y-8 animate-in fade-in duration-500">
                <!-- Search and Controls -->
                <div class="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div class="relative w-full">
                        <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300"></i>
                        <input type="text" 
                            id="asistencia-search"
                            placeholder="Buscar por nombre o equipo..." 
                            value="${asistenciaFilters.search}"
                            oninput="window.updateAsistenciaSearch(this.value)"
                            class="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 ring-blue-50/50 transition-all font-medium text-slate-700">
                    </div>
                </div>

                <!-- Team Tabs -->
                <div class="flex gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                    <button onclick="window.setAsistenciaTeam('TODOS')" 
                        class="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${asistenciaFilters.activeTeamId === 'TODOS' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}">
                        Todos los Equipos
                    </button>
                    ${window.getSortedTeams(teams).map(t => `
                        <button onclick="window.setAsistenciaTeam('${t.id}')" 
                            class="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${asistenciaFilters.activeTeamId == t.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}">
                            ${t.nombre}
                        </button>
                    `).join('')}
                </div>

                <!-- Mobile View (Cards) -->
                <div class="md:hidden space-y-4">
                    ${filteredReports.map(r => {
                        const team = teams.find(t => t.id == r.equipoid);
                        // Fix: Support both string and object formats in 'players' column
                        const playersData = r.players || r.data || {};
                        const dataValues = Object.values(playersData).map(v => typeof v === 'object' ? v.status : v);
                        const presentes = dataValues.filter(s => s === 'asiste' || s === 'presente').length;
                        const total = dataValues.length;
                        const reportName = (r.nombre || `Informe ${r.fecha}`).split(' ||| ')[0];
                        
                        return `
                            <div onclick="window.viewAsistenciaReport(${r.id})" class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm active:scale-[0.98] transition-all">
                                <div class="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 class="font-bold text-slate-800 text-sm">${reportName}</h4>
                                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">${new Date(r.fecha + 'T12:00:00').toLocaleDateString('es', { day: '2-digit', month: 'long' })}</p>
                                    </div>
                                    <div class="flex flex-wrap gap-1 justify-end max-w-[50%]">
                                        ${(() => {
                                            let teamIds = [String(r.equipoid)];
                                            if (r.nombre && r.nombre.includes(' ||| ')) {
                                                try {
                                                    const ex = JSON.parse(r.nombre.split(' ||| ')[1]);
                                                    if (ex.eids) teamIds = [...new Set([...teamIds, ...ex.eids.map(String)])];
                                                } catch(e) {}
                                            }
                                            return teamIds.filter(id => id && teams.find(t => t.id == id)).map(id => `
                                                <span class="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[8px] font-black uppercase tracking-tight">${teams.find(t => t.id == id).nombre.split(' ||| ')[0]}</span>
                                            `).join('');
                                        })()}
                                    </div>
                                </div>
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <div class="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                                        <span class="text-xs font-black text-slate-700">${presentes}/${total} PRESENTES</span>
                                    </div>
                                    <div class="flex gap-2">
                                        <button onclick="event.stopPropagation(); window.deleteAsistenciaReport(${r.id})" class="p-2 text-red-300 hover:text-red-500 transition-all">
                                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('') || `<div class="py-20 text-center"><p class="text-slate-400 text-sm font-bold uppercase tracking-widest">No hay informes</p></div>`}
                </div>

                <!-- Desktop View (Table) -->
                <div class="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse">
                            <thead>
                                <tr class="bg-slate-50/50">
                                    <th class="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Nombre del Informe</th>
                                    <th class="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Fecha</th>
                                    <th class="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Equipo</th>
                                    <th class="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Jugadores</th>
                                    <th class="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Acciones</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-50">
                                ${filteredReports.map(r => {
                                    const team = teams.find(t => t.id == r.equipoid);
                                    // Fix: Support both string and object formats in 'players' column
                                    const playersData = r.players || r.data || {};
                                    const dataValues = Object.values(playersData).map(v => typeof v === 'object' ? v.status : v);
                                    const presentes = dataValues.filter(s => s === 'asiste' || s === 'presente').length;
                                    const total = dataValues.length;
                                    const reportName = (r.nombre || `Informe ${r.fecha}`).split(' ||| ')[0];
                                    
                                    return `
                                        <tr class="hover:bg-slate-50/50 transition-colors group">
                                            <td class="px-6 py-5">
                                                <span class="font-bold text-slate-800 text-sm">${reportName}</span>
                                            </td>
                                            <td class="px-6 py-5">
                                                <span class="text-xs font-black text-slate-400 uppercase">${new Date(r.fecha + 'T12:00:00').toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                            </td>
                                            <td class="px-6 py-5">
                                                <div class="flex flex-wrap gap-1">
                                                    ${(() => {
                                                        let teamIds = [String(r.equipoid)];
                                                        if (r.nombre && r.nombre.includes(' ||| ')) {
                                                            try {
                                                                const ex = JSON.parse(r.nombre.split(' ||| ')[1]);
                                                                if (ex.eids) teamIds = [...new Set([...teamIds, ...ex.eids.map(String)])];
                                                            } catch(e) {}
                                                        }
                                                        return teamIds.filter(id => id && teams.find(t => t.id == id)).map(id => `
                                                            <span class="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-tight border border-blue-100/50">${teams.find(t => t.id == id).nombre.split(' ||| ')[0]}</span>
                                                        `).join('');
                                                    })()}
                                                </div>
                                            </td>
                                            <td class="px-6 py-5 text-center">
                                                <div class="flex flex-col items-center">
                                                    <span class="text-sm font-black text-slate-800">${presentes}/${total}</span>
                                                    <div class="w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                        <div class="h-full bg-emerald-500" style="width: ${(presentes/total)*100}%"></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="px-6 py-5 text-right">
                                                <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onclick="window.viewAsistenciaReport(${r.id})" class="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Editar">
                                                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                                                    </button>
                                                    <button onclick="window.deleteAsistenciaReport(${r.id})" class="p-2.5 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Eliminar">
                                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('') || `<tr><td colspan="5" class="py-20 text-center"><p class="text-slate-400 text-sm font-bold uppercase tracking-widest">No se encontraron informes</p></td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    window.updateAsistenciaSearch = (val) => {
        asistenciaFilters.search = val;
        renderAsistencia(contentContainer);
    };

    window.setAsistenciaTeam = (id) => {
        asistenciaFilters.activeTeamId = id;
        renderAsistencia(contentContainer);
    };

    window.deleteAsistenciaReport = async (id) => {
        window.customConfirm('¡ATENCIÓN!', '¿Estás seguro de que quieres eliminar este informe de asistencia?', async () => {
            try {
                const { error } = await supabaseClient.from('asistencia').delete().eq('id', id);
                if (error) throw error;
                window.customAlert('¡Eliminado!', 'El informe ha sido borrado correctamente.', 'success');
                renderView('asistencia');
            } catch (err) {
                window.customAlert('Error al eliminar', err.message, 'error');
            }
        });
    };

    window.newAsistenciaReport = async () => {
        const wrapper = document.createElement('div');
        wrapper.className = 'view animate-in slide-in-from-right duration-300';
        await renderAsistenciaForm(wrapper);
        contentContainer.innerHTML = '';
        contentContainer.appendChild(wrapper);
        
    };

    window.viewAsistenciaReport = async (id) => {
        const reports = await db.getAll('asistencia');
        const report = reports.find(r => r.id == id);
        const wrapper = document.createElement('div');
        wrapper.className = 'view animate-in slide-in-from-right duration-300';
        await renderAsistenciaForm(wrapper, report);
        contentContainer.innerHTML = '';
        contentContainer.appendChild(wrapper);
        
    };

    async function renderAsistenciaForm(container, existingReport = null) {
        const teams = await db.getAll('equipos');
        const players = await db.getAll('jugadores');
        const convocatorias = await db.getAll('convocatorias');

        let selectedTeamIds = [];
        if (existingReport) {
            if (existingReport.equipoid) selectedTeamIds.push(String(existingReport.equipoid));
            if (existingReport.nombre && existingReport.nombre.includes(' ||| ')) {
                try {
                    const ex = JSON.parse(existingReport.nombre.split(' ||| ')[1]);
                    if (ex.eids) selectedTeamIds = [...new Set([...selectedTeamIds, ...ex.eids.map(String)])];
                } catch(e) {}
            }
        }
        
        let selectedDate = existingReport ? (existingReport.fecha || existingReport.date) : new Date().toISOString().split('T')[0];
        let selectedConvId = existingReport ? (existingReport.convocatoriaid || null) : null;
        // Search dynamically if not explicitly stored
        if (!selectedConvId && existingReport && selectedDate && selectedTeamIds.length > 0) {
            const matchingConv = convocatorias.find(c => c.fecha === selectedDate && selectedTeamIds.includes(String(c.equipoid)));
            if (matchingConv) selectedConvId = matchingConv.id;
        }
        
        attendanceData = existingReport ? (existingReport.players || existingReport.data || {}) : {};

        const formatDateShort = (dateStr) => {
            if (!dateStr) return '';
            const parts = dateStr.split('-');
            if (parts.length !== 3) return dateStr;
            return `${parts[2]}.${parts[1]}.${parts[0].slice(-2)}`;
        };

        const updateAutoName = () => {
            const nameInput = container.querySelector('#report-name');
            if (!nameInput || existingReport) return;
            
            const selectedTeams = teams.filter(t => selectedTeamIds.includes(String(t.id)));
            const conv = convocatorias.find(c => c.id == selectedConvId);
            const datePart = formatDateShort(selectedDate);
            const teamNames = selectedTeams.map(t => t.nombre.split(' ||| ')[0]).join('_');
            const lugarParts = conv ? (conv.lugar || '').split(' ||| ') : [''];
            const lugarPart = lugarParts[0];
            
            let name = `Asistencia ${datePart}`;
            if (teamNames) name += `_${teamNames}`;
            if (lugarPart) name += `_${lugarPart}`;
            
            nameInput.value = name;
        };

        const updateBoard = () => {
            const list = container.querySelector('#asistencia-list');
            const listMobile = container.querySelector('#asistencia-list-mobile');
            if (!list && !listMobile) return;

            let targetPlayers = [];
            if (selectedConvId) {
                const conv = convocatorias.find(c => c.id == selectedConvId);
                if (conv && Array.isArray(conv.playerids)) {
                    targetPlayers = players.filter(p => conv.playerids.includes(p.id.toString()));
                }
            } else if (selectedTeamIds.length > 0) {
                // Check for matching convocatorias for any of the selected teams
                const matchingConvs = convocatorias.filter(c => c.fecha === selectedDate && selectedTeamIds.includes(String(c.equipoid)));
                if (matchingConvs.length > 0) {
                    const allPids = [...new Set(matchingConvs.flatMap(c => (c.playerids || []).map(String)))];
                    targetPlayers = players.filter(p => allPids.includes(p.id.toString()));
                } else {
                    targetPlayers = players.filter(j => selectedTeamIds.includes(String(j.equipoid)));
                }
            }
            
            if (selectedTeamIds.length === 0 && !selectedConvId && selectedDate) {
                 const dayConvs = convocatorias.filter(c => c.fecha === selectedDate);
                 const allPids = [...new Set(dayConvs.flatMap(c => (c.playerids || []).map(String)))];
                 if (allPids.length > 0) {
                     targetPlayers = players.filter(p => allPids.includes(p.id.toString()));
                 }
            }

            // Fix for editing: ensure players with recorded data are always shown
            if (existingReport && (existingReport.players || existingReport.data)) {
                const data = existingReport.players || existingReport.data;
                const recordedIds = Object.keys(data).map(String);
                players.forEach(p => {
                    const pidStr = String(p.id);
                    if (recordedIds.includes(pidStr) && !targetPlayers.find(tp => String(tp.id) === pidStr)) {
                        targetPlayers.push(p);
                    }
                });
            }

            if (targetPlayers.length === 0) {
                const emptyHtml = `<div class="py-20 text-center"><p class="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Sin jugadores asignados</p></div>`;
                if (list) list.innerHTML = `<tr><td colspan="3">${emptyHtml}</td></tr>`;
                if (listMobile) listMobile.innerHTML = emptyHtml;
                if (window.lucide) lucide.createIcons();
                return;
            }

            const isAbsent = (s) => {
                const statusStr = typeof s === 'object' ? s.status : s;
                return statusStr !== 'asiste' && statusStr !== 'presente';
            };
            const motives = [
                { id: 'ausente', label: 'Sin Motivo' },
                { id: 'enfermo', label: 'Enfermo' },
                { id: 'lesionado', label: 'Lesionado' },
                { id: 'seleccion', label: 'Seleccion' },
                { id: 'zubieta', label: 'Zubieta' },
                { id: 'estudiar', label: 'Estudiar' },
                { id: 'otro', label: 'Otro' }
            ];

            const desktopHtml = targetPlayers.map((j, idx) => {
                const rawStatus = attendanceData[j.id] || 'asiste';
                const statusStr = typeof rawStatus === 'object' ? rawStatus.status : rawStatus;
                const currentIsAbsent = isAbsent(statusStr);
                return `
                    <tr class="border-b border-slate-50">
                        <td class="px-6 py-4 font-bold text-slate-400 text-xs">${idx + 1}</td>
                        <td class="px-6 py-4">
                            <div class="font-bold text-slate-800 text-sm">${j.nombre}</div>
                            <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">${j.equipoConvenido || 'Sin Club'}</div>
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex flex-col items-end gap-3">
                                <!-- Main Status -->
                                <div class="flex gap-1">
                                    <button onclick="window.setPlayerStatus(${j.id}, 'asiste')" class="px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${!currentIsAbsent ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white border text-slate-400 hover:bg-slate-50'}">
                                        Asiste
                                    </button>
                                    <button onclick="window.setPlayerStatus(${j.id}, 'ausente')" class="px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${currentIsAbsent ? 'bg-red-600 text-white shadow-lg' : 'bg-white border text-slate-400 hover:bg-slate-50'}">
                                        Ausente
                                    </button>
                                </div>
                                <!-- Motive Sub-menu -->
                                ${currentIsAbsent ? `
                                    <div class="flex flex-wrap justify-end gap-1 animate-in fade-in slide-in-from-right-2 duration-200">
                                        <span class="text-[9px] font-black text-slate-300 uppercase self-center mr-2">Motivo:</span>
                                        ${motives.map(m => `
                                            <button onclick="window.setPlayerStatus(${j.id}, '${m.id}')" class="px-2 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${statusStr === m.id ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'}">
                                                ${m.label}
                                            </button>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            const mobileHtml = targetPlayers.map((j, idx) => {
                const rawStatus = attendanceData[j.id] || 'asiste';
                const statusStr = typeof rawStatus === 'object' ? rawStatus.status : rawStatus;
                const currentIsAbsent = isAbsent(statusStr);
                return `
                    <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div class="flex justify-between items-center mb-6">
                            <div class="flex items-center gap-4">
                                <div class="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center font-black text-[10px] border border-slate-100">${idx + 1}</div>
                                <div>
                                    <span class="font-black text-slate-800 text-sm uppercase tracking-tight block">${j.nombre}</span>
                                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">${j.equipoConvenido || 'Sin Club'}</span>
                                </div>
                            </div>
                            <div class="flex gap-1 bg-slate-100 p-1 rounded-xl">
                                <button onclick="window.setPlayerStatus(${j.id}, 'asiste')" class="px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${!currentIsAbsent ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}">SI</button>
                                <button onclick="window.setPlayerStatus(${j.id}, 'ausente')" class="px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${currentIsAbsent ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}">NO</button>
                            </div>
                        </div>
                        ${currentIsAbsent ? `
                            <div class="pt-4 border-t border-slate-50 transition-all animate-in slide-in-from-top-2">
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Motivo de ausencia:</p>
                                <div class="grid grid-cols-2 gap-2">
                                    ${motives.map(m => `
                                        <button onclick="window.setPlayerStatus(${j.id}, '${m.id}')" class="py-3 px-1 rounded-xl text-[9px] font-black uppercase border transition-all ${statusStr === m.id ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-400'}">
                                            ${m.label}
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');

            if (list) list.innerHTML = desktopHtml;
            if (listMobile) listMobile.innerHTML = mobileHtml;
            if (window.lucide) lucide.createIcons();
        };

        window.setPlayerStatus = (pId, s) => { attendanceData[pId] = s; updateBoard(); };

        const renderForm = () => {
            const sortedTeams = window.getSortedTeams(teams);
            const dateConvs = convocatorias.filter(c => c.fecha === selectedDate && (selectedTeamIds.length === 0 || selectedTeamIds.includes(String(c.equipoid))));
            
            container.innerHTML = `
                <div class="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                    <div class="p-8 border-b bg-slate-50/50">
                        <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                            <div class="flex items-center gap-4">
                                <button onclick="window.switchView('asistencia')" class="flex items-center gap-2 px-4 py-2 bg-white border border-slate-100 rounded-xl shadow-sm hover:bg-red-50 hover:text-red-500 transition-all text-slate-500">
                                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                                    <span class="text-[10px] font-black uppercase tracking-widest">Volver</span>
                                </button>
                                <div>
                                    <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight leading-none mb-1">${existingReport ? 'EDITAR ASISTENCIA' : 'NUEVA ASISTENCIA'}</h3>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Control de presencia diario</p>
                                </div>
                            </div>
                            
                            <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                                <div class="relative flex-1 lg:flex-none min-w-[200px]">
                                    <i data-lucide="tag" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300"></i>
                                    <input type="text" id="report-name" value="${existingReport ? (existingReport.nombre || '') : 'Asistencia ' + selectedDate}" placeholder="Nombre del Informe" class="pl-12 pr-4 py-4 border rounded-2xl bg-white font-bold text-sm outline-none focus:ring-4 ring-blue-50 w-full transition-all">
                                </div>
                                <input id="date-sel" type="date" value="${selectedDate}" class="p-4 border rounded-2xl bg-white font-bold text-sm outline-none focus:ring-4 ring-blue-50 transition-all">
                                
                                <div class="relative min-w-[180px]">
                                    <button id="team-multi-btn" class="w-full p-4 border rounded-2xl bg-white font-bold text-sm outline-none focus:ring-4 ring-blue-50 transition-all flex items-center gap-2 ${existingReport ? 'opacity-50 cursor-not-allowed' : ''}" ${existingReport ? 'disabled' : ''}>
                                        <i data-lucide="users" class="w-4 h-4 text-slate-400"></i>
                                        <span class="truncate">${selectedTeamIds.length > 0 ? `${selectedTeamIds.length} Equipos` : 'Equipos'}</span>
                                        <i data-lucide="chevron-down" class="w-3 h-3 text-slate-400 ml-auto"></i>
                                    </button>
                                    <div id="team-multi-dropdown" class="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-100 rounded-3xl shadow-2xl p-4 hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Seleccionar Equipos</p>
                                        <div class="grid grid-cols-1 gap-1 max-h-60 overflow-y-auto custom-scrollbar">
                                            ${sortedTeams.map(t => `
                                                <label class="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-all">
                                                    <input type="checkbox" value="${t.id}" ${selectedTeamIds.includes(String(t.id)) ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 asistencia-team-check">
                                                    <span class="text-xs font-bold text-slate-700">${t.nombre}</span>
                                                </label>
                                            `).join('')}
                                        </div>
                                    </div>
                                </div>

                                <select id="conv-sel" class="p-4 border rounded-2xl bg-white font-bold text-sm outline-none focus:ring-4 ring-blue-50 transition-all cursor-pointer ${existingReport ? 'opacity-50' : ''}" ${existingReport ? 'disabled' : ''}>
                                    <option value="">- Convocatoria (Opcional) -</option>
                                    ${dateConvs.map(c => `<option value="${c.id}" ${selectedConvId == c.id ? 'selected' : ''}>[${c.tipo}] ${c.nombre}</option>`).join('')}
                                </select>

                                <button id="save-report" class="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all text-xs uppercase tracking-widest whitespace-nowrap ml-auto">
                                    <div class="flex items-center gap-2">
                                        <i data-lucide="save" class="w-4 h-4"></i>
                                        Finalizar Informe
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Desktop View Table -->
                    <div class="hidden md:block overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <tr>
                                    <th class="px-6 py-4 text-left">#</th>
                                    <th class="px-6 py-4 text-left">Jugador</th>
                                    <th class="px-6 py-4 text-right">Estado</th>
                                </tr>
                            </thead>
                            <tbody id="asistencia-list"></tbody>
                        </table>
                    </div>

                    <!-- Mobile View Cards -->
                    <div class="md:hidden p-4 space-y-3 bg-slate-50/50" id="asistencia-list-mobile">
                        <!-- Injected via updateBoard -->
                    </div>
                </div>
            `;
            if (window.lucide) lucide.createIcons();

            const teamMultiBtn = container.querySelector('#team-multi-btn');
            const teamDropdown = container.querySelector('#team-multi-dropdown');
            const convSel = container.querySelector('#conv-sel');
            const dateSel = container.querySelector('#date-sel');
            const saveBtn = container.querySelector('#save-report');

            if (teamMultiBtn && teamDropdown) {
                teamMultiBtn.onclick = (e) => {
                    e.stopPropagation();
                    teamDropdown.classList.toggle('hidden');
                };
                document.addEventListener('click', (e) => {
                    if (!teamDropdown.contains(e.target) && !teamMultiBtn.contains(e.target)) {
                        teamDropdown.classList.add('hidden');
                    }
                });
            }

            container.querySelectorAll('.asistencia-team-check').forEach(chk => {
                chk.onchange = () => {
                    selectedTeamIds = Array.from(container.querySelectorAll('.asistencia-team-check:checked')).map(c => c.value);
                    selectedConvId = null;
                    renderForm();
                    updateBoard();
                };
            });
            
            convSel.onchange = (e) => { 
                selectedConvId = e.target.value;
                const selectedConv = convocatorias.find(c => c.id == selectedConvId);
                if (selectedConv) {
                    selectedTeamIds = [String(selectedConv.equipoid)];
                }
                updateAutoName();
                updateBoard(); 
                renderForm();
            };

            dateSel.onchange = (e) => {
                selectedDate = e.target.value;
                selectedConvId = null;
                renderForm();
                updateAutoName();
                updateBoard();
            };

            saveBtn.onclick = async () => {
                const nameInput = container.querySelector('#report-name');
                if (selectedTeamIds.length === 0 && !selectedConvId) {
                    window.customAlert('Faltan Datos', 'Por favor selecciona al menos un equipo o una convocatoria.', 'warning');
                    return;
                }
                
                const finalData = { ...attendanceData };
                
                // Aggregate current target players
                let currentPlayers = [];
                if (selectedConvId) {
                    const conv = convocatorias.find(c => c.id == selectedConvId);
                    if (conv && Array.isArray(conv.playerids)) {
                        currentPlayers = players.filter(p => conv.playerids.includes(p.id.toString()));
                    }
                } else if (selectedTeamIds.length > 0) {
                    const matchingConvs = convocatorias.filter(c => c.fecha === selectedDate && selectedTeamIds.includes(String(c.equipoid)));
                    if (matchingConvs.length > 0) {
                        const allPids = [...new Set(matchingConvs.flatMap(c => (c.playerids || []).map(String)))];
                        currentPlayers = players.filter(p => allPids.includes(p.id.toString()));
                    } else {
                        currentPlayers = players.filter(j => selectedTeamIds.includes(String(j.equipoid)));
                    }
                }

                currentPlayers.forEach(p => {
                    if (!finalData[p.id]) finalData[p.id] = 'asiste';
                });

                const extra = { eids: selectedTeamIds };
                const baseName = (nameInput ? nameInput.value : 'Asistencia').toUpperCase().trim();
                const fullName = `${baseName} ||| ${JSON.stringify(extra)}`;

                const report = { 
                    id: existingReport ? existingReport.id : undefined, 
                    nombre: fullName,
                    equipoid: selectedTeamIds.length > 0 ? parseInt(selectedTeamIds[0]) : null, 
                    fecha: selectedDate, 
                    players: finalData 
                };
                if (existingReport) await db.update('asistencia', report);
                else await db.add('asistencia', report);
                window.switchView('asistencia');
            };

            updateAutoName();
            updateBoard();
        };

        renderForm();
    }


    // Modal Handling
    addBtn.addEventListener('click', async () => {
        if (currentView === 'asistencia') {
            window.newAsistenciaReport();
            return;
        }
        if (currentView === 'torneos') {
            window.newConvocatoria('Torneo');
            return;
        }
        if (currentView === 'convocatorias') {
            window.newConvocatoria();
            return;
        }
        if (currentView === 'sesiones') {
            window.renderSessionModal();
            return;
        }

        let modalHtml = '';
        if (currentView === 'tareas') {
            modalHtml = `
                <div class="p-8 max-w-2xl w-full mx-auto overflow-y-auto max-h-[80vh]">
                    <h3 class="text-2xl font-black mb-6 text-slate-800 uppercase tracking-tight">Nueva Tarea de Entrenamiento</h3>
                    <div id="new-task-video-preview"></div>
                    <form id="modal-form" class="space-y-6">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-xs font-black text-slate-400 uppercase mb-2">Nombre de la Tarea</label>
                                <input name="name" placeholder="Ej: Rondo 4x4 + 3" class="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all outline-none" required>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-black text-slate-400 uppercase mb-2">Tipo</label>
                                    <select name="type" class="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 text-xs outline-none">
                                        ${TASK_TYPES.map(t => `<option>${t}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-black text-slate-400 uppercase mb-2">Categoría</label>
                                    <select name="categoria" class="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 text-xs outline-none">
                                        ${TASK_CATEGORIES.map(c => `<option>${c}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-black text-slate-400 uppercase mb-2">Objetivo</label>
                                    <select name="objetivo" class="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 text-xs outline-none">
                                        <option value="">Seleccionar...</option>
                                        ${TASK_OBJECTIVES.map(obj => `<option>${obj}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-black text-slate-400 uppercase mb-2">Espacio</label>
                                    <select name="espacio" class="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 text-xs outline-none">
                                        <option value="">Seleccionar...</option>
                                        ${TASK_SPACES.map(s => `<option>${s}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-black text-slate-400 uppercase mb-2">Tiempo (min)</label>
                                    <input name="duration" type="number" value="15" class="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 text-xs outline-none" required>
                                </div>
                        <div class="col-span-2">
                            <label class="block text-xs font-black text-slate-400 uppercase mb-2">Material Requerido</label>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                ${TASK_MATERIALS.map(m => `
                                    <label class="flex items-center gap-2 cursor-pointer group/item">
                                        <input type="checkbox" name="material" value="${m}" class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-50">
                                        <span class="text-[10px] font-black text-slate-500 uppercase group-hover/item:text-blue-600 transition-colors">${m}</span>
                                    </label>
                                `).join('')}
                            </div>
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
                                <div class="col-span-2">
                                    <label class="block text-xs font-black text-slate-400 uppercase mb-2">ID Video (Drive/Youtube)</label>
                                    <input name="video" placeholder="ID del video" class="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white transition-all outline-none">
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="col-span-2">
                                <label class="block text-xs font-black text-slate-400 uppercase mb-2">Cargar Gráfico (Imagen)</label>
                                <input type="file" id="task-image-input" accept="image/*" class="w-full text-xs text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition-all">
                            </div>
                        </div>

                        <div class="flex gap-4 mt-6">
                            <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
                            <button type="submit" class="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all uppercase tracking-widest">Crear Tarea</button>
                        </div>
                    </form>
                </div>
            `;
            
            setTimeout(() => {
                const input = document.getElementById('task-image-input');
                if (input) {
                    input.addEventListener('change', (e) => {
                        // Logic for preview if needed
                    });
                }
                
                // Real-time video preview
                const videoInput = modalContainer.querySelector('input[name="video"]');
                if (videoInput) {
                    videoInput.addEventListener('input', (e) => {
                        const val = e.target.value.trim();
                        const container = document.getElementById('new-task-video-preview');
                        container.innerHTML = window.getTaskVideoEmbed(val);
                    });
                }
            }, 0);
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
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-3">Años de Nacimiento (Categoría)</label>
                                <div id="new-team-year-container" class="grid grid-cols-3 gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 max-h-40 overflow-y-auto custom-scrollbar">
                                    ${[2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020].map(y => `
                                        <label class="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 transition-all">
                                            <input type="checkbox" name="categoria" value="${y}" class="year-checkbox w-4 h-4 rounded text-blue-600 focus:ring-blue-100">
                                            <span class="text-[10px] font-black text-slate-600">${y}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="col-span-2">
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Escudo del Equipo</label>
                                <div class="flex items-center gap-4 p-4 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50">
                                    <input type="file" id="team-crest-input" accept="image/*" class="text-xs text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition-all">
                                </div>
                            </div>
                            <div class="col-span-2">
                                <div class="flex justify-between items-center mb-4">
                                    <div class="flex flex-col">
                                        <label class="text-xs font-bold text-slate-400 uppercase tracking-widest">Vincular Jugadores</label>
                                        <div class="flex items-center gap-2 mt-2">
                                            <button type="button" class="gender-tag-btn px-3 py-1 rounded-lg text-[8px] font-black uppercase border border-slate-200 hover:bg-slate-50 transition-all select-none" data-gender="Masculino">Masculino</button>
                                            <button type="button" class="gender-tag-btn px-3 py-1 rounded-lg text-[8px] font-black uppercase border border-slate-200 hover:bg-slate-50 transition-all select-none" data-gender="Femenino">Femenino</button>
                                        </div>
                                    </div>
                                    <button type="button" id="new-select-all-btn" class="text-[9px] font-black text-blue-600 uppercase hover:text-blue-700 transition-colors">Seleccionar Todos</button>
                                </div>
                                <div id="new-linked-players-list" class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <!-- Players will be filtered here -->
                                </div>
                            </div>
                        </div>
                        <div class="flex gap-4 mt-6">
                            <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
                            <button type="submit" class="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all mt-4 uppercase tracking-widest">Crear Equipo</button>
                        </div>
                    </form>
                </div>
            `;
            setTimeout(() => {
                let selectedGender = null;
                const update = () => {
                    const selectedYears = [...document.querySelectorAll('.year-checkbox:checked')].map(cb => cb.value);
                    const filtered = players.filter(p => {
                        const matchesYear = selectedYears.length === 0 || selectedYears.includes(p.anionacimiento?.toString());
                        const matchesGender = !selectedGender || p.sexo === selectedGender;
                        return matchesYear && matchesGender;
                    });
                    
                    listDiv.innerHTML = filtered.map(p => `
                        <label class="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-xl cursor-pointer hover:border-blue-200 transition-all">
                            <input type="checkbox" name="linkedPlayerIds" value="${p.id}" class="w-4 h-4 rounded text-blue-600">
                            <div class="flex-1 min-w-0">
                                <p class="text-[10px] font-bold text-slate-700 truncate">${p.nombre}</p>
                                <div class="flex gap-2 items-center">
                                    <p class="text-[8px] font-black text-slate-400 uppercase">${p.anionacimiento || '----'}</p>
                                    <p class="text-[7px] font-black ${p.sexo === 'Femenino' ? 'text-rose-400' : 'text-blue-400'} uppercase">${p.sexo || 'MASC'}</p>
                                </div>
                            </div>
                        </label>
                    `).join('') || `<p class="col-span-full p-8 text-center text-xs text-slate-400 italic font-medium">No hay jugadores para estos filtros.</p>`;
                    if (window.lucide) lucide.createIcons();
                };
                
                document.querySelectorAll('.gender-tag-btn').forEach(btn => {
                    btn.onclick = () => {
                        if (selectedGender === btn.getAttribute('data-gender')) {
                            selectedGender = null;
                            btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
                        } else {
                            document.querySelectorAll('.gender-tag-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white', 'border-blue-600'));
                            selectedGender = btn.getAttribute('data-gender');
                            btn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
                        }
                        update();
                    };
                });
                
                document.querySelectorAll('.year-checkbox').forEach(cb => cb.addEventListener('change', update));
                update();

                if (selectAllBtn) {
                    selectAllBtn.onclick = () => {
                        const checkboxes = listDiv.querySelectorAll('input[type="checkbox"]');
                        checkboxes.forEach(cb => cb.checked = true);
                    };
                }
            }, 0);

        } else if (currentView === 'eventos' || currentView === 'usuarios') {
            const { data: users } = await supabaseClient.from('profiles').select('*');
            const currentUser = (await supabaseClient.auth.getUser()).data.user;

            if (currentView === 'usuarios') {
                modalHtml = `
                    <div class="p-8">
                        <h3 class="text-2xl font-black mb-6 text-slate-800 uppercase tracking-tight">Nuevo Miembro del Staff</h3>
                        <form id="modal-form" class="space-y-6">
                             <div class="grid grid-cols-2 gap-4">
                                <div class="col-span-2">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nombre Completo</label>
                                    <input name="name" placeholder="Ej: Juan Pérez" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 ring-blue-50 font-bold" required>
                                </div>
                                <div class="col-span-2">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email de Acceso</label>
                                    <input name="email" type="email" placeholder="email@ejemplo.com" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 ring-blue-50 font-bold" required>
                                </div>
                                <div class="col-span-2">
                                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rol en el Equipo</label>
                                    <select name="role" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold">
                                        <option>TECNICO</option>
                                        <option>ELITE</option>
                                        <option>TECNICO CLUB CONVENIDO</option>
                                    </select>
                                </div>
                             </div>
                             <div class="bg-blue-50 p-4 rounded-2xl text-[10px] text-blue-700 font-bold">
                                <i data-lucide="info" class="inline w-3 h-3 mr-1"></i> Esto creará un registro de staff. El usuario podrá acceder si se registra con este mismo email.
                             </div>
                             <div class="flex gap-4">
                                <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl">Cancelar</button>
                                <button type="submit" class="flex-[2] py-4 bg-slate-900 text-white font-black rounded-2xl shadow-lg uppercase tracking-widest">Registrar Miembro</button>
                             </div>
                        </form>
                    </div>
                `;
            } else {
                modalHtml = `
                    <div class="p-8">
                    <h3 class="text-2xl font-black mb-6 text-slate-800 uppercase tracking-tight">Nuevo Evento de Agenda</h3>
                    <form id="modal-form" class="space-y-6">
                        <!-- Campos principales -->
                        <div class="grid grid-cols-2 gap-4">
                            <input name="nombre" placeholder="Título del evento" class="col-span-2 w-full p-4 border rounded-2xl text-lg font-bold outline-none focus:ring-2 ring-amber-100" required>
                            <select name="categoria" class="w-full p-3 border rounded-xl bg-white outline-none">
                                <option>Reunión</option><option>Partido</option><option>Scouting</option><option>Mandar convocatorias</option><option>Preparar equipos torneos</option><option>Preparar jugadores ciclos/sesiones</option><option>Lavar ropa</option><option>Otro</option>
                            </select>
                            <input name="hora" type="time" class="w-full p-3 border rounded-xl" required>
                            <input name="fecha" type="date" class="w-full p-3 border rounded-xl" required>
                            <input name="lugar" placeholder="Lugar (Campo, Oficina...)" class="w-full p-3 border rounded-xl">
                            <textarea name="notas" placeholder="Notas adicionales..." class="col-span-2 w-full p-3 border rounded-xl h-24 outline-none focus:ring-2 ring-amber-100"></textarea>
                        </div>

                        <!-- Panel de Compartir -->
                        ${(users && db.userRole !== 'TECNICO CLUB CONVENIDO') ? `
                            <div class="space-y-3">
                                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest">Compartir con el Staff</label>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100 custom-scrollbar">
                                    ${users.filter(u => u.id !== currentUser.id).map(u => `
                                        <label class="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 transition-all select-none">
                                            <input type="checkbox" name="sharedWith" value="${u.id}" class="w-4 h-4 rounded text-blue-600 focus:ring-blue-100">
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
                            <button type="submit" class="flex-[2] py-4 bg-amber-600 text-white font-black rounded-2xl shadow-lg shadow-amber-500/20 hover:bg-amber-700 transition-all uppercase tracking-widest">Añadir y Compartir</button>
                        </div>
                    </form>
                </div>
                `;
            }
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
                                <select name="equipoid" class="w-full p-3 border rounded-xl bg-white">
                                    <option value="">Ninguno (Libre)</option>
                                    ${teams.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('')}
                                </select>
                            </div>
                            <div class="col-span-2">
                                 <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Posiciones del Jugador (Multiselección)</label>
                                 ${window.renderPositionSelector([], 'reg-pos')}
                            </div>
                            <div class="col-span-2">
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Club Convenido</label>
                                <select name="equipoConvenido" class="w-full p-3 border rounded-xl bg-white">
                                    <option value="">Ninguno</option>
                                    ${CLUBES_CONVENIDOS.map(c => `<option value="${c}">${c}</option>`).join('')}
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Año de Nacimiento</label>
                                <input name="anionacimiento" type="number" placeholder="Ej: 2010" class="w-full p-3 border rounded-xl">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Fecha de Nacimiento</label>
                                <input name="fechanacimiento" type="date" class="w-full p-3 border rounded-xl">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Pie / Lateralidad</label>
                                <select name="pie" class="w-full p-3 border rounded-xl bg-white">
                                    <option value="DIESTRO">DIESTRO</option>
                                    <option value="ZURDO">ZURDO</option>
                                    <option value="AMBIDIESTRO">AMBIDIESTRO</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Sexo / Género</label>
                                <select name="sexo" class="w-full p-3 border rounded-xl bg-white">
                                    <option value="Masculino" selected>Masculino</option>
                                    <option value="Femenino">Femenino</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nivel (1-5)</label>
                                <select name="nivel" class="w-full p-3 border rounded-xl bg-white">
                                    <option value="1">⭐ (Muy Bajo)</option><option value="2">⭐⭐ (Bajo)</option>
                                    <option value="3" selected>⭐⭐⭐ (Normal)</option><option value="4">⭐⭐⭐⭐ (Alto)</option>
                                    <option value="5">⭐⭐⭐⭐⭐ (Top)</option>
                                </select>
                            </div>
                        </div>
                         <div class="flex gap-4 mt-6">
                            <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all font-black uppercase tracking-tight text-[10px]">Cancelar</button>
                            <button type="submit" class="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg mt-4 uppercase tracking-widest text-[10px]">Guardar en Directorio</button>
                        </div>
                        <div class="mt-4 pt-4 border-t border-slate-100 flex flex-col items-center">
                             <button type="button" onclick="window.showPlayerImportModal()" class="w-full py-4 bg-slate-50 text-blue-600 font-black rounded-2xl hover:bg-blue-50 transition-all uppercase tracking-widest text-[9px] border border-blue-100/50">
                                 O usar Importación Masiva (CSV)
                             </button>
                        </div>
                    </form>
                </div>
            `;
        }

        if (modalHtml) {
            modalContainer.innerHTML = modalHtml;
            lucide.createIcons(); modalOverlay.classList.add('active');
            attachFormSubmit(currentView);
        }
    });

    function attachFormSubmit(viewId) {
        const form = document.getElementById('modal-form');
        if (!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            if (data.nombre) data.nombre = data.nombre.toUpperCase().trim();
            if (data.titulo) data.titulo = data.titulo.toUpperCase().trim();
            if (data.name) data.name = data.name.toUpperCase().trim();
            if (data.lugar) data.lugar = data.lugar.toUpperCase().trim();

            if (viewId === 'jugadores') {
                data.posicion = formData.getAll('posicion').join(', ');
            }

            
            try {
                // Handle multiple checkboxes (taskids, playerids)
                if (viewId === 'sesiones') {
                    data.taskids = formData.getAll('taskids');
                    data.playerids = formData.getAll('playerids');
                    
                    const tasksMeta = {};
                    data.taskids.forEach(tid => {
                        const playerGroups = {};
                        data.playerids.forEach(pid => {
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
                
                if (viewId === 'usuarios') {
                    await window.addNewStaffMember(formData);
                    return;
                }
                
                if (viewId === 'tareas') {
                    data.material = formData.getAll('material').join(', ');
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
                    const selectedCat = formData.getAll('categoria');
                    const catStr = selectedCat.join(', ');
                    
                    data.nombre = `${data.nombre.trim().toUpperCase()} ||| ${catStr}`;
                    data.categoria = parseInt(selectedCat[0]) || null;
                    
                    const savedTeam = await db.add('equipos', data);
                    
                    // Update linked players
                    if (linkedPlayerIds.length > 0) {
                        const players = await db.getAll('jugadores');
                        for (const pid of linkedPlayerIds) {
                            const p = players.find(x => x.id == pid);
                            if (p) {
                                p.equipoid = (savedTeam.id); 
                                await db.update('jugadores', p);
                            }
                        }
                    }
                    
                    window.customAlert('¡Éxito!', 'Equipo creado y jugadores vinculados correctamente.', 'success');
                    closeModal();
                    window.switchView('equipos');
                    return; // Prevent default db.add at bottom
                }
                
                if (viewId === 'sesiones') {
                    const teams = await db.getAll('equipos');
                    const t = teams.find(team => team.id == data.equipoid);
                    data.equiponombre = t ? t.nombre : 'Equipo';
                }

                // Solo añadir metadatos de staff (compartir y creador) para entidades que lo permiten
                const entitiesWithStaffMeta = ['tareas', 'sesiones', 'convocatorias', 'eventos', 'asistencia'];
                if (entitiesWithStaffMeta.includes(viewId)) {
                    data.sharedWith = formData.getAll('sharedWith');
                    const currentUser = (await supabaseClient.auth.getUser()).data.user;
                    if (currentUser) data.createdBy = currentUser.id;
                }

                await db.add(viewId, data);

                if (window.refreshNotifications) window.refreshNotifications();
                window.customAlert('Éxito', 'Guardado correctamente');
                closeModal();
                switchView(viewId);
            } catch (err) {
                console.error('Error saving data:', err);
                window.customAlert('Error', 'Error al guardar: ' + err.message);
            }
        });
    }

    async function renderPerfil(container) {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) {
                container.innerHTML = `<p class="p-10 text-slate-400 italic text-center">Inicia sesión para ver tu perfil.</p>`;
                return;
            }

            let { data: profile, error } = await supabaseClient.from('profiles').select('*').eq('id', user.id).maybeSingle();
            
            // Si no hay perfil por ID, intentamos por email (usuarios creados manualmente)
            if (!profile) {
                const { data: emailProfiles } = await supabaseClient.from('profiles').select('*').eq('email', user.email);
                if (emailProfiles && emailProfiles.length > 0) {
                    profile = emailProfiles[0];
                    // Atamos el ID para futuras consultas
                    await supabaseClient.from('profiles').update({ id: user.id }).eq('email', user.email);
                }
            }

            if (!profile) {
                // Auto-creación definitiva con detección de columnas
                const { data: firstProfile } = await supabaseClient.from('profiles').select('*').limit(1).maybeSingle();
                const newRow = { id: user.id, email: user.email, role: 'TECNICO' };
                const initialName = user.user_metadata?.full_name || user.user_metadata?.name || '';
                
                if (firstProfile) {
                    if ('name' in firstProfile) newRow.name = initialName;
                    if ('full_name' in firstProfile) newRow.full_name = initialName;
                    if ('nombre' in firstProfile) newRow.nombre = initialName;
                } else {
                    // Fallback a 'name' si es el primer registro absoluto
                    newRow.name = initialName;
                }

                const { data: newProfile } = await supabaseClient.from('profiles').insert([newRow]).select().maybeSingle();
                profile = newProfile;
            }

            if (!profile) throw new Error("No se pudo obtener ni crear el perfil");
            
            const currentName = profile.name || profile.full_name || profile.nombre || '';

        container.innerHTML = `
            <div class="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div class="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-8 opacity-10">
                        <i data-lucide="user" class="w-32 h-32"></i>
                    </div>
                    <div class="flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10">
                        <div class="relative group">
                            <input type="file" id="avatar-input" class="hidden" accept="image/*">
                            <div id="avatar-display" class="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-blue-500/30 group-hover:rotate-6 transition-all duration-500 overflow-hidden">
                                ${profile.avatar_url ? `<img src="${profile.avatar_url}" class="w-full h-full object-cover">` : (currentName ? currentName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase())}
                            </div>
                            <button onclick="document.getElementById('avatar-input').click()" class="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl border border-slate-100 shadow-md text-slate-400 hover:text-blue-600 transition-all shadow-xl">
                                <i data-lucide="camera" class="w-4 h-4"></i>
                            </button>
                        </div>
                        <div class="flex-1 text-center md:text-left">
                            <h3 class="text-3xl font-black text-slate-800 uppercase tracking-tight mb-2">${currentName || 'Sin Nombre'}</h3>
                            <div class="flex flex-wrap justify-center md:justify-start gap-3 items-center">
                                <span class="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">${profile.role}</span>
                                <span class="text-sm text-slate-400 font-medium">${user.email}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-lg space-y-6">
                        <div class="flex items-center gap-3 mb-2">
                             <div class="p-2 bg-slate-50 rounded-xl text-slate-400"><i data-lucide="settings-2" class="w-5 h-5"></i></div>
                             <h4 class="text-lg font-black text-slate-800 uppercase tracking-tight">Datos de Usuario</h4>
                        </div>
                        <form id="profile-form" class="space-y-4">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Nombre Completo</label>
                                <input name="full_name" value="${currentName}" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all font-bold text-slate-700" placeholder="Tu nombre...">
                            </div>
                            <button type="submit" class="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-lg hover:bg-black transition-all uppercase tracking-widest text-xs">Guardar Cambios</button>
                        </form>
                    </div>

                    <div class="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-lg space-y-6">
                        <div class="flex items-center gap-3 mb-2">
                             <div class="p-2 bg-red-50 rounded-xl text-red-400"><i data-lucide="key" class="w-5 h-5"></i></div>
                             <h4 class="text-lg font-black text-slate-800 uppercase tracking-tight">Seguridad</h4>
                        </div>
                        <form id="password-form" class="space-y-4">
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Nueva Contraseña</label>
                                <input name="password" type="password" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-red-50 transition-all font-bold text-slate-700" placeholder="••••••••">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Confirmar Contraseña</label>
                                <input name="confirm_password" type="password" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-red-50 transition-all font-bold text-slate-700" placeholder="••••••••">
                            </div>
                            <button type="submit" class="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all uppercase tracking-widest text-xs">Actualizar Contraseña</button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
        
        const avatarInput = container.querySelector('#avatar-input');
        if (avatarInput) {
            avatarInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                // Show loading state
                const display = container.querySelector('#avatar-display');
                display.innerHTML = '<div class="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>';

                const reader = new FileReader();
                reader.onload = async (re) => {
                    const base64 = re.target.result;
                    const { error } = await supabaseClient.from('profiles').update({ avatar_url: base64 }).eq('id', user.id);
                    if (!error) {
                        window.customAlert('Éxito', 'Foto de perfil actualizada', 'success');
                        window.switchView('perfil');
                    } else {
                        window.customAlert('Error', 'No se pudo guardar la imagen: ' + error.message, 'error');
                        window.switchView('perfil');
                    }
                };
                reader.readAsDataURL(file);
            };
        }

        container.querySelector('#profile-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const newName = formData.get('full_name');

            // Detección dinámica ultra-robusta de columnas
            const { data: profileCheck } = await supabaseClient.from('profiles').select('*').eq('id', user.id).maybeSingle();
            const updatePayload = {};
            const nameKeys = ['name', 'full_name', 'nombre', 'nombre_completo'];
            
            if (profileCheck) {
                const existingKeys = Object.keys(profileCheck);
                nameKeys.forEach(key => {
                    if (existingKeys.includes(key)) updatePayload[key] = newName;
                });
            }

            if (Object.keys(updatePayload).length === 0) {
                // Fallback desesperado: intentar con 'name'
                updatePayload.name = newName;
            }

            const { error } = await supabaseClient.from('profiles').update(updatePayload).eq('id', user.id);

            if (!error) {
                window.customAlert('Éxito', 'Perfil actualizado', 'success');
                window.switchView('perfil');
            } else {
                window.customAlert('Error', error.message, 'error');
            }
        };

        container.querySelector('#password-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const pass = formData.get('password');
            if (pass !== formData.get('confirm_password')) {
                window.customAlert('Error', 'Las contraseñas no coinciden', 'error'); return;
            }
            const { error } = await supabaseClient.auth.updateUser({ password: pass });
            if (!error) window.customAlert('Éxito', 'Contraseña actualizada', 'success');
        };
        } catch (err) {
            console.error("Error in renderPerfil:", err);
            container.innerHTML = `<p class="p-10 text-red-500">Error: ${err.message}</p>`;
        }
    }

    async function renderUsuarios(container) {
        try {
            const { data: profiles, error } = await supabaseClient.from('profiles').select('*');
            const currentUserRole = db.userRole || 'TECNICO';

            if (error) {
                 container.innerHTML = `<div class="p-10 bg-red-50 text-red-600 rounded-3xl border border-red-100"><p class="font-bold">Error de Acceso</p><p class="text-xs opacity-80">${error.message}</p></div>`;
                 return;
            }

            container.innerHTML = `
                <div class="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                    <table class="w-full">
                        <thead>
                            <tr class="bg-slate-50 text-left border-b border-slate-100">
                                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Nombre</th>
                                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Email</th>
                                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">Rol</th>
                                <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${profiles && profiles.length > 0 ? profiles.map(u => `
                                <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <td class="px-6 py-4 font-bold text-slate-800">${u.name || u.full_name || u.nombre || 'Sin Nombre'}</td>
                                    <td class="px-6 py-4 text-xs text-slate-500">${u.email}</td>
                                    <td class="px-6 py-4">
                                        <span class="px-3 py-1 ${u.role === 'ELITE' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'} rounded-full text-[10px] font-black uppercase tracking-tighter">
                                            ${u.role}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        ${currentUserRole === 'ELITE' ? `
                                            <div class="flex justify-end gap-2">
                                                <button onclick="window.resetUserPasswordEmail('${u.email}')" title="Resetear Contraseña" class="p-2 text-slate-400 hover:text-amber-500 transition-all"><i data-lucide="key" class="w-4 h-4"></i></button>
                                                <button onclick="window.editUserAdmin('${u.id}')" title="Editar Perfil" class="p-2 text-slate-400 hover:text-blue-600 transition-all"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                                                <button onclick="window.deleteUserStaff('${u.id}')" title="Eliminar" class="p-2 text-slate-400 hover:text-red-500 transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                                            </div>
                                        ` : '<span class="text-[10px] text-slate-300 italic">Lectura</span>'}
                                    </td>
                                </tr>
                            `).join('') : '<tr><td colspan="4" class="p-10 text-center text-slate-400 italic">No hay miembros registrados aún.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            <p class="mt-6 text-xs text-slate-400 italic px-6 mb-12">* Solo los usuarios con rol ELITE pueden editar perfiles de Staff y gestionar permisos globales.</p>
            
            <div class="pt-8 border-t border-slate-100">
                <div class="flex items-center gap-3 mb-6 px-4">
                    <div class="p-2 bg-blue-50 rounded-xl text-blue-600"><i data-lucide="user-cog" class="w-5 h-5"></i></div>
                    <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">Tu Configuración Personal</h3>
                </div>
                <div id="self-profile-container"></div>
            </div>
        `;

        // Render profile card below
        const selfContainer = container.querySelector('#self-profile-container');
        if (selfContainer) await renderPerfil(selfContainer);

        } catch (err) {
            console.error("Error in renderUsuarios:", err);
            container.innerHTML = `<p class="p-10 text-red-500">Error: ${err.message}</p>`;
        }
    }

    window.toggleUserRole = async (userId, currentRole) => {
        const newRole = currentRole === 'ELITE' ? 'TECNICO' : 'ELITE';
        const { error } = await supabaseClient.from('profiles').update({ role: newRole }).eq('id', userId);
        if (error) alert("Error: " + error.message);
        else window.switchView('usuarios');
    };

    window.addNewStaffMember = async (formData) => {
        const name = formData.get('name');
        const email = formData.get('email');
        const role = formData.get('role');

        const { data, error } = await supabaseClient.from('profiles').insert([
            { id: crypto.randomUUID(), name, email, role }
        ]);

        if (error) {
            window.customAlert('Error', error.message, 'error');
        } else {
            window.customAlert('Éxito', 'Miembro añadido correctamente', 'success');
            closeModal();
            window.switchView('usuarios');
        }
    };
    window.resetUserPasswordEmail = async (email) => {
        window.customConfirm('RESETEAR ACCESO', `¿Quieres enviar un enlace de recuperación de contraseña a ${email}?`, async () => {
            try {
                const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin
                });
                if (error) throw error;
                window.customAlert('¡Enviado!', 'Se ha enviado un correo con las instrucciones para crear una nueva contraseña.', 'success');
            } catch (err) {
                window.customAlert('Error', err.message, 'error');
            }
        });
    };

    window.editUserAdmin = async (userId) => {
        const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
        
        modalContainer.innerHTML = `
            <div class="p-8">
                <h3 class="text-2xl font-black mb-6 text-slate-800 uppercase tracking-tight">Editar Perfil de Staff</h3>
                <form id="admin-user-edit-form" class="space-y-6">
                    <input type="hidden" name="id" value="${profile.id}">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Nombre Completo</label>
                            <input name="full_name" value="${profile.name || profile.full_name || profile.nombre || ''}" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700">
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Rol de Permisos</label>
                            <select name="role" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-slate-700">
                                <option ${profile.role === 'TECNICO' ? 'selected' : ''}>TECNICO</option>
                                <option ${profile.role === 'ELITE' ? 'selected' : ''}>ELITE</option>
                                <option ${profile.role === 'TECNICO CLUB CONVENIDO' ? 'selected' : ''}>TECNICO CLUB CONVENIDO</option>
                            </select>
                        </div>
                    </div>
                    <div class="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                        <p class="text-[10px] text-amber-700 font-bold leading-relaxed">
                            <i data-lucide="info" class="w-3 h-3 inline mr-1"></i> Por seguridad, no puedes cambiar la contraseña directamente. Si el usuario la olvidó, debe usar la opción de "Recuperar Contraseña" en el login o puedes enviar un email de reseteo si tienes configurado el servicio de Auth.
                        </p>
                    </div>
                    <div class="flex gap-4">
                        <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-[10px]">Cerrar</button>
                        <button type="submit" class="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 transition-all uppercase tracking-widest text-[10px]">Actualizar Staff</button>
                    </div>
                </form>
            </div>
        `;
        
        lucide.createIcons();
        modalOverlay.classList.add('active');

        modalContainer.querySelector('#admin-user-edit-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const updateData = { role: formData.get('role') };
            const nameToSet = formData.get('full_name');
            // Intentar actualizar ambos campos por si acaso
            updateData.name = nameToSet;
            
            const { error } = await supabaseClient.from('profiles').update(updateData).eq('id', userId);
            
            if (!error) {
                window.customAlert('Éxito', 'Staff actualizado correctamente', 'success');
                closeModal();
                window.renderView('usuarios');
            } else {
                window.customAlert('Error', error.message, 'error');
            }
        };
    };

    let currentConvocatoriaTab = 'Ciclo';
    let currentConvocatoriaTeamId = 'all';

    let convocatoriaSearchTerm = '';
    window.updateConvocatoriaSearch = (val) => {
        convocatoriaSearchTerm = val;
        window.renderView('convocatorias');
    };

    window.switchConvocatoriaTeamTab = (tid) => {
        currentConvocatoriaTeamId = tid;
        window.renderView('convocatorias');
    };

    window.renderConvocatorias = async function(container) {
        const { data: convs, error } = await supabaseClient.from('convocatorias').select('*').order('fecha', { ascending: false }).order('hora', { ascending: false });
        if (error) {
            container.innerHTML = `<p class="p-10 text-red-500">Error: ${error.message}</p>`;
            return;
        }

        const teams = await db.getAll('equipos');
        const teamsMap = Object.fromEntries(teams.map(t => [t.id, t.nombre]));

        const userRes = await supabaseClient.auth.getUser();
        const currentUser = userRes.data?.user;
        const isGlobal = window.currentVisibilityMode === 'global';

        const filtered = convs.filter(c => {
            const matchesTab = c.tipo === currentConvocatoriaTab;

            const matchesTeam = currentConvocatoriaTeamId === 'all' || 
                              (c.equipoid && c.equipoid.toString() === currentConvocatoriaTeamId.toString()) ||
                              (c.lugar && c.lugar.includes(' ||| ') && JSON.parse(c.lugar.split(' ||| ')[1]).eids?.includes(currentConvocatoriaTeamId.toString()));
            const matchesSearch = !convocatoriaSearchTerm || 
                c.nombre.toLowerCase().includes(convocatoriaSearchTerm.toLowerCase()) ||
                (c.lugar && c.lugar.toLowerCase().includes(convocatoriaSearchTerm.toLowerCase()));
            return matchesTab && matchesTeam && matchesSearch;
        });

        // Get teams that have convocatorias of this type to show in sub-tabs
        const teamsWithConvs = teams.filter(t => 
            convs.some(c => c.tipo === currentConvocatoriaTab && 
                ((c.equipoid && c.equipoid.toString() === t.id.toString()) || 
                 (c.lugar && c.lugar.includes(' ||| ') && JSON.parse(c.lugar.split(' ||| ')[1]).eids?.includes(t.id.toString())))
            )
        );

        // Sort teams from senior to junior (by birth year / category)
        teamsWithConvs.sort((a, b) => {
            const valA = parseInt(a.categoria) || 9999;
            const valB = parseInt(b.categoria) || 9999;
            if (valA !== valB) return valA - valB;
            return a.nombre.localeCompare(b.nombre);
        });

        container.innerHTML = `
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <!-- Tabs -->
                <div class="flex gap-2 p-1 bg-slate-100 rounded-2xl w-max">
                    ${[
                        { label: 'Ciclos', value: 'Ciclo' },
                        { label: 'Sesiones', value: 'Sesión' },
                        { label: 'Zubieta', value: 'Zubieta' }
                    ].map(tab => `
                        <button onclick="window.switchConvocatoriaTab('${tab.value}')" class="px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${currentConvocatoriaTab === tab.value ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
                            ${tab.label}
                        </button>
                    `).join('')}
                </div>

                <!-- Search box -->
                <div class="relative w-full md:w-80">
                    <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                    <input type="text" 
                        id="convocatoria-search-input"
                        placeholder="Buscar en ${currentConvocatoriaTab}..." 
                        value="${convocatoriaSearchTerm}"
                        oninput="window.updateConvocatoriaSearch(this.value)"
                        class="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 ring-blue-50 focus:border-blue-400 transition-all">
                </div>
            </div>

            <!-- Team Sub-tabs -->
            <div class="mb-8 flex flex-wrap gap-2 animate-in slide-in-from-left duration-500">
                <button onclick="window.switchConvocatoriaTeamTab('all')" class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentConvocatoriaTeamId === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}">
                    TODOS LOS EQUIPOS
                </button>
                ${teamsWithConvs.map(t => `
                    <button onclick="window.switchConvocatoriaTeamTab('${t.id}')" class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentConvocatoriaTeamId.toString() === t.id.toString() ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}">
                        ${t.nombre}
                    </button>
                `).join('')}
            </div>

            <!-- Mobile View (Cards) -->
            <div class="md:hidden space-y-4">
                ${filtered.map(c => `
                    <div onclick="window.viewConvocatoria(${c.id})" class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm active:scale-[0.98] transition-all">
                        <div class="flex justify-between items-start mb-4">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center"><i data-lucide="scroll-text" class="w-5 h-5"></i></div>
                                <div>
                                    <h4 class="font-bold text-slate-800 text-sm uppercase">${c.nombre}</h4>
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        ${c.fecha} • 
                                        ${(() => {
                                            if (c.lugar && c.lugar.includes(' ||| ')) {
                                                try {
                                                    const ex = JSON.parse(c.lugar.split(' ||| ')[1]);
                                                    if (ex.hi) return `${ex.hl ? `${ex.hl} > ` : ''}${ex.hi}${ex.hs ? ` > ${ex.hs}` : ''}`;
                                                } catch(e) {}
                                            }
                                            return c.hora || '--:--';
                                        })()}
                                    </p>
                                </div>
                            </div>
                            <span class="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[9px] font-black uppercase tracking-widest">${c.tipo}</span>
                        </div>
                        <div class="flex items-center justify-between mt-6">
                            <div class="flex items-center gap-2">
                                <i data-lucide="users" class="w-4 h-4 text-slate-300"></i>
                                <span class="text-[11px] font-black text-slate-600 uppercase tracking-tight">${(c.playerids || []).length} JUGADORES</span>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="event.stopPropagation(); window.deleteConvocatoria(${c.id})" class="p-2 text-red-300 hover:text-red-500">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('') || `<div class="py-20 text-center italic text-slate-400">No hay convocatorias</div>`}
            </div>

            <!-- Desktop View (Table) -->
            <div class="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50 border-b border-slate-100">
                                <th class="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nombre / Evento</th>
                                <th class="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fecha</th>
                                <th class="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Equipo</th>
                                <th class="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Lugar</th>
                                <th class="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Convocados</th>
                                <th class="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${filtered.map(c => {
                                let displayLugar = window.cleanLugar(c.lugar) || '--';
                                
                                const teamName = teamsMap[c.equipoid] || 'Múltiples / Gen.';
                                const playerCount = Array.isArray(c.playerids) ? c.playerids.length : 0;

                                return `
                                    <tr class="hover:bg-blue-50/30 transition-colors group cursor-pointer" onclick="window.viewConvocatoria(${c.id})">
                                        <td class="p-6">
                                            <p class="text-sm font-black text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors">${c.nombre}</p>
                                        </td>
                                        <td class="p-6">
                                            <div class="flex flex-col">
                                                <span class="text-xs font-bold text-slate-700">${c.fecha}</span>
                                                <span class="text-[10px] font-black text-slate-400 uppercase">
                                                    ${(() => {
                                                        if (c.lugar && c.lugar.includes(' ||| ')) {
                                                            try {
                                                                const ex = JSON.parse(c.lugar.split(' ||| ')[1]);
                                                                if (ex.hi) return `${ex.hl ? `${ex.hl} > ` : ''}${ex.hi}${ex.hs ? ` > ${ex.hs}` : ''}`;
                                                            } catch(e) {}
                                                        }
                                                        return c.hora || '--:--';
                                                    })()}
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
                                            <div class="inline-flex items-center gap-2.5 bg-blue-50 text-blue-600 px-4 py-2 rounded-2xl border border-blue-100/50 shadow-sm transition-all hover:bg-blue-100/50">
                                                <i data-lucide="users" class="w-4 h-4"></i>
                                                <span class="text-sm font-black tracking-tight">${playerCount}</span>
                                            </div>
                                        </td>
                                        <td class="p-6 text-right">
                                            <div class="flex justify-end gap-2">
                                                <button onclick="event.stopPropagation(); window.deleteConvocatoria(${c.id})" class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                                </button>
                                                <i data-lucide="chevron-right" class="w-5 h-5 text-slate-200 group-hover:text-blue-400 transition-all"></i>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('') || `<tr><td colspan="6" class="p-20 text-center text-slate-300 italic">No se han encontrado convocatorias.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="mt-8 flex justify-between items-center px-4">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mostrando ${filtered.length} de ${convs.length} registros</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        // Focus the search input if it was active
        const searchInput = document.getElementById('convocatoria-search-input');
        if (searchInput && convocatoriaSearchTerm) {
            searchInput.focus();
            searchInput.setSelectionRange(convocatoriaSearchTerm.length, convocatoriaSearchTerm.length);
        }
    }

    window.switchConvocatoriaTab = (tab) => {
        currentConvocatoriaTab = tab;
        currentConvocatoriaTeamId = 'all'; // Reset team filter when switching type
        window.renderView('convocatorias');
    };

    window.newConvocatoria = async (forcedTab = null) => {
        const userRes = await supabaseClient.auth.getUser();
        const currentUser = userRes.data?.user;
        const players = await db.getAll('jugadores');
        const teams = await db.getAll('equipos');
        const { data: users } = await (supabaseClient ? supabaseClient.from('profiles').select('*') : { data: [] });
        const activeTab = forcedTab || currentConvocatoriaTab;
        
        modalContainer.innerHTML = `
            <div class="p-8">
                <h3 class="text-2xl font-bold text-slate-800 mb-6">Crear Convocatoria: <span class="text-blue-600">${activeTab}</span></h3>
                <form id="new-convocatoria-form" class="space-y-6">
                        <input type="hidden" name="tipo" value="${activeTab}">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="col-span-1 md:col-span-2">
                                 <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nombre / Evento</label>
                                 <input name="nombre" class="w-full p-4 border rounded-2xl text-lg font-bold outline-none focus:ring-2 ring-blue-100" placeholder="Ej: Entrenamiento Lunes" required>
                            </div>
                            
                            ${activeTab === 'Ciclo' ? `
                                <!-- SESION 1 -->
                                <div class="col-span-1 md:col-span-2 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                    <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Sesión 1</p>
                                    <div class="grid grid-cols-3 gap-3">
                                        <input name="fecha" type="date" class="p-3 border rounded-xl outline-none text-xs" required>
                                        <input name="hora" type="time" class="p-3 border rounded-xl outline-none text-xs" required>
                                        <input name="lugar" class="p-3 border rounded-xl outline-none text-xs" placeholder="Lugar 1">
                                    </div>
                                </div>
                                <!-- SESION 2 -->
                                <div class="col-span-1 md:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sesión 2</p>
                                    <div class="grid grid-cols-3 gap-3">
                                        <input name="fecha2" type="date" class="p-3 border rounded-xl outline-none text-xs">
                                        <input name="hora2" type="time" class="p-3 border rounded-xl outline-none text-xs">
                                        <input name="lugar2" class="p-3 border rounded-xl outline-none text-xs" placeholder="Lugar 2">
                                    </div>
                                </div>
                                <!-- SESION 3 -->
                                <div class="col-span-1 md:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sesión 3</p>
                                    <div class="grid grid-cols-3 gap-3">
                                        <input name="fecha3" type="date" class="p-3 border rounded-xl outline-none text-xs">
                                        <input name="hora3" type="time" class="p-3 border rounded-xl outline-none text-xs">
                                        <input name="lugar3" class="p-3 border rounded-xl outline-none text-xs" placeholder="Lugar 3">
                                    </div>
                                </div>
                            ` : `
                                 <div class="col-span-2 grid grid-cols-3 gap-3">
                                    <div>
                                         <label class="block text-[10px] font-black text-slate-400 uppercase mb-2">Hora Llegada</label>
                                         <input name="hora_llegada" type="time" class="w-full p-3 border rounded-xl outline-none text-xs">
                                    </div>
                                    <div>
                                         <label class="block text-[10px] font-black text-slate-400 uppercase mb-2">Hora Inicio</label>
                                         <input name="hora_inicio" type="time" class="w-full p-3 border rounded-xl outline-none text-xs" required>
                                    </div>
                                    <div>
                                         <label class="block text-[10px] font-black text-slate-400 uppercase mb-2">Hora Salida</label>
                                         <input name="hora_salida" type="time" class="w-full p-3 border rounded-xl outline-none text-xs">
                                    </div>
                                </div>
                                <div>
                                     <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Fecha</label>
                                     <input name="fecha" type="date" class="w-full p-3 border rounded-xl outline-none" required>
                                </div>
                                <div class="col-span-2">
                                     <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Lugar</label>
                                     <input name="lugar" class="w-full p-3 border rounded-xl outline-none" placeholder="Estadio / Campo">
                                </div>
                            `}
                        </div>

                        <div id="player-selector-container" class="space-y-4 pt-4 border-t border-slate-100">
                            <div class="flex items-center justify-between">
                                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest text-blue-600">Selección de Jugadores</label>
                                <button type="button" id="conv-select-all" class="text-[10px] font-black text-blue-600 uppercase hover:underline">Seleccionar Todos</button>
                            </div>
                            
                            <!-- Multi-Team Selector -->
                            <div class="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Filtrar por Equipos</label>
                                <div id="conv-teams-grid" class="grid grid-cols-2 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                    ${teams.map(t => `
                                        <label class="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 transition-all shadow-sm">
                                            <input type="checkbox" value="${t.id}" class="w-4 h-4 rounded text-blue-600 conv-team-check">
                                            <span class="text-[9px] font-bold text-slate-700 truncate uppercase">${t.nombre}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>

                            <div class="relative">
                                <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300"></i>
                                <input type="text" id="conv-player-search" placeholder="Filtrar jugadores por nombre..." class="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-blue-50 transition-all">
                            </div>

                            <div id="filtered-players-list" class="max-h-64 overflow-y-auto border border-slate-100 rounded-2xl p-4 bg-slate-50 space-y-1 custom-scrollbar">
                                <!-- Los jugadores se cargarán aquí -->
                            </div>
                        </div>

                        ${(users) ? `
                            <div class="space-y-3 pt-4 border-t border-slate-100">
                                <label class="block text-xs font-black text-slate-400 uppercase tracking-widest">Compartir con el Staff</label>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100 custom-scrollbar">
                                    ${(users && currentUser) ? users.filter(u => u.id !== currentUser.id).map(u => `
                                        <label class="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 transition-all select-none">
                                            <input type="checkbox" name="sharedWith" value="${u.id}" class="w-4 h-4 rounded text-blue-600 focus:ring-blue-100">
                                            <div class="flex-1">
                                                <p class="text-[10px] font-bold text-slate-700">${u.name || u.full_name || u.nombre || 'Sin nombre'}</p>
                                            </div>
                                        </label>
                                    `).join('') : '<p class="text-[10px] text-slate-400 italic">No hay otros usuarios registrados.</p>'}
                                </div>
                            </div>
                        ` : ''}

                        <div class="flex gap-4 mt-6">
                            <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-[10px]">Cancelar</button>
                            <button type="submit" class="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all uppercase tracking-widest text-[10px]">Generar Convocatoria</button>
                        </div>
                    </form>
                </div>
            `;
            modalOverlay.classList.add('active');
            if (window.lucide) lucide.createIcons();

            const searchInput = document.getElementById('conv-player-search');
            const selectAllBtn = document.getElementById('conv-select-all');
            const playerList = document.getElementById('filtered-players-list');
            const teamChecks = document.querySelectorAll('.conv-team-check');
            const selectedPlayerIds = new Set();

            const updatePlayers = () => {
                const checkedTeamIds = Array.from(teamChecks).filter(c => c.checked).map(c => c.value);
                const searchText = (searchInput.value || '').toLowerCase();
                
                let filtered = players;
                if (checkedTeamIds.length > 0) {
                    filtered = filtered.filter(p => checkedTeamIds.includes(p.equipoid?.toString()));
                }
                if (searchText) {
                    filtered = filtered.filter(p => p.nombre.toLowerCase().includes(searchText));
                }

                renderFilteredList(filtered);
            };

            const renderFilteredList = (list) => {
                if (list.length > 0) {
                    playerList.innerHTML = list.map(p => `
                        <label class="flex items-center justify-between p-3 hover:bg-white rounded-xl cursor-pointer transition-all border border-transparent hover:border-slate-100 group conv-player-label">
                            <div class="flex items-center gap-3">
                                <input type="checkbox" value="${p.id}" ${selectedPlayerIds.has(String(p.id)) ? 'checked' : ''} class="w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-600 player-check">
                                <span class="text-sm font-bold text-slate-700 conv-player-name uppercase">${p.nombre}</span>
                            </div>
                            <span class="text-[10px] font-black text-slate-300 uppercase">${p.posicion || '--'}${p.equipoConvenido ? ` · ${p.equipoConvenido}` : ''}</span>
                        </label>
                    `).join('');

                    playerList.querySelectorAll('.player-check').forEach(chk => {
                        chk.onchange = (e) => {
                            if (e.target.checked) selectedPlayerIds.add(String(e.target.value));
                            else selectedPlayerIds.delete(String(e.target.value));
                        };
                    });
                } else {
                    playerList.innerHTML = `<p class="text-center py-10 text-slate-400 italic text-[10px] uppercase font-black">Selecciona algún equipo para ver jugadores.</p>`;
                }
            };

            teamChecks.forEach(c => c.onchange = updatePlayers);
            searchInput.oninput = updatePlayers;
            
            updatePlayers();
            
            selectAllBtn.onclick = () => {
                const checks = playerList.querySelectorAll('.player-check');
                const allChecked = Array.from(checks).every(c => c.checked);
                checks.forEach(c => {
                    c.checked = !allChecked;
                    if (c.checked) selectedPlayerIds.add(String(c.value));
                    else selectedPlayerIds.delete(String(c.value));
                });
            };

            document.getElementById('new-convocatoria-form').onsubmit = async (e) => {
                e.preventDefault();
                try {
                    const formData = new FormData(e.target);
                    const data = Object.fromEntries(formData.entries());
                    
                    data.playerids = Array.from(selectedPlayerIds);
                    data.sharedWith = formData.getAll('sharedWith');
                    
                    const checkedTeamIds = Array.from(teamChecks).filter(c => c.checked).map(c => c.value);
                    data.equipoid = checkedTeamIds.length > 0 ? checkedTeamIds[0] : null;

                    const extra = {
                        s2: { f: data.fecha2, h: data.hora2, l: (data.lugar2 || '').toUpperCase().trim() },
                        s3: { f: data.fecha3, h: data.hora3, l: (data.lugar3 || '').toUpperCase().trim() },
                        hl: data.hora_llegada,
                        hi: data.hora_inicio,
                        hs: data.hora_salida,
                        sw: data.sharedWith,
                        eids: checkedTeamIds
                    };
                    
                    const bundledData = { ...data };
                    bundledData.hora = data.hora_inicio || data.hora;
                    ['fecha2','hora2','lugar2','fecha3','hora3','lugar3','sharedWith', 'hora_llegada', 'hora_inicio', 'hora_salida'].forEach(f => delete bundledData[f]);
                    bundledData.nombre = (bundledData.nombre || '').toUpperCase().trim();
                    bundledData.lugar = `${(data.lugar || '').toUpperCase().trim()} ||| ${JSON.stringify(extra)}`;

                    const newConv = await db.add('convocatorias', { ...bundledData, createdBy: currentUser.id });
                    
                    // Crear reportes de asistencia automáticos para que el usuario solo tenga que confirmar
                    const createAutoAttendance = async (date, nameSuffix = '') => {
                        if (!date || date === '') return;
                        const playersData = {};
                        (data.playerids || []).forEach(pid => { 
                            playersData[pid] = 'asiste'; 
                        });

                        const teamNames = checkedTeamIds.map(tid => {
                            const t = teams.find(team => team.id.toString() === tid.toString());
                            return t ? t.nombre.split(' ||| ')[0] : tid;
                        }).join('_');

                        const dateParts = date.split('-');
                        const dateShort = (dateParts.length === 3) ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0].slice(-2)}` : date;
                        
                        const baseName = `ASISTENCIA ${dateShort}${teamNames ? `_${teamNames}` : ''}${nameSuffix ? ` ${nameSuffix}` : ''}`;
                        const fullName = `${baseName.toUpperCase()} ||| ${JSON.stringify({ eids: checkedTeamIds })}`;

                        await db.add('asistencia', {
                            nombre: fullName,
                            equipoid: checkedTeamIds.length > 0 ? parseInt(checkedTeamIds[0]) : null,
                            fecha: date,
                            players: playersData,
                            createdBy: currentUser.id,
                            convocatoriaid: newConv.id
                        });
                    };

                    // Crear asistencia para la fecha principal
                    await createAutoAttendance(data.fecha);

                    // Si es un ciclo, crear asistencias para las sesiones adicionales si tienen fecha
                    if (activeTab === 'Ciclo') {
                        if (data.fecha2) await createAutoAttendance(data.fecha2, '(S2)');
                        if (data.fecha3) await createAutoAttendance(data.fecha3, '(S3)');
                    }
                    
                    window.customAlert('¡Éxito!', 'Convocatoria y Asistencia generadas correctamente. Ya puedes verlas en Control de Asistencia.', 'success');
                    closeModal();
                    window.switchView(activeTab === 'Torneo' ? 'torneos' : 'convocatorias');
                } catch (err) {
                    alert("Error al guardar: " + err.message);
                }
            };

    };

    window.editConvocatoria = async (id) => {
        const userRes = await supabaseClient.auth.getUser();
        const currentUser = userRes.data?.user;
        const { data: conv, error: convErr } = await supabaseClient.from('convocatorias').select('*').eq('id', id).single();
        if (convErr) return;

        const players = await db.getAll('jugadores');
        const teams = await db.getAll('equipos');
        const { data: users } = await supabaseClient.from('profiles').select('*');
        const activeTab = conv.tipo;
        
        modalContainer.innerHTML = `
            <div class="p-8">
                <h3 class="text-2xl font-bold text-slate-800 mb-6">Editar <span class="text-blue-600">${activeTab}</span></h3>
                <form id="edit-convocatoria-form" class="space-y-6">
                    <input type="hidden" name="id" value="${conv.id}">
                    <input type="hidden" name="tipo" value="${activeTab}">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="col-span-2">
                             <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nombre / Evento</label>
                             <input name="nombre" value="${conv.nombre}" class="w-full p-4 border rounded-2xl text-lg font-bold outline-none focus:ring-4 ring-blue-50/50 transition-all" placeholder="Ej: Entrenamiento Lunes" required>
                        </div>
                        <div>
                             <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Fecha</label>
                             <input name="fecha" value="${conv.fecha}" type="date" class="w-full p-3 border rounded-xl outline-none" required>
                        </div>
                        <div class="col-span-2 grid grid-cols-3 gap-3">
                            <div>
                                 <label class="block text-[10px] font-black text-slate-400 uppercase mb-2">Hora Llegada</label>
                                 <input name="hora_llegada" value="${(() => {
                                     if (conv.lugar && conv.lugar.includes(' ||| ')) {
                                         try { return JSON.parse(conv.lugar.split(' ||| ')[1]).hl || ''; } catch(e) {}
                                     }
                                     return '';
                                 })()}" type="time" class="w-full p-3 border rounded-xl outline-none text-xs">
                            </div>
                            <div>
                                 <label class="block text-[10px] font-black text-slate-400 uppercase mb-2">Hora Inicio</label>
                                 <input name="hora_inicio" value="${(() => {
                                     if (conv.lugar && conv.lugar.includes(' ||| ')) {
                                         try { return JSON.parse(conv.lugar.split(' ||| ')[1]).hi || conv.hora || ''; } catch(e) {}
                                     }
                                     return conv.hora || '';
                                 })()}" type="time" class="w-full p-3 border rounded-xl outline-none text-xs" required>
                            </div>
                            <div>
                                 <label class="block text-[10px] font-black text-slate-400 uppercase mb-2">Hora Salida</label>
                                 <input name="hora_salida" value="${(() => {
                                     if (conv.lugar && conv.lugar.includes(' ||| ')) {
                                         try { return JSON.parse(conv.lugar.split(' ||| ')[1]).hs || ''; } catch(e) {}
                                     }
                                     return '';
                                 })()}" type="time" class="w-full p-3 border rounded-xl outline-none text-xs">
                            </div>
                        </div>
                        <div>
                             <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Lugar</label>
                             <input name="lugar" value="${window.cleanLugar(conv.lugar) || ''}" class="w-full p-3 border rounded-xl outline-none" placeholder="Estadio / Campo">
                        </div>
                    </div>

                    <div id="edit-player-selector-container" class="space-y-4 pt-4 border-t border-slate-100">
                        <div class="flex items-center justify-between">
                            <label class="block text-xs font-black text-slate-400 uppercase tracking-widest text-blue-600">Reclutamiento de Jugadores</label>
                            <button type="button" id="edit-conv-select-all" class="text-[10px] font-black text-blue-600 uppercase hover:underline">Seleccionar Todos</button>
                        </div>
                        
                        <!-- Multi-Team Selector -->
                        <div class="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Filtrar por Equipos</label>
                            <div id="edit-conv-teams-grid" class="grid grid-cols-2 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                ${(() => {
                                    let precheckedTeams = [];
                                    if (conv.lugar && conv.lugar.includes(' ||| ')) {
                                        try {
                                            const extra = JSON.parse(conv.lugar.split(' ||| ')[1]);
                                            if (extra.eids) precheckedTeams = extra.eids.map(String);
                                        } catch (e) {}
                                    }
                                    if (precheckedTeams.length === 0 && conv.equipoid) {
                                        precheckedTeams = [String(conv.equipoid)];
                                    }
                                    
                                    return teams.map(t => `
                                        <label class="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 transition-all shadow-sm">
                                            <input type="checkbox" value="${t.id}" ${precheckedTeams.includes(String(t.id)) ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 edit-conv-team-check">
                                            <span class="text-[9px] font-bold text-slate-700 truncate uppercase">${t.nombre}</span>
                                        </label>
                                    `).join('');
                                })()}
                            </div>
                        </div>

                        <div class="relative">
                            <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300"></i>
                            <input type="text" id="edit-conv-player-search" placeholder="Buscar por nombre..." class="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-4 ring-blue-50 transition-all">
                        </div>

                        <div id="edit-filtered-players-list" class="max-h-64 overflow-y-auto border border-slate-100 rounded-2xl p-4 bg-slate-50 space-y-1 custom-scrollbar">
                            <!-- Los jugadores se cargarán aquí -->
                        </div>
                    </div>

                    <div class="flex gap-4 mt-6">
                        <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-[10px]">Cancelar</button>
                        <button type="submit" class="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all uppercase tracking-widest text-[10px]">Guardar Cambios</button>
                    </div>
                </form>
            </div>
        `;
        modalOverlay.classList.add('active');
        if (window.lucide) lucide.createIcons();

        const searchInput = document.getElementById('edit-conv-player-search');
        const selectAllBtn = document.getElementById('edit-conv-select-all');
        const playerList = document.getElementById('edit-filtered-players-list');
        const teamChecks = document.querySelectorAll('.edit-conv-team-check');
        const selectedPlayerIds = new Set((conv.playerids || []).map(String));

        const updatePlayers = () => {
            const checkedTeamIds = Array.from(teamChecks).filter(c => c.checked).map(c => c.value);
            const searchText = (searchInput.value || '').toLowerCase();
            
            let filtered = players;
            if (checkedTeamIds.length > 0) {
                filtered = filtered.filter(p => checkedTeamIds.includes(p.equipoid?.toString()));
            }
            if (searchText) {
                filtered = filtered.filter(p => p.nombre.toLowerCase().includes(searchText));
            }

            renderFilteredList(filtered);
        };

        const renderFilteredList = (list) => {
            if (list.length > 0) {
                playerList.innerHTML = list.map(p => `
                    <label class="flex items-center justify-between p-3 hover:bg-white rounded-xl cursor-pointer transition-all border border-transparent hover:border-slate-100 group edit-conv-player-label">
                        <div class="flex items-center gap-3">
                            <input type="checkbox" value="${p.id}" ${selectedPlayerIds.has(String(p.id)) ? 'checked' : ''} class="w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-600 player-check">
                            <span class="text-sm font-bold text-slate-700 edit-conv-player-name uppercase">${p.nombre}</span>
                        </div>
                        <span class="text-[10px] font-black text-slate-300 uppercase">${p.posicion || '--'} (${p.anionacimiento || '--'})</span>
                    </label>
                `).join('');

                playerList.querySelectorAll('.player-check').forEach(chk => {
                    chk.onchange = (e) => {
                        if (e.target.checked) selectedPlayerIds.add(String(e.target.value));
                        else selectedPlayerIds.delete(String(e.target.value));
                    };
                });
            } else {
                playerList.innerHTML = `<p class="text-center py-10 text-slate-400 italic text-[10px] uppercase font-black">Selecciona algún equipo para ver jugadores.</p>`;
            }
        };

        teamChecks.forEach(c => c.onchange = updatePlayers);
        searchInput.oninput = updatePlayers;
        
        updatePlayers();
        
        selectAllBtn.onclick = () => {
            const checks = playerList.querySelectorAll('.player-check');
            const allChecked = Array.from(checks).every(c => c.checked);
            checks.forEach(c => {
                c.checked = !allChecked;
                if (c.checked) selectedPlayerIds.add(String(c.value));
                else selectedPlayerIds.delete(String(c.value));
            });
        };

        document.getElementById('edit-convocatoria-form').onsubmit = async (e) => {
            e.preventDefault();
            try {
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());
                
                data.playerids = Array.from(selectedPlayerIds);
                const checkedTeamIds = Array.from(teamChecks).filter(c => c.checked).map(c => c.value);
                data.equipoid = checkedTeamIds.length > 0 ? checkedTeamIds[0] : (conv.equipoid || null);

                // RECONSTRUCT LUGAR WITH EXTRA
                let baseLugar = (data.lugar || '').toUpperCase().trim();
                if (baseLugar.includes(' ||| ')) baseLugar = baseLugar.split(' ||| ')[0];

                data.nombre = (data.nombre || '').toUpperCase().trim();

                let extra = {};
                if (conv.lugar && conv.lugar.includes(' ||| ')) {
                    try { extra = JSON.parse(conv.lugar.split(' ||| ')[1]); } catch (e) {}
                }
                extra.eids = checkedTeamIds;
                extra.hl = data.hora_llegada;
                extra.hi = data.hora_inicio;
                extra.hs = data.hora_salida;
                data.hora = data.hora_inicio || data.hora;
                ['hora_llegada', 'hora_inicio', 'hora_salida'].forEach(f => delete data[f]);

                // Handle sub-session locations if they exist in the form (for Ciclos)
                if (data.lugar2) extra.s2 = { ...extra.s2, l: data.lugar2.toUpperCase().trim() };
                if (data.lugar3) extra.s3 = { ...extra.s3, l: data.lugar3.toUpperCase().trim() };

                data.lugar = `${baseLugar} ||| ${JSON.stringify(extra)}`;

                const idToUpdate = data.id;
                delete data.id;
                
                const { error } = await supabaseClient.from('convocatorias').update(data).eq('id', idToUpdate);
                if (error) throw error;

                // SYNC ASISTENCIA
                try {
                    const allAsist = await db.getAll('asistencia');
                    const syncTeamIds = Array.isArray(extra.eids) ? extra.eids.map(String) : [String(data.equipoid)];
                    const reports = allAsist.filter(a => a.fecha === data.fecha && syncTeamIds.includes(String(a.equipoid)));
                    for (const r of reports) {
                        let changed = false;
                        const newPids = data.playerids.map(String);
                        const updatedPls = { ...r.players };
                        for (const pid in updatedPls) {
                            if (!newPids.includes(String(pid))) {
                                delete updatedPls[pid];
                                changed = true;
                            }
                        }
                        if (changed) await db.update('asistencia', { ...r, players: updatedPls });
                    }
                } catch (e) { console.warn("Asistencia sync failed:", e); }
                
                window.customAlert('¡Actualizado!', 'Los cambios se han guardado correctamente.', 'success');
                closeModal();
                window.switchView(activeTab === 'Torneo' ? 'torneos' : 'convocatorias');
            } catch (err) {
                alert("Error: " + err.message);
            }
        };
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

            // BUNDLE EXTRA INFO Proactively
            const extra = {
                s2: { f: data.fecha2, h: data.hora2, l: data.lugar2 },
                s3: { f: data.fecha3, h: data.hora3, l: data.lugar3 },
                hl: data.hora_llegada,
                hi: data.hora_inicio,
                hs: data.hora_salida,
                sw: data.sharedWith,
                eids: selectedTeams
            };
            
            const bundledData = { ...data };
            bundledData.hora = data.hora_inicio || data.hora;
            ['fecha2','hora2','lugar2','fecha3','hora3','lugar3','sharedWith','equipoids', 'hora_llegada', 'hora_inicio', 'hora_salida'].forEach(f => delete bundledData[f]);
            bundledData.lugar = `${data.lugar || ''} ||| ${JSON.stringify(extra)}`;
            
            await db.update('convocatorias', { ...bundledData, id });
            
            window.customAlert('Éxito', 'Convocatoria actualizada', 'success');
            window.viewConvocatoria(id);
            
            // Refresh table
            const currentView = document.querySelector('[data-view].active')?.getAttribute('id');
            const container = document.getElementById('main-content');
            if (container && (currentView === 'convocatorias' || currentView === 'torneos')) {
                 if (currentView === 'convocatorias') window.renderConvocatorias(container);
                 else window.renderTorneos(container);
            }
        } catch (err) {
            alert("Error al guardar: " + err.message);
        }
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
            if (conv.lugar && conv.lugar.includes(" ||| ")) {
                try {
                    const [mainLugar, jsonInfo] = conv.lugar.split(" ||| ");
                    const extra = JSON.parse(jsonInfo);
                    conv.lugar = mainLugar;
                    if (extra.s2) {
                        conv.fecha2 = extra.s2.f; conv.hora2 = extra.s2.h; conv.lugar2 = extra.s2.l;
                        conv.fecha3 = extra.s3.f; conv.hora3 = extra.s3.h; conv.lugar3 = extra.s3.l;
                    }
                    if (extra.sw) conv.sharedWith = extra.sw;
                    if (extra.eids && !conv.equipoid) conv.equipoid = extra.eids;
                } catch (pe) { console.error("Error parsing extra info:", pe); }
            }

            const players = await db.getAll('jugadores');
            const teams = await db.getAll('equipos');
            const { data: users } = await (supabaseClient ? supabaseClient.from('profiles').select('*') : { data: [] });
            
            let selectedTeamIds = [];
            let extra = {};
            if (rawConv.lugar && rawConv.lugar.includes(" ||| ")) {
                try {
                    const jsonInfo = rawConv.lugar.split(" ||| ")[1];
                    extra = JSON.parse(jsonInfo);
                    if (extra.eids && Array.isArray(extra.eids)) {
                        selectedTeamIds = extra.eids.map(String);
                    }
                } catch (e) {}
            }
            
            if (selectedTeamIds.length === 0 && rawConv.equipoid) {
                selectedTeamIds = [rawConv.equipoid.toString()];
            }

            const selectedTeams = teams.filter(t => selectedTeamIds.includes(t.id.toString()));
            const pids = Array.isArray(conv.playerids) ? conv.playerids.map(String) : [];
            
            // Map convocados with potential custom positions
            const convocados = players.filter(p => pids.includes(p.id.toString())).map(p => {
                const customPos = extra.pos && extra.pos[p.id];
                return { ...p, posicion: customPos || p.posicion };
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
                                    <div class="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                        <p class="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Sesión 1</p>
                                        <p class="text-xs font-bold text-slate-700">${conv.fecha} • ${conv.hora || '--:--'}</p>
                                        <p class="text-[10px] text-slate-400 font-bold mt-1">${window.cleanLugar(conv.lugar) || 'Sin lugar'}</p>
                                    </div>
                                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sesión 2</p>
                                        <p class="text-xs font-bold text-slate-700">${conv.fecha2 || '--'} • ${conv.hora2 || '--:--'}</p>
                                        <p class="text-[10px] text-slate-400 font-bold mt-1">${window.cleanLugar(conv.lugar2) || 'Sin lugar'}</p>
                                    </div>
                                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sesión 3</p>
                                        <p class="text-xs font-bold text-slate-700">${conv.fecha3 || '--'} • ${conv.hora3 || '--:--'}</p>
                                        <p class="text-[10px] text-slate-400 font-bold mt-1">${window.cleanLugar(conv.lugar3) || 'Sin lugar'}</p>
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
                                        if (rawConv.lugar && rawConv.lugar.includes(' ||| ')) {
                                            try {
                                                const ex = JSON.parse(rawConv.lugar.split(' ||| ')[1]);
                                                if (ex.hl) times.push(`<div class="flex flex-col"><span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Llegada</span><span class="text-xs font-bold text-slate-700">${ex.hl}</span></div>`);
                                                if (ex.hi) times.push(`<div class="flex flex-col"><span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Inicio</span><span class="text-xs font-bold text-slate-700">${ex.hi}</span></div>`);
                                                if (ex.hs) times.push(`<div class="flex flex-col"><span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Salida</span><span class="text-xs font-bold text-slate-700">${ex.hs}</span></div>`);
                                            } catch(e) {}
                                        }
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
                            <div class="mb-6 p-4 bg-white border border-slate-100 rounded-3xl shadow-inner-sm">
                                <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Filtrar Jugadores por Squads</label>
                                <div class="grid grid-cols-2 lg:grid-cols-4 gap-2 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                                    ${teams.map(t => `
                                        <label class="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-transparent cursor-pointer hover:border-blue-200 transition-all select-none">
                                            <input type="checkbox" value="${t.id}" ${selectedTeamIds.includes(String(t.id)) ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 conv-team-check">
                                            <span class="text-[9px] font-black text-slate-600 truncate uppercase">${t.nombre}</span>
                                        </label>
                                    `).join('')}
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
                                                    <option value="">${p.posicion || '--'}</option>
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
                                    <div class="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-2xl border border-slate-100">
                                        <div class="space-y-3">
                                            <p class="text-[10px] font-black text-blue-600 uppercase tracking-widest">Sesión 1</p>
                                            <input name="fecha" type="date" value="${conv.fecha}" class="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none">
                                            <input name="hora" type="time" value="${conv.hora || ''}" class="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none">
                                            <input name="lugar" value="${conv.lugar || ''}" class="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" placeholder="Lugar 1">
                                        </div>
                                        <div class="space-y-3">
                                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sesión 2</p>
                                            <input name="fecha2" type="date" value="${conv.fecha2 || ''}" class="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none">
                                            <input name="hora2" type="time" value="${conv.hora2 || ''}" class="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none">
                                            <input name="lugar2" value="${conv.lugar2 || ''}" class="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" placeholder="Lugar 2">
                                        </div>
                                        <div class="space-y-3">
                                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sesión 3</p>
                                            <input name="fecha3" type="date" value="${conv.fecha3 || ''}" class="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none">
                                            <input name="hora3" type="time" value="${conv.hora3 || ''}" class="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none">
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
                                                    try { return JSON.parse(rawConv.lugar.split(' ||| ')[1]).hl || ''; } catch(e) {}
                                                }
                                                return '';
                                            })()}" class="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none">
                                        </div>
                                        <div>
                                            <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Hora Inicio</label>
                                            <input name="hora_inicio" type="time" value="${(() => {
                                                if (rawConv.lugar && rawConv.lugar.includes(' ||| ')) {
                                                    try { return JSON.parse(rawConv.lugar.split(' ||| ')[1]).hi || conv.hora || ''; } catch(e) {}
                                                }
                                                return conv.hora || '';
                                            })()}" class="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none">
                                        </div>
                                        <div>
                                            <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Hora Salida</label>
                                            <input name="hora_salida" type="time" value="${(() => {
                                                if (rawConv.lugar && rawConv.lugar.includes(' ||| ')) {
                                                    try { return JSON.parse(rawConv.lugar.split(' ||| ')[1]).hs || ''; } catch(e) {}
                                                }
                                                return '';
                                            })()}" class="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 outline-none">
                                        </div>
                                    </div>
                                `}
                                <div class="col-span-2">
                                    <label class="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Equipos Vinculados</label>
                                    <div class="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto p-4 bg-white rounded-[1.5rem] border border-slate-200 custom-scrollbar">
                                        ${teams.map(t => `
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
                    <button onclick="closeModal()" class="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"><i data-lucide="x"></i></button>
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
                                    ${convocados.length > 0 ? convocados.map((p, i) => `
                                        <div class="grid grid-cols-12 items-center p-4 hover:bg-slate-50 transition-colors">
                                            <div class="col-span-1 text-xs font-black text-blue-600">${i+1}</div>
                                            <div class="col-span-11 flex justify-between items-center">
                                                <div class="flex flex-col">
                                                    <span class="font-bold text-slate-800 text-sm truncate">${p.nombre}</span>
                                                    <span class="text-[9px] font-black text-blue-500 uppercase tracking-tighter">${p.equipoConvenido || 'Sin Club'}</span>
                                                </div>
                                                <span class="text-[9px] font-black text-slate-400 uppercase">${p.posicion || '--'}</span>
                                            </div>
                                        </div>
                                    `).join('') : '<p class="text-center py-20 text-slate-400 italic">No hay jugadores convocados.</p>'}
                                </div>
                            </div>
                            
                            <div class="flex gap-4">
                                 <button onclick="window.exportConvocatoria(${conv.id})" class="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl">
                                    <i data-lucide="file-down" class="w-5 h-5 text-blue-400"></i>
                                    Descargar PDF
                                 </button>
                                 <button onclick="closeModal()" class="px-8 py-4 bg-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-300 transition-all">Cerrar</button>
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
        
        const updateMgmtList = () => {
            const checkedTeamIds = Array.from(teamChecks).filter(c => c.checked).map(c => c.value);
            const filteredPlayers = players.filter(p => checkedTeamIds.includes(p.equipoid?.toString()));
            
            mgmtList.innerHTML = filteredPlayers.map(p => {
                const isConvocado = pids.includes(p.id.toString());
                const currentPos = (extra.pos && extra.pos[p.id]) || p.posicion || '';

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
                                <option value="">${p.posicion || '--'}</option>
                                ${PLAYER_POSITIONS.map(pos => `<option value="${pos}" ${currentPos === pos ? 'selected' : ''}>${pos}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                `;
            }).join('') || '<p class="col-span-full text-center py-10 text-slate-400 italic text-[10px] uppercase font-black">Selecciona al menos un equipo para ver jugadores.</p>';
        };

        teamChecks.forEach(cb => cb.onchange = updateMgmtList);




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
                const playerLabels = mgmtArea.querySelectorAll('.mgmt-player-label');
                const newPids = [];
                const customPositions = {};
                
                playerLabels.forEach(label => {
                    const chk = label.querySelector('.mgmt-player-check');
                    if (chk && chk.checked) {
                        const pid = chk.getAttribute('data-pid');
                        newPids.push(pid);
                        const posSel = label.querySelector('.mgmt-player-pos');
                        if (posSel && posSel.value) {
                            const pObj = players.find(p => p.id == pid);
                            // Solo guardamos si es diferente a la base para permitir herencia
                            if (!pObj || pObj.posicion !== posSel.value) {
                                customPositions[pid] = posSel.value;
                            }
                        }
                    }
                });
                
                try {
                    // Update extra info with custom positions
                    let currentExtra = {};
                    if (rawConv.lugar && rawConv.lugar.includes(" ||| ")) {
                        try { currentExtra = JSON.parse(rawConv.lugar.split(" ||| ")[1]); } catch (e) {}
                    }
                    currentExtra.pos = customPositions;
                    const mainLugar = (rawConv.lugar || "").split(" ||| ")[0];
                    const updatedLugar = `${mainLugar} ||| ${JSON.stringify(currentExtra)}`;

                    await db.update('convocatorias', { 
                        id: Number(id),
                        playerids: newPids,
                        lugar: updatedLugar
                    });

                    // SYNC ASISTENCIA
                    try {
                        const allAsist = await db.getAll('asistencia');
                        let currentEids = [];
                        if (updatedLugar.includes(" ||| ")) {
                            try { const ex = JSON.parse(updatedLugar.split(" ||| ")[1]); currentEids = ex.eids || []; } catch(e){}
                        }
                        const syncTeams = currentEids.length > 0 ? currentEids.map(String) : [String(conv.equipoid)];
                        const reports = allAsist.filter(a => a.fecha === conv.fecha && syncTeams.includes(String(a.equipoid)));
                        for (const r of reports) {
                            let changed = false;
                            const updatedPls = { ...r.players };
                            const newPidsStrings = newPids.map(String);
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

        // Delegate listener for real-time count
        const mList = document.getElementById('mgmt-player-list');
        if (mList) {
            mList.addEventListener('change', (e) => {
                if (e.target.classList.contains('mgmt-player-check')) {
                    const count = mList.querySelectorAll('.mgmt-player-check:checked').length;
                    const badge = document.getElementById('conv-player-count-badge');
                    if (badge) badge.textContent = count;
                }
            });
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

    window.exportConvocatoria = async (id) => {
        const { data: conv, error } = await supabaseClient.from('convocatorias').select('*').eq('id', id).single();
        if (error) return;

        const players = await db.getAll('jugadores');
        const teams = await db.getAll('equipos');
        const team = teams.find(t => t.id == conv.equipoid);
        const convocados = players.filter(p => conv.playerids.includes(p.id.toString()));

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
        const tableBody = convocados.map((p, index) => [
            index + 1,
            p.nombre,
            team ? team.nombre : '--',
            p.posicion || '--',
            p.anionacimiento || '--'
        ]);

        doc.autoTable({
            startY: 55,
            head: [['#', 'JUGADOR', 'EQUIPO', 'POSICIÓN', 'AÑO']],
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
                4: { halign: 'center' }
            },
            margin: { left: 15, right: 15 }
        });

        // --- ADD TACTICAL PITCH (CAMPOGRAMA) ON NEW PAGE ---
        doc.addPage();
        
        // Titulo de la página
        doc.setFontSize(16);
        doc.setTextColor(slateColor[0], slateColor[1], slateColor[2]);
        doc.text("DISPOSICIÓN TÁCTICA", 15, 25);
        
        const formationId = (window.formationsState && window.formationsState.convocatoria) || 'F11_433';
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
        doc.line(px + pw/2, py + 10, px + pw/2, py + ph - 10);
        // Center circle
        doc.circle(px + pw/2, py + ph/2, 12);
        
        // Areas
        // Left Area
        doc.rect(px + 10, py + ph/2 - 25, 25, 50);
        doc.rect(px + 10, py + ph/2 - 10, 8, 20);
        // Right Area
        doc.rect(px + pw - 35, py + ph/2 - 25, 25, 50);
        doc.rect(px + pw - 18, py + ph/2 - 10, 8, 20);

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
            doc.setFont("helvetica", "bold");
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

        doc.save(`Convocatoria_${conv.nombre}_${conv.fecha}.pdf`);
    };

    window.exportSessionPDF = async (id) => {
        const { jsPDF } = window.jspdf;
        const session = (await db.getAll('sesiones')).find(s => s.id == id);
        if (!session) return;
        
        const allTasks = await db.getAll('tareas');
        const teams = await db.getAll('equipos');
        const currentTeam = teams.find(t => t.id == session.equipoid);
        const sessionTasks = (session.taskids || []).map(taskId => allTasks.find(t => t.id == taskId)).filter(Boolean);

        const doc = new jsPDF();
        const blue = [37, 99, 235];
        const slate = [30, 41, 59];
        const lightGray = [241, 245, 249];

        // --- PAGE 1: HEADER & INFO ---
        if (currentTeam && currentTeam.escudo) {
            try { doc.addImage(currentTeam.escudo, 'PNG', 15, 12, 20, 20); } catch (e) {}
        }
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(blue[0], blue[1], blue[2]);
        doc.text("RS CENTRO", 40, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text("PLAN DE ENTRENAMIENTO PROFESIONAL", 40, 28);

        // Session Box
        doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.roundedRect(15, 38, 180, 25, 3, 3, 'F');
        
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("NOMBRE DE LA SESIÓN", 20, 45);
        doc.text("EQUIPO / CATEGORÍA", 100, 45);
        doc.text("FECHA / HORA", 155, 45);

        doc.setFontSize(10);
        doc.setTextColor(slate[0], slate[1], slate[2]);
        doc.text((session.titulo || session.nombre || 'SESIÓN').toUpperCase(), 20, 52);
        doc.text((session.equiponombre || 'GENERAL').toUpperCase(), 100, 52);
        doc.text(`${session.fecha} | ${session.hora || '--:--'}`, 155, 52);

        // Tasks Summary
        let currentY = 75;
        doc.setFontSize(12);
        doc.setTextColor(blue[0], blue[1], blue[2]);
        doc.text(`CONTENIDO DE LA SESIÓN (${sessionTasks.length} EJERCICIOS)`, 15, currentY);
        
        currentY += 10;
        sessionTasks.forEach((t, i) => {
            doc.setFontSize(10);
            doc.setTextColor(slate[0], slate[1], slate[2]);
            doc.text(`${i + 1}. ${(t.name || 'Tarea').toUpperCase()}`, 20, currentY);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            const typeText = `${t.type || 'FÚTBOL'} | ${t.duration || '15'} min`;
            doc.text(typeText, 140, currentY);
            currentY += 8;
        });

        // --- TASKS PAGES ---
        sessionTasks.forEach((t, i) => {
            doc.addPage();
            
            // Header Mini
            doc.setFillColor(blue[0], blue[1], blue[2]);
            doc.rect(15, 15, 2, 8, 'F');
            doc.setFontSize(14);
            doc.setTextColor(slate[0], slate[1], slate[2]);
            doc.setFont("helvetica", "bold");
            doc.text(`${i + 1}. ${(t.name || 'Tarea').toUpperCase()}`, 20, 21);

            // Image Area
            let imageY = 30;
            const imgWidth = 180;
            const imgHeight = 110;
            
            if (t.image) {
                try {
                    doc.addImage(t.image, 'JPEG', 15, imageY, imgWidth, imgHeight);
                } catch (e) {
                    doc.setDrawColor(226, 232, 240);
                    doc.rect(15, imageY, imgWidth, imgHeight);
                    doc.text("Imagen no disponible en PDF", 15 + imgWidth/2, imageY + imgHeight/2, { align: 'center' });
                }
            } else {
                doc.setDrawColor(226, 232, 240);
                doc.rect(15, imageY, imgWidth, imgHeight);
                doc.setTextColor(203, 213, 225);
                doc.text("Ejercicio sin gráfico táctico", 15 + imgWidth/2, imageY + imgHeight/2, { align: 'center' });
            }

            // Description
            let descY = imageY + imgHeight + 15;
            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139);
            doc.setFont("helvetica", "bold");
            doc.text("EXPLICACIÓN TÉCNICA", 15, descY);
            
            descY += 6;
            doc.setFont("helvetica", "normal");
            doc.setTextColor(51, 65, 85);
            const splitDesc = doc.splitTextToSize(t.description || 'Sin descripción detallada.', 180);
            doc.text(splitDesc, 15, descY);

            // INTERACTIVE VIDEO BUTTON
            if (t.video) {
                const videoUrl = t.video.startsWith('http') ? t.video : `https://drive.google.com/open?id=${t.video}`;
                const buttonY = 250;
                
                // Button box
                doc.setFillColor(blue[0], blue[1], blue[2]);
                doc.roundedRect(15, buttonY, 60, 12, 2, 2, 'F');
                
                // Button text
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(10);
                doc.setFont("helvetica", "bold");
                doc.text("VER VIDEO", 45, buttonY + 7.5, { align: 'center' });
                
                // CLICKABLE LINK OVER BUTTON
                doc.link(15, buttonY, 60, 12, { url: videoUrl });

                // QR Code
                try {
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(videoUrl)}`;
                    doc.addImage(qrUrl, 'PNG', 165, buttonY - 5, 30, 30);
                    doc.setFontSize(7);
                    doc.setTextColor(148, 163, 184);
                    doc.text("ESCANEA QR", 180, buttonY + 28, { align: 'center' });
                } catch (e) {}
            }

            // Page Footer
            doc.setFontSize(8);
            doc.setTextColor(203, 213, 225);
            doc.text(`RS CENTRO • ${session.titulo || 'Sesión'} • Tarea ${i + 1}/${sessionTasks.length}`, 15, 285);
        });

        doc.save(`Sesion_${session.titulo || 'Entrenamiento'}_${session.fecha}.pdf`);
    };

    // PDF Generation Utilities


    const FORMATIONS = {
        // --- FÚTBOL 11 ---
        'F11_433': { name: '4-3-3 (F11)', positions: [
            { pos: 'PO', x: 8, y: 50 }, { pos: 'DBD', x: 28, y: 85 }, { pos: 'DCD', x: 28, y: 65 }, { pos: 'DCZ', x: 28, y: 35 }, { pos: 'DBZ', x: 28, y: 15 },
            { pos: 'MCD', x: 48, y: 50 }, { pos: 'MVD', x: 65, y: 75 }, { pos: 'MVZ', x: 65, y: 25 }, { pos: 'MBD', x: 85, y: 85 }, { pos: 'ACZ', x: 92, y: 50 }, { pos: 'MBZ', x: 85, y: 15 }
        ]},
        'F11_442': { name: '4-4-2 (F11)', positions: [
            { pos: 'PO', x: 8, y: 50 }, { pos: 'DBD', x: 28, y: 85 }, { pos: 'DCD', x: 28, y: 65 }, { pos: 'DCZ', x: 28, y: 35 }, { pos: 'DBZ', x: 28, y: 15 },
            { pos: 'MBD', x: 55, y: 85 }, { pos: 'MCD', x: 55, y: 60 }, { pos: 'MCZ', x: 55, y: 40 }, { pos: 'MBZ', x: 55, y: 15 }, { pos: 'ACD', x: 90, y: 60 }, { pos: 'ACZ', x: 90, y: 40 }
        ]},
        'F11_4231': { name: '4-2-3-1 (F11)', positions: [
            { pos: 'PO', x: 8, y: 50 }, { pos: 'DBD', x: 25, y: 85 }, { pos: 'DCD', x: 25, y: 65 }, { pos: 'DCZ', x: 25, y: 35 }, { pos: 'DBZ', x: 25, y: 15 },
            { pos: 'MCD', x: 45, y: 65 }, { pos: 'MCZ', x: 45, y: 35 }, { pos: 'MBD', x: 70, y: 85 }, { pos: 'MPZ', x: 70, y: 50 }, { pos: 'MBZ', x: 70, y: 15 }, { pos: 'ACZ', x: 92, y: 50 }
        ]},
        'F11_352': { name: '3-5-2 (F11)', positions: [
            { pos: 'PO', x: 8, y: 50 }, { pos: 'DBD', x: 25, y: 75 }, { pos: 'DCD', x: 25, y: 50 }, { pos: 'DBZ', x: 25, y: 25 },
            { pos: 'MBD', x: 50, y: 90 }, { pos: 'MCD', x: 50, y: 65 }, { pos: 'MCZ', x: 50, y: 35 }, { pos: 'MBZ', x: 50, y: 10 }, { pos: 'MPZ', x: 68, y: 50 },
            { pos: 'ACD', x: 90, y: 65 }, { pos: 'ACZ', x: 90, y: 35 }
        ]},
        'F11_541': { name: '5-4-1 (F11)', positions: [
            { pos: 'PO', x: 8, y: 50 }, { pos: 'DBD', x: 25, y: 90 }, { pos: 'DCD', x: 25, y: 70 }, { pos: 'DCZ', x: 25, y: 50 }, { pos: 'DCD', x: 25, y: 30 }, { pos: 'DBZ', x: 25, y: 10 },
            { pos: 'MBD', x: 55, y: 80 }, { pos: 'MCD', x: 55, y: 60 }, { pos: 'MCZ', x: 55, y: 40 }, { pos: 'MBZ', x: 55, y: 20 }, { pos: 'ACZ', x: 92, y: 50 }
        ]},
        'F11_4141': { name: '4-1-4-1 (F11)', positions: [
            { pos: 'PO', x: 8, y: 50 }, { pos: 'DBD', x: 25, y: 85 }, { pos: 'DCD', x: 25, y: 65 }, { pos: 'DCZ', x: 25, y: 35 }, { pos: 'DBZ', x: 25, y: 15 },
            { pos: 'MCD', x: 45, y: 50 }, { pos: 'MVD', x: 65, y: 80 }, { pos: 'MVD', x: 65, y: 60 }, { pos: 'MVZ', x: 65, y: 40 }, { pos: 'MVZ', x: 65, y: 20 }, { pos: 'ACZ', x: 90, y: 50 }
        ]},

        // --- FÚTBOL 8 ---
        'F8_331': { name: '3-3-1 (F8)', positions: [
            { pos: 'PO', x: 8, y: 50 }, { pos: 'DBD', x: 25, y: 80 }, { pos: 'DCD', x: 25, y: 50 }, { pos: 'DBZ', x: 25, y: 20 },
            { pos: 'MVD', x: 55, y: 80 }, { pos: 'MCD', x: 55, y: 50 }, { pos: 'MVZ', x: 55, y: 20 }, { pos: 'ACZ', x: 90, y: 50 }
        ]},
        'F8_322': { name: '3-2-2 (F8)', positions: [
            { pos: 'PO', x: 8, y: 50 }, { pos: 'DBD', x: 25, y: 80 }, { pos: 'DCD', x: 25, y: 50 }, { pos: 'DBZ', x: 25, y: 20 },
            { pos: 'MCD', x: 55, y: 65 }, { pos: 'MCZ', x: 55, y: 35 }, { pos: 'ACD', x: 90, y: 65 }, { pos: 'ACZ', x: 90, y: 35 }
        ]},
        'F8_241': { name: '2-4-1 (F8)', positions: [
            { pos: 'PO', x: 8, y: 50 }, { pos: 'DCD', x: 25, y: 65 }, { pos: 'DCZ', x: 25, y: 35 },
            { pos: 'MBD', x: 55, y: 90 }, { pos: 'MCD', x: 55, y: 65 }, { pos: 'MCZ', x: 55, y: 35 }, { pos: 'MBZ', x: 55, y: 10 }, { pos: 'ACZ', x: 90, y: 50 }
        ]},

        // --- FÚTBOL 7 ---
        'F7_321': { name: '3-2-1 (F7)', positions: [
            { pos: 'PO', x: 10, y: 50 }, { pos: 'DBD', x: 30, y: 80 }, { pos: 'DCD', x: 30, y: 50 }, { pos: 'DBZ', x: 30, y: 20 },
            { pos: 'MCD', x: 60, y: 65 }, { pos: 'MCZ', x: 60, y: 35 }, { pos: 'ACZ', x: 90, y: 50 }
        ]},
        'F7_231': { name: '2-3-1 (F7)', positions: [
            { pos: 'PO', x: 10, y: 50 }, { pos: 'DCD', x: 30, y: 65 }, { pos: 'DCZ', x: 30, y: 35 },
            { pos: 'MVD', x: 55, y: 85 }, { pos: 'MCD', x: 55, y: 50 }, { pos: 'MVZ', x: 55, y: 15 }, { pos: 'ACZ', x: 90, y: 50 }
        ]},
        'F7_132': { name: '1-3-2 (F7)', positions: [
            { pos: 'PO', x: 10, y: 50 }, { pos: 'DCD', x: 30, y: 50 },
            { pos: 'MBD', x: 55, y: 85 }, { pos: 'MCD', x: 55, y: 50 }, { pos: 'MBZ', x: 55, y: 15 }, { pos: 'ACD', x: 90, y: 65 }, { pos: 'ACZ', x: 90, y: 35 }
        ]},
        'F7_312': { name: '3-1-2 (F7)', positions: [
            { pos: 'PO', x: 10, y: 50 }, { pos: 'DBD', x: 30, y: 80 }, { pos: 'DCD', x: 30, y: 50 }, { pos: 'DBZ', x: 30, y: 20 },
            { pos: 'MCD', x: 60, y: 50 }, { pos: 'ACD', x: 92, y: 65 }, { pos: 'ACZ', x: 92, y: 35 }
        ]}
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
                        const rawPos = player.posicion || '--';
                        const choices = rawPos.split(',').map(c => c.trim());
                        
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
                }).join('')})()}
            </div>
        `;
    }

    async function renderCampograma(container) {
        const players = await db.getAll('jugadores');
        const teams = await db.getAll('equipos');
        const years = [...new Set(players.map(p => p.anionacimiento).filter(y => y))].sort((a,b) => b-a);
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
            const posMatch = campogramaFilters.posiciones.length === 0 || campogramaFilters.posiciones.includes(p.posicion);
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
                    ${renderMultiSelect('Nivel Pro', [1,2,3,4,5].map(lvl => ({ label: `NIVEL ${lvl}`, value: lvl })), campogramaFilters.niveles, 'window.toggleCampogramaLevel', 'levels')}
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

    window.renderTorneos = async function(container) {
        const { data: convs, error } = await supabaseClient.from('convocatorias').select('*').in('tipo', ['Torneo', 'TORNEO']).order('fecha', { ascending: false }).order('hora', { ascending: false });
        if (error) {
            container.innerHTML = `<p class="p-10 text-red-500 font-bold uppercase tracking-tight">Error de Sincronización: ${error.message}</p>`;
            return;
        }

        const teams = await db.getAll('equipos');
        const teamsMap = Object.fromEntries(teams.map(t => [t.id, t.nombre]));

        const safeGetExtra = (lugarStr) => {
            if (!lugarStr || !lugarStr.includes(' ||| ')) return {};
            try { return JSON.parse(lugarStr.split(' ||| ')[1]); } catch (e) { return {}; }
        };

        const userRes = await supabaseClient.auth.getUser();
        const currentUser = userRes.data?.user;
        const isGlobal = window.currentVisibilityMode === 'global';

        const filtered = convs.filter(c => {
            const extra = safeGetExtra(c.lugar);

            const matchesTeam = currentTorneoTeamId === 'all' || 
                              (c.equipoid && c.equipoid.toString() === currentTorneoTeamId.toString()) ||
                              (extra.eids && extra.eids.map(String).includes(currentTorneoTeamId.toString())) ||
                              (extra.sw && extra.sw.map(String).includes(currentTorneoTeamId.toString()));

            const matchesSearch = !torneoSearchTerm || 
                (c.nombre || '').toLowerCase().includes(torneoSearchTerm.toLowerCase()) ||
                (c.lugar || '').toLowerCase().includes(torneoSearchTerm.toLowerCase());
            return matchesTeam && matchesSearch;
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
                            <div class="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-xs shadow-lg shadow-blue-500/20">${(c.nombre || 'T').substring(0,1).toUpperCase()}</div>
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
                            <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-[10px] font-black shadow-lg shadow-blue-500/20">${(c.nombre || 'T').substring(0,1).toUpperCase()}</div>
                            <p class="text-xs md:text-sm font-black text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors">${c.nombre}</p>
                        </div>
                    </td>
                    <td class="p-4 md:p-6">
                        <div class="flex flex-col">
                            <span class="text-[10px] md:text-xs font-bold text-slate-700">${c.fecha}</span>
                            <span class="text-[9px] font-black text-slate-400 uppercase">
                                ${(() => {
                                    if (c.lugar && c.lugar.includes(' ||| ')) {
                                        try {
                                            const ex = JSON.parse(c.lugar.split(' ||| ')[1]);
                                            if (ex.hi) return `${ex.hl ? `${ex.hl} > ` : ''}${ex.hi}${ex.hs ? ` > ${ex.hs}` : ''}`;
                                        } catch(e) {}
                                    }
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

        const teamsWithTorneos = teams.filter(t => 
            convs.some(c => {
                const extra = safeGetExtra(c.lugar);
                return (c.equipoid && c.equipoid.toString() === t.id.toString()) || 
                       (extra.eids && extra.eids.map(String).includes(t.id.toString()));
            })
        );

        // Sort senior to junior
        teamsWithTorneos.sort((a, b) => {
            const valA = parseInt(a.categoria) || 9999;
            const valB = parseInt(b.categoria) || 9999;
            if (valA !== valB) return valA - valB;
            return (a.nombre || '').localeCompare(b.nombre || '');
        });

        container.innerHTML = `
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div class="flex flex-wrap gap-2">
                    <button onclick="window.switchTorneoTeamTab('all')" class="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${currentTorneoTeamId === 'all' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}">
                        TODOS LOS EQUIPOS
                    </button>
                    ${teamsWithTorneos.map(t => `
                        <button onclick="window.switchTorneoTeamTab('${t.id}')" class="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${currentTorneoTeamId.toString() === t.id.toString() ? 'bg-blue-600 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}">
                            ${t.nombre}
                        </button>
                    `).join('')}
                </div>

                <div class="relative w-full md:w-80">
                    <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                    <input type="text" 
                        id="torneo-search-input"
                        placeholder="Buscar torneo..." 
                        value="${torneoSearchTerm}"
                        oninput="window.updateTorneoSearch(this.value)"
                        class="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 ring-blue-50 transition-all">
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
            const teams = await db.getAll('equipos');
            const { data: users } = await supabaseClient.from('profiles').select('*');
            
            const pids = Array.isArray(conv.playerids) ? conv.playerids.map(String) : [];
            const convocados = players.filter(p => pids.includes(p.id.toString()));
            const rendimiento = conv.rendimiento || {};
            
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
                                                    const evalData = rendimiento[p.id] || { score: '', comment: '' };
                                                    return `
                                                        <tr class="border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
                                                            <td class="p-4">
                                                                <p class="text-[11px] font-black text-slate-800 uppercase truncate">${p.nombre}</p>
                                                            </td>
                                                            <td class="p-4">
                                                                <select name="pos_${p.id}" onchange="window.updateLocalPlayerPos(${p.id}, this.value)" class="w-full bg-slate-100/50 border-none rounded-lg text-[10px] font-bold p-2 outline-none focus:ring-2 ring-blue-50">
                                                                    ${(() => {
                                                                        const currentPos = evalData.pos || (p.posicion ? p.posicion.split(',')[0].trim() : '');
                                                                        return PLAYER_POSITIONS.map(pos => `
                                                                            <option value="${pos}" ${currentPos === pos ? 'selected' : ''}>${pos}</option>
                                                                        `).join('');
                                                                    })()}
                                                                </select>
                                                            </td>
                                                            <td class="p-4">
                                                                <select name="score_${p.id}" class="w-full bg-slate-100/50 border-none rounded-lg text-[10px] font-bold p-2 outline-none focus:ring-2 ring-blue-50 text-blue-600">
                                                                    <option value="">-</option>
                                                                    ${Array.from({length: 10}, (_, i) => i + 1).map(n => `<option value="${n}" ${evalData.score == n ? 'selected' : ''}>${n}</option>`).join('')}
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
                                    <p class="text-[8px] text-slate-400 font-bold uppercase">${p.posicion || '--'}</p>
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
        const teams = await db.getAll('equipos');
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
                                        ${teams.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('')}
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
                                    ${teams.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('')}
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
                    if (playerIds.length > 0) {
                        const playersData = {};
                        playerIds.forEach(pid => { playersData[pid] = 'asiste'; });
                        
                        const team = teams.find(t => t.id.toString() === (baseData.conv_equipoid || '').toString());
                        const teamName = team ? team.nombre.split(' ||| ')[0] : '';

                        const dateParts = baseData.fecha.split('-');
                        const dateShort = (dateParts.length === 3) ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0].slice(-2)}` : baseData.fecha;
                        
                        const fullName = `ASISTENCIA ${dateShort}_${teamName.toUpperCase()} ||| ${JSON.stringify({ eids: [baseData.conv_equipoid] })}`;

                        await db.add('asistencia', {
                            nombre: fullName,
                            equipoid: baseData.conv_equipoid ? parseInt(baseData.conv_equipoid) : null,
                            fecha: baseData.fecha,
                            players: playersData,
                            createdBy: currentUser.id,
                            convocatoriaid: newConv.id
                        });
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
                const today = new Date().toISOString().split('T')[0];
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
                    const now = new Date();
                    const itemDateTime = new Date(`${item.fecha}T${item.hora || '00:00'}`);
                    
                    const isTime = itemDateTime <= now;
                    const isMine = item.createdBy === currentUser.id;
                    const isSharedWithMe = item.sharedWith && item.sharedWith.includes(currentUser.id);
                    const notSeen = !seenNotifs.includes(`${item.type}_${item.id}`);
                    const dismissedNotifs = JSON.parse(localStorage.getItem('ms_coach_dismissed_notifs') || '[]');
                    const isDismissed = dismissedNotifs.includes(`${item.type}_${item.id}`);
                    
                    const isUpcomingShared = isSharedWithMe && !isMine && notSeen;
                    
                    return (isTime || isUpcomingShared) && !item.completada && !isDismissed;
                }).sort((a, b) => {
                    if (a.fecha === b.fecha) return (a.hora || '00:00').localeCompare(b.hora || '00:00');
                    return a.fecha.localeCompare(b.fecha);
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

                    notifCount.textContent = `${agendaItems.length} pendientes`;
                    
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
                                <div class="w-10 h-10 ${
                                    item.color === 'blue' ? 'bg-blue-50 text-blue-600' : 
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
                
                let startX = 0;
                let currentTranslate = 0;
                let isDragging = false;
                const threshold = 80;

                const onStart = (e) => {
                    startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
                    isDragging = true;
                    content.style.transition = 'none';
                    content.style.cursor = 'grabbing';
                };

                const onMove = (e) => {
                    if (!isDragging) return;
                    const x = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
                    currentTranslate = x - startX;
                    
                    if (currentTranslate > 120) currentTranslate = 120;
                    if (currentTranslate < -120) currentTranslate = -120;

                    content.style.transform = `translateX(${currentTranslate}px)`;
                    
                    if (currentTranslate > 20) {
                        // Deslizando a la derecha -> Revela acción izquierda (Leído)
                        actionLeft.style.opacity = Math.min(1, currentTranslate / 60);
                        actionRight.style.opacity = 0;
                    } else if (currentTranslate < -20) {
                        // Deslizando a la izquierda -> Revela acción derecha (Borrar)
                        actionRight.style.opacity = Math.min(1, Math.abs(currentTranslate) / 60);
                        actionLeft.style.opacity = 0;
                    } else {
                        actionLeft.style.opacity = 0;
                        actionRight.style.opacity = 0;
                    }
                };

                const onEnd = () => {
                    if (!isDragging) return;
                    isDragging = false;
                    content.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                    content.style.cursor = 'pointer';
                    
                    if (currentTranslate > threshold) {
                        // Swipe Right: Mark Read
                        content.style.transform = 'translateX(0px)';
                        const isSeen = JSON.parse(localStorage.getItem('ms_coach_seen_notifs') || '[]').includes(fullId);
                        window.toggleNotifSeen(fullId, isSeen);
                    } else if (currentTranslate < -threshold) {
                        // Swipe Left: Delete
                        content.style.transform = 'translateX(-100%)';
                        setTimeout(() => window.dismissIndividualNotif(fullId), 200);
                    } else {
                        content.style.transform = 'translateX(0px)';
                    }
                    currentTranslate = 0;
                };

                content.addEventListener('touchstart', onStart, { passive: true });
                content.addEventListener('touchmove', onMove, { passive: true });
                content.addEventListener('touchend', onEnd);
                
                content.addEventListener('mousedown', onStart);
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onEnd);
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

    initNotifications();

});

