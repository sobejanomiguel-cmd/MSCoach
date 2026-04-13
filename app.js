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
        const isTecnico = db.userRole === 'TECNICO';
        document.body.classList.toggle('role-tecnico', isTecnico);
        
        // Hide Admin Sections
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = isTecnico ? 'none' : 'block';
        });

        const secondaryBtn = document.getElementById('secondary-add-btn');
        if (secondaryBtn) secondaryBtn.style.display = isTecnico ? 'none' : 'flex';
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
                    alert("¡Registro enviado! Revisa tu email para confirmar la cuenta (mira en SPAM).");
                }
                await checkAuth();
            } catch (err) {
                alert("ERROR: " + err.message);
                console.error(err);
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
            if (error) alert(error.message);
            else window.location.reload(); // Recargar limpia el estado y vuelve al login
        });
    }
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
            sidebar.classList.toggle('active-mobile');
        });
        
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
        'dashboard': { title: 'MS Coach', subtitle: 'Resumen general de tu actividad.', addButtonEnabled: false },
        'calendario': { title: 'Calendario Maestro', subtitle: 'Planificación de sesiones y tareas diarias.', addButtonEnabled: false },
        'campograma': { title: 'Campograma Táctico', subtitle: 'Análisis de profundidad por sistema y posición.', addButtonEnabled: false },
        'eventos': { title: 'Agenda y Tareas', subtitle: 'Listado de tareas de gestión y recordatorios.', addButtonLabel: 'Nueva Tarea', addButtonEnabled: true },
        'tareas': { title: 'Directorio de Tareas', subtitle: 'Biblioteca de ejercicios de entrenamiento.', addButtonLabel: 'Nueva Tarea', addButtonEnabled: true, secondaryButtonEnabled: true, secondaryButtonLabel: 'Importar CSV' },
        'sesiones': { title: 'Sesiones de Entrenamiento', subtitle: 'Planificación y calendario.', addButtonLabel: 'Nueva Sesión', addButtonEnabled: true },
        'equipos': { title: 'Gestión de Equipos', subtitle: 'Plantillas y datos de jugadores.', addButtonLabel: 'Nuevo Equipo', addButtonEnabled: true, secondaryButtonEnabled: true, secondaryButtonLabel: 'Importar CSV' },
        'jugadores': { title: 'Directorio de Jugadores', subtitle: 'Base de datos global de futbolistas.', addButtonLabel: 'Nuevo Jugador', addButtonEnabled: true, secondaryButtonEnabled: true, secondaryButtonLabel: 'Importar CSV' },
        'asistencia': { title: 'Control de Asistencia', subtitle: 'Histórico de asistencia por día y equipo.', addButtonLabel: 'Pasar Asistencia', addButtonEnabled: true },
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

        // Sync mobile title
        const viewTitleMobile = document.getElementById('view-title-mobile');
        if (viewTitleMobile) {
            viewTitleMobile.textContent = meta.title.replace('Directorio de ', '').replace('Gestión de ', '');
        }

        // Button logic
        const secondaryAddBtn = document.getElementById('secondary-add-btn');
        const tertiaryAddBtn = document.getElementById('tertiary-add-btn');
        const cleanTasksBtn = document.getElementById('clean-tasks-btn');

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
                            const existingPlayers = await db.getAll('jugadores');
                            const existingPlayerNames = new Set(existingPlayers.map(p => p.nombre?.toLowerCase()));

                            let importedCount = 0;
                            let updatedCount = 0;
                            let skippedCount = 0;
                            for (let i = 1; i < lines.length; i++) {
                                const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
                                if (row.length < headers.length) continue;

                                const data = {};
                                headers.forEach((h, idx) => data[h] = row[idx]);

                                // Find team ID by name
                                const teamName = data['EQUIPO'];
                                const team = teams.find(t => t.nombre.toLowerCase() === (teamName || '').toLowerCase());

                                const csvPlayer = {
                                    nombre: data['NOMBRE'],
                                    equipoid: team ? team.id : '',
                                    dorsal: data['DORSAL'] || '',
                                    posicion: data['POSICION'] || 'PO',
                                    equipoConvenido: data['CLUB CONVENIDO'] || data['EQUIPO CONVENIDO'] || '',
                                    anionacimiento: data['AÑO NACIMIENTO'] || '',
                                    fechanacimiento: data['FECHA NACIMIENTO'] || '',
                                    nivel: data['NIVEL'] || 3
                                };

                                if (!csvPlayer.nombre) continue;

                                const existing = existingPlayers.find(p => p.nombre.toLowerCase() === csvPlayer.nombre.toLowerCase());

                                if (existing) {
                                    let needsUpdate = false;
                                    const fieldsMapping = {
                                        equipoid: csvPlayer.equipoid,
                                        dorsal: csvPlayer.dorsal,
                                        equipoConvenido: csvPlayer.equipoConvenido,
                                        anionacimiento: csvPlayer.anionacimiento,
                                        fechanacimiento: csvPlayer.fechanacimiento
                                    };
                                    for (const [key, val] of Object.entries(fieldsMapping)) {
                                        if (!existing[key] && val) {
                                            existing[key] = val;
                                            needsUpdate = true;
                                        }
                                    }
                                    if (needsUpdate) {
                                        await db.update('jugadores', existing);
                                        updatedCount++;
                                    } else {
                                        skippedCount++;
                                    }
                                    continue;
                                }

                                await db.add('jugadores', csvPlayer);
                                importedCount++;
                            }

                            window.customAlert('Importación Completada', `Se han importado ${importedCount} jugadores nuevos y completado ${updatedCount} existentes. ` + (skippedCount > 0 ? `${skippedCount} sin cambios.` : ''), 'success');
                            window.switchView('jugadores');
                        };
                        reader.readAsText(file);
                    };
                    fileInput.click();
                };
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

                            const headers = lines[0].split(',').map(h => h.trim().toUpperCase());
                            const teams = await db.getAll('equipos');
                            const players = await db.getAll('jugadores');
                            const existingConvs = await db.getAll('convocatorias');
                            const existingConvKeys = new Set(existingConvs.map(c => `${c.nombre?.toLowerCase()}|${c.fecha}`));

                            let importedCount = 0;
                            let updatedCount = 0;
                            let skippedCount = 0;
                            for (let i = 1; i < lines.length; i++) {
                                const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
                                if (row.length < headers.length) continue;

                                const data = {};
                                headers.forEach((h, idx) => data[h] = row[idx]);

                                // Buscar el equipo por nombre
                                const teamName = data['EQUIPO'];
                                const team = teams.find(t => t.nombre.toLowerCase() === (teamName || '').toLowerCase());

                                // Buscar jugadores por nombre (separados por ;)
                                const playerNames = (data['JUGADORES'] || '').split(';').map(n => n.trim().toLowerCase());
                                const foundPlayerIds = players
                                    .filter(p => playerNames.includes(p.nombre.toLowerCase()))
                                    .map(p => p.id.toString());

                                const convData = {
                                    nombre: data['NOMBRE'],
                                    tipo: data['TIPO'] || 'Ciclo',
                                    fecha: data['FECHA'],
                                    hora: data['HORA'],
                                    lugar: data['LUGAR'],
                                    equipoid: team ? team.id : null,
                                    playerids: foundPlayerIds
                                };

                                const key = `${convData.nombre?.toLowerCase()}|${convData.fecha}`;
                                const existing = existingConvs.find(c => `${c.nombre?.toLowerCase()}|${c.fecha}` === key);

                                if (existing) {
                                    let needsUpdate = false;
                                    if (!existing.hora && convData.hora) { existing.hora = convData.hora; needsUpdate = true; }
                                    if (!existing.lugar && convData.lugar) { existing.lugar = convData.lugar; needsUpdate = true; }
                                    if ((!existing.playerids || existing.playerids.length === 0) && convData.playerids.length > 0) {
                                        existing.playerids = convData.playerids;
                                        needsUpdate = true;
                                    }

                                    if (needsUpdate) {
                                        await supabaseClient.from('convocatorias').update(existing).eq('id', existing.id);
                                        updatedCount++;
                                    } else {
                                        skippedCount++;
                                    }
                                    continue;
                                }

                                await supabaseClient.from('convocatorias').insert(convData);
                                importedCount++;
                            }

                            window.customAlert('Importación Exitosa', `Se han creado ${importedCount} convocatorias y actualizado ${updatedCount}. ` + (skippedCount > 0 ? `${skippedCount} sin cambios.` : ''), 'success');
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
                            const headers = lines[0].split(',').map(h => h.trim().toUpperCase());
                            const existingTeams = await db.getAll('equipos');
                            const existingTeamNames = new Set(existingTeams.map(e => e.nombre?.toLowerCase()));

                            let importedCount = 0;
                            let updatedCount = 0;
                            let skippedCount = 0;
                            for (let i = 1; i < lines.length; i++) {
                                const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
                                if (row.length < headers.length) continue;
                                const data = {};
                                headers.forEach((h, idx) => data[h] = row[idx]);
                                const newTeam = {
                                    nombre: data['NOMBRE'],
                                    categoria: data['CATEGORIA'] || 'Sénior',
                                    escudo: null,
                                    jugadorescount: 0
                                };
                                if (!newTeam.nombre) continue;

                                const existing = existingTeams.find(e => e.nombre?.toLowerCase() === newTeam.nombre.toLowerCase());
                                if (existing) {
                                    if (!existing.categoria && newTeam.categoria) {
                                        existing.categoria = newTeam.categoria;
                                        await db.update('equipos', existing);
                                        updatedCount++;
                                    } else {
                                        skippedCount++;
                                    }
                                    continue;
                                }
                                await db.add('equipos', newTeam);
                                importedCount++;
                            }
                            window.customAlert('Importación Exitosa', `Se han creado ${importedCount} equipos y actualizado ${updatedCount}. ` + (skippedCount > 0 ? `${skippedCount} sin cambios.` : ''), 'success');
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
            case 'eventos': await renderEventos(wrapper); break;
            case 'tareas': await renderTareas(wrapper); break;
            case 'sesiones': await renderSesiones(wrapper); break;
            case 'equipos': await renderEquipos(wrapper); break;
            case 'jugadores': await renderJugadores(wrapper); break;
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
        const tasks = await db.getAll('tareas');
        const sessions = await db.getAll('sesiones');
        const teams = await db.getAll('equipos');
        const convocatorias = await db.getAll('convocatorias');
        const players = await db.getAll('jugadores');
 
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
                                    <span class="text-xs font-black text-blue-600">${e.asistenciamedia}%</span>
                                </div>
                                <div class="attendance-bar-bg">
                                    <div class="attendance-bar-fill" style="width: ${e.asistenciamedia}%"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-[450px] flex flex-col">
                    <h3 class="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <i data-lucide="brain-circuit" class="w-5 h-5 text-indigo-600"></i>
                        Metodología y Contenidos por Equipo
                    </h3>
                    <div class="space-y-8 flex-1 overflow-y-auto custom-scrollbar pr-2">
                        ${teams.map(team => {
                            const teamSessions = sessions.filter(s => s.equipoid == team.id);
                            const teamConvocatorias = convocatorias.filter(c => c.equipoid == team.id);
                            const taskIds = teamSessions.flatMap(s => s.taskids || []);
                            const taskObjects = tasks.filter(t => taskIds.includes(t.id.toString()));
                            
                            // Analisis de convocatorias compartidas
                            const sessionPlayersIds = [...new Set(teamSessions.flatMap(s => s.playerids || []))];
                            const tournamentPlayersIds = [...new Set(teamConvocatorias.flatMap(c => c.playerids || []))];
                            const commonPlayers = tournamentPlayersIds.filter(id => sessionPlayersIds.includes(id));
                            const onlyTourney = tournamentPlayersIds.filter(id => !sessionPlayersIds.includes(id));

                            const typeCounts = {};
                            taskObjects.forEach(t => {
                                typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
                            });
                            const totalTasks = taskObjects.length || 1;

                            return `
                                <div class="p-5 bg-slate-50 rounded-3xl border border-slate-100/50">
                                    <div class="flex justify-between items-center mb-4">
                                        <div class="flex items-center gap-3">
                                            <div class="w-2 h-8 bg-indigo-500 rounded-full"></div>
                                            <span class="text-sm font-black text-slate-800 uppercase tracking-widest">${team.nombre}</span>
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div class="space-y-3">
                                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">METODOLOGÍA (% DE TRABAJO)</p>
                                            <div class="space-y-2">
                                                ${Object.entries(typeCounts).map(([type, count]) => {
                                                    const pct = Math.round((count / totalTasks) * 100);
                                                    return `
                                                        <div class="flex items-center gap-3">
                                                            <div class="flex-1 h-2 bg-white rounded-full overflow-hidden border border-slate-200">
                                                                <div class="h-full bg-indigo-500 rounded-full" style="width: ${pct}%"></div>
                                                            </div>
                                                            <div class="w-24 flex justify-between items-center">
                                                                <span class="text-[9px] font-black text-slate-700">${pct}%</span>
                                                                <span class="text-[8px] font-bold text-slate-400 uppercase truncate ml-2">${type}</span>
                                                            </div>
                                                        </div>
                                                    `;
                                                }).join('') || '<p class="text-[9px] text-slate-400 italic">Sin datos registrados</p>'}
                                            </div>
                                        </div>
                                        <div class="space-y-3">
                                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">ANÁLISIS DE CONVOCATORIA</p>
                                            <div class="space-y-3">
                                                <div class="flex justify-between items-center p-2 bg-white rounded-xl border border-slate-100">
                                                    <span class="text-[9px] font-bold text-slate-500 uppercase">Núcleo Competición</span>
                                                    <span class="text-xs font-black text-emerald-600">${commonPlayers.length}</span>
                                                </div>
                                                <div class="flex justify-between items-center p-2 bg-white rounded-xl border border-slate-100">
                                                    <span class="text-[9px] font-bold text-slate-500 uppercase">Refuerzos Torneo</span>
                                                    <span class="text-xs font-black text-amber-600">${onlyTourney.length}</span>
                                                </div>
                                                <div class="text-[8px] text-slate-400 italic">
                                                    ${commonPlayers.length > 0 ? `Comparten el ${Math.round((commonPlayers.length / (tournamentPlayersIds.length || 1)) * 100)}% de los jugadores en ambos eventos.` : 'Inicia torneos para comparar continuidad.'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="space-y-3 pt-4 border-t border-slate-200/50">
                                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">HISTORIAL DE SESIONES</p>
                                        <div class="flex flex-wrap gap-1.5">
                                            ${[...new Set(taskObjects.map(t => t.name))].slice(0, 8).map(name => `
                                                <span class="px-2 py-1 bg-white text-[9px] font-bold text-slate-500 rounded-xl border border-slate-100 shadow-sm">${name}</span>
                                            `).join('') || '<span class="text-[10px] text-slate-400 italic">Pendiente de ejecución</span>'}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
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
                                 <i data-lucide="users" class="w-4 h-4"></i> ${sessions[0].equiponombre || 'Equipo'}
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
            const convocatorias = await db.getAll('convocatorias');
            
            const year = currentCalendarDate.getFullYear();
            const month = currentCalendarDate.getMonth();
            
            const monthName = new Intl.DateTimeFormat('es', { month: 'long' }).format(currentCalendarDate);
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            let startingDay = firstDay === 0 ? 6 : firstDay - 1;

            const selDateStr = `${selectedCalendarDate.getFullYear()}-${String(selectedCalendarDate.getMonth() + 1).padStart(2, '0')}-${String(selectedCalendarDate.getDate()).padStart(2, '0')}`;
            const selectedDaySessions = sessions.filter(s => s.fecha === selDateStr);
            const selectedDayEvents = eventos.filter(e => e.fecha === selDateStr);
            const selectedDayConvocatorias = convocatorias.filter(c => c.fecha === selDateStr);

            const combinedItems = [
                ...selectedDaySessions.map(s => ({ ...s, type: 'sesion' })),
                ...selectedDayEvents.map(e => ({ ...e, type: 'evento' })),
                ...selectedDayConvocatorias.map(c => ({ ...c, type: 'convocatoria' }))
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
                                const hasConcs = convocatorias.some(c => c.fecha === dStr);
                                const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                                
                                return `
                                    <div onclick="window.selectDate(${year}, ${month}, ${day})" class="border-r border-b border-slate-50 p-2 min-h-[90px] cursor-pointer transition-all flex flex-col items-center justify-center relative ${isSelected ? 'bg-blue-600' : 'hover:bg-blue-50'}">
                                        <span class="text-sm font-bold ${isSelected ? 'text-white' : isToday ? 'text-blue-600' : 'text-slate-600'}">${day}</span>
                                        <div class="flex gap-1 mt-1">
                                            ${hasSessions ? `<div class="w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}"></div>` : ''}
                                            ${hasConcs ? `<div class="w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}"></div>` : ''}
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
                            <div class="mb-6 flex justify-between items-center">
                                <div>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Agenda para el día</p>
                                    <h4 class="text-xl font-black text-slate-800">${selectedCalendarDate.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
                                </div>
                                <button onclick="window.viewNewUnifiedEvent('${selDateStr}')" class="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 transition-all shadow-lg">
                                    <i data-lucide="plus" class="w-5 h-5"></i>
                                </button>
                            </div>
                            <div class="space-y-3">
                                ${combinedItems.length > 0 ? combinedItems.map(item => {
                                    const isSession = item.type === 'sesion';
                                    const isConv = item.type === 'convocatoria';
                                    let bgColor = 'bg-amber-50/30 border-amber-100';
                                    let icon = 'alarm-clock';
                                    let action = `window.viewEvento(${item.id})`;

                                    if (isSession) {
                                        bgColor = 'bg-blue-50/30 border-blue-100';
                                        icon = 'calendar';
                                        action = `window.viewSession(${item.id})`;
                                    } else if (isConv) {
                                        bgColor = 'bg-emerald-50/30 border-emerald-100';
                                        icon = 'users';
                                        action = `window.viewConvocatoria(${item.id})`;
                                    }

                                    return `
                                        <div onclick="${action}" class="p-4 rounded-2xl border ${bgColor} hover:bg-white transition-all cursor-pointer group">
                                            <div class="flex justify-between items-center mb-1">
                                                <span class="text-[10px] font-black text-slate-400 uppercase">${item.hora || 'Todo el día'}</span>
                                                <i data-lucide="${icon}" class="w-3 h-3 text-slate-300"></i>
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

            if (window.lucide) lucide.createIcons();
            
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
            if (window.refreshNotifications) window.refreshNotifications();
            window.switchView(currentView);
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
                            <button onclick="event.stopPropagation(); window.deleteEvento(${e.id})" class="p-2 text-red-400 hover:text-red-600 transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
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
                    <div class="flex gap-4 mt-6">
                        <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
                        <button type="submit" class="flex-[2] py-4 bg-amber-600 text-white font-bold rounded-2xl shadow-lg shadow-amber-600/20 hover:bg-amber-700 transition-all">Guardar Evento</button>
                    </div>
                </form>
            </div>
        `;
        lucide.createIcons(); modalOverlay.classList.add('active');
        
        
        document.getElementById('edit-evento-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target).entries());
            data.id = parseInt(data.id);
            await db.update('eventos', data);
            closeModal();
            window.switchView('eventos');
        });
    };

    window.deleteEvento = async (id) => {
        window.customConfirm('¿Eliminar Evento?', 'Se borrará este evento de tu agenda.', async () => {
            await db.delete('eventos', Number(id));
            window.switchView('eventos');
        });
    };

    let taskFilters = { search: '', type: 'TODOS', categoria: 'TODAS' };
    let tasksPerPage = 12;
    let currentTaskPage = 1;

    async function renderTareas(container) {
        let tasks = await db.getAll('tareas');
        
        container.innerHTML = `
            <div class="mb-8 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div class="flex flex-col md:flex-row gap-4">
                    <div class="flex-1 relative">
                        <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                        <input type="text" id="task-search-input" value="${taskFilters.search}" placeholder="Buscar por nombre de tarea..." class="w-full pl-11 pr-4 py-3 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:ring-4 ring-blue-50 transition-all text-sm">
                    </div>
                    <div class="grid grid-cols-2 gap-3 md:w-[400px]">
                        <select id="task-type-filter" class="px-4 py-3 bg-slate-50 border-transparent rounded-2xl text-xs font-bold text-slate-600 outline-none focus:bg-white transition-all">
                            <option value="TODOS">TODOS LOS TIPOS</option>
                            ${TASK_TYPES.map(t => `<option value="${t}" ${taskFilters.type === t ? 'selected' : ''}>${t}</option>`).join('')}
                        </select>
                        <select id="task-cat-filter" class="px-4 py-3 bg-slate-50 border-transparent rounded-2xl text-xs font-bold text-slate-600 outline-none focus:bg-white transition-all">
                            <option value="TODAS">TODAS ETAPAS</option>
                            ${TASK_CATEGORIES.map(c => `<option value="${c}" ${taskFilters.categoria === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>

            <div class="task-grid" id="main-task-grid"></div>
            
            <div id="load-more-container" class="mt-12 text-center hidden">
                <button id="load-more-tasks-btn" class="px-8 py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
                    Cargar más ejercicios
                </button>
            </div>
        `;

        // Listeners para los filtros
        const searchInput = document.getElementById('task-search-input');
        const typeFilter = document.getElementById('task-type-filter');
        const catFilter = document.getElementById('task-cat-filter');

        let searchTimer;
        if (searchInput) {
            searchInput.oninput = (e) => {
                taskFilters.search = e.target.value;
                currentTaskPage = 1;
                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => {
                    updateTaskGrid(container);
                }, 250);
            };
        }
        
        if (typeFilter) {
            typeFilter.onchange = (e) => {
                taskFilters.type = e.target.value;
                currentTaskPage = 1;
                window.renderView('tareas');
            };
        }

        if (catFilter) {
            catFilter.onchange = (e) => {
                taskFilters.categoria = e.target.value;
                currentTaskPage = 1;
                window.renderView('tareas');
            };
        }

        lucide.createIcons();
        currentTaskPage = 1;
        updateTaskGrid(container);
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
        } else if (!video.startsWith('http')) {
            embedUrl = `https://drive.google.com/file/d/${video}/preview`;
        } else {
            embedUrl = video;
        }

        return `<div class="video-container mb-6 overflow-hidden border-4 border-slate-900 shadow-2xl">
                    <iframe src="${embedUrl}" allow="autoplay; fullscreen" allowfullscreen></iframe>
                </div>`;
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
                            <span class="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase">${s.equiponombre}</span>
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

    window.renderSessionModal = async (sessionData = null) => {
        const teams = await db.getAll('equipos');
        const tasks = await db.getAll('tareas');
        const players = await db.getAll('jugadores');
        const { data: users, error: userError } = await supabaseClient.from('profiles').select('*');
        if (userError) console.warn("Error fetching profiles, check RLS or table existence:", userError);
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
            sharedWith: []
        };

        modalContainer.innerHTML = `
            <div class="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-bold text-slate-800">${isEdit ? 'Editar Planificación' : 'Nueva Planificación'}</h3>
                    <button onclick="closeModal()" class="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200 transition-all"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>
                
                <form id="session-modal-form" class="space-y-6">
                    ${isEdit ? `<input type="hidden" name="id" value="${session.id}">` : ''}
                    <div class="grid grid-cols-2 gap-6">
                        <div class="col-span-2">
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Objetivo de la Sesión</label>
                            <input name="titulo" value="${session.titulo || ''}" placeholder="Ej: Transiciones ofensivas rápidas" class="w-full p-3 border rounded-xl outline-none focus:ring-2 ring-blue-100" required>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Equipo</label>
                            <select name="equipoid" id="session-modal-team-select" class="w-full p-3 border rounded-xl bg-white">
                                <option value="">Seleccionar equipo...</option>
                                ${teams.map(t => `<option value="${t.id}" ${session.equipoid == t.id ? 'selected' : ''}>${t.nombre}</option>`).join('')}
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
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Ciclo</label>
                            <select name="ciclo" class="w-full p-3 border rounded-xl bg-white focus:ring-2 ring-blue-100 outline-none">
                                ${[1,2,3,4,5,6].map(num => `<option value="${num}" ${session.ciclo == num ? 'selected' : ''}>Ciclo ${num}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nº Sesión</label>
                            <select name="numSesion" class="w-full p-3 border rounded-xl bg-white focus:ring-2 ring-blue-100 outline-none">
                                ${Array.from({length: 25}, (_, i) => i + 1).map(num => `<option value="${num}" ${session.numSesion == num ? 'selected' : ''}>Sesión ${num}</option>`).join('')}
                            </select>
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
                                    <div class="relative">
                                        <select id="slot-type-${num}" class="w-full p-2 text-[10px] border-none bg-white rounded-xl shadow-sm outline-none mb-2">
                                            <option value="TODOS">TODOS LOS TIPOS</option>
                                            ${TASK_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
                                        </select>
                                        <select name="task-slot-${num}" id="task-select-${num}" class="w-full p-3 text-xs font-bold border-none bg-white rounded-xl shadow-sm outline-none appearance-none cursor-pointer">
                                            <option value="">Seleccionar ejercicio...</option>
                                            ${tasks.map(t => `<option value="${t.id}" data-type="${t.type}" ${session.taskids && session.taskids[num-1] == t.id.toString() ? 'selected' : ''}>${t.name}</option>`).join('')}
                                        </select>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-4">Convocatoria de Jugadores</label>
                        <div id="session-modal-players-list" class="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-100">
                            <p class="col-span-full p-4 text-center text-xs text-slate-400 italic">Selecciona un equipo para cargar jugadores</p>
                        </div>
                    </div>

                    <div class="space-y-3">
                        <label class="block text-xs font-black text-slate-400 uppercase tracking-widest">Compartir con el Staff</label>
                        <div id="staff-share-list" class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100 custom-scrollbar">
                            <!-- Injected by JS -->
                        </div>
                    </div>

                    <div class="space-y-3">
                        <label class="block text-xs font-black text-slate-400 uppercase tracking-widest">Compartir con el Staff</label>
                        <div id="staff-share-list" class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100 custom-scrollbar">
                            ${users ? users.filter(u => u.id !== currentUser.id).map(u => `
                                <label class="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 transition-all select-none">
                                    <input type="checkbox" name="sharedWith" value="${u.id}" ${session.sharedWith && session.sharedWith.includes(u.id) ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 focus:ring-blue-100">
                                    <div class="flex-1">
                                        <p class="text-[10px] font-bold text-slate-700">${u.full_name}</p>
                                        <p class="text-[8px] text-slate-400 font-black uppercase tracking-tighter">${u.role}</p>
                                    </div>
                                </label>
                            `).join('') : '<p class="text-[10px] text-slate-400 italic">No hay otros usuarios registrados.</p>'}
                        </div>
                    </div>

                    <div class="flex gap-4 mt-8">
                        <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
                        <button type="submit" class="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all uppercase tracking-widest">${isEdit ? 'Guardar Cambios' : 'Crear Sesión'}</button>
                    </div>
                </form>
            </div>
        `;

        const teamSelect = document.getElementById('session-modal-team-select');
        const playersList = document.getElementById('session-modal-players-list');

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
            const equipoid = teamSelect.value;
            if (!equipoid) return;
            const teamPlayers = players.filter(p => p.equipoid == equipoid);
            playersList.innerHTML = teamPlayers.map(p => `
                <label class="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-xl cursor-pointer hover:border-blue-200">
                    <input type="checkbox" name="playerids" value="${p.id}" ${session.playerids && session.playerids.includes(p.id.toString()) ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600">
                    <span class="text-[10px] font-bold text-slate-700 truncate">${p.nombre}</span>
                </label>
            `).join('') || '<p class="col-span-full p-4 text-center text-xs text-slate-400 italic">No hay jugadores vinculados.</p>';
        };

        teamSelect.onchange = updatePlayers;
        if (session.equipoid) updatePlayers();

        lucide.createIcons();
        modalOverlay.classList.add('active');

        document.getElementById('session-modal-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            if (data.id) data.id = parseInt(data.id);
            data.sharedWith = formData.getAll('sharedWith'); 
            data.createdBy = currentUser.id;
            
            data.taskids = [];
            for (let i = 1; i <= 6; i++) {
                const val = document.getElementById(`task-select-${i}`).value;
                if (val) data.taskids.push(val);
            }
            
            data.playerids = formData.getAll('playerids');
            const team = teams.find(t => t.id == data.equipoid);
            data.equiponombre = team ? team.nombre : 'Equipo';
            
            if (isEdit) await db.update('sesiones', data);
            else await db.add('sesiones', data);
            
            closeModal();
            window.renderView('sesiones');
        };
    };

    window.viewSession = async (id) => {
        const sessions = await db.getAll('sesiones');
        const session = sessions.find(s => s.id == id);
        window.renderSessionModal(session);
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
        const sessions = await db.getAll('sesiones');
        const session = sessions.find(s => s.id == id);
        if (!session) return;
        
        const allTasks = await db.getAll('tareas');
        const allPlayers = await db.getAll('jugadores');
        const teams = await db.getAll('equipos');
        const currentTeam = teams.find(t => t.id == session.equipoid);

        const sessionTasks = (session.taskids || []).map(id => allTasks.find(t => t.id == id)).filter(Boolean);
        const sessionPlayers = allPlayers.filter(p => session.playerids && session.playerids.includes(p.id.toString()));
        
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
                        <p class="text-sm font-bold text-slate-800">${session.equiponombre}</p>
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
        
        
        setTimeout(() => {
            window.print();
            document.body.removeChild(printDiv);
        }, 500);
    };

    async function renderEquipos(container) { // fix
        const teams = await db.getAll('equipos');
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${teams.map(e => `
                    <div onclick="window.viewTeam(${e.id})" class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group cursor-pointer hover:border-blue-200 transition-all">
                        <div class="flex items-center gap-4 mb-6">
                            ${e.escudo ? `<img src="${e.escudo}" class="w-14 h-14 object-contain rounded-xl">` : `<div class="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">${e.nombre.substring(0,2).toUpperCase()}</div>`}
                            <div>
                                <h4 class="font-bold text-slate-800">${e.nombre}</h4>
                                <p class="text-xs text-slate-500">${e.categoria || 'Año no def.'}</p>
                            </div>
                        </div>
                        <div class="space-y-4 mb-6">
                            <div class="flex justify-between items-end">
                                <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Asistencia Media</span>
                                <span class="text-sm font-black text-blue-600">${e.asistenciamedia || 0}%</span>
                            </div>
                            <div class="attendance-bar-bg"><div class="attendance-bar-fill" style="width: ${e.asistenciamedia || 0}%"></div></div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="bg-slate-50 p-3 rounded-xl"><p class="text-[10px] font-bold text-slate-400 uppercase">Plantilla</p><p class="text-lg font-bold">${e.jugadorescount || 0}</p></div>
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
                window.switchView('equipos');
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
                             <select id="edit-team-year-input" name="categoria" class="w-full p-3 border rounded-xl bg-white" required>
                                <option value="">Seleccionar año...</option>
                                ${[2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018].map(y => `<option value="${y}" ${team.categoria == y ? 'selected' : ''}>${y}</option>`).join('')}
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
            const year = yearInput.value;
            const filtered = players.filter(p => !year || p.anionacimiento == year);
            listDiv.innerHTML = filtered.map(p => `
                <label class="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-xl cursor-pointer hover:border-blue-200">
                    <input type="checkbox" name="linkedPlayerIds" value="${p.id}" ${p.equipoid == team.id ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600">
                    <span class="text-[10px] font-bold text-slate-700 truncate">${p.nombre}</span>
                </label>
            `).join('') || `<p class="col-span-full p-4 text-center text-xs text-slate-400 italic">No hay jugadores nacidos en ${year || 'este año'}.</p>`;
        };

        yearInput.addEventListener('change', updatePlayerLinkage);
        updatePlayerLinkage();
        
        lucide.createIcons(); modalOverlay.classList.add('active');
        

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
                if (isLinked && p.equipoid != data.id) {
                    p.equipoid = data.id.toString();
                    await db.update('jugadores', p);
                } else if (!isLinked && p.equipoid == data.id) {
                    p.equipoid = '';
                    await db.update('jugadores', p);
                }
            }

            // Recalculate players count
            data.jugadorescount = linkedPlayerIds.length;
            
            await db.update('equipos', data);
            closeModal();
            window.switchView('equipos');
        });
    };

    window.viewTeamPlayers = async (equipoid) => {
        const teams = await db.getAll('equipos');
        const team = teams.find(t => t.id == equipoid);
        const players = (await db.getAll('jugadores')).filter(p => p.equipoid == equipoid);
        
        modalContainer.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h3 class="text-2xl font-bold text-slate-800">${team.nombre}</h3>
                        <p class="text-slate-500">${team.categoria || 'Año no def.'}</p>
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
                <button onclick="window.addPlayerToTeam(${equipoid})" class="w-full mt-6 py-4 bg-blue-50 text-blue-600 font-bold rounded-2xl hover:bg-blue-100 transition-all flex items-center justify-center gap-2">
                    <i data-lucide="plus-circle" class="w-5 h-5"></i>
                    Añadir Jugador
                </button>
            </div>
        `;
        lucide.createIcons(); modalOverlay.classList.add('active');
        
    };

    window.addPlayerToTeam = (equipoid) => {
        modalContainer.innerHTML = `
            <div class="p-8">
                <h3 class="text-2xl font-bold mb-6 text-slate-800">Nuevo Jugador</h3>
                <form id="new-player-form" class="space-y-4">
                    <input type="hidden" name="equipoid" value="${equipoid}">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="col-span-2"><input name="nombre" placeholder="Nombre completo" class="w-full p-3 border rounded-xl" required></div>
                        <input name="dorsal" type="number" placeholder="Dorsal" class="w-full p-3 border rounded-xl">
                        <select name="posicion" class="w-full p-3 border rounded-xl">
                            <option value="PO">PO (Portero)</option>
                            <option value="DBD">DBD (Lateral Dcho)</option>
                            <option value="DBZ">DBZ (Lateral Izq)</option>
                            <option value="DCD">DCD (Central Dcho)</option>
                            <option value="DCZ">DCZ (Central Izq)</option>
                            <option value="MCD">MCD (Mediocentro Dcho)</option>
                            <option value="MCZ">MCZ (Mediocentro Izq)</option>
                            <option value="MVD">MVD (Interior Dcho)</option>
                            <option value="MVZ">MVZ (Interior Izq)</option>
                            <option value="MBD">MBD (Extremo Dcho)</option>
                            <option value="MBZ">MBZ (Extremo Izq)</option>
                            <option value="MPD">MPD (Mediapunta Dcho)</option>
                            <option value="MPZ">MPZ (Mediapunta Izq)</option>
                            <option value="ACD">ACD (Delantero Dcho)</option>
                            <option value="ACZ">ACZ (Delantero Izq)</option>
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
            const data = Object.fromEntries(new FormData(e.target).entries());
            await db.add('jugadores', data);
            window.viewTeamPlayers(equipoid);
        });
        
    };

    async function renderJugadores(container) { // fix
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
                            <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Club Convenido</th>
                            <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase text-center">Dorsal</th>
                            <th class="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${players.map(p => {
                            const team = teams.find(t => t.id == p.equipoid);
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
                                    <td class="px-6 py-4 truncate max-w-[120px]">
                                        <span class="text-[10px] font-bold text-blue-500 uppercase">${p.equipoConvenido || '--'}</span>
                                    </td>
                                    <td class="px-6 py-4 text-center">
                                         <span class="text-sm font-black text-slate-400">${p.dorsal || '--'}</span>
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <div class="flex justify-end gap-1">
                                            <button class="p-2 text-slate-400 group-hover:text-blue-600 transition-colors"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                                            <button onclick="event.stopPropagation(); window.deletePlayer(${p.id})" class="p-2 text-red-400 hover:text-red-600 transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
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
                    <fieldset ${db.userRole === 'TECNICO' ? 'disabled' : ''} class="grid grid-cols-2 gap-6">
                        <div class="col-span-2">
                             <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nombre Completo</label>
                             <input name="nombre" value="${player.nombre}" class="w-full p-4 border rounded-2xl text-lg font-bold outline-none focus:ring-2 ring-blue-100" required>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">EQUIPO RS</label>
                            <select name="equipoid" class="w-full p-3 border rounded-xl bg-white outline-none">
                                <option value="">Sin equipo</option>
                                ${teams.map(t => `<option value="${t.id}" ${player.equipoid == t.id ? 'selected' : ''}>${t.nombre}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Dorsal</label>
                            <input name="dorsal" type="number" value="${player.dorsal || ''}" class="w-full p-3 border rounded-xl outline-none" placeholder="nº">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Posición</label>
                            <select name="posicion" class="w-full p-3 border rounded-xl bg-white outline-none">
                                <option value="PO" ${player.posicion === 'PO' ? 'selected' : ''}>PO (Portero)</option>
                                <option value="DBD" ${player.posicion === 'DBD' ? 'selected' : ''}>DBD (Lateral Dcho)</option>
                                <option value="DBZ" ${player.posicion === 'DBZ' ? 'selected' : ''}>DBZ (Lateral Izq)</option>
                                <option value="DCD" ${player.posicion === 'DCD' ? 'selected' : ''}>DCD (Central Dcho)</option>
                                <option value="DCZ" ${player.posicion === 'DCZ' ? 'selected' : ''}>DCZ (Central Izq)</option>
                                <option value="MCD" ${player.posicion === 'MCD' ? 'selected' : ''}>MCD (Mediocentro Dcho)</option>
                                <option value="MCZ" ${player.posicion === 'MCZ' ? 'selected' : ''}>MCZ (Mediocentro Izq)</option>
                                <option value="MVD" ${player.posicion === 'MVD' ? 'selected' : ''}>MVD (Interior Dcho)</option>
                                <option value="MVZ" ${player.posicion === 'MVZ' ? 'selected' : ''}>MVZ (Interior Izq)</option>
                                <option value="MBD" ${player.posicion === 'MBD' ? 'selected' : ''}>MBD (Extremo Dcho)</option>
                                <option value="MBZ" ${player.posicion === 'MBZ' ? 'selected' : ''}>MBZ (Extremo Izq)</option>
                                <option value="MPD" ${player.posicion === 'MPD' ? 'selected' : ''}>MPD (Mediapunta Dcho)</option>
                                <option value="MPZ" ${player.posicion === 'MPZ' ? 'selected' : ''}>MPZ (Mediapunta Izq)</option>
                                <option value="ACD" ${player.posicion === 'ACD' ? 'selected' : ''}>ACD (Delantero Dcho)</option>
                                <option value="ACZ" ${player.posicion === 'ACZ' ? 'selected' : ''}>ACZ (Delantero Izq)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Año Nacimiento</label>
                            <input name="anionacimiento" type="number" value="${player.anionacimiento || ''}" class="w-full p-3 border rounded-xl outline-none" placeholder="Ej: 2010">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Club Convenido</label>
                            <select name="equipoConvenido" class="w-full p-3 border rounded-xl bg-white outline-none">
                                <option value="">Ninguno</option>
                                <option ${player.equipoConvenido === 'CD BAZTAN KE' ? 'selected' : ''}>CD BAZTAN KE</option>
                                <option ${player.equipoConvenido === 'BETI GAZTE KJKE' ? 'selected' : ''}>BETI GAZTE KJKE</option>
                                <option ${player.equipoConvenido === 'GURE TXOKOA KKE' ? 'selected' : ''}>GURE TXOKOA KKE</option>
                                <option ${player.equipoConvenido === 'CA RIVER EBRO' ? 'selected' : ''}>CA RIVER EBRO</option>
                                <option ${player.equipoConvenido === 'CALAHORRA FB' ? 'selected' : ''}>CALAHORRA FB</option>
                                <option ${player.equipoConvenido === 'EF ARNEDO' ? 'selected' : ''}>EF ARNEDO</option>
                                <option ${player.equipoConvenido === 'EFB ALFARO' ? 'selected' : ''}>EFB ALFARO</option>
                                <option ${player.equipoConvenido === 'UD BALSAS PICARRAL' ? 'selected' : ''}>UD BALSAS PICARRAL</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nivel (1-5)</label>
                            <select name="nivel" class="w-full p-3 border rounded-xl bg-white outline-none">
                                <option value="1" ${player.nivel == 1 ? 'selected' : ''}>⭐ (Muy Bajo)</option>
                                <option value="2" ${player.nivel == 2 ? 'selected' : ''}>⭐⭐ (Bajo)</option>
                                <option value="3" ${player.nivel == 3 ? 'selected' : ''}>⭐⭐⭐ (Normal)</option>
                                <option value="4" ${player.nivel == 4 ? 'selected' : ''}>⭐⭐⭐⭐ (Alto)</option>
                                <option value="5" ${player.nivel == 5 ? 'selected' : ''}>⭐⭐⭐⭐⭐ (Top)</option>
                            </select>
                        </div>
                        <div class="col-span-2">
                             <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Notas Técnicas / Scout</label>
                             <textarea name="notas" class="w-full p-4 border rounded-2xl h-32 outline-none focus:ring-2 ring-blue-100" placeholder="Añade comentarios sobre su rendimiento...">${player.notas || ''}</textarea>
                        </div>
                    </fieldset>
                    
                    <div class="flex gap-4 mt-6">
                        <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
                        ${db.userRole === 'ELITE' ? `<button type="submit" class="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">Actualizar Jugador</button>` : ''}
                    </div>
                </form>
            </div>
        `;
        
        lucide.createIcons(); modalOverlay.classList.add('active');
        
        
        document.getElementById('edit-player-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target).entries());
            data.id = parseInt(data.id);
            await db.update('jugadores', data);
            closeModal();
            window.switchView('jugadores');
        });
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


    async function renderAsistencia(container) {
        const reports = await db.getAll('asistencia');
        const teams = await db.getAll('equipos');
        
        container.innerHTML = `
            <div class="space-y-4">
                ${reports.sort((a,b) => b.date.localeCompare(a.date)).map(r => {
                    const team = teams.find(t => t.id == r.equipoid);
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
                                <i data-lucide="chevron-right" class="w-5 h-5 text-slate-400 group-hover:text-blue-600"></i>
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
        let selectedTeamId = existingReport ? existingReport.equipoid : (teams.length > 0 ? teams[0].id : null);
        let selectedDate = existingReport ? existingReport.date : new Date().toISOString().split('T')[0];
        
        attendanceData = existingReport ? existingReport.data : {};

        const updateBoard = () => {
            const teamPlayers = players.filter(j => j.equipoid == selectedTeamId);
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
                const report = { id: existingReport ? existingReport.id : undefined, equipoid: selectedTeamId, date: selectedDate, data: attendanceData };
                if (existingReport) await db.update('asistencia', report);
                else await db.add('asistencia', report);
                window.switchView('asistencia');
            };
            container.querySelector('#team-sel').onchange = (e) => { selectedTeamId = e.target.value; updateBoard(); };
            updateBoard();
        }, 0);
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
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Año de Nacimiento (Categoría)</label>
                                <select id="new-team-year-input" name="categoria" class="w-full p-4 border rounded-2xl bg-white outline-none focus:ring-2 ring-blue-100" required>
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
                        <div class="flex gap-4 mt-6">
                            <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
                            <button type="submit" class="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all mt-4 uppercase tracking-widest">Crear Equipo</button>
                        </div>
                    </form>
                </div>
            `;
            setTimeout(() => {
                const yearInput = document.getElementById('new-team-year-input');
                const listDiv = document.getElementById('new-linked-players-list');
                const update = () => {
                    const year = yearInput.value;
                    const filtered = players.filter(p => !year || p.anionacimiento == year);
                    listDiv.innerHTML = filtered.map(p => `
                        <label class="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-xl cursor-pointer hover:border-blue-200">
                            <input type="checkbox" name="linkedPlayerIds" value="${p.id}" class="w-4 h-4 rounded text-blue-600">
                            <span class="text-[10px] font-bold text-slate-700 truncate">${p.nombre}</span>
                        </label>
                    `).join('') || `<p class="col-span-full p-4 text-center text-xs text-slate-400 italic">Escribe un año para filtrar jugadores.</p>`;
                };
                if (yearInput) yearInput.addEventListener('change', update);
                update();
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
                                <option>Reunión</option><option>Partido</option><option>Scouting</option><option>Fisioterapia</option><option>Otro</option>
                            </select>
                            <input name="hora" type="time" class="w-full p-3 border rounded-xl" required>
                            <input name="fecha" type="date" class="w-full p-3 border rounded-xl" required>
                            <input name="lugar" placeholder="Lugar (Campo, Oficina...)" class="w-full p-3 border rounded-xl">
                            <textarea name="notas" placeholder="Notas adicionales..." class="col-span-2 w-full p-3 border rounded-xl h-24 outline-none focus:ring-2 ring-amber-100"></textarea>
                        </div>

                        <!-- Panel de Compartir -->
                        <div class="space-y-3">
                            <label class="block text-xs font-black text-slate-400 uppercase tracking-widest">Compartir con el Staff</label>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-100 custom-scrollbar">
                                ${users ? users.filter(u => u.id !== currentUser.id).map(u => `
                                    <label class="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-blue-200 transition-all select-none">
                                        <input type="checkbox" name="sharedWith" value="${u.id}" class="w-4 h-4 rounded text-blue-600 focus:ring-blue-100">
                                        <div class="flex-1">
                                            <p class="text-[10px] font-bold text-slate-700">${u.name || u.full_name || u.nombre || 'Sin Nombre'}</p>
                                            <p class="text-[8px] text-slate-400 font-black uppercase tracking-tighter">${u.role}</p>
                                        </div>
                                    </label>
                                `).join('') : '<p class="text-[10px] text-slate-400 italic">No hay otros usuarios registrados.</p>'}
                            </div>
                        </div>

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
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Dorsal</label>
                                <input name="dorsal" type="number" placeholder="nº" class="w-full p-3 border rounded-xl">
                            </div>
                            <div class="col-span-2">
                                 <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Posición Principal</label>
                                 <select name="posicion" class="w-full p-3 border rounded-xl bg-white">
                                    <option>PO</option><option>DBD</option><option>DBZ</option><option>DCD</option><option>DCZ</option>
                                    <option>MBD</option><option>MBZ</option><option>MCD</option><option>MCZ</option><option>MVD</option>
                                    <option>MVZ</option><option>MPD</option><option>MPZ</option><option>ACD</option><option>ACZ</option>
                                </select>
                            </div>
                            <div class="col-span-2">
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Club Convenido</label>
                                <select name="equipoConvenido" class="w-full p-3 border rounded-xl bg-white">
                                    <option value="">Ninguno</option>
                                    <option>CD BAZTAN KE</option><option>BETI GAZTE KJKE</option><option>GURE TXOKOA KKE</option>
                                    <option>CA RIVER EBRO</option><option>CALAHORRA FB</option><option>EF ARNEDO</option>
                                    <option>EFB ALFARO</option><option>UD BALSAS PICARRAL</option>
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
                                <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nivel (1-5)</label>
                                <select name="nivel" class="w-full p-3 border rounded-xl bg-white">
                                    <option value="1">⭐ (Muy Bajo)</option><option value="2">⭐⭐ (Bajo)</option>
                                    <option value="3" selected>⭐⭐⭐ (Normal)</option><option value="4">⭐⭐⭐⭐ (Alto)</option>
                                    <option value="5">⭐⭐⭐⭐⭐ (Top)</option>
                                </select>
                            </div>
                        </div>
                         <div class="flex gap-4 mt-6">
                            <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
                            <button type="submit" class="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg mt-4">Guardar en Directorio</button>
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
                    data.jugadorescount = linkedPlayerIds.length;
                    
                    const id = await db.add('equipos', data);
                    
                    // Update linked players
                    if (linkedPlayerIds.length > 0) {
                        const players = await db.getAll('jugadores');
                        for (const pid of linkedPlayerIds) {
                            const p = players.find(x => x.id == pid);
                            if (p) {
                                p.equipoid = id.toString();
                                await db.update('jugadores', p);
                            }
                        }
                    }
                    
                    closeModal();
                    window.switchView('equipos');
                    return; // Prevent default db.add at bottom
                }
                
                if (viewId === 'sesiones') {
                    const teams = await db.getAll('equipos');
                    const t = teams.find(team => team.id == data.equipoid);
                    data.equiponombre = t ? t.nombre : 'Equipo';
                }

                // Handle sharedWith
                data.sharedWith = formData.getAll('sharedWith');
                const currentUser = (await supabaseClient.auth.getUser()).data.user;
                data.createdBy = currentUser.id;

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
                // Auto-creación definitiva
                const { data: newProfile } = await supabaseClient.from('profiles').insert([
                    { id: user.id, email: user.email, role: 'TECNICO', name: user.user_metadata?.full_name || '' }
                ]).select().maybeSingle();
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
                            <div class="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-blue-500/30 group-hover:rotate-6 transition-all duration-500">
                                ${currentName ? currentName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                            </div>
                            <button class="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl border border-slate-100 shadow-md text-slate-400 hover:text-blue-600 transition-all">
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

        container.querySelector('#profile-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const { error } = await supabaseClient.from('profiles').update({ name: formData.get('full_name') }).eq('id', user.id);
            if (!error) {
                window.customAlert('Éxito', 'Perfil actualizado', 'success');
                window.renderView('perfil');
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
                                            <button onclick="window.editUserAdmin('${u.id}')" class="p-2 text-slate-400 hover:text-blue-600 transition-all"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
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
            { name, email, role }
        ]);

        if (error) {
            window.customAlert('Error', error.message, 'error');
        } else {
            window.customAlert('Éxito', 'Miembro añadido correctamente', 'success');
            closeModal();
            window.switchView('usuarios');
        }
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

    async function renderConvocatorias(container) {
        const { data: convs, error } = await supabaseClient.from('convocatorias').select('*').order('fecha', { ascending: false });
        if (error) {
            container.innerHTML = `<p class="p-10 text-red-500">Error: ${error.message}</p>`;
            return;
        }

        const filtered = convs.filter(c => c.tipo === currentConvocatoriaTab);

        container.innerHTML = `
            <div class="mb-8 overflow-x-auto">
                <div class="flex gap-2 p-1 bg-slate-100 rounded-2xl w-max">
                    ${['Ciclos', 'Sesiones', 'Torneos', 'Zubieta'].map(tab => `
                        <button onclick="window.switchConvocatoriaTab('${tab}')" class="px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${currentConvocatoriaTab === tab.replace('s', '') || (currentConvocatoriaTab === tab) ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
                            ${tab}
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${filtered.map(c => `
                    <div onclick="window.viewConvocatoria(${c.id})" class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all cursor-pointer group relative overflow-hidden">
                        <div class="flex justify-between items-start mb-4">
                            <span class="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">${c.tipo}</span>
                            <span class="text-xs font-bold text-slate-400">${c.fecha}</span>
                        </div>
                        <h4 class="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors uppercase tracking-tight">${c.nombre}</h4>
                        <div class="flex items-center gap-2 text-slate-500">
                             <i data-lucide="users" class="w-4 h-4 text-slate-300"></i>
                             <span class="text-xs font-bold">${Array.isArray(c.playerids) ? c.playerids.length : 0} Jugadores convocados</span>
                        </div>
                        <div class="mt-6 pt-4 border-t border-slate-50 flex justify-end">
                             <button onclick="event.stopPropagation(); window.deleteConvocatoria(${c.id})" class="p-2 text-red-400 hover:text-red-600 transition-all">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                             </button>
                        </div>
                    </div>
                `).join('') || `<div class="col-span-full py-20 text-center text-slate-300 italic">No hay convocatorias de este tipo registradas.</div>`}
            </div>
        `;
        lucide.createIcons();
    }

    window.switchConvocatoriaTab = (tab) => {
        currentConvocatoriaTab = tab;
        renderView('convocatorias');
    };

    window.newConvocatoria = async (forcedTab = null) => {
        const players = await db.getAll('jugadores');
        const teams = await db.getAll('equipos');
        const activeTab = forcedTab || currentConvocatoriaTab;
        
        modalContainer.innerHTML = `
            <div class="p-8">
                <h3 class="text-2xl font-bold text-slate-800 mb-6">Crear Convocatoria: <span class="text-blue-600">${activeTab}</span></h3>
                <form id="new-convocatoria-form" class="space-y-6">
                    <input type="hidden" name="tipo" value="${activeTab}">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="col-span-2">
                             <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Nombre / Evento</label>
                             <input name="nombre" class="w-full p-4 border rounded-2xl text-lg font-bold outline-none focus:ring-2 ring-blue-100" placeholder="Ej: Entrenamiento Lunes" required>
                        </div>
                        <div>
                             <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Equipo</label>
                             <select id="conv-equipo" name="equipoid" class="w-full p-3 border rounded-xl bg-white outline-none" required>
                                 <option value="">Selecciona equipo...</option>
                                 ${teams.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('')}
                             </select>
                        </div>
                        <div>
                             <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Fecha</label>
                             <input name="fecha" type="date" class="w-full p-3 border rounded-xl outline-none" required>
                        </div>
                        <div>
                             <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Hora</label>
                             <input name="hora" type="time" class="w-full p-3 border rounded-xl outline-none" required>
                        </div>
                        <div>
                             <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Lugar</label>
                             <input name="lugar" class="w-full p-3 border rounded-xl outline-none" placeholder="Estadio / Campo">
                        </div>
                    </div>

                    <div id="player-selector-container" class="hidden">
                        <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Jugadores del equipo <span id="selected-team-label" class="text-blue-600"></span></label>
                        <div id="filtered-players-list" class="max-h-64 overflow-y-auto border rounded-2xl p-4 bg-slate-50 space-y-1 custom-scrollbar">
                            <!-- Los jugadores se cargarán aquí -->
                        </div>
                    </div>

                    <div class="flex gap-4 mt-6">
                        <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
                        <button type="submit" class="flex-[2] py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">Generar Convocatoria</button>
                    </div>
                </form>
            </div>
        `;
        modalOverlay.classList.add('active');
        lucide.createIcons();

        const equipoSelect = document.getElementById('conv-equipo');
        const playerContainer = document.getElementById('player-selector-container');
        const playerList = document.getElementById('filtered-players-list');
        const teamLabel = document.getElementById('selected-team-label');

        equipoSelect.onchange = (e) => {
            const teamId = e.target.value;
            if (!teamId) {
                playerContainer.classList.add('hidden');
                return;
            }

            const team = teams.find(t => t.id == teamId);
            teamLabel.textContent = team ? team.nombre : '';
            playerContainer.classList.remove('hidden');
            
            const filteredPlayers = players.filter(p => p.equipoid == teamId);
            
            if (filteredPlayers.length > 0) {
                playerList.innerHTML = filteredPlayers.map(p => `
                    <label class="flex items-center justify-between p-3 hover:bg-white rounded-xl cursor-pointer transition-all border border-transparent hover:border-slate-100 group">
                        <div class="flex items-center gap-3">
                            <input type="checkbox" name="playerids" value="${p.id}" class="w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-600">
                            <span class="text-sm font-bold text-slate-700">${p.nombre}</span>
                        </div>
                        <span class="text-[10px] font-black text-slate-300 uppercase">${p.posicion || '--'} (${p.anionacimiento || '--'})</span>
                    </label>
                `).join('');
            } else {
                playerList.innerHTML = `<p class="text-center py-6 text-slate-400 italic text-xs">No hay jugadores registrados en este equipo.</p>`;
            }
        };

        document.getElementById('new-convocatoria-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            data.playerids = formData.getAll('playerids');
            
            // Guardamos el equipoid para saber de qué equipo es la convocatoria
            const { error } = await supabaseClient.from('convocatorias').insert(data);
            if (error) alert("Error: " + error.message);
            else {
                closeModal();
                renderView('convocatorias');
            }
        };
    };

    window.deleteConvocatoria = async (id) => {
        window.customConfirm('¿Eliminar Convocatoria?', '¿Estás seguro de que quieres borrar este listado?', async () => {
            const { error } = await supabaseClient.from('convocatorias').delete().eq('id', id);
            if (error) alert(error.message);
            else renderView('convocatorias');
        });
    };

    window.viewConvocatoria = async (id) => {
        const { data: conv, error } = await supabaseClient.from('convocatorias').select('*').eq('id', id).single();
        if (error) return;

        const players = await db.getAll('jugadores');
        const teams = await db.getAll('equipos');
        const team = teams.find(t => t.id == conv.equipoid);
        const convocados = players.filter(p => conv.playerids.includes(p.id.toString()));

        modalContainer.innerHTML = `
            <div class="p-8">
                <div class="flex justify-between items-start mb-8">
                    <div>
                        <div class="flex gap-2 mb-2">
                            <span class="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-black uppercase tracking-widest">${conv.tipo}</span>
                            <span class="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[10px] font-black uppercase tracking-widest">${team ? team.nombre : 'Equipo General'}</span>
                        </div>
                        <h3 class="text-3xl font-black text-slate-800 uppercase tracking-tight">${conv.nombre}</h3>
                        <p class="text-slate-500 font-bold">${conv.fecha} • ${conv.hora || '--'} • ${conv.lugar || 'Sin lugar asignado'}</p>
                    </div>
                    <button onclick="closeModal()" class="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"><i data-lucide="x"></i></button>
                </div>

                <div class="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    <div class="grid grid-cols-12 px-4 py-2 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <div class="col-span-1">#</div>
                        <div class="col-span-5">Jugador</div>
                        <div class="col-span-3 text-center">Posición</div>
                        <div class="col-span-3 text-right">Año</div>
                    </div>
                    ${convocados.length > 0 ? convocados.map((p, i) => `
                        <div class="grid grid-cols-12 items-center p-4 bg-white hover:bg-slate-50 border-b border-slate-50 transition-colors">
                            <div class="col-span-1 text-xs font-black text-blue-600">${i+1}</div>
                            <div class="col-span-5 font-bold text-slate-800">${p.nombre}</div>
                            <div class="col-span-3 text-center text-xs font-bold text-slate-500">${p.posicion || '--'}</div>
                            <div class="col-span-3 text-right text-xs font-bold text-slate-500">${p.anionacimiento || '--'}</div>
                        </div>
                    `).join('') : '<p class="text-center py-10 text-slate-400 italic">No hay jugadores en esta convocatoria.</p>'}
                </div>

                <div class="mt-8 flex gap-4">
                     <button onclick="window.exportConvocatoria(${conv.id})" class="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl">
                        <i data-lucide="file-down" class="w-5 h-5 text-blue-400"></i>
                        Descargar PDF
                     </button>
                     <button onclick="closeModal()" class="px-8 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cerrar</button>
                </div>
            </div>
        `;
        modalOverlay.classList.add('active');
        lucide.createIcons();
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
                doc.addImage(team.escudo, 'PNG', 15, 15, 25, 25);
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
        doc.text(`FECHA: ${conv.fecha}   |   HORA: ${conv.hora || '--'}   |   LUGAR: ${conv.lugar || '--'}`, 45, 42);

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
                0: { halign: 'center', cellWidth: 10 },
                2: { halign: 'center' },
                3: { halign: 'center' },
                4: { halign: 'center' }
            },
            margin: { left: 15, right: 15 }
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`Generado por MS Coach - Página ${i} de ${pageCount}`, 150, 285);
        }

        doc.save(`Convocatoria_${conv.nombre}_${conv.fecha}.pdf`);
    };

    let campogramaFilters = {
        sistema: 'F11_433',
        equipos: [],
        posiciones: [],
        niveles: [3, 4, 5],
        years: [],
        clubesConvenidos: []
    };

    const PLAYER_POSITIONS = ['PO', 'DBD', 'DBZ', 'DCD', 'DCZ', 'MBD', 'MBZ', 'MCD', 'MCZ', 'MVD', 'MVZ', 'MPD', 'MPZ', 'ACD', 'ACZ'];

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

    async function renderCampograma(container) {
        const players = await db.getAll('jugadores');
        const teams = await db.getAll('equipos');
        const years = [...new Set(players.map(p => p.anionacimiento).filter(y => y))].sort((a,b) => b-a);
        const clubs = [...new Set(players.map(p => p.equipoConvenido).filter(c => c))].sort();
        
        const filteredPlayers = players.filter(p => {
            const teamMatch = campogramaFilters.equipos.length === 0 || campogramaFilters.equipos.includes(p.equipoid.toString());
            const levelMatch = campogramaFilters.niveles.length === 0 || campogramaFilters.niveles.includes(Number(p.nivel || 3));
            const posMatch = campogramaFilters.posiciones.length === 0 || campogramaFilters.posiciones.includes(p.posicion);
            const yearMatch = campogramaFilters.years.length === 0 || campogramaFilters.years.includes(p.anionacimiento?.toString());
            const clubMatch = campogramaFilters.clubesConvenidos.length === 0 || campogramaFilters.clubesConvenidos.includes(p.equipoConvenido);
            return teamMatch && levelMatch && posMatch && yearMatch && clubMatch;
        });

        const activeFormation = FORMATIONS[campogramaFilters.sistema];

        // Helper to render custom multiselect
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
                    <!-- Sistema (Single Select) -->
                    <div class="space-y-2">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Sistema Táctico</label>
                        <select onchange="window.updateCampogramaFilter('sistema', this.value)" 
                            class="w-full p-4 bg-blue-600 text-white border-none rounded-2xl font-black text-xs uppercase tracking-widest outline-none hover:bg-blue-700 transition-all cursor-pointer appearance-none text-center shadow-lg shadow-blue-600/20">
                            ${Object.entries(FORMATIONS).map(([id, f]) => `<option value="${id}" ${campogramaFilters.sistema === id ? 'selected' : ''}>${f.name}</option>`).join('')}
                        </select>
                    </div>

                    <!-- Filter Options -->
                    ${renderMultiSelect('Equipos', teams.map(t => ({ label: t.nombre, value: t.id })), campogramaFilters.equipos, 'window.toggleCampogramaTeam', 'teams')}
                    ${renderMultiSelect('Posiciones', PLAYER_POSITIONS.map(p => ({ label: p, value: p })), campogramaFilters.posiciones, 'window.toggleCampogramaPos', 'positions')}
                    ${renderMultiSelect('Año Nac.', years.map(y => ({ label: y.toString(), value: y })), campogramaFilters.years, 'window.toggleCampogramaYear', 'years')}
                    ${renderMultiSelect('Club Convenido', clubs.map(c => ({ label: c, value: c })), campogramaFilters.clubesConvenidos, 'window.toggleCampogramaClub', 'clubs')}
                    ${renderMultiSelect('Nivel Pro', [1,2,3,4,5].map(lvl => ({ label: `NIVEL ${lvl}`, value: lvl })), campogramaFilters.niveles, 'window.toggleCampogramaLevel', 'levels')}
                </div>
            </div>

            <div class="max-w-6xl mx-auto">
                <div class="relative w-full aspect-[3/2] bg-[#1a4d2e] rounded-[3.5rem] p-8 shadow-2xl overflow-hidden border-[20px] border-[#133a22] group">
                    <div class="absolute inset-0 pointer-events-none" style="background: repeating-linear-gradient(90deg, #1a4d2e, #1a4d2e 90px, #164328 90px, #164328 180px);"></div>
                    <div class="absolute inset-10 border-[5px] border-white/20 rounded-[2.5rem] pointer-events-none">
                        <!-- Middle Line -->
                        <div class="absolute left-1/2 top-0 bottom-0 w-[5px] bg-white/20"></div>
                        <!-- Center Circle -->
                        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-[5px] border-white/20 rounded-full"></div>
                        
                        <!-- Left Area (Area Grande) -->
                        <div class="absolute left-0 top-1/2 -translate-y-1/2 w-[18%] h-[68%] border-[5px] border-white/20 border-l-0"></div>
                        <!-- Left Goal Box (Area Pequeña) -->
                        <div class="absolute left-0 top-1/2 -translate-y-1/2 w-[6%] h-[32%] border-[5px] border-white/20 border-l-0"></div>
                        <!-- Left D (Semicircle) -->
                        <div class="absolute left-[18%] top-1/2 -translate-y-1/2 w-[8%] h-[30%] border-[5px] border-white/20 border-l-0 rounded-r-full"></div>
                        
                        <!-- Right Area (Area Grande) -->
                        <div class="absolute right-0 top-1/2 -translate-y-1/2 w-[18%] h-[68%] border-[5px] border-white/20 border-r-0"></div>
                        <!-- Right Goal Box (Area Pequeña) -->
                        <div class="absolute right-0 top-1/2 -translate-y-1/2 w-[6%] h-[32%] border-[5px] border-white/20 border-r-0"></div>
                        <!-- Right D (Semicircle) -->
                        <div class="absolute right-[18%] top-1/2 -translate-y-1/2 w-[8%] h-[30%] border-[5px] border-white/20 border-r-0 rounded-l-full"></div>
                    </div>

                    <!-- Position Slots with Impact Sizes -->
                    ${activeFormation.positions.map(p => {
                        const playersInPos = filteredPlayers.filter(player => player.posicion == p.pos).slice(0, 5);
                        return `
                            <div class="absolute flex flex-col items-center" style="left: ${p.x}%; top: ${p.y}%; transform: translate(-50%, -50%);">
                                <div class="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-slate-900/10 mb-4 transform hover:rotate-12 transition-transform cursor-context-menu">
                                    <span class="text-[13px] font-black text-slate-800">${p.pos}</span>
                                </div>
                                <div class="flex flex-col gap-2 w-[140px]">
                                    ${playersInPos.map(player => `
                                        <div onclick="window.viewPlayer(${player.id})" class="bg-slate-900 border border-white/10 px-4 py-3 rounded-2xl cursor-pointer hover:bg-blue-600 hover:scale-105 transition-all shadow-xl group/player">
                                            <p class="text-[10px] font-black text-white text-center uppercase tracking-widest truncate group-hover/player:tracking-normal transition-all">${player.nombre.split(' ')[0]}</p>
                                            <div class="flex justify-center gap-1 mt-1.5 opacity-60 group-hover:opacity-100">
                                                ${Array(Number(player.nivel || 3)).fill(0).map(() => `<span class="w-2 h-2 bg-amber-400 rounded-full"></span>`).join('')}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
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
        lucide.createIcons();
    }

    window.updateCampogramaFilter = (key, value) => {
        campogramaFilters[key] = value;
        renderView('campograma');
    };

    window.updateCampogramaSearch = (val) => {
        campogramaFilters.search = val;
        renderView('campograma');
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

    window.closeModal = () => modalOverlay.classList.remove('active');
    
    // --- SECCIÓN DE TORNEOS ---
    async function renderTorneos(container) {
        const { data: convs, error } = await supabaseClient.from('convocatorias').select('*').eq('tipo', 'Torneo').order('fecha', { ascending: false });
        if (error) {
            container.innerHTML = `<p class="p-10 text-red-500">Error: ${error.message}</p>`;
            return;
        }

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${convs.map(c => `
                    <div onclick="window.viewTorneoRendimiento(${c.id})" class="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-blue-500 transition-all cursor-pointer group relative overflow-hidden">
                        <div class="absolute top-0 right-0 p-4">
                            <i data-lucide="award" class="w-8 h-8 text-blue-100 group-hover:text-blue-500 transition-colors"></i>
                        </div>
                        <div class="flex items-center gap-3 mb-6">
                            <div class="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">${c.nombre.substring(0,1)}</div>
                            <div>
                                <h4 class="text-xl font-black text-slate-800 uppercase tracking-tight">${c.nombre}</h4>
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${c.fecha}</p>
                            </div>
                        </div>
                        <div class="flex items-center justify-between pt-4 border-t border-slate-50">
                            <div class="flex items-center gap-2">
                                <i data-lucide="users" class="w-4 h-4 text-slate-300"></i>
                                <span class="text-xs font-bold text-slate-500">${Array.isArray(c.playerids) ? c.playerids.length : 0} Convocados</span>
                            </div>
                            <span class="text-xs font-black text-blue-600 uppercase tracking-widest">Evaluar Rendimiento →</span>
                        </div>
                    </div>
                `).join('') || `
                    <div class="col-span-full py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
                        <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-200"><i data-lucide="trophy" class="w-10 h-10"></i></div>
                        <p class="text-slate-400 font-bold">No hay torneos registrados todavía.</p>
                        <p class="text-xs text-slate-300 mt-2">Crea un nuevo torneo desde el botón superior.</p>
                    </div>
                `}
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    window.viewTorneoRendimiento = async (id) => {
        try {
            const { data: conv, error } = await supabaseClient.from('convocatorias').select('*').eq('id', id).single();
            if (error) throw error;

            const players = await db.getAll('jugadores');
            const pids = Array.isArray(conv.playerids) ? conv.playerids : [];
            const convocados = players.filter(p => pids.includes(p.id.toString()));
            const rendimiento = conv.rendimiento || {};

        modalContainer.innerHTML = `
            <div class="p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div class="flex justify-between items-center mb-8">
                    <div>
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Rendimiento en Torneo</h3>
                        <p class="text-slate-400 font-bold">${conv.nombre} - ${conv.fecha}</p>
                    </div>
                    <button onclick="closeModal()" class="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-all"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>

                <form id="torneo-rendimiento-form" class="space-y-8">
                    <input type="hidden" name="convocatoriaId" value="${conv.id}">
                    <div class="space-y-4">
                        ${convocados.map(p => {
                            const evalData = rendimiento[p.id] || { score: '', comment: '' };
                            return `
                                <div class="bg-slate-50 p-6 rounded-3xl border border-slate-100 hover:bg-white transition-all group">
                                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                        <div class="flex items-center gap-4">
                                            <div class="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm">${p.posicion || '--'}</div>
                                            <div>
                                                <h5 class="text-lg font-bold text-slate-800">${p.nombre}</h5>
                                                <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">DORSAL: ${p.dorsal || '--'}</p>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nota:</label>
                                            <select name="score_${p.id}" class="bg-white border text-blue-600 font-black p-2 rounded-xl focus:ring-4 ring-blue-100 outline-none w-20 text-center">
                                                <option value="">-</option>
                                                ${Array.from({length: 10}, (_, i) => i + 1).map(n => `<option value="${n}" ${evalData.score == n ? 'selected' : ''}>${n}</option>`).join('')}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Comentarios del Entrenador</label>
                                        <textarea name="comment_${p.id}" rows="2" class="w-full p-4 border border-slate-200 rounded-2xl bg-white text-sm outline-none focus:ring-4 ring-blue-100 transition-all placeholder:italic" placeholder="Escribe aquí tu análisis...">${evalData.comment || ''}</textarea>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <div class="flex gap-4 mt-8 sticky bottom-0 bg-white/80 backdrop-blur-sm p-4 rounded-3xl border border-slate-100 shadow-2xl">
                        <button type="button" onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all">Cancelar</button>
                        <button type="submit" class="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all uppercase tracking-widest">Guardar Evaluaciones</button>
                    </div>
                </form>
            </div>
        `;
        modalOverlay.classList.add('active');
        if (window.lucide) lucide.createIcons();

        document.getElementById('torneo-rendimiento-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const convId = formData.get('convocatoriaId');
            
            const newRendimiento = {};
            convocados.forEach(p => {
                const score = formData.get(`score_${p.id}`);
                const comment = formData.get(`comment_${p.id}`);
                if (score || comment) {
                    newRendimiento[p.id] = { score, comment };
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
                alert("Error guardando rendimiento: " + err.message);
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
                                    <option>Entrenamiento</option>
                                    <option>Partido</option>
                                    <option>Reunión</option>
                                    <option>Otro</option>
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
                                <select name="session_equipoid" class="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none">
                                    <option value="">Selecciona equipo...</option>
                                    ${teams.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('')}
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

        // Player loader for convocatoria
        const teamSel = document.getElementById('conv-master-equipo');
        const pList = document.getElementById('conv-players-list');
        teamSel.onchange = () => {
            const tid = teamSel.value;
            if (!tid) { pList.classList.add('hidden'); return; }
            pList.classList.remove('hidden');
            const filtered = players.filter(p => p.equipoid == tid);
            pList.innerHTML = filtered.map(p => `
                <label class="flex items-center gap-3 p-2 hover:bg-white rounded-xl transition-all">
                    <input type="checkbox" name="conv_playerids" value="${p.id}" class="w-4 h-4 rounded text-blue-600">
                    <span class="text-xs font-bold text-slate-700">${p.nombre}</span>
                </label>
            `).join('') || '<p class="text-[10px] text-slate-400 p-2 italic">Sin jugadores en este equipo</p>';
        }

        document.getElementById('unified-event-form').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const baseData = Object.fromEntries(formData.entries());

            try {
                // 1. Crear Evento
                const evento = {
                    nombre: baseData.nombre,
                    categoria: baseData.categoria,
                    fecha: baseData.fecha,
                    hora: baseData.hora,
                    completada: false
                };
                const { data: evRes, error: evErr } = await supabaseClient.from('eventos').insert(evento).select();
                if (evErr) throw evErr;

                // 2. Crear Sesión si procede
                if (sCheck.checked) {
                    const session = {
                        titulo: baseData.nombre, // Reutilizamos el nombre
                        fecha: baseData.fecha,
                        hora: baseData.hora,
                        equipoid: baseData.session_equipoid,
                        taskids: baseData.session_tasks ? baseData.session_tasks.split(';').map(id => id.trim()) : []
                    };
                    await supabaseClient.from('sesiones').insert(session);
                }

                // 3. Crear Convocatoria si procede
                if (cCheck.checked) {
                    const conv = {
                        nombre: baseData.nombre,
                        fecha: baseData.fecha,
                        hora: baseData.hora,
                        tipo: baseData.conv_tipo,
                        equipoid: baseData.conv_equipoid,
                        playerids: formData.getAll('conv_playerids')
                    };
                    await supabaseClient.from('convocatorias').insert(conv);
                }

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

        const togglePanel = () => {
            notifPanel.classList.toggle('hidden');
            if (!notifPanel.classList.contains('hidden')) {
                notifBadge.classList.add('hidden');
                if (notifBadgeMobile) notifBadgeMobile.classList.add('hidden');
                notifBtn.querySelector('i').classList.remove('animate-ring');
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
                const currentUser = (await supabaseClient.auth.getUser()).data.user;

                const agendaItems = [
                    ...allEventos.map(e => ({ ...e, type: 'evento', color: 'amber', icon: 'alarm-clock' })),
                    ...allSesiones.map(s => ({ ...s, type: 'sesion', color: 'blue', icon: 'calendar', nombre: s.titulo || 'Sesión' }))
                ].filter(item => {
                    const isTodayOrTomorrow = (item.fecha === today || item.fecha === tomorrowStr);
                    const isMineOrShared = (item.createdBy === currentUser.id || (item.sharedWith && item.sharedWith.includes(currentUser.id)));
                    return isTodayOrTomorrow && isMineOrShared && !item.completada;
                })
                 .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora));

                if (agendaItems.length > 0) {
                    notifBadge.classList.remove('hidden');
                    if (notifBadgeMobile) notifBadgeMobile.classList.remove('hidden');
                    if (notifBtn.querySelector('i')) notifBtn.querySelector('i').classList.add('animate-ring');
                    notifCount.textContent = `${agendaItems.length} pendientes`;
                    
                    notifList.innerHTML = agendaItems.map(item => `
                        <div class="flex items-start gap-3 p-3 hover:bg-slate-50 transition-colors rounded-2xl cursor-pointer group" onclick="window.switchView('${item.type === 'sesion' ? 'sesiones' : 'eventos'}')">
                            <div class="w-10 h-10 ${item.color === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'} rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-white">
                                <i data-lucide="${item.icon}" class="w-4 h-4"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex justify-between items-start mb-0.5">
                                    <span class="text-[9px] font-black uppercase tracking-widest ${item.fecha === today ? 'text-red-500' : 'text-slate-400'}">${item.fecha === today ? 'Hoy' : 'Mañana'} · ${item.hora || '--:--'}</span>
                                </div>
                                <h5 class="text-[11px] font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">${item.nombre || 'Sin título'}</h5>
                                <p class="text-[9px] text-slate-500 truncate">${item.lugar || item.equiponombre || 'Campo Principal'}</p>
                            </div>
                        </div>
                    `).join('');
                    if (window.lucide) lucide.createIcons();
                } else {
                    notifList.innerHTML = `
                        <div class="py-12 text-center text-slate-300">
                            <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                <i data-lucide="calendar-check" class="w-8 h-8 opacity-20 text-slate-400"></i>
                            </div>
                            <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Todo al día</p>
                            <p class="text-[9px] lowercase italic mt-1 text-slate-400/60">No hay planes para hoy ni mañana</p>
                        </div>
                    `;
                    notifCount.textContent = '0 nuevas';
                    notifBadge.classList.add('hidden');
                    if (notifBadgeMobile) notifBadgeMobile.classList.add('hidden');
                    if (notifBtn.querySelector('i')) notifBtn.querySelector('i').classList.remove('animate-ring');
                    if (window.lucide) lucide.createIcons();
                }
            } catch (err) {
                console.error("Notif refresh fail:", err);
            }
        };

        if (clearNotifsBtn) {
            clearNotifsBtn.onclick = () => {
                notifBadge.classList.add('hidden');
                if (notifBadgeMobile) notifBadgeMobile.classList.add('hidden');
                if (notifBtn.querySelector('i')) notifBtn.querySelector('i').classList.remove('animate-ring');
                notifPanel.classList.add('hidden');
            };
        }

        // Trigger check at start
        await window.refreshNotifications();
        
        // Refresh every 5 minutes
        setInterval(window.refreshNotifications, 5 * 60 * 1000);
    };

    // === EMAIL NOTIFICATIONS ===
    window.sendEmailNotification = async (type, item) => {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user || !user.email) return;

            const isSession = type === 'sesiones';
            const subject = `⚽ Recordatorio MS Coach: ${item.nombre || item.titulo}`;
            const html = `
                <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
                    <div style="background: #2563eb; padding: 32px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">MS Coach</h1>
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

