const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

const app = express();
const port = process.env.PORT || 3000;

// cors allow
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.get("/", (req, res) => res.type("html").send(html));

const html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Hello from Render!</title>
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js"></script>
    <script>
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          disableForReducedMotion: true
        });
      }, 500);
    </script>
    <style>
      @import url("https://p.typekit.net/p.css?s=1&k=vnd5zic&ht=tk&f=39475.39476.39477.39478.39479.39480.39481.39482&a=18673890&app=typekit&e=css");
      @font-face {
        font-family: "neo-sans";
        src: url("https://use.typekit.net/af/00ac0a/00000000000000003b9b2033/27/l?primer=7cdcb44be4a7db8877ffa5c0007b8dd865b3bbc383831fe2ea177f62257a9191&fvd=n7&v=3") format("woff2"), url("https://use.typekit.net/af/00ac0a/00000000000000003b9b2033/27/d?primer=7cdcb44be4a7db8877ffa5c0007b8dd865b3bbc383831fe2ea177f62257a9191&fvd=n7&v=3") format("woff"), url("https://use.typekit.net/af/00ac0a/00000000000000003b9b2033/27/a?primer=7cdcb44be4a7db8877ffa5c0007b8dd865b3bbc383831fe2ea177f62257a9191&fvd=n7&v=3") format("opentype");
        font-style: normal;
        font-weight: 700;
      }
      html {
        font-family: neo-sans;
        font-weight: 700;
        font-size: calc(62rem / 16);
      }
      body {
        background: white;
      }
      section {
        border-radius: 1em;
        padding: 1em;
        position: absolute;
        top: 50%;
        left: 50%;
        margin-right: -50%;
        transform: translate(-50%, -50%);
      }
    </style>
  </head>
  <body>
    <section>
      Hello from Render!
    </section>
  </body>
</html>
`;
// api untuk mengambil gambar prakiraan angin
app.get("/api/gambar", (req, res) => {
  axios
    .get("https://bmkg.go.id/", {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => {
      const $ = cheerio.load(response.data);

      const imageElement = $(
        'div.img-mkg-home-bg:has(a[title="Prakiraan Angin"]) img'
      );
      const imageUrl = imageElement.attr("data-original");

      if (imageUrl) {
        console.log("URL gambar awal:", imageUrl);
        scrapeImage(imageUrl)
          .then((newImageUrl) => {
            console.log("URL gambar terbaru:", newImageUrl);
            // res.header("Content-Type", "application/json");
            res.json({ imageUrl: newImageUrl });
          })
          .catch((error) => {
            console.error(
              "Terjadi kesalahan saat mengambil URL gambar terbaru:",
              error
            );
            res.status(500).json({
              error: "Terjadi kesalahan saat mengambil URL gambar terbaru",
            });
          });
      } else {
        console.log("Tidak ada gambar prakiraan angin yang ditemukan.");
        res
          .status(404)
          .json({ error: "Tidak ada gambar prakiraan angin yang ditemukan" });
      }
    })
    .catch((error) => {
      console.error("Terjadi kesalahan:", error);
      res.status(500).json({ error: "Terjadi kesalahan" });
    });
});

async function scrapeImage(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  const newImageUrl = await page.evaluate(() => {
    const imgElement = document.querySelector("img");
    return imgElement ? imgElement.src : null;
  });

  await browser.close();

  return newImageUrl;
}

//api get peta hujan
app.get("/api/hujan", (req, res) => {
  axios
    .get("https://peta-maritim.bmkg.go.id/prakiraan/tinggi_gelombang") // Ganti URL dengan URL yang sesuai
    .then((response) => {
      const $ = cheerio.load(response.data);

      const imageElement = $("div.blog-view.view-fifth div.img img");
      const imageUrl = imageElement.attr("src");
      const keterangan = $("div.img + p").text();
      const potensiHujanElement = $(
        "b:contains('1. Potensi Hujan Lebat disertai petir berpeluang terjadi di :') + ul li"
      );
      const potensiHujan = [];

      potensiHujanElement.each((index, element) => {
        potensiHujan.push($(element).text());
      });

      if (imageUrl) {
        console.log("URL gambar:", imageUrl);
        console.log("Keterangan:", keterangan);
        console.log("Potensi Hujan Lebat:", potensiHujan);

        res.header("Content-Type", "application/json");
        res.json({ imageUrl, keterangan, potensiHujan });
      } else {
        console.log("Tidak ada gambar yang ditemukan.");
        res.status(404).json({ error: "Tidak ada gambar yang ditemukan" });
      }
    })
    .catch((error) => {
      console.error("Terjadi kesalahan:", error);
      res.status(500).json({ error: "Terjadi kesalahan" });
    });
});

const server = app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 120 * 1000;

module.exports = app;
