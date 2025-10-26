import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { cleanDatabase, disconnectDatabase } from './test-helper';

describe('Auth (e2e)', () => {
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

  describe('POST /auth/signup', () => {
    const signupUrl = '/auth/signup';
    const validUser = {
      email: 'test@example.com',
      password: 'Password123!',
      name: 'Test User',
    };

    it('should create a new user with valid data', () => {
      return request(app.getHttpServer())
        .post(signupUrl)
        .send(validUser)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.email).toBe(validUser.email);
          expect(res.body.name).toBe(validUser.name);
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should return 400 when email is missing', () => {
      return request(app.getHttpServer())
        .post(signupUrl)
        .send({ password: 'Password123!', name: 'Test' })
        .expect(400);
    });

    it('should return 400 when email format is invalid', () => {
      return request(app.getHttpServer())
        .post(signupUrl)
        .send({ ...validUser, email: 'invalid-email' })
        .expect(400);
    });

    it('should return 400 when password is missing', () => {
      return request(app.getHttpServer())
        .post(signupUrl)
        .send({ email: 'test@example.com', name: 'Test' })
        .expect(400);
    });

    it('should return 409 when email already exists', async () => {
      // 最初のユーザーを作成
      await request(app.getHttpServer())
        .post(signupUrl)
        .send(validUser)
        .expect(201);

      // 同じメールで再度作成を試みる
      return request(app.getHttpServer())
        .post(signupUrl)
        .send(validUser)
        .expect(409);
    });
  });

  describe('POST /auth/login', () => {
    const loginUrl = '/auth/login';
    const credentials = {
      email: 'login@example.com',
      password: 'Password123!',
    };

    beforeEach(async () => {
      // テスト用ユーザーを事前作成
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({ ...credentials, name: 'Login User' });
    });

    it('should return access token with valid credentials', () => {
      return request(app.getHttpServer())
        .post(loginUrl)
        .send(credentials)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(typeof res.body.access_token).toBe('string');
          expect(res.body.access_token.length).toBeGreaterThan(0);
        });
    });

    it('should return 401 with invalid email', () => {
      return request(app.getHttpServer())
        .post(loginUrl)
        .send({ email: 'wrong@example.com', password: credentials.password })
        .expect(401);
    });

    it('should return 401 with wrong password', () => {
      return request(app.getHttpServer())
        .post(loginUrl)
        .send({ email: credentials.email, password: 'WrongPassword' })
        .expect(401);
    });

    it('should return 400 when email is missing', () => {
      return request(app.getHttpServer())
        .post(loginUrl)
        .send({ password: credentials.password })
        .expect(400);
    });

    it('should return 400 when password is missing', () => {
      return request(app.getHttpServer())
        .post(loginUrl)
        .send({ email: credentials.email })
        .expect(400);
    });
  });
});
