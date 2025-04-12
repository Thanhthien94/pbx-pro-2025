import { Module } from '@nestjs/common';
import { BypassAuthGuard } from './guards/bypass-auth.guard';

@Module({
  providers: [BypassAuthGuard],
  exports: [BypassAuthGuard],
})
export class AuthModule {}
