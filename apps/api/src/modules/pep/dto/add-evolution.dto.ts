import { IsNotEmpty, IsString } from 'class-validator';

export class AddEvolutionDto {
  @IsNotEmpty({ message: 'O conteúdo da evolução não pode ser vazio' })
  @IsString()
  content: string;
}
