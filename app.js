
const DATA_URL = "./data/season.json";

const standingsElement = document.querySelector("#standings");
const matchupsElement = document.querySelector("#matchups");
const weekSelect = document.querySelector("#week-select");
const updatedElement = document.querySelector("#updated-at");
const statusElement = document.querySelector("#status");

let seasonData = null;

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function formatPoints(value) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function getStandings(weeks, selectedWeek) {
  const records = new Map();

  for (const week of weeks) {
    if (week.week > selectedWeek) continue;

    for (const matchup of week.matchups) {
      for (const team of [matchup.away, matchup.home]) {
        if (!records.has(team.id)) {
          records.set(team.id, {
            id: team.id,
            name: team.name,
            wins: 0,
            losses: 0,
            ties: 0,
            pointsFor: 0
          });
        }
      }

      const away = records.get(matchup.away.id);
      const home = records.get(matchup.home.id);

      away.pointsFor += Number(matchup.away.optimum);
      home.pointsFor += Number(matchup.home.optimum);

      if (matchup.away.optimum > matchup.home.optimum) {
        away.wins++;
        home.losses++;
      } else if (matchup.home.optimum > matchup.away.optimum) {
        home.wins++;
        away.losses++;
      } else {
        away.ties++;
        home.ties++;
      }
    }
  }

  return [...records.values()].sort((a, b) =>
    b.wins - a.wins ||
    a.losses - b.losses ||
    b.pointsFor - a.pointsFor ||
    a.name.localeCompare(b.name)
  );
}

function renderStandings(selectedWeek) {
  const standings = getStandings(seasonData.weeks, selectedWeek);

  standingsElement.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>W</th>
            <th>L</th>
            <th>T</th>
            <th>Opt Pts For</th>
          </tr>
        </thead>
        <tbody>
          ${standings.map((team, index) => `
            <tr>
              <td>${index + 1}</td>
              <td class="team-name">${escapeHTML(team.name)}</td>
              <td>${team.wins}</td>
              <td>${team.losses}</td>
              <td>${team.ties}</td>
              <td>${formatPoints(team.pointsFor)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderMatchups(selectedWeek) {
  const week = seasonData.weeks.find(item => item.week === selectedWeek);

  if (!week || !week.matchups.length) {
    matchupsElement.innerHTML = "<p>No results available for this week yet.</p>";
    return;
  }

  matchupsElement.innerHTML = `
    <div class="matchups-grid">
      ${week.matchups.map(matchup => {
        const away = matchup.away;
        const home = matchup.home;

        let winnerId = null;
        if (away.optimum > home.optimum) winnerId = away.id;
        if (home.optimum > away.optimum) winnerId = home.id;

        function renderTeam(team) {
          const result = winnerId === null
            ? "Tie"
            : winnerId === team.id ? "Win" : "Loss";

          const resultClass = winnerId === null
            ? "tie"
            : winnerId === team.id ? "win" : "loss";

          return `
            <div class="matchup-team">
              <div>
                <span class="team-name">${escapeHTML(team.name)}</span>
                <span class="result ${resultClass}">${result}</span>
              </div>
              <strong>${formatPoints(team.optimum)}</strong>
            </div>
          `;
        }

        return `
          <article class="matchup-card">
            ${renderTeam(away)}
            ${renderTeam(home)}
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function render() {
  const selectedWeek = Number(weekSelect.value);
  renderStandings(selectedWeek);
  renderMatchups(selectedWeek);
}

async function loadData() {
  statusElement.textContent = "Loading season data…";

  try {
    const response = await fetch(`${DATA_URL}?v=${Date.now()}`);

    if (!response.ok) {
      throw new Error(`Could not load season data (${response.status}).`);
    }

    seasonData = await response.json();

    if (!Array.isArray(seasonData.weeks)) {
      throw new Error("Season data has an invalid format.");
    }

    const availableWeeks = seasonData.weeks
      .filter(week => Array.isArray(week.matchups) && week.matchups.length > 0)
      .sort((a, b) => a.week - b.week);

    weekSelect.innerHTML = availableWeeks.map(week => `
      <option value="${week.week}">Week ${week.week}</option>
    `).join("");

    if (availableWeeks.length === 0) {
      throw new Error("No weekly results are available yet.");
    }

    weekSelect.value = String(availableWeeks[availableWeeks.length - 1].week);
    updatedElement.textContent = seasonData.updatedAt
      ? new Date(seasonData.updatedAt).toLocaleString()
      : "Not available";

    render();
    statusElement.textContent = "";
  } catch (error) {
    console.error(error);
    statusElement.textContent =
      "Season data could not be loaded. The data file may not have been created yet.";
  }
}

weekSelect.addEventListener("change", render);

loadData();
