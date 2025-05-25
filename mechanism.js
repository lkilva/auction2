function get_offers(bid_id, stage, round, target) {
    let offers = [];
    offer_ids = get('offer', {bid_id: bid_id, stage: stage, round: round, state: 'success'});
    offer_ids.forEach(function(id) {
        offers = offers.concat(get(target, {offer_id: id.id}));
    });
    return offers;
}

let get_offer_win = {
    SMRA: function(bid_id, round) {
        let offers = get_offers(bid_id, 'quantity', round, 'offer_item');
        let pre_offers = get_offers(bid_id, 'quantity', round-1, 'offer_item');
        let pre_wins = get_offers(bid_id, 'quantity', round-1, 'offer_win');
        if ( offers.sieve({state: 'new'}).length == 0 &&
            pre_offers.sieve({state: 'new'}).length == 0 ) {
            let stage = get('stage', {bid_id: bid_id})[0];
            update('stage', {bid_id: bid_id, stage: 'location'}, stage.id);
        }
        pre_wins.forEach(function(pre_win) {
            let bidder_id = get('offer', {id: pre_win.offer_id})[0].bidder_id;
            let offer = get('offer', {bid_id: bid_id, bidder_id: bidder_id,
                stage: 'quantity', round: round, state: 'success'})[0]
            if ( !offer ) {
                offer = save('offer', {bid_id: bid_id, bidder_id: bidder_id, stage: 'quantity',
                    round: round, time: Date.now(), state: 'success'}).data
                
            }
            if ( !get('offer_item', {offer_id: offer.id}).sieve({item_id: pre_win.item_id})[0] ) {
                pre_win.offer_id = offer.id;
                pre_win.random = generateRan();
                offers.push(pre_win);
                save('offer_item', pre_win);
            }
        });
        let items = get('item', {bid_id: bid_id});
        items.forEach(function(item) {
            item_offers = offers.sieve({item_id: item.id});
            item_offers.sort( (a,b) => b.random - a.random );
            item_offers.sort( (a,b) => b.price - a.price );
            if ( item_offers.find( offer => offer.state == 'part') ) {
                let index = item_offers.indexOf( offer => offer.state == 'part');
                let last = item_offers.splice(index, 1);
                item_offers.push( last[0] );
            }
            let quantity = item.quantity;
            let base_price = {
                bid_id: bid_id,
                item_id: item.id,
                stage: 'quantity',
                round: round + 1,
                key: 'base_price'
            };
            for ( let offer of item_offers ) {
                if ( offer.quantity <= quantity ) {
                    offer.state = 'old';
                    delete offer.random;
                    save('offer_win', offer);
                    quantity -= offer.quantity;
                    base_price.value = offer.price;
                } else if ( quantity != 0 ){
                    offer.quantity = quantity;
                    quantity -= offer.quantity;
                    offer.state = 'part';
                    delete offer.random;
                    save('offer_win', offer);
                    base_price.value = offer.price;
                    break;
                }
            }
            if ( quantity > 0 ) {
                base_price.value = item.reserve;
            }
            let clock_price = {...base_price};
            clock_price.key = 'clock_price';
            let quote = config('quote');
            let raise = quote.raise;
            let unit = quote.unit;
            clock_price.value = Math.ceil(base_price.value*(1+raise/100)/unit)*unit;
            save('info', base_price);
            save('info', clock_price);
        });
    },
    CA: function(bid_id, round) {
        let this_round = {bid_id: bid_id, stage: 'quantity', round: round};
        let last_round = {...this_round, round: round-1};
        if ( round == 1 ) {
            CA_first_round(bid_id);
            return;
        }

        let offers = get_offers(bid_id, 'quantity', round, 'offer_item');
        let pre_wins = get_offers(bid_id, 'quantity', round-1, 'offer_win');
        let infos = get('info', this_round);
        offers = offers_pretreat(offers, pre_wins, infos);

        let items = get('item', {bid_id: bid_id});
        let base_prices = infos.sieve({key: 'base_price'});
        let clock_prices = infos.sieve({key: 'clock_price'});
        let excesses = get('info', last_round).sieve({key: 'excess'});
        let point = {};
        base_prices.forEach(fields => fields.round+=1);
        let offer = offers.at(0);
        let index = 0;
        while(offer) {
            let item_weight = items.sieve({id: offer.item_id})[0].weight;
            let excess = excesses.sieve({item_id: offer.item_id})[0];
            let base_price = base_prices.sieve({item_id: offer.item_id})[0];
            switch ( offer_process(offer, item_weight, excess, point, base_price)) {
                case 'pass':
                    index += 1;
                    offer = offers.at(index);
                    break;
                case 'pop':
                    let win = {
                        offer_id: offer.offer_id,
                        item_id: offer.item_id,
                        quantity: offer.quantity,
                        price: offer.price,
                        state: 'old'
                    }
                    save('offer_win', win);
                    offers.splice(index, 1);
                default:
                    index = 0;
                    offer = offers.at(0);
            }
        }
        offers.forEach(function(offer) {
            let win = {
                offer_id: offer.offer_id,
                item_id: offer.item_id,
                quantity: offer.quantity - offer.change,
                price: offer.price,
                state: 'part'
            };
            save('offer_win', win)
        });
        let finished = true;
        excesses.forEach(function(excess) {
            excess.round += 1;
            save('info', excess);
            if (excess.value > 0) {
                let clock_price = clock_prices.sieve({item_id: excess.item_id})[0].value;
                base_prices.sieve({item_id: excess.item_id}).value = clock_price;
                finished = false;
            }
        });
        if ( finished == true ) {
            let stage = get('stage', {bid_id: bid_id})[0];
            update('stage', {bid_id: bid_id, stage: 'location'}, stage.id);
            return;
        }
        base_prices.forEach(function(base_price) {
            clock_price = {...base_price};
            clock_price.key = 'clock_price';
            let quote = config('quote');
            let raise = quote.raise;
            let unit = quote.unit;
            clock_price.value = Math.ceil(base_price.value*(1+raise/100)/unit)*unit;
            save('info', base_price);
            save('info', clock_price);
        })
    },
    CCA: function(bid_id, round) {
        let items = get('item', {bid_id: bid_id});
        let this_round = {bid_id: bid_id, stage: 'quantity', round: round};
        let infos = get('info', this_round);
        let base_prices = infos.sieve({key: 'base_price'});
        let clock_prices = infos.sieve({key: 'clock_price'});
        let offers = get_offers(bid_id, 'quantity', round, 'offer_item');
        offers.forEach(function(offer) {
            offer.state = 'old';
            delete offer.random;
            save('offer_win', offer);
        })
        let finished = true;
        items.forEach( function(item) {
            let excess = {
                bid_id: bid_id,
                item_id: item.id,
                stage: 'quantity',
                round: round,
                key: 'excess',
                value: -item.quantity
            }
            offers.sieve({item_id: item.id}).forEach(function(offer) {
                excess.value += offer.quantity;
            })
            save('info', excess);
            let base_price = base_prices.sieve({item_id: item.id})[0];
            base_price.round += 1;
            let clock_price = clock_prices.sieve({item_id: item.id})[0];
            clock_price.round += 1;
            if ( excess.value > 0 ) {
                base_price.value = clock_price.value;
                finished = false;
            }
            clock_price = {...base_price};
            clock_price.key = 'clock_price';
            let quote = config('quote');
            let raise = quote.raise;
            let unit = quote.unit;
            clock_price.value = Math.ceil(base_price.value*(1+raise/100)/unit)*unit;
            save('info', base_price);
            save('info', clock_price);
        });
        if ( finished == true ) {
            let stage = get('stage', {bid_id: bid_id})[0];
            update('stage', {bid_id: bid_id, stage: 'complement'}, stage.id);
            return;
        }
    }
}

function CA_first_round(bid_id) {
    get_offer_win['CCA'](bid_id, 1);
}

function offers_pretreat(offers, before, infos) {
    let organize = {};
    offers.forEach(function(object) {
        let bidder_id = get('offer', {id: object.offer_id})[0].bidder_id;
        let key = bidder_id + "." + object.item_id;
        organize[key] = {after: object};
    });
    before.forEach(function(object) {
        let bidder_id = get('offer', {id: object.offer_id})[0].bidder_id;
        let key = bidder_id + "." + object.item_id;
        organize[key] = organize[key] || {};
        organize[key].before = object;
    });
    let outputs = [];
    Object.values(organize).forEach(function(compare) {
        let before = compare.before;
        let after = compare.after;
        let output;
        if ( !before ) {
            output = {...after};
            output.change = after.quantity;
        } else if ( !after ) {
            output = {...before};
            output.random = generateRan();
            output.state = 'old';
            let offer_before = get('offer', {id: before.offer_id})[0];
            let bidder_id = offer_before.bidder_id;
            let offer = offers.sieve({bidder_id: bidder_id})[0];
            output.quantity = 0;
            if ( offer ) {
                output.offer_id = offer.offer_id;
            } else {
                let bid_id = offer_before.bid_id;
                let round = offer_before.round + 1;
                let result = save('offer', {bid_id: bid_id, bidder_id: bidder_id,
                    stage:'quantity', round: round, time: Date.now(), state: 'success'});
                output.offer_id = result.data.id;
            }
            save('offer_item', output);
            output.change = -before.quantity;
        } else {
            output = {...after};
            output.change = after.quantity - before.quantity;
        }
        output.temp = 0;
        let base_price = infos.sieve({key: 'base_price', item_id: output.item_id})[0].value;
        let clock_price = infos.sieve({key: 'clock_price', item_id: output.item_id})[0].value;
        output.price_point = (output.price - base_price)/(clock_price - base_price)*100;
        outputs.push(output);
    });
    outputs.sort( (a,b) => b.random - a.random );
    outputs.sort( (a,b) => a.price_point - b.price.point );
    return outputs;
}

function offer_process(offer, weight, excess, point, base_price) {
    let bidder_id = get('offer', {id: offer.offer_id})[0].bidder_id;
    point[bidder_id] = point[bidder_id] || 0;
    /** change為負時，不可超過excess；change為正時，不可超過point/weight */
    let enough = offer.change < 0 ? -excess.value : Math.floor(point[bidder_id]/weight);
    /** excess不為正時，不可再降；point不足weight時，不可再正 */
    if ( (offer.change < 0 && enough >= 0) || (offer.change > 0 && enough < 1) ) {
        return 'pass';
    }
    if ( (offer.all_or_nothing == true && offer.change + excess.value < 0 )) {
        return 'pass';
    }
    /** change為負時，記錄base_price */
    if ( offer.change < 0 ) {
        base_price.value = Math.max(base_price.value, offer.price);
    }
    /** 變化以change為目標，但不可超過enough */
    let change = Math.abs(enough) >= Math.abs(offer.change) ? offer.change : enough;
    /** change增加時，excess也會增加 */
    excess.value += change;
    /** change減少時，可用的point則會增加 */
    point[bidder_id] -= weight * change;
    offer.change -= change;
    offer.temp += change;
    if ( offer.change == 0 ) {
        return 'pop';
    }
}

/** CCA補充階段 */

function gen_item_key(offer_items) {
    let items = get('item', {bid_id: select.bid_id});
    return _gen_item_key(offer_items, items);
}

/**
 * @param items - 物件陣列，具id屬性
 * @param offer_items - 物件陣件，具item_id、quantity屬性
 * @returns 字串 - offer_items裡各item的數量，以"-"相隔
 */
function _gen_item_key(offer_items, items) {
    let output = [];
    for ( let item of items ) {
        let offer = offer_items.sieve({item_id: item.id})[0];
        output.push(offer ? offer.quantity : 0);
    }
    return output.join("-");
}
test('_gen_item_key',
    _gen_item_key([{item_id:1, quantity:4}, {item_id:2, quantity:3}],
        [{id:3}, {id:1}, {id:4}, {id:2}]
    ),
    "0-4-0-3",
    3
)

function compute_point(offer_items) {
    let items = get('item', {bid_id: bid_id});

    return _compute_point(offer_items, items);
}

function _compute_point(offer_items, items) {
    let point = 0;
    for ( let offer_item of offer_items ) {
        point += offer_item.quantity * items.sieve({id: offer_item.item_id})[0].weight;
    }
    return point;
}
test('_compute_point',
    _compute_point([{item_id:1, quantity:4}, {item_id:2, quantity:8}],
        [{id:1, weight:2}, {id:2, weight:4}, {id:3, weight:2}]
    ),
    40,
    3
)

function get_round_reduced() {
    let offers = get('offer', {bidder_id: select.bidder_id, stage: 'quantity', state: 'success'});
    let points = get('point', {reduce: true});

    return _get_round_reduced(points, offers);
}

function _get_round_reduced(points, offers) {
    let outputs = []
    for ( let offer of offers ) {
        let output = points.sieve({offer_id: offer.id, reduce: true});
        outputs = outputs.concat([...output]);
    }
    return outputs;
}
test('_get_round_reduced',
    _get_round_reduced([{offer_id:1, point:4, reduce:true}, {offer_id:2, point:3, reduce:true},
        {offer_id:3, point:3}
    ], [{id:1}, {id:2}, {id:3}]
    ),
    [{offer_id:1, point:4, reduce:true}, {offer_id:2, point:3, reduce:true}],
    3
)

/** 計算可報最高金額 */
function offer_upper(bid_id, bidder_id, offer_items, offers_r, offer_items_r) {
    let preference = get('config', {bid_id: bid_id})[0].preference;
    let items = get('item', {bid_id: bid_id});
    let offers = get('offer', {bidder_id: bidder_id, stage: 'quantity', state: 'success'});
    let offer_wins = get('offer_win');
    let points = get('point', {reduce: true});
    let clocks = get('info', {bid_id: bid_id, stage: 'quantity', key: 'clock_price'});

    let point = _compute_point(offer_items, items);
    let round_reduced = _get_round_reduced(points, offers);
    let limit_min = Infinity;
    for ( let reduced of round_reduced ) {
        if ( point > reduced.point ) {
            let round = get('offer', {id: reduced.offer_id})[0].round;
            let limit = _limit(offer_items, round, offers, offer_wins, offers_r, offer_items_r, clocks, items);
            if ( !preference ) return limit;
            limit_min = limit_min < limit ? limit_min : limit;
        }
    }
    let round = offers.at(-1).round;
    let limit = _limit(offer_items, round, offers, offer_wins, offers_r, offer_items_r, clocks, items);
    limit_min = limit_min < limit ? limit_min : limit;
    let key = _gen_item_key(offer_wins.sieve({offer_id: offers.at(-1).id}), items)
    if ( _gen_item_key(offer_items, items) == key ) limit_min *= 1.2;
    return limit_min;
}

function _limit(offer_items, round, offers, offer_wins, offers_r, offer_items_r, clocks, items) {
    let offer_o = offers.sieve({round: round})[0];
    let offer_items_o = offer_wins.sieve({offer_id: offer_o.id});
    let clock_o = clocks.sieve({round: round});
    let highest_o = _highest(offer_items_o, offers, offer_wins, items);
    let highest_r = _highest(offer_items_o, offers_r, offer_items_r, items);
    console.log('highest - o:', highest_o, "; r:", highest_r);
    let limit = Math.max(highest_o, highest_r) -
        product_sum(offer_items_o, clock_o) + product_sum(offer_items, clock_o);
    return limit;
}

function match_highest(match, offers, offer_items, items) {
    let matched = [];
    for ( let offer of offers ) {
        let offer_item = offer_items.sieve({offer_id: offer.id});
        if ( _gen_item_key(match, items) != _gen_item_key(offer_item, items) ) continue;
        let price = get_offer_price(offer_item);
        if ( matched.price && matched.price >= price) continue;
        matched = {
            ...offer,
            price: price,
            items:[...offer_item]
        };
    }
    return matched;
}
test('In machanism.js, match_highest',
    match_highest(
        [{item_id:1, quantity:3}, {item_id:2, quantity:8}],
        [{id:1}, {id:2}, {id:3}],
        [{offer_id:1, item_id:1, quantity:5, price:40}, {offer_id:1, item_id:3, quantity:8, price:50},
         {offer_id:2, item_id:1, quantity:3, price:50}, {offer_id:2, item_id:2, quantity:8, price:40},
         {offer_id:3, item_id:1, quantity:3, price:80}, {offer_id:3, item_id:2, quantity:8, price:70}],
        [{id:1}, {id:2}, {id:3}]
    ),
    {id:3, price:800, items:[
        {offer_id:3, item_id:1, quantity:3, price:80}, {offer_id:3, item_id:2, quantity:8, price:70}
    ]},
    3
)

function get_offer_price(offer_items) {
    let price = 0
    for ( offer_item of offer_items) {
        price += offer_item.price * offer_item.quantity;
    }
    return price;
}

function highest(bid_id, bidder_id, offers, offers_r, offer_items_r) {
    let items = get('item', {bid_id: bid_id});
    let offers_o = get('offer', {bid_id: bid_id, bidder_id: bidder_id, stage:'quantity', state:'success'});
    let offer_items_o = get('offer_win');

    let output_o = _highest(offers, offers_o, offer_items_o, items);
    let output_r = _highest(offers, offers_r, offer_items_r, items);

    return Math.max(output_o, output_r);
}

function _highest(offers, offers_r, offer_items_r, items) {
    let item_key = _gen_item_key(offers, items);
    let output = 0;
    for ( let offer of offers_r ) {
        let offer_items = offer_items_r.filter( o => o.package_id == offer.id || o.offer_id == offer.id);
        if ( _gen_item_key(offer_items, items) == item_key) {
            let price = offer.price || offer_items.reduce( (sum, item) => sum+item.price*item.quantity, 0);
            output = output > price ? output : price;
        }
    }
    return output;
}
test("_highest_o",
    _highest([{item_id:1, quantity:8}, {item_id:3, quantity:4}],
        [{id:1}, {id:2}, {id:3}],
        [{offer_id:1, item_id:1, quantity:8, price:50}, {offer_id:1, item_id:3, quantity:4, price:20},
         {offer_id:1, item_id:4, quantity:5, price:10},
         {offer_id:2, item_id:1, quantity:8, price:120}, {offer_id:2, item_id:3, quantity:4, price:60},
         {offer_id:3, item_id:1, quantity:8, price:70}, {offer_id:3, item_id:3, quantity:4, price:50}],
        [{id:1}, {id:4}, {id:3}]
    ),
    1200,
    3
)
test("_highest_r",
    _highest([{item_id:1, quantity:8}, {item_id:3, quantity:4}],
        [{id:1, price:80}, {id:2, price: 60}],
        [{package_id:1, item_id:1, quantity:8}, {package_id:1, item_id:3, quantity:4},
         {package_id:1, item_id:4, quantity:5},
         {package_id:2, item_id:1, quantity:8}, {package_id:2, item_id:3, quantity:4}],
        [{id:1}, {id:4}, {id:3}]
    ),
    60,
    3
)
test("_highest_0",
    _highest([{item_id:1, quantity:8}, {item_id:3, quantity:4}],
        [],
        [],
        [{id:1}, {id:4}, {id:3}]
    ),
    0,
    3
)

/** 計算補充階段得標結果 */
/** offers[bidder][package][item] */
function compute_package_win(bid_id) {
    let offers = all_offers(bid_id);
    let prices = all_prices(bid_id);

    let sums = get_sums(bid_id);
    let max = max_price(sums);
    for ( let i in max ) {
        let quotient = i;
        let remainder = 0;
        let pair = [];
        for ( let j in offers ) {
            remainder = quotient % offers[j].length;
            quotient = Math.floor(quotient / offers[j].length);
            pair.push(remainder);
        }
        for ( let j in offers ) {
            if ( !offers.hasOwnProperty(j) ) continue;
            let package_id = offers[j][pair[j]][0].package_id;
            save('package_win', {package_id: package_id});
        }
    }
}

/** offers[bidder][package][item] */
function all_offers(bid_id) {
    let offers = [];
    let offer_ids = get('offer', {bid_id: bid_id, stage: 'complement', round: 1, state: 'success'});
    offer_ids.forEach(function(id) {
        let offer_items = [];
        let package_ids = get('package', {offer_id: id.id});
        package_ids.forEach(function(id) {
            offer_items.push(get('package_item', {package_id: id.id}));
        });
        offers.push(offer_items);
    });
    return offers;
}


/** prices[bidder][package] */
function all_prices(bid_id) {
    let prices = [];
    let offer_ids = get('offer', {bid_id: bid_id, stage: 'complement', round: 1, state: 'success'});
    offer_ids.forEach(function(id) {
        prices.push(get('package', {offer_id: id.id}).map(o=>o.price));
    });
    return prices;
}

/** sums[i][item] */
function get_sums(bid_id) {
    let sums = {};
    let offers = all_offers(bid_id);
    let prices = all_prices(bid_id);
    let total = 1;
    for ( let i in offers ) {
        total *= offers[i].length;
    }

    let items = get('item', {bid_id: bid_id});
    next3: for ( let i = 0; i < total ; i++ ) {
        let quotient = i;
        let remainder = 0;
        let pair = [];
        for ( let j in offers ) {
            remainder = quotient % offers[j].length;
            quotient = Math.floor(quotient / offers[j].length);
            pair.push(remainder);
        }
        sums[i] = {price: 0};
        for ( let j in offers ) {
            if ( !offers.hasOwnProperty(j) ) continue;
            for ( let item of offers[j][pair[j]] ) {
                sums[i][item.item_id] = sums[i][item.item_id] || 0;
                sums[i][item.item_id] += item.quantity;
                if ( sums[i][item.item_id] > items.sieve({id: item.item_id})[0].quantity ) {
                    delete sums[i];
                    continue next3;
                }
            }
            sums[i].price += prices[j][pair[j]];
        }
    }
    return sums;
}

function max_price(sums) {
    let max = 0;
    for ( let i in sums ) {
        max = max > sums[i].price ? max : sums[i].price;
    }
    let result = {};
    for ( let i in sums ) {
        if ( sums[i].price == max ) {
            result[i] = sums[i];
        }
    }
    return result;
}

function max_price_just(sums) {
    let sum_just = {...sums};
    next2: for ( let i in sum_just ) {
        for ( let item of items ) {
            if ( sum_just[i][item.item_id] != item.quantity ) {
                delete sum_just[i];
                continue next2;
            }
        }
    }
    return max_price(sum_just);
}

function update_package_item(package, package_items, item) {
    let items = [...package_items];
    let item_r = items.sieve({package_id: package.id, item_id: item.item_id})[0];
    if ( !item_r ) {
        item_r = {...item, package_id: package.id};
        items.push(item_r);
    }
    item_r.quantity = item.quantity;
    return items;
}
test("In mechanism.js - update_package_item - 1",
    update_package_item({id:2, price:5},
        [{package_id:1, item_id:1, quantity:4}, {package_id:1, item_id:2, quantity:8},
         {package_id:2, item_id:5, quantity:8}, {package_id:2, item_id:2, quantity:4},
         {package_id:3, item_id:3, quantity:4}, {package_id:3, item_id:1, quantity:5}
        ],
        {item_id:5, quantity:9}
    ),
    [{package_id:1, item_id:1, quantity:4}, {package_id:1, item_id:2, quantity:8},
     {package_id:2, item_id:5, quantity:9}, {package_id:2, item_id:2, quantity:4},
     {package_id:3, item_id:3, quantity:4}, {package_id:3, item_id:1, quantity:5}
    ],
    3
);
test("In mechanism.js - update_package_item - 2",
    update_package_item({id:2, price:5},
        [{package_id:1, item_id:1, quantity:4}, {package_id:1, item_id:2, quantity:8},
         {package_id:2, item_id:5, quantity:8}, {package_id:2, item_id:2, quantity:4},
         {package_id:3, item_id:3, quantity:4}, {package_id:3, item_id:1, quantity:5}
        ],
        {item_id:3, quantity:9}
    ),
    [{package_id:1, item_id:1, quantity:4}, {package_id:1, item_id:2, quantity:8},
     {package_id:2, item_id:5, quantity:8}, {package_id:2, item_id:2, quantity:4},
     {package_id:3, item_id:3, quantity:4}, {package_id:3, item_id:1, quantity:5},
     {package_id:2, item_id:3, quantity:9},
    ],
    3
);

function update_package(packages, package_items_r, package, items) {
    let packages_r = [...packages];
    let package_items = [...package_items_r].sieve({package_id: package.id});
    let key = _gen_item_key(package_items, items);
    let select_package;
    for ( let package_r of packages_r) {
        let items_r = package_items_r.sieve({package_id: package_r.id});
        if (_gen_item_key(items_r, items) != key) continue;
        select_package = package_r;
        break;
    }
    if (!select_package) {
        select_package = {...package};
        packages_r.push(select_package);
    }
    select_package.price = package.price;
    return packages_r;
}
test("In mechanism.js - update_package",
    update_package([{id:1, price:8}, {id:2, price:7}],
        [{package_id:1, item_id:1, quantity:4}, {package_id:1, item_id:2, quantity:5},
         {package_id:2, item_id:1, quantity:8}, {package_id:2, item_id:2, quantity:4},
         {package_id:3, item_id:1, quantity:8}, {package_id:3, item_id:2, quantity:4}
        ],
        {id:3, price:9},
        [{id:1}, {id:2}]
    ),
    [{id:1, price:8}, {id:2, price:9}],
    3
)