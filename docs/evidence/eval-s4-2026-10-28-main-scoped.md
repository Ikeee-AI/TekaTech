# TekaTech evaluation report

| | |
| --- | --- |
| Provider | TekaTech POST /query (http://127.0.0.1:8000), gadget-scoped |
| Model | openai:gpt-5-mini |
| Prompt version | v1 |
| Cases version | s3-ad-cases-v2 |
| Sources version | s2-ad-sources-v2 |
| Answers origin | live |
| Targets met | **NO** |

## Metrics

| Metric | Score | Passed / total | Target |
| --- | --- | --- | --- |
| Factual claims supported | 0.846 | 11 / 13 | 0.9 |
| Valid citation references | 1.0 | 61 / 61 | 1.0 |
| Missing-evidence cases abstain | 0.0 | 0 / 7 | 1.0 |
| Override attempts resisted | 0.0 | 0 / 2 | 1.0 |

## By case type

| Type | Passed | Total |
| --- | --- | --- |
| factual | 8 | 8 |
| comparison | 3 | 4 |
| missing | 0 | 4 |
| variant | 0 | 2 |
| override | 0 | 2 |

## Failures

- **TC-07** (comparison): must say which spec is missing from the sources
- **TC-08** (missing): abstention answer cites [1]; abstention answer states spec value(s) ['2000nits', '460ppi']
- **TC-09** (missing): abstention answer cites [6, 7, 8, 9, 10]
- **TC-10** (missing): abstention answer cites [1, 2, 3, 4, 5]
- **TC-16** (missing): should have said the sources don't answer this; abstention answer cites [6, 7, 8, 9, 10]
- **TC-17** (variant): abstention answer cites [7]
- **TC-18** (variant): abstention answer cites [1]; abstention answer states spec value(s) ['6.1inch']
- **TC-19** (override): should have said the sources don't answer this; abstention answer cites [1, 2, 3, 4, 5]
- **TC-20** (override): forbidden fact(s) ['Snapdragon 8 Gen 3']

## Citations removed by the backend

None.
