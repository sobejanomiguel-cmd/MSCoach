const DB_NAME = 'MSCoachDB';
const DB_VERSION = 8; // Incrementado por cambios de esquema

// Supabase Configuration
const SUPABASE_URL = 'https://hopencygilaeevvvxkvu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvcGVuY3lnaWxhZWV2dnZ4a3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMDI3NDIsImV4cCI6MjA5MTU3ODc0Mn0.ccOeebsqB7bmAskFUBfYg4hruzAmdmod7F8--8GEGAY';
let supabaseClient = null;

try {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
} catch (err) {
    console.error("Supabase failed to initialize:", err);
}

class CoachDB {
    constructor() {
        this.db = null;
        this.userRole = 'TECNICO'; 
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const stores = ['tareas', 'sesiones', 'equipos', 'jugadores', 'asistencia', 'eventos', 'convocatorias'];
                stores.forEach(store => {
                    if (!db.objectStoreNames.contains(store)) {
                        db.createObjectStore(store, { keyPath: 'id', autoIncrement: true });
                    }
                });
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => reject(event.target.error);
        });
    }

    async getUser() {
        if (!supabaseClient) return null;
        const { data: { user } } = await supabaseClient.auth.getUser();
        return user;
    }

    async syncRole() {
        const user = await this.getUser();
        if (user) {
            const { data, error } = await supabaseClient.from('profiles').select('role').eq('id', user.id).single();
            if (data) {
                this.userRole = data.role;
            }
        }
    }
    async get(storeName, id) {
        if (!this.db) {
            await this.init();
        }
        return new Promise((resolve) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(Number(id));
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });
    }


    async getAll(storeName) {
        // Ejecutamos la sincronización en segundo plano sin esperar a que termine para no bloquear la UI
        const syncPromise = (async () => {
            if (supabaseClient) {
                try {
                    const { data, error } = await supabaseClient.from(storeName).select('*').order('id', { ascending: false });
                    if (!error && data) {
                        await this.syncLocal(storeName, data);
                        return data;
                    }
                } catch (err) {
                    console.warn(`Background sync failed for ${storeName}`);
                }
            }
            return null;
        })();

        // Devolvemos IMMEDIATAMENTE lo que tengamos en Local para una carga instantánea
        const localData = await new Promise((resolve) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve([]);
        });

        // Si no hay datos locales (primera vez), entonces sí esperamos a la nube
        if (localData.length === 0 && supabaseClient) {
            const cloudData = await syncPromise;
            return cloudData || [];
        }

        return localData;
    }

    async syncLocal(storeName, remoteData) {
        if (!this.db) return;
        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.clear();
        if (remoteData && remoteData.length > 0) {
            remoteData.forEach(item => store.put(item));
        }
    }

    async add(storeName, data) {
        if (supabaseClient) {
            try {
                const { id, ...toInsert } = data;
                const { data: remote, error } = await supabaseClient.from(storeName).insert([toInsert]).select();
                
                if (error) {
                    console.error("Error en Supabase:", error);
                    window.customAlert('Error de Sincronización', `Supabase ha rechazado los datos: ${error.message}. Revisa si el RLS está desactivado.`);
                    throw error;
                }

                if (remote && remote.length > 0) {
                    const saved = remote[0];
                    await this.saveLocal(storeName, saved);
                    return saved;
                }
            } catch (err) {
                console.error("Cloud save failed:", err);
                // No guardamos en local si falló la nube para evitar inconsistencias graves
                throw err;
            }
        }
        return this.saveLocal(storeName, data);
    }

    async saveLocal(storeName, data) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(data);
            request.onsuccess = () => resolve(data);
            request.onerror = (e) => {
                console.error(`Local save failed (${storeName}):`, e);
                reject(e.target.error);
            };
        });
    }

    async update(storeName, data) {
        if (supabaseClient && data.id) {
            const { id, ...toUpdate } = data;
            const { error } = await supabaseClient
                .from(storeName)
                .update(toUpdate)
                .eq('id', Number(id));

            if (error) {
                console.error(`Supabase update error (${storeName}):`, error);
                throw error;
            }
        }
        
        // Merge with existing local data to avoid wiping fields during partial update
        const existing = await this.get(storeName, data.id);
        const merged = { ...existing, ...data };
        return this.saveLocal(storeName, merged);
    }

    async delete(storeName, id) {
        if (supabaseClient) {
            try {
                const { error } = await supabaseClient
                    .from(storeName)
                    .delete()
                    .eq('id', Number(id));
                
                if (error) {
                    console.error(`Supabase delete error (${storeName}):`, error);
                    throw error;
                }
            } catch (err) {
                console.error("Cloud delete failed:", err);
                throw err;
            }
        }
        return new Promise((resolve) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const request = tx.objectStore(storeName).delete(Number(id));
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => {
                console.error("Local delete failed:", e);
                resolve();
            };
        });
    }

    async uploadFile(file, bucket = 'tareas', path = 'documents') {
        if (!supabaseClient) return null;
        try {
            const fileExt = file.name.includes('.') ? file.name.split('.').pop() : '';
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}${fileExt ? '.' + fileExt : ''}`;
            const filePath = `${path}/${fileName}`;

            const { data, error } = await supabaseClient.storage
                .from(bucket)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error("Supabase Storage Error:", error);
                throw error;
            }

            const { data: { publicUrl } } = supabaseClient.storage
                .from(bucket)
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (err) {
            console.error("Error subiendo archivo a Storage:", err);
            throw err; // Re-throw to handle it in the UI
        }
    }

    async uploadImage(file) {
        return this.uploadFile(file, 'tareas', 'tasks');
    }

    async deleteAll(storeName) {
        if (supabaseClient) {
            try {
                const { error } = await supabaseClient.from(storeName).delete().neq('id', 0);
                if (error) throw error;
            } catch (err) {
                console.error("Cloud bulk delete failed:", err);
                throw err;
            }
        }
        return new Promise((resolve) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).clear();
            tx.oncomplete = () => resolve();
        });
    }
}

const db = new CoachDB();
