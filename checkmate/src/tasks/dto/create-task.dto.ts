import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';

export class CreateTaskDto {
    @IsNotEmpty()
    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    listId?: string;

    @IsOptional()
    @IsEnum(['low', 'medium', 'high'])
    priority?: string = 'medium';

    @IsOptional()
    @IsString()
    dueDate?: string;
}
