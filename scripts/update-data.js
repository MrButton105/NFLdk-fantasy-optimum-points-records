
const fs = require("node:fs");
const path = require("node:path");

const LEAGUE_ID = "183611";
const SEASON = "2026";
const WEEK = process.env.WEEK || "5";

const API_BASE = "https://www.fleaflicker.com/api";
const OUTPUT_FILE = path.join(
  process.cwd(),
  "data",
  "season.json"
);

async function getJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Fleaflicker API error: HTTP ${response.status}`);
  }

  return response.json();
}

function getOptimumPoints(points, label) {
  const value = points?.total?.optimum?.value;

  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing optimum points for ${label}`);
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`Invalid optimum points for ${label}`);
  }

  return number;
}

function getTeamId(team, fallbackName) {
  const id = team?.id ?? team?.teamId ?? team?.franchiseId;

  return String(id ?? fallbackName);
}

function getTeamName(team, fallback) {
  return team?.name
    ?? team?.displayName
    ?? team?.teamName
    ?? fallback;
}

async function main() {
  const params = new URLSearchParams({
    sport: "NFL",
    league_id: LEAGUE_ID,
    season: SEASON,
    scoring_period: WEEK
  });

  const scoreboard = await getJSON(
    `${API_BASE}/FetchLeagueScoreboard?${params}`
  );

  if (!Array.isArray(scoreboard.games) || scoreboard.games.length === 0) {
    throw new Error(`No matchups found for Week ${WEEK}.`);
  }

  const matchups = [];

  for (const game of scoreboard.games) {
    const gameId = game.id ?? game.fantasy_game_id;

    if (!gameId) {
      throw new Error("A matchup is missing its game ID.");
    }

    const boxParams = new URLSearchParams({
      sport: "NFL",
      league_id: LEAGUE_ID,
      fantasy_game_id: String(gameId),
      scoring_period: WEEK
    });

    const boxscore = await getJSON(
      `${API_BASE}/FetchLeagueBoxscore?${boxParams}`
    );

    const awayTeam = boxscore.game?.away ?? game.away;
    const homeTeam = boxscore.game?.home ?? game.home;

    const awayName = getTeamName(awayTeam, "Away team");
    const homeName = getTeamName(homeTeam, "Home team");

    matchups.push({
      id: String(gameId),
      away: {
        id: getTeamId(awayTeam, awayName),
        name: awayName,
        optimum: getOptimumPoints(boxscore.pointsAway, awayName)
      },
      home: {
        id: getTeamId(homeTeam, homeName),
        name: homeName,
        optimum: getOptimumPoints(boxscore.pointsHome, homeName)
      }
    });
  }

  let seasonData = {
    leagueId: Number(LEAGUE_ID),
    season: Number(SEASON),
    updatedAt: null,
    weeks: []
  };

  if (fs.existsSync(OUTPUT_FILE)) {
    seasonData = JSON.parse(
      fs.readFileSync(OUTPUT_FILE, "utf8")
    );
  }

  const updatedWeek = {
    week: Number(WEEK),
    matchups
  };

  const existingIndex = seasonData.weeks.findIndex(
    item => item.week === Number(WEEK)
  );

  if (existingIndex >= 0) {
    seasonData.weeks[existingIndex] = updatedWeek;
  } else {
    seasonData.weeks.push(updatedWeek);
  }

  seasonData.weeks.sort((a, b) => a.week - b.week);
  seasonData.updatedAt = new Date().toISOString();

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(seasonData, null, 2) + "\n"
  );

  console.log(
    `Saved Week ${WEEK}: ${matchups.length} matchups to ${OUTPUT_FILE}`
  );
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
