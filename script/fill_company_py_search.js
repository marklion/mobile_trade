#!/usr/bin/env node
const path = require('path');
const db_opt = require(path.join(__dirname, '../api/db_opt'));
const py_search_lib = require(path.join(__dirname, '../api/lib/py_search_lib'));

async function main() {
    await db_opt.install();
    const sq = db_opt.get_sq();
    const companies = await sq.models.company.findAll();
    for (const company of companies) {
        company.py_search = py_search_lib.buildPySearch(company.name);
        await company.save();
        console.log(`${company.id}\t${company.name}\t${company.py_search}`);
    }
    console.log(`Done. Updated ${companies.length} companies.`);
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
