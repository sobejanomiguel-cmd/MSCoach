const DB_NAME = 'MSCoachDB';
const DB_VERSION = 7;

class CoachDB {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Tareas Store
                if (!db.objectStoreNames.contains('tareas')) {
                    db.createObjectStore('tareas', { keyPath: 'id', autoIncrement: true });
                }

                // Sesiones Store
                if (!db.objectStoreNames.contains('sesiones')) {
                    db.createObjectStore('sesiones', { keyPath: 'id', autoIncrement: true });
                }

                // Equipos Store
                if (!db.objectStoreNames.contains('equipos')) {
                    db.createObjectStore('equipos', { keyPath: 'id', autoIncrement: true });
                }

                // Jugadores Store
                if (!db.objectStoreNames.contains('jugadores')) {
                    db.createObjectStore('jugadores', { keyPath: 'id', autoIncrement: true });
                }

                // Asistencia Store
                if (!db.objectStoreNames.contains('asistencia')) {
                    db.createObjectStore('asistencia', { keyPath: 'id', autoIncrement: true });
                }

                // Eventos Store
                if (!db.objectStoreNames.contains('eventos')) {
                    db.createObjectStore('eventos', { keyPath: 'id', autoIncrement: true });
                }
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

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
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
