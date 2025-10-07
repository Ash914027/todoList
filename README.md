Todo List (Kanban)

What this is
- A tiny static Todo/Kanban board built with HTML, CSS and vanilla JavaScript.
- Four columns: Backlog, Not Started, In Progress, Done.
- Add cards using the form. Drag & drop cards between columns.
- Data is saved to `localStorage` so it persists in your browser.

How to use
1. Open `index.html` in your browser.
2. Add a task title, choose a column and click Add Card.
3. Drag cards between columns to update a task's status.

Optional: serve locally (recommended when testing drag/drop in some browsers)
In PowerShell, from the project folder run:

```powershell
python -m http.server 8000
# then open http://localhost:8000 in your browser
```

Notes / assumptions
- You asked for "four options backlog, not started in progress" — I added a fourth column called "Done" for a complete workflow. If you'd rather a different fourth state, tell me and I'll rename it.

Next steps you might want
- Add descriptions and due dates per task.
- Add keyboard shortcuts, filtering, or search.
- Add multi-user sync with a backend (Firebase, etc.).
