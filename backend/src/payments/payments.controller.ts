import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { IAuthInfoRequest } from '../auth/auth.guard';
import { Public } from '../auth/public.decorator';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @HttpCode(200)
  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() req: IAuthInfoRequest & { rawBody?: Buffer },
  ) {
    return this.paymentsService.handleWebhook(signature, req.rawBody);
  }

  @UseGuards(AuthGuard)
  @Post('create-intent')
  async createIntent(
    @Req() req: IAuthInfoRequest,
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
  ) {
    return this.paymentsService.createIntent(
      Number(req.user.sub),
      createPaymentIntentDto.bookingId,
    );
  }

  @UseGuards(AuthGuard)
  @Post(':id/capture')
  async capturePayment(
    @Req() req: IAuthInfoRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.paymentsService.capturePayment(Number(req.user.sub), id);
  }
}