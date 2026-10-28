import request from 'supertest';
import app from '../src/server.js';
import mongoose from 'mongoose';

describe('HealthVerse Auth & RBAC API Endpoints', () => {
  let doctorCookie = '';
  let patientCookie = '';
  let patientId = '';

  beforeAll(async () => {
    // Wait for db connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/healthverse');
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('POST /api/v1/auth/login: Doctor login returns token and profile', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: '9800000002',
        password: 'password123'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('doctor');
    expect(res.body.token).toBeDefined();

    // Capture cookie
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    doctorCookie = cookies.map(c => c.split(';')[0]).join('; ');
  });

  test('POST /api/v1/auth/login: Patient login returns token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: '9800000011',
        password: 'password123'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('patient');

    const cookies = res.headers['set-cookie'];
    patientCookie = cookies.map(c => c.split(';')[0]).join('; ');
    patientId = res.body.profile._id;
  });

  test('GET /api/v1/patients: Doctor can list hospital patients', async () => {
    const res = await request(app)
      .get('/api/v1/patients')
      .set('Cookie', doctorCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test('GET /api/v1/alerts: Doctor can access clinician alert inbox', async () => {
    const res = await request(app)
      .get('/api/v1/alerts')
      .set('Cookie', doctorCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.counts).toBeDefined();
  });

  test('RBAC Boundary: Patient cannot access clinician alert inbox (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/alerts')
      .set('Cookie', patientCookie);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('RBAC Boundary: Unauthenticated request rejected (401 Unauthorized)', async () => {
    const res = await request(app).get('/api/v1/patients');
    expect(res.status).toBe(401);
  });
});
