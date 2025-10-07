Server (Express + MySQL)

Setup
1. Copy `.env.example` to `.env` and fill your DB credentials.
2. Create the database and table (example SQL below).
3. Install and run:

```powershell
cd server
npm install
npm run start
```

Example SQL

```sql
CREATE DATABASE kanban_db;
USE kanban_db;

CREATE TABLE tasks (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  `desc` TEXT,
  `column` VARCHAR(32) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

API Endpoints
- GET /api/tasks
- POST /api/tasks
- PUT /api/tasks/:id
- DELETE /api/tasks/:id

Notes
- The server accepts client-generated IDs. If you prefer auto-increment ids, update the schema and server accordingly.
