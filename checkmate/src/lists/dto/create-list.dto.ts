import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateListDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    icon?: string;
}
