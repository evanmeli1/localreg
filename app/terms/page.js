import FormPage, { FormHeading } from '@/components/FormPage';

export const metadata = { title: 'Terms — localreg' };

// Placeholder so the footer link resolves to a real page instead of a 404.
// The actual policy is not written yet.
export default function TermsPage() {
  return (
    <FormPage>
      <FormHeading
        title="Terms of service"
        subtitle="Coming soon — we're writing these up. Email us in the meantime and we'll answer anything you need to know."
      />
    </FormPage>
  );
}
