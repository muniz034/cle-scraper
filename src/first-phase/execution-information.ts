import * as fs from 'fs';

type ExecutionData = {
  lastPage: number;
  lastRunTimestamp: string;
  executionTimes: number[];
};

export default class ExecutionInformation {
  private filePath: string;
  private data: ExecutionData;

  constructor(path: string) {
    this.filePath = path;
    this.data = this.readFile();
  }

  private readFile(): ExecutionData {
    if (!fs.existsSync(this.filePath)) {
      const initialData: ExecutionData = { lastPage: 0, lastRunTimestamp: new Date().toISOString(), executionTimes: [] };

      fs.writeFileSync(this.filePath, JSON.stringify(initialData, null, 2));
      return initialData;
    }

    const content = fs.readFileSync(this.filePath, 'utf-8');
    return JSON.parse(content) as ExecutionData;
  }

  private writeFile() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  public setLastPage(page: number) {
    this.data.lastPage = page;
    this.writeFile();
  }

  public setLastRunTimestamp() {
    this.data.lastRunTimestamp = new Date().toISOString();
    this.writeFile();
  }

  public addExecutionTime(s: number) {
    this.data.executionTimes.push(s);
    this.writeFile();
  }

  public getInfo(): ExecutionData {
    return this.data;
  }
}
