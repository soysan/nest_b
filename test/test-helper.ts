import { INestApplication } from '@nestjs/common';
import { PrismaClient } from 'src/generated/prisma';
import * as request from 'supertest';

const prisma = new PrismaClient();

/**
 * Clean all data from test database
 * Call this in beforeEach or afterEach in your e2e tests
 */
export async function cleanDatabase() {
  // Delete in correct order to respect foreign key constraints
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * Disconnect Prisma client
 * Call this in afterAll
 */
export async function disconnectDatabase() {
  await prisma.$disconnect();
}

/**
 * Reset database and apply migrations
 * Useful for setting up test database before running tests
 */
export async function resetDatabase() {
  await cleanDatabase();
}

/**
 * Create a user, log them in, and return access token and user data
 */
export async function createAndLoginUser(
  app: INestApplication,
  userData: { email: string; password: string; name?: string },
) {
  // Sign up
  const signUpResponse = await request(app.getHttpServer())
    .post('/auth/signup')
    .send(userData)
    .expect(201);

  // Sign in
  const signInResponse = await request(app.getHttpServer())
    .post('/auth/login')
    .send({
      email: userData.email,
      password: userData.password,
    })
    .expect(200);

  return {
    accessToken: signInResponse.body.access_token,
    user: signUpResponse.body,
  };
}

/**
 * Create a task for testing
 */
export async function createTask(
  app: INestApplication,
  accessToken: string,
  taskData: { title: string; description?: string },
) {
  const response = await request(app.getHttpServer())
    .post('/tasks')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(taskData)
    .expect(201);

  return response.body;
}

export { prisma };
