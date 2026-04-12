const DB_NAME = 'MSCoachDB';
const DB_VERSION = 7;

// Supabase Configuration
const SUPABASE_URL = 'https://hopencygilaeevvvxkvu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_uNge3ORs5F-ijF7o7nzczQ_vnKI5P0c';
let supabase = null;

try {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
} catch (err) {
    console.error("Supabase failed to initialize:", err);
}

class CoachDB {
    constructor() {
        this.db = null;
        this.userRole = 'TECNICO'; // Default
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                const stores = ['tareas', 'sesiones', 'equipos', 'jugadores', 'asistencia', 'eventos'];
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
            request.onblocked = () => {
                if (window.customAlert) window.customAlert('Base de datos bloqueada', 'Por favor, cierra otras pestañas de MS Coach.');
                else alert('Base de datos bloqueada: cierra otras pestañas de MS Coach.');
                reject('blocked');
            };
        });
    }

    // Auth Methods
    async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await this.syncRole();
        return data;
    }

    async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        return data;
    }

    async logout() {
        await supabase.auth.signOut();
        this.userRole = 'TECNICO';
        window.location.reload();
    }

    async getUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    }

    async syncRole() {
        const user = await this.getUser();
        if (user) {
            const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (data) {
                this.userRole = data.role;
                console.log("Current User Role:", this.userRole);
            }
        }
    }

    // Generic method to handle Supabase + IndexedDB Sync
    async getAll(storeName) {
        // Try Supabase first
        if (supabase) {
            try {
                const { data, error } = await supabase.from(storeName).select('*');
                if (!error && data) {
                    // Update local cache
                    await this.syncLocal(storeName, data);
                    return data;
                }
            } catch (err) {
                console.warn(`Supabase fetch failed for ${storeName}, falling back to IndexedDB:`, err);
            }
        }

        // Fallback to IndexedDB
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async syncLocal(storeName, remoteData) {
        const transaction = this.db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.clear();
        remoteData.forEach(item => {
            store.put(item);
        });
    }

    async add(storeName, data) {
        let savedData = data;
        
        // Try Supabase
        if (supabase) {
            try {
                // Ensure id is not sent if it's new
                const { id, ...dataToSync } = data;
                const { data: remoteData, error } = await supabase.from(storeName).insert([dataToSync]).select();
                if (!error && remoteData) {
                    savedData = remoteData[0];
                }
            } catch (err) {
                console.error(`Supabase insert error for ${storeName}:`, err);
            }
        }

        // Always save to IndexedDB as well
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(savedData); // use put so it updates if already has ID from supabase
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async update(storeName, data) {
        // Try Supabase
        if (supabase && data.id) {
            try {
                await supabase.from(storeName).update(data).eq('id', data.id);
            } catch (err) {
                console.error(`Supabase update error for ${storeName}:`, err);
            }
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        // Try Supabase
        if (supabase) {
            try {
                await supabase.from(storeName).delete().eq('id', id);
            } catch (err) {
                console.error(`Supabase delete error for ${storeName}:`, err);
            }
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

const db = new CoachDB();

