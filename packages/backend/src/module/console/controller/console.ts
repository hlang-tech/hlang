import { Controller, Get, Render, Request, Res, Inject, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('')
export default class AppController {
  constructor(
    @Inject(ConfigService) private configService: ConfigService
  ) {}  
  @Get()
  @Render('index')
  async render(@Request() req) {
    const styleUrl = this.configService.get<string>('static.style');
    const scriptUrl = this.configService.get<string>('static.script');

    return {
      env: process.env.NODE_ENV || 'local',
      styleUrl,
      scriptUrl
    }
  }
}


