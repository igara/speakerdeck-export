import * as childProcess from "child_process";
import * as fs from "fs";
import * as puppeteer from "puppeteer";
import * as request from "request-promise";

type Deck = {
  userID: string;
  title: string;
  url: string;
  createAt: string;
};

const directoryName = (deck: Deck) => `${deck.userID}/${deck.createAt}-${deck.title.replace(/\//g, "／")}`;

export const mkdir = (deck: Deck) => {
  fs.mkdirSync(`./data/${directoryName(deck)}`, { recursive: true });
};

const getDeckLink = async (page: puppeteer.Page, userID: string) =>
  await page.evaluate((userID: string) => {
    const list = Array.from(document.querySelectorAll(".col-12.col-md-6.col-lg-4.mb-5"));
    return list.map((l) => {
      const link = l.querySelector("a");
      const url = `https://speakerdeck.com${link.getAttribute("href")}`;
      const date = new Date(l.querySelector(".py-3.pr-1").textContent);
      const dateYear = date.getFullYear();
      const dateMonth = date.getMonth() + 1;
      const dateDay = date.getDate();

      return {
        userID,
        title: link.getAttribute("title"),
        url,
        createAt: `${dateYear}-${dateMonth}-${dateDay} 00:00:00`,
      };
    });
  }, userID);

const getNextFlag = async (page: puppeteer.Page) =>
  await page.evaluate(() => {
    const nextButtonElement = document.querySelector(`a[aria-label="Next"]`);
    return nextButtonElement !== null;
  });

export const decks = async (userID: string) => {
  const url = `https://speakerdeck.com/${userID}`;
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  let pageCount = 1;
  await page.setDefaultNavigationTimeout(0);
  await page.goto(`${url}/?page=${pageCount}`, { waitUntil: "networkidle0" });
  await page.waitFor(1000);

  let decks = await getDeckLink(page, userID);
  let nextFlag = await getNextFlag(page);

  while (nextFlag) {
    pageCount += 1;
    await page.goto(`${url}/?page=${pageCount}`, { waitUntil: "networkidle0" });
    await page.waitFor(1000);

    decks = [...decks, ...(await getDeckLink(page, userID))];
    nextFlag = await getNextFlag(page);
  }

  await page.close();
  await browser.close();
  return decks;
};

export const downloadDeck = async (deck: Deck) => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setDefaultNavigationTimeout(0);
  await page.goto(deck.url, { waitUntil: "networkidle0" });
  await page.waitFor(1000);

  const link = await page.evaluate(() => {
    const downloadLinkElement = document.querySelector(`a[title="Download PDF"]`);
    return downloadLinkElement.getAttribute("href");
  });

  await page.close();
  await browser.close();

  const pdfFileName = `./data/${directoryName(deck)}/index.pdf`;
  request({
    url: link,
    method: "GET",
    encoding: null,
  }).then((pdf) => {
    fs.writeFileSync(pdfFileName, pdf, "binary");

    childProcess.execSync(`convert "${pdfFileName}" "./data/${directoryName(deck)}/page_%04d.jpg"`);
  });
};
