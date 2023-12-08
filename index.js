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
  const { acc_tkn, ref_tkn } = req.body;

  oauth2Client.setCredentials({
    access_token: acc_tkn,
    refresh_token: ref_tkn,
  });

  const drive = google.drive({
    version: "v3",
    auth: oauth2Client,
  });

  // test drive
  const response = await drive.files.list({
    pageSize: 10,
    fields: "nextPageToken, files(id, name)",
  });
  console.log(response.data.files);

  console.log("o mers coisane");

  res.send(JSON.stringify({ gay: "sex" }));
});

app.get("/", async (req, res) => {
  res.send(
    "cum ai ajuns pe pagina de la server, vezi bosule ca tre sa dai request aici n-ai treaba tu cu backendu'"
  );
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
