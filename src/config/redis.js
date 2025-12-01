const redis = require('redis');

let client = null;

async function connectRedis() {
    try {
        const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
        
        client = redis.createClient({
            url: REDIS_URL
        });
        
        client.on('error', (err) => {
            console.error('❌ Redis error:', err);
        });
        
        client.on('connect', () => {
            console.log('✅ Redis connected successfully');
        });
        
        await client.connect();
        
        return client;
    } catch (error) {
        console.error('❌ Failed to connect to Redis:', error);
        throw error;
    }
}

function getRedisClient() {
    if (!client) {
        throw new Error('Redis client not initialized. Call connectRedis() first.');
    }
    return client;
}

async function closeRedis() {
    try {
        if (client) {
            await client.quit();
            console.log('✅ Redis closed successfully');
        }
    } catch (error) {
        console.error('❌ Error closing Redis:', error);
    }
}

module.exports = {
    connectRedis,
    getRedisClient,
    closeRedis
};