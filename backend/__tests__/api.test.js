const request = require('supertest');
const express = require('express');

// Dummy test app to verify test setup
const app = express();
app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

describe('API Health Check', () => {
  it('should return 200 OK for health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('OK');
  });
});
