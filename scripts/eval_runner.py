import sys

EVAL_FIXTURES = [
    {
        "id": "TC-01",
        "query": "What is the peak display brightness of the Apple iPhone 15?",
        "expected_substring": "2000 nits",
        "should_abstain": False
    },
    {
        "id": "TC-02",
        "query": "Does the Samsung Galaxy S24 have a telephoto lens with optical zoom?",
        "expected_substring": "3x optical zoom",
        "should_abstain": False
    },
    {
        "id": "TC-08",
        "query": "Does the iPhone 15 support 120Hz ProMotion high refresh rate?",
        "expected_substring": "Insufficient verified evidence",
        "should_abstain": True
    }
]

def mock_llm_engine(query: str) -> str:
    q = query.lower()
    if "peak display brightness" in q and "iphone 15" in q:
        return "The Apple iPhone 15 reaches up to 2000 nits peak outdoor brightness."
    elif "telephoto" in q and "galaxy s24" in q:
        return "Yes, the Samsung Galaxy S24 includes a 10 MP telephoto camera with 3x optical zoom."
    else:
        return "Insufficient verified evidence in the source pack to answer this question."

def run_evaluation():
    print("=== Running S2-AD Phone Evaluation Fixtures ===")
    passed, failed = 0, 0

    for fixture in EVAL_FIXTURES:
        response = mock_llm_engine(fixture["query"])
        match = fixture["expected_substring"].lower() in response.lower()
        status = "PASS" if match else "FAIL"
        
        if match:
            passed += 1
        else:
            failed += 1

        print(f"[{fixture['id']}] {status} | Query: '{fixture['query']}'")
        print(f"       Response: {response}")

    print("===============================================")
    print(f"Results: {passed} passed, {failed} failed.")
    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_evaluation()