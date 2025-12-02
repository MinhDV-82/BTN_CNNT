
const orders = new Map();

async function processOrder(orderData) {

    await new Promise(resolve => setTimeout(resolve, 200)); // Giả lập xử lý 200ms
    
    // Tính tổng tiền
    const total = orderData.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
    }, 0);
    
    const processedOrder = {
        ...orderData,
        total,
        status: 'completed',
        processedAt: new Date().toISOString()
    };
    

    orders.set(orderData.orderId, processedOrder);
    
    setTimeout(() => {
        orders.delete(orderData.orderId);
        console.log(`Đã xóa đơn hàng hết hạn: ${orderData.orderId}`);
    }, 3600000);
    
    return processedOrder;
}

async function getOrder(orderId) {
    const orderData = orders.get(orderId);
    return orderData || null;
}


function getAllOrders() {
    return Array.from(orders.values());
}

function deleteOrder(orderId) {
    return orders.delete(orderId);
}

module.exports = {
    processOrder,
    getOrder,
    getAllOrders,
    deleteOrder
};