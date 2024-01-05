const google = require("googleapis").google;
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");

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

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "/cox.html"));
});

app.post("/token/:user_id", async (req, res) => {
  const { ref_tkn } = req.body;
  const user_id = req.params.user_id;

  const authed = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: req.headers.authorization,
      },
    },
  });
  const { data, error } = await authed
    .from("profiles")
    .update({ token: ref_tkn })
    .eq("id", user_id)
    .select();
  if (error) {
    console.log(error);
    res.send(JSON.stringify({ error: error }));
    return;
  }
  res.send({ status: "ok" });
});

app.post("/create-page", async (req, res) => {
  const { name } = req.body;
  const authed = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: req.headers.authorization,
      },
    },
  });

  const { data, error } = await authed
    .from("pages")
    .insert([{ name: name }])
    .select();
  if (error) {
    console.log(error);
    res.send(JSON.stringify({ error: error }));
    return;
  }

  res.send({ create_status: "ok", data: data });
});

app.post("/drive", async (req, res) => {
  const { ref_tkn } = req.body;

  oauth2Client.setCredentials({
    refresh_token: ref_tkn,
  });

  const drive = google.drive({
    version: "v3",
    auth: oauth2Client,
  });

  const response = await drive.files.list({
    pageSize: 10,
    fields: "nextPageToken, files(id, name), files/webContentLink",
  });

  res.send(JSON.stringify(response.data.files));
});

app.listen(5000, () => console.log("Server ready"));
