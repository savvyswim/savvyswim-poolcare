import type { ComponentType } from 'npm:react@18.3.1'
import { template as bookingConfirmationTemplate } from './booking-confirmation.tsx'
import { template as invoiceTemplate } from './invoice.tsx'
import { template as officeNewRequestTemplate } from './office-new-request.tsx'
import { template as receiptTemplate } from './receipt.tsx'
import { template as visitReminderTemplate } from './visit-reminder.tsx'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome.tsx'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'booking-confirmation': bookingConfirmationTemplate,
  'invoice': invoiceTemplate,
  'office-new-request': officeNewRequestTemplate,
  'receipt': receiptTemplate,
  'visit-reminder': visitReminderTemplate,
}

