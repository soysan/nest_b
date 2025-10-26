import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { CustomLogger } from '../common/logger/custom-logger.service';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let logger: CustomLogger;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    name: 'Test User',
    password: 'hashedPassword123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserWithoutPassword = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: mockUser.createdAt,
    updatedAt: mockUser.updatedAt,
  };

  const mockUsersService = {
    create: jest.fn(),
    findByEmailWithPassword: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
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
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: CustomLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    logger = module.get<CustomLogger>(CustomLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signUp', () => {
    it('should create a new user with hashed password', async () => {
      const createUserDto = {
        email: 'newuser@example.com',
        password: 'PlainPassword123!',
        name: 'New User',
      };
      const hashedPassword = 'hashedPassword456';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await service.signUp(createUserDto);

      expect(result).toEqual(mockUserWithoutPassword);
      expect(result).not.toHaveProperty('password');
      expect(bcrypt.hash).toHaveBeenCalledWith('PlainPassword123!', 10);
      expect(usersService.create).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: hashedPassword,
        name: 'New User',
      });
    });

    it('should throw ConflictException when email already exists (P2002)', async () => {
      const createUserDto = {
        email: 'existing@example.com',
        password: 'Password123!',
        name: 'Existing User',
      };
      const hashedPassword = 'hashedPassword';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
        },
      );
      mockUsersService.create.mockRejectedValue(prismaError);

      await expect(service.signUp(createUserDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.signUp(createUserDto)).rejects.toThrow(
        'Email already exists',
      );
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should rethrow other errors', async () => {
      const createUserDto = {
        email: 'newuser@example.com',
        password: 'Password123!',
        name: 'New User',
      };
      const hashedPassword = 'hashedPassword';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      const genericError = new Error('Database connection failed');
      mockUsersService.create.mockRejectedValue(genericError);

      await expect(service.signUp(createUserDto)).rejects.toThrow(
        'Database connection failed',
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle bcrypt hashing errors', async () => {
      const createUserDto = {
        email: 'newuser@example.com',
        password: 'Password123!',
        name: 'New User',
      };

      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));

      await expect(service.signUp(createUserDto)).rejects.toThrow('Bcrypt error');
    });
  });

  describe('signIn', () => {
    it('should return access token on successful login', async () => {
      const email = 'test@example.com';
      const password = 'Password123!';
      const accessToken = 'jwt-token-string';

      mockUsersService.findByEmailWithPassword.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue(accessToken);

      const result = await service.signIn(email, password);

      expect(result).toEqual({ access_token: accessToken });
      expect(usersService.findByEmailWithPassword).toHaveBeenCalledWith(email);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, mockUser.password);
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      const email = 'nonexistent@example.com';
      const password = 'Password123!';

      mockUsersService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(service.signIn(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.signIn(email, password)).rejects.toThrow(
        'Invalid credentials',
      );
      expect(logger.warn).toHaveBeenCalled();
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      const email = 'test@example.com';
      const password = 'WrongPassword123!';

      mockUsersService.findByEmailWithPassword.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.signIn(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.signIn(email, password)).rejects.toThrow(
        'Invalid credentials',
      );
      expect(logger.warn).toHaveBeenCalled();
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should use same error message for non-existent user and wrong password', async () => {
      const email1 = 'nonexistent@example.com';
      const email2 = 'test@example.com';
      const password = 'WrongPassword123!';

      // Case 1: User does not exist
      mockUsersService.findByEmailWithPassword.mockResolvedValue(null);
      let error1;
      try {
        await service.signIn(email1, password);
      } catch (e) {
        error1 = e;
      }

      // Case 2: Wrong password
      mockUsersService.findByEmailWithPassword.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      let error2;
      try {
        await service.signIn(email2, password);
      } catch (e) {
        error2 = e;
      }

      expect(error1.message).toBe(error2.message);
      expect(error1.message).toBe('Invalid credentials');
    });

    it('should create JWT with correct payload', async () => {
      const email = 'test@example.com';
      const password = 'Password123!';

      mockUsersService.findByEmailWithPassword.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue('token');

      await service.signIn(email, password);

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
      // Should not include password or other sensitive data in payload
      expect(jwtService.signAsync).not.toHaveBeenCalledWith(
        expect.objectContaining({ password: expect.anything() }),
      );
    });

    it('should handle bcrypt compare errors', async () => {
      const email = 'test@example.com';
      const password = 'Password123!';

      mockUsersService.findByEmailWithPassword.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockRejectedValue(new Error('Bcrypt error'));

      await expect(service.signIn(email, password)).rejects.toThrow('Bcrypt error');
    });
  });
});
