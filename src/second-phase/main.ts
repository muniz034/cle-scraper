import puppeteer, { Browser, Page } from "puppeteer";
import { getLocalTime, sleep } from "../first-phase/functions.js";
import Imovel from "../imovel.js";
import ImovelServiceClass from "../service/imovel-service.js";
import * as cheerio from 'cheerio';

const LIMIT_IMOVEIS = 500;
const LIMIT_IMOVEIS_TO_PROCESS = 5;
const THRESHOLD = 0.2;

const ImovelService = new ImovelServiceClass();
let browser = await puppeteer.launch({ headless: false, protocolTimeout: 0, devtools: true });
let page: Page = await browser.newPage();

await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:138.0) Gecko/20100101 Firefox/138.0");

let nImoveis = await ImovelService.countByValorEquals0();
let imoveis = await ImovelService.findAllByValorEquals0({ limit: LIMIT_IMOVEIS });

console.log(/* getLocalTime(),  */`Starting second-phase! ${JSON.stringify({ nImoveis, LIMIT_IMOVEIS, LIMIT_IMOVEIS_TO_PROCESS })}`);

while (imoveis) {
  while (imoveis.length > THRESHOLD * LIMIT_IMOVEIS && nImoveis > 0) {
    const processing: (Imovel | null)[] = [];
    while (processing.length < LIMIT_IMOVEIS_TO_PROCESS) processing.push(imoveis.pop() ?? null);

    console.log(/* getLocalTime(),  */"Waiting for 3s before continuing...");
    await sleep(3000);

    await scrape(processing.filter(i => i != null));
  }

  console.log(/* getLocalTime(),  */`The number of the imoveis' to scrap [${imoveis.length}] fell beyond the threshold [${LIMIT_IMOVEIS} x ${THRESHOLD * 100}% = ${THRESHOLD * LIMIT_IMOVEIS}]`);

  imoveis = imoveis.concat(await ImovelService.findAllByValorEquals0({ limit: LIMIT_IMOVEIS - imoveis.length }));
  nImoveis = await ImovelService.countByValorEquals0();

  console.log(/* getLocalTime(),  */`Remaining imovel quantity to scrap: ${nImoveis}`);
}

async function scrape(imoveis: Imovel[]) {
  for(const imovel of imoveis) {
    console.log(/* getLocalTime(),  */"Starting the scraping process...");

    try {
      await page.goto(imovel.url);
    } catch(err) {
      console.error(err);
      process.exit(1);
    }

    try {
      await page.waitForSelector('.address-info-wrapper > p', { timeout: 45000 });
    } catch (err) {
      if(page.url() === 'https://www.vivareal.com.br/404/') {
        console.log(getLocalTime(), `Removing the imovel with slug ${imovel.slug}`);

        await browser.close();

        [browser, page] = await restartPage(); 

        await ImovelService.removeById(imovel.id ?? -1);
        continue;
      } else {
        console.error(err);
        process.exit(1);
      }
    }
    
    const $ = cheerio.load(await page.content());

    const [
      valor,
      valor_condominio,
      valor_iptu,
      tamanho,
      endereco
    ] = [
      $('p[data-testid="price-info-value"]').text().replaceAll("m²", "").replaceAll("R$", "").replaceAll(".", "").trim(), 
      $('#condo-fee-price').text().replaceAll("m²", "").replaceAll("R$", "").replaceAll(".", "").trim(),
      $('#iptu-price').text().replaceAll("m²", "").replaceAll("R$", "").replaceAll(".", "").trim(),
      $('li[itemprop="floorSize"] > .amenities-item-text').text().replaceAll("m²", "").replaceAll("R$", "").replaceAll(".", "").trim(),
      $('.address-info-wrapper > p').text().replaceAll("m²", "").replaceAll("R$", "").trim()
    ]
    
    console.log(/* getLocalTime(),  */"End of the scraping process", JSON.stringify({
      valor,
      valor_condominio,
      valor_iptu,
      tamanho,
      endereco,
    }).replace(/,/g, ', '));

    imovel.valor = Number.isNaN(valor) ? 0 : Number(valor);
    imovel.valor_condominio = Number.isNaN(valor_condominio) ? 0 : Number(valor_condominio);
    imovel.valor_iptu = Number.isNaN(valor_iptu) ? 0 : Number(valor_iptu);
    imovel.tamanho = Number.isNaN(tamanho) ? 0 : Number(tamanho);
    imovel.endereco = endereco;

    await ImovelService.save(imovel);

    // await page.close();
    await browser.close();

    [browser, page] = await restartPage();
  }
}

async function restartPage(): Promise<[Browser, Page]> {
  const newBrowser = await puppeteer.launch({ headless: false, protocolTimeout: 0, devtools: true });

  const newPage = await newBrowser.newPage();
  await newPage.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:138.0) Gecko/20100101 Firefox/138.0");
  await newPage.setExtraHTTPHeaders({ referer: 'https://www.vivareal.com.br/' });

  return [newBrowser, newPage];
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