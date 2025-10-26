import {
  Controller,
  UseGuards,
  Request,
  Body,
  Post,
  Delete,
  Get,
  Patch,
  Param,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async tasks(@Request() req) {
    const userId = req.user.sub;

    return this.tasksService.getAll(userId);
  }

  @Get(':id')
  async getTask(@Request() req, @Param('id') id: string) {
    const userId = req.user.sub;
    
    return this.tasksService.getTaskById(id, userId);
  }

    @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createTask(@Request() req, @Body() createTaskDto: CreateTaskDto) {
    const userId = req.user.sub;

    return this.tasksService.create(createTaskDto.title, createTaskDto.description, userId);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateTask(@Request() req, @Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    const userId = req.user.sub;

    return this.tasksService.update(
      id,
      updateTaskDto.title,
      userId,
      updateTaskDto.status,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTask(@Request() req, @Param('id') id: string) {
    const userId = req.user.sub;

    await this.tasksService.delete(id, userId);
  }
}
