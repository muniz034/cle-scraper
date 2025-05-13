import { getLocalTime, sleep } from "../first-phase/functions.js";
import Imovel from "../imovel.js";
import { IMessage } from "./orchestrator.js";
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync("./database.db");

process.on('message', async (msg: IMessage) => {
  if(msg.data.isScraping && msg.data.imoveis) {
    // console.log(getLocalTime(), `worker-${process.pid}: Received imoveis ${msg.data.imoveis.map((i: Imovel) => i.id)}`);
    
    await sleep(5000);

    for(const imovel of msg.data.imoveis as Imovel[]) imovel.valor = Math.random() * (100 + 1);

    process.send?.({ from: `worker-${process.pid}`, data: { imoveis: msg.data.imoveis, isScraped: true } });
  } else if(msg.data.isInitializing) {
    process.send?.({ from: `worker-${process.pid}`, data: { isReady: true } });
  }
});