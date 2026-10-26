import { openDb } from "../server/db.js";
const db = openDb();
console.log("Migrations:", db.prepare("SELECT * FROM migrations").all());
db.close();
