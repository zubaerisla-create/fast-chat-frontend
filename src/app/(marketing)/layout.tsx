import SiteHeader from '@/components/marketing/SiteHeader';
import SiteFooter from '@/components/marketing/SiteFooter';

// html/body are overflow:hidden for the full-screen chat app, so public pages
// scroll inside their own full-height container.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="page-scroll" className="h-[100dvh] overflow-y-auto overflow-x-hidden scroll-smooth">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
