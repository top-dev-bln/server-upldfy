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

app.post("/token", async (req, res) => {
  const { user_id, access, ref_tkn } = req.body;
  const authed = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${access}`,
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
  const { access, name } = req.body;
  const authed = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${access}`,
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

app.post("/pitong", async (req, res) => {
  const { user_id, access } = req.body;
  const authed = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${access}`,
      },
    },
  });

  //get refresh token from supabase
  let { data, error } = await authed
    .from("profiles")
    .select("token")
    .eq("id", user_id);

  const ref_tkn = data[0].token;
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

app.post("/db", async (req, res) => {
  console.log(".............REQUEST.............");
  const { user_id, access } = req.body;
  const authed = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${access}`,
      },
    },
  });

  let { data, error } = await authed
    .from("profiles")
    .select("name")
    .eq("id", user_id);

  console.log(data);

  res.send(JSON.stringify(data));
});

app.post("/temp", async (req, res) => {
  const { user_id, ref_tkn } = req.body;
  //send to supabase public.profiles where id = user_id and update ref_tkn that is called token in supabase
  const { data, error } = await supabase
    .from("profiles")
    .update({ token: ref_tkn })
    .eq("id", user_id);
  if (error) {
    console.log(error);
    res.send(JSON.stringify({ error: error }));
    return;
  }

  res.sendStatus(200);
});

app.post("/test", async (req, res) => {
  const { user_id, ref_tkn } = req.body;
  res.send(JSON.stringify({ id: user_id, ref_tkn: ref_tkn }));
});

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "/cox.html"));
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

app.listen(5000, () => console.log("Server ready"));
