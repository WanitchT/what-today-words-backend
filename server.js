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
  const sortAsc = req.query.sortAsc === "true";
  const category = req.query.category;
  const limit = parseInt(req.query.limit) || 10;
  const offset = parseInt(req.query.offset) || 0;

  // Check baby ownership
  const { data: babyCheck } = await supabase
    .from("baby")
    .select("id")
    .eq("id", babyId)
    .eq("user_id", userId)
    .single();

  if (!babyCheck)
    return res.status(403).json({ message: "Unauthorized access" });

  // Build query
  let query = supabase
    .from("words")
    .select("id, word, date, category", { count: "exact" })
    .eq("baby_id", babyId);

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  query = query
    .order("date", { ascending: sortAsc })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) return res.status(500).json({ error: error.message });

  res.json({ words: data, total: count });
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

app.get("/api/stats", async (req, res) => {
  const { babyId, userId, start, end } = req.query;

  if (!babyId || !userId) {
    return res.status(400).json({ message: "Missing babyId or userId" });
  }

  const { data: baby, error: babyError } = await supabase
    .from("baby")
    .select("*")
    .eq("id", babyId)
    .eq("user_id", userId)
    .single();

  if (babyError || !baby) {
    return res.status(401).json({ message: "Unauthorized access" });
  }

  // 🔍 Explicit filtering with logging
  let query = supabase
    .from("words")
    .select("date")
    .eq("baby_id", babyId);

  if (start) {
    console.log("Applying start date filter:", start);
    query = query.gte("date", start);
  }

  if (end) {
    console.log("Applying end date filter:", end);
    query = query.lte("date", end);
  }

  if (req.query.category) {
    query = query.eq("category", req.query.category);
  }

  const { data: words, error: wordError } = await query;

  if (wordError) {
    return res.status(500).json({ message: "Failed to fetch words", error: wordError });
  }

  // ✅ Make sure only the filtered results are used
  const counts = words.reduce((acc, { date }) => {
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  const result = Object.entries(counts).map(([date, count]) => ({ date, count }));
  res.json(result);
});

app.get("/api/stats/summary", async (req, res) => {
  const { babyId, userId } = req.query;

  const categoryLabels = {
    family: "ครอบครัว",
    animal: "สัตว์",
    food: "อาหาร",
    vehicle: "ยานพาหนะ",
    color: "สี",
    personname: "ชื่อคน",
    body: "ร่างกาย",
    object: "สิ่งของ",
    emotion: "อารมณ์",
    action: "การกระทำ",
    other: "อื่น ๆ",
  };
  

  if (!babyId || !userId) {
    return res.status(400).json({ message: "Missing babyId or userId" });
  }

  // Check baby ownership
  const { data: baby, error: babyError } = await supabase
    .from("baby")
    .select("*")
    .eq("id", babyId)
    .eq("user_id", userId)
    .single();

  if (babyError || !baby) {
    return res.status(401).json({ message: "Unauthorized access" });
  }

  // Prepare date strings
  const today = new Date().toISOString().split("T")[0];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay()); // Sunday
  const thisWeekStartStr = thisWeekStart.toISOString().split("T")[0];

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekStartStr = lastWeekStart.toISOString().split("T")[0];

  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
  const lastWeekEndStr = lastWeekEnd.toISOString().split("T")[0];

  // Get words
  const { data: words, error } = await supabase
    .from("words")
    .select("date, category")
    .eq("baby_id", babyId);

  if (error) {
    return res.status(500).json({ message: "Failed to fetch stats", error });
  }

  // Compute stats
  let total = 0;
  let todayCount = 0;
  let yesterdayCount = 0;
  let thisWeekCount = 0;
  let lastWeekCount = 0;

  const categoryCounts = {};

  words.forEach(({ date, category }) => {
    total++;

    if (date === today) todayCount++;
    if (date === yesterdayStr) yesterdayCount++;

    if (date >= thisWeekStartStr) thisWeekCount++;
    if (date >= lastWeekStartStr && date <= lastWeekEndStr) lastWeekCount++;

    if (category) {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    }
  });

  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));

  // const topCategory = sortedCategories[0]
  //   ? `${sortedCategories[0].category} (${sortedCategories[0].count})`
  //   : "-";

  // const topCategories = sortedCategories.slice(0, 3);

  const topCategory = sortedCategories[0]
  ? `${categoryLabels[sortedCategories[0].category] || sortedCategories[0].category} (${sortedCategories[0].count})`
  : "-";

  const topCategories = sortedCategories.slice(0, 3).map(({ category, count }) => ({
    category: categoryLabels[category] || category,
    count,
  }));

  res.json({
    today: todayCount,
    yesterday: yesterdayCount,
    thisWeek: thisWeekCount,
    lastWeek: lastWeekCount,
    total,
    topCategory,
    topCategories,
  });
});

app.listen(PORT, () =>
  console.log(`Server running on : http://localhost:${PORT}`)
);
