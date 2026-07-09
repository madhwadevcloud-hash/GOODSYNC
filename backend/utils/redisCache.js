const { createClient } = require('redis');

class RedisCache {
  constructor(options = {}) {
    this.stdTTL = options.stdTTL || 300;
    this.checkperiod = options.checkperiod || 60;
    this.memoryStore = new Map();
    this.client = null;
    this.connectPromise = null;
    this.connected = false;
    this.failed = false;
    this.warned = false;
  }

  _getRedisUrl() {
    if (process.env.REDIS_URL || process.env.REDIS_URI) {
      return process.env.REDIS_URL || process.env.REDIS_URI;
    }

    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = process.env.REDIS_PORT || '6379';
    const password = process.env.REDIS_PASSWORD;

    if (password) {
      return `redis://:${password}@${host}:${port}`;
    }

    return `redis://${host}:${port}`;
  }

  async _ensureClient() {
    if (this.connected && this.client) {
      return this.client;
    }

    if (this.failed) {
      return null;
    }

    if (!this.connectPromise) {
      this.connectPromise = this._connect();
    }

    try {
      return await this.connectPromise;
    } catch (error) {
      this.failed = true;
      this.connectPromise = null;
      return null;
    }
  }

  async _connect() {
    if (this.client) {
      return this.client;
    }

    const client = createClient({ url: this._getRedisUrl() });
    client.on('error', (error) => {
      if (!this.warned) {
        console.warn('[REDIS CACHE] Redis unavailable, falling back to memory cache:', error.message);
        this.warned = true;
      }
      this.connected = false;
    });

    await client.connect();
    this.client = client;
    this.connected = true;
    return client;
  }

  async get(key) {
    if (this.memoryStore.has(key)) {
      return this.memoryStore.get(key);
    }

    const client = await this._ensureClient();
    if (!client) {
      return undefined;
    }

    try {
      const value = await client.get(key);
      if (value === null || value === undefined) {
        return undefined;
      }

      const parsed = this._parseValue(value);
      this.memoryStore.set(key, parsed);
      return parsed;
    } catch (error) {
      return undefined;
    }
  }

  set(key, value, ttlSeconds = this.stdTTL) {
    this.memoryStore.set(key, value);

    this._ensureClient()
      .then((client) => {
        if (!client) {
          return;
        }

        const payload = JSON.stringify(value);
        return client.set(key, payload, { EX: ttlSeconds });
      })
      .catch((error) => {
        console.warn(`[REDIS CACHE] Failed to SET key "${key}":`, error.message);
      });

    return true;
  }

  del(key) {
    this.memoryStore.delete(key);

    this._ensureClient()
      .then((client) => {
        if (!client) {
          return;
        }

        return client.del(key);
      })
      .catch((error) => {
        console.warn(`[REDIS CACHE] Failed to DEL key "${key}":`, error.message);
      });

    return true;
  }

  flushAll() {
    this.memoryStore.clear();

    this._ensureClient()
      .then((client) => {
        if (!client) {
          return;
        }

        return client.flushAll();
      })
      .catch((error) => {
        console.warn('[REDIS CACHE] Failed to FLUSHALL:', error.message);
      });
  }

  _parseValue(value) {
    if (typeof value !== 'string') {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  }
}

function createRedisCache(options = {}) {
  return new RedisCache(options);
}

module.exports = createRedisCache;
module.exports.createRedisCache = createRedisCache;