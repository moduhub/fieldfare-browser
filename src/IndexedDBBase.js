/**
 * Fieldfare: Backend framework for distributed networks
 *
 * Copyright 2021-2023 Adan Kvitschal
 * ISC LICENSE
 */

import {logger} from '@fieldfare/core';

const dbname = 'fieldfare';
const dbversion = 3;

export class IndexedDBBase {

    constructor(storeName, compatibleName) {
        if(IndexedDBBase.stores === undefined
        || IndexedDBBase.stores === null) {
            logger.debug("IndexedDBBase.stores = new Set();");
            IndexedDBBase.stores = new Set();
        }
        this.storeName = storeName;
        this.compatibleName = compatibleName;
        IndexedDBBase.stores.add({storeName, compatibleName, instance:this});
    }

    connect() {
        return new Promise((resolve, reject) => {
            const request = window.indexedDB.open(dbname, dbversion);
            request.onupgradeneeded = IndexedDBBase.upgrade;
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
            request.onblocked = () => logger.log('warning', 'pending till unblocked');
        });
    }

    static upgrade(event) {
        //indexedDB.deleteDatabase(this.dbname);
        logger.debug("Upgrading DB: " + dbname + ' Version: ' + dbversion);
        var db = event.target.result;
        for(const {storeName, compatibleName, instance} of IndexedDBBase.stores) {
            if(!db.objectStoreNames.contains(storeName)) {
                if(db.objectStoreNames.contains(compatibleName)) {
                    instance.storeName = compatibleName;
                    logger.debug("Using compatible store: \"" + compatibleName + "\" for store \"" + storeName + "\"");
                } else {
                    logger.debug("Creating store: " + storeName);
                    db.createObjectStore(storeName);
                }
            } else {
                logger.debug("Store already exists, keeping current: " + storeName);
            }
        }
    }

    getStore(options) {
        return this.connect()
        .then((db) => {
            try{
    		    const tx = db.transaction(this.storeName, options);
                const store = tx.objectStore(this.storeName);
                return {db, store};
            } catch(error) {
                db.close();
                if(error.name === 'NotFoundError'
                && this.compatibleName
                && this.compatibleName !== this.storeName) {
                    logger.debug("Store " + this.storeName + " not found, retrying with compatible store: " + this.compatibleName);
                    this.storeName = this.compatibleName;
                    return this.getStore(options);
                }
                throw error;
            }
        });
    }

    put(key, entry) {
        return this.getStore('readwrite').then(({db, store}) => {
            return new Promise((resolve, reject) => {
    			const request = store.put(entry, key);
    			request.onsuccess = () => {
                    db.close();
                    resolve(request.result);
                }
    			request.onerror = () => {
                    logger.debug("IndexedDB error storing key: " + key);
                    db.close();
                    reject(request.error);
                }
            });
		});
	}

    get(key) {
        return this.getStore('readonly').then(({db, store}) => {
            return new Promise((resolve, reject) => {
                const request = store.get(key);
                request.onsuccess = () => {
                    db.close();
                    if(request.result) {
                        resolve(request.result);
                    } else {
                        const notFoundError = new Error("Key not found: " + key);
                        notFoundError.name = 'NOT_FOUND';
                        notFoundError.notFound = true;  //this is done to look like node level
                        reject(notFoundError);
                    }
                };
                request.onerror = () => {
                    logger.debug("IndexedDB error getting key: " + key, request.error);
                    db.close();
                    reject(request.error);
                };
            });
        });
    }

}
