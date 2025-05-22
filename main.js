listen("[value='addBid']", goto.addBid);

listen(".changePage:not([value='addBid'])", goto.gate);

listen("#bid_name", bid.input, {page: "bid", key: "name"});
listen("#add_bid", bid.button, {
    page: "bid",
    info: "info_add_bid",
    success: data => "新增標案成功，標案名稱為「" + data.name + "」。"
});

listen("#select_bid", gate.input, {key: 'bid_id'});
listen("#select_bidder", gate.input, {key: 'bidder_id'});
listen("#enter_main", gate.button, {info: "info_gate"});

listen("#config_activity", depended, {name:'activity'});
listen("#band_type", depended, {name: 'band_type'});

listen("#config_mechanism", bid.input, {page: "config", key: "mechanism"});
listen("#config_activity", bid.input, {page: "config", key: "activity"});
listen("#config_preference", bid.input, {page: "config", key: "preference"})
listen("#add_config", bid.button, {page: "config"});

listen("#quote_type", bid.input, {page: "quote", key: "type"});
listen("#quote_unit", bid.input, {page: "quote", key: "unit"});
listen("#quote_raise", bid.input, {page:"quote", key: "raise"});
listen("#add_config", bid.button, {page: "quote"});