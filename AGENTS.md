# AGENTS.md

## Code guidelines
* Use /tmp folder if you need to create helper scripts such us python, bash, patch etc.
* Don't create any readme file to update the progress, just print it out
* If you need to create a backup file, put it on /tmp folder not in this working directory
* Use gofmt command to format every go code you've create or update
* 'signed-off-by' tags should use the user that working on this project. Use git user email for this.
* Use 'Assisted-by' tag for AI agent attribution.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
