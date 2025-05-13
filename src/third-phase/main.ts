import GeocodeServiceClass from "../service/geocode-service.js";
import ImovelServiceClass from "../service/imovel-service.js";

const GeocodeService = new GeocodeServiceClass();
const ImovelService = new ImovelServiceClass();

const imoveis = await ImovelService.findAllByLatEquals0AndLngEquals0();

console.log(await GeocodeService.geocode(imoveis[0].endereco!));
console.log(GeocodeService.lastRequisitionTimestampNominatim);

