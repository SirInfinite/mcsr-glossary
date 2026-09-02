import fs from 'fs';
import path from 'path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '..', 'data', 'terms.json');

const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

var count = 0;

data.terms.forEach(term => {
    if (term.id === undefined || term.id === "") {
        term.id = randomUUID();
        count++;
    }
});

fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
console.log(`Assigned ${count} missing term ID${count === 1 ? '' : 's'}.`);
