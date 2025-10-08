import { Controller, Get, Post, Put, Delete, Param, Body, ValidationPipe, UsePipes } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from 'src/generated/prisma';
import { CreateUserDto, UpdateUserDto } from './dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User | null> {
    return this.usersService.findOne(id);
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<User> {
    return this.usersService.delete(id);
  }
}
