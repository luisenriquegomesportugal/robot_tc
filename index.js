const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const FormData = require('form-data')
const fs = require('fs');
const path = require('path');

const app = express();

app.get("/", async function (req, res) {
  console.log("Acessando IOEPA");
  const ioepa = await axios.get("https://www.ioepa.com.br/Frame");

  console.log("Acessando DOM IOEPA");
  const ioepaSelector = cheerio.load(ioepa.data);
  const diarioHref = ioepaSelector("div#quadro div#mid a").attr("href");

  console.log("Buscando Arquivo IOEPA");
  const diarioUrl = new URL(diarioHref);
  const diarioParams = new URLSearchParams(diarioUrl.search);

  console.log("Baixando Arquivo IOEPA");
  const ioepaResponse = await axios.get(
    "https://drive.google.com/u/0/uc",
    {
      responseType: 'arraybuffer',
      headers: {
        'Content-Type': 'application/pdf',
      },
      params: {
        id: diarioParams.get('id'),
        export: "download"
      }
    }
  );

  console.log("Retornando Arquivo IOEPA");
  const now = new Date().toLocaleString().replace(/[\/:]+/g, '.');
  const pathDir = path.resolve(__dirname, "files", now);

  if (!fs.existsSync(pathDir)) {
    fs.mkdirSync(pathDir);
  }

  const pdfPathname = path.resolve(pathDir, now + ".pdf");
  fs.writeFileSync(pdfPathname, ioepaResponse.data);


  console.log("Enviando para Converter");
  const formDataConverter = new FormData();
  formDataConverter.append('Filedata', pdfPathname);

  const converterResponse = await axios.post(
    'https://www.pdftohtml.net/upload.instant.php',
    formDataConverter,
    {
      timeout: 180000,
      headers: {
        'Referer': 'https://www.pdftohtml.net/',
        'Content-Length': ioepaResponse.data.length,
        ...formDataConverter.getHeaders()
      }
    }
  );

  return res.json(converterResponse.data);
  /*
    do {
      console.log("Convertendo Arquivo IOEPA HTML");
      let statusConverterResponse = await axios.get(
        "https://www.pdftohtml.net/getIsConverted.php",
        {
          params: {
            jobId: converterResponse.data.jobId,
            rand: (Math.random() * 10).toFixed(0)
          }
        }
      );
    } while (statusConverterResponse.data.status === "converting");
  
    console.log("Baixando Arquivo IOEPA HTML");
    let resultConverterResponse = await axios.get(
      "https://www.pdftohtml.net/" + statusConverterResponse.data.download_url,
      {
        responseType: 'arraybuffer',
        headers: {
          'Content-Type': 'application/zip',
        }
      }
    );
  
    const zipPathname = path.resolve(pathDir, now + ".zip");
    fs.writeFileSync(zipPathname, resultConverterResponse.data);
    */
});

app.listen(3000, () => console.log("Is running!"));
