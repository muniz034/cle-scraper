import * as cheerio from 'cheerio';
import puppeteer, { Browser, Page } from 'puppeteer';

export enum EnumStrategy {
    ALL,
    VALOR_400k,
    AREA_70
}

function getLocalTime () {
    return `[${new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }).replace(/(.*, )/g, "")}]`;
}

async function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}

async function scrapePage(page: Page): Promise<cheerio.CheerioAPI> {
    console.log(/* getLocalTime(),  */"Waiting...");
    
    await page.waitForNetworkIdle({ timeout: 0});
    
    console.log(/* getLocalTime(),  */"Scrolling...");
    
    await page.evaluate(() => document.getElementById("resultPageAdBottom")?.scrollIntoView());
    
    console.log(/* getLocalTime(),  */"Waiting...");
    
    await page.waitForNetworkIdle({ timeout: 0});
    
    return cheerio.load(await page.content());
}

async function goToHomePage(page: Page, i: number, strategies: EnumStrategy[]): Promise<cheerio.CheerioAPI> {
    let URLPaginaInicial = `
        https://www.vivareal.com.br/venda/rj/niteroi/apartamento_residencial/?transacao=venda
        &onde=,Rio%20de%20Janeiro,Niter%C3%B3i,,,,,city,BR%3ERio%20de%20Janeiro%3ENULL%3ENiteroi,-22.880707,-43.101353,
        &tipos=apartamento_residencial,casa_residencial,condominio_residencial,cobertura_residencial
        &pagina=${i}`;

    if(strategies.includes(EnumStrategy.AREA_70)) URLPaginaInicial += "&areaMinima=70";
    if(strategies.includes(EnumStrategy.VALOR_400k)) URLPaginaInicial += "&precoMaximo=400000";

    console.log(/* getLocalTime(),  */"Navigating to homepage...");
          
    await page.goto(URLPaginaInicial);
    
    console.log(/* getLocalTime(),  */"Waiting...");
    
    await page.waitForNetworkIdle({ timeout: 0});
    
    console.log(/* getLocalTime(),  */"Scrolling...");
    
    await page.evaluate(() => document.getElementById("resultPageAdBottom")?.scrollIntoView());
    
    console.log(/* getLocalTime(),  */"Waiting...");
    
    await page.waitForNetworkIdle({ timeout: 0});
    
    return cheerio.load(await page.content());
}

async function goToNextPage(page: Page, actualPageIndex: number): Promise<void> {
    await page.waitForNetworkIdle({ timeout: 0});

    await page.waitForSelector('button[aria-label="Próxima página"]', { timeout: 0 });

    console.log(/* getLocalTime(),  */"Navigating to next page...");

    await page.click('button[aria-label="Próxima página"]');

    console.log(/* getLocalTime(),  */`Waiting the page ${actualPageIndex + 1} to load...`);
    
    await page.waitForNetworkIdle({ timeout: 0});

    return;
}

export { goToHomePage, goToNextPage, sleep, getLocalTime, scrapePage };