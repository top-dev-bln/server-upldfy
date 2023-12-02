const google = require("googleapis").google;
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

//TODO: import .env
const CLIENT_ID =
  "397112946172-11uf7if7onqpi3b0oefdfolci9kph7hj.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REDIRECT_URI = "https://isolated.vercel.app";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

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
