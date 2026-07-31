# Contributing to Everything Share

Thanks for helping make Everything Share better! This document walks you through the practical bits of contributing code, docs, or bug reports.

## Ways to contribute

- 🐛 **Report a bug** — open a [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md).
- 💡 **Propose a feature** — open a [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md).
- 📖 **Improve docs** — edits to `README.md`, `docs/**`, or code comments are always welcome.
- 🧪 **Add tests** — coverage lives under `backend/tests/` and (soon) `frontend/__tests__/`.
- 🎨 **Design & UX** — attach mockups or Figma links to your issue.

## Development setup

See the "Running locally" section of the [README](README.md).

## Branching & commit style

- Branch from `main`: `git checkout -b feat/short-description`
- Use conventional commits when possible: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
- Keep PRs focused — one topic per PR is easier to review.

## Coding standards

- **Backend** — Python 3.10+, type hints on public functions, `black` formatting, `flake8`/`mypy` clean.
- **Frontend** — TypeScript strict mode, React function components, `expo lint`. Never use `Alert`, always use bottom sheets or toasts. Test-IDs are required on every interactive element (kebab-case).
- **Never** commit secrets. `.env` files are git-ignored.

## Running the linters

```bash
# Backend
cd backend && black . && flake8 .

# Frontend
cd frontend && yarn lint
```

## Pull requests

1. Ensure `yarn lint` (frontend) and the backend tests pass locally.
2. Fill out the [pull request template](.github/PULL_REQUEST_TEMPLATE.md) — screenshots or short GIFs make review 10× faster.
3. Reference the issue you're fixing (`Closes #123`).
4. A maintainer will review within a few days.

## Code of conduct

Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). We enforce it kindly but firmly.

## License

By contributing you agree that your code will be released under the MIT License (see [LICENSE](LICENSE)).
