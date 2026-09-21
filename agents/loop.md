Steps to run in each loop.
1. Check the task list and pick the highest prio **open** task
2. Make task specs if they are unclear
3. Implement the task with TDD, in this order — never skip ahead:
   a. the tool, as a standalone CLI
   b. a test that runs the tool WITHOUT the agent
   c. its skill file, so the model knows when to reach for it
   d. wire it into the agent loop
4. Run and fix unit tests until all ok — they must pass with no
   API key, because the numbers come from the core module
5. Review and audit the change until it passes the audit 100%
6. Test the result in the browser, fix UI and UX issues
7. Mark the task **done** in the list below when it passes
   audit + browser

## Task list (highest prio first)

| Prio | Status | Task |
|------|--------|------|
| 1 | done | cake_database_tool: query cakes by dietary, serving, name · Full CLI+tests(9✓)+skill+audit ✓ |
| 2 | done | API (FastAPI) /recommend endpoint + /health + /cakes · tested ✓ on :8003 |
| 3 | done | Flask UI for cake recommendations · HTML form + results on :5003 ✓ |