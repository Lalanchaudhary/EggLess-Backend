const express = require("express");
const router = express.Router();
const { SitemapStream, streamToPromise } = require("sitemap");
const Cake = require("../models/Cake");

// Base URL of your site
const BASE_URL = "https://www.egglesscakes.in";

router.get("/sitemap.xml", async (req, res) => {
  try {
    const smStream = new SitemapStream({ hostname: BASE_URL });

    // ⭐ Static pages
    const staticPages = [
      "/",
      "/about-us",
      "/contact"
    ];

    staticPages.forEach((url) => {
      smStream.write({
        url,
        changefreq: "weekly",
        priority: 0.8
      });
    });

    // ⭐ Category pages
    const categories = [
      "chocolate-cakes",
      "vanilla-flavor",
      "redVelvet-flavor-cakes",
      "fruit-cakes",
      "pineapple-flavor-cakes",
      "butterscotch-flavor-cakes",
      "cartoon-theme-cakes",
      "superhero-theme-cakes",
      "cricket-theme-cakes",
      "nature-theme-cakes",
      "Cupcakes",
      "brownies",
      "cookies",
      "pastries",
      "muffins",
      "donuts",
      "kids-birthday",
      "adult-birthday",
      "milestone-birthday",
      "surprise-birthday",
      "birthday-combos",
      "birthday-Specials",
      "FirstAnniversary-cakes",
      "anniversary-cakes",
      "friendship-day-cakes",
      "baby-shower-cakes",
      "farewell-cakes",
      "congratulations-cakes",
      "photo-cakes",
      "name-cakes",
      "designer-cakes",
      "fondant-cakes",
      "custom-flavor-cakes"
    ];

    categories.forEach((cat) => {
      smStream.write({
        url: `/cakes/${cat}`,
        changefreq: "weekly",
        priority: 0.7
      });
    });

    // ⭐ Fetch cakes from MongoDB
    const cakes = await Cake.find({}, "slug updatedAt");

    cakes.forEach((cake) => {
      smStream.write({
        url: `/cake/${cake.slug}`,
        lastmod: cake.updatedAt,
        changefreq: "weekly",
        priority: 0.9
      });
    });

    smStream.end();

    const sitemapOutput = await streamToPromise(smStream);

    res.header("Content-Type", "application/xml");
    res.send(sitemapOutput.toString());

  } catch (error) {
    console.error(error);
    res.status(500).send("Error generating sitemap");
  }
});

module.exports = router;
