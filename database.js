Array.prototype.sieve = function(object) {
    for ( let key in object ) {
        result = this.filter(fields => fields[key] == object[key]);
    }
    return result;
}

let database = localStorage.auction ? JSON.parse(localStorage.auction) : {};

let uniques = {
    bid: ["name"],
    config: ['bid_id'],
    quote: ['bid_id'],
    item: ['bid_id', 'name'],
    band: ['bid_id', 'name'],
    bidder: ['bid_id', 'name'],
    stage: ['bid_id'],
    round: ['bid_id', 'stage', 'round'],
    offer_win: ['offer_id', 'item_id'],
    package_win: ['package_id'],
    point: ['offer_id'],
    info: ['bid_id', 'item_id', 'stage', 'round', 'key'],
    info_total: ['bid_id', 'stage', 'round', 'key']
}

function save(page, data) {
    if ( checkunique(page, data) ) {
        let id = generate_id();
        database[page] = database[page] || [];
        database[page].push({id:id, ...data});
        localStorage.auction = JSON.stringify(database);
        return {result:'success', data: {id:id, ...data}};
    }
    return {result:'error'};
}

function update(page, data, id) {
    if (checkunique(page, data)) {
        let index = database[page].findIndex( fields => fields.id == id );
        database[page][index] = {id:id, ...data};
        localStorage.auction = JSON.stringify(database);
        return {result:'success', data: {id:id, ...data}};
    }
    return {result:'error'};
}

function checkunique(page, data) {
    let check = database[page] || [];
    let unique = uniques[page];
    if ( unique ) {
        for ( let key of unique) {
            check = check.filter( fields => fields[key] == data[key] );
        }
        return check.length == 0;
    }
    return true;
}

function get(page, filter) {
    let result = database[page] || [];
    return result.sieve(filter);
}

function remove(page, id) {
    let index = database[page].findIndex( fields => fields.id == id);
    let removed = database[page].splice(index, 1);
    localStorage.auction = JSON.stringify(database);
    return removed;
}

function generate_id() {
    return Date.now().toString(16) + Math.ceil(Math.random()*16**4);
}