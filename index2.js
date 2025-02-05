const axios = require("axios");
const { Client } = require("pg");
const { DateTime } = require("luxon");
const {
  handleGenres,
  handleGameModes,
  handlePlayerPerspectives,
  handleThemes,
  handleKeywords,
  handleAlternativeNames,
  handleGameEngines,
  handleLanguageSupports,
  handleInvolvedCompanies,
  handleFrenchies,
  handleExternalGames,
  handleCoverImage,
  handleBackgroundImage,
  handleScreenShots,
  handleCollections,
  handlePlatforms,
  handleVideos,
  handleWebsiteLinks,
  getRewrittenDescription,
  handleReleaseDates,
} = require("./utills");
require("dotenv").config();

//prod cred:
// const strapiUrl = process.env.PROD_STRAPI_URL;
// const strapiToken = process.env.PROD_API_TOKEN;

//stage cred:
const strapiUrl = process.env.STAGE_STRAPI_URL;
const strapiToken = process.env.STAGE_API_TOKEN;

const TWITCH_AUTH_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_API_URL = "https://api.igdb.com/v4/games";
const CHUNK_SIZE = 75;
const CLIENT_ID = "d0vu4uargc119cfvauchk0hw7n0qh6";
const CLIENT_SECRET = "18r7bxgrlr5n2jnqomhd5vtsnaq605";

const categoryMapping = {
  0: "main_game",
  1: "dlc_addon",
  2: "expansion",
  3: "bundle",
  4: "standalone_expansion",
  5: "mod",
  6: "episode",
  7: "season",
  8: "remake",
  9: "remaster",
  10: "expanded_game",
  11: "port",
  12: "fork",
  13: "pack",
  14: "update",
};

//production database cred
// const dbClient = new Client({
//   user: "postgres",
//   host: "trugamer-prod-db5.cdeu2squiugy.eu-north-1.rds.amazonaws.com",
//   database: "trugamerdb",
//   password: "_MN%CMeRXHMiq5a",
//   port: 5432,
// });

//stage database cred
const dbClient = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

let accessToken = null;

const gamesArr = [
  {
    id: 6292,
    created_at: 1398088182,
    name: "Diablo IV: Season of Witchcraft",
    slug: "diablo-iv-season-of-witchcraft",
    updated_at: 1738220152,
    url: "https://www.igdb.com/games/diablo-iv-season-of-witchcraft",
  },
  // {
  //   id: 217815,
  //   created_at: 1663263833,
  //   name: "Call of Duty: Warzone 2.0",
  //   slug: "call-of-duty-warzone-2-dot-0",
  //   updated_at: 1738220129,
  //   url: "https://www.igdb.com/games/call-of-duty-warzone-2-dot-0",
  // },
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchAccessToken = async () => {
  const { data } = await axios.post(TWITCH_AUTH_URL, null, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    params: {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials",
    },
  });
  accessToken = data.access_token;
};

const fetchGames = async (slug, url) => {
  const result = await dbClient.query(
    "SELECT * FROM games WHERE slug = $1 OR site_url = $2 LIMIT 1",
    [slug, url]
  );
  return result.rows;
};

const updateGame = async (gameId, updatedData) => {
  console.log(updatedData, "updated dtaat");
  const headerFromApi = {
    "Client-ID": CLIENT_ID,
    Authorization: `Bearer ${accessToken}`,
  };
  const objData = await objectForGame(updatedData, headerFromApi);
  await updateOrCreateGameDataWithNewFeilds(objData, gameId);
};

const createGame = async (createdData) => {
  const headerFromApi = {
    "Client-ID": CLIENT_ID,
    Authorization: `Bearer ${accessToken}`,
  };
  const objData = await objectForGame(createdData, headerFromApi);
  await updateOrCreateGameDataWithNewFeilds(objData);
};
function addPublishedAtIfRequired(gameData) {
  const requiredFields = [
    "title",
    "description",
    "coverImage",
    "devices",
    "releaseByPlatforms",
    "website_links",
  ];

  // Check if all required fields are present in either gameData or imageData
  const allRequiredFieldsPresent = requiredFields.every(
    (field) =>
      (gameData[field] && gameData[field] !== "") ||
      (field === "coverImage" && gameData?.cover_image)
  );
  return allRequiredFieldsPresent ? DateTime.now().toISO() : null;
}

const processGames = async (games) => {
  const gamesWithSiteUrl = games.filter((game) => game.url);
  const siteUrls = gamesWithSiteUrl.map((game) => game.url);
  console.log(siteUrls, "siteUrlssss");
  let updatedDataWithSiteUrl = [];

  if (siteUrls.length > 0) {
    const siteUrlQuery = `fields *,genres.name,game_modes.name,player_perspectives.name,game_engines.name,involved_companies.developer,involved_companies.publisher,involved_companies.company.name,keywords.name,platforms.name,release_dates.*,screenshots.url,themes.name,videos.video_id,videos.name,websites.category,websites.url,language_supports.language.name,game_localizations.*,similar_games.*,external_games.name,cover.url,artworks.url,age_ratings.*,franchises.name,collections.name,release_dates.platform.*,alternative_names.name,similar_games.genres.name,similar_games.game_modes.name,similar_games.player_perspectives.name,similar_games.game_engines.name,similar_games.involved_companies.developer,similar_games.involved_companies.publisher,similar_games.involved_companies.company.name,similar_games.keywords.name,similar_games.platforms.name,similar_games.release_dates.*,similar_games.screenshots.url,similar_games.themes.name,similar_games.videos.video_id,similar_games.videos.name,similar_games.websites.category,similar_games.websites.url,similar_games.language_supports.language.name,similar_games.game_localizations.*,similar_games.similar_games.*,similar_games.external_games.name,similar_games.cover.url,similar_games.artworks.url,similar_games.age_ratings.*,similar_games.franchises.name,similar_games.collections.name,similar_games.release_dates.platform.*,expansions.*,similar_games.alternative_names.name,expansions.genres.name,expansions.game_modes.name,expansions.player_perspectives.name,expansions.game_engines.name,expansions.involved_companies.developer,expansions.involved_companies.publisher,expansions.involved_companies.company.name,expansions.keywords.name,expansions.platforms.name,expansions.release_dates.*,expansions.screenshots.url,expansions.themes.name,expansions.videos.video_id,expansions.videos.name,expansions.websites.category,expansions.websites.url,expansions.language_supports.language.name,expansions.game_localizations.*,expansions.similar_games.*,expansions.external_games.name,expansions.cover.url,expansions.artworks.url,expansions.age_ratings.*,expansions.franchises.name,expansions.collections.name,expansions.release_dates.platform.*,expansions.expansions.*,expansions.alternative_names.name; url; where url = (${siteUrls
      .map((url) => `"${url}"`)
      .join(",")}); limit ${siteUrls.length};`;

    updatedDataWithSiteUrl = await fetchFromIGDB(siteUrlQuery);
  }
  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    let updatedData;
    const gamesExistsInDb = await fetchGames(game.slug, game.url);
    if (
      gamesExistsInDb &&
      gamesExistsInDb.length > 0 &&
      gamesExistsInDb[0]?.site_url
    ) {
      updatedData = updatedDataWithSiteUrl.find(
        (data) => data.url === gamesExistsInDb[0]?.site_url
      );
      if (updatedData) {
        await updateGame(gamesExistsInDb[0]?.id, updatedData);
      }
    } else {
      console.log("inside else!!", updatedDataWithSiteUrl);

      // Correctly get the data from updatedDataWithSiteUrl using game.url
      updatedData = updatedDataWithSiteUrl.find(
        (data) => data.url === game.url
      );
      if (updatedData) {
        await createGame(updatedData);
      }
    }
  }
};
const fetchFromIGDB = async (query) => {
  const response = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
    },
    body: query,
  });
  const data = await response.json();
  return data; // Return the result of the IGDB API call
};

const startProcess = async () => {
  try {
    await dbClient.connect();
    await fetchAccessToken();
    if (accessToken) {
      if (gamesArr && gamesArr.length > 0) {
        await processGames(gamesArr);
      }
    }
  } catch (err) {
    console.error("Error connecting to the database:", err);
  }
};

const checkIfGameExists = async (slug) => {
  try {
    const strapiApiUrl = `${strapiUrl}/api/games/${slug}`;
    const response = await axios.get(strapiApiUrl);
    return response.data;
  } catch (error) {
    console.error(`Error checking for game with slug "${slug}":`, error);
    return null;
  }
};

const createGameEntryInStrapi = async (gameData) => {
  try {
    const strapiApiUrl = `${strapiUrl}/api/games`;
    const response = await axios.post(strapiApiUrl, { data: gameData });
    console.log("Game entry created successfully:");
    return response.data;
  } catch (error) {
    console.error(
      "Error creating game entry:",
      error.response ? error.response.data : error
    );
  }
};

const handleSimilarGames = async (
  parsedData,
  headerFromApi,
  processedGames = []
) => {
  if (parsedData.similar_games) {
    const categoryMapping = {
      0: "main_game",
      1: "dlc_addon",
      2: "expansion",
      3: "bundle",
      4: "standalone_expansion",
      5: "mod",
      6: "episode",
      7: "season",
      8: "remake",
      9: "remaster",
      10: "expanded_game",
      11: "port",
      12: "fork",
      13: "pack",
      14: "update",
    };
    let similarGamesArray = [];

    if (typeof parsedData.similar_games === "string") {
      parsedData.similar_games = parsedData.similar_games
        .replace(/{|}/g, "")
        .split(",")
        .map((id) => id.trim());
    }
    if (parsedData.similar_games && parsedData.similar_games.length > 0) {
      try {
        const gameIds = parsedData.similar_games
          .map((game) => game.id)
          .join(",");
        const query = `fields *,genres.name,game_modes.name,player_perspectives.name,game_engines.name,involved_companies.developer,involved_companies.publisher,involved_companies.company.name,keywords.name,platforms.name,release_dates.*,screenshots.url,themes.name,videos.video_id,videos.name,websites.category,websites.url,language_supports.language.name,game_localizations.*,similar_games.*,external_games.name,cover.url,artworks.url,age_ratings.*,franchises.name,collections.name,release_dates.platform.*,alternative_names.name,similar_games.genres.name,similar_games.game_modes.name,similar_games.player_perspectives.name,similar_games.game_engines.name,similar_games.involved_companies.developer,similar_games.involved_companies.publisher,similar_games.involved_companies.company.name,similar_games.keywords.name,similar_games.platforms.name,similar_games.release_dates.*,similar_games.screenshots.url,similar_games.themes.name,similar_games.videos.video_id,similar_games.videos.name,similar_games.websites.category,similar_games.websites.url,similar_games.language_supports.language.name,similar_games.game_localizations.*,similar_games.similar_games.*,similar_games.external_games.name,similar_games.cover.url,similar_games.artworks.url,similar_games.age_ratings.*,similar_games.franchises.name,similar_games.collections.name,similar_games.release_dates.platform.*,expansions.*,similar_games.alternative_names.name,expansions.genres.name,expansions.game_modes.name,expansions.player_perspectives.name,expansions.game_engines.name,expansions.involved_companies.developer,expansions.involved_companies.publisher,expansions.involved_companies.company.name,expansions.keywords.name,expansions.platforms.name,expansions.release_dates.*,expansions.screenshots.url,expansions.themes.name,expansions.videos.video_id,expansions.videos.name,expansions.websites.category,expansions.websites.url,expansions.language_supports.language.name,expansions.game_localizations.*,expansions.similar_games.*,expansions.external_games.name,expansions.cover.url,expansions.artworks.url,expansions.age_ratings.*,expansions.franchises.name,expansions.collections.name,expansions.release_dates.platform.*,expansions.expansions.*,expansions.alternative_names.name; where id = (${gameIds});`;
        const similarGamesResponse = await fetchWithRetry(
          "https://api.igdb.com/v4/games",
          query,
          headerFromApi
        );
        // Process each similar game
        for (const similarGame of similarGamesResponse.data) {
          // Check if the game already exists in Strapi

          const existingGame = await checkIfGameExists(similarGame.slug);
          let gameId;
          if (existingGame) {
            // If the game exists, use its ID
            gameId = existingGame.id;
            similarGamesArray.push(gameId);
          } else {
            const categoryId = similarGame.category;
            const categoryName = categoryMapping[categoryId];
            const gameGenres = await handleGenres(similarGame);
            const gameModes = await handleGameModes(similarGame);
            const gamePlayerPerspectives = await handlePlayerPerspectives(
              similarGame
            );
            const gameThemes = await handleThemes(similarGame);
            const gameKeywords = await handleKeywords(similarGame);
            const gameAlternativeNames = await handleAlternativeNames(
              similarGame
            );
            const gameEngines = await handleGameEngines(similarGame);
            const gameLanguageSupports = await handleLanguageSupports(
              similarGame
            );
            const gameInvolvedCompanies = await handleInvolvedCompanies(
              similarGame
            );
            const gameFranchies = await handleFrenchies(similarGame);
            const externalGames = await handleExternalGames(similarGame);
            const gameCoverImage = await handleCoverImage(similarGame);
            const gameBackgroundImage = await handleBackgroundImage(
              similarGame
            );
            const gameScreenShots = await handleScreenShots(similarGame);
            const gameCollections = await handleCollections(similarGame);
            const gamePlatforms = await handlePlatforms(similarGame);
            const gameVideos = await handleVideos(similarGame);
            const gameWebsiteLinks = await handleWebsiteLinks(similarGame);
            const promtGeneratedDescription = await getRewrittenDescription(
              similarGame?.name,
              similarGame?.summary
            );
            const gameReleaseDates = await handleReleaseDates(
              similarGame,
              headerFromApi
            );
            const gameSeriesOrSpinOff = await handleSeriesAndSpinOff(
              similarGame,
              headerFromApi
            );
            // const expansionGames = await handleGameExpansions(
            //   parsedData,
            //   headerFromApi
            // );
            const relatedGames = await handleSimilarGames(
              { similar_games: similarGame.similar_games || [] },
              headerFromApi,
              [...processedGames, similarGame.id]
            );
            const newGame = {
              title: similarGame.name || null,
              slug: similarGame.slug || null,
              site_url: similarGame.url,
              genres: gameGenres || [],
              game_modes: gameModes || [],
              player_perspective: gamePlayerPerspectives || [],
              themes: gameThemes || [],
              keywords: gameKeywords || [],
              alternative_names: gameAlternativeNames || [],
              game_engines: gameEngines || [],
              language_supports: gameLanguageSupports || [],
              involved_companies:
                (gameInvolvedCompanies &&
                  gameInvolvedCompanies?.involvedCompaniesArray) ||
                [],
              publisher:
                (gameInvolvedCompanies &&
                  gameInvolvedCompanies?.publishersArray) ||
                [],
              developer:
                gameInvolvedCompanies &&
                gameInvolvedCompanies?.developersArray &&
                gameInvolvedCompanies?.developersArray.length > 0
                  ? gameInvolvedCompanies?.developersArray
                  : [],
              franchises: gameFranchies || [],
              external_games: externalGames || [],
              coverImage: gameCoverImage || null,
              image: gameBackgroundImage || null,
              ...(gameScreenShots &&
                gameScreenShots.length > 0 && {
                  screenshots: gameScreenShots,
                }),
              collections: gameCollections || [],
              platforms: gamePlatforms || [],
              videos: gameVideos || [],
              website_links: gameWebsiteLinks || [],
              description: promtGeneratedDescription || null,
              releaseByPlatforms: {
                release:
                  gameReleaseDates?.releaseByPlatformsArray &&
                  gameReleaseDates?.releaseByPlatformsArray.length > 0
                    ? gameReleaseDates?.releaseByPlatformsArray
                    : [],
              },
              devices: gameReleaseDates?.devicesArray || [],
              firstReleaseDate: gameReleaseDates?.earliestReleaseDate || null,
              latestReleaseDate: gameReleaseDates?.latestReleaseDate || null,
              // game_category: categoryName || null,
              aggregateRating: similarGame.aggregated_rating || null,
              series: gameSeriesOrSpinOff?.seriesName || null,
              isSpinOff: gameSeriesOrSpinOff?.isSpinOffName || null,
              // expansions: expansionGames || [],
              related_games: relatedGames || [],
              publishedAt: addPublishedAtIfRequired(similarGame),
              isUpdatedFromScript: true,
            };
            const createdGame = await createGameEntryInStrapi(newGame);
            gameId = createdGame.data.id;
            similarGamesArray.push(gameId);
          }
        }
        console.log(similarGamesArray, "similarGamesArray");
        // Return the array of similar game IDs
        return similarGamesArray;
      } catch (error) {
        console.error(`Failed to handle similar games: ${error.message}`);
        return [];
      }
    }
  }
  return [];
};

const handleGameExpansions = async (
  parsedData,
  headerFromApi,
  processedGames = []
) => {
  if (parsedData.expansions) {
    const categoryMapping = {
      0: "main_game",
      1: "dlc_addon",
      2: "expansion",
      3: "bundle",
      4: "standalone_expansion",
      5: "mod",
      6: "episode",
      7: "season",
      8: "remake",
      9: "remaster",
      10: "expanded_game",
      11: "port",
      12: "fork",
      13: "pack",
      14: "update",
    };
    let expansionGamesArray = [];

    if (typeof parsedData.expansions === "string") {
      parsedData.expansions = parsedData.expansions
        .replace(/{|}/g, "")
        .split(",")
        .map((id) => id.trim());
    }
    if (parsedData.expansions && parsedData.expansions.length > 0) {
      try {
        const gameIds = parsedData.expansions.map((game) => game.id).join(",");
        const query = `fields *,genres.name,game_modes.name,player_perspectives.name,game_engines.name,involved_companies.developer,involved_companies.publisher,involved_companies.company.name,keywords.name,platforms.name,release_dates.*,screenshots.url,themes.name,videos.video_id,videos.name,websites.category,websites.url,language_supports.language.name,game_localizations.*,similar_games.*,external_games.name,cover.url,artworks.url,age_ratings.*,franchises.name,collections.name,release_dates.platform.*,alternative_names.name,similar_games.genres.name,similar_games.game_modes.name,similar_games.player_perspectives.name,similar_games.game_engines.name,similar_games.involved_companies.developer,similar_games.involved_companies.publisher,similar_games.involved_companies.company.name,similar_games.keywords.name,similar_games.platforms.name,similar_games.release_dates.*,similar_games.screenshots.url,similar_games.themes.name,similar_games.videos.video_id,similar_games.videos.name,similar_games.websites.category,similar_games.websites.url,similar_games.language_supports.language.name,similar_games.game_localizations.*,similar_games.similar_games.*,similar_games.external_games.name,similar_games.cover.url,similar_games.artworks.url,similar_games.age_ratings.*,similar_games.franchises.name,similar_games.collections.name,similar_games.release_dates.platform.*,expansions.*,similar_games.alternative_names.name,expansions.genres.name,expansions.game_modes.name,expansions.player_perspectives.name,expansions.game_engines.name,expansions.involved_companies.developer,expansions.involved_companies.publisher,expansions.involved_companies.company.name,expansions.keywords.name,expansions.platforms.name,expansions.release_dates.*,expansions.screenshots.url,expansions.themes.name,expansions.videos.video_id,expansions.videos.name,expansions.websites.category,expansions.websites.url,expansions.language_supports.language.name,expansions.game_localizations.*,expansions.similar_games.*,expansions.external_games.name,expansions.cover.url,expansions.artworks.url,expansions.age_ratings.*,expansions.franchises.name,expansions.collections.name,expansions.release_dates.platform.*,expansions.expansions.*,expansions.alternative_names.name; where id = (${gameIds});`;
        const expansionGamesResponse = await fetchWithRetry(
          "https://api.igdb.com/v4/games",
          query,
          headerFromApi
        );
        // Process each expansion game
        for (const expansionGame of expansionGamesResponse.data) {
          // Check if the game already exists in Strapi

          const existingGame = await checkIfGameExists(expansionGame.slug);
          let gameId;
          if (existingGame) {
            // If the game exists, use its ID
            gameId = existingGame.id;
            expansionGamesArray.push(gameId);
          } else {
            const categoryId = expansionGame.category;
            const categoryName = categoryMapping[categoryId];
            const gameGenres = await handleGenres(expansionGame);
            const gameModes = await handleGameModes(expansionGame);
            const gamePlayerPerspectives = await handlePlayerPerspectives(
              expansionGame
            );
            const gameThemes = await handleThemes(expansionGame);
            const gameKeywords = await handleKeywords(expansionGame);
            const gameAlternativeNames = await handleAlternativeNames(
              expansionGame
            );
            const gameEngines = await handleGameEngines(expansionGame);
            const gameLanguageSupports = await handleLanguageSupports(
              expansionGame
            );
            const gameInvolvedCompanies = await handleInvolvedCompanies(
              expansionGame
            );
            const gameFranchies = await handleFrenchies(expansionGame);
            const externalGames = await handleExternalGames(expansionGame);
            const gameCoverImage = await handleCoverImage(expansionGame);
            const gameBackgroundImage = await handleBackgroundImage(
              expansionGame
            );
            const gameScreenShots = await handleScreenShots(expansionGame);
            const gameCollections = await handleCollections(expansionGame);
            const gamePlatforms = await handlePlatforms(expansionGame);
            const gameVideos = await handleVideos(expansionGame);
            const gameWebsiteLinks = await handleWebsiteLinks(expansionGame);
            const promtGeneratedDescription = await getRewrittenDescription(
              expansionGame?.name,
              expansionGame?.summary
            );
            const gameReleaseDates = await handleReleaseDates(
              expansionGame,
              headerFromApi
            );
            const gameSeriesOrSpinOff = await handleSeriesAndSpinOff(
              expansionGame,
              headerFromApi
            );
            const similarGames = await handleSimilarGames(
              expansionGame,
              headerFromApi
            );
            const expansionGames = await handleGameExpansions(
              { expansion_games: expansionGames.expansions || [] },
              headerFromApi,
              [...processedGames, expansionGame.id]
            );
            //Add data in strapi
            const newGame = {
              title: parsedData.name || null,
              slug: parsedData.slug || null,
              site_url: parsedData.url,
              genres: gameGenres || [],
              game_modes: gameModes || [],
              player_perspective: gamePlayerPerspectives || [],
              themes: gameThemes || [],
              keywords: gameKeywords || [],
              alternative_names: gameAlternativeNames || [],
              game_engines: gameEngines || [],
              language_supports: gameLanguageSupports || [],
              involved_companies:
                (gameInvolvedCompanies &&
                  gameInvolvedCompanies?.involvedCompaniesArray) ||
                [],
              publisher:
                (gameInvolvedCompanies &&
                  gameInvolvedCompanies?.publishersArray) ||
                [],
              developer:
                gameInvolvedCompanies &&
                gameInvolvedCompanies?.developersArray &&
                gameInvolvedCompanies?.developersArray.length > 0
                  ? gameInvolvedCompanies?.developersArray
                  : [],
              franchises: gameFranchies || [],
              external_games: externalGames || [],
              coverImage: gameCoverImage || null,
              image: gameBackgroundImage || null,
              ...(gameScreenShots &&
                gameScreenShots.length > 0 && {
                  screenshots: gameScreenShots,
                }),
              collections: gameCollections || [],
              platforms: gamePlatforms || [],
              videos: gameVideos || [],
              website_links: gameWebsiteLinks || [],
              description: promtGeneratedDescription || null,
              releaseByPlatforms: {
                release:
                  gameReleaseDates?.releaseByPlatformsArray &&
                  gameReleaseDates?.releaseByPlatformsArray.length > 0
                    ? gameReleaseDates?.releaseByPlatformsArray
                    : [],
              },
              devices: gameReleaseDates?.devicesArray || [],
              firstReleaseDate: gameReleaseDates?.earliestReleaseDate || null,
              latestReleaseDate: gameReleaseDates?.latestReleaseDate || null,
              // game_category: categoryName || null,
              aggregateRating: parsedData.aggregated_rating || null,
              series: gameSeriesOrSpinOff?.seriesName || null,
              isSpinOff: gameSeriesOrSpinOff?.isSpinOffName || null,
              related_games: similarGames || [],
              expansions: expansionGames || [],
              publishedAt: addPublishedAtIfRequired(parsedData),
              isUpdatedFromScript: true,
              isExpansion: "true",
            };
            const createdGame = await createGameEntryInStrapi(newGame);
            gameId = createdGame.data.id;
            expansionGamesArray.push(gameId);
          }
        }
        // Return the array of expansion game IDs
        return expansionGamesArray;
      } catch (error) {
        console.error(`Failed to handle expansion games: ${error.message}`);
        return [];
      }
    }
  }
  return [];
};
// Function to get or create a season
const getOrCreateSeason = async (game, headerFromApi) => {
  const categoryMapping = {
    0: "main_game",
    1: "dlc_addon",
    2: "expansion",
    3: "bundle",
    4: "standalone_expansion",
    5: "mod",
    6: "episode",
    7: "season",
    8: "remake",
    9: "remaster",
    10: "expanded_game",
    11: "port",
    12: "fork",
    13: "pack",
    14: "update",
  };
  let seasonGame;
  try {
    if (game.category === 7) {
      // Check if the parent game exists
      const parentGame = game.parent_game
        ? await findOrCreateParentGame(game.parent_game, headerFromApi)
        : null;
      const categoryId = game.category;
      const categoryName = categoryMapping[categoryId];
      const gameGenres = await handleGenres(game);
      const gameModes = await handleGameModes(game);
      const gamePlayerPerspectives = await handlePlayerPerspectives(game);
      const gameThemes = await handleThemes(game);
      const gameKeywords = await handleKeywords(game);
      const gameAlternativeNames = await handleAlternativeNames(game);
      const gameEngines = await handleGameEngines(game);
      const gameLanguageSupports = await handleLanguageSupports(game);
      const gameInvolvedCompanies = await handleInvolvedCompanies(game);
      const gameFranchies = await handleFrenchies(game);
      const externalGames = await handleExternalGames(game);
      const gameCoverImage = await handleCoverImage(game);
      const gameBackgroundImage = await handleBackgroundImage(game);
      const gameScreenShots = await handleScreenShots(game);
      const gameCollections = await handleCollections(game);
      const gamePlatforms = await handlePlatforms(game);
      const gameVideos = await handleVideos(game);
      const gameWebsiteLinks = await handleWebsiteLinks(game);
      const promtGeneratedDescription = await getRewrittenDescription(
        game?.name,
        game?.summary
      );
      const gameReleaseDates = await handleReleaseDates(game, headerFromApi);
      const gameSeriesOrSpinOff = await handleSeriesAndSpinOff(
        game,
        headerFromApi
      );
      const expansionGames = await handleGameExpansions(game, headerFromApi);
      const similarGames = await handleSimilarGames(game, headerFromApi);
      //Add data in strapi
      const gameData = {
        title: game.name || null,
        slug: game.slug || null,
        site_url: game.url,
        genres: gameGenres || [],
        game_modes: gameModes || [],
        player_perspective: gamePlayerPerspectives || [],
        themes: gameThemes || [],
        keywords: gameKeywords || [],
        alternative_names: gameAlternativeNames || [],
        game_engines: gameEngines || [],
        language_supports: gameLanguageSupports || [],
        involved_companies:
          (gameInvolvedCompanies &&
            gameInvolvedCompanies?.involvedCompaniesArray) ||
          [],
        publisher:
          (gameInvolvedCompanies && gameInvolvedCompanies?.publishersArray) ||
          [],
        developer:
          gameInvolvedCompanies &&
          gameInvolvedCompanies?.developersArray &&
          gameInvolvedCompanies?.developersArray.length > 0
            ? gameInvolvedCompanies?.developersArray
            : [],
        franchises: gameFranchies || [],
        external_games: externalGames || [],
        coverImage: gameCoverImage || null,
        image: gameBackgroundImage || null,
        ...(gameScreenShots &&
          gameScreenShots.length > 0 && {
            screenshots: gameScreenShots,
          }),
        collections: gameCollections || [],
        platforms: gamePlatforms || [],
        videos: gameVideos || [],
        website_links: gameWebsiteLinks || [],
        description: promtGeneratedDescription || null,
        releaseByPlatforms: {
          release:
            gameReleaseDates?.releaseByPlatformsArray &&
            gameReleaseDates?.releaseByPlatformsArray.length > 0
              ? gameReleaseDates?.releaseByPlatformsArray
              : [],
        },
        devices: gameReleaseDates?.devicesArray || [],
        firstReleaseDate: gameReleaseDates?.earliestReleaseDate || null,
        latestReleaseDate: gameReleaseDates?.latestReleaseDate || null,
        // game_category: categoryName || null,
        aggregateRating: game.aggregated_rating || null,
        series: gameSeriesOrSpinOff?.seriesName || null,
        isSpinOff: gameSeriesOrSpinOff?.isSpinOffName || null,
        related_games: similarGames || [],
        expansions: expansionGames || [],
        publishedAt: addPublishedAtIfRequired(game),
        isUpdatedFromScript: true,
        isSeason: "true",
      };
      const existingSeason = await checkIfGameExists(game.slug);
      if (existingSeason && existingSeason) {
        seasonGame = existingSeason;
      } else {
        seasonGame = await createGameEntryInStrapi(gameData);
      }
      console.log(seasonGame.id, "seasonGamemememem", parentGame.id);
      // Update parent game with the season ID
      if (parentGame && seasonGame) {
        await updateParentGameWithSeasonId(
          parentGame && parentGame.id
            ? parentGame.id
            : parentGame.data && parentGame.data.id,
          seasonGame && seasonGame.id
            ? seasonGame.id
            : seasonGame.data && seasonGame.data.id
        );
      }
      console.log(seasonGame, "seasonFgggggggggggggggggggggggggggg");
      return seasonGame && seasonGame.id
        ? seasonGame.id
        : seasonGame.data && seasonGame.data.id
        ? seasonGame.data.id
        : null;
    } else {
      console.log(`Skipping game: ${game.name} as it's not a season.`);
      return null;
    }
  } catch (error) {
    console.error(`Failed to process game "${game.name}": ${error.message}`);
    return null;
  }
};

// Helper function to find or create the parent game
const findOrCreateParentGame = async (parentGameId, headerFromApi) => {
  const categoryMapping = {
    0: "main_game",
    1: "dlc_addon",
    2: "expansion",
    3: "bundle",
    4: "standalone_expansion",
    5: "mod",
    6: "episode",
    7: "season",
    8: "remake",
    9: "remaster",
    10: "expanded_game",
    11: "port",
    12: "fork",
    13: "pack",
    14: "update",
  };
  try {
    const parentGame = await getParentGameById(parentGameId, headerFromApi);
    if (!parentGame) {
      console.error(`Parent game with ID: ${parentGameId} not found.`);
      return null;
    }
    const existingParentGame = await checkIfGameExists(parentGame.slug);
    if (existingParentGame && existingParentGame) {
      return existingParentGame;
    } else {
      // if (parentGame.category === "7" && parentGame.parent_game) {
      //   const grandParentGame = await findOrCreateParentGame(
      //     parentGame.parent_game,
      //     headerFromApi
      //   );
      //   parentGame.parent_game = grandParentGame ? grandParentGame.id : null;
      // } else {
      try {
        const categoryId = parentGame.category;
        const categoryName = categoryMapping[categoryId];
        const gameGenres = await handleGenres(parentGame);
        const gameModes = await handleGameModes(parentGame);
        const gamePlayerPerspectives = await handlePlayerPerspectives(
          parentGame
        );
        const gameThemes = await handleThemes(parentGame);
        const gameKeywords = await handleKeywords(parentGame);
        const gameAlternativeNames = await handleAlternativeNames(parentGame);
        const gameEngines = await handleGameEngines(parentGame);
        const gameLanguageSupports = await handleLanguageSupports(parentGame);
        const gameInvolvedCompanies = await handleInvolvedCompanies(parentGame);
        const gameFranchies = await handleFrenchies(parentGame);
        const externalGames = await handleExternalGames(parentGame);
        const gameCoverImage = await handleCoverImage(parentGame);
        const gameBackgroundImage = await handleBackgroundImage(parentGame);
        const gameScreenShots = await handleScreenShots(parentGame);
        const gameCollections = await handleCollections(parentGame);
        const gamePlatforms = await handlePlatforms(parentGame);
        const gameVideos = await handleVideos(parentGame);
        const gameWebsiteLinks = await handleWebsiteLinks(parentGame);
        const promtGeneratedDescription = await getRewrittenDescription(
          parentGame?.name,
          parentGame?.summary
        );
        const gameReleaseDates = await handleReleaseDates(
          parentGame,
          headerFromApi
        );
        const gameSeriesOrSpinOff = await handleSeriesAndSpinOff(
          parentGame,
          headerFromApi
        );
        const similarGames = await handleSimilarGames(
          parentGame,
          headerFromApi
        );
        const expansionGames = await handleGameExpansions(
          parentGame,
          headerFromApi
        );
        const sessionGames = await getOrCreateSeason(parentGame, headerFromApi);
        //Add data in strapi
        const gameData = {
          title: parentGame.name || null,
          slug: parentGame.slug || null,
          site_url: parentGame.url,
          genres: gameGenres || [],
          game_modes: gameModes || [],
          player_perspective: gamePlayerPerspectives || [],
          themes: gameThemes || [],
          keywords: gameKeywords || [],
          alternative_names: gameAlternativeNames || [],
          game_engines: gameEngines || [],
          language_supports: gameLanguageSupports || [],
          involved_companies:
            (gameInvolvedCompanies &&
              gameInvolvedCompanies?.involvedCompaniesArray) ||
            [],
          publisher:
            (gameInvolvedCompanies && gameInvolvedCompanies?.publishersArray) ||
            [],
          developer:
            gameInvolvedCompanies &&
            gameInvolvedCompanies?.developersArray &&
            gameInvolvedCompanies?.developersArray.length > 0
              ? gameInvolvedCompanies?.developersArray
              : [],
          franchises: gameFranchies || [],
          external_games: externalGames || [],
          coverImage: gameCoverImage || null,
          image: gameBackgroundImage || null,
          ...(gameScreenShots &&
            gameScreenShots.length > 0 && {
              screenshots: gameScreenShots,
            }),
          collections: gameCollections || [],
          platforms: gamePlatforms || [],
          videos: gameVideos || [],
          website_links: gameWebsiteLinks || [],
          description: promtGeneratedDescription || null,
          releaseByPlatforms: {
            release:
              gameReleaseDates?.releaseByPlatformsArray &&
              gameReleaseDates?.releaseByPlatformsArray.length > 0
                ? gameReleaseDates?.releaseByPlatformsArray
                : [],
          },
          devices: gameReleaseDates?.devicesArray || [],
          firstReleaseDate: gameReleaseDates?.earliestReleaseDate || null,
          latestReleaseDate: gameReleaseDates?.latestReleaseDate || null,
          // game_category: categoryName || null,
          aggregateRating: parentGame.aggregated_rating || null,
          series: gameSeriesOrSpinOff?.seriesName || null,
          isSpinOff: gameSeriesOrSpinOff?.isSpinOffName || null,
          related_games: similarGames || [],
          expansions: expansionGames || [],
          seasons: sessionGames || [],
          publishedAt: addPublishedAtIfRequired(parentGame),
          isUpdatedFromScript: true,
        };
        // Create the parent game in Strapi
        const response = await createGameEntryInStrapi(gameData);
        return response;
      } catch (error) {
        console.error(`Failed to parse file`, error);
      }
      // }
    }
  } catch (error) {
    console.error(`Failed to find or create parent game: ${error.message}`);
    return null;
  }
};

// Function to update the parent game with the season ID
const updateParentGameWithSeasonId = async (parentId, seasonId) => {
  try {
    const updateData = {
      data: {
        seasons: seasonId,
      },
    };
    const response = await axios.put(
      `${strapiUrl}/api/games/${parentId}`,
      updateData
    );

    if (response.status === 200) {
      console.log(
        `Updated parent game ID ${parentId} with season ID ${seasonId}`
      );
    } else {
      console.error(`Failed to update parent game ID ${parentId}`);
    }
  } catch (error) {
    console.error(`Error updating parent game: ${error}`);
  }
};

// Function to get parent game details from IGDB by its ID
const getParentGameById = async (parentGameId, headerFromApi) => {
  try {
    const igdbEndpoint = `https://api.igdb.com/v4/games`;
    const response = await axios.post(
      igdbEndpoint,
      `fields *,genres.name,game_modes.name,player_perspectives.name,game_engines.name,involved_companies.developer,involved_companies.publisher,involved_companies.company.name,keywords.name,platforms.name,release_dates.*,screenshots.url,themes.name,videos.video_id,videos.name,websites.category,websites.url,language_supports.language.name,game_localizations.*,similar_games.*,external_games.name,cover.url,artworks.url,age_ratings.*,franchises.name,collections.name,release_dates.platform.*,alternative_names.name,similar_games.genres.name,similar_games.game_modes.name,similar_games.player_perspectives.name,similar_games.game_engines.name,similar_games.involved_companies.developer,similar_games.involved_companies.publisher,similar_games.involved_companies.company.name,similar_games.keywords.name,similar_games.platforms.name,similar_games.release_dates.*,similar_games.screenshots.url,similar_games.themes.name,similar_games.videos.video_id,similar_games.videos.name,similar_games.websites.category,similar_games.websites.url,similar_games.language_supports.language.name,similar_games.game_localizations.*,similar_games.similar_games.*,similar_games.external_games.name,similar_games.cover.url,similar_games.artworks.url,similar_games.age_ratings.*,similar_games.franchises.name,similar_games.collections.name,similar_games.release_dates.platform.*,expansions.*,similar_games.alternative_names.name,expansions.genres.name,expansions.game_modes.name,expansions.player_perspectives.name,expansions.game_engines.name,expansions.involved_companies.developer,expansions.involved_companies.publisher,expansions.involved_companies.company.name,expansions.keywords.name,expansions.platforms.name,expansions.release_dates.*,expansions.screenshots.url,expansions.themes.name,expansions.videos.video_id,expansions.videos.name,expansions.websites.category,expansions.websites.url,expansions.language_supports.language.name,expansions.game_localizations.*,expansions.similar_games.*,expansions.external_games.name,expansions.cover.url,expansions.artworks.url,expansions.age_ratings.*,expansions.franchises.name,expansions.collections.name,expansions.release_dates.platform.*,expansions.expansions.*,expansions.alternative_names.name; where id = ${parentGameId};`,
      {
        headers: headerFromApi,
      }
    );
    if (response.data && response.data.length > 0) {
      const parentGame = response.data[0];
      console.log(`Found parent game: ${parentGame.name}`);
      return parentGame; // Return the parent game object
    } else {
      console.warn(`Parent game with ID ${parentGameId} not found.`);
      return null;
    }
  } catch (error) {
    console.error(
      `Failed to fetch parent game with ID ${parentGameId}:`,
      error.message
    );
    return null;
  }
};
const objectForGame = async (parsedData, headerFromApi) => {
  try {
    // const categoryId = parsedData.category;
    // const categoryName = categoryMapping[categoryId];
    // const gameGenres = await handleGenres(parsedData);
    // const gameModes = await handleGameModes(parsedData);
    // const gamePlayerPerspectives = await handlePlayerPerspectives(parsedData);
    // const gameThemes = await handleThemes(parsedData);
    // const gameKeywords = await handleKeywords(parsedData);
    // const gameAlternativeNames = await handleAlternativeNames(parsedData);
    // const gameEngines = await handleGameEngines(parsedData);
    // const gameLanguageSupports = await handleLanguageSupports(parsedData);
    // const gameInvolvedCompanies = await handleInvolvedCompanies(parsedData);
    // const gameFranchies = await handleFrenchies(parsedData);
    // const externalGames = await handleExternalGames(parsedData);
    // const gameCoverImage = await handleCoverImage(parsedData);
    // const gameBackgroundImage = await handleBackgroundImage(parsedData);
    // const gameScreenShots = await handleScreenShots(parsedData);
    // const gameCollections = await handleCollections(parsedData);
    // const gamePlatforms = await handlePlatforms(parsedData);
    // const gameVideos = await handleVideos(parsedData);
    // const gameWebsiteLinks = await handleWebsiteLinks(parsedData);
    // const promtGeneratedDescription = await getRewrittenDescription(
    //   parsedData?.name,
    //   parsedData?.summary
    // );
    // const gameReleaseDates = await handleReleaseDates(
    //   parsedData,
    //   headerFromApi
    // );
    // const gameSeriesOrSpinOff = await handleSeriesAndSpinOff(
    //   parsedData,
    //   headerFromApi
    // );
    // const similarGames = await handleSimilarGames(parsedData, headerFromApi);
    // const expansionGames = await handleGameExpansions(
    //   parsedData,
    //   headerFromApi
    // );
    const sessionGames = await getOrCreateSeason(parsedData, headerFromApi);
    const gameData = {
      title: parsedData.name || null,
      slug: parsedData.slug || null,
      site_url: parsedData.url,
      // genres: gameGenres || [],
      // game_modes: gameModes || [],
      // player_perspective: gamePlayerPerspectives || [],
      // themes: gameThemes || [],
      // keywords: gameKeywords || [],
      // alternative_names: gameAlternativeNames || [],
      // game_engines: gameEngines || [],
      // language_supports: gameLanguageSupports || [],
      // involved_companies:
      //   (gameInvolvedCompanies &&
      //     gameInvolvedCompanies?.involvedCompaniesArray) ||
      //   [],
      // publisher:
      //   (gameInvolvedCompanies && gameInvolvedCompanies?.publishersArray) || [],
      // developer:
      //   gameInvolvedCompanies &&
      //   gameInvolvedCompanies?.developersArray &&
      //   gameInvolvedCompanies?.developersArray.length > 0
      //     ? gameInvolvedCompanies?.developersArray
      //     : [],
      // franchises: gameFranchies || [],
      // external_games: externalGames || [],
      // coverImage: gameCoverImage || null,
      // image: gameBackgroundImage || null,
      // ...(gameScreenShots &&
      //   gameScreenShots.length > 0 && {
      //     screenshots: gameScreenShots,
      //   }),
      // collections: gameCollections || [],
      // platforms: gamePlatforms || [],
      // videos: gameVideos || [],
      // website_links: gameWebsiteLinks || [],
      // description: promtGeneratedDescription || null,
      // releaseByPlatforms: {
      //   release:
      //     gameReleaseDates?.releaseByPlatformsArray &&
      //     gameReleaseDates?.releaseByPlatformsArray.length > 0
      //       ? gameReleaseDates?.releaseByPlatformsArray
      //       : [],
      // },
      // devices: gameReleaseDates?.devicesArray || [],
      // firstReleaseDate: gameReleaseDates?.earliestReleaseDate || null,
      // latestReleaseDate: gameReleaseDates?.latestReleaseDate || null,
      // // game_category: categoryName || null,
      // aggregateRating: parsedData.aggregated_rating || null,
      // series: gameSeriesOrSpinOff?.seriesName || null,
      // isSpinOff: gameSeriesOrSpinOff?.isSpinOffName || null,
      // related_games: similarGames || [],
      // expansions: expansionGames || [],
      seasons: sessionGames || [],
    };
    return gameData;
  } catch (error) {
    console.error(`Failed to parse file`, error);
  }
};

const fetchWithRetry = async (
  url,
  data,
  headers,
  retries = 5,
  retryCount = 1
) => {
  try {
    return await axios.post(url, data, { headers });
  } catch (error) {
    if (error.response && error.response.status === 429 && retries > 0) {
      const retryAfter = 2 ** retryCount * 2000;
      await delay(retryAfter);
      return fetchWithRetry(url, data, headers, retries - 1, retryCount + 1);
    }
    throw error;
  }
};

const handleSeriesAndSpinOff = async (parsedData, headerFromApi) => {
  let seriesName = "";
  let isSpinOffName = "";

  if (parsedData.id) {
    try {
      const collectionMembershipResponse = await fetchWithRetry(
        "https://api.igdb.com/v4/collection_memberships",
        `fields *,collection.*; where game = ${parsedData?.id};`,
        headerFromApi
      );
      collectionMembershipResponse.data.forEach((collectionMembership) => {
        if (collectionMembership.type === 1) {
          seriesName = collectionMembership.collection.name;
        } else if (collectionMembership.type === 2) {
          isSpinOffName = collectionMembership.collection.name;
        }
      });

      return {
        seriesName,
        isSpinOffName,
      };
    } catch (error) {
      console.error(`Failed to fetch is spin off for : ${error.message}`);
    }
  } else {
    parsedData.collections = [];
  }
};
const updateOrCreateGameDataWithNewFeilds = async (dataObj, gameId) => {
  console.log(dataObj, "dataObj123456789");
  try {
    const updateData = {
      data: {
        title: dataObj.title || null,
        slug: dataObj.slug || null,
        site_url: dataObj.site_url || null,
        // genres: dataObj.genres || [],
        // game_modes: dataObj.game_modes || [],
        // player_perspective: dataObj.player_perspective || [],
        // themes: dataObj.themes || [],
        // keywords: dataObj.keywords || [],
        // alternative_names: dataObj.alternative_names || [],
        // game_engines: dataObj.game_engines || [],
        // language_supports: dataObj.language_supports || [],
        // involved_companies: dataObj.involved_companies || [],
        // publisher: dataObj.publisher || [],
        // developer: dataObj.developer || [],
        // franchises: dataObj.franchises || [],
        // external_games: dataObj.external_games || [],
        // coverImage: dataObj.coverImage || null,
        // image: dataObj.image || null,
        // ...(dataObj.screenshots &&
        //   dataObj.screenshots.length > 0 && {
        //     screenshots: dataObj.screenshots,
        //   }),
        // collections: dataObj.collections || [],
        // platforms: dataObj.platforms || [],
        // videos: dataObj.videos || [],
        // website_links: dataObj.website_links || [],
        // description: dataObj.description || null,
        // releaseByPlatforms: dataObj.releaseByPlatforms,
        // devices: dataObj.devices || [],
        // firstReleaseDate: dataObj?.firstReleaseDate || null,
        // latestReleaseDate: dataObj?.latestReleaseDate || null,
        // // game_category: dataObj.game_category || "",
        // aggregateRating: dataObj.aggregateRating,
        // series: dataObj.series || null,
        // isSpinOff: dataObj.isSpinOff || null,
        // publishedAt: addPublishedAtIfRequired(dataObj),
        // isUpdatedFromScript: true,
        // related_games: dataObj.related_games || [],
        // expansions: dataObj.expansions || [],
        seasons: dataObj.seasons || [],
      },
    };
    console.log(gameId, "gamemememmememememme", updateData);
    if (gameId) {
      const response = await axios.put(
        `${strapiUrl}/api/games/${gameId}`,
        updateData
      );
      if (response.status === 200) {
        console.log(`Updated game data ID ${gameId}`);
      } else {
        console.error(`Failed to update game data ID ${gameId}`);
      }
    } else {
      console.log("inside create api", `${strapiUrl}/api/games`, updateData);
      const response = await axios.post(`${strapiUrl}/api/games`, updateData);
      console.log(response.data.data, "kjjjjjjjjjjjjjjjjjjjjjj");
      if (response.status === 200) {
        console.log(`Created game data ID ${response.data.data?.id}`);
      } else {
        console.error(`Failed to create game data ID `);
      }
    }
  } catch (error) {
    console.error(`Error updating game data: ${error}`);
  }
};

startProcess();
