import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage, { LegalSection } from '@/components/marketing/LegalPage';
import Missing, { SupportEmail } from '@/components/marketing/Missing';
import { business, site } from '@/config/site';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms that apply when you create a FastChat account and use the FastChat apps, including subscriptions, lifetime purchases, billing, renewal and cancellation.',
  alternates: { canonical: '/terms' },
};

const seller = business.legalName ?? <Missing label="legal business name" />;
const country = business.country ?? <Missing label="governing-law country" />;

const sections: LegalSection[] = [
  {
    id: 'acceptance',
    title: 'Introduction and acceptance',
    body: (
      <>
        <p>
          These Terms of Service (“Terms”) govern your use of {site.name}, including the website at {site.url}, the web app and the mobile apps (together, the
          “Service”). The Service is provided by {seller} (“we”, “us”, “our”).
        </p>
        <p>By creating an account or using the Service, you agree to these Terms and to our <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do not use the Service.</p>
      </>
    ),
  },
  {
    id: 'accounts',
    title: 'Account registration',
    body: (
      <>
        <p>To use FastChat you need an account. You can register with an email address, which we verify with a one-time code, or with a Google account.</p>
        <ul>
          <li>You must give accurate information and keep it up to date.</li>
          <li>You must be at least 13 years old, or older if the law where you live requires it.</li>
          <li>You are responsible for keeping your password secure and for everything done through your account. Tell us promptly if you believe your account has been accessed without your permission.</li>
          <li>Usernames must not impersonate another person or organisation or be offensive.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'responsibilities',
    title: 'Your responsibilities',
    body: (
      <>
        <p>You are responsible for the messages, files and other content you send (“your content”). You confirm that you have the right to share it and that sharing it does not break any law or anyone else’s rights.</p>
        <p>You must comply with all laws that apply to your use of the Service.</p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use policy',
    body: (
      <>
        <p>You must not use the Service to:</p>
        <ul>
          <li>break the law, or promote or facilitate illegal activity;</li>
          <li>harass, threaten, bully or abuse anyone, or promote violence or hatred;</li>
          <li>share sexual content involving minors, or any content that exploits children;</li>
          <li>send spam, chain messages or unsolicited bulk messages;</li>
          <li>share malware, or try to gain unauthorised access to accounts, systems or data;</li>
          <li>infringe intellectual property, privacy or other rights of others;</li>
          <li>interfere with or overload the Service, or get around rate limits, plan limits or security measures;</li>
          <li>scrape, copy or resell the Service without our written permission.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'messaging',
    title: 'Messaging and communication rules',
    body: (
      <>
        <p>
          FastChat delivers messages and files between the people in a conversation. Messages are encrypted in transit between your device and our servers, and
          stored on our servers so they can be delivered and synced to your devices. FastChat does not currently offer end-to-end encryption.
        </p>
        <p>Only message people who want to hear from you. If someone asks you to stop contacting them, stop.</p>
        <p>
          We do not routinely read your conversations. We may review content when it is reported to us, when needed to investigate abuse or security problems,
          or when the law requires it, and we may remove content that breaks these Terms.
        </p>
      </>
    ),
  },
  {
    id: 'plans',
    title: 'Plans',
    body: (
      <>
        <p>
          You can create a FastChat account without buying a plan; unpaid accounts have the standard limits shown on our Pricing page. FastChat sells three
          paid plans: Starter and Pro, which are subscriptions, and Advanced Lifetime, which is a one-time purchase. The features, limits and prices of each
          plan are described on our <Link href="/pricing">Pricing page</Link>. Prices may be shown in your local currency and may exclude taxes.
        </p>
        <p>
          <strong>Free trials.</strong> A free trial applies only where the Pricing page and checkout show one for the plan and billing period you choose. You
          provide a payment method when you start the trial; you are not charged if you cancel before the trial ends. When the trial ends, your subscription
          starts and the first payment is taken automatically.
        </p>
        <p>
          <strong>Advanced Lifetime.</strong> Advanced Lifetime is paid once. It is not a subscription, does not renew and is not charged again. It gives your
          FastChat account the Advanced plan’s features for as long as FastChat is offered, and it is not transferable to another account.
        </p>
        <p>We may change plan features or prices in the future. Price changes apply from your next billing period after we have notified you, and you can cancel before they take effect.</p>
      </>
    ),
  },
  {
    id: 'billing',
    title: 'Billing and recurring payments',
    body: (
      <>
        <p>
          Our order process is conducted by our online reseller Paddle.com. Paddle.com is the Merchant of Record for all our orders. Paddle provides all
          customer service inquiries and handles returns. When you buy a plan on our website, you also agree to Paddle’s buyer terms, which are shown at
          checkout.
        </p>
        <p>
          Paid subscriptions are billed in advance, monthly or yearly depending on the billing period you choose. By subscribing you authorise recurring charges
          to your chosen payment method until you cancel. Sales tax or VAT may be added depending on your location.
        </p>
        <p>Advanced Lifetime is charged once, at checkout. Plans can currently be bought only on our website, not inside the Android app.</p>
      </>
    ),
  },
  {
    id: 'renewal',
    title: 'Subscription renewal',
    body: (
      <p>
        Subscriptions renew automatically at the end of each billing period for the same period and at the price then in effect, unless you cancel before the
        renewal date. If a renewal payment fails, we or our payment provider may retry it; if it still cannot be collected, the subscription ends and your account returns to the standard limits.
      </p>
    ),
  },
  {
    id: 'cancellation',
    title: 'Cancellation policy',
    body: (
      <>
        <p>
          You can cancel a subscription at any time. Cancellation stops future renewals; you keep paid features until the end of the billing period you have
          already paid for, after which your account returns to the standard limits. Cancelling does not delete your account.
        </p>
        <p>
          To cancel, use “Manage billing” on your billing page, the link in your Paddle receipt email, or contact us at{' '}
          <SupportEmail email={business.supportEmail} />. Refunds are covered by our <Link href="/refund-policy">Refund Policy</Link>.
        </p>
        <p>
          If your account goes over a standard limit after a paid plan ends, existing files stay available, but you may not be able to upload new files
          until your usage is back under the limit.
        </p>
      </>
    ),
  },
  {
    id: 'termination',
    title: 'Account suspension and termination',
    body: (
      <>
        <p>
          We may suspend or close your account, or remove content, if you seriously or repeatedly break these Terms, if your use creates a risk or legal problem
          for us or other users, or if the law requires it. Where reasonable, we will tell you why and give you a chance to respond.
        </p>
        <p>
          You can stop using FastChat at any time and ask us to delete your account by contacting <SupportEmail email={business.supportEmail} />. If we close
          a paid account because of a serious breach of these Terms, we are not required to refund the remaining period, except where the law requires it.
        </p>
      </>
    ),
  },
  {
    id: 'availability',
    title: 'Service availability',
    body: (
      <p>
        We work to keep FastChat available and reliable, but we do not guarantee that it will be uninterrupted, error-free or available at all times. We may
        carry out maintenance, and we may change, add or remove features. We will give reasonable notice before removing a feature that is part of a paid plan.
        Keep your own copies of any files that are important to you.
      </p>
    ),
  },
  {
    id: 'ip',
    title: 'Intellectual property',
    body: (
      <>
        <p>
          You keep ownership of your content. You give us a limited licence to store, process and transmit it only as needed to provide the Service to you and the
          people you communicate with.
        </p>
        <p>The FastChat software, name, logo and design belong to us or our licensors. These Terms do not give you any right to use them except to use the Service as intended.</p>
      </>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <>
        <p>
          The Service is provided “as is” and “as available”. To the extent allowed by law, we are not liable for indirect, incidental, special or consequential
          losses, or for loss of data, profits or business, arising from your use of the Service.
        </p>
        <p>
          To the extent allowed by law, our total liability to you for any claim relating to the Service is limited to the amount you paid us in the 12 months
          before the claim arose, or US$50 if you have not paid us anything.
        </p>
        <p>Nothing in these Terms limits any rights you have as a consumer that cannot be limited by law.</p>
      </>
    ),
  },
  {
    id: 'law',
    title: 'Governing law',
    body: <p>These Terms are governed by the laws of {country}, without affecting any mandatory consumer protection laws of the country where you live.</p>,
  },
  {
    id: 'changes',
    title: 'Changes to these Terms',
    body: (
      <p>
        We may update these Terms from time to time. If a change is significant, we will tell you in the app or by email before it takes effect. The date at the
        top of this page shows when the Terms were last updated. If you keep using the Service after a change takes effect, the updated Terms apply.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact information',
    body: (
      <p>
        Questions about these Terms? Contact {seller} at <SupportEmail email={business.supportEmail} />, or see our <Link href="/contact">Contact page</Link>.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={<p>Please read these Terms carefully. They explain your rights and responsibilities when you use FastChat, including how subscriptions, lifetime purchases, renewals and cancellations work.</p>}
      sections={sections}
    />
  );
}
