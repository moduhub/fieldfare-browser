/**
 * Fieldfare: Backend framework for distributed networks
 *
 * Copyright 2021-2023 Adan Kvitschal
 * ISC LICENSE
 */

import {
	LocalHost, VolatileChunkManager, cryptoManager, logger,
	Collection, ChunkList, ChunkSet, ChunkMap
} from '@fieldfare/core';

import { BrowserCryptoManager } from './BrowserCryptoManager.js';
import { IndexedDBChunkManager } from './IndexedDBChunkManager.js';
import { IndexedDBNVD } from './IndexedDBNVD.js';
import { WebClientTransceiver } from './WebClientTransceiver.js';

export {
	IndexedDBChunkManager,
	IndexedDBNVD,
	WebClientTransceiver,
	BrowserCryptoManager,
};

function setupBasicCollectionTypes() {
    Collection.registerType('list', ChunkList);
    Collection.registerType('set', ChunkSet);
    Collection.registerType('map', ChunkMap);
}

export async function init() {
	logger.debug(">> System initHost =========");
	IndexedDBNVD.init();
	VolatileChunkManager.init();
	IndexedDBChunkManager.init();
	BrowserCryptoManager.init();
	setupBasicCollectionTypes();
	const localKeypair = await cryptoManager.getLocalKeypair();
	await LocalHost.init(localKeypair);
	LocalHost.assignWebportTransceiver('ws', new WebClientTransceiver);
	logger.debug('LocalHost ID: ' + LocalHost.getID());
}

export function terminate() {
    LocalHost.terminate();
}
