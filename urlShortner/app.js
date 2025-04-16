import { readFile } from "fs/promises";
import { createServer } from "http";
import path from "path";
import crypto from "crypto";
import { writeFile } from "fs/promises";

// Port for running the application on server
const PORT = 3002;
const DATA_FILE = path.join("data", "links.json");

// Method to fetching app data to the server
const serveData = async (res, filepath, contentType) => {
  try {
    const data = await readFile(filepath);
    res.writeHead(200, { "Content-Type": `${contentType}` });
    res.end(data);
  } catch (error) {
    res.writeHead(404, { "Content-Type": `${contentType}` });
    res.end("404, Page not found");
  }
};

const loadLink = async () => {
  try {
    const data = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.log(error);
    if (error.code === "ENOENT") {
      await writeFile(DATA_FILE, JSON.stringify({}));
      return {};
    }
    throw error;
  }
};

const saveLink = async (link) => {
  try {
    await writeFile(DATA_FILE, JSON.stringify(link));
  } catch (error) {
    throw error;
  }
};

// Creating a server for application
const server = createServer(async (req, res) => {
  console.log(req.method);
  console.log(req.url);

  // Pushing app data to the server
  if (req.method === "GET") {
    if (req.url === "/") {
      return serveData(res, path.join("public", "index.html"), "text/html");
    } else if (req.url === "/links") {
      const links = await loadLink();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(links));
    } else {
      const links = await loadLink();
      const shortURL = req.url.slice(1);

      if (links[shortURL]) {
        res.writeHead(302, { location: links[shortURL] });
        return res.end();
      }

      res.writeHead(400, { "Content-Type": "type/plain" });
      res.end("URL not found in the shortURL to navigate.");
    }
  }

  if (req.method === "POST" && req.url === "/shorten") {
    const links = await loadLink();

    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", async () => {
      const { formURL, formShortname } = JSON.parse(body);
      console.log(body);

      if (!formURL) {
        res.writeHead(400, { "Content-Type": "type/plain" });
        res.end("Please provide a URL.");
      }

      const finalShortURL =
        formShortname || crypto.randomBytes(4).toString("hex");

      if (links[finalShortURL]) {
        res.writeHead(400, { "Content-Type": "type/plain" });
        res.end("Shortname already exist. Please try a new shortname.");
      }

      links[finalShortURL] = formURL;

      await saveLink(links);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, formShortname: finalShortURL }));
    });
  }
});

// Listening to a server
server.listen(PORT, () => {
  console.log(`Server has been started at PORT: ${PORT}`);
});
