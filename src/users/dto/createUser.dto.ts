import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase())
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsString()
  @MinLength(8)
  password: string;
}
