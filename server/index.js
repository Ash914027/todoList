require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

let pool;
async function initDb(){
  pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'ashish',
    waitForConnections: true,
    connectionLimit: 10,
  });
  // simple check
  const [rows] = await pool.query('SELECT 1');
  console.log('DB connected');
}

app.get('/api/health', (req, res) => res.json({ok:true}));

app.get('/api/tasks', async (req, res) => {
  try{
    const [rows] = await pool.query('SELECT id, title, `desc`, `column`, created_at, updated_at FROM tasks ORDER BY updated_at DESC');
    res.json(rows);
  }catch(err){
    console.error(err);
    res.status(500).json({error:'db error'});
  }
});

app.post('/api/tasks', async (req, res) => {
  try{
    const {id, title, desc, column} = req.body;
    if(!id || !title || !column) return res.status(400).json({error:'missing fields'});
    await pool.query('INSERT INTO tasks (id,title,`desc`,`column`) VALUES (?,?,?,?)', [id,title,desc||null,column]);
    res.status(201).json({id,title,desc,column});
  }catch(err){
    console.error(err);
    res.status(500).json({error:'db error'});
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try{
    const id = req.params.id;
    const {title, desc, column} = req.body;
    await pool.query('UPDATE tasks SET title = ?, `desc` = ?, `column` = ? WHERE id = ?', [title, desc||null, column, id]);
    res.json({id,title,desc,column});
  }catch(err){
    console.error(err);
    res.status(500).json({error:'db error'});
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try{
    const id = req.params.id;
    await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
    res.json({ok:true});
  }catch(err){
    console.error(err);
    res.status(500).json({error:'db error'});
  }
});

initDb().then(() => {
  app.listen(PORT, ()=>console.log('Server running on',PORT));
}).catch(err => {
  console.error('Failed to init DB',err);
  process.exit(1);
});
