const axios = require("axios");
const path = require("path");
const fs = require("fs");
const os = require("os");
const FormData = require("form-data");
require("dotenv").config();
const { DateTime } = require("luxon");
// const strapiUrl = process.env.PROD_STRAPI_URL;
// const strapiToken = process.env.PROD_API_TOKEN;
const strapiUrl = process.env.STAGE_STRAPI_URL;
const strapiToken = process.env.STAGE_API_TOKEN;
const openApiKey = process.env.OPEN_API_KEY;

//Handle Game Genres
module.exports.handleGenres = async (parsedData) => {
  if (
    parsedData?.genres &&
    Array.isArray(parsedData.genres) &&
    parsedData.genres.length > 0
  ) {
    try {
      return parsedData.genres
        .filter((genre) => genre.name)
        .map((genre) => genre.name);
    } catch (error) {
      console.error(`Failed to handle genres: ${error}`);
    }
  }
  return []; // Ensure an empty array is returned when no genres are found
};

//Handle Game Modes
module.exports.handleGameModes = async (parsedData) => {
  if (
    parsedData?.game_modes &&
    Array.isArray(parsedData?.game_modes) &&
    parsedData.game_modes.length > 0
  ) {
    try {
      return parsedData.game_modes
        .filter((gameMode) => gameMode.name)
        .map((gameMode) => gameMode.name);
    } catch (error) {
      console.error(`Failed to handle game modes: ${error.message}`);
    }
  }
  return []; // Ensuring an empty array is returned in all failure cases
};

// Handle player perspectives;
module.exports.handlePlayerPerspectives = async (parsedData) => {
  if (
    parsedData?.player_perspectives &&
    Array.isArray(parsedData?.player_perspectives) &&
    parsedData?.player_perspectives.length > 0
  ) {
    try {
      return parsedData.player_perspectives
        .filter((playerPerspective) => playerPerspective.name)
        .map((playerPerspective) => playerPerspective.name);
    } catch (error) {
      console.error(`Failed to handle player perspectives: ${error.message}`);
    }
  }
  return []; // Ensure an empty array is always returned on failure
};

//Handle themes
module.exports.handleThemes = async (parsedData) => {
  if (
    parsedData?.themes &&
    Array.isArray(parsedData?.themes) &&
    parsedData.themes.length > 0
  ) {
    try {
      return parsedData.themes
        .filter((theme) => theme.name)
        .map((theme) => theme.name);
    } catch (error) {
      console.error(`Failed to handle themes: ${error.message}`);
    }
  }
  return []; // Ensuring an empty array is returned in all failure cases
};

//Handle Keywords
module.exports.handleKeywords = async (parsedData) => {
  if (
    parsedData?.keywords &&
    Array.isArray(parsedData?.keywords) &&
    parsedData.keywords.length > 0
  ) {
    try {
      return parsedData.keywords
        .filter((keyword) => keyword.name)
        .map((keyword) => keyword.name);
    } catch (error) {
      console.error(`Failed to handle keywords: ${error.message}`);
    }
  }
  return []; // Ensuring an empty array is returned in all failure cases
};

//Handle alternative names
module.exports.handleAlternativeNames = async (parsedData) => {
  if (
    Array.isArray(parsedData?.alternative_names) &&
    parsedData.alternative_names.length > 0
  ) {
    try {
      return parsedData.alternative_names
        .filter((alternativeName) => alternativeName.name)
        .map((alternativeName) => alternativeName.name);
    } catch (error) {
      console.error(`Failed to handle alternative names: ${error.message}`);
    }
  }
  return []; // Ensuring an empty array is returned in all failure cases
};

//Handle game engines
module.exports.handleGameEngines = async (parsedData) => {
  if (
    Array.isArray(parsedData?.game_engines) &&
    parsedData.game_engines.length > 0
  ) {
    try {
      return parsedData.game_engines
        .filter((gameEngine) => gameEngine.name)
        .map((gameEngine) => gameEngine.name);
    } catch (error) {
      console.error(`Failed to handle game engines: ${error.message}`);
    }
  }
  return []; // Ensuring an empty array is returned in all failure cases
};

//Handle language support
module.exports.handleLanguageSupports = async (parsedData) => {
  if (
    Array.isArray(parsedData?.language_supports) &&
    parsedData.language_supports.length > 0
  ) {
    const languageSupportArray = [
      ...new Set(
        parsedData.language_supports
          .filter((langSupport) => langSupport.language?.name) // Ensure "language" exists before accessing "name"
          .map((langSupport) => langSupport.language.name)
      ),
    ];
    return languageSupportArray;
  }
  return []; // Ensuring an empty array is returned in all failure cases
};

//Handle involved companies
module.exports.handleInvolvedCompanies = async (parsedData, headerFromApi) => {
  let developersArray = [];
  let publishersArray = [];

  if (!Array.isArray(parsedData.involved_companies)) {
    parsedData.involved_companies = [];
  }

  if (parsedData.involved_companies.length > 0) {
    for (const item of parsedData.involved_companies) {
      if (item.publisher && item.company) {
        // No strict === true check
        const publisherId = await getOrCreatePublishers(
          item.company.name,
          headerFromApi
        );
        if (publisherId) {
          publishersArray.push(publisherId);
        }
      }

      if (item.developer && item.company) {
        const developerId = await getOrCreateDevelopers(
          item.company.name,
          headerFromApi
        );
        if (developerId) {
          developersArray.push(developerId);
        }
      }
    }
    return { developersArray, publishersArray };
  } else {
    console.warn("No involved companies found.");
    return { developersArray, publishersArray };
  }
};

const getOrCreatePublishers = async (publisherName, headerFromApi) => {
  try {
    const response = await axios.get(`${strapiUrl}/api/publishers`, {
      headers: headerFromApi,
      params: {
        "filters[name][$eq]": publisherName,
      },
    });

    const publishers = response.data.data;
    if (publishers.length > 0) {
      return publishers[0].id;
    }

    const createResponse = await axios.post(
      `${strapiUrl}/api/publishers`,
      {
        data: {
          Name: publisherName,
          slug: publisherName.toLowerCase().replace(/ /g, "-"),
        },
      },
      { headers: headerFromApi }
    );

    return createResponse.data.data?.id || null;
  } catch (error) {
    console.error(
      "Error fetching or creating Publishers:",
      error.response ? error.response.data : error.message
    );
    return null;
  }
};

const getOrCreateDevelopers = async (developerName, headerFromApi) => {
  try {
    const response = await axios.get(`${strapiUrl}/api/developers`, {
      headers: headerFromApi,
      params: {
        "filters[name][$eq]": developerName,
      },
    });

    const developers = response.data.data;
    if (developers.length > 0) {
      return developers[0].id;
    }

    const createResponse = await axios.post(
      `${strapiUrl}/api/developers`,
      {
        data: {
          Name: developerName,
          slug: developerName.toLowerCase().replace(/ /g, "-"),
        },
      },
      { headers: headerFromApi }
    );

    return createResponse.data.data?.id || null;
  } catch (error) {
    console.error(
      "Error fetching or creating Developers:",
      error.response ? error.response.data : error.message
    );
    return null;
  }
};

//Handle frenchiese
module.exports.handleFrenchies = (parsedData) => {
  if (!parsedData.franchises) {
    parsedData.franchises = [];
    return [];
  }
  if (
    parsedData.franchises &&
    Array.isArray(parsedData.franchises) &&
    parsedData.franchises.length > 0
  ) {
    const franchisesArray = parsedData.franchises.map((franchise) => {
      return franchise.name ? franchise.name : `Unknown (${franchise.id})`;
    });
    return franchisesArray.filter((name) => name);
  } else {
    parsedData.franchises = [];
  }
  return [];
};

//Handle External games
module.exports.handleExternalGames = (parsedData) => {
  if (!parsedData.external_games) {
    parsedData.external_games = [];
    return [];
  }

  if (
    Array.isArray(parsedData.external_games) &&
    parsedData.external_games.length > 0
  ) {
    const externalGamesArray = parsedData.external_games.map((externalGame) => {
      return externalGame.name
        ? externalGame.name
        : `Unknown (${externalGame.id})`;
    });
    return externalGamesArray.filter((name) => name);
  } else {
    parsedData.external_games = [];
  }

  return [];
};

// Fetch the image data from a URL
async function fetchImageData(imageUrl, imgType) {
  try {
    const fullImageUrl = `https:${imageUrl}`;
    const response = await axios.get(fullImageUrl, {
      responseType: "arraybuffer",
    });
    return response;
  } catch (error) {
    console.error("Failed to fetch image data: " + error.message);
    throw error;
  }
}

// Save image data temporarily to disk
function saveTempImage(imageData, imgType) {
  try {
    const tempFilePath = path.join(os.tmpdir(), `${imgType}.jpg`);
    fs.writeFileSync(tempFilePath, Buffer.from(imageData, "binary"));
    return tempFilePath;
  } catch (error) {
    console.error("Failed to save temporary image: " + error.message);
    throw error;
  }
}

// Upload the image to Strapi
async function uploadImageToStrapi(tempFilePath, contentType, size, imgType) {
  try {
    const formData = new FormData();
    formData.append("files", fs.createReadStream(tempFilePath), {
      filename: `${imgType}.jpg`,
    });
    formData.append(
      "fileInfo",
      JSON.stringify({
        path: tempFilePath,
        name: `${imgType}.jpg`,
        type: contentType,
        size: size,
      })
    );
    const response = await axios.post(`${strapiUrl}/api/upload`, formData, {
      headers: {
        Authorization: `Bearer ${strapiToken}`,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
    return response.data;
  } catch (error) {
    console.error("Failed to upload image: " + error);
    throw error;
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

//Handle Cover image
module.exports.handleCoverImage = async (parsedData, headerFromApi) => {
  if (parsedData.cover && parsedData.cover.url) {
    try {
      const coverImageUrl = await processImage(parsedData.cover, "coverImage");
      return coverImageUrl;
    } catch (error) {
      console.log(`Failed to process cover image: ${error}`);
      return null;
    }
  } else {
    console.log("No cover image found in parsedData");
    return null;
  }
};

// Process the image by fetching, saving temporarily, and uploading to Strapi
async function processImage(imageUrl, imgType) {
  try {
    let updatedImageUrl = "";
    if (imgType === "screenshotImage") {
      updatedImageUrl = imageUrl.url.replace("t_thumb", "t_720p");
    } else if (imgType === "backgroundImage") {
      updatedImageUrl = imageUrl.url.replace("t_thumb", "t_1080p");
    } else if (imgType === "coverImage") {
      updatedImageUrl = imageUrl.url.replace("t_thumb", "t_cover_big");
    }
    const imageDataResponse = await fetchImageData(updatedImageUrl, imgType);
    if (!imageDataResponse || !imageDataResponse.data) {
      throw new Error("No image data found.");
    }
    const tempFilePath = saveTempImage(imageDataResponse.data, imgType);
    const uploadedFiles = await uploadImageToStrapi(
      tempFilePath,
      imageDataResponse.headers["content-type"],
      imageDataResponse.data.length,
      imgType
    );
    // Handle the uploaded file data
    if (uploadedFiles && uploadedFiles.length > 0) {
      return {
        id: uploadedFiles[0].id,
        url: uploadedFiles[0].url,
      };
    } else {
      throw new Error("Failed to upload image to Strapi.");
    }
  } catch (error) {
    console.error("Error processing image: " + error.message);
    throw error;
  }
}

// Handle Background image
module.exports.handleBackgroundImage = async (parsedData) => {
  if (
    parsedData.artworks &&
    Array.isArray(parsedData.artworks) &&
    parsedData.artworks.length > 0
  ) {
    try {
      const artworkObject = parsedData.artworks[0];
      if (artworkObject) {
        const backgroundImageUrl = await processImage(
          artworkObject,
          "backgroundImage"
        );
        return backgroundImageUrl;
      }
    } catch (error) {
      console.error(`Failed to process artworks: ${error}`);
      return [];
    }
  } else if (
    parsedData.screenshots &&
    Array.isArray(parsedData.screenshots) &&
    parsedData.screenshots.length > 0
  ) {
    try {
      const artworkObject = parsedData.screenshots[0];
      if (artworkObject) {
        const backgroundImageUrl = await processImage(
          artworkObject,
          "backgroundImage"
        );
        return backgroundImageUrl;
      }
    } catch (error) {
      console.error(`Failed to process artworks: ${error}`);
      return [];
    }
  } else {
    console.log("No artworks found in parsedData");
    return [];
  }
};

//Handle screenshots
module.exports.handleScreenShots = async (parsedData) => {
  if (
    parsedData.screenshots &&
    Array.isArray(parsedData.screenshots) &&
    parsedData.screenshots.length > 0
  ) {
    try {
      let screenshotUrls = [];

      for (const screenshot of parsedData.screenshots) {
        const screenshotUrl = await processImage(screenshot, "screenshotImage");
        if (screenshotUrl) {
          screenshotUrls.push(screenshotUrl);
        }
      }
      return screenshotUrls;
    } catch (error) {
      console.error(`Failed to process screenshots: ${error.message}`);
      return [];
    }
  } else {
    console.warn("No screenshots found in parsedData");
    return [];
  }
};

//Handle Collections
module.exports.handleCollections = async (parsedData) => {
  if (
    parsedData.collections &&
    Array.isArray(parsedData.collections) &&
    parsedData.collections.length > 0
  ) {
    try {
      const collectionsArray = parsedData.collections
        .filter((collection) => collection.name)
        .map((collection) => collection.name);

      return collectionsArray;
    } catch (error) {
      console.error(`Failed to process collections: ${error}`);
      return [];
    }
  } else {
    console.log("No collections found in parsedData");
    return [];
  }
};

//Handle platforms
module.exports.handlePlatforms = async (parsedData) => {
  if (
    parsedData.platforms &&
    Array.isArray(parsedData.platforms) &&
    parsedData.platforms.length > 0
  ) {
    try {
      const platformsArray = parsedData.platforms
        .filter((platform) => platform.name)
        .map((platform) => platform.name);

      return platformsArray;
    } catch (error) {
      console.error(`Failed to process platforms: ${error}`);
      return [];
    }
  } else {
    console.log("No platforms found in parsedData");
    return [];
  }
};

module.exports.handleVideos = async (parsedData, headerFromApi) => {
  if (parsedData.videos) {
    if (Array.isArray(parsedData.videos) && parsedData.videos.length > 0) {
      try {
        const videosArray = await getVideosArrayWithTitles(parsedData);
        return videosArray;
      } catch (error) {
        console.error(`Failed to process videos: ${error.message}`);
        parsedData.videos = [];
      }
    } else {
      parsedData.videos = [];
    }
  } else {
    parsedData.videos = [];
  }
};

const getVideosArrayWithTitles = async (parsedData) => {
  const videos = parsedData.videos
    .filter((video) => video.video_id)
    .map((video) => ({
      name: video.name,
      url: video.video_id,
    }));
  const videosWithTitles = await Promise.all(
    videos.map(async (video) => {
      const title = await fetchVideoTitle(video.url);
      return {
        ...video,
        title: title || "Untitled",
      };
    })
  );
  return videosWithTitles;
};

const fetchVideoTitle = async (url) => {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${url}&format=json`
    );
    const data = await response.json();
    return data.title;
  } catch (error) {
    console.error(`Error fetching title for ${url}:`, error);
    return null;
  }
};

module.exports.handleWebsiteLinks = async (parsedData, headerFromApi) => {
  const categoryForWebsites = {
    1: "official",
    2: "wikia",
    3: "wikipedia",
    4: "facebook",
    5: "twitter",
    6: "twitch",
    8: "instagram",
    9: "youtube",
    10: "iphone",
    11: "ipad",
    12: "android",
    13: "steam",
    14: "reddit",
    15: "itch",
    16: "epicgames",
    17: "gog",
    18: "discord",
  };

  if (
    parsedData.websites &&
    Array.isArray(parsedData.websites) &&
    parsedData.websites.length > 0
  ) {
    try {
      const allWebsites = parsedData.websites.map((website) => ({
        id: website.id,
        url: website.url ? website.url : `Unknown (${website.id})`,
        category: categoryForWebsites[website.category] || "unknown",
      }));

      const websiteLinksArray = allWebsites
        .filter((website) => website.url)
        .map((website) => ({
          category: website.category,
          url: website.url,
        }));

      return websiteLinksArray;
    } catch (error) {
      console.error(`Failed to process websites: ${error}`);
      return [];
    }
  } else {
    return [];
  }
};

module.exports.handleReleaseDates = async (parsedData) => {
  if (
    !parsedData.release_dates ||
    !Array.isArray(parsedData.release_dates) ||
    parsedData.release_dates.length === 0
  ) {
    return {
      releaseByPlatformsArray: [],
      devicesArray: [],
      earliestReleaseDate: null,
    };
  }

  try {
    const releaseByPlatformsArray = [];
    const releaseDates = []; // Store all valid dates for comparison

    for (const release of parsedData.release_dates) {
      if (release.platform && release.date) {
        const releaseDate = DateTime.fromSeconds(release.date).toUTC();
        releaseDates.push(releaseDate);

        const deviceId = await getOrCreateDevice(
          release.platform.name === "PC (Microsoft Windows)"
            ? "PC"
            : release.platform.name,
          release.platform.slug
        );

        releaseByPlatformsArray.push({
          releaseDate: releaseDate.toFormat("yyyy-MM-dd"),
          device: deviceId,
          releaseTimePeriod: release.human || "Unknown",
        });
      }
    }

    // Sort releaseByPlatformsArray by date
    releaseByPlatformsArray.sort((a, b) => {
      return (
        DateTime.fromFormat(a.releaseDate, "yyyy-MM-dd") -
        DateTime.fromFormat(b.releaseDate, "yyyy-MM-dd")
      );
    });

    const devicesArray = releaseByPlatformsArray
      .map((platform) => platform.device)
      .filter((device) => device !== null);

    // Get the earliest release date
    const earliestReleaseDate = releaseDates.length
      ? releaseDates
          .reduce((min, date) => (date < min ? date : min))
          .toFormat("yyyy-MM-dd")
      : null;

    const latestReleaseDate = releaseDates.length
      ? releaseDates
          .reduce((max, date) => (date > max ? date : max))
          .toFormat("yyyy-MM-dd")
      : null;
    return {
      releaseByPlatformsArray,
      devicesArray,
      earliestReleaseDate,
      latestReleaseDate,
    };
  } catch (error) {
    console.error(`Failed to process release dates: ${error.message}`);
    return {
      releaseByPlatformsArray: [],
      devicesArray: [],
      earliestReleaseDate: null,
      latestReleaseDate: null,
    };
  }
};

const getOrCreateDevice = async (deviceName, slug) => {
  try {
    const response = await axios.get(`${strapiUrl}/api/devices/all`);
    const existingDevice = response.data;
    const matchingDevice = existingDevice.find(
      (device) => device.name === deviceName
    );
    if (matchingDevice) {
      return matchingDevice.id;
    } else {
      try {
        const createResponse = await axios.post(`${strapiUrl}/api/devices`, {
          data: {
            name: deviceName,
            slug: slug,
          },
        });
        return createResponse.data.data.id;
      } catch (err) {
        console.log(err.response.data.error);
      }
    }
  } catch (error) {
    console.error(
      "Error fetching or creating device:",
      error.response ? error.response.data : error.message
    );
    return null;
  }
};

//Handle Rewrite description
module.exports.getRewrittenDescription = async (title, description) => {
  const prompt = `Rewrite the description "${description}" for the game titled "${title}". 
  while rewriting the description, please do not write anything in single or double quotes.
  Focus on unique, engaging introductions and avoid using overused phrases like 'dive into' or 'step into.' 
  The description should highlight key elements of the game such as its gameplay mechanics, story, characters, or environment, 
  and ensure it fits the title accurately. Vary the structure and wording, especially across different games, 
  and aim for a natural, human-like tone. Keep the response concise, no more than 6 sentences.`;

  const repetitivePhrases = ["dive into", "step into", "experience the"];

  const isRepetitive = (text) => {
    return repetitivePhrases.some((phrase) =>
      text.toLowerCase().includes(phrase)
    );
  };

  try {
    let rewrittenDescription = null;
    let attempts = 0;

    while (attempts < 5) {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a creative assistant." },
            { role: "user", content: prompt },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${openApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      rewrittenDescription = response.data.choices[0].message.content.trim();

      if (!isRepetitive(rewrittenDescription)) {
        break;
      }

      attempts++;
      console.log(
        `Repetitive phrase detected. Retrying... (Attempt: ${attempts})`
      );
    }

    if (attempts >= 5) {
      console.log(
        "Max retries reached. Returning the last generated description."
      );
    }

    return rewrittenDescription;
  } catch (error) {
    console.error(
      "Error fetching the rewritten description:",
      error.response ? error.response.data : error.message
    );
    return null;
  }
};
