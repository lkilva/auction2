function move(from, to) {
    from.classList.remove("active");
    to.classList.add("active");
    return to;
}

let bid_name = document.querySelector("#bid_name");
let add_bid = document.querySelector("#add_bid");
let info_add_bid = document.querySelector("#info_add_bid");

let data = {};
let bid = {};
let intervals = [];

let here = document.querySelector("#home");
let page = "#home";

titles = {
    addBid: "新增標案",
    setBid: "設定標案",
    hostBid: "主持標案",
    joinBid: "參加標案",
    viewBid: "觀看標案"
}

function title(name, homeButton) {
    let h1 = document.querySelector("#title");
    h1.textContent = name;
    if ( homeButton ) h1.appendChild(gotoHome());
}

function gotoHome() {
    let button = document.createElement("button");
    button.textContent = "回到首頁";
    button.addEventListener("click", function() {
        let home = document.querySelector("#home");
        title("首頁");
        empty(here);
        empty(gate);
        data = {};
        select = {};
        subtitle.textContent = "";
        here = move(here, home);
        let spans = document.getElementsByClassName("activity");
        for ( let span of spans ) {
            span.hidden = true;
        }
        let span2 = document.querySelector(".band_type");
        span2.hidden = true;
        document.querySelector(".joinBid").hidden = true;
        info_round.textContent = "";
        page = "#home";
        hide_offer();
        band_item = [];
        cap_item = [];
        offer_item = [];
        intervals.forEach( tick => {clearInterval(tick); intervals = []});
    })
    return button;
}

let gotoAddBid = document.querySelector(".changePage[value='addBid']");
let addBid = document.querySelector("#addBid");
gotoAddBid.addEventListener("click", function() {
    title("新增標案", true);
    here = move(here, addBid);
    data[here.id] = {};
    empty(here);
    page = "#" + this.value;
});

let gotoGate = document.querySelectorAll(".changePage:not([value='addBid'])");
let gate = document.querySelector("#gate");
for ( let button of gotoGate ) {
    button.addEventListener("click", function() {
        title(titles[button.value], true);
        if ( button.value == 'joinBid' ) {
            document.querySelector(".joinBid").hidden = false;
        }
        here = move(here, gate);
        update_select("select_bid", "bid");
        page = "#" + button.value;
    });
}

function get_stage(bid_id) {
    let stage = get('stage', {bid_id: bid_id})[0];
    if ( stage ) stage = stage.stage;
    if (!stage) {
        stage = 'quantity';
        save('stage', {bid_id: bid_id, stage: stage});
    }
    return stage;
}

let info_gate = document.querySelector("#info_gate");
let subtitle = document.querySelector("#subtitle");
let info_round = document.querySelector("#info_round");
let enterMain = document.querySelector("#enterMain");
enterMain.addEventListener("click", function() {
    if ( page != "#joinBid" && !select.bid_id ) {
        info_gate.textContent = "請選擇標案。"
        return
    } else if ( page == "#joinBid" && !(select.bid_id && select.bidder_id) ) {
        info_gate.textContent = "請選擇標案及競標者。"
        return
    }
    subtitle.textContent = "標案「" + get('bid', {id: select.bid_id})[0].name + "」";
    if ( page == "#joinBid") {
        subtitle.textContent += " - 競標者「" + get('bidder', {id: select.bidder_id})[0].name + "」";
    }
    here = move(here, document.querySelector(page));
    data[here.id] = {};
    empty(here);
    if ( page == "#setBid" ) {
        config_success();
        flush_item_list(item_list);
        update_select('cap_item_item', 'item', select.bid_id);
        update_select('band_item_item', 'item', select.bid_id);
        flush_cap_list(cap_list);
        flush_band_list(band_list);
        flush_bidder_list(bidder_list);
    }
    if ( page == '#hostBid' ) {
        select.stage = get_stage(select.bid_id);
        flush_round_info(info_round, select.bid_id, select.stage);
        let tick = setInterval(function() {
            select.stage = get_stage(select.bid_id);
            flush_round_info(info_round, select.bid_id, select.stage);
        }, 5000);
        intervals.push(tick);
        flush_round_list(round_list, select.bid_id, select.stage);
    }
    if ( page == '#joinBid') {
        update_select('offer_item_item', 'item', select.bid_id);
        update_select('package_item_item', 'item', select.bid_id);
        select.stage = get_stage(select.bid_id);
        flush_round_info(info_round, select.bid_id, select.stage);
        if ( select.stage == 'quantity' ) flush_offer_win_list(offer_win_list);
        if ( select.stage == 'complement' ) flush_package_win_list(offer_win_list);
        if ( check_in_round(select.bid_id, select.stage) ) {
            open_bid();
        } else {
            hide_offer();
        }
        offer_item_list.innerHTML = "";
        let tick = setInterval(function() {
            select.stage = get_stage(select.bid_id);
            flush_round_info(info_round, select.bid_id, select.stage);
            if ( select.stage == 'quantity' ) flush_offer_win_list(offer_win_list);
            if ( select.stage == 'complement' ) flush_package_win_list(offer_win_list);
            if ( check_in_round(select.bid_id, select.stage) ) {
                open_bid();
            } else {
                hide_offer();
            }
        }, 5000);
        intervals.push(tick);
    }
    if ( page == '#hostBid' || page == '#joinBid' ) {
        let mechanism = config().mechanism;
        let compute_offer_win = get_offer_win[mechanism];
        let [before, _] = round_info(select.bid_id, select.stage);
        if ( before && before.end && Date.now() > before.end ) {
            let tick = setTimeout(function() {
                compute_offer_win(select.bid_id, before.round);
            }, before.end - Date.now() + Math.ceil(Math.random*1000) );
        }
    }
        
    info_gate.textContent = "";
});

function open_bid() {
    let [now, _] = round_info(select.bid_id, select.stage);
    let this_round = {bid_id: select.bid_id, bidder_id: select.bidder_id,
        stage: select.stage, round: now.round};
    let offer = get('offer', {...this_round, state:'success'})[0];
    offer_list.innerHTML = "";
    if ( offer ) {
        if ( select.stage == 'quantity' ) {
            flush_offer_item_list(offer_list, get('offer_item', {offer_id: offer.id}));
        }
        if ( select.stage == 'complement' ) flush_offer_package_list2(offer_list);
    }
    show_offer(select.stage);
}

function show_offer(stage) {
    let divs = document.getElementsByClassName("offer " + stage);
    for ( let div of divs ) {
        div.hidden = false;
    }
}

function hide_offer() {
    let divs = document.getElementsByClassName("offer");
    for ( let div of divs ) {
        div.hidden = true;
    }
}

bid_name.addEventListener("input", function() {
    data.addBid.bid = data.addBid.bid || {};
    data.addBid.bid.name = this.value;
});

add_bid.addEventListener("click", function() {
    data.addBid.bid = data.addBid.bid || {};
    let bid = data.addBid.bid;
    if ( hasblank(bid, ['name']) ) {
        info_add_bid.textContent = "請不要留空。"
        return;
    }
    let result = save('bid', bid);
    bid_name.value = "";
    data.addBid.bid = {};
    if ( result.result == 'success' ) {
        info_add_bid.textContent = "新增標案「" + result.data.name + "」成功。"
    } else {
        info_add_bid.textContent = "可能有重複值，請重新輸入。"
    }
});

let setBid = document.querySelector("#setBid");

let select = {};
let selectBid = document.querySelector("#select_bid");
selectBid.addEventListener("input", function() {
    select.bid_id = this.value;
    if ( page == "#joinBid") {
        update_select("select_bidder", "bidder", select.bid_id);
    }
});
let selectBidder = document.querySelector("#select_bidder");
selectBidder.addEventListener("click", function() {
    select.bidder_id = this.value;
});

let config_mechanism = document.querySelector("#config_mechanism");
config_mechanism.addEventListener("input", function() {
    data.setBid.config = data.setBid.config || {};
    data.setBid.config.mechanism = this.value;
});
let config_activity = document.querySelector("#config_activity");
config_activity.addEventListener("input", function() {
    data.setBid.config = data.setBid.config || {};
    if ( this.checked ) {
        data.setBid.config.activity = this.value;
    } else {
        delete data.setBid.config.activity;
    }
});
config_activity.addEventListener("input", function() {
    let spans = document.getElementsByClassName("activity");
    if ( this.checked ) {
        for ( let span of spans ) {
            span.hidden = false;
        }
    } else {
        for ( let span of spans ) {
            span.hidden = true;
            empty(span);
        }
    }
});
let config_preference = document.querySelector("#config_preference");
config_preference.addEventListener("input", function() {
    data.setBid.config = data.setBid.config || {};
    if ( this.checked ) {
        data.setBid.config.preference = this.value;
    } else {
        delete data.setBid.config.preference;
    }
});
let quote_type = document.querySelector("#quote_type");
quote_type.addEventListener("input", function() {
    data.setBid.quote = data.setBid.quote || {};
    data.setBid.quote.type = this.value;
});
let quote_unit = document.querySelector("#quote_unit");
quote_unit.addEventListener("input", function() {
    data.setBid.quote = data.setBid.quote || {};
    data.setBid.quote.unit = parseInt(this.value);
});
let quote_raise = document.querySelector("#quote_raise");
quote_raise.addEventListener("input", function() {
    data.setBid.quote = data.setBid.quote || {};
    data.setBid.quote.raise = parseInt(this.value);
});

let info_add_config = document.querySelector("#info_add_config");
let add_config = document.querySelector("#add_config");
add_config.addEventListener("click", function() {
    data.setBid.config = data.setBid.config || {};
    data.setBid.quote = data.setBid.quote || {};
    let config = data.setBid.config;
    let quote = data.setBid.quote;
    if ( config_activity.disabled == true ) {
        info_add_config.textContent = "已設定，不可更動。"
        return;
    }
    if ( hasblank(config, ['mechanism']) ||
        hasblank(quote, ["type", "unit", "raise"]) ) {
        info_add_config.textContent = "請不要留空。";
        return;
    }
    let result1 = save('config', {bid_id: select.bid_id, ...config});
    let result2 = save('quote', {bid_id: select.bid_id, ...quote});
    if ( result1.result == 'success' && result2.result == 'success' ) {
        info_add_config.textContent = "標案設定成功。"
        config_success();
    } else {
        info_add_config.textContent = "不可能，程式有錯。"
    }
});

function config_success() {
    let conf = config();
    let quote = config('quote');
    if ( config && quote ) {
        config_mechanism.value = conf.mechanism;
        config_mechanism.disabled = true;
        config_activity.checked = conf.activity == 'activity';
        if ( config_activity.checked ) {
            let spans = document.getElementsByClassName("activity");
            for ( let span of spans ) {
                span.hidden = false;
            }
            config_preference.value = conf.preference == 'preference';
            config_preference.disabled = true;
        }
        config_activity.disabled = true;
        quote_type.value = quote.type;
        quote_type.disabled = true;
        quote_unit.value = quote.unit;
        quote_unit.disabled = true;
        quote_raise.value = quote.raise;
        quote_raise.disabled = true;
    }
}

let item_name = document.querySelector("#item_name");
item_name.addEventListener("input", function() {
    data.setBid.item = data.setBid.item || {};
    data.setBid.item.name = this.value;
});
let item_quantity = document.querySelector("#item_quantity");
item_quantity.addEventListener("input", function() {
    data.setBid.item = data.setBid.item || {};
    data.setBid.item.quantity = parseInt(this.value);
});
let item_reserve = document.querySelector("#item_reserve");
item_reserve.addEventListener("input", function() {
    data.setBid.item = data.setBid.item || {};
    data.setBid.item.reserve = parseInt(this.value);
});
let item_weight = document.querySelector("#item_weight");
item_weight.addEventListener("input", function() {
    data.setBid.item = data.setBid.item || {};
    data.setBid.item.weight = parseInt(this.value);
});

let item_list = document.querySelector("#item_list");
let add_item = document.querySelector("#add_item");
add_item.addEventListener("click", function() {
    data.setBid.item = data.setBid.item || {};
    let item = data.setBid.item;
    let fields = ['name', 'quantity', 'reserve'];
    if ( config_activity.checked ) fields.push('weight');
    if ( hasblank(item, fields) ) {
        info_add_item.textContent = "請不要留空。";
        return;
    }
    let result = save('item', {bid_id: select.bid_id, ...item});
    if ( result.result == 'success' ) {
        flush_item_list(item_list);
        update_select('cap_item_item', 'item', select.bid_id);
        update_select('band_item_item', 'item', select.bid_id);
    } else {
        info_add_item.textContent = "可能名稱重複，請重新輸入。"
    }
    item_name.value = "";
    item_quantity.value = "";
    item_reserve.value = "";
    item_weight.value = "";
    data.setBid.item = {};
});

function flush_item_list(table) {
    let row = {名稱:"name", 數量:"quantity", 底價:"reserve"};
    if ( config_activity.checked ) {
        row["資格點數權重"] = "weight";
    }
    flush_list(table, {
        name: "標的清單",
        type:"item",
        row: row
    }, select.bid_id)
}

let cap_item_item = document.querySelector("#cap_item_item");
cap_item_item.addEventListener("input", function() {
    data.setBid.cap_item = data.setBid.cap_item || {};
    data.setBid.cap_item.item_id = this.value;
});
let cap_item_weight = document.querySelector("#cap_item_weight");
cap_item_weight.addEventListener("input", function() {
    data.setBid.cap_item = data.setBid.cap_item || {};
    data.setBid.cap_item.weight = parseInt(this.value);
});
let cap_item = []
let info_add_cap = document.querySelector("#info_add_cap");
let cap_list = document.querySelector("#cap_list");
let add_cap_item = document.querySelector("#add_cap_item");
add_cap_item.addEventListener("click", function() {
    data.setBid.cap_item = data.setBid.cap_item || {};
    let item_id = data.setBid.cap_item.item_id;
    if ( hasblank(data.setBid.cap_item, ['item_id', 'weight']) ) {
        info_add_cap.textContent = "請不要留空。";
        return;
    }
    let existed_item = cap_item.sieve({item_id: item_id})[0];
    if ( existed_item ) {
        existed_item.weight = data.setBid.cap_item.weight;
    } else {
        cap_item.push({...data.setBid.cap_item});
    }
    cap_item_item.value = "";
    cap_item_weight.value = "";
    data.setBid.cap_item = {};
    info_add_cap.textContent = "";
    flush_cap_list(cap_list);
});

let cap_cap = document.querySelector("#cap_cap");
cap_cap.addEventListener("input", function () {
    data.setBid.cap = data.setBid.cap || {};
    data.setBid.cap.cap = parseInt(this.value);
})
let add_cap = document.querySelector("#add_cap");
add_cap.addEventListener("click", function() {
    data.setBid.cap = data.setBid.cap || {};
    let cap = data.setBid.cap;
    let result = save('cap', {bid_id: select.bid_id, ...cap});
    if ( result.result == 'success' ) {
        let cap_id = result.data.id;
        cap_item.forEach( function(item) {
            save('cap_item', {bid_id: select.bid_id, cap_id: cap_id, ...item});
        })
        cap_item = [];
        cap_cap.value = "";
        data.setBid.cap = {};
        flush_cap_list(cap_list);
    } else {
        info_add_cap.textContent = "不可能，程式可能有錯。"
    }
})

function flush_cap_list(table) {
    flush_list(table, {
        name: "上限列表",
        type: "cap",
        row: {上限:"cap"},
        subrow: {標的:"item_id", 權重:"weight"}
    }, select.bid_id, cap_item)
}

let band_item_item = document.querySelector("#band_item_item");
band_item_item.addEventListener("input", function() {
    data.setBid.band_item = data.setBid.band_item || {};
    data.setBid.band_item.item_id = this.value;
});
let band_item_weight = document.querySelector("#band_item_weight");
band_item_weight.addEventListener("input", function() {
    data.setBid.band_item = data.setBid.band_item || {};
    data.setBid.band_item.weight = parseInt(this.value);
});
let band_item = []
let band_list = document.querySelector("#band_list");
let info_add_band = document.querySelector("#info_add_band");
let add_band_item = document.querySelector("#add_band_item");
add_band_item.addEventListener("click", function() {
    data.setBid.band_item = data.setBid.band_item || {};
    let item_id = data.setBid.band_item.item_id;
    if ( hasblank(data.setBid.band_item, ['item_id', 'weight']) ) {
        info_add_band.textContent = "請不要留空。";
        return;
    }
    let existed_item = band_item.sieve({item_id: item_id})[0];
    if ( existed_item ) {
        existed_item.weight = data.setBid.band_item.weight;
    } else {
        band_item.push({...data.setBid.band_item});
    }
    band_item_item.value = "";
    band_item_weight.value = "";
    data.setBid.band_item = {};
    info_add_band.textContent = "";
    flush_band_list(band_list);
})

let band_name = document.querySelector("#band_name");
band_name.addEventListener("input", function () {
    data.setBid.band = data.setBid.band || {};
    data.setBid.band.name = this.value;
})
let band_type = document.querySelector("#band_type");
band_type.addEventListener("input", function () {
    data.setBid.band = data.setBid.band || {};
    data.setBid.band.type = this.value;
    if ( this.value == 'FDD') {
        let span = document.querySelector(".band_type");
        span.hidden = false;
    } else {
        let span = document.querySelector(".band_type");
        span.hidden = true;
        empty(span);
    }
})
let band_start = document.querySelector("#band_start");
band_start.addEventListener("input", function () {
    data.setBid.band = data.setBid.band || {};
    data.setBid.band.start = parseInt(this.value);
})
let band_width = document.querySelector("#band_width");
band_width.addEventListener("input", function () {
    data.setBid.band = data.setBid.band || {};
    data.setBid.band.width = parseInt(this.value);
})
let band_spacing = document.querySelector("#band_spacing");
band_spacing.addEventListener("input", function () {
    data.setBid.band = data.setBid.band || {};
    data.setBid.band.spacing = parseInt(this.value);
})
let add_band = document.querySelector("#add_band");
add_band.addEventListener("click", function() {
    data.setBid.band = data.setBid.band || {};
    let band = data.setBid.band;
    if ( band_item.length == 0 ) {
        info_add_band.textContent = "請至少加入一個標的";
        return;
    }
    let fields = ['name', 'type', 'start', 'width'];
    if ( band_type == 'FDD' ) fields.push('spacing');
    if ( hasblank(data.setBid.band, fields)) {
        info_add_band.textContent = "請不要留空";
        return;
    }
    let result = save('band', {bid_id: select.bid_id, ...band});
    if ( result.result == 'success' ) {
        let band_id = result.data.id;
        band_item.forEach( function(item) {
            save('band_item', {bid_id: select.bid_id, band_id: band_id, ...item});
        })
        band_item = [];
        flush_band_list(band_list);
        band_name.value = "";
        band_type.value = "";
        band_start.value = "";
        band_width.value = "";
        band_spacing.value = "";
        data.setBid.band = {};
    } else {
        info_add_band.textContent = "不可能，程式可能有錯。"
    }
})

function flush_band_list(table) {
    flush_list(table, {
        name: "頻段清單",
        type: "band",
        row: {名稱:"name", 雙工類型:"type", 開始頻率:"start", 頻寬:"width", 雙工間隔:"spacing"},
        subrow: {標的:"item_id", 權重:"weight"}
    }, select.bid_id, band_item)
}

let bidder_name = document.querySelector("#bidder_name");
bidder_name.addEventListener("input", function () {
    data.setBid.bidder = data.setBid.bidder || {};
    data.setBid.bidder.name = this.value;
})
let bidder_point = document.querySelector("#bidder_point");
bidder_point.addEventListener("input", function () {
    data.setBid.bidder = data.setBid.bidder || {};
    data.setBid.bidder.point = parseInt(this.value);
})

let info_add_bidder = document.querySelector("#info_add_bidder");
let bidder_list = document.querySelector("#bidder_list");
let add_bidder = document.querySelector("#add_bidder");
add_bidder.addEventListener("click", function() {
    data.setBid.bidder = data.setBid.bidder || {};
    let bidder = data.setBid.bidder;
    let fields = ['name'];
    if ( config_activity.checked ) fields.push('point');
    if ( hasblank(bidder, fields) ) {
        info_add_bidder.textContent = "請不要留空。";
        return;
    }
    let result = save('bidder', {bid_id: select.bid_id, ...bidder});
    if ( result.result == 'success' ) {
        flush_bidder_list(bidder_list);
    } else {
        info_add_bidder.textContent = "可能名稱重複，請重新輸入。"
    }
    bidder_name.value = "";
    bidder_point.value = "";
    data.setBid.bidder = {};
});

function flush_bidder_list(table) {
    let row = {名稱:"name"};
    if ( config_activity.checked ) {
        row["資格點數"] = "point";
    }
    flush_list(table, {
        name: "競標者清單",
        type: "bidder",
        row: row
    }, select.bid_id)
}

/**
 * set_initial_price_and_excess(select.bid_id);
 * set_initial_point(select.bid_id);
*/

let round_list = document.querySelector("#round_list");
let info_add_round = document.querySelector("#info_add_round");

let start_now = document.querySelector("#start_now");
start_now.addEventListener("click", function() {
    let bid_id = select.bid_id;
    let stage = select.stage;
    let [right_before, right_after] = round_info(bid_id, stage);
    if ( check_in_round(bid_id, stage) ) {
        alert("競標時間內不得手動開始回合。");
        return;
    }
    if ( right_after ) {
        if ( confirm("請確定手動開始回合會刪除之後的回合。") == false ) {
            return;
        }
        let rounds = get("round", {bid_id: bid_id, stage: stage});
        rounds = rounds.filter(fields => fields.start > Date.now());
        rounds.forEach(function(round) {
            remove('round', round.id);
        })
    }
    let round_now = right_before ? right_before.round + 1 : 1;
    if ( round_now == 1 ) {
        init_round_info(bid_id);
    }
    save('round', {
        bid_id: bid_id,
        stage: stage,
        round: round_now,
        start: Date.now()
    });
    flush_round_info(info_round, bid_id, stage);
    flush_round_list(round_list, bid_id, stage);
});

let end_now = document.querySelector("#end_now");
end_now.addEventListener("click", function() {
    let bid_id = select.bid_id;
    let stage = select.stage;
    let [right_before, right_after] = round_info(bid_id, stage);
    if ( !check_in_round(bid_id, stage) ) {
        alert("休息時間內不得手動結束回合。");
        return;
    }
    if ( right_after ) {
        if ( confirm("請確定手動結束回合會刪除之後的回合。") == false ) {
            return;
        }
        let rounds = get("round", {bid_id: bid_id, stage: stage});
        rounds = rounds.filter(fields => fields.start > Date.now());
        rounds.forEach(function(round) {
            remove('round', round.id);
        })
    }
    update('round', {...right_before, end: Date.now()}, right_before.id);
    let mechanism = config().mechanism;
    let compute_offer_win = get_offer_win[mechanism];
    if (select.stage == 'quantity' ) compute_offer_win(select.bid_id, right_before.round);
    if (select.stage == 'complement' ) compute_package_win(select.bid_id);
    flush_round_info(info_round, bid_id, stage);
    flush_round_list(round_list, bid_id, stage);
});

let round_start = document.querySelector("#round_start");
round_start.addEventListener("input", function () {
    data.hostBid.round = data.hostBid.round || {};
    data.hostBid.round.start = this.value;
});
let round_times = document.querySelector("#round_times");
round_times.addEventListener("input", function () {
    data.hostBid.round = data.hostBid.round || {};
    data.hostBid.round.times = parseInt(this.value);
});
let round_bidtime = document.querySelector("#round_bidtime");
round_bidtime.addEventListener("input", function () {
    data.hostBid.round = data.hostBid.round || {};
    data.hostBid.round.bidtime = parseInt(this.value);
});
let round_resttime = document.querySelector("#round_resttime");
round_resttime.addEventListener("input", function () {
    data.hostBid.round = data.hostBid.round || {};
    data.hostBid.round.resttime = parseInt(this.value);
});
let add_round = document.querySelector("#add_round");
add_round.addEventListener("click", function() {
    let bid_id = select.bid_id;
    let stage = select.stage;
    let rounds = get('round', {bid_id: bid_id, stage: stage})
    data.hostBid.round = data.hostBid.round || {};
    let round = data.hostBid.round;
    if ( hasblank(round, ['start', 'times', 'bidtime', 'resttime']) ) {
        info_add_round.textContent = "請不要留空。";
        return;
    }
    if ( rounds.at(-1) && !rounds.at(-1).end ) {
        alert("本回合之結束時間未定，請先結束本回合。");
        return;
    }
    let start = (new Date(round.start)).getTime();
    if ( rounds.at(-1) && start < rounds.at(-1).end ) {
        alert("開始時間請不要早於最後回合的結束時間。");
        return;
    }
    let round_last = rounds.at(-1) ? rounds.at(-1).round : 0;
    if ( round_last == 0 ) {
        init_round_info(bid_id);
    }
    for ( let i = round_last + 1; i <= round_last + round.times; i++ ) {
        save('round', {
            bid_id: bid_id,
            stage: stage,
            round: i,
            start: start,
            end: start + round.bidtime * 60000
        });
        start = start + round.bidtime * 60000 + round.resttime * 60000;
    }
    flush_round_info(info_round, bid_id, stage);
    flush_round_list(round_list, bid_id, stage);
});

function init_round_info(bid_id) {
    let items = get('item', {bid_id: bid_id});
    let quote = config('quote');
    let unit = quote.unit;
    let raise = quote.raise;
    items.forEach(function(item) {
        let first_round = {bid_id: bid_id, item_id: item.id, stage: "quantity", round: 1};
        let clock_price = Math.ceil(item.reserve*(1+raise/100)/unit)*unit;
        save('info', {...first_round, key: "base_price", value: item.reserve});
        save('info', {...first_round, key: "clock_price", value: clock_price});
    })
}

let offer_item = [];
let offer_item_item = document.querySelector("#offer_item_item");
offer_item_item.addEventListener("input", function() {
    data.joinBid.offer_item = data.joinBid.offer_item || {};
    data.joinBid.offer_item.item_id = this.value;
    let item = get('item', {id: this.value})[0];
    let list = Array.from({length:item.quantity}, (_,i) => i+1);
    add_option('offer_item_quantity', list);
    let [right_before, _] = round_info(select.bid_id, select.stage);
    let round = right_before.round;
    let round_now = {bid_id: select.bid_id, stage: select.stage, round: round};
    let clock = get('info', {...round_now, item_id: item.id, key: "clock_price"})[0].value;
    let prices = [clock];
    let mechanism = config().mechanism;
    if ( mechanism == 'CA' ) {
        let base = get('info', {...round_now, key: 'base_price'})[0].value;
        let unit = config('quote').unit;
        prices = [];
        while ( base <= clock ) {
            prices.push(base);
            base += unit;
        }
    }
    add_option('offer_item_price', prices);
});
let offer_item_quantity = document.querySelector("#offer_item_quantity");
offer_item_quantity.addEventListener("input", function() {
    data.joinBid.offer_item = data.joinBid.offer_item || {};
    data.joinBid.offer_item.quantity = parseInt(this.value);
});
let offer_item_price = document.querySelector("#offer_item_price");
offer_item_price.addEventListener("input", function() {
    data.joinBid.offer_item = data.joinBid.offer_item || {};
    data.joinBid.offer_item.price = parseInt(this.value);
});

let offer_item_list = document.querySelector("#offer_item_list");
let info_add_offer = document.querySelector("#info_add_offer");
let add_offer_item = document.querySelector("#add_offer_item");
add_offer_item.addEventListener("click", function() {
    data.joinBid.offer_item = data.joinBid.offer_item || {};
    let item_id = data.joinBid.offer_item.item_id;
    if ( hasblank(data.joinBid.offer_item, ['item_id', 'quantity', 'price']) ) {
        info_add_offer.textContent = "請不要留空。";
        return;
    }
    let existed_item = offer_item.sieve({item_id: item_id})[0];
    if ( existed_item ) {
        existed_item.quantity = data.joinBid.offer_item.quantity;
        existed_item.price = data.joinBid.offer_item.price;
    } else {
        offer_item.push({...data.joinBid.offer_item});
    }
    offer_item_item.value = "";
    offer_item_quantity.value = "";
    offer_item_price.value = "";
    data.joinBid.offer_item = {};
    info_add_offer.textContent = "";
    flush_offer_item_list(offer_item_list, offer_item);
});

function flush_offer_item_list(table, offer_item) {
    flush_list(table, {
        name: "投標清單",
        row: {},
        subrow: {標的: "item_id", 數量: "quantity", 金額: "price"}
    }, select.bid_id, offer_item)
}

let offer_list = document.querySelector("#offer_list");
let add_offer = document.querySelector("#add_offer");
add_offer.addEventListener("click", function() {
    if ( select.stage != 'quantity' ) return;
    let [now, _] = round_info(select.bid_id, select.stage);
    let this_round = {bid_id: select.bid_id, bidder_id: select.bidder_id,
        stage: select.stage, round: now.round};
    if ( get('offer', {...this_round, state:'success'}).length > 0 ) {
        alert("本回合已投標過。")
        return;
    }
    let mechanism = config().mechanism;
    if ( mechanism == 'SMRA' && now.round > 1) {
        let pre_offer = get('offer', {bid_id: select.bid_id, bidder_id: select.bidder_id,
            stage: select.stage, round: now.round-1, state: 'success'})[0];
        let pre_wins = get('offer_win', {offer_id: pre_offer.id});
        for ( let item of offer_item ) {
            let pre_win = pre_wins.sieve({item_id: item.item_id})[0];
            if ( item.quantity < pre_win.quantity ) {
                alert("投標數量不可低於得標數量。");
                return;
            }
            if ( item.quantity == pre_win.quantity && item.price == pre_win.price ) {
                alert("相同數量與金額不可重複投標。");
                return;
            }
        }
    }
    if ( !check_cap(offer_item) ) {
        alert("逾頻寬上限。");
        return;
    }
    let activity = config().activity;
    if ( activity && !check_point(offer_item) ) {
        alert("不符合資格點數。");
        return;
    }
    let result = save('offer', {...this_round, time: Date.now(), state: 'success'});
    if ( result.result == 'success' ) {
        let offer_id = result.data.id;
        offer_item.forEach( function(item) {
            item.random = generateRan();
            item.state = 'new'
            save('offer_item', {offer_id: offer_id, ...item});
        })
        if ( activity ) {
            save('point', {offer_id: offer_id, ...point_o});
        }
        offer_item = [];
        flush_offer_item_list(offer_item_list, offer_item);
        flush_offer_item_list(offer_list, get('offer_item', {offer_id: offer_id}));
    }
});

function check_cap(offer_item) {
    let caps = get('cap', {bid_id: select.bid_id})
    for ( let cap of caps ) {
        let sum = 0;
        let cap_items = get('cap_item', {cap_id: cap.id});
        cap_items.forEach(function(cap_item) {
            let item = offer_item.sieve({item_id: cap_item.item_id})[0];
            if ( item ) {
                let quantity = item.quantity;
                let weight = cap_item.weight;
                sum += quantity * weight;
            }
        })
        if ( sum > cap.cap ) return false;
    }
    return true;
}

let point_o;
function check_point(offer_item) {
    let bid_id = select.bid_id;
    let bidder_id = select.bidder_id;
    let stage = select.stage;
    let point = compute_point(offer_item);
    let [now, _] = round_info(bid_id, stage);
    let point_last;
    if ( now.round == 1 ) {
        point_last = get('bidder', {id: bidder_id})[0].point;
    } else {
        let offer_id = get('offer', {bid_id: bid_id, bidder_id: bidder_id,
            stage: 'quantity', round: now.round-1, state:'success'})[0].id;
        point_last = get('point', {offer_id: offer_id})[0].point;
    }
    let preference = config().preference;
    if ( point < point_last ) {
        point_o = {point: point, reduce: true};
        return true;
    } else if ( point == point_last ) {
        point_o = {point: point};
        return true;
    } else if ( preference && check_preference(offer_item) ) {
        point_o = {point: point_last};
        return true;
    }
    return false;
}

function compute_point(offer_item) {
    let bid_id = select.bid_id;
    let items = get('item', {bid_id: bid_id});
    let point = 0;
    for ( let offer of offer_item ) {
        let item = items.sieve({id: offer.item_id})[0];
        point += item.weight * offer.quantity;
    }
    return point;
}

function check_preference(offer_item) {
    let bid_id = select.bid_id;
    let bidder_id = select.bidder_id;
    let stage = select.stage;
    let point = compute_point(offer_item);
    let offers = get('offer', {bid_id: bid_id, bidder_id: bidder_id,
        stage: 'quantity', state:'success'});
    let [now, _] = round_info(bid_id, stage);
    let clock = get('info', {bid_id: bid_id, stage: 'quantity',
        round: now.round, key: 'clock_price'});
    let checks = [];
    for ( let offer of offers ) {
        let point_old = get('point', {offer_id: offer.id})[0];
        if ( point_old.reduce ) {
            checks.push(point_old);
        }
    }
    if ( checks.length == 0 ) return false;
    for ( let check of checks ) {
        if ( point > check.point ) {
            let round = get('offer', {id: check.offer_id})[0].round;
            let offers_last = get('offer_win', {offer_id: check.offer_id});
            let clock_last = get('info', {bid_id: bid_id, stage: 'quantity',
                round: round, key:'clock_price'});
            let left = product_sum(offer_item, clock) - product_sum(offer_item, clock_last);
            let right = product_sum(offers_last, clock) - product_sum(offers_last, clock_last);
            if ( left > right ) return false;
        }
    }
    return true;
}

function product_sum(quantities, prices) {
    let sum = 0;
    for ( let item of quantities ) {
        let quantity = item.quantity;
        let price = prices.sieve({item_id: item.item_id})[0].value;
        sum += quantity * price;
    }
    return sum;

}

let offer_win_list = document.querySelector("#offer_win_list");

function flush_offer_win_list(table) {
    let [now, _] = round_info(select.bid_id, select.stage);
    if ( !now ) return;
    let round = now.round;
    if ( check_in_round(select.bid_id, select.stage) ) {
        round = now.round - 1;
    }
    let offers = [];
    offer_ids = get('offer', {bid_id: select.bid_id, bidder_id: select.bidder_id,
        stage: select.stage, round: round, state: 'success'});
    offer_ids.forEach(function(id) {
        offers = offers.concat(get('offer_win', {offer_id: id.id}));
    });
    flush_list(table, {
        name: "得標清單",
        row: {},
        subrow: {標的: "item_id", 數量: "quantity", 金額: "price"}
    }, select.bid_id, offers);
}

let package_item_item = document.querySelector("#package_item_item");
package_item_item.addEventListener("input", function() {
    data.joinBid.package_item = data.joinBid.package_item || {};
    data.joinBid.package_item.item_id = this.value;
    let item = get('item', {id: this.value})[0];
    let list = Array.from({length:item.quantity}, (_,i) => i+1);
    add_option('package_item_quantity', list);
});
let package_item_quantity = document.querySelector("#package_item_quantity");
package_item_quantity.addEventListener("input", function() {
    data.joinBid.package_item = data.joinBid.package_item || {};
    data.joinBid.package_item.quantity = parseInt(this.value);
});
let package_item = [];
let info_add_offer_package = document.querySelector("#info_add_offer_package");
let offer_package_list = document.querySelector("#offer_package_list");
let add_package_item = document.querySelector("#add_package_item");
add_package_item.addEventListener("click", function() {
    data.joinBid.package_item = data.joinBid.package_item || {};
    let item_id = data.joinBid.package_item.item_id;
    if ( hasblank(data.joinBid.package_item, ['item_id', 'quantity']) ) {
        info_add_offer_package.textContent = "請不要留空。";
        return;
    }
    let existed_item = package_item.sieve({item_id: item_id})[0];
    if ( existed_item ) {
        existed_item.quantity = data.joinBid.package_item.quantity;
    } else {
        package_item.push({...data.joinBid.package_item});
    }
    package_item_item.value = "";
    package_item_quantity.value = "";
    data.joinBid.package_item = {};
    info_add_offer_package.textContent = "";
    flush_offer_package_list(offer_package_list);
    let min = highest(select.bid_id, select.bidder_id, package_item, [], []);
    if ( min == 0 ) {
        let items = get('item', {bid_id: select.bid_id});
        package_item.forEach(function(item) {
            let quantity = item.quantity;
            let reserve = items.sieve({id: item.item_id})[0].reserve;
            min += quantity * reserve;
        });
    }
    let max = offer_upper(select.bid_id, select.bidder_id, package_item, package, package_item_r);
    let unit = config('quote').unit;
    let prices = [];
    while ( min <= max ) {
        prices.push(min);
        min += unit;
    }
    add_option('offer_package_price', prices);
});

function flush_offer_package_list(table) {
    flush_list(table, {
        name: "報價清單",
        type: "package",
        data: package,
        subdata: package_item_r,
        row: {金額:"price"},
        subrow: {標的:"item_id", 數量:"quantity"}
    }, select.bid_id, package_item)
}

let package = [];
let package_item_r = [];
let offer_package_price = document.querySelector("#offer_package_price");
offer_package_price.addEventListener("input", function() {
    data.joinBid.offer_package = data.joinBid.offer_package || {};
    data.joinBid.offer_package.price = parseInt(this.value);
})
let add_offer_package = document.querySelector("#add_offer_package");
add_offer_package.addEventListener("click", function() {
    if ( !check_cap(package_item) ) {
        alert("逾頻寬上限。");
        return;
    }
    let activity = config().activity;
    if ( activity && !check_point(package_item) ) {
        alert("不符合資格點數。");
        return;
    }
    let id = generate_id();
    package.push({
        id: id,
        price: data.joinBid.offer_package.price,
        random: generateRan()
    });
    for ( let item of package_item ) {
        item.package_id = id;
        package_item_r.push(item);
    }
    package_item = [];
    data.joinBid.offer_package = {};
    flush_offer_package_list(offer_package_list);
});

add_offer.addEventListener("click", function() {
    if ( select.stage != 'complement' ) return;
    let offer = get('offer', {bid_id: select.bid_id, bidder_id: select.bidder_id, stage: 'complement',
        state: 'success'})[0];
    if ( offer ) {
        alert("只能投標一次。");
        return;
    }
    let result = save('offer', {
        bid_id: select.bid_id,
        bidder_id: select.bidder_id,
        stage: 'complement',
        round: 1,
        time: Date.now(),
        state: 'success'
    });
    for ( let p of package ) {
        save('package', {...p, offer_id: result.data.id});
    }
    for ( let p of package_item_r ) {
        save('package_item', p);
    }
    flush_offer_package_list(offer_package_list);
    flush_offer_package_list2(offer_list);
});

function flush_offer_package_list2(table) {
    let offer = get('offer', {bid_id: select.bid_id, bidder_id: select.bidder_id, stage: 'complement',
        state: 'success'})[0];
    let data = get('package', {offer_id: offer.id});
    let subdata = [];
    for ( let datum of data ) {
        subdata = subdata.concat(get('package_item', {package_id: datum.id}));
    }
    flush_list(table, {
        name: "報價清單",
        type: "package",
        data: data,
        subdata: subdata,
        row: {金額:"price"},
        subrow: {標的:"item_id", 數量:"quantity"}
    }, select.bid_id)
}

function flush_package_win_list(table) {
    let offer = get('offer', {bid_id: select.bid_id, bidder_id: select.bidder_id, stage: 'complement',
        state: 'success'})[0];
    if ( offer ) {
        let package = get('package', {offer_id: offer.id});
        let data = [];
        let subdata = [];
        for ( let datum of package ) {
            if ( get('package_win', {package_id: datum.id})[0] ) {
                subdata = subdata.concat(get('package_item', {package_id: datum.id}));
                data.push(datum);
            }
        }
        flush_list(table, {
            name: "得標清單",
            type: "package",
            data: data,
            subdata: subdata,
            row: {金額:"price"},
            subrow: {標的:"item_id", 數量:"quantity"}
        }, select.bid_id)
    }
}