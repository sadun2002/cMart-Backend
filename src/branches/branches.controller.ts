import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  getBranches(@CurrentUser() user: any) {
    return this.branchesService.getBranches(user.tenantId);
  }

  @Post()
  createBranch(@CurrentUser() user: any, @Body() data: any) {
    return this.branchesService.createBranch(user.tenantId, data);
  }

  @Patch(':id')
  updateBranch(@CurrentUser() user: any, @Param('id') id: string, @Body() data: any) {
    return this.branchesService.updateBranch(user.tenantId, +id, data);
  }

  @Delete(':id')
  deleteBranch(@CurrentUser() user: any, @Param('id') id: string) {
    return this.branchesService.deleteBranch(user.tenantId, +id);
  }
}
