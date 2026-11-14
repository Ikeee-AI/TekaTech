import InfoPage, { InfoSection, InfoList, InfoLink } from '../components/InfoPage'

export default function About() {
  return (
    <InfoPage
      title="About TekaTech"
      intro="TekaTech helps you check and compare phone specs before you buy. Every spec links to the brand's official page, and every AI answer cites the spec it came from."
    >
      <InfoSection title="Who it's for">
        <p>
          Phone shoppers in the Philippines, especially anyone who is not a tech expert and wants a straight
          answer to questions like &ldquo;which of these two has the better camera?&rdquo;. Prices are shown in
          Philippine pesos (₱) where we have one.
        </p>
      </InfoSection>

      <InfoSection title="Where the data comes from">
        <InfoList>
          <li>Specs are copied from each brand&apos;s official product page and saved with a link to that page.</li>
          <li>
            The catalog is curated by the TekaTech team: only our admins add phones and specs. When a page
            doesn&apos;t state something, we show &ldquo;Not stated by source&rdquo; instead of guessing.
          </li>
          <li>
            Anyone with an account can suggest a correction to a spec. An admin reviews it, and only approved
            changes reach the specs and AI answers.
          </li>
        </InfoList>
      </InfoSection>

      <InfoSection title="Who makes it">
        <p>
          TekaTech is a student course project built by a five-person team. It is free to use and is not
          affiliated with any phone brand or shop. Read <InfoLink to="/how-it-works">how it works</InfoLink>, the{' '}
          <InfoLink to="/faq">FAQ</InfoLink>, or <InfoLink to="/contact">contact us</InfoLink>.
        </p>
      </InfoSection>
    </InfoPage>
  )
}
