import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  cleanDatabase,
  disconnectDatabase,
  createAndLoginUser,
  createTask,
} from './test-helper';

describe('Tasks (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeEach(async () => {
    await cleanDatabase();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // 各テストの前に: ユーザー作成 → ログイン（統合テストのように）
    const result = await createAndLoginUser(app, {
      email: 'taskuser@example.com',
      password: 'Password123!',
      name: 'Task User',
    });
    accessToken = result.accessToken;
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('POST /tasks', () => {
    it('should create a new task', () => {
      const taskData = {
        title: 'My First Task',
        description: 'Task description',
      };

      return request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(taskData)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe(taskData.title);
          expect(res.body.description).toBe(taskData.description);
          expect(res.body).toHaveProperty('userId');
          expect(res.body).toHaveProperty('createdAt');
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer())
        .post('/tasks')
        .send({ title: 'Task' })
        .expect(401);
    });

    it('should return 400 when title is missing', () => {
      return request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ description: 'Only description' })
        .expect(400);
    });
  });

  describe('GET /tasks', () => {
    it('should return tasks in latest order', async () => {
      // 統合テストのように: 複数タスクを作成してから取得
      await createTask(app, accessToken, {
        title: 'First Task',
        description: 'Created first',
      });

      await createTask(app, accessToken, {
        title: 'Second Task',
        description: 'Created second',
      });

      return request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body).toHaveLength(2);
          // 最新順であることを確認
          expect(res.body[0].title).toBe('Second Task');
          expect(res.body[1].title).toBe('First Task');
        });
    });

    it('should return empty array when no tasks exist', () => {
      return request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body).toHaveLength(0);
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).get('/tasks').expect(401);
    });
  });

  describe('GET /tasks/:id', () => {
    it('should return a specific task', async () => {
      // 統合テストのように: タスク作成 → 取得
      const task = await createTask(app, accessToken, {
        title: 'Specific Task',
        description: 'To be retrieved',
      });

      return request(app.getHttpServer())
        .get(`/tasks/${task.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(task.id);
          expect(res.body.title).toBe('Specific Task');
          expect(res.body.description).toBe('To be retrieved');
        });
    });

    it('should return 404 when task does not exist', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      return request(app.getHttpServer())
        .get(`/tasks/${nonExistentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      const task = await createTask(app, accessToken, { title: 'Task' });

      return request(app.getHttpServer()).get(`/tasks/${task.id}`).expect(401);
    });
  });

  describe('PATCH /tasks/:id', () => {
    it('should update task title and status', async () => {
      // 統合テストのように: タスク作成 → 更新
      const task = await createTask(app, accessToken, {
        title: 'Original Title',
        description: 'Original description',
      });

      const updateData = {
        title: 'Updated Title',
        status: 'completed',
      };

      return request(app.getHttpServer())
        .patch(`/tasks/${task.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(task.id);
          expect(res.body.title).toBe('Updated Title');
          expect(res.body.status).toBe('DONE'); // 'completed' は 'DONE' に変換される
          expect(res.body.description).toBe('Original description'); // 変更してない
        });
    });

    it('should return 404 when task does not exist', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      return request(app.getHttpServer())
        .patch(`/tasks/${nonExistentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Updated' })
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      const task = await createTask(app, accessToken, { title: 'Task' });

      return request(app.getHttpServer())
        .patch(`/tasks/${task.id}`)
        .send({ title: 'Updated' })
        .expect(401);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete a task', async () => {
      // 統合テストのように: タスク作成 → 削除 → 確認
      const task = await createTask(app, accessToken, {
        title: 'Task to Delete',
      });

      // 削除
      await request(app.getHttpServer())
        .delete(`/tasks/${task.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // 削除されたことを確認
      await request(app.getHttpServer())
        .get(`/tasks/${task.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 404 when task does not exist', () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      return request(app.getHttpServer())
        .delete(`/tasks/${nonExistentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      const task = await createTask(app, accessToken, { title: 'Task' });

      return request(app.getHttpServer())
        .delete(`/tasks/${task.id}`)
        .expect(401);
    });
  });
});
