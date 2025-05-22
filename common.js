function listen(selector, callback, parameters) {
    let elms = document.querySelectorAll(selector);
    elms.forEach(function(elm) {
        if (elm.tagName == 'SELECT') elm.value = "";
        let event = elm.tagName == 'INPUT' ? 'input' : 'click';
        elm.addEventListener(event, function() {
            callback(elm, parameters);
        });
    })
}

function title(page) {
    let titles = {
        home: "首頁",
        addBid: "新增標案",
        setBid: "設定標案",
        hostBid: "主持標案",
        joinBid: "參加標案",
        viewBid: "觀看標案"
    }
    let div = document.getElementById("title");
    div.textContent = titles[page];
}

function append_back_button() {
    let div = document.getElementById("title");
    let button = document.createElement("button");
    button.addEventListener("click", () => goto.home());
    button.textContent = "回到首頁";
    div.appendChild(button);
}

function change(page) {
    document.querySelectorAll(".page").forEach(function(page) {
        page.classList.remove("active");
    });
    document.getElementById(page).classList.add("active");
    title(this.value);
}

function update_select(selector, page, bid_id) {
    let select = document.getElementById(selector);
    select.innerHTML = "";
    let data = get(page, {bid_id: bid_id});
    data.forEach( function(datum) {
        let option = document.createElement("option");
        option.text = datum.name;
        option.value = datum.id;
        select.add(option);
    });
    select.value = "";
}

function depended(elm, o) {
    let spans = document.getElementsByClassName(o.name);
    if ( elm.type == 'checkbox' ) {
        for ( let span of spans ) {
            span.hidden = !elm.checked;
        }
    } else {
        for ( let span of spans ) {
            span.hidden = !span.classList.contains(elm.value);
        }
    }
}

let goto = {
    change: change,
    home: function() {
        goto.value = "home";
        bid.init();
        goto.change("home");
    },
    addBid: function() {
        goto.value = "addBid";
        goto.change("addBid");
        append_back_button();
    },
    gate: function(elm) {
        goto.value = elm.value;
        goto.change("gate");
        update_select("select_bid", "bid");
        document.querySelector(".joinBid").hidden = goto.value != "joinBid";
        append_back_button();
    },
    setBid: function() {
        goto.change("setBid");
        append_back_button();
    },
    hostBid: function() {
        goto.change("hostBid");
        append_back_button();
    },
    joinBid: function() {
        goto.change("joinBid");
        append_back_button();
    },
    viewBid: function() {
        goto.change("viewBid");
        append_back_button();
    }
}

function init(page) {
    if ( !page ) {
        for ( let page in this.elms ) {
            this.init(page);
        }
    } else {
        for ( let key in this.elms[page] ) {
            this.elms[page][key].value = "";
        }
        this.data[page] = {};
        if ( page in this.info ) this.info[page].textContent = "";
    }
    delete this.bid_id;
    delete this.bidder_id;
}

function value(elm) {
    if ( elm.type == 'checkbox' ) {
        return elm.checked ? elm.value : "";
    }
    return elm.value;
}

let bid = {
    data: {},
    elms: {},
    info: {},
    init: init,
    input: function(elm, o) {
        bid.elms[o.page] = bid.elms[o.page] || {};
        bid.elms[o.page][o.key] = elm;
        bid.data[o.page] = bid.data[o.page] || {};
        bid.data[o.page][o.key] = value(elm);
    },
    button: function(_elm, o) {
        if ( Object.keys(bid.data[o.page]).length > 0 ) {
            let data = bid.data[o.page];
            if ( bid.bid_id ) data = {bid_id: bid.bid_id, ...data};
            if ( bid.bidder_id ) data = {bidder_id: bid.bidder_id, ... data}
            let result = save(o.page, data);
            bid.init(o.page);
        }
        if ( o.info ) {
            let info = document.getElementById(o.info);
            bid.info[o.page] = info;
            if ( result ) {
                if ( result.result == 'success' ) {
                    info.textContent = o.success(result.data);
                } else {
                    info.textContent = "儲存失敗，可能有重複值，請重新輸入"
                }    
            } else {
                info.textContent = "請不要留空";
            }
        }
    }
}

let gate = {
    input: function(elm, o) {
        bid[o.key] = elm.value;
    },
    button: function(_elm, o) {
        let info = document.getElementById(o.info);
        if ( (goto.value != 'joinBid' && bid.bid_id) ||
            (goto.value == 'joinBid' && bid.bid_id && bid.bidder_id) ) {
            goto[goto.value]();
        } else {
            info.textContent = "請不要留空";
        }
    }
}