import InfoPage, { InfoSection, InfoList, InfoLink, ContactEmail } from '../components/InfoPage'

// Every item below was checked against the code on 14 Nov 2026: backend/routers (query.py,
// my_gadgets.py, corrections.py, ai_usage.py), backend/ai_quota.py, backend/rate_limit.py,
// backend/answer_cache.py, backend/sql and the frontend auth/theme code. Change this page when
// what the app stores changes.
const PROCESSORS = [
  ['Supabase', 'database and sign-in (stores your account and everything listed above)'],
  ['OpenAI', 'receives your question and the matching saved specs to write the AI answer; not your email or account'],
  ['Brevo', 'sends account emails such as sign-up confirmation and password reset'],
  ['Railway', 'hosts the TekaTech API that handles your requests'],
  ['Render', 'hosts the TekaTech website'],
  ['Google Fonts', 'serves the site’s fonts, so your browser asks Google for them'],
]

export default function Privacy() {
  return (
    <InfoPage
      title="Privacy Policy"
      updated="14 November 2026"
      draft
      intro="This page lists exactly what TekaTech stores about you, why, for how long, and who helps us run the service."
    >
      <InfoSection title="What we store">
        <InfoList>
          <li>
            <strong className="font-semibold text-slate-900">Your account:</strong> your email address and
            password, handled by Supabase Auth. We never see your password in plain text.
          </li>
          <li>
            <strong className="font-semibold text-slate-900">My Gadgets:</strong> the phones you save, and when you
            saved them.
          </li>
          <li>
            <strong className="font-semibold text-slate-900">Your questions about a phone:</strong> when you are
            signed in and ask about one phone, we save the question and the AI answer (with its sources) so you can
            see the conversation later. We keep the newest 100 per phone and delete older ones.
          </li>
          <li>
            <strong className="font-semibold text-slate-900">Spec corrections:</strong> the text you suggest, your
            account ID, and the review status and date.
          </li>
          <li>
            <strong className="font-semibold text-slate-900">Question history:</strong> for analytics and the
            &ldquo;popular questions&rdquo; list shown to signed-in users, we record questions and answers that
            cover the whole catalog or a comparison, with the phones they mention. These records are not linked to
            your account. A signed-in question about one phone is recorded only as &ldquo;[private
            question]&rdquo;, without its text. General-knowledge answers are not recorded.
          </li>
          <li>
            <strong className="font-semibold text-slate-900">Usage counts:</strong> the number of AI tokens each
            question used, to track our AI costs.
          </li>
          <li>
            <strong className="font-semibold text-slate-900">Shared comparisons:</strong> a comparison link stores
            only the list of phones, not who made it.
          </li>
        </InfoList>
      </InfoSection>

      <InfoSection title="What we use only briefly">
        <InfoList>
          <li>
            Your IP address is used to apply per-minute rate limits. It is held in the API server&apos;s memory for
            that purpose and not saved in our database.
          </li>
          <li>
            Your daily AI question count is kept against your account ID until the day ends (8:00 AM Manila time).
          </li>
          <li>
            To answer repeated questions faster, recent questions and answers may stay in the server&apos;s memory
            for up to one hour.
          </li>
        </InfoList>
      </InfoSection>

      <InfoSection title="Stored in your browser">
        <p>
          Your sign-in session, your theme choice (dark or light), and when you last saw your correction decisions
          are kept in your browser&apos;s local storage. A few short-lived flags (for example during a password
          reset) use session storage. We use no advertising or tracking cookies.
        </p>
      </InfoSection>

      <InfoSection title="Why we use it">
        <InfoList>
          <li>To run your account and the features you use: My Gadgets, saved questions and corrections.</li>
          <li>To answer AI questions and keep the service fair (daily and per-minute limits).</li>
          <li>To understand which questions people ask and what the AI costs us.</li>
        </InfoList>
        <p>We do not sell your data or use it for advertising.</p>
      </InfoSection>

      <InfoSection title="Who processes it for us">
        <ul className="flex flex-col gap-1.5">
          {PROCESSORS.map(([name, role]) => (
            <li key={name}>
              <strong className="font-semibold text-slate-900">{name}</strong> — {role}
            </li>
          ))}
        </ul>
      </InfoSection>

      <InfoSection title="How long we keep it">
        <p>
          Your account, My Gadgets, saved questions (newest 100 per phone) and corrections are kept until you
          delete them or ask us to delete your account. Question history and usage counts are kept for analytics
          and are not linked to your account. You can remove saved phones and clear your saved questions for a
          phone at any time.
        </p>
      </InfoSection>

      <InfoSection title="Your rights">
        <p>
          Under the Philippine Data Privacy Act of 2012 (Republic Act No. 10173), you have the right to access the
          personal data we hold about you, to have it corrected, and to have it deleted. Email <ContactEmail /> from
          the address on your account and we will respond. See also our{' '}
          <InfoLink to="/terms">Terms of Use</InfoLink>.
        </p>
      </InfoSection>
    </InfoPage>
  )
}
