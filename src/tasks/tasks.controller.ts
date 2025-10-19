import {
  Controller,
  UseGuards,
  Request,
  Body,
  Post,
  Delete,
  Get,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async tasks(@Request() req) {
    const userId = req.user.sub;

    return this.tasksService.getAll(userId);
  }

  @Post('create')
  async createTask(@Request() req, @Body() body) {
    const userId = req.user.sub;

    return this.tasksService.create(body.title, body.description, userId);
  }

  @Post('update')
  async updateTask(@Request() req, @Body() body) {
    const userId = req.user.sub;

    return this.tasksService.update(
      body.id,
      body.title,
      body.description,
      userId,
    );
  }

  @Delete('delete')
  async deleteTask(@Request() req, @Body() body) {
    const userId = req.user.sub;

    return this.tasksService.delete(body.id, userId);
  }
}
