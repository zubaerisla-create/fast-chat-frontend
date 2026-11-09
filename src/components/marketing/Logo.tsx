import Image from 'next/image';
import Link from 'next/link';

/** The FastChat app icon (same artwork as the Android app) and wordmark. */
export default function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 font-display text-[17px] font-semibold tracking-tight text-white ${className}`}>
      <Image src="/brand/fastchat-icon.png" alt="" width={30} height={30} className="rounded-[8px]" priority />
      FastChat
    </Link>
  );
}
