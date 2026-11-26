const DATA_URL = "./data/season.json";

const standingsElement = document.querySelector("#standings");
const matchupsElement = document.querySelector("#matchups");
const draftOrderElement = document.querySelector("#draft-order");
const draftUpdatedElement = document.querySelector("#draft-updated-at");
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
    if (week.week > selectedWeek || week.week > 14) continue;

    for (const matchup of week.matchups) {
      for (const team of [matchup.away, matchup.home]) {
        if (!records.has(String(team.id))) {
          records.set(String(team.id), {
            id: String(team.id),
            name: team.name,
            wins: 0,
            losses: 0,
            ties: 0,
            pointsFor: 0
          });
        }
      }

      const away = records.get(String(matchup.away.id));
      const home = records.get(String(matchup.home.id));

      away.pointsFor += Number(matchup.away.optimum);
      home.pointsFor += Number(matchup.home.optimum);

      if (Number(matchup.away.optimum) > Number(matchup.home.optimum)) {
        away.wins++;
        home.losses++;
      } else if (Number(matchup.home.optimum) > Number(matchup.away.optimum)) {
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
    b.pointsFor - a.pointsFor ||
    a.name.localeCompare(b.name)
  );
}

function renderStandings(selectedWeek) {
  const standings = getStandings(seasonData.weeks, selectedWeek);

  const previousWeek = seasonData.weeks
    .filter(week =>
      week.week < selectedWeek &&
      week.week <= 14 &&
      Array.isArray(week.matchups) &&
      week.matchups.length > 0
    )
    .sort((a, b) => b.week - a.week)[0];

  const previousRanks = new Map();

  if (previousWeek) {
    getStandings(seasonData.weeks, previousWeek.week).forEach((team, index) => {
      previousRanks.set(team.id, index + 1);
    });
  }

  standingsElement.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Movement</th>
            <th>Team</th>
            <th>W</th>
            <th>L</th>
            <th>T</th>
            <th>Opt Pts For</th>
          </tr>
        </thead>
        <tbody>
          ${standings.map((team, index) => {
            const currentRank = index + 1;
            const previousRank = previousRanks.get(team.id);
            let movement = "—";
            let movementClass = "rank-same";

            if (previousRank !== undefined) {
              const difference = previousRank - currentRank;
              if (difference > 0) {
                movement = `▲ +${difference}`;
                movementClass = "rank-up";
              } else if (difference < 0) {
                movement = `▼ ${difference}`;
                movementClass = "rank-down";
              } else {
                movement = "— 0";
              }
            }

            return `
              <tr>
                <td>${currentRank}</td>
                <td><span class="rank-movement ${movementClass}">${movement}</span></td>
                <td class="team-name">${escapeHTML(team.name)}</td>
                <td>${team.wins}</td>
                <td>${team.losses}</td>
                <td>${team.ties}</td>
                <td>${formatPoints(team.pointsFor)}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderMatchups(selectedWeek) {
  const week = seasonData.weeks.find(
    item => item.week === selectedWeek && item.week <= 14
  );

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

        if (Number(away.optimum) > Number(home.optimum)) winnerId = away.id;
        if (Number(home.optimum) > Number(away.optimum)) winnerId = home.id;

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

function renderDraftOrder() {
  const leagueStandings = seasonData.fleaflickerStandings;
  const fleaTeams = leagueStandings?.teams;
  const latestAvailableWeek = Math.max(
    ...seasonData.weeks
      .filter(week => week.week <= 14 && Array.isArray(week.matchups) && week.matchups.length > 0)
      .map(week => Number(week.week))
  );

  if (!Array.isArray(fleaTeams) || fleaTeams.length !== 14) {
    draftOrderElement.innerHTML =
      "<p>Current Fleaflicker standings are not available yet. They will appear after the next data refresh.</p>";
    draftUpdatedElement.textContent = "";
    return;
  }

  const optimumStandings = getStandings(seasonData.weeks, latestAvailableWeek);
  const optimumById = new Map(
    optimumStandings.map((team, index) => [
      String(team.id),
      { ...team, optimumRank: index + 1 }
    ])
  );

  // Fleaflicker's top six are playoff teams and are excluded from draft-order calculations.
  const nonPlayoffTeams = fleaTeams
    .filter(team => Number(team.rank) > 6)
    .map(team => {
      const optimum = optimumById.get(String(team.id));
      return {
        ...team,
        optimum: optimum ?? null
      };
    });

  if (nonPlayoffTeams.length !== 8) {
    draftOrderElement.innerHTML =
      "<p>Could not identify exactly eight non-playoff teams from Fleaflicker standings.</p>";
    draftUpdatedElement.textContent = "";
    return;
  }

  // Worst Optimum Points Record receives Pick 1; total Optimum Points For breaks ties.
  nonPlayoffTeams.sort((a, b) => {
    if (!a.optimum && !b.optimum) return Number(b.rank) - Number(a.rank);
    if (!a.optimum) return -1;
    if (!b.optimum) return 1;
    return b.optimum.optimumRank - a.optimum.optimumRank;
  });

  draftOrderElement.innerHTML = `
    <div class="table-wrap">
      <table class="draft-table">
        <thead>
          <tr>
            <th>Draft pick</th>
            <th>Fleaflicker rank</th>
            <th>Team</th>
            <th>Optimum record</th>
            <th>Opt Pts For</th>
          </tr>
        </thead>
        <tbody>
          ${nonPlayoffTeams.map((team, index) => `
            <tr>
              <td class="pick-number">${index + 1}</td>
              <td class="fleaflicker-rank">#${team.rank}</td>
              <td class="draft-team">${escapeHTML(team.name)}</td>
              <td>${team.optimum
                ? `${team.optimum.wins}-${team.optimum.losses}-${team.optimum.ties}`
                : "—"}</td>
              <td>${team.optimum
                ? formatPoints(team.optimum.pointsFor)
                : "—"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  draftUpdatedElement.textContent = leagueStandings.updatedAt
    ? `Fleaflicker standings last refreshed: ${new Date(leagueStandings.updatedAt).toLocaleString()}`
    : "";
}

function render() {
  const selectedWeek = Number(weekSelect.value);
  renderStandings(selectedWeek);
  renderMatchups(selectedWeek);
  renderDraftOrder();
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
      .filter(week =>
        week.week <= 14 &&
        Array.isArray(week.matchups) &&
        week.matchups.length > 0
      )
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
