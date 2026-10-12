# Team ownership and real teammate review

Confirmed on 12 October 2026: Ikeee-AI is the one DevOps Engineer, contributes full-stack/frontend work, and is Sprint 1 product owner. Manuel Mirasol (`s2302827-byte`) is a Developer owning backend, database and AI. Only these two members have been declared so far. Ownership describes future responsibility, not authorship of earlier code.

[Private TekaTech Sprint Board](https://github.com/users/Ikeee-AI/projects/1) contains all 13 existing course issues. Workflow: Backlog -> Ready -> In Progress -> In review -> Deployed verification -> Done. Do not mark an item Done until its acceptance criteria and reviewed-merge/CI/deployment checks pass.

## Ownership mapping

| Owner | Issues | Access/assignment state |
| --- | --- | --- |
| Ikeee-AI | #5 frontend; #7 secrets; #9 product owner/roles; #10 review gates; #11 deployment; #13 metrics/recovery | Assignments can be maintained by the repository owner |
| Manuel Mirasol (`s2302827-byte`) | #2 CRUD/backend; #3 AI; #4 API; #6 database; #8 AI/request errors; #12 provider acceptance | Declared responsibility; GitHub assignments and repository/board Write access verified |
| Team, owner to be selected | #14 release/demo | Pending later sprint planning |

Manuel's account, repository Write access and private-board Write access were verified on 12 October 2026 after the owner explicitly approved the grants. Issues #2/3/4/6/8/12 are assigned to him. No review or authored contribution is claimed from this setup.

## Access setup (completed for the declared team)

The steps below are now completed for Manuel; do not send a duplicate invitation. They document the setup path for future confirmed teammates. His repository Write access and board Write access are verified, and all six ownership issues are assigned.

1. Open [TekaTech](https://github.com/Ikeee-AI/TekaTech) -> Settings -> Collaborators -> Add people. Choose exactly `s2302827-byte`, confirm the account with Manuel, and send the repository invitation. A personal private-repository collaborator gets write access; do not share account credentials.
2. Manuel accepts the invitation while signed into his own account.
3. Assign Manuel the six issues listed above using each issue's Assignees control. These are ownership assignments, not a claim that he wrote existing code.
4. If Manuel should edit the private board, open project Settings -> Manage access and give his account Write access. Repository access and project access are separate. Review the destination account before confirming any grant.

## Review before the next merge

This documentation branch supplies a real change to review: declared roles/product owner, board ownership mapping, and the verified main deployment evidence. Keep its PR open until a teammate has reviewed it.

1. Manuel opens the follow-up PR from his own account and reads Files changed. Verify the role table, issue ownership, pipeline links, deployment SHA and the AI limitation. Do not approve without reading or testing the relevant evidence.
2. Open [the deployed catalog](https://tekatech-web.onrender.com), [API health](https://tekatech-api.onrender.com/health) and `/gadgets`. The existing Rog Ally should appear. Opening `/login` directly should work. Do not create or delete production records merely for this documentation review, or run paid AI calls.
3. Manuel selects Review changes, describes what he actually checked, and chooses Approve if satisfied or Request changes if something is wrong. The assistant cannot provide his review or impersonate him.
4. Ikeee-AI resolves feedback and waits for Backend tests, Frontend lint and build, and Database migrations to pass on the latest PR commit. Then merge; the main pipeline must deploy and smoke-check the exact new merge commit.
5. Record the review/CI/main-deployment links in the issue and sprint log. Complete only the acceptance criteria actually met; keep broader CRUD/AI/hardening work open.

PR #15 was merged at the owner's request without another teammate's approval. A later review does not retroactively turn that merge into a reviewed PR. Keep this exception visible and use reviewed PRs going forward.

## Consultation preparation

Bring the live URL, board, actual PR review, main CI run and updated metrics. Each person should explain their responsibility and actual contribution. Add genuine standup notes; write the retrospective after the consultation. The local Ollama probe is temporary Sprint 1 connectivity evidence; deployed application RAG still uses OpenAI and remains credit-blocked.
