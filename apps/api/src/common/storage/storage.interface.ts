export interface StorageProvider {
  /**
   * Store an object. Overwrites if the key already exists.
   */
  put(key: string, data: Buffer | string, contentType?: string): Promise<void>;

  /**
   * Retrieve the raw bytes of a stored object.
   * Throws if the object does not exist.
   */
  get(key: string): Promise<Buffer>;

  /**
   * Retrieve the UTF-8 text content of a stored object.
   * Throws if the object does not exist.
   */
  getText(key: string): Promise<string>;

  /**
   * Check whether an object exists.
   */
  exists(key: string): Promise<boolean>;

  /**
   * Delete an object. Silently succeeds if the object does not exist.
   */
  delete(key: string): Promise<void>;

  /**
   * Delete all objects whose keys share the given prefix.
   * Used to remove all assets for a credential or document-proof directory.
   */
  deletePrefix(prefix: string): Promise<void>;
}
