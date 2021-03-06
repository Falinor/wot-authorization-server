import request from 'supertest';

import routes, { User } from '.';
import express from '../../services/express';
import { signSync } from '../../services/jwt';
import config from '../../config';

const app = () => express(routes);

let user1;
let user2;
let admin;
let session1;
let session2;
let adminSession;

beforeEach(async () => {
  user1 = await User.create({
    name: 'user',
    email: 'a@a.com',
    password: '12345678',
  });
  user2 = await User.create({
    name: 'user',
    email: 'b@b.com',
    password: '12345678',
  });
  admin = await User.create({
    email: 'c@c.com',
    password: '12345678',
    role: 'admin',
  });
  session1 = signSync(user1.id);
  session2 = signSync(user2.id);
  adminSession = signSync(admin.id);
});

test('GET /users 200 (admin)', async () => {
  const { status, body } = await request(app())
    .get('/')
    .query({ access_token: adminSession });

  expect(status).toBe(200);
  expect(Array.isArray(body)).toBe(true);
});

test('GET /users?page=2&limit=1 200 (admin)', async () => {
  const { status, body } = await request(app())
    .get('/')
    .query({ access_token: adminSession, page: 2, limit: 1 });

  expect(status).toBe(200);
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBe(1);
});

test('GET /users?q=user 200 (admin)', async () => {
  const { status, body } = await request(app())
    .get('/')
    .query({ access_token: adminSession, q: 'user' });

  expect(status).toBe(200);
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBe(2);
});

test('GET /users?fields=name 200 (admin)', async () => {
  const { status, body } = await request(app())
    .get('/')
    .query({ access_token: adminSession, fields: 'name' });
  expect(status).toBe(200);
  expect(Array.isArray(body)).toBe(true);
  expect(Object.keys(body[0])).toEqual(['id', 'name']);
});

test('GET /users 401 (user)', async () => {
  const { status } = await request(app())
    .get('/')
    .query({ access_token: session1 });

  expect(status).toBe(401);
});

test('GET /users 401', async () => {
  const { status } = await request(app())
    .get('/');

  expect(status).toBe(401);
});

test('GET /users/me 200 (user)', async () => {
  const { status, body } = await request(app())
    .get('/me')
    .query({ access_token: session1 });

  expect(status).toBe(200);
  expect(typeof body).toBe('object');
  expect(body.id).toBe(user1.id);
});

test('GET /users/me 401', async () => {
  const { status } = await request(app())
    .get('/me');

  expect(status).toBe(401);
});

test('GET /users/:id 200', async () => {
  const { status, body } = await request(app())
    .get(`/${user1.id}`);

  expect(status).toBe(200);
  expect(typeof body).toBe('object');
  expect(body.id).toBe(user1.id);
});

test('GET /users/:id 404', async () => {
  const { status } = await request(app())
    .get('/123456789098765432123456');

  expect(status).toBe(404);
});

test('POST /users 201 (master)', async () => {
  const { status, body } = await request(app())
    .post('/')
    .send({
      access_token: config.masterKey,
      email: 'd@d.com',
      password: '12345678',
    });

  expect(status).toBe(201);
  expect(typeof body).toBe('object');
  expect(body.email).toBe('d@d.com');
});

test('POST /users 201 (master)', async () => {
  const { status, body } = await request(app())
    .post('/')
    .send({
      access_token: config.masterKey,
      email: 'd@d.com',
      password: '12345678',
      role: 'user',
    });

  expect(status).toBe(201);
  expect(typeof body).toBe('object');
  expect(body.email).toBe('d@d.com');
});

test('POST /users 201 (master)', async () => {
  const { status, body } = await request(app())
    .post('/')
    .send({
      access_token: config.masterKey,
      email: 'd@d.com',
      password: '12345678',
      role: 'admin',
    });

  expect(status).toBe(201);
  expect(typeof body).toBe('object');
  expect(body.email).toBe('d@d.com');
});

test('POST /users 409 (master) - duplicated email', async () => {
  const { status, body } = await request(app())
    .post('/')
    .send({
      access_token: config.masterKey,
      email: 'a@a.com',
      password: '12345678',
    });

  expect(status).toBe(409);
  expect(typeof body).toBe('object');
  expect(body.param).toBe('email');
});

test('POST /users 400 (master) - invalid email', async () => {
  const { status, body } = await request(app())
    .post('/')
    .send({
      access_token: config.masterKey,
      email: 'invalid',
      password: '12345678',
    });

  expect(status).toBe(400);
  expect(typeof body).toBe('object');
  expect(body.errors.email).toBeDefined();
  expect(body.errors.email.kind).toBe('regexp');
});

test('POST /users 400 (master) - missing email', async () => {
  const { status, body } = await request(app())
    .post('/')
    .send({ access_token: config.masterKey, password: '12345678' });

  expect(status).toBe(400);
  expect(typeof body).toBe('object');
  expect(body.param).toBe('email');
});

test('POST /users 400 (master) - invalid password', async () => {
  const { status, body } = await request(app())
    .post('/')
    .send({
      access_token: config.masterKey,
      email: 'd@d.com',
      password: '123',
    });

  expect(status).toBe(400);
  expect(typeof body).toBe('object');
  expect(typeof body.errors).toBe('object');
  expect(typeof body.errors.password).toBe('object');
  expect(body.errors.password.kind).toBe('minlength');
});

test('POST /users 400 (master) - missing password', async () => {
  const { status, body } = await request(app())
    .post('/')
    .send({ access_token: config.masterKey, email: 'd@d.com' });

  expect(status).toBe(400);
  expect(typeof body).toBe('object');
  expect(body.param).toBe('password');
});

test('POST /users 400 (master) - invalid role', async () => {
  const { status, body } = await request(app())
    .post('/')
    .send({
      access_token: config.masterKey,
      email: 'd@d.com',
      password: '12345678',
      role: 'invalid',
    });

  expect(status).toBe(400);
  expect(typeof body).toBe('object');
  expect(body.param).toBe('role');
});

test('POST /users 401 (admin)', async () => {
  const { status } = await request(app())
    .post('/')
    .send({
      access_token: adminSession,
      email: 'd@d.com',
      password: '12345678',
    });

  expect(status).toBe(401);
});

test('POST /users 401 (user)', async () => {
  const { status } = await request(app())
    .post('/')
    .send({ access_token: session1, email: 'd@d.com', password: '12345678' });

  expect(status).toBe(401);
});

test('POST /users 401', async () => {
  const { status } = await request(app())
    .post('/')
    .send({ email: 'd@d.com', password: '12345678' });

  expect(status).toBe(401);
});

test('PATCH /users/me 200 (user)', async () => {
  const { status, body } = await request(app())
    .patch('/me')
    .send({ access_token: session1, name: 'test' });

  expect(status).toBe(200);
  expect(typeof body).toBe('object');
  expect(body.name).toBe('test');
});

test('PATCH /users/me 200 (user)', async () => {
  const { status, body } = await request(app())
    .patch('/me')
    .send({ access_token: session1, email: 'test@test.com' });

  expect(status).toBe(200);
  expect(typeof body).toBe('object');
  expect(body.email).toBe('a@a.com');
});

test('PATCH /users/me 401', async () => {
  const { status } = await request(app())
    .patch('/me')
    .send({ name: 'test' });

  expect(status).toBe(401);
});

test('PATCH /users/:id 200 (user)', async () => {
  const { status, body } = await request(app())
    .patch(`/${user1.id}`)
    .send({ access_token: session1, name: 'test' });

  expect(status).toBe(200);
  expect(typeof body).toBe('object');
  expect(body.name).toBe('test');
});

test('PATCH /users/:id 200 (user)', async () => {
  const { status, body } = await request(app())
    .patch(`/${user1.id}`)
    .send({ access_token: session1, email: 'test@test.com' });

  expect(status).toBe(200);
  expect(typeof body).toBe('object');
  expect(body.email).toBe('a@a.com');
});

test('PATCH /users/:id 200 (admin)', async () => {
  const { status, body } = await request(app())
    .patch(`/${user1.id}`)
    .send({ access_token: adminSession, name: 'test' });

  expect(status).toBe(200);
  expect(typeof body).toBe('object');
  expect(body.name).toBe('test');
});

test('PATCH /users/:id 401 (user) - another user', async () => {
  const { status } = await request(app())
    .patch(`/${user1.id}`)
    .send({ access_token: session2, name: 'test' });

  expect(status).toBe(401);
});

test('PATCH /users/:id 401', async () => {
  const { status } = await request(app())
    .patch(`/${user1.id}`)
    .send({ name: 'test' });

  expect(status).toBe(401);
});

test('PATCH /users/:id 404 (admin)', async () => {
  const { status } = await request(app())
    .patch('/123456789098765432123456')
    .send({ access_token: adminSession, name: 'test' });

  expect(status).toBe(404);
});

const passwordMatch = async (password, userId) => {
  const user = await User.findById(userId);
  return !!await user.authenticate(password);
};

test('PATCH /users/me/password 200 (user)', async () => {
  const { status, body } = await request(app())
    .patch('/me/password')
    .auth('a@a.com', '12345678')
    .send({ password: '87654321' });

  expect(status).toBe(200);
  expect(typeof body).toBe('object');
  expect(body.email).toBe('a@a.com');
  expect(await passwordMatch('87654321', body.id)).toBe(true);
});

test('PATCH /users/me/password 400 (user) - invalid password', async () => {
  const { status, body } = await request(app())
    .patch('/me/password')
    .auth('a@a.com', '12345678')
    .send({ password: '321' });

  expect(status).toBe(400);
  expect(typeof body).toBe('object');
  expect(typeof body.errors).toBe('object');
  expect(typeof body.errors.password).toBe('object');
  expect(body.name).toBe('ValidationError');
  expect(body.errors.password.kind).toBe('minlength');
});

test('PATCH /users/me/password 401 (user) - invalid authentication method', async () => {
  const { status } = await request(app())
    .patch('/me/password')
    .send({ access_token: session1, password: '87654321' });

  expect(status).toBe(401);
});

test('PATCH /users/me/password 401', async () => {
  const { status } = await request(app())
    .patch('/me/password')
    .send({ password: '87654321' });

  expect(status).toBe(401);
});

test('PATCH /users/:id/password 200 (user)', async () => {
  const { status, body } = await request(app())
    .patch(`/${user1.id}/password`)
    .auth('a@a.com', '12345678')
    .send({ password: '87654321' });

  expect(status).toBe(200);
  expect(typeof body).toBe('object');
  expect(body.email).toBe('a@a.com');
  expect(await passwordMatch('87654321', body.id)).toBe(true);
});

test('PATCH /users/:id/password 400 (user) - invalid password', async () => {
  const { status, body } = await request(app())
    .patch(`/${user1.id}/password`)
    .auth('a@a.com', '12345678')
    .send({ password: '321' });

  expect(status).toBe(400);
  expect(typeof body).toBe('object');
  expect(typeof body.errors).toBe('object');
  expect(typeof body.errors.password).toBe('object');
  expect(body.name).toBe('ValidationError');
  expect(body.errors.password.kind).toBe('minlength');
});

test('PATCH /users/:id/password 401 (user) - another user', async () => {
  const { status } = await request(app())
    .patch(`/${user1.id}/password`)
    .auth('b@b.com', '12345678')
    .send({ password: '87654321' });

  expect(status).toBe(401);
});

test('PATCH /users/:id/password 401 (user) - invalid authentication method', async () => {
  const { status } = await request(app())
    .patch(`/${user1.id}/password`)
    .send({ access_token: session1, password: '87654321' });

  expect(status).toBe(401);
});

test('PATCH /users/:id/password 401', async () => {
  const { status } = await request(app())
    .patch(`/${user1.id}/password`)
    .send({ password: '87654321' });

  expect(status).toBe(401);
});

test('PATCH /users/:id/password 404 (user)', async () => {
  const { status } = await request(app())
    .patch('/123456789098765432123456/password')
    .auth('a@a.com', '12345678')
    .send({ password: '87654321' });

  expect(status).toBe(404);
});

test('DELETE /users/:id 204 (admin)', async () => {
  const { status } = await request(app())
    .delete(`/${user1.id}`)
    .send({ access_token: adminSession });

  expect(status).toBe(204);
});

test('DELETE /users/:id 401 (user)', async () => {
  const { status } = await request(app())
    .delete(`/${user1.id}`)
    .send({ access_token: session1 });

  expect(status).toBe(401);
});

test('DELETE /users/:id 401', async () => {
  const { status } = await request(app())
    .delete(`/${user1.id}`);

  expect(status).toBe(401);
});

test('DELETE /users/:id 404 (admin)', async () => {
  const { status } = await request(app())
    .delete('/123456789098765432123456')
    .send({ access_token: adminSession });

  expect(status).toBe(404);
});
