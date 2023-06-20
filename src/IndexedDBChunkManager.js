/**
 * Fieldfare: Backend framework for distributed networks
 *
 * Copyright 2021-2023 Adan Kvitschal
 * ISC LICENSE
 */

import { ChunkManager, ChunkingUtils } from '@fieldfare/core';
import { IndexedDBBase } from './IndexedDBBase.js';

export class IndexedDBChunkManager extends ChunkManager {

    constructor() {
        super();
        this.completeChunks = new IndexedDBBase('complete-chunks');
        this.incompleteChunks = new IndexedDBBase('incomplete-chunks', 'chunk');
    }

    static init() {
        const newInstance = new IndexedDBChunkManager;
        ChunkManager.addInstance(newInstance);
    }


    async storeChunkContents(base64data) {
        let complete = true;
        let depth = 0;
        let size = base64data.length;
        if(size > 1024) {
            throw Error('Chunk size limit exceeded');
        }
        const childrenIdentifiers = await ChunkingUtils.getChildrenIdentifiers(base64data);
        for(const childIdentifier of childrenIdentifiers) {
            let childChunk;
            try {
                childChunk = await this.completeChunks.get(childIdentifier);
            } catch(error) {
                complete = false;
                break;
            }
            size += childChunk.size;
            depth = Math.max(depth, childChunk.depth+1);
        }
        const identifier = await ChunkingUtils.generateIdentifierForData(base64data);
        if(complete) {
            await this.completeChunks.put(identifier, {base64data, depth, size});
        } else {
            await this.incompleteChunks.put(identifier, base64data);
            depth = undefined;
            size = undefined;
        }
        return {identifier, base64data, complete, depth, size};
    }

    async getChunkContents(identifier) {
        try {
            const completeChunk = await this.completeChunks.get(identifier);
            return {
                base64data: completeChunk.base64data,
                complete: true,
                depth: completeChunk.depth,
                size: completeChunk.size
            }
        } catch(error) {
            if(error.notFound) {
                try {
                    const base64data = await this.incompleteChunks.get(identifier);
                    return {base64data, complete:false};
                } catch(error2) {
                    if(error2.notFound) {
                        //translate to a fieldfare expected error
                        const newError = Error('Chunk not found');
                        newError.name = 'NOT_FOUND_ERROR';
                        throw newError;
                    }
                    throw error2;
                }
            }
            throw error;
        }
	}

};
