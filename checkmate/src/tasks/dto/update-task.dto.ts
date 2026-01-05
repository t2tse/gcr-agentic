import { IsOptional, IsString, IsEnum } from 'class-validator';

export class UpdateTaskDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    listId?: string;

    @IsOptional()
    @IsEnum(['low', 'medium', 'high'])
    priority?: string;

    @IsOptional()
    @IsEnum(['todo', 'done'])
    status?: string;

    @IsOptional()
    @IsString()
    dueDate?: string;
}
