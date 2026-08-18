import Link from 'next/link';
import LegalPage, { Section } from '@/components/LegalPage';

export const metadata = { title: 'Terms, localreg' };

// DRAFT WORDING. The structure is final; the sentences are plain-language
// placeholders to be replaced with reviewed legal copy. Anything factual here
// (price, no trial, review-before-publish) matches how the app actually
// behaves — see app/api/checkout and lib/admin-api.
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      updated="17 August 2026"
      intro="These terms cover your use of localreg, a local business directory. By listing a business here, you agree to what follows."
    >
      <Section title="Overview">
        <p>
          localreg is a directory of local businesses. Visitors can browse and search
          listings for free. Business owners pay a monthly fee to have their listing
          published and kept live.
        </p>
        <p>
          These terms are a working draft while the service is new. If we change
          them in a way that affects you, we will say so. See{' '}
          <strong>Changes to these terms</strong> below.
        </p>
      </Section>

      <Section title="What you're paying for">
        <p>
          A paid listing shows your business name, category, description, contact
          email, website and any photos you upload, on the public directory where
          visitors can browse and search for it.
        </p>
        <p>
          We do not promise a particular position in search results, a level of
          traffic, or any specific number of enquiries or customers.
        </p>
      </Section>

      <Section title="Billing and cancellation">
        <p>
          A listing costs <strong>$5.00 USD per month</strong>, reduced from our
          original price of <s>$9.99 per month</s>. Billing starts immediately when
          you sign up, so there is <strong>no trial period</strong> and no
          introductory rate that later increases. The charge repeats each month
          until you cancel.
        </p>
        <p>
          You can cancel at any time from your billing portal. There are no
          cancellation fees. Cancelling stops future charges; we do not refund the
          current period by default, though you are welcome to get in touch if
          something has gone wrong.
        </p>
        <p>
          Payments are processed by Stripe. We never receive or store your full card
          details.
        </p>
      </Section>

      <Section title="Listing review and approval">
        <p>
          Every submission is reviewed by a person before it goes live, so a new
          listing does not appear instantly. We may ask you to change details, or
          decline a listing that does not fit the directory.
        </p>
        <p>
          You are responsible for the accuracy of what you submit, and for having the
          right to use any photos you upload.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>Please do not use localreg to:</p>
        <ul>
          <li>List a business you do not own or are not authorised to represent.</li>
          <li>Post content that is unlawful, misleading, or infringes someone else&apos;s rights.</li>
          <li>Submit content that is obscene, harassing, or hateful.</li>
          <li>Attempt to disrupt, overload, or gain unauthorised access to the service.</li>
        </ul>
      </Section>

      <Section title="Termination">
        <p>
          You can end your listing at any time by cancelling your subscription. We may
          suspend or remove a listing that breaks these terms, is fraudulent, or
          whose payment fails.
        </p>
        <p>
          If we remove a listing for a reason that is not your fault, we will stop
          billing you for it.
        </p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          We may update these terms as the service develops. The &quot;last updated&quot; date
          at the top will change when we do. If a change materially affects your
          listing or what you pay, we will contact you at the email on your listing
          before it takes effect.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these terms, or about your listing, can go to{' '}
          <a href="mailto:support@localreg.com">support@localreg.com</a>. To change
          or remove a live listing, use{' '}
          <Link href="/request-change">Manage listing</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
