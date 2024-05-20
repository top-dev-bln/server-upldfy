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

const REDIRECT_URI = "https://isolated.vercel.app/my-pages";

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const app = express();
app.use(cors({
    origin: "https://isolated.vercel.app"
}));
app.use(express.json());

app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname, "/cox.html"));
});

app.get("/page-info/:page_id", async(req, res) => {
    const page_id = req.params.page_id;

    const client = new Client({
        connectionString: connectionString,
    });
    client
        .connect()
        .then(() => {
            client.query(
                "SELECT name FROM public.pages WHERE id = $1", [page_id],
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

app.get("/my-pages", async(req, res) => {
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

app.get("/my-uploads/:page_id", async(req, res) => {
    const page_id = req.params.page_id;
    const authed = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: req.headers.authorization,
            },
        },
    });

    const { data: data, error } = await authed
        .from("uploads")
        .select("*")
        .eq("origin", page_id);
    for (let i = 0; i < data.length; i++) {
        const { data: files, error } = await authed
            .from("files")
            .select("*")
            .eq("origin", data[i].id);
        data[i].files = files;
    }
    res.send({ status: "ok", data: data });
});

app.post("/tk/:user_id", async(req, res) => {
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


    console.log(profile[0]);

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



app.post("/token/:user_id", async(req, res) => {

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


    console.log(profile[0]);

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

app.post("/create-page", async(req, res) => {
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

    console.log(profile);

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

app.delete("/delete-page/:id", async(req, res) => {
    const page_id = req.params.id;

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

    const { data: data1, error: err2 } = await authed
        .from("pages")
        .select("folder")
        .eq("id", page_id);

    await drive.files.delete({
        fileId: data1[0].folder,
    });

    const { data, error } = await authed
        .from("pages")
        .delete()
        .eq("id", page_id)
        .select();

    res.send({ delete_status: "ok" });
});

app.post("/upload/:id", upload.array("files", 10), (req, res) => {
    const page_id = req.params.id;


    try {
        const { name } = req.body;
        const files = req.files;
        console.log(name);
        console.log(files);


        const client = new Client({
            connectionString: connectionString,
        });

        client.connect().then(() => {
            //get owner from page id
            console.log("connected");
            const owner = client.query(
                "SELECT owner FROM public.pages WHERE id = $1", [page_id],
                (err, result) => {
                    if (err) {
                        console.error(err.message);
                    } else {
                        const owner = result.rows[0].owner;

                        client.query(
                            "INSERT INTO public.uploads(origin,owner, name) VALUES ($1, $2, $3) RETURNING id", [page_id, owner, name],
                            (err, result) => {
                                if (err) {
                                    console.error(err.message);
                                } else {
                                    const uploadId = result.rows[0].id;

                                    client.query(
                                        "SELECT p.token,pg.folder FROM pages AS pg JOIN profiles AS p ON pg.owner = p.id WHERE pg.id = $1", [page_id],
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

                                                files.forEach(async(file) => {
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
                                                        "INSERT INTO public.files(origin,owner,link,name) VALUES ($1, $2, $3, $4)", [
                                                            uploadId,
                                                            owner,
                                                            response.data.id,
                                                            file.originalname,
                                                        ]
                                                    );
                                                });
                                            }
                                        }
                                    );
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

app.post("/drive", async(req, res) => {
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