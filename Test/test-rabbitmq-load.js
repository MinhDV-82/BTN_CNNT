const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Các level test
const TEST_CONFIGS = {
    light: { requests: 100, name: 'Light Load (100 requests)' },
    medium: { requests: 500, name: 'Medium Load (500 requests)' },
    heavy: { requests: 1000, name: 'Heavy Load (1000 requests)' },
    extreme: { requests: 5000, name: 'Extreme Load (5000 requests)' }
};

// ✅ Hàm kiểm tra queue đã rỗng chưa
async function waitForQueueEmpty(maxWaitTime = 120000) {
    console.log(`\n⏳ Đợi RabbitMQ xử lý hết queue...`);
    const startTime = Date.now();
    const checkInterval = 1000; // Kiểm tra mỗi 1 giây
    let elapsedTime = 0;
    
    while (elapsedTime < maxWaitTime) {
        try {
            const response = await axios.get(`${BASE_URL}/api/queue/status`);
            const { messageCount, isEmpty } = response.data.queue;
            
            const seconds = (elapsedTime / 1000).toFixed(1);
            process.stdout.write(`\r⏳ Queue: ${messageCount} messages còn lại - Thời gian: ${seconds}s`);
            
            // Nếu queue đã rỗng
            if (isEmpty) {
                console.log(' ✅');
                return (Date.now() - startTime) / 1000; // Trả về thời gian thực tế
            }
            
        } catch (error) {
            console.error(`\n⚠️  Lỗi kiểm tra queue: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        elapsedTime += checkInterval;
    }
    
    console.log(`\n⚠️  Queue chưa rỗng sau ${maxWaitTime/1000}s`);
    return (Date.now() - startTime) / 1000;
}

// Function test chính
async function testRabbitMQ(numRequests, testName) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔥 ${testName}`);
    console.log(`${'='.repeat(60)}\n`);
    
    const startTime = Date.now();
    const results = {
        success: 0,
        failed: 0,
        orders: [],
        errors: []
    };
    
    // Tạo danh sách promises
    const promises = Array.from({ length: numRequests }, (_, i) => 
        axios.post(`${BASE_URL}/api/orders`, {
            customerName: `Customer ${i}`,
            customerEmail: `customer${i}@test.com`,
            items: [
                { 
                    name: 'Product A', 
                    price: Math.floor(Math.random() * 1000) + 100, 
                    quantity: Math.floor(Math.random() * 5) + 1 
                },
                { 
                    name: 'Product B', 
                    price: Math.floor(Math.random() * 500) + 50, 
                    quantity: Math.floor(Math.random() * 3) + 1 
                }
            ]
        })
        .then(response => {
            results.success++;
            results.orders.push(response.data.orderId);
            
            if (results.success % 100 === 0) {
                console.log(`⏳ Đã gửi: ${results.success}/${numRequests}`);
            }
        })
        .catch(error => {
            results.failed++;
            results.errors.push(error.message);
        })
    );
    
    await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // In kết quả gửi
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 KẾT QUẢ GỬI REQUESTS');
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ Thành công:     ${results.success}/${numRequests} (${((results.success/numRequests)*100).toFixed(2)}%)`);
    console.log(`❌ Thất bại:       ${results.failed}/${numRequests} (${((results.failed/numRequests)*100).toFixed(2)}%)`);
    console.log(`⏱️  Thời gian gửi: ${duration.toFixed(2)}s`);
    console.log(`🚀 Throughput:     ${(numRequests / duration).toFixed(2)} requests/s`);
    
    // ✅ Đợi queue rỗng - Kiểm tra thực tế
    const processingDuration = await waitForQueueEmpty(120000);
    
    // Chờ thêm 2 giây để đảm bảo consumer lưu xong vào Redis
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Kiểm tra đơn hàng mẫu
    console.log(`\n${'='.repeat(60)}`);
    console.log('🔍 KIỂM TRA ĐỘ HOÀN THÀNH');
    console.log(`${'='.repeat(60)}`);
    
    const sampleSize = Math.min(20, results.orders.length);
    const sampleOrders = [];
    for (let i = 0; i < sampleSize; i++) {
        const randomIndex = Math.floor(Math.random() * results.orders.length);
        sampleOrders.push(results.orders[randomIndex]);
    }
    
    let processedCount = 0;
    let pendingCount = 0;
    
    for (const orderId of sampleOrders) {
        try {
            const response = await axios.get(`${BASE_URL}/api/orders/${orderId}`);
            if (response.data.order.status === 'completed') {
                processedCount++;
            } else {
                pendingCount++;
            }
        } catch (error) {
            pendingCount++;
        }
    }
    
    console.log(`✅ Đã xử lý:  ${processedCount}/${sampleSize} (${((processedCount/sampleSize)*100).toFixed(2)}%)`);
    console.log(`⏳ Đang xử lý: ${pendingCount}/${sampleSize} (${((pendingCount/sampleSize)*100).toFixed(2)}%)`);
    console.log(`⏱️  Thời gian xử lý thực tế: ${processingDuration.toFixed(2)}s`);
    
    // Tổng kết
    const totalTime = duration + processingDuration;
    console.log(`\n${'='.repeat(60)}`);
    console.log('📈 TỔNG KẾT');
    console.log(`${'='.repeat(60)}`);
    console.log(`⏱️  Tổng thời gian:      ${totalTime.toFixed(2)}s`);
    console.log(`🚀 Thời gian gửi:       ${duration.toFixed(2)}s`);
    console.log(`⚙️  Thời gian xử lý:     ${processingDuration.toFixed(2)}s`);
    console.log(`📊 Throughput gửi:      ${(numRequests / duration).toFixed(2)} req/s`);
    console.log(`📊 Throughput tổng:     ${(numRequests / totalTime).toFixed(2)} req/s`);
    console.log(`💾 Đơn hàng không mất:  ${results.failed === 0 ? '✅ Có' : '❌ Không'}`);
    console.log(`✅ Tỷ lệ hoàn thành:    ${((processedCount/sampleSize)*100).toFixed(2)}%`);
    
    if (results.errors.length > 0) {
        console.log(`\n⚠️  ERRORS (hiển thị 5 đầu tiên):`);
        results.errors.slice(0, 5).forEach((err, i) => {
            console.log(`   ${i + 1}. ${err}`);
        });
    }
    
    return {
        testName,
        numRequests,
        success: results.success,
        failed: results.failed,
        sendDuration: duration,
        processingDuration,
        totalDuration: totalTime,
        throughputSend: numRequests / duration,
        throughputTotal: numRequests / totalTime,
        processedRate: (processedCount / sampleSize) * 100,
        noDataLoss: results.failed === 0
    };
}

// Function chạy tất cả tests
async function runAllTests() {
    console.log('\n🧪 BẮT ĐẦU TEST RABBITMQ\n');
    
    const allResults = [];
    
    for (const [key, config] of Object.entries(TEST_CONFIGS)) {
        const result = await testRabbitMQ(config.requests, config.name);
        allResults.push(result);
        
        if (key !== 'extreme') {
            console.log('\n⏸️  Nghỉ 5 giây trước test tiếp theo...\n');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    // So sánh
    console.log(`\n${'='.repeat(70)}`);
    console.log('📊 SO SÁNH CÁC TEST');
    console.log(`${'='.repeat(70)}`);
    console.log('Test'.padEnd(35) + 'Requests'.padEnd(12) + 'Success'.padEnd(12) + 'Throughput');
    console.log('-'.repeat(70));
    
    allResults.forEach(result => {
        const successRate = ((result.success / result.numRequests) * 100).toFixed(2);
        console.log(
            result.testName.padEnd(35) +
            result.numRequests.toString().padEnd(12) +
            `${successRate}%`.padEnd(12) +
            `${result.throughputTotal.toFixed(2)} req/s`
        );
    });
    
    console.log(`\n✅ Hoàn thành tất cả tests!\n`);
}

// Kiểm tra server
async function checkServer() {
    try {
        await axios.get(`${BASE_URL}/health`);
        console.log('✅ Server đang chạy tại:', BASE_URL);
        return true;
    } catch (error) {
        console.error('❌ Không thể kết nối tới server:', BASE_URL);
        console.error('💡 Hãy chạy: node src/server.js');
        return false;
    }
}

// Main
async function main() {
    console.log('\n🚀 RABBITMQ LOAD TEST\n');
    
    const serverReady = await checkServer();
    if (!serverReady) {
        process.exit(1);
    }
    
    const args = process.argv.slice(2);
    const testLevel = args[0];
    
    if (testLevel && TEST_CONFIGS[testLevel]) {
        const config = TEST_CONFIGS[testLevel];
        await testRabbitMQ(config.requests, config.name);
    } else if (testLevel === 'all') {
        await runAllTests();
    } else {
        console.log('\n📝 Sử dụng: node test-rabbitmq-accurate.js [level]');
        console.log('\nCác level có sẵn:');
        console.log('  light   - 100 requests');
        console.log('  medium  - 500 requests');
        console.log('  heavy   - 1000 requests');
        console.log('  extreme - 5000 requests');
        console.log('  all     - Chạy tất cả các test\n');
    }
}

main().catch(console.error);