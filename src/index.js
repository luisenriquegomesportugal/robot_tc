require("dotenv/config");

const app = require("express")();
const axios = require("axios");
const path = require("path");
const FormData = require("form-data");
const Utils = require("./utils");

app.get("/run", async function(req, res) {
  try {
    /* ---------------------------------------------------------*/
    /* ---------------------------------------------------------*/
    /* ---------------------------------------------------------*/
    console.log("1. accessing diario oficial");
    const portal = await axios.get(
      process.env.FILE_DIARIO_HOST || "https://www.ioepa.com.br/Frame"
    );
    const diario = Utils.searchInHTML(
      process.env.SELETOR_DIARIO_HOST || "div#quadro div#mid a",
      portal.data
    );
    const diarioUrl = new URL(diario.attr("href"));

    if (!diarioUrl) {
      throw "error: cannot access diario oficial";
    }

    /* ---------------------------------------------------------*/
    /* ---------------------------------------------------------*/
    /* ---------------------------------------------------------*/
    console.log("2. downloading diario oficial file");
    const { data: diarioContents } = await axios.get(
      "https://drive.google.com/u/0/uc",
      {
        responseType: "arraybuffer",
        headers: {
          "Content-Type": "application/pdf"
        },
        params: {
          id: diarioUrl.searchParams.get("id"),
          export: "download"
        }
      }
    );

    if (!diarioContents) {
      throw "error: download diario oficial file";
    }

    Utils.saveFile(Utils.path("pdf"), diarioContents);

    /* ---------------------------------------------------------*/
    /* ---------------------------------------------------------*/
    /* ---------------------------------------------------------*/
    console.log("3. uploading the diario oficial file for conversion");
    const conversionFormData = new FormData();
    conversionFormData.append("Filedata", diarioContents, Utils.path("pdf"));

    const { data: conversionUpload } = await axios.post(
      "https://www.pdftohtml.net/upload.instant.php",
      conversionFormData,
      {
        timeout: 120000,
        headers: {
          Referer: "https://www.pdftohtml.net/",
          "Content-Length": conversionFormData.getLengthSync(),
          ...conversionFormData.getHeaders()
        }
      }
    );

    if (!conversionUpload) {
      throw "error: cannot upload the diario oficial file to conversion";
    }

    /* ---------------------------------------------------------*/
    /* ---------------------------------------------------------*/
    /* ---------------------------------------------------------*/
    let conversionStatusResponse;
    let conversionStatusCounter = 0;
    do {
      console.log(
        `4. converting the diario oficial file (${conversionStatusCounter})`
      );
      conversionStatusResponse = await axios.get(
        "https://www.pdftohtml.net/getIsConverted.php",
        {
          params: {
            jobId: conversionUpload.jobId,
            rand: conversionStatusCounter++
          }
        }
      );

      if (!conversionStatusResponse.data) {
        throw "error: cannot convert the diario oficial file";
      }

      await Utils.wait(5);
    } while (conversionStatusResponse.data.status === "converting");

    /* ---------------------------------------------------------*/
    /* ---------------------------------------------------------*/
    /* ---------------------------------------------------------*/
    console.log("5. downloading converted diario oficial file");
    let { data: diarioConvertedContents } = await axios.get(
      "https://www.pdftohtml.net/fetch.php",
      {
        responseType: "arraybuffer",
        headers: {
          "Content-Type": "application/zip"
        },
        params: {
          id: conversionUpload.jobId
        }
      }
    );

    if (!diarioConvertedContents) {
      throw "error: cannot download converted diario oficial file";
    }

    Utils.saveFile(Utils.path("zip"), diarioConvertedContents);

    /* ---------------------------------------------------------*/
    /* ---------------------------------------------------------*/
    /* ---------------------------------------------------------*/
    console.log("6. extracting converted diario oficial file");
    await Utils.extractFile(Utils.path("zip"), Utils.path());

    /* ---------------------------------------------------------*/
    /* ---------------------------------------------------------*/
    /* ---------------------------------------------------------*/
    console.log("7. uploading the diario oficial file to analyze");

    const pathConvertedFile = path.resolve(
      Utils.path(),
      `${conversionUpload.jobId}_id_${conversionUpload.jobId}.html`
    );

    const uploadConversionFormData = new FormData();
    uploadConversionFormData.append(
      "file",
      Utils.readFile(pathConvertedFile),
      pathConvertedFile
    );

    if (!process.env.TARGET_HOST) {
      throw "error: cannot find TARGET_HOST variable";
    }

    const { status } = await axios.post(
      process.env.TARGET_HOST + "/api/v1/upload",
      uploadConversionFormData,
      {
        timeout: 120000,
        headers: {
          "Content-Length": uploadConversionFormData.getLengthSync(),
          ...uploadConversionFormData.getHeaders()
        }
      }
    );

    if (status != 200) {
      throw "error: cannot uploading the diario oficial file to analyze";
    }

    /* ---------------------------------------------------------*/
    /* ---------------------------------------------------------*/
    /* ---------------------------------------------------------*/
    console.log(`6. done! access ${Utils.path().replace(/\\/g, "/")}`);

    return res.json({
      error: false,
      message: Utils.path().replace(/\\/g, "/")
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: true,
      message: err.message
    });
  }
});

app.listen(process.env.SOURCE_PORT, process.env.SOURCE_HOST, () =>
  console.log(
    `Listening on ${process.env.SOURCE_HOST}:${process.env.SOURCE_PORT}`
  )
);
