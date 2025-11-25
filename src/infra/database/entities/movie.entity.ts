import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('movies')
export class MovieEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  year!: number;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text' })
  studios!: string;

  @Column({ type: 'text' })
  producers!: string;

  @Column({ type: 'boolean' })
  winner!: boolean;
}
