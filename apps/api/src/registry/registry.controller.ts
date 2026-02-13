import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { AddressSearchQueryDto } from './dto/address-search.query.dto';
import { CompanySearchQueryDto } from './dto/company-search.query.dto';
import { RegistryService } from './registry.service';

@UseGuards(SessionAuthGuard)
@Controller('registry')
export class RegistryController {
  constructor(private readonly registryService: RegistryService) {}

  @Get('company/:ico')
  async findCompanyByIco(@Param('ico') ico: string) {
    return this.registryService.findCompanyByIco(ico);
  }

  @Get('company-search')
  async searchCompanies(@Query() query: CompanySearchQueryDto) {
    const items = await this.registryService.searchCompanies(query.q);
    return { items };
  }

  @Get('address-search')
  async searchAddresses(@Query() query: AddressSearchQueryDto) {
    const items = await this.registryService.searchAddresses(query.q);
    return { items };
  }
}
