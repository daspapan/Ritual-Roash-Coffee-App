

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
    email TEXT UNIQUE NOT NULL,
    name TEXT
);

-- init-db/init.sql
CREATE TABLE IF NOT EXISTS tests (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT FALSE
);

-- Optional: Add some initial data
INSERT INTO tests (title, completed) VALUES
('Learn Docker 1', TRUE),
('Build Next.js App 1', FALSE),
('Deploy to Fargate 1', FALSE);


CREATE TYPE "TodoStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');
CREATE TYPE "TodoPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP,
    due_date TIMESTAMP,
    status "TodoStatus" NOT NULL DEFAULT 'TODO',
    priority "TodoPriority" NOT NULL DEFAULT 'LOW',
    assignee TEXT NOT NULL DEFAULT 'self',
    remark TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
