import InfoPage, { InfoSection, InfoLink, ContactEmail } from '../components/InfoPage'

export default function Faq() {
  return (
    <InfoPage title="Frequently asked questions">
      <InfoSection title="Is TekaTech free?">
        <p>Yes. TekaTech is a free student project. There are no paid plans and nothing to buy here.</p>
      </InfoSection>

      <InfoSection title="Why do I need an account?">
        <p>
          Anyone can browse the catalog. A free account is needed to view a phone&apos;s full specs, compare phones
          and ask the AI. Every AI answer costs us money, so accounts let us keep a fair daily limit for everyone.
          An account also lets you save phones to My Gadgets and keep your questions about each phone.
        </p>
      </InfoSection>

      <InfoSection title="How many AI questions can I ask?">
        <p>
          20 per day per account. The count resets every day at 8:00 AM Manila time. The AI panel shows how many
          you have left.
        </p>
      </InfoSection>

      <InfoSection title="Why does a spec say &ldquo;Not stated by source&rdquo;?">
        <p>
          We only show what the brand&apos;s official page states. If that page doesn&apos;t mention a value, we
          say so rather than guess or copy a number from an unofficial site.
        </p>
      </InfoSection>

      <InfoSection title="Why do some phones have no price?">
        <p>
          We only list a price when we have one from a source we trust. Prices change often and some brands
          don&apos;t publish one, so a phone may show &ldquo;No price yet&rdquo;. Check the seller for the current
          price.
        </p>
      </InfoSection>

      <InfoSection title="Can the AI be wrong?">
        <p>
          Yes. Answers are built from our saved specs and cite them, but the model can still misread or summarise
          badly. Select the citation numbers to check, and confirm on the official page before you buy. Answers
          marked as general knowledge are unverified.
        </p>
      </InfoSection>

      <InfoSection title="How do I suggest a correction?">
        <p>
          Sign in, open the phone, and use Suggest Correction on the spec that is wrong. An admin reviews it, and
          you can follow the decision in My Suggestions.
        </p>
      </InfoSection>

      <InfoSection title="Can I delete my data?">
        <p>
          You can remove phones from My Gadgets and clear your saved questions for a phone yourself. To delete your
          account and everything linked to it, email <ContactEmail /> from the address you signed up with. See the{' '}
          <InfoLink to="/privacy">Privacy Policy</InfoLink> for what we store.
        </p>
      </InfoSection>

      <InfoSection title="Who adds the phones?">
        <p>
          The TekaTech team. Only our admins can add phones and specs, and each spec is taken from an official
          page.
        </p>
      </InfoSection>
    </InfoPage>
  )
}
