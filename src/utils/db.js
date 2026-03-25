/**
 * Opens IndexedDB and ensures object store exists.
 */
export const openDB = (dbName, storeName, keyPath = 'key', version = 1) => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version)
    request.onerror = () => reject(new Error(`Failed to open IndexedDB: ${dbName}`))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath })
      }
    }
  })
}

/**
 * Saves data to IndexedDB.
 */
export const saveData = (db, storeName, data) => {
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([storeName], 'readwrite')
      const request = transaction.objectStore(storeName).put(data)
      request.onerror = () => reject(new Error(`Failed to save to ${storeName}`))
      request.onsuccess = () => resolve(request.result)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Loads data from IndexedDB.
 */
export const loadData = (db, storeName, key) => {
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([storeName], 'readonly')
      const request = transaction.objectStore(storeName).get(key)
      request.onerror = () => reject(new Error(`Failed to load from ${storeName}`))
      request.onsuccess = () => resolve(request.result)
    } catch (error) {
      reject(error)
    }
  })
}
