import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

let db!: Database;

export default async () => {
    if(!db) {
        db = await open({
            filename: './database.db',
            driver: sqlite3.Database
        });
    }

    return db;
}