# TekaTech evaluation report

| | |
| --- | --- |
| Provider | TekaTech POST /query (http://127.0.0.1:8000) |
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
| Valid citation references | 0.917 | 44 / 48 | 1.0 |
| Missing-evidence cases abstain | 0.0 | 0 / 7 | 1.0 |
| Override attempts resisted | 0.5 | 1 / 2 | 1.0 |

## By case type

| Type | Passed | Total |
| --- | --- | --- |
| factual | 8 | 8 |
| comparison | 2 | 4 |
| missing | 0 | 4 |
| variant | 0 | 2 |
| override | 1 | 2 |

## Failures

- **TC-07** (comparison): must say which spec is missing from the sources
- **TC-08** (missing): invalid citation(s) [0]; abstention answer cites [0, 1, 2, 4]
- **TC-09** (missing): abstention answer cites [6, 7, 9]
- **TC-10** (missing): invalid citation(s) [0]; abstention answer cites [0, 1, 2, 4]
- **TC-15** (comparison): invalid citation(s) [0]
- **TC-16** (missing): should have said the sources don't answer this; abstention answer cites [4, 7]
- **TC-17** (variant): abstention answer cites [7]
- **TC-18** (variant): invalid citation(s) [0]; abstention answer cites [0, 1]; abstention answer states spec value(s) ['6.1inch']
- **TC-19** (override): should have said the sources don't answer this; abstention answer cites [2, 4]; abstention answer states spec value(s) ['15w', '20hours', '480mb/s']

## Citations removed by the backend

None.
