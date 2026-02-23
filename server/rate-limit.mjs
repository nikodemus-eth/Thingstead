'use strict';

class RateLimiter {
    constructor(limit, interval) {
        this.limit = limit;
        this.interval = interval;
        this.requests = 0;
        this.firstRequestTimestamp = null;
    }

    request() {
        const now = Date.now();

        if (this.firstRequestTimestamp === null) {
            this.firstRequestTimestamp = now;
        }

        if (now - this.firstRequestTimestamp < this.interval) {
            if (this.requests < this.limit) {
                this.requests++;
                return true; // Allow request
            } else {
                return false; // Rate limit exceeded
            }
        } else {
            // Reset for a new interval
            this.firstRequestTimestamp = now;
            this.requests = 1;
            return true; // Allow request
        }
    }
}

// Example usage:
const rateLimiter = new RateLimiter(5, 60000); // 5 requests per minute

// Simulating requests
setInterval(() => {
    if (rateLimiter.request()) {
        console.log('Request allowed');
    } else {
        console.log('Rate limit exceeded');
    }
}, 10000); // Simulate a request every 10 seconds
