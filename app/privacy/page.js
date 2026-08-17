import FormPage, { FormHeading } from '@/components/FormPage';

export const metadata = { title: 'Privacy — localreg' };

// Placeholder so the footer link resolves to a real page instead of a 404.
// The actual policy is not written yet.
export default function PrivacyPage() {
  return (
    <FormPage>
      <FormHeading
        title="Privacy policy"
        subtitle="Coming soon — we're writing this up. Email us in the meantime and we'll answer anything you need to know."
      />
    </FormPage>
  );
}
