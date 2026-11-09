import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage, { LegalSection } from '@/components/marketing/LegalPage';
import Missing, { SupportEmail } from '@/components/marketing/Missing';
import { business } from '@/config/site';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What information FastChat collects, how messages and files are stored and protected, which providers process data, and how to exercise your privacy rights.',
  alternates: { canonical: '/privacy' },
};

const seller = business.legalName ?? <Missing label="legal business name" />;
const email = <SupportEmail email={business.supportEmail} />;

const sections: LegalSection[] = [
  {
    id: 'collected',
    title: 'Information we collect',
    body: <p>We collect only what we need to run FastChat. The sections below list each type of information and why we use it.</p>,
  },
  {
    id: 'account',
    title: 'Account information',
    body: (
      <ul>
        <li><strong>Email address and username</strong>, to create and identify your account and to sign you in.</li>
        <li><strong>Password</strong>, which we store only as a one-way hash (bcrypt); we never store it in plain text.</li>
        <li><strong>Verification codes</strong> we email you at sign-up or password reset. We store them only as hashes, and they expire after 10 minutes.</li>
        <li><strong>Google sign-in:</strong> if you continue with Google, we receive your email address and name from Google to create or match your account.</li>
      </ul>
    ),
  },
  {
    id: 'profile',
    title: 'User profile information',
    body: (
      <p>
        Your username, profile picture (if you upload one), online status and “last seen” time are visible to other FastChat users who can find or message you.
        Your email address may also be shown to the people you have conversations with.
      </p>
    ),
  },
  {
    id: 'messages',
    title: 'Messaging and file-sharing data',
    body: (
      <>
        <p>
          We store the messages you send, the files, images, videos and voice messages you share, and information about them (such as time sent, file name, size
          and whether a message has been seen). We need this to deliver your messages and to show your conversation history on each of your devices.
        </p>
        <p>
          <strong>How messages are protected:</strong> connections between your device and our servers are encrypted (HTTPS/TLS). Messages and files are stored
          on our servers and are <strong>not end-to-end encrypted</strong>. Access to the servers is restricted to authorised administrators. We do not read your
          messages, except when you report content to us, when we need to investigate abuse or a security problem, or when the law requires it.
        </p>
        <p>We do not use the content of your messages for advertising, and we do not sell it.</p>
      </>
    ),
  },
  {
    id: 'technical',
    title: 'Technical information',
    body: (
      <ul>
        <li><strong>Push notification tokens</strong> for your devices, so we can notify you about new messages. They are removed when you sign out of the app.</li>
        <li><strong>Connection data</strong>, such as your IP address, browser or app version and the time of requests. Our hosting and network providers may record these in short-term logs for security and troubleshooting.</li>
      </ul>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and analytics',
    body: (
      <>
        <p>
          The FastChat website uses two cookies that are strictly necessary to keep you signed in: <code>token</code> (your session) and <code>user</code> (your
          basic profile, so the app loads quickly). Both expire after 7 days and are removed when you sign out.
        </p>
        <p>We do not use analytics, advertising or tracking cookies, and we do not show ads.</p>
      </>
    ),
  },
  {
    id: 'processing',
    title: 'How we use information',
    body: (
      <>
        <p>We use your information to:</p>
        <ul>
          <li>provide the Service: create your account, deliver messages and files, sync your devices and send notifications (performance of our contract with you);</li>
          <li>keep FastChat secure and prevent abuse, fraud and spam (our legitimate interests);</li>
          <li>process subscriptions, payments and refunds, and keep the records the law requires (contract and legal obligations);</li>
          <li>answer your support requests and send essential service emails such as verification codes and important changes to our terms.</li>
        </ul>
        <p>We do not sell personal information, and we do not use it for advertising.</p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Data security',
    body: (
      <p>
        We use encrypted connections, hashed passwords and verification codes, access controls on our servers and authentication on every request to private
        data. No system is perfectly secure, so we cannot guarantee absolute security. If a breach affects your personal information, we will tell you and the
        relevant authorities where the law requires it.
      </p>
    ),
  },
  {
    id: 'retention',
    title: 'Data retention',
    body: (
      <ul>
        <li>Account and profile information is kept while your account is open.</li>
        <li>Messages and shared files are kept while your account is open so your conversation history stays available.</li>
        <li>Verification codes expire after 10 minutes.</li>
        <li>When your account is deleted, we delete your account information, messages and files within 30 days, except where we must keep some records (for example, billing records for tax purposes) for longer by law.</li>
        <li>Messages you sent remain visible to the person you sent them to until your account is deleted.</li>
      </ul>
    ),
  },
  {
    id: 'rights',
    title: 'Your privacy rights',
    body: (
      <>
        <p>Depending on where you live, you may have the right to:</p>
        <ul>
          <li>access the personal information we hold about you and get a copy of it;</li>
          <li>correct inaccurate information (you can update your username and profile picture in the app);</li>
          <li>delete your information;</li>
          <li>object to or restrict certain processing;</li>
          <li>receive your information in a portable format;</li>
          <li>complain to your local data protection authority.</li>
        </ul>
        <p>To exercise any of these rights, email {email}. We will respond within 30 days and may need to verify your identity first.</p>
      </>
    ),
  },
  {
    id: 'deletion',
    title: 'Account deletion',
    body: (
      <p>
        To delete your account, email {email} from the address linked to your account. We will confirm the request and delete your account and its data as
        described in Data retention. If you have an active paid subscription, cancel it first so you are not charged again.
      </p>
    ),
  },
  {
    id: 'providers',
    title: 'Third-party service providers',
    body: (
      <>
        <p>We use these providers to run FastChat. Each processes only the information needed for its role:</p>
        <ul>
          <li><strong>Hostinger</strong>: hosts our servers and database, where account data, messages and files are stored.</li>
          <li><strong>Cloudflare</strong>: domain name and network services; your connection to FastChat passes through it.</li>
          <li><strong>Google</strong>: Google sign-in (if you use it), Firebase Cloud Messaging for push notifications on Android, and email delivery of verification codes.</li>
          <li><strong>Expo</strong> and <strong>Apple Push Notification service</strong>: deliver push notifications to the mobile apps.</li>
          <li><strong>Paddle</strong>: processes website payments as Merchant of Record (see below).</li>
        </ul>
      </>
    ),
  },
  {
    id: 'payments',
    title: 'Payment processing',
    body: (
      <p>
        Plans bought on our website are processed by Paddle.com, our Merchant of Record. Paddle collects your payment details, billing address and
        tax information and handles them under its own privacy policy; we do not receive or store your full card details. We receive the information needed to
        manage your plan, such as the plan you bought, its billing status and the email address used at checkout.
      </p>
    ),
  },
  {
    id: 'international',
    title: 'International data processing',
    body: (
      <p>
        Our servers are located in {business.serverLocation ?? <Missing label="server location" />}. Our service providers may process information in other
        countries, including the United States. Where the law requires it, we rely on appropriate safeguards, such as standard contractual clauses, for these
        transfers.
      </p>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: <p>FastChat is not intended for children under 13, and we do not knowingly collect their information. If you believe a child has created an account, contact us and we will delete it.</p>,
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: <p>If we make significant changes to this policy, we will tell you in the app or by email before they take effect. The date at the top shows the latest version.</p>,
  },
  {
    id: 'contact',
    title: 'Contact information',
    body: (
      <p>
        {seller} is responsible for your personal information in FastChat. For privacy questions or requests, contact {email} or visit our{' '}
        <Link href="/contact">Contact page</Link>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={<p>This policy explains what information FastChat collects, how we use and protect it, who we share it with, and the choices and rights you have.</p>}
      sections={sections}
    />
  );
}
