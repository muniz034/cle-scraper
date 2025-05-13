import { goToHomePage, goToNextPage, sleep, getLocalTime, scrapePage, EnumStrategy } from './functions.js';
import puppeteer, { Page } from 'puppeteer';
import ExecutionInformation from "./execution-information.js";
import sqlite from 'node:sqlite';
import { CheerioAPI } from 'cheerio';

const execInfo = new ExecutionInformation("./exec-info.json");

const db = new sqlite.DatabaseSync('./database.db');

await db.exec(`
    CREATE TABLE IF NOT EXISTS imovel (
        id INTEGER PRIMARY KEY,
        slug TEXT NOT NULL,
        url TEXT NOT NULL,
        valor REAL DEFAULT 0,
        tamanho INTEGER,
        valor_condominio REAL DEFAULT 0,
        valor_iptu REAL DEFAULT 0,
        endereco TEXT,
        lat REAL,
        lng REAL
    );
`);

// const nLimitPage = 333;
// const nLimitPage = 201;
const nLimitPage = 82;
const browser = await puppeteer.launch({ headless: true, protocolTimeout: 0 });
const urls = [];

let $: CheerioAPI;
let page: Page | null = await browser.newPage();

await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:138.0) Gecko/20100101 Firefox/138.0");

const lastPage = execInfo.getInfo().lastPage;

console.log(/* getLocalTime(),  */`Initializing cle-scraper: ${JSON.stringify({ lastPage, nLimitPage })}`);

for(let i = lastPage; i <= nLimitPage; i++) {
    console.log(/* getLocalTime(),  */"Starting scraping for page", i);

    const start = process.hrtime();
    
    // if(i === lastPage) $ = await goToHomePage(page, i, [EnumStrategy.VALOR_400k]);
    if(i === lastPage) $ = await goToHomePage(page, i, [EnumStrategy.VALOR_400k, EnumStrategy.AREA_70]);
    else $ = await scrapePage(page);

    execInfo.setLastRunTimestamp();
    execInfo.setLastPage(i);

    const links = $('li[data-cy="rp-property-cd"] a').toArray();

    console.log(/* getLocalTime(),  */`Found ${links.length} links`);
    console.log(/* getLocalTime(),  */"Parsing...");

    for (const a of links) {
        const href = $(a).attr('href');

        if(!href) continue;

        if(!/(?<=\/imovel\/).*\//g.test(href)) continue;

        const match = /(?<=\/imovel\/).*\//g.exec(href);

        if(!match) continue;

        const slug = match[0];

        const result = db.prepare("SELECT * FROM imovel WHERE slug = ?").get(slug);

        if(result) continue;

        db.prepare("INSERT INTO imovel (slug, url) VALUES (?, ?)").run(slug, href);
    }

    console.log(/* getLocalTime(),  */"Waiting for 5s before continuing...");

    await sleep(5000);

    const elapsed = process.hrtime(start)[0];

    execInfo.addExecutionTime(elapsed);
    const results = db.prepare("SELECT * FROM imovel").all();

    console.log(/* getLocalTime(),  */`Total results: ${results.length}`);

    await goToNextPage(page, i);

}

process.on('unhandledRejection', (reason, promise) => {
    console.error(/* getLocalTime(),  */'Unhandled Rejection:', reason);
    process.exit(1); // forces PM2 to restart
});
  
process.on('uncaughtException', err => {
    console.error(/* getLocalTime(),  */'Uncaught Exception:', err);
    process.exit(1); // forces PM2 to restart
});

const cleanExit = async () => {
    console.log(/* getLocalTime(),  */"Closing the browser...");
    await browser.close();
    process.exit(1);
};

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
process.on('exit', cleanExit);


console.log(/* getLocalTime(),  */"Closing the browser...");
await browser.close();
process.exit(1);