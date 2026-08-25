import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  getBranches(@CurrentUser() user: any) {
    return this.branchesService.getBranches(user.tenantId);
  }

  @Post()
  @Roles('STORE_OWNER')
  createBranch(@CurrentUser() user: any, @Body() data: any) {
    return this.branchesService.createBranch(user.tenantId, data);
  }

  @Patch(':id')
  @Roles('STORE_OWNER')
  updateBranch(@CurrentUser() user: any, @Param('id') id: string, @Body() data: any) {
    return this.branchesService.updateBranch(user.tenantId, +id, data);
  }

  @Delete(':id')
  @Roles('STORE_OWNER')
  deleteBranch(@CurrentUser() user: any, @Param('id') id: string) {
    return this.branchesService.deleteBranch(user.tenantId, +id);
  }
}
