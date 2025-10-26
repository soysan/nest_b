import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  cleanDatabase,
  disconnectDatabase,
  createAndLoginUser,
} from './test-helper';

describe('Users (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    await cleanDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('GET /users/me', () => {
    it('should return current user without password', async () => {
      const { accessToken, user } = await createAndLoginUser(app, {
        email: 'user@example.com',
        password: 'Password123!',
        name: 'Test User',
      });

      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email');
          expect(res.body).toHaveProperty('name');
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body).toHaveProperty('updatedAt');
          expect(res.body).not.toHaveProperty('password');
          expect(res.body.email).toBe('user@example.com');
          expect(res.body.name).toBe('Test User');
          expect(res.body.id).toBe(user.id);
        });
    });

    it('should return 401 without authentication token', () => {
      return request(app.getHttpServer()).get('/users/me').expect(401);
    });

    it('should return 401 with invalid token', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });

    it('should return 401 with malformed authorization header', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });
  });

  describe('GET /users', () => {
    it('should return all users', async () => {
      // 複数のユーザーを作成
      await createAndLoginUser(app, {
        email: 'user1@example.com',
        password: 'Password123!',
        name: 'User One',
      });

      await createAndLoginUser(app, {
        email: 'user2@example.com',
        password: 'Password123!',
        name: 'User Two',
      });

      return request(app.getHttpServer())
        .get('/users')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(2);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('email');
          expect(res.body[0]).toHaveProperty('name');
        });
    });

    it('should return empty array when no users exist', () => {
      return request(app.getHttpServer())
        .get('/users')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(0);
        });
    });
  });

  describe('GET /users/:id', () => {
    it('should return a specific user by id', async () => {
      const { user } = await createAndLoginUser(app, {
        email: 'user@example.com',
        password: 'Password123!',
        name: 'Test User',
      });

      return request(app.getHttpServer())
        .get(`/users/${user.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(user.id);
          expect(res.body.email).toBe('user@example.com');
          expect(res.body.name).toBe('Test User');
        });
    });

    it('should return 404 for non-existent user', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      return request(app.getHttpServer())
        .get(`/users/${nonExistentId}`)
        .expect(404);
    });
  });

  describe('PUT /users/:id', () => {
    it('should update user name with authentication', async () => {
      const { accessToken, user } = await createAndLoginUser(app, {
        email: 'user@example.com',
        password: 'Password123!',
        name: 'Original Name',
      });

      return request(app.getHttpServer())
        .put(`/users/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Name' })
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(user.id);
          expect(res.body.name).toBe('Updated Name');
          expect(res.body.email).toBe('user@example.com');
        });
    });

    it('should update user email with authentication', async () => {
      const { accessToken, user } = await createAndLoginUser(app, {
        email: 'old@example.com',
        password: 'Password123!',
        name: 'Test User',
      });

      return request(app.getHttpServer())
        .put(`/users/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'new@example.com' })
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(user.id);
          expect(res.body.email).toBe('new@example.com');
          expect(res.body.name).toBe('Test User');
        });
    });

    it('should update both name and email', async () => {
      const { accessToken, user } = await createAndLoginUser(app, {
        email: 'old@example.com',
        password: 'Password123!',
        name: 'Old Name',
      });

      return request(app.getHttpServer())
        .put(`/users/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'New Name',
          email: 'new@example.com'
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(user.id);
          expect(res.body.name).toBe('New Name');
          expect(res.body.email).toBe('new@example.com');
        });
    });

    it('should return 401 without authentication', async () => {
      const { user } = await createAndLoginUser(app, {
        email: 'user@example.com',
        password: 'Password123!',
        name: 'Test User',
      });

      return request(app.getHttpServer())
        .put(`/users/${user.id}`)
        .send({ name: 'Updated Name' })
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      const { user } = await createAndLoginUser(app, {
        email: 'user@example.com',
        password: 'Password123!',
        name: 'Test User',
      });

      return request(app.getHttpServer())
        .put(`/users/${user.id}`)
        .set('Authorization', 'Bearer invalid_token')
        .send({ name: 'Updated Name' })
        .expect(401);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user with authentication', async () => {
      const { accessToken, user } = await createAndLoginUser(app, {
        email: 'user@example.com',
        password: 'Password123!',
        name: 'Test User',
      });

      await request(app.getHttpServer())
        .delete(`/users/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(user.id);
          expect(res.body.email).toBe('user@example.com');
        });

      // 削除されたことを確認 (404を期待)
      await request(app.getHttpServer())
        .get(`/users/${user.id}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      const { user } = await createAndLoginUser(app, {
        email: 'user@example.com',
        password: 'Password123!',
        name: 'Test User',
      });

      return request(app.getHttpServer())
        .delete(`/users/${user.id}`)
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      const { user } = await createAndLoginUser(app, {
        email: 'user@example.com',
        password: 'Password123!',
        name: 'Test User',
      });

      return request(app.getHttpServer())
        .delete(`/users/${user.id}`)
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });
  });

  describe('POST /users/register', () => {
    it('should create a new user via register endpoint', () => {
      return request(app.getHttpServer())
        .post('/users/register')
        .send({
          email: 'register@example.com',
          password: 'Password123!',
          name: 'Register User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.email).toBe('register@example.com');
          expect(res.body.name).toBe('Register User');
        });
    });

    it('should return 400 when email is missing', () => {
      return request(app.getHttpServer())
        .post('/users/register')
        .send({
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(400);
    });

    it('should return 400 when password is missing', () => {
      return request(app.getHttpServer())
        .post('/users/register')
        .send({
          email: 'test@example.com',
          name: 'Test User',
        })
        .expect(400);
    });

    it('should return 400 when name is missing', () => {
      return request(app.getHttpServer())
        .post('/users/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
        })
        .expect(400);
    });
  });
});
