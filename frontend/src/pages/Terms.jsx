import InfoPage, { InfoSection, InfoList, InfoLink, ContactEmail } from '../components/InfoPage'

export default function Terms() {
  return (
    <InfoPage
      title="Terms of Use"
      updated="14 November 2026"
      draft
      intro="By using TekaTech you agree to these terms. Please read them; they are short."
    >
      <InfoSection title="A student project">
        <p>
          TekaTech is a free student course project. It is not a shop, does not sell phones, and is not affiliated
          with any phone brand or seller.
        </p>
      </InfoSection>

      <InfoSection title="Specs and AI answers">
        <InfoList>
          <li>
            Specs are taken from official brand pages, but brands change their pages and products, so a saved spec
            can be out of date.
          </li>
          <li>
            AI answers can be wrong, even when they cite a source. General-knowledge answers are unverified.
          </li>
          <li>Always check the brand&apos;s official page before you buy.</li>
        </InfoList>
      </InfoSection>

      <InfoSection title="Fair use">
        <InfoList>
          <li>Each account can ask 20 AI questions per day; the count resets at 8:00 AM Manila time.</li>
          <li>
            Don&apos;t try to get around the limits, overload the service, or use it to send harmful or abusive
            content, including in spec corrections.
          </li>
          <li>We may suspend or remove accounts that abuse the service.</li>
        </InfoList>
      </InfoSection>

      <InfoSection title="No warranty">
        <p>
          TekaTech is provided &ldquo;as is&rdquo;, without any warranty. It may be unavailable, change or stop at
          any time. We are not responsible for decisions you make based on it.
        </p>
      </InfoSection>

      <InfoSection title="Your data and questions">
        <p>
          How we handle your data is described in the <InfoLink to="/privacy">Privacy Policy</InfoLink>. Questions
          about these terms: <ContactEmail />.
        </p>
      </InfoSection>
    </InfoPage>
  )
}
