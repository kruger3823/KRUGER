(function () {
  "use strict";

  // ---- Add a new story by dropping a .txt file in /stories and listing it here ----
  var STORY_FILES = [
    "stories/dappa.txt",
    "stories/chameleon.txt",
    "stories/her-20%.txt"
  ];

  var reader = document.getElementById("reader");
  var readerGenre = document.getElementById("reader-genre");
  var readerTitle = document.getElementById("reader-title");
  var readerByline = document.getElementById("reader-byline");
  var readerBody = document.getElementById("reader-body");
  var lastFocused = null;
  var STORIES = [];

  /* ----------------------------------------------------------------
     Plain-text story format (no JS syntax to worry about):

       Title: Dappa
       Genre: drama
       Byline: a short byline
       Year: 2025
       ReadTime: 30 min read
       Blurb: last 10 seconds .
       ---
       First paragraph.

      When Harry’s mom told him to back off from her life, it turned out to be the biggest blow he ever took."
     ---------------------------------------------------------------- */
  function parseStoryText(text, fallbackId) {
    var lines = text.replace(/\r\n/g, "\n").split("\n");
    var dividerIndex = -1;
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].trim() === "---") { dividerIndex = i; break; }
    }
    if (dividerIndex === -1) {
      console.error("Story file is missing its '---' divider line:", fallbackId);
      return null;
    }

    var header = {};
    lines.slice(0, dividerIndex).forEach(function (line) {
      var idx = line.indexOf(":");
      if (idx === -1) return;
      var key = line.slice(0, idx).trim().toLowerCase();
      var value = line.slice(idx + 1).trim();
      header[key] = value;
    });

    var bodyText = lines.slice(dividerIndex + 1).join("\n").trim();
    var paragraphs = bodyText
      .split(/\n\s*\n/)
      .map(function (p) { return p.replace(/\s*\n\s*/g, " ").trim(); })
      .filter(Boolean);

    return {
      id: slugify(header.title || fallbackId),
      genre: (header.genre || "drama").toLowerCase().trim(),
      title: header.title || "Untitled",
      byline: header.byline || "",
      year: header.year || "",
      blurb: header.blurb || "",
      readTime: header.readtime || "",
      paragraphs: paragraphs
    };
  }

  function slugify(str) {
    return String(str).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : str;
    return div.innerHTML;
  }

  /* ---------- load every story file, then render ---------- */
  function loadStories() {
    var requests = STORY_FILES.map(function (path) {
      return fetch(path)
        .then(function (res) {
          if (!res.ok) throw new Error("Could not load " + path + " (" + res.status + ")");
          return res.text();
        })
        .then(function (text) { return parseStoryText(text, path); })
        .catch(function (err) {
          console.error(err);
          return null;
        });
    });

    Promise.all(requests).then(function (results) {
      STORIES = results.filter(Boolean);
      if (STORIES.length === 0) {
        showLoadError();
        return;
      }
      renderCards();
    });
  }

  function showLoadError() {
    document.querySelectorAll(".index-cards").forEach(function (container) {
      container.innerHTML =
        '<p class="load-error">Couldn\u2019t load any stories. If you\u2019re opening index.html directly ' +
        'from your computer, run a local server instead (e.g. <code>npx serve</code>) \u2014 browsers block ' +
        'file:// fetches. On Netlify this works automatically.</p>';
    });
  }

  /* ---------- render index cards from STORIES ---------- */
  function renderCards() {
    var containers = document.querySelectorAll(".index-cards");
    containers.forEach(function (container) {
      var genre = container.getAttribute("data-genre");
      var items = STORIES.filter(function (s) { return s.genre === genre; });

      if (items.length === 0) {
        container.innerHTML = '<p class="load-error">No stories filed under this section yet.</p>';
        return;
      }

      items.forEach(function (story) {
        var card = document.createElement("button");
        card.className = "index-card";
        card.setAttribute("data-id", story.id);
        card.innerHTML =
          '<span class="index-card__main">' +
            '<span class="index-card__kicker">' + escapeHtml(story.year) + ' &middot; ' + escapeHtml(story.genre) + '</span>' +
            '<span class="index-card__title">' + escapeHtml(story.title) + '</span>' +
            '<p class="index-card__blurb">' + escapeHtml(story.blurb) + '</p>' +
          '</span>' +
          '<span class="index-card__aside">' + escapeHtml(story.readTime) + '<span class="open-hint">Open card &rarr;</span></span>';
        card.addEventListener("click", function () {
          openReader(story);
        });
        container.appendChild(card);
      });
    });
  }

  /* ---------- drawer open/close ---------- */
  function initDrawers() {
    var faces = document.querySelectorAll(".drawer__face");
    faces.forEach(function (face) {
      face.addEventListener("click", function () {
        var expanded = face.getAttribute("aria-expanded") === "true";
        var bodyId = face.getAttribute("aria-controls");
        var body = document.getElementById(bodyId);
        face.setAttribute("aria-expanded", String(!expanded));
        if (body) body.classList.toggle("is-open", !expanded);
      });
    });
  }

  /* ---------- reader overlay ---------- */
  function openReader(story) {
    lastFocused = document.activeElement;
    reader.setAttribute("data-genre", story.genre);
    readerGenre.textContent = story.genre.toUpperCase() + " \u00B7 SECTION " + (story.genre === "drama" ? "I" : "II");
    readerTitle.textContent = story.title;
    readerByline.textContent = [story.byline, story.year, story.readTime].filter(Boolean).join(" \u00B7 ");
    readerBody.innerHTML = story.paragraphs.map(function (p) {
      return "<p>" + escapeHtml(p) + "</p>";
    }).join("");

    reader.classList.add("is-open");
    reader.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    reader.querySelector(".reader__scroll").scrollTop = 0;

    var closeBtn = reader.querySelector(".reader__close");
    if (closeBtn) closeBtn.focus();
  }

  function closeReader() {
    reader.classList.remove("is-open");
    reader.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  }

  function initReaderControls() {
    document.querySelectorAll("[data-close]").forEach(function (el) {
      el.addEventListener("click", closeReader);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && reader.classList.contains("is-open")) {
        closeReader();
      }
    });
  }

  /* ---------- init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    loadStories();
    initDrawers();
    initReaderControls();
  });
})();
