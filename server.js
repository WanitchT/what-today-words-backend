const express = require('express');
const cors = require('cors');
const db = require('./db');
const app = express();
const PORT = 4000;

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

app.use(cors());
app.use(express.json());

const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'What Today Words API',
        version: '1.0.0',
        description: 'API for tracking words spoken by your baby',
      },
      servers: [
        {
          url: 'http://localhost:4000',
        },
      ],
    },
    apis: ['./server.js'], // Path to your API docs
  };
  
  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


// Save baby name (only once)
/**
 * @swagger
 * /api/baby:
 *   post:
 *     summary: Add a new baby
 *     tags:
 *       - Baby
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Emma
 *     responses:
 *       200:
 *         description: Baby added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 */
app.post('/api/baby', (req, res) => {
    const { name } = req.body;
    const stmt = db.prepare('INSERT INTO baby (name) VALUES (?)');
    const result = stmt.run(name);
    res.json({ id: result.lastInsertRowid });
  });

// Add word
/**
 * @swagger
 * /api/words:
 *   post:
 *     summary: Add a new word spoken by the baby
 *     tags:
 *       - Words
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - word
 *               - date
 *               - babyId
 *             properties:
 *               word:
 *                 type: string
 *                 example: mama
 *               date:
 *                 type: string
 *                 format: date
 *                 example: 2025-04-07
 *               babyId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Word added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 */
app.post('/api/words', (req, res) => {
    const { word, date, babyId } = req.body;
    const stmt = db.prepare('INSERT INTO words (word, date, baby_id) VALUES (?, ?, ?)');
    const result = stmt.run(word, date, babyId);
    res.json({ id: result.lastInsertRowid });
  });
  

// Get words (with ID)
/**
 * @swagger
 * /api/words/{babyId}:
 *   get:
 *     summary: Get all words spoken by a baby
 *     tags:
 *       - Words
 *     parameters:
 *       - in: path
 *         name: babyId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: List of words
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   word:
 *                     type: string
 *                     example: mama
 *                   date:
 *                     type: string
 *                     format: date
 *                     example: 2025-04-07
 */
app.get('/api/words/:babyId', (req, res) => {
    const stmt = db.prepare('SELECT id, word, date FROM words WHERE baby_id = ?');
    const words = stmt.all(req.params.babyId);
    res.json(words);
  });

// Delete a word by ID
/**
 * @swagger
 * /api/words/{id}:
 *   delete:
 *     summary: Delete a word by its ID
 *     tags:
 *       - Words
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 3
 *     responses:
 *       200:
 *         description: Word deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Word deleted successfully
 *       404:
 *         description: Word not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Word not found
 */
app.delete('/api/words/:id', (req, res) => {
    const stmt = db.prepare('DELETE FROM words WHERE id = ?');
    const result = stmt.run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Word not found' });
    }
    res.json({ message: 'Word deleted successfully' });
  });


// Get a single baby by ID
app.get('/api/baby/:id', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM baby WHERE id = ?');
    const baby = stmt.get(req.params.id);

    if (!baby) return res.status(404).json({ message: 'Baby not found' });
    res.json(baby);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all babies
// Get all babies (better-sqlite3)
app.get('/api/babies', (req, res) => {
  try {
    const stmt = db.prepare(`SELECT * FROM baby`);
    const babies = stmt.all();
    res.json(babies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// app.get('/api/baby/:id', (req, res) => {
//   try {
//     const stmt = db.prepare(`SELECT * FROM baby WHERE id = ?`);
//     const baby = stmt.get(req.params.id);

//     if (!baby) return res.status(404).json({ message: 'Baby not found' });
//     res.json(baby);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// Delete a baby by ID
app.delete('/api/baby/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM baby WHERE id = ?');
    const result = stmt.run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Baby not found' });
    }

    res.json({ message: 'Baby deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));