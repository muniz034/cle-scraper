import { Database } from "sqlite";
import startDatabase from "../database.js";
import Imovel from "../imovel.js";
import { getLocalTime, sleep } from "../first-phase/functions.js";

export default class GeocodeService {
  private db!: Database;
  public lastRequisitionTimestampNominatim: number = -1;

  constructor() {}

  public async geocode(address: string): Promise<[number, number]> {
    if(!this.db) this.db = await startDatabase();

    const result = await this.db.get("SELECT * FROM local WHERE endereco = ?", [address]);

    if(result) {
      console.log(getLocalTime(), `Address ${address} is already in database`);
      return [result.lat, result.lng];
    }

    const params = new URLSearchParams({ q: address, format: 'json', limit: '1' });

    this.lastRequisitionTimestampNominatim = Date.now();

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { headers: { 'User-Agent': 'clé' } });

    const data = await response.json();

    if(data.length === 0) {
      console.log(getLocalTime(), `Can't geocode address ${address}`);
      return [-1, -1];
    }

    console.log(getLocalTime(), `Geocoded ${address}: (${data[0].lat}, ${data[0].lon})`);

    await this.db.run("INSERT INTO local (endereco, lat, lng) VALUES (?, ?, ?)", [address, data[0].lat, data[0].lon]);

    return [data[0].lat, data[0].lon];
  }
}
