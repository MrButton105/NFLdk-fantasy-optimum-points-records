# NFL Fantasy Optimum Points — Fleaflicker browser extension

This is an experimental Chrome extension that adds the existing Optimum Points dashboard to the Fleaflicker league homepage for league **183611**.

It does not modify Fleaflicker data, settings, scoring, matchups, or draft picks. It only inserts the published GitHub Pages dashboard in an iframe in your browser.

## Install in Chrome

1. Download this repository as a ZIP from GitHub, or clone it.
2. Extract the ZIP to a folder on your computer.
3. Open `chrome://extensions` in Google Chrome.
4. Turn on **Developer mode**.
5. Choose **Load unpacked**.
6. Select the `browser-extension` folder inside the extracted repository.
7. Open or refresh https://www.fleaflicker.com/nfl/leagues/183611.

The dashboard should appear near the top of that league page. The extension only runs on that exact Fleaflicker league URL.

## Important limitations

- Each person who wants the embedded dashboard must install the extension in their own Chrome browser. It does not publish a plugin for the whole league or change Fleaflicker's servers.
- This is a prototype. Fleaflicker can change its page layout, which may affect where the panel is inserted.
- The iframe depends on Fleaflicker allowing the extension-injected frame and GitHub Pages allowing framing. If either site blocks it through browser security headers, the fallback link opens the existing dashboard separately. In that case, the next iteration should render the dashboard data directly from the published JSON inside the extension rather than embedding the page.
- The extension currently targets desktop Chrome. It does not install into the Fleaflicker mobile app.

## Dashboard

https://mrbutton105.github.io/NFLdk-fantasy-optimum-points-records/
