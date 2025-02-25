import express from "express";
import bodyParser from "body-parser";
import 'dotenv/config';
import pg from "pg";
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3000;

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false,
  },
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
  } else {
    console.log('Connected to the database');
  }
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(cors());

// Add middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} request for '${req.url}'`);
  next();
});

// Add middleware to set request timeout
app.use((req, res, next) => {
  req.setTimeout(10000); // Set request timeout to 10 seconds
  next();
});

app.get("/api/notes", async (req, res) => {
  console.log('Received request to fetch notes');
  try {
    const result = await db.query("SELECT * FROM notes ORDER BY created_at DESC");
    const notes = result.rows;
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

app.post('/api/notes', async (req, res) => {
  console.log('Received request to add a note');
  const { title, content } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING *',
      [title, content]
    );
    const newNote = result.rows[0];
    res.json({ message: 'Note added successfully', note: newNote });
  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

app.put('/api/notes/:id', async (req, res) => {
  const noteId = req.params.id;
  const { title, content } = req.body;
  try {
    const result = await db.query(
      'UPDATE notes SET title = $1, content = $2 WHERE id = $3 RETURNING *',
      [title, content, noteId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    const updatedNote = result.rows[0];
    res.json({ message: 'Note updated successfully', note: updatedNote });
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  const noteId = req.params.id;
  console.log('Received request to delete note with id:', noteId);
  try {
    const result = await db.query("DELETE FROM notes WHERE id = $1 RETURNING *", [noteId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ message: 'Note deleted successfully', note: result.rows[0] });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}.`);
});
