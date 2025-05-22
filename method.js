function config(page) {
    page = page || 'config';
    return get(page, {bid_id: select.bid_id})[0];
}

/** 清空block內各欄位的值 */
function empty(block) {
    let checks = block.querySelectorAll("input[type='checkbox']");
    for ( let check of checks ) {
        check.checked = false;
    }
    let inputs = block.querySelectorAll("input:not([type='checkbox'])");
    for ( let input of inputs ) {
        input.value = "";
    }
    let selects = block.querySelectorAll("select");
    for ( let select of selects ) {
        select.value = "";
    }
    let infos = block.querySelectorAll("[id^='info']");
    for ( let info of infos ) {
        info.textContent = "";
    }
    config_mechanism.disabled = false;
    config_preference.disabled = false;
    config_activity.disabled = false;
    quote_type.disabled = false;
    quote_unit.disabled = false;
    quote_raise.disabled = false;
}

function generateRan() {
    return Math.ceil(Math.random()*10**12);
}

/** 由標案bid_id中page的資料放到id這個select元素內 */
function update_select(id, page, bid_id) {
    let select = document.getElementById(id);
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

/** 將資料data放到id這個select元素內 */
function add_option(id, data) {
    let select = document.getElementById(id);
    select.innerHTML = "";
    data.forEach( function(datum) {
        let option = document.createElement("option");
        option.text = datum;
        option.value = datum;
        select.add(option);
    });
    select.value = "";
}

/** 確認儲存資料page裡keys內的值均無留空 */
function hasblank(page, keys) {
    for ( let key of keys ) {
        if ( !(key in page) ) return true;
    }
    return false;
}

/** 重整表格 */
function flush_list(table, fields, bid_id, items_inside) {
    table.innerHTML = "";
    let id = {bid_id: bid_id};
    let data = fields.data || get(fields.type, id);
    if ( data.length > 0 || (items_inside && items_inside.length > 0) ) {
        let items = get('item', id);
        let subdata = fields.subdata || get(fields.type+"_item", id);
        let caption = table.createCaption();
        caption.textContent = fields.name;
        let tr = document.createElement("tr");
        table.appendChild(tr);
        if ( fields.subrow ) {
            let tr_sub = tr;
            for ( let name of Object.keys(fields.subrow) ) {
                let td = document.createElement("td");
                td.textContent = name;
                tr_sub.appendChild(td);
            }
            table.appendChild(tr_sub);
        }
        for ( let name of Object.keys(fields.row) ) {
            let td = document.createElement("td");
            td.textContent = name;
            tr.appendChild(td);
        }
        tr = document.createElement("tr");
        if ( fields.subrow && items_inside && items_inside.length > 0 ) {
            let tr_sub = tr;
            let rowspan = items_inside.length;
            items_inside.forEach( function(item) {
                for ( let key in fields.subrow ) {
                    let value = item[fields.subrow[key]];
                    if ( key == '標的' ) {
                        value = items.sieve({id: value})[0].name
                    }
                    let td = document.createElement("td");
                    td.textContent = value;
                    tr_sub.appendChild(td);
                }
                table.appendChild(tr_sub);
                tr_sub = document.createElement("tr");
            })
            for ( let key in fields.row ) {
                let td = document.createElement("td");
                td.textContent = "";
                td.rowSpan = rowspan;
                tr.appendChild(td);
            }
        }
        if ( data.length > 0 ) {
            let rowspan = 1;
            data.forEach( function(datum) {
                let tr = document.createElement("tr");
                table.appendChild(tr);
                if ( fields.subrow ) {
                    let tr_sub = tr;
                    let items_in = subdata.filter(b => datum.id == b[fields.type+"_id"]);
                    rowspan = items_in.length;
                    items_in.forEach( function(item) {
                        for ( let key in fields.subrow ) {
                            let value = item[fields.subrow[key]];
                            if ( key == '標的' ) {
                                value = items.sieve({id: value})[0].name;
                            }
                            let td = document.createElement("td");
                            td.textContent = value;
                            tr_sub.appendChild(td);
                        }
                        table.appendChild(tr_sub);
                        tr_sub = document.createElement("tr");
                    })
                }
                for ( let key in fields.row ) {
                    let td = document.createElement("td");
                    td.textContent = datum[fields.row[key]];
                    td.rowSpan = rowspan;
                    tr.appendChild(td);
                }
            })
        }
    }
}

function formatTime( epoch ) {
    if ( !epoch ) return "NULL";
    let time = new Date(epoch);
    let year = time.getFullYear();
    let month = time.getMonth() + 1;
    let date = time.getDate();
    let hour = time.getHours();
    let minute = time.getMinutes();
    let second = time.getSeconds();
    let output = year + "年" + month + "月" + date + "日" + hour + "時" + minute + "分";
    if ( second != 0 ) {
        output += second + "秒"
    }
    return output
}

function round_info(bid_id, stage) {
    let round = get('round', {bid_id: bid_id, stage: stage});
    let right_before = round.filter(fields => fields.start <= Date.now()).at(-1);
    let right_after = round.filter(fields => fields.end > Date.now()).at(0);
    return [right_before, right_after];
}

function check_in_round(bid_id, stage) {
    let [right_before, right_after] = round_info(bid_id, stage);
    if ( (right_before && !right_after && !right_before.end) ||
        (right_before && right_after && right_before == right_after)) {
        return true;
    }
}

let stages = {
    quantity: "數量階段",
    complement: "補充數量階段",
    location: "位置階段"
}

function flush_round_info(div, bid_id, stage) {
    div.textContent = "現在是" + stages[stage] + "。";
    let [right_before, right_after] = round_info(bid_id, stage);
    let h2 = document.createElement("h2");
    h2.textContent = "目前不在競標時間內。";
    if ( !right_before && !right_after ) {
        h2.textContent = "競標程序未開始。";
        div.appendChild(h2);
    }
    if ( !right_before && right_after) {
        div.textContent += "第1回合開始時間為" + formatTime(right_after.start) + "。";
        div.appendChild(h2);
    }
    if ( right_before && !right_after && right_before.end ) {
        div.textContent += "第" + right_before.round + "回合已結束，下回合開始時間未定。";
        div.appendChild(h2);
    }
    if ( right_before && !right_after && !right_before.end ) {
        div.textContent += "現正進行第" + right_before.round + "回合，本回合結束時間未定。";
    }
    if ( right_before && right_after && right_before == right_after ) {
        div.textContent += "現正進行第" + right_before.round + "回合，本回合結束時間為";
        div.textContent += formatTime(right_before.end) +"。";
    } 
    if ( right_before && right_after && right_before != right_after ){
        div.textContent += "第" + right_before.round + "回合已結束，下回合開始時間為";
        div.textContent += formatTime(right_after.start) +"。";
        div.appendChild(h2);
    }
}

function flush_round_list(table, bid_id, stage) {
    table.innerHTML = "";
    let rounds = get('round', {bid_id: bid_id, stage: stage});
    if ( rounds && rounds.length > 0 ) {
        let caption = table.createCaption();
        caption.textContent = "回合列表";
        let tr = document.createElement("tr");
        for ( let name of ["回合數", "開始時間", "結束時間"]) {
            let td = document.createElement("td");
            td.textContent = name;
            tr.appendChild(td);
        }
        table.appendChild(tr);
        rounds.forEach( function(round) {
            let tr = document.createElement("tr");
            let td = document.createElement("td");
            td.textContent = round.round;
            tr.appendChild(td);
            for ( let key of ["start", "end"] ) {
                let td = document.createElement("td");
                td.textContent = formatTime(round[key]);
                tr.appendChild(td);
            }
            table.appendChild(tr);
        })
    }
}