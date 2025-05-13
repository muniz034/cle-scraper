import { ChildProcess, fork } from 'node:child_process';
import Imovel from '../imovel.js';
import { getLocalTime, sleep } from '../first-phase/functions.js';
import startDatabase from "../database.js";
import loading from 'loading-cli';
import ImovelServiceClass from '../service/imovel-service.js';
import { Database } from 'sqlite';

export interface IMessage {
  from: string,
  data: {
    imoveis?: Imovel[],
    isScraped?: boolean,
    isScraping?: boolean,
    isReady?: boolean,
    isInitializing?: boolean
  }
}

export class Orchestrator {
  public imoveis!: Imovel[];

  public imovelIdAlreadySent: number[] = [];
  
  private db!: Database;
  
  private workers: ChildProcess[] = [];

  private ImovelService: ImovelServiceClass = new ImovelServiceClass();
  
  private LIMIT_IMOVEIS: number = 10;
  private LIMIT_WORKERS: number = 2;
  private LIMIT_IMOVEL_PER_WORKER: number = 2;

  public async startSecondPhase() {
    let load = loading("Loading database").start();

    this.db = await startDatabase();

    load.stop();
    console.log(getLocalTime(), "✅ Database loaded!");

    load = loading("Loading imoveis").start();
    
    this.imoveis = await this.ImovelService.findAllByValorEquals0({ limit: this.LIMIT_IMOVEIS });

    load.stop();
    console.log(getLocalTime(), `✅ ${this.imoveis.length} imoveis loaded!`);

    console.log(getLocalTime(), "Second phase initializing");
    console.log(getLocalTime(), `Spawning ${this.LIMIT_WORKERS} workers`);

    for(let i = 0; i < this.LIMIT_WORKERS; i++) {
      this.workers.push(fork('./dist/second-phase/worker.js'));

      this.workers[i].on('message', this.handleWorkerMessage.bind(this));

      this.workers[i].send({ from: `orc-${process.pid}`, data: { isInitializing: true }});
      
      console.log(getLocalTime(), `✅ Worker forked successfully: ${this.workers[i].pid}`);
      
      await sleep(2000);
    }
  }

  public async sendImoveis(msg: IMessage) {
    await sleep(5000);

    if (this.imoveis.length == 0) {
      this.imoveis = await this.ImovelService.findAllByIdNotInAndValorEquals0(this.imovelIdAlreadySent, { limit: this.LIMIT_IMOVEIS });
      console.log(getLocalTime(), `Fetched more imoveis. Imoveis: [${this.imoveis.map(i => i.id)}]`);
    }

    if(this.imoveis.length == 0) {
      console.log(getLocalTime(), `✅ No more imoveis to scrap!`);
      this.workers.forEach(w => w.kill());
      console.log(getLocalTime(), `✅ All workers killed!`);
      return;
    }

    const worker = this.workers.find(w => w.pid === Number(msg.from.replace(/^.*-/g, "")));
    
    if(!worker) {
      // Incluir remoção da lista de workers e inicialização de mais um worker
      return console.error(getLocalTime(), `${msg.from} not found!`);
    }

    const imoveisToSend = this.chooseRandomImoveis();

    console.log(getLocalTime(), `orc-${process.pid}: Sending imoveis [${imoveisToSend.map(i => i.id)}] to ${msg.from}`);

    worker.send({ from: `orc-${process.pid}`, data: { imoveis: imoveisToSend, isScraping: true }});
  }

  public removeFromImoveisList(imovel: Imovel): void {
    const index = this.imoveis.findIndex(v => v.id === imovel.id);

    if(index >= 0) this.imoveis.splice(index, 1);
  }

  public chooseRandomImoveis(): Imovel[] {
    const imoveis: Imovel[] = [];

    while(imoveis.length < this.LIMIT_IMOVEL_PER_WORKER) {
      let imovel = this.imoveis[Math.floor(Math.random() * this.imoveis.length)];

      while(imoveis.findIndex(i => i.id == imovel.id) != -1 && this.imovelIdAlreadySent.findIndex(i => i == imovel.id) != -1) {
        imovel = this.imoveis[Math.floor(Math.random() * this.imoveis.length)];
      }

      this.imovelIdAlreadySent.push(imovel.id ?? -1);
      imoveis.push(imovel);
    }

    return imoveis;
  }

  public async handleWorkerMessage(msg: IMessage) {
    console.log(getLocalTime(), `orc-${process.pid}: ${this.imoveis.map(i => i.id)}`);

    if(msg.data.isReady) {
      return await this.sendImoveis(msg);
    } else if(msg.data.isScraped) {
      if(msg.data.imoveis) for(const imovel of msg.data.imoveis) this.removeFromImoveisList(imovel);

      await this.ImovelService.save(msg.data.imoveis as Imovel[]);
      return await this.sendImoveis(msg);
    }
  }
};

// worker1.send({ from: `orchestrator-${process.pid}`, data: randomUUID() });
// worker2.send({ from: `orchestrator-${process.pid}`, data: randomUUID() });