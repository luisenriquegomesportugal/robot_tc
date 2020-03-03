const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const Blob = require("node-blob");
const BlobUtil = require("blob-util");

const app = express();

app.get("/", async function(req, res) {
  console.log("Acessando IOEPA");
  const ioepa = await axios.get("https://www.ioepa.com.br/Frame");

  console.log("Acessando DOM IOEPA");
  const ioepaSelector = cheerio.load(ioepa.data);
  const diarioHref = ioepaSelector("div#quadro div#mid a").attr("href");

  console.log("Buscando Arquivo IOEPA");
  const diarioUrl = new URL(diarioHref);
  const diarioParams = new URLSearchParams(diarioUrl.search);

  console.log("Baixando Arquivo IOEPA");
  const { data } = await axios.get(
    "https://drive.google.com/u/0/uc?id=" +
      diarioParams.get("id") +
      "&export=download"
  );

  console.log("Retornando Arquivo IOEPA");
  const file = new Blob([data], { type: "application/pdf" });
  return res.send(BlobUtil.blobToDataURL(file));
});

app.listen(3000, () => console.log("Is running!"));
