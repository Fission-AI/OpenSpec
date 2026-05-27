import {
  createCollectionRegistry,
  mountCollections,
  type CollectionRegistry,
  type MountedCollection,
} from '../runtime.js';
import { INITIATIVE_COLLECTION_ID } from './schema.js';

export function createInitiativesCollectionRegistry(): CollectionRegistry {
  return createCollectionRegistry([
    {
      id: INITIATIVE_COLLECTION_ID,
      mount: INITIATIVE_COLLECTION_ID,
    },
  ]);
}

export function mountInitiativesCollection(storeRoot: string): MountedCollection {
  return mountCollections({
    storeRoot,
    collections: createInitiativesCollectionRegistry(),
  }).require(INITIATIVE_COLLECTION_ID);
}
