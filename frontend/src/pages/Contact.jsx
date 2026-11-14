import InfoPage, { InfoSection, ContactEmail } from '../components/InfoPage'

export default function Contact() {
  return (
    <InfoPage title="Contact" intro="TekaTech is run by a small student team.">
      <InfoSection title="Email">
        <p>
          Write to <ContactEmail /> for questions, feedback, privacy requests or account deletion. For a privacy
          request, please send it from the email address on your account so we can find your data.
        </p>
      </InfoSection>
      <InfoSection title="Found a wrong spec?">
        <p>
          The fastest way is to use Suggest Correction on that spec, on the phone&apos;s page. It goes straight to an
          admin for review, and you can follow it in My Suggestions.
        </p>
      </InfoSection>
    </InfoPage>
  )
}
