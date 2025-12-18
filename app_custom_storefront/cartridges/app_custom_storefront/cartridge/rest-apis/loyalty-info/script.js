var RESTResponseMgr = require("dw/system/RESTResponseMgr");

exports.getLoyaltyInfo = function () {
    const params = request.httpParameters;
    const customerID = params.c_customer_id ? params.c_customer_id[0] : null;
    var info = {
      tier: "silver",
      points: 14275,
      customerID: customerID
    };

    RESTResponseMgr
      .createSuccess(info)
      .render();
};

exports.getLoyaltyInfo.public = true;