import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DataRetentionService } from './data-retention.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [DataRetentionService],
})
export class CronModule {}
