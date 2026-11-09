import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage, { LegalSection } from '@/components/marketing/LegalPage';
import { SupportEmail } from '@/components/marketing/Missing';
import { business } from '@/config/site';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'How FastChat subscriptions and Advanced Lifetime are billed, how renewals and cancellations work, when refunds are available, and how to request one.',
  alternates: { canonical: '/refund-policy' },
};

const email = <SupportEmail email={business.supportEmail} />;

const sections: LegalSection[] = [
  {
    id: 'billing',
    title: 'Billing',
    body: (
      <p>
        FastChat Starter and Pro are subscriptions billed in advance. Where a free trial is shown at checkout, you are not charged if you cancel before the
        trial ends. Advanced Lifetime is a single one-time payment with no renewals. Orders are processed by Paddle.com, our Merchant of Record, which issues
        your receipt and processes any refund.
      </p>
    ),
  },
  {
    id: 'periods',
    title: 'Monthly and annual subscriptions',
    body: (
      <ul>
        <li><strong>Monthly</strong> subscriptions are charged once a month for the month ahead.</li>
        <li><strong>Annual</strong> subscriptions are charged once a year for the year ahead.</li>
        <li><strong>Advanced Lifetime</strong> is charged once and never renews.</li>
      </ul>
    ),
  },
  {
    id: 'renewals',
    title: 'Automatic renewals',
    body: (
      <p>
        Subscriptions renew automatically at the end of each billing period until you cancel. Your receipt email shows the renewal date. To avoid being charged
        for the next period, cancel before that date.
      </p>
    ),
  },
  {
    id: 'cancel',
    title: 'Cancellation procedure',
    body: (
      <>
        <p>
          You can cancel a subscription at any time from your billing page, using the link in your Paddle receipt email, or by contacting us at {email}.
          Advanced Lifetime has nothing to cancel because it never renews.
        </p>
        <p>After you cancel, your paid features stay active until the end of the period you have already paid for. Cancelling alone does not trigger a refund; see below.</p>
      </>
    ),
  },
  {
    id: 'eligibility',
    title: 'Refund eligibility',
    body: (
      <>
        <p>Not every payment is refundable. Whether a refund applies depends on the circumstances below, applicable consumer law and the payment provider’s policies.</p>
        <ul>
          <li>
            <strong>First payment, within 14 days:</strong> if you are not satisfied, you can request a full refund within 14 days of the first payment for a
            subscription, or of an Advanced Lifetime purchase. This applies once per customer and plan.
          </li>
          <li>
            <strong>Renewals:</strong> renewal payments are generally not refundable, including for the unused part of a billing period, except in the cases below
            or where the law requires a refund.
          </li>
          <li>
            <strong>Statutory rights:</strong> if consumer law where you live gives you a right to cancel and be refunded (for example, the 14-day right of
            withdrawal in the EU and UK), you keep that right; nothing in this policy limits it.
          </li>
          <li>
            Refunds are not given for accounts closed because of a serious breach of our <Link href="/terms">Terms of Service</Link>, except where the law requires it.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'duplicate',
    title: 'Duplicate payments',
    body: <p>If you were charged more than once for the same subscription period or Lifetime purchase, we will refund the duplicate charge in full. Contact us with your receipt details.</p>,
  },
  {
    id: 'accidental',
    title: 'Accidental payments',
    body: (
      <p>
        If you subscribed or renewed by mistake and have not used the paid features in that period, contact us within 14 days of the charge and we will review a
        refund request. Requests made later, or after the paid features have been used, are assessed case by case.
      </p>
    ),
  },
  {
    id: 'technical',
    title: 'Technical billing issues',
    body: (
      <p>
        If you were charged but your plan was not upgraded, or a billing error charged the wrong amount, contact us. We will either fix the problem so you
        receive what you paid for, or refund the affected payment.
      </p>
    ),
  },
  {
    id: 'disputes',
    title: 'Payment disputes',
    body: (
      <p>
        Please contact us before disputing a charge with your bank or card issuer; most problems can be solved quickly. If a chargeback is opened, the paid
        features may be paused while the dispute is reviewed, and the decision of the payment provider or card issuer applies.
      </p>
    ),
  },
  {
    id: 'request',
    title: 'Refund request process',
    body: (
      <>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>Email {email}, or reply to your Paddle receipt, with the email address used at checkout and your order number.</li>
          <li>Tell us briefly why you are requesting a refund.</li>
          <li>We aim to respond within 5 business days. Approved refunds are issued by Paddle to your original payment method; your bank may take 5–10 business days to show it.</li>
        </ol>
        <p>You can also manage your order and request a refund directly from Paddle at paddle.net.</p>
        <p>When a refund is issued, the refunded subscription is cancelled, or the refunded Lifetime access is removed, and your account returns to the standard limits.</p>
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Support contact information',
    body: (
      <p>
        For billing or refund questions, email {email} or visit our <Link href="/contact">Contact page</Link>.
      </p>
    ),
  },
];

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      intro={<p>This policy explains how FastChat subscriptions and Advanced Lifetime are billed, how to cancel, and when you can get a refund.</p>}
      sections={sections}
    />
  );
}
