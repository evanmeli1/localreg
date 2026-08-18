import Link from 'next/link';
import LegalPage, { Section } from '@/components/LegalPage';

export const metadata = { title: 'Privacy, localreg' };

// DRAFT WORDING, final structure. The processor list below is deliberately
// limited to what the code actually uses: Stripe (lib/stripe.js), Supabase
// (lib/supabase*.js, including Storage for photos) and Discord (lib/discord.js).
// Do not add claims here that the app does not actually do.
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="17 August 2026"
      intro="This explains what localreg collects when you list a business, why, and who else is involved in handling it."
    >
      <Section title="What we collect">
        <p>When you submit a listing, we collect:</p>
        <ul>
          <li>Your business name, category and description.</li>
          <li>Your contact email address.</li>
          <li>Your website address, if you give one.</li>
          <li>Any photos you choose to upload.</li>
          <li>Payment information, handled by Stripe.</li>
        </ul>
        <p>
          <strong>We never see or store your card details.</strong> Card data goes
          directly to Stripe on their own checkout page. What reaches us is an
          identifier for your customer and subscription, so we know which listing a
          payment belongs to.
        </p>
        <p>
          We also keep a small internal log of actions on a listing (submitted,
          approved, rejected, cancelled) so we can tell what happened to it and when.
        </p>
      </Section>

      <Section title="How we use it">
        <p>
          Your business name, category, description, website and photos are published
          on the public directory. That is the point of the service, so assume anything
          in your listing is public.
        </p>
        <p>
          Your contact email is <strong>not</strong> shown publicly on the listing. We
          use it to reach you about your submission: to confirm it, to send your
          listing reference ID when it is approved, and to answer questions you send us.
        </p>
        <p>Payment information is used to bill your subscription and nothing else.</p>
      </Section>

      <Section title="Third parties">
        <p>We use these services to run localreg:</p>
        <ul>
          <li>
            <strong>Stripe</strong> processes payments and stores your card details.
            Your payment data is handled under Stripe&apos;s own privacy policy.
          </li>
          <li>
            <strong>Supabase</strong> hosts our database and the storage bucket that
            holds uploaded listing photos.
          </li>
          <li>
            <strong>Discord</strong> receives an internal notification when a listing
            is submitted, approved, rejected, or a change is requested, so we notice it
            promptly. These messages include the business name and category, and the
            contact email on new submissions.
          </li>
        </ul>
        <p>We do not sell your data, and we do not share it for advertising.</p>
      </Section>

      <Section title="Data retention">
        <p>
          We keep your listing and its details for as long as the listing exists. If
          you cancel or we remove the listing, we keep the record and its action log
          for a period afterwards so we have an account of the transaction, then
          delete or anonymise it.
        </p>
        <p>
          Stripe keeps its own payment records independently, under its retention rules.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You can ask us to correct or remove your information. The quickest route is{' '}
          <Link href="/request-change">Manage listing</Link>, which asks for the
          reference ID from your approval email so we know the request is really coming
          from the listing&apos;s owner.
        </p>
        <p>
          You can also email us directly to ask what we hold about you, to have it
          corrected, or to have your listing and details deleted. Depending on where
          you live you may have additional rights over your personal data, and we will
          honour those requests.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Privacy questions and data requests go to{' '}
          <a href="mailto:support@localreg.com">support@localreg.com</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
