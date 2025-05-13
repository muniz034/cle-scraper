import { Database } from "sqlite";
import startDatabase from "../database.js";
import Imovel from "../imovel.js";
import { getLocalTime, sleep } from "../first-phase/functions.js";

export default class GeocodeService {
  private db!: Database;
  public lastRequisitionTimestampNominatim: number = -1;

  constructor() {}

  public async geocode(address: string): Promise<any> {
    // if(!this.db) this.db = await startDatabase();

    // if(/^.*(?=,)/g.test(address)) {
    //     console.log(getLocalTime(), `Address ${address} is malformed`);
    //     return;
    // }

    // const name = /^.*(?=,)/g.exec(address)![0];

    // const result = await this.db.get("SELECT * FROM local WHERE nome = ?", [name]);

    // if(result) {
    //     console.log(getLocalTime(), `Address ${address} is already in database`);
    //     return result;
    // }

    const params = new URLSearchParams({ q: address, format: 'json', limit: '1' });

    if(this.lastRequisitionTimestampNominatim === -1 || (this.lastRequisitionTimestampNominatim - Date.now()) < 3000) await sleep(2000);

    this.lastRequisitionTimestampNominatim = Date.now();

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { headers: { 'User-Agent': 'clé' } });

    const data = await response.json();

    // await this.db.run("INSERT INTO local (nome, info) VALUES (?, ?)", [data[0].name, data[0]]);

    return data[0];
  }
}
