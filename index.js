const axios = require("axios");
const FormData = require("form-data");
const Utils = require("./utils");

(async function() {
  try {
    /* ---------------------------------------------------------*/
    /* ---------------------------------------------------------*/
    /* ---------------------------------------------------------*/
    console.log("1. accessing diario oficial");
    const portal = await axios.get("https://www.ioepa.com.br/Frame");
    const diario = Utils.searchInHTML("div#quadro div#mid a", portal.data);
    const diarioUrl = new URL(diario.attr("href"));

    if (!diarioUrl) {
      throw "error: cannot access diario oficial";
    }

    /* ---------------------------------------------------------*/
    /* ---------------------------------------------------------*/
    /* ---------------------------------------------------------*/
    console.log("2. download diario oficial file");
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
      throw "error: cannot upload the diario oficial file for conversion";
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

      await new Promise(res => setTimeout(res, 5000));
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
    Utils.extractFile(Utils.path("zip"), Utils.path());

    /* ---------------------------------------------------------*/
    /* ---------------------------------------------------------*/
    /* ---------------------------------------------------------*/
    console.log(`6. done! access ${Utils.path().replace(/\\/g, "/")}`);
  } catch (err) {
    console.error(err);
  }
})();
