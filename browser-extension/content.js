(() => {
  "use strict";

  const LEAGUE_PATH = /^\/nfl\/leagues\/183611\/?$/;
  const DASHBOARD_URL = "https://mrbutton105.github.io/NFLdk-fantasy-optimum-points-records/";
  const ROOT_ID = "nfl-optimum-points-extension-root";

  if (!LEAGUE_PATH.test(window.location.pathname)) return;
  if (document.getElementById(ROOT_ID)) return;

  function findInsertionPoint() {
    const heading = document.querySelector("h1");
    if (heading) {
      const header = heading.closest("header");
      if (header) return { parent: header.parentElement, before: header.nextSibling };

      const headingBlock = heading.parentElement;
      if (headingBlock && headingBlock.parentElement) {
        return { parent: headingBlock.parentElement, before: headingBlock.nextSibling };
      }
    }

    const main = document.querySelector("main, #main, #content, .main-content, .page-content");
    if (main) return { parent: main, before: main.firstChild };

    return { parent: document.body, before: document.body.firstChild };
  }

  function mountDashboard() {
    if (document.getElementById(ROOT_ID)) return true;

    const point = findInsertionPoint();
    if (!point.parent) return false;

    const host = document.createElement("section");
    host.id = ROOT_ID;
    host.setAttribute("aria-label", "NFL Fantasy Optimum Points dashboard");

    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          margin: 18px 0 24px;
          color: #17212b;
          font-family: Arial, Helvetica, sans-serif;
          position: relative;
          z-index: 1;
        }
        .shell {
          overflow: hidden;
          border: 1px solid #dce3e8;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 3px 14px rgba(20, 35, 45, .09);
        }
        .bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          background: #174b38;
          color: #fff;
        }
        .title {
          font-size: 15px;
          line-height: 1.3;
          font-weight: 800;
          letter-spacing: .01em;
        }
        .subtitle {
          margin-top: 3px;
          color: #dce9e2;
          font-size: 11px;
        }
        a {
          flex: 0 0 auto;
          color: #174b38;
          background: #fff;
          border-radius: 6px;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
        }
        a:hover { background: #e8f2ec; }
        iframe {
          display: block;
          width: 100%;
          height: 1850px;
          border: 0;
          background: #f3f5f7;
        }
        .fallback {
          padding: 18px;
          font-size: 13px;
          line-height: 1.5;
          color: #52606d;
        }
        .fallback a {
          display: inline-block;
          margin-top: 8px;
          background: #174b38;
          color: #fff;
        }
        @media (max-width: 650px) {
          .bar { align-items: flex-start; }
          .title { font-size: 14px; }
          iframe { height: 2100px; }
        }
      </style>
      <div class="shell">
        <div class="bar">
          <div>
            <div class="title">NFL Fantasy Optimum Points</div>
            <div class="subtitle">Weekly matchups · Optimum standings · Projected draft order</div>
          </div>
          <a href="${DASHBOARD_URL}" target="_blank" rel="noopener noreferrer">Open full dashboard ↗</a>
        </div>
        <iframe
          title="NFL Fantasy Optimum Points dashboard"
          src="${DASHBOARD_URL}"
          loading="lazy"
          referrerpolicy="strict-origin-when-cross-origin">
        </iframe>
        <div class="fallback" hidden>
          The dashboard could not be embedded here. Open it separately:
          <br><a href="${DASHBOARD_URL}" target="_blank" rel="noopener noreferrer">Open Optimum Points dashboard ↗</a>
        </div>
      </div>
    `;

    const frame = shadow.querySelector("iframe");
    const fallback = shadow.querySelector(".fallback");
    frame.addEventListener("error", () => {
      frame.hidden = true;
      fallback.hidden = false;
    });

    point.parent.insertBefore(host, point.before || null);
    return true;
  }

  if (!mountDashboard()) {
    const observer = new MutationObserver(() => {
      if (mountDashboard()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 15000);
  }
})();
