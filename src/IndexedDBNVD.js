/**
 * Fieldfare: Backend framework for distributed networks
 *
 * Copyright 2021-2023 Adan Kvitschal
 * ISC LICENSE
 */

import {NVD, logger} from '@fieldfare/core';
import {IndexedDBBase} from './IndexedDBBase.js';

export class IndexedDBNVD {

    constructor() {
         this.db = new IndexedDBBase('nvdata');
    }

    static init() {
        NVD.singleton(new IndexedDBNVD);
    }

    async save(key, object) {
        logger.debug('IndexedDB NVD saving key: ' + key + ' object: ' + JSON.stringify(object));
        await this.db.put(key, object);
    }

    async load(key) {
        try {
            const object = await this.db.get(key);
            return object;
        } catch (error) {
            return undefined;
        }
    }

};
