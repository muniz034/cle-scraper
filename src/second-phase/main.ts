import puppeteer, { Browser, Page } from "puppeteer";
import { getLocalTime, sleep } from "../first-phase/functions.js";
import Imovel from "../imovel.js";
import ImovelServiceClass from "../service/imovel-service.js";
import * as cheerio from 'cheerio';

const LIMIT_IMOVEIS = 500;
const LIMIT_IMOVEIS_TO_PROCESS = 5;
const THRESHOLD = 0.2;

const ImovelService = new ImovelServiceClass();

let nImoveis = await ImovelService.countByValorEquals0();

console.log(/* getLocalTime(),  */`Starting second-phase! ${JSON.stringify({ nImoveis, LIMIT_IMOVEIS, LIMIT_IMOVEIS_TO_PROCESS })}`);

while (nImoveis > 0) {
  const imoveis = await ImovelService.findAllByValorEquals0({ limit: LIMIT_IMOVEIS_TO_PROCESS });
  const promises = [];

  for(const imovel of imoveis) promises.push(scrape([imovel]));

  await Promise.all(promises);

  nImoveis = await ImovelService.countByValorEquals0();

  console.log(/* getLocalTime(),  */`Remaining imovel quantity to scrap: ${nImoveis}`);
  
  console.log(/* getLocalTime(),  */"Waiting for 3s before continuing...");
  await sleep(3000);
}

async function scrape(imoveis: Imovel[]) {
  for(const imovel of imoveis) {
    console.log(/* getLocalTime(),  */"Starting the scraping process...");

    console.log("Scraping imovel " + imovel.id);

    const [browser, page] = await restartPage();

    try {
      await page.goto(imovel.url);
    } catch(err) {
      console.error(err);
      await browser.close();
      continue;
    }

    try {
      await page.waitForSelector('.address-info-wrapper > p', { timeout: 10000 });
    } catch (err) {
      if(page.url().startsWith('https://www.vivareal.com.br/404/')) {
        console.log(getLocalTime(), `Removing the imovel ${imovel.id}`);

        await ImovelService.removeById(imovel.id ?? -1);
      }

      await browser.close();
      continue;
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

    await browser.close();
  }
}

async function restartPage(): Promise<[Browser, Page]> {
  const newBrowser = await puppeteer.launch({ headless: false, protocolTimeout: 0, devtools: true });

  const newPage = await newBrowser.newPage();
  await newPage.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:138.0) Gecko/20100101 Firefox/138.0");
  await newPage.setExtraHTTPHeaders({ referer: 'https://www.vivareal.com.br/' });

  return [newBrowser, newPage];
}

process.exit(1);