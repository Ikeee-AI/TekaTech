# Prompts & Evaluation Documentation (S2-AD)

This directory contains the ground truth prompt specifications, verified gadget source packs, and test case fixtures for TekaTech.

## Overview
- **`S2-AD-prompt-spec.md`**: Prompt rules for answer generation, inline citation formatting, comparison guidelines, and insufficient-evidence abstention behavior. It includes the verified source pack for **Apple iPhone 15** and **Samsung Galaxy S24** along with 10 initial evaluation test cases.

## Execution
To run the executable scoring script locally and verify test cases:

```bash
python scripts/eval_runner.py