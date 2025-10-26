import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { CustomLogger } from '../common/logger/custom-logger.service';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';

describe('TasksService', () => {
  let service: TasksService;
  let prismaService: PrismaService;
  let logger: CustomLogger;

  const mockTask = {
    id: 'task-uuid-1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'TODO' as const,
    userId: 'user-uuid-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    task: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prismaService = module.get<PrismaService>(PrismaService);
    logger = module.get<CustomLogger>(CustomLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAll', () => {
    it('should return all tasks for a user', async () => {
      const tasks = [mockTask, { ...mockTask, id: 'task-uuid-2' }];
      mockPrismaService.task.findMany.mockResolvedValue(tasks);

      const result = await service.getAll('user-uuid-1');

      expect(result).toEqual(tasks);
      expect(prismaService.task.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when user has no tasks', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([]);

      const result = await service.getAll('user-uuid-1');

      expect(result).toEqual([]);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      mockPrismaService.task.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getAll('user-uuid-1')).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.getAll('user-uuid-1')).rejects.toThrow(
        'Failed to get tasks',
      );
    });
  });

  describe('create', () => {
    it('should create a task with title and description', async () => {
      mockPrismaService.task.create.mockResolvedValue(mockTask);

      const result = await service.create(
        'Test Task',
        'Test Description',
        'user-uuid-1',
      );

      expect(result).toEqual(mockTask);
      expect(prismaService.task.create).toHaveBeenCalledWith({
        data: {
          title: 'Test Task',
          description: 'Test Description',
          userId: 'user-uuid-1',
        },
      });
    });

    it('should create a task without description', async () => {
      const taskWithoutDesc = { ...mockTask, description: '' };
      mockPrismaService.task.create.mockResolvedValue(taskWithoutDesc);

      const result = await service.create('Test Task', '', 'user-uuid-1');

      expect(result).toEqual(taskWithoutDesc);
      expect(prismaService.task.create).toHaveBeenCalledWith({
        data: {
          title: 'Test Task',
          description: '',
          userId: 'user-uuid-1',
        },
      });
    });

    it('should throw NotFoundException when user does not exist (P2003)', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: '5.0.0',
        },
      );
      mockPrismaService.task.create.mockRejectedValue(prismaError);

      await expect(
        service.create('Test Task', 'Test Description', 'non-existent-user'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.create('Test Task', 'Test Description', 'non-existent-user'),
      ).rejects.toThrow('User not found');
    });

    it('should throw InternalServerErrorException on other database errors', async () => {
      mockPrismaService.task.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.create('Test Task', 'Test Description', 'user-uuid-1'),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.create('Test Task', 'Test Description', 'user-uuid-1'),
      ).rejects.toThrow('Failed to create task');
    });
  });

  describe('getTaskById', () => {
    it('should return a task when found and user owns it', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

      const result = await service.getTaskById('task-uuid-1', 'user-uuid-1');

      expect(result).toEqual(mockTask);
      expect(prismaService.task.findUnique).toHaveBeenCalledWith({
        where: { id: 'task-uuid-1' },
      });
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(
        service.getTaskById('non-existent-id', 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getTaskById('non-existent-id', 'user-uuid-1'),
      ).rejects.toThrow('Task not found');
    });

    it('should throw NotFoundException when user does not own the task', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

      await expect(
        service.getTaskById('task-uuid-1', 'different-user-id'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getTaskById('task-uuid-1', 'different-user-id'),
      ).rejects.toThrow('Task not found');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on database error', async () => {
      mockPrismaService.task.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.getTaskById('task-uuid-1', 'user-uuid-1'),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.getTaskById('task-uuid-1', 'user-uuid-1'),
      ).rejects.toThrow('Failed to get task');
    });
  });

  describe('update', () => {
    beforeEach(() => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
    });

    it('should update task title', async () => {
      const updatedTask = { ...mockTask, title: 'Updated Title' };
      mockPrismaService.task.update.mockResolvedValue(updatedTask);

      const result = await service.update(
        'task-uuid-1',
        'Updated Title',
        'user-uuid-1',
      );

      expect(result.title).toBe('Updated Title');
      expect(prismaService.task.update).toHaveBeenCalledWith({
        where: { id: 'task-uuid-1' },
        data: { title: 'Updated Title' },
      });
    });

    it('should update task status with uppercase conversion', async () => {
      const updatedTask = { ...mockTask, status: 'IN_PROGRESS' as const };
      mockPrismaService.task.update.mockResolvedValue(updatedTask);

      const result = await service.update(
        'task-uuid-1',
        undefined,
        'user-uuid-1',
        'in_progress',
      );

      expect(prismaService.task.update).toHaveBeenCalledWith({
        where: { id: 'task-uuid-1' },
        data: { status: 'IN_PROGRESS' },
      });
    });

    it('should handle "completed" status as alias for "DONE"', async () => {
      const updatedTask = { ...mockTask, status: 'DONE' as const };
      mockPrismaService.task.update.mockResolvedValue(updatedTask);

      await service.update('task-uuid-1', undefined, 'user-uuid-1', 'completed');

      expect(prismaService.task.update).toHaveBeenCalledWith({
        where: { id: 'task-uuid-1' },
        data: { status: 'DONE' },
      });
    });

    it('should update both title and status', async () => {
      const updatedTask = {
        ...mockTask,
        title: 'Updated Title',
        status: 'DONE' as const,
      };
      mockPrismaService.task.update.mockResolvedValue(updatedTask);

      await service.update('task-uuid-1', 'Updated Title', 'user-uuid-1', 'done');

      expect(prismaService.task.update).toHaveBeenCalledWith({
        where: { id: 'task-uuid-1' },
        data: {
          title: 'Updated Title',
          status: 'DONE',
        },
      });
    });

    it('should ignore invalid status values', async () => {
      mockPrismaService.task.update.mockResolvedValue(mockTask);

      await service.update(
        'task-uuid-1',
        'Updated Title',
        'user-uuid-1',
        'invalid_status',
      );

      expect(prismaService.task.update).toHaveBeenCalledWith({
        where: { id: 'task-uuid-1' },
        data: { title: 'Updated Title' },
      });
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(
        service.update('non-existent-id', 'Title', 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user does not own the task', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

      await expect(
        service.update('task-uuid-1', 'Title', 'different-user-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException on P2025 error', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
        },
      );
      mockPrismaService.task.update.mockRejectedValue(prismaError);

      await expect(
        service.update('task-uuid-1', 'Title', 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on other database errors', async () => {
      mockPrismaService.task.update.mockRejectedValue(new Error('Database error'));

      await expect(
        service.update('task-uuid-1', 'Title', 'user-uuid-1'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
    });

    it('should delete a task when user owns it', async () => {
      mockPrismaService.task.delete.mockResolvedValue(mockTask);

      const result = await service.delete('task-uuid-1', 'user-uuid-1');

      expect(result).toEqual(mockTask);
      expect(prismaService.task.delete).toHaveBeenCalledWith({
        where: { id: 'task-uuid-1' },
      });
    });

    it('should throw NotFoundException when task does not exist', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(null);

      await expect(
        service.delete('non-existent-id', 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user does not own the task', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

      await expect(
        service.delete('task-uuid-1', 'different-user-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException on P2025 error', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '5.0.0',
        },
      );
      mockPrismaService.task.delete.mockRejectedValue(prismaError);

      await expect(
        service.delete('task-uuid-1', 'user-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on other database errors', async () => {
      mockPrismaService.task.delete.mockRejectedValue(new Error('Database error'));

      await expect(
        service.delete('task-uuid-1', 'user-uuid-1'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
