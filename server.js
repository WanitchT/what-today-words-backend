const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 4000;

const supabase = require("./supabase");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

app.use(cors());
app.use(express.json());

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "What Today Words API",
      version: "1.0.0",
      description: "API for tracking words spoken by your baby",
    },
    servers: [
      {
        url: "http://localhost:4000",
      },
    ],
  },
  apis: ["./server.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.post("/api/baby", async (req, res) => {
  const { name, userId, photoUrl } = req.body;

  const { data, error } = await supabase
    .from("baby")
    .insert({ name, user_id: userId, photo_url: photoUrl || null })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

app.get("/api/babies", async (req, res) => {
  const userId = req.query.userId;
  const { data, error } = await supabase
    .from("baby")
    .select("*")
    .eq("user_id", userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get("/api/baby/:id", async (req, res) => {
  const babyId = req.params.id;
  const userId = req.query.userId;

  const { data, error } = await supabase
    .from("baby")
    .select("*")
    .eq("id", babyId)
    .eq("user_id", userId)
    .single();

  if (error || !data)
    return res.status(404).json({ message: "Baby not found or unauthorized" });

  res.json(data);
});

app.put("/api/baby/:id", async (req, res) => {
  const { name, photoUrl } = req.body;
  if (!name) return res.status(400).json({ message: "Name is required" });

  const { data, error } = await supabase
    .from("baby")
    .update({ name, photo_url: photoUrl || null })
    .eq("id", req.params.id)
    .select();

  if (error || !data || data.length === 0) {
    return res.status(404).json({ message: "Baby not found or update failed" });
  }

  res.json({ message: "Baby updated successfully", baby: data[0] });
});

app.delete("/api/baby/:id", async (req, res) => {
  const { error } = await supabase
    .from("baby")
    .delete()
    .eq("id", req.params.id);
  if (error) return res.status(404).json({ message: "Baby not found" });
  res.json({ message: "Baby deleted successfully" });
});

app.post('/api/words', async (req, res) => {
  const { word, date, babyId, category, userId } = req.body;

  if (!word || !date || !babyId || !userId) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabase
      .from('words')
      .insert([
        { word, date, baby_id: babyId, category, user_id: userId }
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ message: 'Failed to add word', error: error.message });
    }

    res.json({ id: data.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/words/:babyId", async (req, res) => {
  const babyId = req.params.babyId;
  const userId = req.query.userId;

  const { data: babyCheck } = await supabase
    .from("baby")
    .select("id")
    .eq("id", babyId)
    .eq("user_id", userId)
    .single();

  if (!babyCheck)
    return res.status(403).json({ message: "Unauthorized access" });

  const { data, error } = await supabase
    .from("words")
    .select("id, word, date, category")
    .eq("baby_id", babyId);

  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

app.delete('/api/words/:id', async (req, res) => {
  const wordId = req.params.id;
  const userId = req.query.userId;

  try {
    const { data: word, error: fetchError } = await supabase
      .from('words')
      .select('user_id')
      .eq('id', wordId)
      .single();

    if (fetchError || !word) {
      return res.status(404).json({ message: 'Word not found' });
    }

    if (word.user_id !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { error: deleteError } = await supabase
      .from('words')
      .delete()
      .eq('id', wordId);

    if (deleteError) {
      return res.status(500).json({ message: 'Failed to delete word' });
    }

    res.json({ message: 'Word deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/words/:id', async (req, res) => {
  const wordId = req.params.id;
  const { category } = req.body;
  const userId = req.query.userId;

  try {
    const { data: word, error: fetchError } = await supabase
      .from('words')
      .select('user_id')
      .eq('id', wordId)
      .single();

    if (fetchError || !word) {
      return res.status(404).json({ message: 'Word not found' });
    }

    if (word.user_id !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { error: updateError } = await supabase
      .from('words')
      .update({ category })
      .eq('id', wordId);

    if (updateError) {
      return res.status(500).json({ message: 'Failed to update word' });
    }

    res.json({ message: 'Category updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/words/stats", async (req, res) => {
  const { babyId, userId } = req.query;

  if (!babyId) {
    return res.status(400).json({ message: "Missing babyId" });
  }

  const { data, error } = await supabase
    .from("words")
    .select("date")
    .eq("baby_id", babyId)
    .eq("user_id", userId);

  if (error) return res.status(500).json({ message: "Failed to fetch data", error });

  // Count by date
  const counts = data.reduce((acc, { date }) => {
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const result = Object.entries(counts).map(([date, count]) => ({ date, count }));
  res.json(result);
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
