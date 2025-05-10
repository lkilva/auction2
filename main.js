listen("[value='addBid']", goto.addBid);

listen(".changePage:not([value='addBid'])", goto.gate);

listen("#bid_name", bid.input, {page: "bid", key: "name"});
listen("#add_bid", bid.button, {page: "bid"});

listen("#select_bid", gate.input);
listen("#enter_main", gate.button);