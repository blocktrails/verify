/** Keep Verify / View / Advanced linked with the same ?uri=, always encoded. */
(function () {
  function currentUri() {
    const p = new URLSearchParams(location.search);
    return p.get("uri") || p.get("src") || "";
  }

  function hrefFor(page, uri) {
    const q = uri ? "?uri=" + encodeURIComponent(uri) : "";
    if (!page || page === "index" || page === "./") return "./" + q;
    return page + q;
  }

  function sync(uri) {
    const u = uri == null ? currentUri() : uri;
    document.querySelectorAll("[data-nav]").forEach((a) => {
      a.href = hrefFor(a.getAttribute("data-nav"), u);
    });
    document.querySelectorAll("[data-cross]").forEach((a) => {
      const page = a.getAttribute("data-cross");
      if (!u) {
        a.hidden = true;
        return;
      }
      a.hidden = false;
      a.href = hrefFor(page, u);
    });
  }

  window.blocktrailsNav = { sync, currentUri, hrefFor };
  sync();
})();
