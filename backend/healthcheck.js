/**
 * Health check script for Docker containers
 * Used by Docker healthcheck to verify container health
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.METRICS_PORT || 9090,
  path: '/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const health = JSON.parse(data);
      
      if (health.status === 'healthy' || health.status === 'degraded') {
        console.log('Health check passed:', health.status);
        process.exit(0);
      } else {
        console.log('Health check failed:', health.status);
        process.exit(1);
      }
    } catch (error) {
      console.error('Failed to parse health response:', error);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('Health check request failed:', error);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('Health check timed out');
  req.destroy();
  process.exit(1);
});

req.end();