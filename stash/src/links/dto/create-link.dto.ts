import { IsNotEmpty, IsUrl, IsBoolean, IsOptional } from 'class-validator';

export class CreateLinkDto {
    @IsNotEmpty()
    @IsUrl()
    url: string;

    @IsOptional()
    @IsBoolean()
    generateSummary?: boolean = true;

    @IsOptional()
    @IsBoolean()
    autoTag?: boolean = true;
}
