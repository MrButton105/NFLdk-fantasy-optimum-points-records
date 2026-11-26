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

function numberValue(value) {
  if (value && typeof value === "object" && "value" in value) {
    return Number(value.value);
  }
  return Number(value ?? 0);
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
    (division.teams ?? []).map(team => {
      // Fleaflicker JSON uses camelCase; accept snake_case as a fallback.
      const record = team.recordOverall ?? team.record_overall ?? {};
      return {
        id: String(team.id),
        name: team.name,
        rank: Number(record.rank ?? team.rank ?? 0),
        wins: Number(record.wins ?? 0),
        losses: Number(record.losses ?? 0),
        ties: Number(record.ties ?? 0),
        pointsFor: numberValue(team.pointsFor ?? team.points_for)
      };
    })
  );

  if (teams.length !== 14) {
    throw new Error(
      `Expected 14 teams in Fleaflicker standings, received ${teams.length}. Refusing to save incomplete standings.`
    );
  }

  if (teams.some(team => team.wins + team.losses + team.ties === 0)) {
    throw new Error(
      "Fleaflicker standings did not include valid overall records. Refusing to publish empty standings."
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

  const seasonData = fs.existsSync(OUTPUT_FILE)
    ? JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"))
    : {
        leagueId: Number(LEAGUE_ID),
        season: Number(SEASON),
        updatedAt: null,
        weeks: []
      };

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
