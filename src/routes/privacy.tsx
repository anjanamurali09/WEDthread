import { createFileRoute } from "@tanstack/react-router";
import { PublicMarketingHeader } from "@/components/public-marketing-header";
import { SiteFooter, CONTACT_EMAIL } from "@/components/site-footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy · WedThread" },
      { name: "description", content: "How WedThread collects, uses and protects your information." },
    ],
  }),
  component: PrivacyPage,
});

const UPDATED = "7 October 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-[#243746]">{children}</div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-pearl text-ink">
      <PublicMarketingHeader />
      <main className="px-6 pb-20 pt-12 md:px-12">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.2em] text-[#7FA8D6]">Privacy</p>
          <h1 className="mt-2 font-serif text-4xl md:text-5xl leading-[1]">How we handle your information</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated {UPDATED}</p>

          <p className="mt-8 text-[15px] leading-relaxed text-[#243746]">
            WedThread (www.wedthread.co) helps couples plan weddings and helps venues and vendors reach them. Planning a wedding
            involves other people's details too, so we try to collect only what the service needs and to be clear about what happens to it.
          </p>

          <Section title="What we collect">
            <p><strong>Your account.</strong> Your email address, a password (stored only in scrambled form by our login provider), your name, and the role you choose (couple, planner, venue, vendor or seller).</p>
            <p><strong>What you add.</strong> Wedding details, events, guest lists, RSVP answers, seating plans, menus, budget entries, notes, registry items, website content, photos and files you upload, and messages or enquiries you send through WedThread.</p>
            <p><strong>Guest information.</strong> If you add guests, you give us their names and any contact, dietary or allergy details you enter. Please make sure you are allowed to share it. Guests who respond to an RSVP link give us their answers directly.</p>
            <p><strong>Business listings.</strong> Venues and vendors give us business details, contact information, photos and verification documents (such as a licence or tax number). Tax numbers and documents are visible only to the owner and our team.</p>
            <p><strong>Payments.</strong> Card details are handled by our payment provider, Stripe. We never see or store your full card number.</p>
            <p><strong>Technical and usage data.</strong> Basic information such as device type, browser, IP address and error logs, which we use to keep the service running and secure. We also use Google Analytics, through Google Tag Manager, to see how the site is used (for example which pages are visited and roughly where visitors are from) so we can improve it.</p>
          </Section>

          <Section title="How we use it">
            <p>To run WedThread: sign you in, save your plans, show your wedding website and registry, send emails you ask for (RSVP links, reminders, invitations, account emails), pass enquiries between couples and businesses, review and verify business listings, prevent misuse, and fix problems.</p>
            <p>We do not sell your personal information.</p>
          </Section>

          <Section title="Who sees it">
            <p><strong>People you choose.</strong> Collaborators you invite can edit your wedding. Venues and vendors you contact see what you send them. Anyone with the link can view your wedding website or registry once you publish it, so share those links carefully.</p>
            <p><strong>The public.</strong> Approved venue and vendor listings, and the content of published wedding sites and public registries, are visible to anyone.</p>
            <p><strong>Service providers.</strong> We use trusted companies to run WedThread, and they handle data only for that purpose: Supabase (database, sign-in and file storage), Cloudflare (hosting and domain), Resend (email delivery), Stripe (payments), and Google (website analytics through Google Analytics and Tag Manager, and Google Sheets if you choose to connect it).</p>
            <p>We may also share information if the law requires it or to protect people's safety and the service.</p>
          </Section>

          <Section title="Cookies and similar storage">
            <p>We use your browser's storage to keep you signed in and to remember simple preferences, such as a collapsed sidebar. These are needed for the site to work. Google Analytics also sets cookies to tell visits apart and measure how the site is used. You can block or delete these cookies in your browser settings, and the site will still work.</p>
          </Section>

          <Section title="How long we keep it">
            <p>We keep your information while your account is open. You can delete your wedding from Settings, which removes its events, guests, RSVPs, seating, budget, messages and website. Ask us to delete your account entirely and we will. Some copies may remain briefly in backups or logs before they are removed.</p>
          </Section>

          <Section title="Your choices and rights">
            <p>You can see and edit most of your information in the app. You can also ask us for a copy of your information, to correct it, or to delete it, and you can object to or limit certain uses. Depending on where you live, the law may give you further rights. Email us and we will help.</p>
          </Section>

          <Section title="Security">
            <p>Data is encrypted in transit, and access to each wedding is limited to its owner and invited collaborators. No system is perfectly secure, so please use a strong, unique password.</p>
          </Section>

          <Section title="Where data is processed">
            <p>Our providers may process data in countries other than your own. Where that happens we rely on them to protect it appropriately.</p>
          </Section>

          <Section title="Children">
            <p>WedThread is meant for adults planning a wedding and is not directed at children under 16.</p>
          </Section>

          <Section title="Changes">
            <p>If we change this page in a way that matters, we will update the date above and, for significant changes, let account holders know.</p>
          </Section>

          <Section title="Contact">
            <p>Questions or requests about your information: <a className="underline underline-offset-4 hover:text-[#7FA8D6]" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
          </Section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
