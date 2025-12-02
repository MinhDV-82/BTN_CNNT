const amqp = require('amqplib');

let connection = null;
let channel = null;

async function connectRabbitMQ() {
    try {
        // ✅ Đảm bảo có username:password
        const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
        
        console.log('🔄 Đang kết nối RabbitMQ...');
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        
        console.log('✅ RabbitMQ connected successfully');
        
        connection.on('error', (err) => {
            console.error('❌ RabbitMQ connection error:', err);
        });
        
        connection.on('close', () => {
            console.log('⚠️ RabbitMQ connection closed');
        });
        
        return channel;
    } catch (error) {
        console.error('❌ Failed to connect to RabbitMQ:', error.message);
        throw error;
    }
}

async function getChannel() {
    if (!channel) {
        throw new Error('RabbitMQ channel not initialized. Call connectRabbitMQ() first.');
    }
    return channel;
}

async function closeRabbitMQ() {
    try {
        if (channel) await channel.close();
        if (connection) await connection.close();
        console.log('✅ RabbitMQ closed successfully');
    } catch (error) {
        console.error('❌ Error closing RabbitMQ:', error);
    }
}

module.exports = {
    connectRabbitMQ,
    getChannel,
    closeRabbitMQ
};