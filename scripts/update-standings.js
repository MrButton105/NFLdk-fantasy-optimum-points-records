const fs = require("node:fs");
const path = require("node:path");

const LEAGUE_ID = "183611";
const SEASON = "2026";
const API_BASE = "https://www.fleaflicker.com/api";
const OUTPUT_FILE = path.join(process.cwd(), "data", "season.json");

async function getJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Fleaflicker API error: HTTP ${response.status} for ${url}`);
  }

  return response.json();
}

async function main() {
  const params = new URLSearchParams({
    sport: "NFL",
    league_id: LEAGUE_ID,
    season: SEASON
  });

  const response = await getJSON(
    `${API_BASE}/FetchLeagueStandings?${params}`
  );

  const teams = (response.divisions ?? []).flatMap(division =>
    (division.teams ?? []).map(team => ({
      id: String(team.id),
      name: team.name,
      rank: Number(team.record_overall?.rank ?? 0),
      wins: Number(team.record_overall?.wins ?? 0),
      losses: Number(team.record_overall?.losses ?? 0),
      ties: Number(team.record_overall?.ties ?? 0),
      pointsFor: Number(team.points_for?.value ?? 0)
    }))
  );

  if (teams.length !== 14) {
    throw new Error(
      `Expected 14 teams in Fleaflicker standings, received ${teams.length}. Refusing to save incomplete standings.`
    );
  }

  teams.sort((a, b) =>
    (a.rank || 999) - (b.rank || 999) ||
    b.wins - a.wins ||
    a.losses - b.losses ||
    b.pointsFor - a.pointsFor
  );

  teams.forEach((team, index) => {
    if (!team.rank) team.rank = index + 1;
  });

  let seasonData = {
    leagueId: Number(LEAGUE_ID),
    season: Number(SEASON),
    updatedAt: null,
    weeks: []
  };

  if (fs.existsSync(OUTPUT_FILE)) {
    seasonData = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
  }

  seasonData.fleaflickerStandings = {
    updatedAt: new Date().toISOString(),
    teams
  };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(seasonData, null, 2) + "\n"
  );

  console.log("Saved current Fleaflicker standings:");
  teams.forEach(team =>
    console.log(`#${team.rank} ${team.name} (${team.wins}-${team.losses}-${team.ties})`)
  );
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
