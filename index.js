const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

const app = express();
const port = 3000;

// cors allow
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.get("/", (req, res) => {
  res.send("Hey World");
});

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

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});

module.exports = app;
