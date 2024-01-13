const google = require("googleapis").google;
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const { Client } = require("pg");
const stream = require("stream");

dotenv.config();
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const connectionString = process.env.DATABASE_URL;

const REDIRECT_URI = "http://localhost:3000";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const app = express();
app.use(cors());
app.use(express.json());

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "/cox.html"));
});

app.get("/page-info/:page_id", async (req, res) => {
  const page_id = req.params.page_id;

  const client = new Client({
    connectionString: connectionString,
  });
  client
    .connect()
    .then(() => {
      client.query(
        "SELECT name FROM public.pages WHERE id = $1",
        [page_id],
        (err, result) => {
          if (err) {
            console.error(err.message);
          } else {
            res.send(JSON.stringify(result.rows[0]));
          }
        }
      );
    })
    .catch((err) => {
      console.error(err.message);
    });
});

app.get("/my-pages", async (req, res) => {
  const authed = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: req.headers.authorization,
      },
    },
  });
  const { data: data, error } = await authed.from("pages").select("*");

  res.send({ status: "ok", data: data });
});

//todo app.get pentru files

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
    console.error(error);
    res.send(JSON.stringify({ error: error }));
    return;
  }

  const { data: profile } = await authed
    .from("profiles")
    .select("folder")
    .eq("id", user_id);

  if (profile[0].folder === null) {
    oauth2Client.setCredentials({
      refresh_token: ref_tkn,
    });

    const drive = google.drive({
      version: "v3",
      auth: oauth2Client,
    });

    const folderMetadata = {
      name: "upldfy",
      mimeType: "application/vnd.google-apps.folder",
    };
    const folder = await drive.files.create({
      resource: folderMetadata,
      fields: "id",
    });

    const { data, error } = await authed
      .from("profiles")
      .update({ folder: folder.data.id })
      .eq("id", user_id)
      .select();
    if (error) {
      console.error(error);
      res.send(JSON.stringify({ error: error }));
      return;
    }
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

  const { data: profile, error: err1 } = await authed
    .from("profiles")
    .select("token, folder");

  oauth2Client.setCredentials({
    refresh_token: profile[0].token,
  });

  const drive = google.drive({
    version: "v3",
    auth: oauth2Client,
  });

  const folderMetadata = {
    name: name,
    mimeType: "application/vnd.google-apps.folder",
    parents: [profile[0].folder],
  };

  const folder = await drive.files.create({
    resource: folderMetadata,
    fields: "id",
  });

  const { data: data1, error: err2 } = await authed
    .from("pages")
    .insert([{ name: name, folder: folder.data.id }])
    .select();

  res.send({ create_status: "ok", data: data1 });
});

app.post("/upload/:id", upload.array("files", 10), (req, res) => {
  const page_id = req.params.id;

  try {
    const { name } = req.body;
    const files = req.files;

    const client = new Client({
      connectionString: connectionString,
    });

    client.connect().then(() => {
      client.query(
        "INSERT INTO public.uploads(origin, name) VALUES ($1, $2) RETURNING id",
        [page_id, name],
        (err, result) => {
          if (err) {
            console.error(err.message);
          } else {
            const uploadId = result.rows[0].id;

            client.query(
              "SELECT p.token,pg.folder FROM pages AS pg JOIN profiles AS p ON pg.owner = p.id WHERE pg.id = $1",
              [page_id],
              (err, result) => {
                if (err) {
                  console.error(err.message);
                } else {
                  oauth2Client.setCredentials({
                    refresh_token: result.rows[0].token,
                  });

                  const drive = google.drive({
                    version: "v3",
                    auth: oauth2Client,
                  });

                  files.forEach(async (file) => {
                    const fileMetadata = {
                      name: file.originalname,
                      parents: [result.rows[0].folder],
                    };
                    const media = {
                      mimeType: file.mimetype,
                      body: new stream.PassThrough().end(file.buffer),
                    };
                    const response = await drive.files.create({
                      resource: fileMetadata,
                      media: media,
                      fields: "id",
                    });

                    client.query(
                      "INSERT INTO public.files(origin,link) VALUES ($1, $2)",
                      [uploadId, response.data.id]
                    );
                  });
                }
              }
            );
          }
        }
      );
    });
  } catch (err) {
    console.error(err);
  }

  res.send({ upload_status: "ok" });
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
