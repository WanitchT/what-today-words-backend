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
  const { name, userId } = req.body;

  const { data, error } = await supabase
    .from("baby")
    .insert({ name, user_id: userId })
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
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Name is required" });

  const { data, error } = await supabase
    .from("baby")
    .update({ name })
    .eq("id", req.params.id);
  if (error || data.length === 0)
    return res.status(404).json({ message: "Baby not found" });

  res.json({ message: "Baby updated successfully" });
});

app.delete("/api/baby/:id", async (req, res) => {
  const { error } = await supabase
    .from("baby")
    .delete()
    .eq("id", req.params.id);
  if (error) return res.status(404).json({ message: "Baby not found" });
  res.json({ message: "Baby deleted successfully" });
});

app.post("/api/words", async (req, res) => {
  const { word, date, babyId, category, userId } = req.body;

  const { data, error } = await supabase
    .from("words")
    .insert({ word, date, baby_id: babyId, category, user_id: userId })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
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

app.delete("/api/words/:id", async (req, res) => {
  const { userId } = req.query;

  const { data: word } = await supabase
    .from("words")
    .select("user_id")
    .eq("id", req.params.id)
    .single();

  if (!word || word.user_id !== userId) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  await supabase.from("words").delete().eq("id", req.params.id);
  res.json({ message: "Word deleted" });
});

app.patch("/api/words/:id", async (req, res) => {
  const { category } = req.body;
  const { error } = await supabase
    .from("words")
    .update({ category })
    .eq("id", req.params.id);
  if (error) return res.status(404).json({ message: "Word not found" });
  res.json({ message: "Category updated" });
});

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
