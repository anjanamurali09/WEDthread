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

const UPDATED = "8 October 2026";

// Fill these in with the legal details of the business that runs WedThread. Anything left empty is simply not
// shown, so the page never prints a blank or a placeholder.
const CONTROLLER = {
  legalName: "",          // e.g. "WedThread Ltd"
  address: "",            // registered or trading address
  registrationNumber: "", // company number, and ICO registration number if you have one
};

// Legal representatives for people in the UK and the EU (a business based outside those places that offers its
// service there normally has to appoint one). Fill in once appointed; empty entries are not shown.
const REPRESENTATIVES = {
  uk: "", // name and contact details of the UK representative
  eu: "", // name and contact details of the EU representative
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-serif text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-[#243746]">{children}</div>
    </section>
  );
}

const linkClass = "underline underline-offset-4 hover:text-[#7FA8D6]";

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
            involves other people's details too, so we collect only what the service needs and try to be clear about what happens to it.
          </p>

          <Section title="Who we are">
            <p>
              WedThread is run from the United Arab Emirates and is open to people around the world. We are responsible for the information described on this page (the "data controller").
              {CONTROLLER.legalName && <> We operate as <strong>{CONTROLLER.legalName}</strong>.</>}
              {CONTROLLER.address && <> Our address is {CONTROLLER.address}.</>}
              {CONTROLLER.registrationNumber && <> Registration: {CONTROLLER.registrationNumber}.</>}
              {" "}You can reach us at <a className={linkClass} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
            {(REPRESENTATIVES.uk || REPRESENTATIVES.eu) && (
              <p>
                {REPRESENTATIVES.uk && <>Our representative in the United Kingdom: {REPRESENTATIVES.uk}. </>}
                {REPRESENTATIVES.eu && <>Our representative in the European Union: {REPRESENTATIVES.eu}.</>}
              </p>
            )}
            <p>
              If you add other people's details (such as your wedding guests), you decide what to enter and why, so you are responsible for having a good
              reason to hold it. We keep that information safe and use it only to run the service for you.
            </p>
          </Section>

          <Section title="What we collect">
            <p><strong>Your account.</strong> Your email address, a password (stored only in scrambled form by our login provider), your name, and the role you choose (couple, planner, venue, vendor or seller).</p>
            <p><strong>What you add.</strong> Wedding details, events, guest lists, RSVP answers, seating plans, menus, budget entries, notes, registry items, website content, photos and files you upload, and messages or enquiries you send through WedThread.</p>
            <p><strong>Guest information.</strong> If you add guests, you give us their names and any contact, dietary or allergy details you enter. We receive this from you, not from the guests. Guests who answer an RSVP link give us their answers directly.</p>
            <p><strong>Sensitive details.</strong> Dietary and allergy information can reveal health or religious beliefs. Only add what you need, and make sure your guests are happy for you to record it. Anyone can ask us to remove it.</p>
            <p><strong>Business listings.</strong> Venues and vendors give us business details, contact information, photos and verification documents (such as a licence or tax number). Tax numbers and documents are visible only to the owner and our team.</p>
            <p><strong>Payments.</strong> Card details are handled by our payment provider, Stripe. We never see or store your full card number.</p>
            <p><strong>Technical and usage data.</strong> Basic information such as device type, browser, IP address and error logs, which we use to keep the service running and secure. If you accept analytics cookies, we also use Google Analytics, through Google Tag Manager, to see how the site is used (for example which pages are visited and roughly where visitors are from) so we can improve it.</p>
          </Section>

          <Section title="Why we use it, and our legal basis">
            <p>The laws that protect your information depend on where you live. For people in the UK and the EU we rely on the following legal bases.</p>
            <ul className="list-disc space-y-2 pl-5">
              <li><strong>To provide WedThread to you</strong> (sign you in, save your plans, show your wedding website and registry, send the emails you ask for, pass enquiries between couples and businesses). Basis: it is needed to carry out our agreement with you.</li>
              <li><strong>To keep the service safe and working</strong> (prevent misuse, review and verify business listings, fix problems). Basis: our legitimate interest in running a secure, reliable service.</li>
              <li><strong>To understand and improve how the site is used</strong>, through analytics cookies. Basis: your consent, which you can withdraw at any time.</li>
              <li><strong>To meet legal duties</strong>, such as keeping payment records or responding to lawful requests. Basis: legal obligation.</li>
            </ul>
            <p>For people in the United Arab Emirates, we handle your information in line with Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data, usually with your consent or because it is needed to provide the service you asked for.</p>
            <p>We do not sell your personal information, and we do not make decisions about you using fully automated processing.</p>
          </Section>

          <Section title="Who sees it">
            <p><strong>People you choose.</strong> Collaborators you invite can edit your wedding. Venues and vendors you contact see what you send them. Anyone with the link can view your wedding website or registry once you publish it, so share those links carefully.</p>
            <p><strong>The public.</strong> Approved venue and vendor listings, and the content of published wedding sites and public registries, are visible to anyone. Reviews you leave show only your first name.</p>
            <p><strong>Service providers.</strong> We use trusted companies to run WedThread, and they handle data only for that purpose: Supabase (database, sign-in and file storage), Cloudflare (hosting and domain), Resend (email delivery), Stripe (payments), and Google (website analytics through Google Analytics and Tag Manager, and Google Sheets if you choose to connect it).</p>
            <p>We may also share information if the law requires it or to protect people's safety and the service.</p>
          </Section>

          <Section title="Cookies and similar storage">
            <p>We use your browser's storage to keep you signed in and to remember simple preferences, such as a collapsed sidebar and your cookie choice. These are needed for the site to work, so they are always on.</p>
            <p>Analytics cookies are different: Google Analytics, loaded through Google Tag Manager, uses them to tell visits apart and measure how the site is used. We only turn them on if you choose <strong>Accept cookies</strong> in the cookie banner. Until then nothing from Google is loaded. You can change your mind at any time with <strong>Cookie settings</strong> at the bottom of any page, and you can also block or delete cookies in your browser.</p>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Sign-in and preferences</strong> (essential): kept in your browser until you sign out or clear it.</li>
              <li><strong>Cookie choice</strong> (essential): remembers your answer to the banner.</li>
              <li><strong><code>_ga</code> and <code>_ga_*</code></strong> (analytics, only with your consent): set by Google Analytics, lasting up to two years.</li>
            </ul>
          </Section>

          <Section title="How long we keep it">
            <ul className="list-disc space-y-2 pl-5">
              <li><strong>Your account and wedding:</strong> for as long as your account is open. Deleting your wedding in Settings removes its events, guests, RSVPs, seating, budget, messages and website.</li>
              <li><strong>If you ask us to delete your account,</strong> we will do so within one month. Copies in backups or logs are overwritten on a rolling basis.</li>
              <li><strong>Payment records</strong> are kept by Stripe as the law requires.</li>
              <li><strong>Analytics data</strong> is kept for no longer than 14 months.</li>
            </ul>
          </Section>

          <Section title="Your rights">
            <p>You can see and edit most of your information in the app. You also have the right to:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>ask for a copy of your information;</li>
              <li>have it corrected, or deleted;</li>
              <li>ask us to limit how we use it, or object to a use based on our legitimate interests;</li>
              <li>receive the information you gave us in a portable format;</li>
              <li>withdraw your consent at any time (for analytics, use Cookie settings).</li>
            </ul>
            <p>Email us and we will reply within one month. If you are unhappy with how we handle your information, you can complain to the UK's Information Commissioner's Office (<a className={linkClass} href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">ico.org.uk</a>) to the data protection authority in your own country, or, if you are in the UAE, to the UAE Data Office.</p>
          </Section>

          <Section title="Security">
            <p>Data is encrypted in transit, and access to each wedding is limited to its owner and invited collaborators. No system is perfectly secure, so please use a strong, unique password.</p>
          </Section>

          <Section title="Where data is processed">
            <p>We are based in the United Arab Emirates, and our providers store and process information in several countries, which may be different from the one you live in. Where the law requires it, we use approved safeguards, such as the UK International Data Transfer Addendum and the EU Standard Contractual Clauses, to protect information about people in the UK and the European Economic Area when it is handled elsewhere.</p>
          </Section>

          <Section title="Children">
            <p>WedThread is meant for adults planning a wedding and is not directed at children under 16.</p>
          </Section>

          <Section title="Changes">
            <p>If we change this page in a way that matters, we will update the date above and, for significant changes, let account holders know.</p>
          </Section>

          <Section title="Contact">
            <p>Questions or requests about your information: <a className={linkClass} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
          </Section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
