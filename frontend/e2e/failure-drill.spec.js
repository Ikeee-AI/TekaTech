// #119: the ask and compare journeys against each failure-drill mode.
// For every failure: the right safe error appears, the typed question is kept,
// and Try Again gives a cited answer without retyping. Runs on a faked API
// (e2e/support/fakeApi.js), so no backend, login or paid model call is needed.
import { test, expect } from '@playwright/test'
import { useFakeApi, drillReply, answer, IPHONE, GALAXY } from './support/fakeApi.js'

// Titles of Mika's failure states (frontend/src/utils/aiAnswerState.js).
const FAILURE_TITLES = {
  timeout: 'The AI Timed Out',
  quota: 'AI Answers Are Unavailable',
  bad_output: 'Unusable AI Response',
}

const JOURNEYS = [
  {
    name: 'ask from a gadget page',
    url: `/gadgets/${IPHONE.id}`,
    panelTitle: `Ask About ${IPHONE.name}`,
    // The gadget page's chat (GadgetChatPanel): the message box empties on send and the
    // question stays on screen as the user's chat bubble.
    boxLabel: `Ask about ${IPHONE.name}`,
    button: 'Send question',
    keepsQuestion: 'bubble',
    question: 'What chip does the iPhone 15 use?',
    gadgetIds: [IPHONE.id],
  },
  {
    name: 'compare two gadgets',
    url: `/compare?ids=${IPHONE.id},${GALAXY.id}`,
    panelTitle: 'AI Trade-Off Comparison',
    boxLabel: 'Question to Ask',
    button: 'Generate Comparison',
    keepsQuestion: 'box',
    question: 'Which one has the better chip?',
    gadgetIds: [IPHONE.id, GALAXY.id],
  },
]

async function askQuestion(page, journey) {
  await page.goto(journey.url)
  const panel = page.getByRole('region', { name: journey.panelTitle })
  await expect(panel).toBeVisible()
  const box = panel.getByLabel(journey.boxLabel)
  await box.fill(journey.question)
  await panel.getByRole('button', { name: journey.button, exact: true }).click()
  return { panel, box }
}

for (const journey of JOURNEYS) {
  test.describe(journey.name, () => {
    for (const [mode, title] of Object.entries(FAILURE_TITLES)) {
      test(`drill "${mode}": safe error, question kept, Try Again recovers`, async ({ page }) => {
        const queries = await useFakeApi(page, [drillReply(mode), answer()])
        const { panel, box } = await askQuestion(page, journey)

        // 1. The safe failure state, never a raw error.
        await expect(panel.getByText(title, { exact: true })).toBeVisible()
        // 2. What the user typed is still there (in the box, or as the chat bubble).
        if (journey.keepsQuestion === 'box') await expect(box).toHaveValue(journey.question)
        else await expect(panel.getByText(journey.question, { exact: true })).toBeVisible()

        // 3. Try Again sends the same question and shows a cited answer, no retyping.
        await panel.getByRole('button', { name: 'Try Again' }).click()
        await expect(panel.getByText(/uses an A-series chip/)).toBeVisible()
        await expect(panel.getByText(title, { exact: true })).toHaveCount(0)

        expect(queries).toHaveLength(2)
        expect(queries[1].question).toBe(journey.question)
        expect(queries[1].gadget_ids).toEqual(journey.gadgetIds)
      })
    }

    test('drill "empty": missing evidence, not an error', async ({ page }) => {
      await useFakeApi(page, [drillReply('empty')])
      const { panel } = await askQuestion(page, journey)
      await expect(panel.getByText('No Evidence Found', { exact: true })).toBeVisible()
      for (const title of Object.values(FAILURE_TITLES)) {
        await expect(panel.getByText(title, { exact: true })).toHaveCount(0)
      }
    })
  })
}
