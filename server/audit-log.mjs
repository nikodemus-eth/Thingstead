// Audit Log Implementation

class AuditLogger {
    constructor() {
        this.logs = [];
    }

    log(action, details) {
        const timestamp = new Date().toISOString();
        this.logs.push({ action, details, timestamp });
        console.log(`[${timestamp}] ${action}:`, details);
    }

    getLogs() {
        return this.logs;
    }
}

// Example Usage
const logger = new AuditLogger();
logger.log('User Login', { user: 'nikodemus-eth', ip: '192.168.1.1' });
logger.log('Data Update', { id: 123, changes: { status: 'active' } });

export default logger;