import InfoPage, { InfoSection, InfoList, InfoLink } from '../components/InfoPage'

export default function HowItWorksPage() {
  return (
    <InfoPage
      title="How it works"
      intro="TekaTech only answers from specs it has saved, and it shows you where each fact came from."
    >
      <InfoSection title="1. Sourced specs">
        <p>
          Each phone&apos;s specs are saved from the brand&apos;s official page, with a link to that page and the
          date it was checked. The key-spec tiles (RAM, storage, main camera and display refresh rate) are read
          from that saved text. If the source doesn&apos;t state a value, the tile says &ldquo;Not stated by
          source&rdquo;: we never fill gaps with guesses.
        </p>
      </InfoSection>

      <InfoSection title="2. Compare side by side">
        <p>Pick phones from the catalog to see their key specs next to each other, and share a comparison by link.</p>
      </InfoSection>

      <InfoSection title="3. Ask the AI, with numbered citations">
        <InfoList>
          <li>
            When you ask a question, TekaTech finds the saved specs that match it and sends only those to the AI
            model, which writes the answer.
          </li>
          <li>
            Facts in the answer carry numbered citations like [1] and [2]. Select a number to jump to the saved spec
            it came from, with its source link.
          </li>
          <li>
            If no saved spec covers your question, you see &ldquo;No Evidence Found&rdquo; instead of an invented
            answer.
          </li>
        </InfoList>
      </InfoSection>

      <InfoSection title="General knowledge is opt-in and labelled">
        <p>
          You can turn on a general-knowledge answer for questions our specs don&apos;t cover. It is off by default,
          has no citations, and is clearly labelled as unverified, so check it against the official page.
        </p>
      </InfoSection>

      <InfoSection title="Fair use: 20 AI questions a day">
        <p>
          Each account can ask 20 AI questions per day. The count resets at 8:00 AM Manila time. There is also a
          short per-minute limit to protect the service.
        </p>
      </InfoSection>

      <InfoSection title="Corrections are reviewed by admins">
        <p>
          Spot a mistake? Open the phone&apos;s specs and use Suggest Correction. An admin reviews every suggestion,
          and you can follow its status in My Suggestions. Only approved corrections change what the AI sees.
        </p>
      </InfoSection>

      <p>
        More questions? See the <InfoLink to="/faq">FAQ</InfoLink>.
      </p>
    </InfoPage>
  )
}
