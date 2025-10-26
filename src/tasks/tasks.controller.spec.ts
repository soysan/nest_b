import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

describe('TasksController', () => {
  let controller: TasksController;
  let service: TasksService;

  const mockTask = {
    id: 'task-uuid-1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'TODO' as const,
    userId: 'user-uuid-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTasksService = {
    getAll: jest.fn(),
    getTaskById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    service = module.get<TasksService>(TasksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('tasks', () => {
    it('should return all tasks for a user', async () => {
      const req = { user: { sub: 'user-uuid-1' } };
      const tasks = [
        mockTask,
        {
          ...mockTask,
          id: 'task-uuid-2',
          title: 'Second Task',
        },
      ];
      mockTasksService.getAll.mockResolvedValue(tasks);

      const result = await controller.tasks(req);

      expect(result).toEqual(tasks);
      expect(service.getAll).toHaveBeenCalledWith('user-uuid-1');
      expect(service.getAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when user has no tasks', async () => {
      const req = { user: { sub: 'user-uuid-1' } };
      mockTasksService.getAll.mockResolvedValue([]);

      const result = await controller.tasks(req);

      expect(result).toEqual([]);
      expect(service.getAll).toHaveBeenCalledWith('user-uuid-1');
    });
  });

  describe('getTask', () => {
    it('should return a specific task by id', async () => {
      const req = { user: { sub: 'user-uuid-1' } };
      mockTasksService.getTaskById.mockResolvedValue(mockTask);

      const result = await controller.getTask(req, 'task-uuid-1');

      expect(result).toEqual(mockTask);
      expect(service.getTaskById).toHaveBeenCalledWith('task-uuid-1', 'user-uuid-1');
    });

    it('should pass correct parameters to service', async () => {
      const req = { user: { sub: 'different-user-id' } };
      mockTasksService.getTaskById.mockResolvedValue(mockTask);

      await controller.getTask(req, 'task-id-123');

      expect(service.getTaskById).toHaveBeenCalledWith('task-id-123', 'different-user-id');
    });
  });

  describe('createTask', () => {
    it('should create a task with title and description', async () => {
      const req = { user: { sub: 'user-uuid-1' } };
      const createTaskDto = {
        title: 'New Task',
        description: 'New Description',
      };
      mockTasksService.create.mockResolvedValue({
        ...mockTask,
        title: 'New Task',
        description: 'New Description',
      });

      const result = await controller.createTask(req, createTaskDto);

      expect(result.title).toBe('New Task');
      expect(result.description).toBe('New Description');
      expect(service.create).toHaveBeenCalledWith(
        'New Task',
        'New Description',
        'user-uuid-1',
      );
    });

    it('should create a task with only title', async () => {
      const req = { user: { sub: 'user-uuid-1' } };
      const createTaskDto = {
        title: 'Task Without Description',
      };
      mockTasksService.create.mockResolvedValue({
        ...mockTask,
        title: 'Task Without Description',
        description: undefined,
      });

      await controller.createTask(req, createTaskDto);

      expect(service.create).toHaveBeenCalledWith(
        'Task Without Description',
        undefined,
        'user-uuid-1',
      );
    });
  });

  describe('updateTask', () => {
    it('should update task title', async () => {
      const req = { user: { sub: 'user-uuid-1' } };
      const updateTaskDto = {
        title: 'Updated Title',
      };
      const updatedTask = {
        ...mockTask,
        title: 'Updated Title',
      };
      mockTasksService.update.mockResolvedValue(updatedTask);

      const result = await controller.updateTask(req, 'task-uuid-1', updateTaskDto);

      expect(result.title).toBe('Updated Title');
      expect(service.update).toHaveBeenCalledWith(
        'task-uuid-1',
        'Updated Title',
        'user-uuid-1',
        undefined,
      );
    });

    it('should update task status', async () => {
      const req = { user: { sub: 'user-uuid-1' } };
      const updateTaskDto = {
        status: 'IN_PROGRESS' as const,
      };
      const updatedTask = {
        ...mockTask,
        status: 'IN_PROGRESS' as const,
      };
      mockTasksService.update.mockResolvedValue(updatedTask);

      const result = await controller.updateTask(req, 'task-uuid-1', updateTaskDto);

      expect(result.status).toBe('IN_PROGRESS');
      expect(service.update).toHaveBeenCalledWith(
        'task-uuid-1',
        undefined,
        'user-uuid-1',
        'IN_PROGRESS',
      );
    });

    it('should update both title and status', async () => {
      const req = { user: { sub: 'user-uuid-1' } };
      const updateTaskDto = {
        title: 'Updated Title',
        status: 'DONE' as const,
      };
      const updatedTask = {
        ...mockTask,
        title: 'Updated Title',
        status: 'DONE' as const,
      };
      mockTasksService.update.mockResolvedValue(updatedTask);

      await controller.updateTask(req, 'task-uuid-1', updateTaskDto);

      expect(service.update).toHaveBeenCalledWith(
        'task-uuid-1',
        'Updated Title',
        'user-uuid-1',
        'DONE',
      );
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      const req = { user: { sub: 'user-uuid-1' } };
      mockTasksService.delete.mockResolvedValue(mockTask);

      const result = await controller.deleteTask(req, 'task-uuid-1');

      expect(result).toBeUndefined();
      expect(service.delete).toHaveBeenCalledWith('task-uuid-1', 'user-uuid-1');
      expect(service.delete).toHaveBeenCalledTimes(1);
    });

    it('should pass correct userId to service', async () => {
      const req = { user: { sub: 'different-user-id' } };
      mockTasksService.delete.mockResolvedValue(mockTask);

      await controller.deleteTask(req, 'task-id-to-delete');

      expect(service.delete).toHaveBeenCalledWith('task-id-to-delete', 'different-user-id');
    });
  });
});
