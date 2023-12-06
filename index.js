const google = require("googleapis").google;
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const REDIRECT_URI = "https://isolated.vercel.app";

const app = express();
app.use(cors());
app.use(express.json());
//TODO: import .env

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

console.log("bballs nice xD");
const tokens = oauth2Client.getToken(
  "4%2F0AfJohXnqa7wdx0quWKEL7Nlyh4NByYDZxCs_cpGyTg6MnNHLr3exl3cNrs3q43jdWNa5iA"
);
const { refresh_token, access_token } = tokens;
console.log("refresh token: " + refresh_token);

//supabase
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(supabaseUrl, supabaseAnonKey);

app.post("/auth", async (req, res) => {
  const { code, userID } = req.body;
  console.log("tokens: " + code);
  const { tokens } = await oauth2Client.getToken(code);
  const { refresh_token, access_token } = tokens;

  //TODO: add refresh token to supabase

  res.send(JSON.stringify({ refresh_token, access_token }));
});

app.get("/griveAuth", async (req, res) => {
  const scopes = ["https://www.googleapis.com/auth/drive"];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
  });

  res.send(url);
  console.log("got called");
});

app.get("/griveRedirect", async (req, res) => {
  const scopes = ["https://www.googleapis.com/auth/drive"];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
  });

  res.redirect(url);
  console.log("got called");
});

app.listen(3000, () => console.log("Server ready"));
