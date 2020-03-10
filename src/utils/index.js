const fs = require("fs");
const util = require("util");
const path = require("path");
const cheerio = require("cheerio");
const extract = require("extract-zip");

const now = new Date().toLocaleString().replace(/[\/:-]+/g, ".");

module.exports = {
  /*
   * Pause system n seconds
   */
  wait: async seconds =>
    await new Promise(res => setTimeout(res, seconds * 1000)),

  /*
   * Return files directories, creating them if needs
   * Attention: It get current time for name of partials files and folders
   */
  path: (ext = null, rootFilesDir = "tmp") => {
    if (process.env.ROOT_FILES_PATH) {
      rootFilesDir = process.env.ROOT_FILES_PATH;
    }

    let pathDir = path.resolve(__dirname, "..", "..", rootFilesDir);
    if (!fs.existsSync(pathDir)) fs.mkdirSync(pathDir);

    pathDir = path.resolve(pathDir, now);
    if (!fs.existsSync(pathDir)) fs.mkdirSync(pathDir);

    return ext ? path.resolve(pathDir, `${now}.${ext}`) : pathDir;
  },

  /*
   * Search a selector inside html body
   */
  searchInHTML: (seletor, html) => {
    const htmlCh = cheerio.load(html);
    return htmlCh(seletor);
  },

  /*
   * Save file
   */
  saveFile: (path, data) => fs.writeFileSync(path, data),

  /*
   * Read file
   */
  readFile: path => fs.readFileSync(path),

  /*
   * Extract ZIP file
   */
  extractFile: async (source, dest) =>
    await util.promisify(extract)(source, { dir: dest })
};
