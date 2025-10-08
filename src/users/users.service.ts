import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from 'src/generated/prisma';
import { CreateUserDto, UpdateUserDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  async user(userWhereUniqueInput: Prisma.UserWhereUniqueInput): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: userWhereUniqueInput,
    });
  }

  async users(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async findOne(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.prisma.user.create({
      data: {
        email: createUserDto.email,
        name: createUserDto.name,
        password: hashedPassword,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const updateData: Prisma.UserUpdateInput = {};

    if (updateUserDto.email) updateData.email = updateUserDto.email;
    if (updateUserDto.name) updateData.name = updateUserDto.name;
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
