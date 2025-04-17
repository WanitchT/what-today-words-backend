const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 4000;

const supabase = require('./supabase');
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
  apis: ['./server.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.post('/api/baby', async (req, res) => {
  const { name } = req.body;
  const { data, error } = await supabase.from('baby').insert({ name }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

app.get('/api/babies', async (req, res) => {
  const { data, error } = await supabase.from('baby').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/baby/:id', async (req, res) => {
  const { data, error } = await supabase.from('baby').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ message: 'Baby not found' });
  res.json(data);
});

app.put('/api/baby/:id', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });

  const { data, error } = await supabase.from('baby').update({ name }).eq('id', req.params.id);
  if (error || data.length === 0) return res.status(404).json({ message: 'Baby not found' });

  res.json({ message: 'Baby updated successfully' });
});

app.delete('/api/baby/:id', async (req, res) => {
  const { error } = await supabase.from('baby').delete().eq('id', req.params.id);
  if (error) return res.status(404).json({ message: 'Baby not found' });
  res.json({ message: 'Baby deleted successfully' });
});

app.post('/api/words', async (req, res) => {
  const { word, date, babyId, category } = req.body;
  const { data, error } = await supabase
    .from('words')
    .insert({ word, date, baby_id: babyId, category })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

app.get('/api/words/:babyId', async (req, res) => {
  const { data, error } = await supabase
    .from('words')
    .select('id, word, date, category')
    .eq('baby_id', req.params.babyId);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/words/:id', async (req, res) => {
  const { error } = await supabase.from('words').delete().eq('id', req.params.id);
  if (error) return res.status(404).json({ message: 'Word not found' });
  res.json({ message: 'Word deleted successfully' });
});

app.patch('/api/words/:id', async (req, res) => {
  const { category } = req.body;
  const { error } = await supabase.from('words').update({ category }).eq('id', req.params.id);
  if (error) return res.status(404).json({ message: 'Word not found' });
  res.json({ message: 'Category updated' });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
