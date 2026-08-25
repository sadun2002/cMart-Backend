import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { 
  forgotPasswordTemplate, 
  tenantApprovedTemplate, 
  tenantPendingTemplate,
  tenantRejectedTemplate,
  subscriptionUpdateTemplate 
} from './templates';

@Injectable()
export class MailService {
  private resend: Resend;
  private readonly logger = new Logger(MailService.name);
  
  // By default, Resend only allows sending from onboarding@resend.dev until a domain is verified.
  private readonly defaultFrom = 'cMart Platform <onboarding@resend.dev>';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY is not set in environment variables');
    }
  }

  async sendForgotPassword(email: string, name: string, resetLink: string) {
    if (!this.resend) return;
    
    try {
      const data = await this.resend.emails.send({
        from: this.defaultFrom,
        to: email, // Note: In testing without a verified domain, this must be the email address you registered with on Resend
        subject: 'Reset Your cMart Password',
        html: forgotPasswordTemplate(name, resetLink),
      });
      this.logger.log(`Forgot Password email sent to ${email} (ID: ${data.data?.id})`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to send forgot password email to ${email}`, error);
    }
  }

  async sendTenantPending(email: string, name: string) {
    if (!this.resend) return;
    try {
      const data = await this.resend.emails.send({
        from: this.defaultFrom,
        to: email,
        subject: 'Application Received - Under Review ⏳',
        html: tenantPendingTemplate(name),
      });
      this.logger.log(`Tenant Pending email sent to ${email} (ID: ${data.data?.id})`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to send tenant pending email to ${email}`, error);
    }
  }

  async sendTenantRejected(email: string, name: string, reason: string) {
    if (!this.resend) return;
    try {
      const data = await this.resend.emails.send({
        from: this.defaultFrom,
        to: email,
        subject: 'Update on your cMart Application',
        html: tenantRejectedTemplate(name, reason || 'Did not meet requirements.'),
      });
      this.logger.log(`Tenant Rejected email sent to ${email} (ID: ${data.data?.id})`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to send tenant rejected email to ${email}`, error);
    }
  }

  async sendTenantApproved(email: string, name: string, dashboardLink: string, plan: string) {
    if (!this.resend) return;
    
    try {
      const data = await this.resend.emails.send({
        from: this.defaultFrom,
        to: email,
        subject: 'Welcome to cMart! Your store is approved 🎉',
        html: tenantApprovedTemplate(name, dashboardLink, plan),
      });
      this.logger.log(`Tenant Approved email sent to ${email} (ID: ${data.data?.id})`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to send tenant approved email to ${email}`, error);
    }
  }

  async sendSubscriptionUpdate(email: string, name: string, plan: string, action: 'upgraded' | 'downgraded' | 'cancelled') {
    if (!this.resend) return;
    
    let subject = 'Your cMart Subscription Update';
    if (action === 'upgraded') subject = 'Subscription Upgraded Successfully 🌟';
    if (action === 'downgraded') subject = 'Subscription Downgraded 📉';
    if (action === 'cancelled') subject = 'Subscription Cancelled 😔';

    try {
      const data = await this.resend.emails.send({
        from: this.defaultFrom,
        to: email,
        subject,
        html: subscriptionUpdateTemplate(name, plan, action),
      });
      this.logger.log(`Subscription ${action} email sent to ${email} (ID: ${data.data?.id})`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to send subscription update email to ${email}`, error);
    }
  }
}
