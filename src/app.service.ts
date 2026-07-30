// This file is intentionally left simple — App service is handled in each module
import { Injectable } from '@nestjs/common';
import { COMPANY_NAME } from './common/constants';

@Injectable()
export class AppService {
  getInfo(): object {
    return {
      name: `${COMPANY_NAME} Platform API`,
      version: '1.0.0',
    };
  }
}
