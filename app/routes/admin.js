const express = require("express");
const fs = require("fs");
const path = require("path");
const { getGlamByName } = require("../lib/db");
const { authenticateAdmin } = require("../middlewares/auth");

const router = express.Router();

const countries = JSON.parse(
  fs
    .readFileSync(path.resolve(__dirname, "../countries.json"))
    .toString()
);

router.get("/panel", authenticateAdmin, async function (req, res) {
  res.renderWithLocal(`views/admin-panel.hbs`);
});

router.get("/new-glam", authenticateAdmin, async function (req, res) {
  res.renderWithLocal(`views/new-glam.hbs`, { countries });
});

router.get("/edit-glam/:id", authenticateAdmin, async function (req, res) {
  let glam = await getGlamByName(req.params.id);
  if (glam !== undefined) {
    res.renderWithLocal(`views/edit-glam.hbs`, { countries });
  } else {
    res.sendStatus(400);
  }
});
module.exports = router;