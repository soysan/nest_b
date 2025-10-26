import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { NotFoundException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUser = {
    id: 'test-uuid-1',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    me: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    createWithHashedPassword: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMe', () => {
    it('should return current user profile', async () => {
      const req = { user: { sub: mockUser.id } };
      mockUsersService.me.mockResolvedValue(mockUser);

      const result = await controller.getMe(req);

      expect(result).toEqual(mockUser);
      expect(service.me).toHaveBeenCalledWith(mockUser.id);
      expect(service.me).toHaveBeenCalledTimes(1);
    });

    it('should return null if user not found', async () => {
      const req = { user: { sub: 'non-existent-id' } };
      mockUsersService.me.mockResolvedValue(null);

      const result = await controller.getMe(req);

      expect(result).toBeNull();
      expect(service.me).toHaveBeenCalledWith('non-existent-id');
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [
        mockUser,
        {
          id: 'test-uuid-2',
          email: 'test2@example.com',
          name: 'Test User 2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockUsersService.findAll.mockResolvedValue(users);

      const result = await controller.findAll();

      expect(result).toEqual(users);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no users exist', async () => {
      mockUsersService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(service.findOne).toHaveBeenCalledWith(mockUser.id);
    });

    it('should throw NotFoundException when user not found', async () => {
      const nonExistentId = 'non-existent-id';
      mockUsersService.findOne.mockResolvedValue(null);

      await expect(controller.findOne(nonExistentId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.findOne(nonExistentId)).rejects.toThrow(
        `User with ID ${nonExistentId} not found`,
      );
      expect(service.findOne).toHaveBeenCalledWith(nonExistentId);
    });
  });

  describe('register', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        email: 'new@example.com',
        password: 'Password123!',
        name: 'New User',
      };
      const createdUser = {
        id: 'new-uuid',
        email: 'new@example.com',
        name: 'New User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUsersService.createWithHashedPassword.mockResolvedValue(createdUser);

      const result = await controller.register(createUserDto);

      expect(result).toEqual(createdUser);
      expect(service.createWithHashedPassword).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        email: 'new@example.com',
        password: 'Password123!',
        name: 'New User',
      };
      const createdUser = {
        id: 'new-uuid',
        email: 'new@example.com',
        name: 'New User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUsersService.createWithHashedPassword.mockResolvedValue(createdUser);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(createdUser);
      expect(service.createWithHashedPassword).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateUserDto = {
        name: 'Updated Name',
      };
      const updatedUser = {
        ...mockUser,
        name: 'Updated Name',
      };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(mockUser.id, updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(service.update).toHaveBeenCalledWith(mockUser.id, updateUserDto);
    });

    it('should update user email', async () => {
      const updateUserDto = {
        email: 'updated@example.com',
      };
      const updatedUser = {
        ...mockUser,
        email: 'updated@example.com',
      };
      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update(mockUser.id, updateUserDto);

      expect(result).toEqual(updatedUser);
      expect(service.update).toHaveBeenCalledWith(mockUser.id, updateUserDto);
    });

    it('should update user password', async () => {
      const updateUserDto = {
        password: 'NewPassword123!',
      };
      mockUsersService.update.mockResolvedValue(mockUser);

      const result = await controller.update(mockUser.id, updateUserDto);

      expect(result).toEqual(mockUser);
      expect(service.update).toHaveBeenCalledWith(mockUser.id, updateUserDto);
    });
  });

  describe('delete', () => {
    it('should delete a user', async () => {
      mockUsersService.delete.mockResolvedValue(mockUser);

      const result = await controller.delete(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(service.delete).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
