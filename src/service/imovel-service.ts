import { Database } from "sqlite";
import startDatabase from "../database.js";
import Imovel from "../imovel.js";

export default class ImovelService {
  private db!: Database;

  constructor() {}

  public async findAllByIdNotInAndValorEquals0(ids: number[], options: { limit?: number }): Promise<Imovel[]> {
    if(!this.db) this.db = await startDatabase();

    const { limit } = options;

    let stmt;

    if(limit) {
      stmt = await this.db.prepare("SELECT * FROM imovel WHERE id NOT IN (?) AND valor = 0 LIMIT ?");
      stmt.bind([ids.join(","), limit]);
    } else {
      stmt = await this.db.prepare("SELECT * FROM imovel WHERE id NOT IN (?) AND valor = 0");
      stmt.bind([ids.join(",")]);
    }
    
    return Imovel.fromRows(await stmt.all());
  }

  public async findAllByValorEquals0(options: { limit?: number }): Promise<Imovel[]> {
    if(!this.db) this.db = await startDatabase();

    const { limit } = options;

    const sql = "SELECT * FROM imovel";
    let stmt;

    if(limit) {
      stmt = await this.db.prepare("SELECT * FROM imovel WHERE valor = 0 AND scrap = 0 LIMIT ?");
      stmt.bind([limit]);
    } else {
      stmt = await this.db.prepare("SELECT * FROM imovel WHERE valor = 0 AND scrap = 0");
    }

    return Imovel.fromRows(await stmt.all());
  }

  public async findAllByLatEquals0AndLngEquals0(): Promise<Imovel[]> {
    if(!this.db) this.db = await startDatabase();

    const stmt = await this.db.prepare("SELECT * FROM imovel WHERE (lat IS NULL AND lng IS NULL) OR (lat = 0 AND lng = 0)");

    return Imovel.fromRows(await stmt.all());
  }

  public async findAllByShortAddress(shortAddress: string): Promise<Imovel[]> {
    if(!this.db) this.db = await startDatabase();

    const stmt = await this.db.all("SELECT * FROM imovel WHERE SUBSTR(endereco, 1, INSTR(endereco, ',') - 1) = ? OR SUBSTR(endereco, 1, INSTR(endereco, ' -') - 1) = ?", [shortAddress, shortAddress]);

    return Imovel.fromRows(stmt);
  }

  public async findOneByLatEquals0AndLngEquals0(): Promise<Imovel> {
    if(!this.db) this.db = await startDatabase();

    const stmt = await this.db.prepare("SELECT * FROM imovel WHERE (lat IS NULL AND lng IS NULL) OR (lat = 0 AND lng = 0)");
    
    const result = await stmt.get();

    return Imovel.fromRow(result);
  }

  public async countByValorEquals0(): Promise<number> {
    if(!this.db) this.db = await startDatabase();

    const stmt = await (await this.db.prepare("SELECT * FROM imovel WHERE valor = 0")).all();

    return stmt.length;
  }

    public async countByLatEquals0AndLngEquals0(): Promise<number> {
    if(!this.db) this.db = await startDatabase();

    const stmt = await (await this.db.prepare("SELECT * FROM imovel WHERE (lat IS NULL AND lng IS NULL) OR (lat = 0 AND lng = 0)")).all();

    return stmt.length;
  }

  public async removeById(id: number): Promise<void> {
    if(id === -1) return;

    if(!this.db) this.db = await startDatabase();

    await this.db.run(`DELETE FROM imovel WHERE id = ?`, [id]);
  }

  public async save(data: Imovel[] | Imovel): Promise<void> {
    if(!this.db) this.db = await startDatabase();

    if(Array.isArray(data)) {
        for(const imovel of data) {
            await this.db.run(`
                INSERT OR REPLACE INTO imovel 
                (id, slug, url, valor, tamanho, valor_condominio, valor_iptu, endereco, lat, lng) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    imovel.id, imovel.slug, imovel.url, imovel.valor, imovel.tamanho, imovel.valor_condominio, imovel.valor_iptu, imovel.endereco, imovel.lat, imovel.lng
                ]);
        }
    } else {
        await this.db.run(`
            INSERT OR REPLACE INTO imovel 
            (id, slug, url, valor, tamanho, valor_condominio, valor_iptu, endereco, lat, lng) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                data.id, data.slug, data.url, data.valor, data.tamanho, data.valor_condominio, data.valor_iptu, data.endereco, data.lat, data.lng
            ]);
    }
  }
}
