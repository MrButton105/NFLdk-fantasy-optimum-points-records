
const fs = require("node:fs");
const path = require("node:path");

const LEAGUE_ID = "183611";
const SEASON = "2026";
const WEEK = Number(process.env.WEEK);

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

function getOptimumPoints(points, teamName) {
  const value = points?.total?.optimum?.value;

  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing Optimum Points for ${teamName}`);
  }

  const score = Number(value);

  if (!Number.isFinite(score)) {
    throw new Error(`Invalid Optimum Points for ${teamName}`);
  }

  return score;
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
  if (!Number.isInteger(WEEK) || WEEK < 1 || WEEK > 18) {
    throw new Error("Set WEEK to a number between 1 and 18.");
  }

  const params = new URLSearchParams({
    sport: "NFL",
    league_id: LEAGUE_ID,
    season: SEASON,
    scoring_period: String(WEEK)
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
      scoring_period: String(WEEK)
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
    week: WEEK,
    matchups
  };

  const existingIndex = seasonData.weeks.findIndex(
    item => item.week === WEEK
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
    `Saved Week ${WEEK}: ${matchups.length} matchups.`
  );
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
