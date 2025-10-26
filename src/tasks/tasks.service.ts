import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CustomLogger } from '../common/logger/custom-logger.service';
import { Task, Prisma } from 'src/generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly logger: CustomLogger,
    private readonly prismaService: PrismaService,
  ) {
    this.logger.setContext('TasksService');
  }

  async getAll(userId: string): Promise<Task[]> {
    this.logger.log(`Getting all tasks for user: ${userId}`);
    try {
      return await this.prismaService.task.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Failed to get tasks: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to get tasks');
    }
  }

  async create(
    title: string,
    description: string,
    userId: string,
  ): Promise<Task> {
    this.logger.log(`Creating task: ${title} for user: ${userId}`);
    try {
      return await this.prismaService.task.create({
        data: {
          title,
          description,
          userId,
        },
      });
    } catch (error) {
      // P2003: Foreign key constraint failed (userId does not exist)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        this.logger.warn(`Create task failed: User not found - ${userId}`);
        throw new NotFoundException('User not found');
      }
      this.logger.error(`Failed to create task: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create task');
    }
  }

  async getTaskById(id: string, userId: string): Promise<Task> {
    this.logger.log(`Getting task by id: ${id} for user: ${userId}`);
    try {
      const task = await this.prismaService.task.findUnique({
        where: { id },
      });

      if (!task) {
        this.logger.warn(`Task not found: ${id}`);
        throw new NotFoundException('Task not found');
      }

      if (task.userId !== userId) {
        this.logger.warn(
          `Unauthorized access attempt: User ${userId} tried to access task ${id}`,
        );
        throw new NotFoundException('Task not found');
      }

      return task;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get task: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to get task');
    }
  }

  async update(
    id: string,
    title: string | undefined,
    userId: string,
    status?: string,
  ): Promise<Task> {
    this.logger.log(`Updating task: ${id} for user: ${userId}`);
    try {
      await this.getTaskById(id, userId);

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (status !== undefined) {
        // Convert lowercase status to uppercase enum value
        const upperStatus = status.toUpperCase();
        if (['TODO', 'IN_PROGRESS', 'DONE'].includes(upperStatus)) {
          updateData.status = upperStatus;
        } else if (status === 'completed') {
          // Handle 'completed' as alias for 'DONE'
          updateData.status = 'DONE';
        }
      }

      return await this.prismaService.task.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      // P2025: Record not found for update
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.warn(`Update task failed: Task not found - ${id}`);
        throw new NotFoundException('Task not found');
      }
      this.logger.error(`Failed to update task: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to update task');
    }
  }

  async delete(id: string, userId: string): Promise<Task> {
    this.logger.log(`Deleting task: ${id} for user: ${userId}`);
    try {
      await this.getTaskById(id, userId);

      return await this.prismaService.task.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      // P2025: Record not found for delete
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        this.logger.warn(`Delete task failed: Task not found - ${id}`);
        throw new NotFoundException('Task not found');
      }
      this.logger.error(`Failed to delete task: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete task');
    }
  }
}
