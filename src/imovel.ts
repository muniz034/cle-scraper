export default class Imovel {
  id?: number; // Primary key, optional if auto-incremented
  slug!: string;
  url!: string;
  valor: number = 0;
  tamanho?: number;
  valor_condominio: number = 0;
  valor_iptu: number = 0;
  endereco?: string;
  lat?: number;
  lng?: number;

  constructor(data: Partial<Imovel>) {
    Object.assign(this, {
      valor: 0,
      valor_condominio: 0,
      valor_iptu: 0,
      ...data,
    });
  }

  static fromRow(row: any): Imovel {
    if (!row) throw new Error("Cannot create Imovel from undefined row");
    return new Imovel({
      id: row.id,
      slug: row.slug,
      url: row.url,
      valor: row.valor,
      tamanho: row.tamanho,
      valor_condominio: row.valor_condominio,
      valor_iptu: row.valor_iptu,
      endereco: row.endereco,
      lat: row.lat,
      lng: row.lng,
    });
  }

  static fromRows(rows: any[]): Imovel[] {
    if (!Array.isArray(rows)) throw new Error("Expected an array of rows");
    return rows.map(row => Imovel.fromRow(row));
  }
}
