const google = require("googleapis").google;
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const REDIRECT_URI = "https://isolated.vercel.app";
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const app = express();
app.use(cors());
app.use(express.json());

app.post("/token", async (req, res) => {
  const { code1 } = req.body;
  const { code2 } = req.body;
  const { code3 } = req.body;
  const { code4 } = req.body;

  try {
    console.log("cod1");
    oauth2Client.getToken(code1);
  } catch (err) {
    console.log(err);
  }
  try {
    console.log("cod2");
    oauth2Client.getToken(code2);
  } catch (err) {
    console.log(err);
  }
  try {
    console.log("cod3");
    oauth2Client.getToken(code3);
  } catch (err) {
    console.log(err);
  }
  try {
    console.log("cod4");
    oauth2Client.getToken(code4);
  } catch (err) {
    console.log(err);
  }

  console.log(tokens);
  res.send(JSON.stringify({ gay: "sex" }));
});

app.get("/", async (req, res) => {
  const scopes = ["https://www.googleapis.com/auth/drive"];
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });

  res.send(url);
});

app.get("/griveRedirect", async (req, res) => {
  const scopes = ["https://www.googleapis.com/auth/drive"];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });

  res.redirect(url);
  console.log("got called");
});

app.listen(3000, () => console.log("Server ready"));
