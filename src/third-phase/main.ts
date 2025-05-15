import { getLocalTime, sleep } from "../first-phase/functions.js";
import GeocodeServiceClass from "../service/geocode-service.js";
import ImovelServiceClass from "../service/imovel-service.js";
import startDatabase from "../database.js";

const db = await startDatabase();

await db.exec(`
    CREATE TABLE IF NOT EXISTS local (
        id INTEGER PRIMARY KEY,
        endereco TEXT NOT NULL,
        lat REAL,
        lng REAL
    );
`);

const GeocodeService = new GeocodeServiceClass();
const ImovelService = new ImovelServiceClass();

let nImoveis = await ImovelService.countByLatEquals0AndLngEquals0();

console.log(getLocalTime(), `Starting third-phase!`);
console.log(getLocalTime(), `Remaining imovel quantity to geolocate: ${nImoveis}`);

while (nImoveis > 0) {
  const imovel = await ImovelService.findOneByLatEquals0AndLngEquals0();

  const [lat, lng] = await GeocodeService.geocode(imovel.endereco!.replaceAll(/, [0-9]+/g, ""));

  const imoveis = await ImovelService.findAllByShortAddress(imovel.endereco!.replaceAll(/, [0-9].*/g, "").replaceAll(/ -.*/g, ""));

  console.log(getLocalTime(), `Updating ${imoveis.length} imoveis with address: ${imovel.endereco!.replaceAll(/, [0-9].*/g, "").replaceAll(/ -.*/g, "")}`);

  imoveis.forEach(i => {
    i.lat = lat; 
    i.lng = lng;
  });

  await ImovelService.save(imoveis);

  nImoveis = await ImovelService.countByLatEquals0AndLngEquals0();

  console.log(getLocalTime(), `Remaining imovel quantity to geolocate: ${nImoveis}`);
  
  console.log(getLocalTime(), "Waiting for 1s before continuing...");

  await sleep(1000);

  console.log("\n");
}

process.exit(1);