import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VirtualCardModule } from './virtual-card/virtual-card.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type:          'oracle',
      username:      process.env.DB_USER,
      password:      process.env.DB_PASS,
      connectString: process.env.DB_CONNECT_STRING, // e.g. 10.154.46.26:1521/LDBDB
      synchronize:   false,
      logging:       false,
      entities:      [],
    }),
    VirtualCardModule,
  ],
})
export class AppModule {}
