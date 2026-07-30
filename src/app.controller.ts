import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/decorators/public.decorator';
import { COMPANY_NAME } from './common/constants';

@Controller()
export class AppController {
  @Public()
  @Get()
  getHello() {
    return {
      name: `${COMPANY_NAME} API`,
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
