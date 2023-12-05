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

//TODO: import .env

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

//supabase
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(supabaseUrl, supabaseAnonKey);

app.post("/auth", async (req, res) => {
  const { code } = req.body;
  const { tokens } = await oauth2Client.getToken(code);
  const { refresh_token, access_token } = tokens;

  //save to database
  const { data, error } = await supabase
    .from("users")
    .insert([{ refresh_token, access_token }]);
  if (error) {
    console.log(error);
    res.send("error");
  }
  res.send("success");
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
