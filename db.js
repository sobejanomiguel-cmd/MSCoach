const DB_NAME = 'MSCoachDB';
const DB_VERSION = 9; // Incrementado por cambios de esquema

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
        this.cache = {};
        this.lastSync = {};
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const stores = ['tareas', 'sesiones', 'equipos', 'jugadores', 'asistencia', 'eventos', 'convocatorias', 'clubes'];
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
        if (!this.db) await this.init();
        
        const now = Date.now();
        const shouldSync = !this.lastSync[storeName] || (now - this.lastSync[storeName] > 300000); // 5 min throttle

        if (shouldSync && supabaseClient) {
            this.lastSync[storeName] = now;
            (async () => {
                try {
                    const { data, error } = await supabaseClient.from(storeName).select('*').order('id', { ascending: false });
                    if (!error && data) {
                        const changed = await this.syncLocal(storeName, data);
                        if (changed) this.cache[storeName] = data;
                    }
                } catch (err) {
                    console.warn(`Background sync failed for ${storeName}`);
                }
            })();
        }

        // Return from cache if available
        if (this.cache[storeName] && this.cache[storeName].length > 0) {
            return this.cache[storeName];
        }

        const localData = await new Promise((resolve) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve([]);
        });

        this.cache[storeName] = localData;
        return localData;
    }

    async syncLocal(storeName, remoteData) {
        if (!this.db || !remoteData) return false;

        const localData = await new Promise((resolve) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve([]);
        });

        const localMap = new Map(localData.map(item => [item.id, item]));
        const remoteIds = new Set(remoteData.map(item => item.id));
        
        let hasChanges = false;
        const toDelete = localData.filter(item => !remoteIds.has(item.id));
        const toPut = remoteData.filter(remoteItem => {
            const localItem = localMap.get(remoteItem.id);
            if (!localItem) return true;
            // Check for actual changes to avoid redundant writes
            const merged = { ...localItem, ...remoteItem };
            return JSON.stringify(localItem) !== JSON.stringify(merged);
        });

        if (toDelete.length === 0 && toPut.length === 0) return false;

        const tx = this.db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);

        // 1. Eliminar locales que ya no existen en remoto
        // Solo eliminamos si el ID parece ser un ID de Supabase (pequeño) 
        // y no está en el remoto. Los IDs grandes (Date.now()) son locales pendientes de sync.
        toDelete.forEach(item => {
            if (item.id < 1000000000000) { 
                store.delete(item.id);
            }
        });
        toPut.forEach(remoteItem => {
            const localItem = localMap.get(remoteItem.id);
            store.put(localItem ? { ...localItem, ...remoteItem } : remoteItem);
        });

        return new Promise((resolve) => {
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    }

    async add(storeName, data) {
        if (!this.db) await this.init();
        if (supabaseClient) {
            try {
                // Sanitize data for Supabase: convert empty strings to null
                const toInsert = {};
                Object.keys(data).forEach(key => {
                    if (key !== 'id') {
                        toInsert[key] = data[key] === "" ? null : data[key];
                    }
                });

                const { data: remote, error } = await supabaseClient.from(storeName).insert([toInsert]).select();
                
                if (error) {
                    console.error(`Supabase insert error in ${storeName}:`, error);
                    // Si la tabla no existe, permitimos el guardado local pero avisamos
                    if (error.code === '42P01' || error.message.includes('cache')) {
                        console.warn(`Tabla '${storeName}' no encontrada en Supabase. Guardando solo en local.`);
                    } else {
                        window.customAlert('Error de Sincronización', `Supabase ha rechazado los datos: ${error.message}. Revisa si el RLS está desactivado.`);
                        throw error;
                    }
                }

                if (remote && remote.length > 0) {
                    const saved = remote[0];
                    await this.saveLocal(storeName, saved);
                    return saved;
                } else {
                    console.warn(`Supabase insert succeeded but returned no data for ${storeName}. RLS might be blocking the select.`);
                }
            } catch (err) {
                if (err.code === '42P01' || err.message.includes('cache')) {
                    // Fallback to local only
                } else {
                    console.error("Cloud save failed:", err);
                    throw err;
                }
            }
        }
        return this.saveLocal(storeName, data);
    }

    async saveLocal(storeName, data) {
        delete this.cache[storeName]; // Invalidate cache on change
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(data);
            tx.oncomplete = () => resolve(data);
            tx.onerror = (e) => {
                console.error(`Local save failed (${storeName}):`, e);
                reject(e.target.error);
            };
        });
    }

    async update(storeName, data) {
        if (!this.db) await this.init();
        const id = Number(data.id);
        
        if (supabaseClient && id) {
            // Sanitize data for Supabase: convert empty strings to null
            const toUpdate = {};
            Object.keys(data).forEach(key => {
                if (key !== 'id') {
                    toUpdate[key] = data[key] === "" ? null : data[key];
                }
            });

            const { error } = await supabaseClient
                .from(storeName)
                .update(toUpdate)
                .eq('id', id);

            if (error) {
                console.error(`Supabase update error (${storeName}):`, error);
                if (error.code !== '42P01' && !error.message.includes('cache')) {
                    throw error;
                }
            }
        }
        
        // Merge with existing local data to avoid wiping fields during partial update
        const existing = await this.get(storeName, id);
        if (!existing) throw new Error(`Record with id ${id} not found in ${storeName}`);
        
        const merged = { ...existing, ...data, id: id }; // Ensure ID remains a number
        return this.saveLocal(storeName, merged);
    }

    async delete(storeName, id) {
        if (!this.db) await this.init();
        if (supabaseClient) {
            try {
                const { error } = await supabaseClient
                    .from(storeName)
                    .delete()
                    .eq('id', Number(id));
                
                if (error) {
                    console.error(`Supabase delete error (${storeName}):`, error);
                    if (error.code !== '42P01' && !error.message.includes('cache')) {
                        throw error;
                    }
                }
            } catch (err) {
                if (err.code !== '42P01' && !err.message.includes('cache')) {
                    console.error("Cloud delete failed:", err);
                    throw err;
                }
            }
        }
        delete this.cache[storeName]; // Invalidate cache on change
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
        if (!this.db) await this.init();
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
