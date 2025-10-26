import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthService = {
    signUp: jest.fn(),
    signIn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signUp', () => {
    it('should create a new user and return user without password', async () => {
      const createUserDto = {
        email: 'newuser@example.com',
        password: 'Password123!',
        name: 'New User',
      };
      const expectedResult = {
        id: 'new-user-uuid',
        email: 'newuser@example.com',
        name: 'New User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockAuthService.signUp.mockResolvedValue(expectedResult);

      const result = await controller.signUp(createUserDto);

      expect(result).toEqual(expectedResult);
      expect(result).not.toHaveProperty('password');
      expect(service.signUp).toHaveBeenCalledWith(createUserDto);
      expect(service.signUp).toHaveBeenCalledTimes(1);
    });

    it('should pass the DTO to service correctly', async () => {
      const createUserDto = {
        email: 'another@example.com',
        password: 'SecurePass456!',
        name: 'Another User',
      };
      mockAuthService.signUp.mockResolvedValue(mockUser);

      await controller.signUp(createUserDto);

      expect(service.signUp).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('signIn', () => {
    it('should return access token on successful login', async () => {
      const signInDto = {
        email: 'test@example.com',
        password: 'Password123!',
      };
      const expectedResult = {
        access_token: 'jwt-token-string',
      };
      mockAuthService.signIn.mockResolvedValue(expectedResult);

      const result = await controller.signIn(signInDto);

      expect(result).toEqual(expectedResult);
      expect(result).toHaveProperty('access_token');
      expect(service.signIn).toHaveBeenCalledWith('test@example.com', 'Password123!');
      expect(service.signIn).toHaveBeenCalledTimes(1);
    });

    it('should pass email and password separately to service', async () => {
      const signInDto = {
        email: 'user@example.com',
        password: 'MyPassword789!',
      };
      mockAuthService.signIn.mockResolvedValue({ access_token: 'token' });

      await controller.signIn(signInDto);

      expect(service.signIn).toHaveBeenCalledWith('user@example.com', 'MyPassword789!');
    });

    it('should handle different email formats', async () => {
      const signInDto = {
        email: 'User.Name+Tag@Example.COM',
        password: 'Password123!',
      };
      mockAuthService.signIn.mockResolvedValue({ access_token: 'token' });

      await controller.signIn(signInDto);

      expect(service.signIn).toHaveBeenCalledWith('User.Name+Tag@Example.COM', 'Password123!');
    });
  });
});
