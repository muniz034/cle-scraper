import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export default async () => {
    const db = await open({
        filename: './database.db',
        driver: sqlite3.Database
    });

    return db;
}