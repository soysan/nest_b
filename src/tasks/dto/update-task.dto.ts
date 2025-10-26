import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['TODO', 'IN_PROGRESS', 'DONE', 'completed'])
  @IsOptional()
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'completed';
}
